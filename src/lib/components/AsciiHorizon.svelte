<script lang="ts">
  import { onMount } from "svelte";
  import {
    DEFAULT_WAVE_PARAMS,
    DEFAULT_SKY_PARAMS,
    DEFAULT_WEATHER_PARAMS,
    type WaveParams,
    type SkyParams,
    type WeatherParams,
    type WeatherSource,
  } from "$lib/horizon";
  import { fetchLosAngelesWeather, type LosAngelesWeather } from "$lib/horizon/weather";
  import AsciiHorizonWorkerCanvas from "./AsciiHorizonWorkerCanvas.svelte";
  import WaveControls from "./WaveControls.svelte";

  let waveParams: WaveParams = $state({ ...DEFAULT_WAVE_PARAMS });
  let skyParams: SkyParams = $state({ ...DEFAULT_SKY_PARAMS });
  let weatherParams: WeatherParams = $state({ ...DEFAULT_WEATHER_PARAMS });
  let weatherSource: WeatherSource = $state("loading");

  const WEATHER_CACHE_KEY = "ascii-horizon-la-weather-v1";
  const WEATHER_CACHE_MAX_AGE = 6 * 60 * 60 * 1000;
  const WEATHER_REFRESH_INTERVAL = 15 * 60 * 1000;
  let liveWeatherEnabled = true;
  let weatherController: AbortController | null = null;

  function hasFiniteWeather(params: unknown): params is WeatherParams {
    if (!params || typeof params !== "object") return false;
    const weather = params as Record<string, unknown>;
    return ["windSpeed", "windDirection", "cloudCover", "humidity", "precipitation"].every(
      (key) => typeof weather[key] === "number" && Number.isFinite(weather[key]),
    );
  }

  function readCachedWeather(): LosAngelesWeather | null {
    try {
      const cached = JSON.parse(
        localStorage.getItem(WEATHER_CACHE_KEY) ?? "null",
      ) as LosAngelesWeather | null;
      if (
        !cached ||
        typeof cached.fetchedAt !== "number" ||
        Date.now() - cached.fetchedAt > WEATHER_CACHE_MAX_AGE ||
        !hasFiniteWeather(cached.params)
      ) {
        return null;
      }
      return cached;
    } catch {
      return null;
    }
  }

  function applyWeather(weather: LosAngelesWeather, source: WeatherSource) {
    weatherParams = { ...weather.params };
    weatherSource = source;
  }

  async function syncLosAngelesWeather() {
    if (!liveWeatherEnabled) return;

    weatherController?.abort();
    const controller = new AbortController();
    weatherController = controller;
    const timeout = window.setTimeout(() => controller.abort(), 8_000);

    try {
      const weather = await fetchLosAngelesWeather(controller.signal);
      if (!liveWeatherEnabled || controller.signal.aborted) return;
      applyWeather(weather, "live");
      try {
        localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(weather));
      } catch {
        // Storage is an optional resilience layer; the live model still applies.
      }
    } catch {
      if (!liveWeatherEnabled || weatherController !== controller) return;
      weatherSource = weatherSource === "cached" ? "cached" : "fallback";
    } finally {
      window.clearTimeout(timeout);
      if (weatherController === controller) weatherController = null;
    }
  }

  function useLiveWeather() {
    liveWeatherEnabled = true;
    weatherSource = "loading";
    void syncLosAngelesWeather();
  }

  function useManualWeather() {
    liveWeatherEnabled = false;
    weatherController?.abort();
    weatherController = null;
    weatherSource = "manual";
  }

  onMount(() => {
    const cached = readCachedWeather();
    if (cached) {
      applyWeather(cached, "cached");
    }
    void syncLosAngelesWeather();

    const refresh = window.setInterval(() => {
      void syncLosAngelesWeather();
    }, WEATHER_REFRESH_INTERVAL);

    return () => {
      liveWeatherEnabled = false;
      window.clearInterval(refresh);
      weatherController?.abort();
    };
  });
</script>

<div class="ascii-horizon-stack">
  <div class="horizon-card horizon-scene">
    <AsciiHorizonWorkerCanvas {waveParams} {skyParams} {weatherParams} />
  </div>

  <WaveControls
    bind:params={waveParams}
    bind:skyParams
    bind:weatherParams
    {weatherSource}
    onRequestLiveWeather={useLiveWeather}
    onManualWeather={useManualWeather}
  />
</div>

<style>
  .ascii-horizon-stack {
    display: grid;
    gap: 0.85rem;
    margin-bottom: 2rem;
  }

  .horizon-card {
    background: var(--color-horizon-bg);
    border: 1px solid var(--color-theme-border);
    border-radius: 0.75rem;
    padding: 1.5rem 1rem;
    overflow: hidden;
    box-shadow: 0 1px 0 rgba(0, 0, 0, 0.04);
    transition: background-color 0.25s;
  }
</style>
