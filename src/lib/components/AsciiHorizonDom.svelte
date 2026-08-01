<script lang="ts">
  import { fade } from "svelte/transition";
  import {
    generateHorizon,
    DESKTOP_CONFIG,
    MOBILE_CONFIG,
    type AsciiCell,
    type WaveParams,
    type SkyParams,
    type WeatherParams,
  } from "$lib/horizon";
  import { computeWorldParams } from "$lib/horizon/world";
  import { renderBackgroundPixels } from "$lib/horizon/background";
  import { encodeRuns, resolveZonePalette } from "$lib/horizon/render";

  const TARGET_FPS = 12;
  const FRAME_INTERVAL_MS = 1000 / TARGET_FPS;

  let {
    waveParams,
    skyParams,
    weatherParams,
  }: {
    waveParams: WaveParams;
    skyParams: SkyParams;
    weatherParams: WeatherParams;
  } = $props();

  let container: HTMLDivElement | undefined = $state();
  let artBlock: HTMLDivElement | undefined = $state();
  let naturalW = $state(0);
  let naturalH = $state(0);
  let containerW = $state(0);
  let themeVersion = $state(0);
  let bgUrl = $state("");
  let isDesktop = $state(false);
  let reducedMotion = $state(false);
  let inViewport = $state(true);
  let pageVisible = $state(true);
  let waterTime = $state(0);
  let now = $state(Date.now());

  const config = $derived(isDesktop ? DESKTOP_CONFIG : MOBILE_CONFIG);
  const shouldAnimate = $derived(!reducedMotion && inViewport && pageVisible);
  const grid = $derived(
    generateHorizon(now, config, waterTime, waveParams, skyParams, weatherParams),
  );
  const spans = $derived(
    encodeRuns(grid) as { chars: string; zone: AsciiCell["zone"]; twinkleDelay?: number }[][],
  );
  const world = $derived(computeWorldParams(now, waterTime, skyParams));
  // Scale the fixed-font art block down to the container so narrow cards see
  // the whole scene (matching the canvas renderers) instead of clipping it.
  const scale = $derived(naturalW > 0 && containerW > 0 ? Math.min(1, containerW / naturalW) : 1);
  const bgStyle = $derived(
    bgUrl
      ? `background-image: url(${bgUrl}); background-size: 100% 100%; image-rendering: pixelated;`
      : "",
  );

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

  // Dithered scene wash rendered at one pixel per character cell, scaled up
  // with pixelated rendering so the background shares the glyph grid.
  $effect(() => {
    void themeVersion;
    if (!container) return;

    const palette = resolveZonePalette(getComputedStyle(container));
    const pixels = renderBackgroundPixels(config, palette, world, weatherParams);
    const tile = document.createElement("canvas");
    tile.width = config.width;
    tile.height = config.height;
    const ctx = tile.getContext("2d");
    if (!ctx) return;
    ctx.putImageData(new ImageData(pixels, config.width, config.height), 0, 0);
    bgUrl = tile.toDataURL();
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
    <div bind:this={artBlock} class="art-block" style={`${bgStyle}transform:scale(${scale});`}>
      {#each spans as row}
        <p>
          {#each row as run}<span
              class={run.zone}
              style={run.twinkleDelay != null ? `animation-delay: ${run.twinkleDelay}s` : undefined}
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
    display: inline-block;
    text-align: left;
    white-space: pre;
    font-size: 11px;
    transform-origin: top left;
  }

  .star {
    color: var(--color-horizon-star);
    animation: var(--animate-glow);
  }

  .sky {
    color: var(--color-horizon-sky);
  }

  .sky-glow {
    color: var(--color-horizon-sky-glow);
  }

  .cloud-light {
    color: var(--color-horizon-cloud-light);
  }

  .cloud-shadow {
    color: var(--color-horizon-cloud-shadow);
  }

  .rain {
    color: var(--color-horizon-rain);
  }

  .spray {
    color: var(--color-horizon-spray);
  }

  .sun-core {
    color: var(--color-horizon-sun-core);
  }

  .sun {
    color: var(--color-horizon-sun);
  }

  .moon-core {
    color: var(--color-horizon-moon-core);
  }

  .moon {
    color: var(--color-horizon-moon);
  }

  .horizon {
    color: var(--color-horizon-horizon);
  }

  .water {
    color: var(--color-horizon-water);
  }

  .water-reflect {
    color: var(--color-horizon-water-reflect);
  }

  .water-reflect-warm {
    color: var(--color-horizon-water-reflect-warm);
  }

  .water-reflect-cool {
    color: var(--color-horizon-water-reflect-cool);
  }

  .foam {
    color: var(--color-horizon-foam);
  }

  .water-far {
    color: var(--color-horizon-water-far);
  }

  .motion-paused .star {
    animation: none;
    opacity: 0.8;
  }

  @media (prefers-reduced-motion: reduce) {
    .star {
      animation: none;
      opacity: 0.8;
    }
  }
</style>
