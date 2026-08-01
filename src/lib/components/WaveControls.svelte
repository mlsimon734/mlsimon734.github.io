<script lang="ts">
  import { slide } from "svelte/transition";
  import {
    DEFAULT_WAVE_PARAMS,
    DEFAULT_SKY_PARAMS,
    DEFAULT_WEATHER_PARAMS,
    type WaveParams,
    type SkyParams,
    type WeatherParams,
  } from "$lib/horizon";
  import { getLosAngelesHours } from "$lib/horizon/world";

  let {
    params = $bindable(),
    skyParams = $bindable(),
    weatherParams = $bindable(),
  }: { params: WaveParams; skyParams: SkyParams; weatherParams: WeatherParams } = $props();
  let open = $state(false);
  let reducedMotion = $state(false);
  let currentLaTime = $state(getLosAngelesHours());

  const sceneTime = $derived(wrapHours(currentLaTime + skyParams.timeOffset));
  const compass = $derived(compassPoint(weatherParams.windDirection));

  $effect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotion = mql.matches;
    const handler = (e: MediaQueryListEvent) => (reducedMotion = e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  });

  $effect(() => {
    const id = setInterval(() => {
      currentLaTime = getLosAngelesHours();
    }, 60_000);
    return () => clearInterval(id);
  });

  function wrapHours(hours: number): number {
    return ((hours % 24) + 24) % 24;
  }

  function formatClock(hours: number): string {
    const totalMinutes = Math.round(wrapHours(hours) * 60) % (24 * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  }

  function compassPoint(degrees: number): string {
    const points = [
      "N",
      "NNE",
      "NE",
      "ENE",
      "E",
      "ESE",
      "SE",
      "SSE",
      "S",
      "SSW",
      "SW",
      "WSW",
      "W",
      "WNW",
      "NW",
      "NNW",
    ];
    return points[Math.round((((degrees % 360) + 360) % 360) / 22.5) % points.length];
  }

  function setSceneTime(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const targetTime = Number(input.value);
    skyParams.timeOffset = targetTime - currentLaTime;
  }

  function reset() {
    params = { ...DEFAULT_WAVE_PARAMS };
    skyParams = { ...DEFAULT_SKY_PARAMS };
    weatherParams = { ...DEFAULT_WEATHER_PARAMS };
  }

  function applyPreset(preset: "still" | "pacific" | "squall") {
    if (preset === "still") {
      params = {
        ...DEFAULT_WAVE_PARAMS,
        swellScale: 15,
        chopScale: 6,
        crestSharpness: 0.85,
        shimmer: 0.55,
        speed: 0.22,
      };
      weatherParams = {
        ...DEFAULT_WEATHER_PARAMS,
        windSpeed: 3.2,
        windDirection: 235,
        cloudCover: 0.12,
        humidity: 0.42,
        precipitation: 0,
      };
      return;
    }

    if (preset === "squall") {
      params = {
        ...DEFAULT_WAVE_PARAMS,
        swellScale: 30,
        chopScale: 21,
        crestSharpness: 1.8,
        reflectionSharpness: 1.65,
        shimmer: 1.35,
        speed: 0.46,
      };
      weatherParams = {
        ...DEFAULT_WEATHER_PARAMS,
        windSpeed: 18,
        windDirection: 292,
        cloudCover: 0.82,
        humidity: 0.9,
        precipitation: 0.72,
      };
      return;
    }

    reset();
  }
</script>

<div class="wave-controls font-mono">
  <button class="toggle" onclick={() => (open = !open)} aria-expanded={open}>
    <span class="comment-prefix">//</span> model · {compass}
    {weatherParams.windSpeed.toFixed(1)}
    m/s · {Math.round(weatherParams.cloudCover * 100)}% cloud {open ? "▴" : "▾"}
  </button>

  {#if open}
    <div class="panel" transition:slide={{ duration: reducedMotion ? 0 : 200 }}>
      <div class="preset-row" role="group" aria-labelledby="weather-presets-label">
        <span id="weather-presets-label"><span class="comment-prefix">//</span> conditions</span>
        <button onclick={() => applyPreset("still")}>still water</button>
        <button onclick={() => applyPreset("pacific")}>living pacific</button>
        <button onclick={() => applyPreset("squall")}>squall line</button>
      </div>

      <div class="equation">
        <p class="eq-line">
          <em>&Psi;</em> = <em>S</em><sub>swell</sub> + <em>W</em><sub>chop</sub> +
          <em>A</em><sub>cloud</sub> + <em>L</em><sub>sun</sub>
        </p>
        <p class="eq-detail">
          One advected system: wind couples the wave spectrum, foam, cloud field, rain, and glitter
          path.
        </p>
      </div>

      <div class="parameter-groups">
        <section>
          <div class="section-title"><span class="comment-prefix">//</span> sky + weather</div>
          <div class="sliders">
            <label class="slider-row">
              <span class="slider-label"
                >Time <span class="slider-value">{formatClock(sceneTime)}</span></span
              >
              <input
                type="range"
                min="0"
                max="23.75"
                step="0.25"
                value={sceneTime}
                oninput={setSceneTime}
              />
            </label>
            <label class="slider-row">
              <span class="slider-label"
                >Wind <span class="slider-value">{weatherParams.windSpeed.toFixed(1)}m/s</span
                ></span
              >
              <input
                type="range"
                min="0"
                max="22"
                step="0.5"
                bind:value={weatherParams.windSpeed}
              />
            </label>
            <label class="slider-row">
              <span class="slider-label"
                >Heading <span class="slider-value">{weatherParams.windDirection.toFixed(0)}°</span
                ></span
              >
              <input
                type="range"
                min="0"
                max="359"
                step="1"
                bind:value={weatherParams.windDirection}
              />
            </label>
            <label class="slider-row">
              <span class="slider-label"
                >Cloud <span class="slider-value"
                  >{Math.round(weatherParams.cloudCover * 100)}%</span
                ></span
              >
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                bind:value={weatherParams.cloudCover}
              />
            </label>
            <label class="slider-row">
              <span class="slider-label"
                >Humidity <span class="slider-value"
                  >{Math.round(weatherParams.humidity * 100)}%</span
                ></span
              >
              <input type="range" min="0" max="1" step="0.01" bind:value={weatherParams.humidity} />
            </label>
            <label class="slider-row">
              <span class="slider-label"
                >Rain <span class="slider-value"
                  >{Math.round(weatherParams.precipitation * 100)}%</span
                ></span
              >
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                bind:value={weatherParams.precipitation}
              />
            </label>
            <label class="slider-row">
              <span class="slider-label"
                >Glow <span class="slider-value">{skyParams.glowStrength.toFixed(1)}</span></span
              >
              <input type="range" min="0" max="3" step="0.1" bind:value={skyParams.glowStrength} />
            </label>
          </div>
        </section>

        <section>
          <div class="section-title"><span class="comment-prefix">//</span> ocean surface</div>
          <div class="sliders">
            <label class="slider-row">
              <span class="slider-label"
                >Swell <span class="slider-value">{params.swellScale.toFixed(0)}</span></span
              >
              <input type="range" min="8" max="40" step="1" bind:value={params.swellScale} />
            </label>
            <label class="slider-row">
              <span class="slider-label"
                >Chop <span class="slider-value">{params.chopScale.toFixed(0)}</span></span
              >
              <input type="range" min="4" max="24" step="1" bind:value={params.chopScale} />
            </label>
            <label class="slider-row">
              <span class="slider-label"
                >Crest <span class="slider-value">{params.crestSharpness.toFixed(2)}</span></span
              >
              <input
                type="range"
                min="0.4"
                max="2.5"
                step="0.01"
                bind:value={params.crestSharpness}
              />
            </label>
            <label class="slider-row">
              <span class="slider-label"
                >Reflect <span class="slider-value">{params.reflectionSharpness.toFixed(2)}</span
                ></span
              >
              <input
                type="range"
                min="1.2"
                max="4.5"
                step="0.05"
                bind:value={params.reflectionSharpness}
              />
            </label>
            <label class="slider-row">
              <span class="slider-label"
                >Shimmer <span class="slider-value">{params.shimmer.toFixed(2)}</span></span
              >
              <input type="range" min="0" max="2" step="0.05" bind:value={params.shimmer} />
            </label>
            <label class="slider-row">
              <span class="slider-label"
                >Speed <span class="slider-value">{params.speed.toFixed(2)}x</span></span
              >
              <input type="range" min="0.2" max="2" step="0.05" bind:value={params.speed} />
            </label>
            <label class="slider-row">
              <span class="slider-label"
                >Sun R. <span class="slider-value">{skyParams.sunRadius.toFixed(1)}</span></span
              >
              <input type="range" min="1" max="8" step="0.5" bind:value={skyParams.sunRadius} />
            </label>
          </div>
          <p class="eq-detail">
            Directional swell + wind chop + capillary ripple. Reflection follows facet slope; foam
            appears where crests exceed the wind-adjusted breaking threshold.
          </p>
        </section>
      </div>

      <button class="reset" onclick={reset}>
        <span class="comment-prefix">//</span> reset defaults
      </button>
    </div>
  {/if}
</div>

<style>
  .wave-controls {
    margin-top: 0.5rem;
    text-align: center;
  }

  .toggle {
    display: block;
    margin: 0 auto;
    background: none;
    border: none;
    color: var(--color-theme-text);
    font-family: var(--font-mono);
    font-size: 0.75rem;
    cursor: pointer;
    min-height: 2.75rem;
    padding: 0.6rem 0.75rem;
    transition: color 0.2s;
  }

  .toggle:hover {
    color: var(--color-theme-heading);
  }

  .toggle:focus-visible,
  .preset-row button:focus-visible,
  .reset:focus-visible {
    outline: 2px solid var(--color-theme-console-accent);
    outline-offset: 3px;
  }

  .comment-prefix {
    color: var(--color-theme-console-accent);
  }

  .panel {
    text-align: left;
    padding: 0.9rem 1rem;
    max-width: 42rem;
    margin: 0 auto;
  }

  .preset-row {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 0.35rem 0.7rem;
    margin-bottom: 0.9rem;
    color: var(--color-theme-text);
    font-size: 0.68rem;
  }

  .preset-row button {
    border: 1px solid color-mix(in srgb, var(--color-theme-text) 48%, transparent);
    border-radius: 0.3rem;
    background: transparent;
    color: var(--color-theme-text);
    font: inherit;
    min-height: 2.75rem;
    padding: 0.5rem 0.75rem;
    cursor: pointer;
    transition:
      color 0.2s,
      border-color 0.2s,
      background-color 0.2s;
  }

  .preset-row button:hover {
    color: var(--color-theme-heading);
    border-color: var(--color-theme-console-accent);
    background: color-mix(in srgb, var(--color-theme-console-accent) 8%, transparent);
  }

  .parameter-groups {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 1.25rem;
  }

  .parameter-groups section + section {
    border-left: 1px solid var(--color-theme-border);
    padding-left: 1.25rem;
  }

  .section-title {
    color: var(--color-theme-console-accent);
    font-size: 0.7rem;
    margin-bottom: 0.5rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .equation {
    margin-bottom: 1rem;
    border-bottom: 1px solid var(--color-theme-border);
    padding-bottom: 0.75rem;
  }

  .equation em {
    font-family: var(--font-serif);
    font-style: italic;
    letter-spacing: 0.02em;
  }

  .eq-line {
    color: var(--color-theme-heading);
    font-size: 0.8rem;
    margin-bottom: 0.35rem;
    line-height: 1.6;
  }

  .eq-detail {
    color: var(--color-theme-text);
    font-size: 0.7rem;
    margin-bottom: 0.15rem;
    line-height: 1.5;
  }

  .sliders {
    display: flex;
    flex-direction: column;
    gap: 0;
    margin-bottom: 0.75rem;
  }

  .slider-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-height: 2.75rem;
  }

  .slider-label {
    color: var(--color-theme-text);
    font-size: 0.75rem;
    min-width: 4.5rem;
    width: 6.75rem;
    flex: none;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  .slider-value {
    color: var(--color-theme-text);
    font-size: 0.65rem;
  }

  input[type="range"] {
    flex: 1;
    height: 2.75rem;
    appearance: none;
    background: linear-gradient(
        color-mix(in srgb, var(--color-theme-text) 42%, transparent),
        color-mix(in srgb, var(--color-theme-text) 42%, transparent)
      )
      center / 100% 3px no-repeat;
    border-radius: 0;
    outline: none;
  }

  input[type="range"]:focus-visible {
    outline: 2px solid var(--color-theme-console-accent);
    outline-offset: 4px;
  }

  input[type="range"]::-webkit-slider-thumb {
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--color-theme-console-accent);
    cursor: pointer;
  }

  input[type="range"]::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: none;
    background: var(--color-theme-console-accent);
    cursor: pointer;
  }

  .reset {
    background: none;
    border: none;
    color: var(--color-theme-text);
    font-family: var(--font-mono);
    font-size: 0.7rem;
    cursor: pointer;
    min-height: 2.75rem;
    padding: 0.6rem 0.75rem;
    transition: color 0.2s;
  }

  .reset:hover {
    color: var(--color-theme-heading);
  }

  @media (max-width: 639px) {
    .panel {
      padding-inline: 0.25rem;
    }

    .parameter-groups {
      grid-template-columns: 1fr;
      gap: 1rem;
    }

    .parameter-groups section + section {
      border-left: 0;
      border-top: 1px solid var(--color-theme-border);
      padding-top: 1rem;
      padding-left: 0;
    }
  }
</style>
