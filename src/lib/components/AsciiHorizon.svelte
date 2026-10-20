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
  } from "#lib/horizon/index.js";
  import {
    cacheLosAngelesWeather,
    fetchLosAngelesWeather,
    readCachedLosAngelesWeather,
    type LosAngelesWeather,
  } from "#lib/horizon/weather.js";
  import AsciiHorizonWorkerCanvas from "./AsciiHorizonWorkerCanvas.svelte";
  import MotionControl from "./MotionControl.svelte";
  import WaveControls from "./WaveControls.svelte";

  let paused = $state(false);
  let reducedMotion = $state(false);

  $effect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotion = mql.matches;
    const handler = (event: MediaQueryListEvent) => (reducedMotion = event.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  });

  let waveParams: WaveParams = $state({ ...DEFAULT_WAVE_PARAMS });
  let skyParams: SkyParams = $state({ ...DEFAULT_SKY_PARAMS });
  let weatherParams: WeatherParams = $state({ ...DEFAULT_WEATHER_PARAMS });
  let weatherSource: WeatherSource = $state("loading");

  const WEATHER_REFRESH_INTERVAL = 15 * 60 * 1000;
  let liveWeatherEnabled = true;
  let weatherController: AbortController | null = null;

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
      cacheLosAngelesWeather(weather);
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
    const cached = readCachedLosAngelesWeather();
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
    <AsciiHorizonWorkerCanvas {waveParams} {skyParams} {weatherParams} {paused} />
  </div>

  <WaveControls
    bind:params={waveParams}
    bind:skyParams
    bind:weatherParams
    {weatherSource}
    onRequestLiveWeather={useLiveWeather}
    onManualWeather={useManualWeather}
  >
    <MotionControl bind:paused {reducedMotion} />
  </WaveControls>
</div>

<style>
  .ascii-horizon-stack {
    display: grid;
    gap: 0.35rem;
    margin-bottom: 2rem;
  }

  /* The painted scene runs edge to edge; the card is only its frame. */
  .horizon-card {
    background: var(--color-horizon-bg);
    border: 1px solid var(--color-theme-border);
    border-radius: 0.75rem;
    overflow: hidden;
    box-shadow: 0 1px 0 rgba(0, 0, 0, 0.04);
    transition: background-color 0.25s;
  }
</style>
