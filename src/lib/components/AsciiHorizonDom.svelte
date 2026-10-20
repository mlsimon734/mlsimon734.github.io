<script lang="ts">
  import { untrack } from "svelte";
  import { fade } from "svelte/transition";
  import {
    generateHorizon,
    DESKTOP_CONFIG,
    MOBILE_CONFIG,
    type AsciiCell,
    type WaveParams,
    type SkyParams,
    type WeatherParams,
  } from "#lib/horizon/index.js";
  import { sampleAtmosphereGrid, startDrift, steerDrift } from "#lib/horizon/atmosphere.js";
  import { computeWorldParams } from "#lib/horizon/world.js";
  import { renderBackgroundPixels } from "#lib/horizon/background.js";
  import { horizonRow } from "#lib/horizon/frame.js";
  import {
    encodeRuns,
    resolveZonePalette,
    sceneColors,
    toneGain,
    type ZonePalette,
  } from "#lib/horizon/render.js";

  const TARGET_FPS = 12;
  const FRAME_INTERVAL_MS = 1000 / TARGET_FPS;

  let {
    waveParams,
    skyParams,
    weatherParams,
    paused = false,
  }: {
    waveParams: WaveParams;
    skyParams: SkyParams;
    weatherParams: WeatherParams;
    paused?: boolean;
  } = $props();

  let container: HTMLDivElement | undefined = $state();
  let artBlock: HTMLDivElement | undefined = $state();
  let naturalW = $state(0);
  let naturalH = $state(0);
  let containerW = $state(0);
  let themeVersion = $state(0);
  let palette: ZonePalette | null = $state(null);
  let skyCanvas: HTMLCanvasElement | undefined = $state();
  let seaCanvas: HTMLCanvasElement | undefined = $state();
  let isDesktop = $state(false);
  let reducedMotion = $state(false);
  let inViewport = $state(true);
  let pageVisible = $state(true);
  let waterTime = $state(0);
  let now = $state(Date.now());

  const config = $derived(isDesktop ? DESKTOP_CONFIG : MOBILE_CONFIG);
  const shouldAnimate = $derived(!paused && !reducedMotion && inViewport && pageVisible);
  const world = $derived(computeWorldParams(now, waterTime, skyParams));
  let drift = $state.raw(untrack(() => startDrift(weatherParams, waveParams.speed)));
  // A new wind turns the clouds from where they stand instead of jumping them.
  $effect.pre(() => {
    const wind = { ...weatherParams };
    drift = untrack(() => steerDrift(drift, wind, waterTime));
  });
  const atmosphereGrid = $derived(sampleAtmosphereGrid(config, waterTime, weatherParams, drift));
  const grid = $derived(
    generateHorizon(
      now,
      config,
      waterTime,
      waveParams,
      skyParams,
      weatherParams,
      world,
      atmosphereGrid,
    ),
  );
  const spans = $derived(encodeRuns(grid));
  const colors = $derived(palette ? sceneColors(palette, world) : null);
  const gain = $derived(palette ? toneGain(palette) : 1);
  const seaTop = $derived(horizonRow(config));
  // Scale the fixed-font art block down to the container so narrow cards see
  // the whole scene (matching the canvas renderers) instead of clipping it.
  const scale = $derived(naturalW > 0 && containerW > 0 ? Math.min(1, containerW / naturalW) : 1);
  // Tone rides in the color's alpha so the stars' breathing opacity multiplies it,
  // as the worker does, instead of replacing it.
  function runStyle(run: { zone: AsciiCell["zone"]; tone: number; twinkleDelay?: number }) {
    if (!colors) return "";
    const alpha = Math.round(Math.min(1, run.tone * gain) * 100);
    const delay = run.twinkleDelay != null ? `animation-delay:${run.twinkleDelay}s;` : "";
    return `color:color-mix(in srgb, ${colors[run.zone]} ${alpha}%, transparent);${delay}`;
  }

  $effect(() => {
    const mql = window.matchMedia("(min-width: 640px)");
    isDesktop = mql.matches;
    const handler = (e: MediaQueryListEvent) => (isDesktop = e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  });

  $effect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotion = mql.matches;
    const handler = (e: MediaQueryListEvent) => (reducedMotion = e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  });

  $effect(() => {
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        inViewport = entry?.isIntersecting ?? true;
      },
      { rootMargin: "200px 0px" },
    );

    observer.observe(container);
    return () => observer.disconnect();
  });

  $effect(() => {
    pageVisible = document.visibilityState === "visible";
    const handleVisibilityChange = () => {
      pageVisible = document.visibilityState === "visible";
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  });

  $effect(() => {
    if (reducedMotion) {
      waterTime = 0;
    }
  });

  $effect(() => {
    if (!container || !artBlock) return;

    const measure = () => {
      // offsetWidth/Height report layout size, unaffected by the scale transform
      naturalW = artBlock?.offsetWidth ?? 0;
      naturalH = artBlock?.offsetHeight ?? 0;
      containerW = container?.clientWidth ?? 0;
    };

    const observer = new ResizeObserver(measure);
    observer.observe(container);
    observer.observe(artBlock);
    measure();
    return () => observer.disconnect();
  });

  $effect(() => {
    const observer = new MutationObserver(() => {
      themeVersion += 1;
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  });

  $effect(() => {
    void themeVersion;
    if (container) palette = resolveZonePalette(getComputedStyle(container));
  });

  // The scene wash, one pixel per character cell; CSS scales the canvases up smoothly.
  $effect(() => {
    if (!palette || !skyCanvas || !seaCanvas) return;

    const image = new ImageData(
      renderBackgroundPixels(config, palette, world, weatherParams, atmosphereGrid, skyParams),
      config.width,
      config.height,
    );
    skyCanvas.getContext("2d")?.putImageData(image, 0, 0);
    seaCanvas.getContext("2d")?.putImageData(image, 0, -seaTop);
  });

  $effect(() => {
    if (!shouldAnimate) {
      return;
    }

    const speed = Math.max(waveParams.speed, 0.001);
    const animationStart = performance.now() - (waterTime / speed) * 1000;
    let frameId = 0;
    let lastCommittedFrame = -FRAME_INTERVAL_MS;

    const tick = (frameNow: number) => {
      if (frameNow - lastCommittedFrame >= FRAME_INTERVAL_MS) {
        waterTime = ((frameNow - animationStart) / 1000) * speed;
        lastCommittedFrame = frameNow;
      }
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  });

  $effect(() => {
    const id = setInterval(() => {
      now = Date.now();
    }, 60_000);
    return () => clearInterval(id);
  });
</script>

<div
  bind:this={container}
  class="ascii-horizon font-mono select-none"
  class:motion-paused={!shouldAnimate}
  transition:fade={{ duration: 1000 }}
  aria-hidden="true"
>
  <div
    class="scale-box"
    style={naturalW > 0 ? `width:${naturalW * scale}px;height:${naturalH * scale}px;` : undefined}
  >
    <div bind:this={artBlock} class="art-block" style={`transform:scale(${scale});`}>
      <!-- Sky and sea are separate layers so smooth scaling never blurs the horizon. -->
      <canvas
        bind:this={skyCanvas}
        class="wash"
        width={config.width}
        height={seaTop}
        style={`top:0;height:${(seaTop / config.height) * 100}%;`}
      ></canvas>
      <canvas
        bind:this={seaCanvas}
        class="wash"
        width={config.width}
        height={config.height - seaTop}
        style={`bottom:0;height:${(1 - seaTop / config.height) * 100}%;`}
      ></canvas>
      {#each spans as row}
        <p>
          {#each row as run}<span class:star={run.zone === "star"} style={runStyle(run)}
              >{run.chars}</span
            >{/each}
        </p>
      {/each}
    </div>
  </div>
</div>

<style>
  .ascii-horizon {
    line-height: 1.15;
    letter-spacing: 0;
    overflow: hidden;
    text-align: center;
  }

  .scale-box {
    display: inline-block;
    overflow: hidden;
  }

  .art-block {
    position: relative;
    display: inline-block;
    text-align: left;
    white-space: pre;
    font-size: 11px;
    transform-origin: top left;
  }

  .wash {
    position: absolute;
    left: 0;
    z-index: -1;
    width: 100%;
  }

  .star {
    animation: var(--animate-glow);
  }

  .motion-paused .star {
    animation: none;
  }

  @media (prefers-reduced-motion: reduce) {
    .star {
      animation: none;
    }
  }
</style>
