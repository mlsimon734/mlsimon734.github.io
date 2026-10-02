<script lang="ts">
  import { onMount, untrack } from "svelte";
  import { resolveZonePalette } from "#lib/horizon/render.js";
  import { buildParametricSunset } from "#lib/particles/source-parametric.js";
  import { DEFAULT_PARTICLE_PARAMS } from "#lib/particles/types.js";
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
  let sprayEnabled = $state(true);
  let pointer: [number, number] = [0, 0];
  const shouldAnimate = $derived(!paused && !reducedMotion && inViewport && pageVisible && !failed);

  onMount(() => {
    if (!canvas || !container) return;
    const element = container;
    let disposed = false;
    let current: OceanVgpu | undefined;
    let resizeFrame = 0;
    const count = window.matchMedia("(max-width: 639px)").matches ? 90_000 : 180_000;
    const cloud = () =>
      buildParametricSunset(resolveZonePalette(getComputedStyle(document.documentElement)), {
        count,
        now: Date.UTC(2026, 4, 20, 1, 30),
      });
    const fail = (error: unknown) => {
      if (disposed) return;
      console.error("Ocean WebGPU prototype unavailable:", error);
      failed = true;
      current?.dispose();
    };
    const resize = () => {
      if (!current || failed) return;
      const width = Math.max(1, Math.round(element.getBoundingClientRect().width));
      const height = Math.max(360, Math.round(width * 0.7));
      const dpr = Math.min(window.devicePixelRatio || 1, width < 640 ? 1.25 : 1.5);
      try {
        current.resize(width, height, dpr);
        current.render(0, DEFAULT_PARTICLE_PARAMS, pointer, sprayEnabled);
      } catch (error) {
        fail(error);
      }
    };
    const sizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(resize);
    });
    sizeObserver.observe(container);
    const themeObserver = new MutationObserver(() => {
      if (!current || failed) return;
      try {
        current.setCloud(cloud());
        current.render(0, DEFAULT_PARTICLE_PARAMS, pointer, sprayEnabled);
      } catch (error) {
        fail(error);
      }
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      inViewport = entry?.isIntersecting ?? false;
    });
    visibilityObserver.observe(container);
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
    void createOceanVgpu(canvas, cloud(), fail)
      .then((value) => {
        if (disposed || failed) {
          value.dispose();
          return;
        }
        current = value;
        resize();
        renderer = value;
      })
      .catch(fail);
    return () => {
      disposed = true;
      cancelAnimationFrame(resizeFrame);
      sizeObserver.disconnect();
      themeObserver.disconnect();
      visibilityObserver.disconnect();
      media.removeEventListener("change", motion);
      document.removeEventListener("visibilitychange", visibility);
      current?.dispose();
    };
  });

  $effect(() => {
    const current = renderer;
    const spray = sprayEnabled;
    if (!current || failed) return;
    current.render(0, DEFAULT_PARTICLE_PARAMS, pointer, spray);
  });

  $effect(() => {
    const current = renderer;
    if (!current || !shouldAnimate) return;
    let frameId = 0;
    let previous = performance.now();
    let pending = 0;
    const interval = 1000 / 30;
    const tick = (now: number) => {
      pending += Math.max(0, now - previous);
      previous = now;
      if (pending + 0.001 >= interval) {
        const elapsed = Math.floor((pending + 0.001) / interval) * interval;
        pending = Math.max(0, pending - elapsed);
        try {
          current.render(
            Math.min(0.1, elapsed / 1000),
            DEFAULT_PARTICLE_PARAMS,
            pointer,
            untrack(() => sprayEnabled),
          );
        } catch (error) {
          console.error("Ocean WebGPU rendering failed:", error);
          failed = true;
          current.dispose();
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
      !window.matchMedia("(hover: hover) and (pointer: fine)").matches
    )
      return;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    pointer = [
      ((event.clientX - rect.left) / rect.width - 0.5) * 2,
      ((event.clientY - rect.top) / rect.height - 0.5) * 2,
    ];
  }
</script>

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
      <a href="/sketches/ocean-sunset" class="link">View the original ocean</a>
    </div>
  {:else if !renderer}
    <p class="status" role="status">Gathering the last light…</p>
  {/if}
</div>
{#if renderer && !failed}
  <div class="controls">
    <label><input type="checkbox" bind:checked={sprayEnabled} /> Drifting spray</label>
    <MotionControl bind:paused {reducedMotion} />
  </div>
{/if}

<style>
  .canvas-shell {
    position: relative;
    width: 100%;
    overflow: hidden;
    background: #02040b;
  }
  canvas {
    display: block;
    width: 100%;
    aspect-ratio: 10 / 7;
    min-height: 360px;
    touch-action: pan-y;
  }
  .status {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    text-align: center;
    color: #f4dfc4;
    background: #02040b;
    font-size: 0.95rem;
    gap: 0.75rem;
  }
  .controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }
  label {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 44px;
    font-size: 0.8rem;
    color: var(--color-theme-muted);
    cursor: pointer;
  }
  input {
    accent-color: var(--color-sunset-amber-400);
  }
  input:focus-visible {
    outline: 2px solid var(--color-sunset-amber-400);
    outline-offset: 3px;
  }
</style>
