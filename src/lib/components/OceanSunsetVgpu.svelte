<script lang="ts">
  import { onMount, untrack } from "svelte";
  import { DEFAULT_WEATHER_PARAMS, type WeatherParams } from "#lib/horizon/types.js";
  import {
    cacheLosAngelesWeather,
    fetchLosAngelesWeather,
    readCachedLosAngelesWeather,
  } from "#lib/horizon/weather.js";
  import type { Environment } from "#lib/particles/vgpu/scene.js";
  import { createOceanVgpu, type OceanVgpu } from "#lib/particles/vgpu/renderer.js";
  import MotionControl from "./MotionControl.svelte";

  let canvas = $state<HTMLCanvasElement>();
  let container = $state<HTMLDivElement>();
  let renderer = $state<OceanVgpu>();
  let paused = $state(false);
  let reducedMotion = $state(false);
  let inViewport = $state(true);
  let pageVisible = $state(true);
  let failed = $state(false);
  let reading = $state<{ environment: Environment; weather: WeatherParams; now: number }>();
  let pointer: [number, number] = [0, 0];
  // The rendered weather eases toward the latest report instead of jumping.
  let reported: WeatherParams = { ...DEFAULT_WEATHER_PARAMS };
  let weather: WeatherParams = { ...DEFAULT_WEATHER_PARAMS };
  // Grains are soft beads under bloom; extra device pixels would only multiply the grain count.
  const MAX_DPR = 1.25;
  const shouldAnimate = $derived(!paused && !reducedMotion && inViewport && pageVisible && !failed);

  const clock = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "numeric",
    minute: "2-digit",
  });
  const COMPASS = "N NNE NE ENE E ESE SE SSE S SSW SW WSW W WNW NW NNW".split(" ");
  function compass(degrees: number): string {
    return COMPASS[Math.round((((degrees % 360) + 360) % 360) / 22.5) % 16];
  }

  function render(delta: number) {
    if (!renderer || failed) return;
    const now = Date.now();
    const ease = delta > 0 ? 1 - Math.exp(-delta / 3) : 1;
    for (const key of Object.keys(weather) as (keyof WeatherParams)[]) {
      if (key === "windDirection") {
        const turn = ((reported.windDirection - weather.windDirection + 540) % 360) - 180;
        weather.windDirection = (weather.windDirection + turn * ease + 360) % 360;
      } else {
        weather[key] += (reported[key] - weather[key]) * ease;
      }
    }
    const environment = renderer.render({ now, delta, weather, pointer });
    const shown = untrack(() => reading);
    if (!shown || now - shown.now > 1000 || delta === 0) {
      reading = { environment, weather: { ...weather }, now };
    }
  }

  onMount(() => {
    if (!canvas || !container) return;
    const element = container;
    let disposed = false;
    let current: OceanVgpu | undefined;
    let resizeFrame = 0;
    const cached = readCachedLosAngelesWeather();
    if (cached) {
      reported = { ...cached.params };
      weather = { ...cached.params };
    }
    const controller = new AbortController();
    const syncWeather = async () => {
      try {
        const latest = await fetchLosAngelesWeather(controller.signal);
        reported = { ...latest.params };
        cacheLosAngelesWeather(latest);
      } catch {
        // Keep the cached or typical evening; the scene stays complete without a report.
      }
    };
    void syncWeather();
    const refresh = window.setInterval(() => void syncWeather(), 15 * 60 * 1000);

    const bounds = element.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    // About one grain for every two device pixels: dense enough for surfaces to read as solid.
    const count = Math.round(
      Math.min(1_100_000, Math.max(150_000, bounds.width * bounds.height * dpr * dpr * 0.7)),
    );
    const fail = (error: unknown) => {
      if (disposed) return;
      console.error("Ocean WebGPU study unavailable:", error);
      failed = true;
      current?.dispose();
    };
    const resize = () => {
      if (!current || failed) return;
      const rect = element.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      try {
        current.resize(width, height, Math.min(window.devicePixelRatio || 1, MAX_DPR));
        render(0);
      } catch (error) {
        fail(error);
      }
    };
    const sizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(resize);
    });
    sizeObserver.observe(element);
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      inViewport = entry?.isIntersecting ?? false;
    });
    visibilityObserver.observe(element);
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const motion = () => {
      reducedMotion = media.matches;
    };
    const visibility = () => {
      pageVisible = document.visibilityState === "visible";
    };
    motion();
    visibility();
    media.addEventListener("change", motion);
    document.addEventListener("visibilitychange", visibility);
    void createOceanVgpu(canvas, count, fail)
      .then((value) => {
        if (disposed || failed) {
          value.dispose();
          return;
        }
        current = value;
        renderer = value;
        resize();
      })
      .catch(fail);
    return () => {
      disposed = true;
      controller.abort();
      window.clearInterval(refresh);
      cancelAnimationFrame(resizeFrame);
      sizeObserver.disconnect();
      visibilityObserver.disconnect();
      media.removeEventListener("change", motion);
      document.removeEventListener("visibilitychange", visibility);
      current?.dispose();
    };
  });

  // A still view still follows the sun, once a minute.
  $effect(() => {
    if (!renderer || failed || shouldAnimate || paused || !pageVisible || !inViewport) return;
    render(0);
    const minute = window.setInterval(() => render(0), 60_000);
    return () => window.clearInterval(minute);
  });

  $effect(() => {
    if (!renderer || !shouldAnimate) return;
    let frameId = 0;
    let previous = performance.now();
    let pending = 0;
    // Up to 60 fps: the grains stream several pixels a frame, which steps visibly at 30. The
    // threshold sits below a full interval so a 60 Hz tick that lands early still renders, while a
    // 120 Hz display renders every other tick.
    const interval = 1000 / 60;
    const tick = (now: number) => {
      pending += Math.max(0, now - previous);
      previous = now;
      if (pending >= interval * 0.75) {
        const elapsed = pending;
        pending = 0;
        try {
          render(Math.min(0.1, elapsed / 1000));
        } catch (error) {
          console.error("Ocean WebGPU rendering failed:", error);
          failed = true;
          untrack(() => renderer)?.dispose();
          return;
        }
      }
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  });

  function movePointer(event: PointerEvent) {
    if (
      !untrack(() => shouldAnimate) ||
      !window.matchMedia("(hover: hover) and (pointer: fine)").matches ||
      !container
    )
      return;
    const rect = container.getBoundingClientRect();
    pointer = [
      ((event.clientX - rect.left) / rect.width - 0.5) * 2,
      ((event.clientY - rect.top) / rect.height - 0.5) * 2,
    ];
  }

  const signed = (value: number) => `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(1)}°`;
</script>

<figure class="ocean">
  <div
    bind:this={container}
    class="canvas-shell"
    onpointermove={movePointer}
    onpointerleave={() => (pointer = [0, 0])}
    role="presentation"
  >
    <canvas bind:this={canvas} aria-hidden="true"></canvas>
    {#if failed}
      <div class="status" role="status">
        <p>This study needs WebGPU, which is unavailable here.</p>
        <a href="/sketches/ocean-sunset/webgl" class="link">View the WebGL version</a>
      </div>
    {:else if !renderer}
      <p class="status" role="status">Gathering the last light…</p>
    {/if}
  </div>
  {#if renderer && !failed}
    <figcaption>
      {#if reading}
        {@const { environment, weather: seen } = reading}
        <!-- Three readings, each kept whole, so narrow screens wrap between ideas. -->
        <p class="readout">
          <span>34.0°N 118.5°W · facing {Math.round(environment.heading)}°</span>
          <span>
            {clock.format(reading.now)} · sun {signed(environment.sunElevation)} · sunset
            {clock.format(environment.sunsetTime)}
          </span>
          <span>
            wind {seen.windSpeed.toFixed(1)} m/s from {compass(seen.windDirection + 180)} · cloud
            {Math.round(seen.cloudCover * 100)}% · humidity {Math.round(seen.humidity * 100)}%
          </span>
        </p>
      {/if}
      <MotionControl bind:paused {reducedMotion} />
    </figcaption>
  {/if}
</figure>

<style>
  .ocean {
    margin: 0;
  }
  .canvas-shell {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
    max-height: 82svh;
    overflow: hidden;
    background: #010206;
  }
  canvas {
    display: block;
    width: 100%;
    height: 100%;
    touch-action: pan-y;
  }
  @media (max-width: 639px) {
    .canvas-shell {
      aspect-ratio: 4 / 5;
    }
  }
  .status {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    margin: 0;
    padding: 2rem;
    text-align: center;
    color: #f4dfc4;
    font-size: 0.95rem;
    gap: 0.75rem;
  }
  figcaption {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: baseline;
    gap: 1rem;
    padding-top: 0.75rem;
  }
  .readout {
    display: flex;
    flex-wrap: wrap;
    gap: 0.15rem 1.6em;
    margin: 0;
    font-family: var(--font-mono);
    font-size: 0.72rem;
    line-height: 1.6;
    color: var(--color-theme-subtle);
    font-variant-numeric: tabular-nums;
  }
  .readout span {
    white-space: nowrap;
  }
</style>
