<script lang="ts">
  import { onMount, untrack } from "svelte";
  import { createForestVgpu, type ForestVgpu } from "#lib/particles/forest/renderer.js";
  import MotionControl from "./MotionControl.svelte";

  let canvas = $state<HTMLCanvasElement>();
  let container = $state<HTMLDivElement>();
  let renderer = $state<ForestVgpu>();
  let paused = $state(false);
  let reducedMotion = $state(false);
  let inViewport = $state(true);
  let pageVisible = $state(true);
  let failed = $state(false);
  let pointer: [number, number] = [0, 0];
  // Grains are soft beads under bloom; extra device pixels would only multiply the grain count.
  const MAX_DPR = 1.25;
  const shouldAnimate = $derived(!paused && !reducedMotion && inViewport && pageVisible && !failed);

  function render(delta: number) {
    if (!renderer || failed) return;
    renderer.render({ delta, pointer });
  }

  onMount(() => {
    if (!canvas || !container) return;
    const element = container;
    let disposed = false;
    let current: ForestVgpu | undefined;
    let resizeFrame = 0;

    const bounds = element.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    // About one grain for every two device pixels, as in the ocean.
    const count = Math.round(
      Math.min(1_100_000, Math.max(150_000, bounds.width * bounds.height * dpr * dpr * 0.7)),
    );
    const fail = (error: unknown) => {
      if (disposed) return;
      console.error("Forest WebGPU study unavailable:", error);
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
    void createForestVgpu(canvas, count, fail)
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
      cancelAnimationFrame(resizeFrame);
      sizeObserver.disconnect();
      visibilityObserver.disconnect();
      media.removeEventListener("change", motion);
      document.removeEventListener("visibilitychange", visibility);
      current?.dispose();
    };
  });

  $effect(() => {
    if (!renderer || !shouldAnimate) return;
    let frameId = 0;
    let previous = performance.now();
    let pending = 0;
    // Up to 60 fps, as in the ocean: a 120 Hz display renders every other tick.
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
          console.error("Forest WebGPU rendering failed:", error);
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
</script>

<figure class="forest">
  <div
    bind:this={container}
    class="canvas-shell"
    onpointermove={movePointer}
    onpointerleave={() => (pointer = [0, 0])}
    role="presentation"
  >
    <canvas bind:this={canvas} aria-hidden="true"></canvas>
    {#if failed}
      <p class="status" role="status">This study needs WebGPU, which is unavailable here.</p>
    {:else if !renderer}
      <p class="status" role="status">Stringing the lights…</p>
    {/if}
  </div>
  {#if renderer && !failed}
    <figcaption>
      <MotionControl bind:paused {reducedMotion} subject="forest" />
    </figcaption>
  {/if}
</figure>

<style>
  .forest {
    margin: 0;
  }
  .canvas-shell {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
    max-height: 82svh;
    overflow: hidden;
    background: #010103;
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
    align-items: center;
    justify-content: center;
    margin: 0;
    padding: 2rem;
    text-align: center;
    color: #cfe6ee;
    font-size: 0.95rem;
  }
  figcaption {
    display: flex;
    justify-content: flex-end;
    padding-top: 0.75rem;
  }
</style>
