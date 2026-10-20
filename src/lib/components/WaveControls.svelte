<script lang="ts">
  import type { Snippet } from "svelte";
  import { slide } from "svelte/transition";
  import { ChevronDown } from "@lucide/svelte";
  import {
    DEFAULT_WAVE_PARAMS,
    DEFAULT_SKY_PARAMS,
    DEFAULT_WEATHER_PARAMS,
    type WaveParams,
    type SkyParams,
    type WeatherParams,
    type WeatherSource,
  } from "#lib/horizon/index.js";
  import { getLosAngelesHours } from "#lib/horizon/world.js";

  let {
    params = $bindable(),
    skyParams = $bindable(),
    weatherParams = $bindable(),
    weatherSource,
    onRequestLiveWeather,
    onManualWeather,
    children,
  }: {
    params: WaveParams;
    skyParams: SkyParams;
    weatherParams: WeatherParams;
    weatherSource: WeatherSource;
    onRequestLiveWeather: () => void;
    onManualWeather: () => void;
    /** Rendered at the end of the readout line, e.g. the motion control. */
    children?: Snippet;
  } = $props();
  let open = $state(false);
  let reducedMotion = $state(false);
  let currentLaTime = $state(getLosAngelesHours());

  const sceneTime = $derived(wrapHours(currentLaTime + skyParams.timeOffset));
  // The caption reads the scene back in words, the way an almanac plate is captioned.
  const caption = $derived(
    `Los Angeles at ${formatTimeOfDay(sceneTime)}: ` +
      `${describeSky(weatherParams.cloudCover, weatherParams.precipitation)}, ` +
      `${describeWind(weatherParams.windSpeed, weatherParams.windDirection)}` +
      (weatherSource === "manual"
        ? " (adjusted)"
        : weatherSource === "fallback"
          ? " (forecast unavailable)"
          : "") +
      ".",
  );

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

  function formatTimeOfDay(hours: number): string {
    const totalMinutes = Math.round(wrapHours(hours) * 60) % (24 * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
  }

  function describeSky(cloudCover: number, precipitation: number): string {
    if (precipitation > 0.15) return "rain";
    if (cloudCover < 0.15) return "clear";
    if (cloudCover < 0.5) return "partly cloudy";
    if (cloudCover < 0.85) return "mostly cloudy";
    return "overcast";
  }

  // Beaufort names by upper bound in m/s.
  const BEAUFORT: [number, string][] = [
    [0.5, "calm"],
    [1.6, "light air"],
    [3.4, "light breeze"],
    [5.5, "gentle breeze"],
    [8, "moderate breeze"],
    [10.8, "fresh breeze"],
    [13.9, "strong breeze"],
    [17.2, "near gale"],
    [Infinity, "gale"],
  ];
  const DIRECTIONS = [
    "north",
    "northeast",
    "east",
    "southeast",
    "south",
    "southwest",
    "west",
    "northwest",
  ];

  /** `towardDegrees` is where the wind travels; speech names where it comes from. */
  function describeWind(speed: number, towardDegrees: number): string {
    const force = BEAUFORT.find(([max]) => speed < max)?.[1] ?? "gale";
    if (force === "calm") return force;
    const from = (((towardDegrees + 180) % 360) + 360) % 360;
    return `${force} from the ${DIRECTIONS[Math.round(from / 45) % DIRECTIONS.length]}`;
  }

  function setSceneTime(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const targetTime = Number(input.value);
    skyParams.timeOffset = targetTime - currentLaTime;
  }

  function reset() {
    onManualWeather();
    params = { ...DEFAULT_WAVE_PARAMS };
    skyParams = { ...DEFAULT_SKY_PARAMS };
    weatherParams = { ...DEFAULT_WEATHER_PARAMS };
  }

  function applyPreset(preset: "still" | "pacific" | "squall") {
    onManualWeather();
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
        swellScale: 27,
        chopScale: 17,
        crestSharpness: 1.5,
        reflectionSharpness: 1.8,
        shimmer: 1,
        speed: 0.4,
      };
      weatherParams = {
        ...DEFAULT_WEATHER_PARAMS,
        windSpeed: 15,
        windDirection: 292,
        cloudCover: 0.58,
        humidity: 0.82,
        precipitation: 0.38,
      };
      return;
    }

    reset();
  }
</script>

<div class="wave-controls">
  <div class="readout">
    <button class="toggle" onclick={() => (open = !open)} aria-expanded={open}>
      <span class="caption">{caption}</span>
      <span class="sr-only">Ocean controls</span>
      <ChevronDown size={14} aria-hidden="true" class="chevron" />
    </button>
    {#if children}<div class="trailing">{@render children()}</div>{/if}
  </div>

  {#if open}
    <div class="panel" transition:slide={{ duration: reducedMotion ? 0 : 200 }}>
      <div class="preset-row" role="group" aria-labelledby="weather-presets-label">
        <span id="weather-presets-label">Conditions</span>
        <button
          class:active={weatherSource !== "manual" && weatherSource !== "fallback"}
          onclick={onRequestLiveWeather}
          aria-pressed={weatherSource !== "manual" && weatherSource !== "fallback"}
          disabled={weatherSource === "loading"}>sync LA</button
        >
        <button onclick={() => applyPreset("still")}>still water</button>
        <button onclick={() => applyPreset("pacific")}>living pacific</button>
        <button onclick={() => applyPreset("squall")}>squall line</button>
      </div>

      <div class="sliders everyday-controls">
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
            >Wind <span class="slider-value">{weatherParams.windSpeed.toFixed(1)}m/s</span></span
          >
          <input
            type="range"
            min="0"
            max="22"
            step="0.5"
            bind:value={weatherParams.windSpeed}
            oninput={onManualWeather}
          />
        </label>
        <label class="slider-row">
          <span class="slider-label"
            >Cloud <span class="slider-value">{Math.round(weatherParams.cloudCover * 100)}%</span
            ></span
          >
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            bind:value={weatherParams.cloudCover}
            oninput={onManualWeather}
          />
        </label>
      </div>
      <details class="advanced-controls">
        <summary>Advanced model controls</summary>
        <div class="equation">
          <p class="eq-line">
            <em>&Psi;</em> = <em>S</em><sub>swell</sub> + <em>W</em><sub>chop</sub> +
            <em>A</em><sub>cloud</sub> + <em>L</em><sub>sun</sub>
          </p>
          <p class="eq-detail">
            One advected system: wind couples the wave spectrum, foam, cloud field, rain, and
            glitter path.
          </p>
        </div>

        <div class="parameter-groups">
          <section>
            <div class="section-title">Sky and weather</div>
            <div class="sliders">
              <label class="slider-row">
                <span class="slider-label"
                  >Heading <span class="slider-value"
                    >{weatherParams.windDirection.toFixed(0)}°</span
                  ></span
                >
                <input
                  type="range"
                  min="0"
                  max="359"
                  step="1"
                  bind:value={weatherParams.windDirection}
                  oninput={onManualWeather}
                />
              </label>

              <label class="slider-row">
                <span class="slider-label"
                  >Humidity <span class="slider-value"
                    >{Math.round(weatherParams.humidity * 100)}%</span
                  ></span
                >
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  bind:value={weatherParams.humidity}
                  oninput={onManualWeather}
                />
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
                  oninput={onManualWeather}
                />
              </label>
              <label class="slider-row">
                <span class="slider-label"
                  >Glow <span class="slider-value">{skyParams.glowStrength.toFixed(1)}</span></span
                >
                <input
                  type="range"
                  min="0"
                  max="3"
                  step="0.1"
                  bind:value={skyParams.glowStrength}
                />
              </label>
            </div>
          </section>

          <section>
            <div class="section-title">Ocean surface</div>
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
      </details>

      <button class="reset" onclick={reset}> Reset defaults </button>
    </div>
  {/if}
</div>

<style>
  .everyday-controls {
    margin: 1rem 0;
  }
  .advanced-controls summary {
    cursor: pointer;
    padding: 0.5rem 0;
    color: var(--color-theme-muted);
  }
  .advanced-controls summary:focus-visible {
    outline: 2px solid var(--color-sunset-amber-400);
    outline-offset: 3px;
  }

  /* One quiet caption line under the piece: the model readout, then any trailing control. */
  .readout {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0 1rem;
  }

  .trailing {
    margin-left: auto;
  }

  .toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    background: none;
    border: none;
    color: var(--color-theme-muted);
    font-family: var(--font-serif);
    font-style: italic;
    font-size: 1rem;
    cursor: pointer;
    min-height: 2.75rem;
    padding: 0.6rem 0;
    text-align: left;
    transition: color 0.2s;
  }

  .toggle:hover {
    color: var(--color-theme-heading);
  }

  .toggle :global(.chevron) {
    transition: transform 0.2s;
  }

  .toggle[aria-expanded="true"] :global(.chevron) {
    transform: rotate(180deg);
  }

  .toggle:focus-visible,
  .preset-row button:focus-visible,
  .reset:focus-visible {
    outline: 2px solid var(--color-theme-console-accent);
    outline-offset: 3px;
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
    font-size: 0.8125rem;
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

  .preset-row button.active {
    color: var(--color-theme-heading);
    border-color: var(--color-theme-console-accent);
  }

  .preset-row button:disabled {
    cursor: wait;
    opacity: 0.62;
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
    color: var(--color-theme-heading);
    font-size: 0.875rem;
    font-weight: 500;
    margin-bottom: 0.5rem;
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
    font-size: 0.9375rem;
    margin-bottom: 0.35rem;
    line-height: 1.6;
  }

  .eq-detail {
    color: var(--color-theme-muted);
    font-size: 0.8125rem;
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
    font-size: 0.875rem;
    min-width: 4.5rem;
    width: 6.75rem;
    flex: none;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  .slider-value {
    color: var(--color-theme-subtle);
    font-size: 0.8125rem;
    font-variant-numeric: tabular-nums;
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
    display: block;
    margin: 0 auto;
    background: none;
    border: none;
    color: var(--color-theme-muted);
    font-size: 0.8125rem;
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
