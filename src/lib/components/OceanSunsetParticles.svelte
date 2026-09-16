<script lang="ts">
  import { untrack } from "svelte";
  import { DEFAULT_SKY_PARAMS, DEFAULT_WAVE_PARAMS, DEFAULT_WEATHER_PARAMS } from "$lib/horizon";
  import { resolveZonePalette } from "$lib/horizon/render";
  import { DEFAULT_PARTICLE_PARAMS, type ParticleParams } from "$lib/particles/types";
  import { buildParametricSunset } from "$lib/particles/source-parametric";
  import { PARTICLE_VERT, PARTICLE_FRAG } from "$lib/particles/shaders";
  import AsciiHorizonDom from "./AsciiHorizonDom.svelte";
  import MotionControl from "./MotionControl.svelte";
  import * as THREE from "three";
  import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
  import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
  import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
  import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

  const FRAME_INTERVAL_MS = 1000 / 30;
  const SUNSET_STUDY_TIME = Date.UTC(2026, 4, 20, 1, 30);
  const CAMERA_HOME = new THREE.Vector3(0, 0.18, 7.3);
  const LOOK_AT_HOME = new THREE.Vector3(0.15, -0.22, -2.8);

  let { params = DEFAULT_PARTICLE_PARAMS }: { params?: ParticleParams } = $props();
  let canvas: HTMLCanvasElement | undefined = $state();
  let container: HTMLDivElement | undefined = $state();
  let paused = $state(false);
  let reducedMotion = $state(false);
  let inViewport = $state(true);
  let pageVisible = $state(true);
  let supported = $state(true);
  let themeVersion = $state(0);
  let draw: ((delta: number) => void) | null = $state(null);
  let pointerX = 0;
  let pointerY = 0;
  const shouldAnimate = $derived(!paused && !reducedMotion && inViewport && pageVisible);

  $effect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotion = mql.matches;
    const handler = (event: MediaQueryListEvent) => (reducedMotion = event.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  });

  $effect(() => {
    pageVisible = document.visibilityState === "visible";
    const handler = () => (pageVisible = document.visibilityState === "visible");
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  });

  $effect(() => {
    if (!container) return;
    const observer = new IntersectionObserver(([entry]) => {
      inViewport = entry?.isIntersecting ?? false;
    });
    observer.observe(container);
    return () => observer.disconnect();
  });

  $effect(() => {
    const observer = new MutationObserver(() => themeVersion++);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  });

  $effect(() => {
    if (!canvas || !container) return;
    const element = container;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false });
    } catch (error) {
      console.error("Ocean sunset renderer unavailable:", error);
      supported = false;
      return;
    }
    renderer.setClearColor(0x02040b, 1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.9;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 40);
    camera.position.copy(CAMERA_HOME);
    camera.lookAt(LOOK_AT_HOME);
    const material = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: PARTICLE_VERT.replace(/^#version 300 es\n/, ""),
      fragmentShader: PARTICLE_FRAG.replace(/^#version 300 es\n/, ""),
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: 1 },
        uViewportHeight: { value: 600 },
        uPointScale: { value: 1 },
        uWaveStrength: { value: 0.09 },
        uWaveFrequency: { value: 1 },
      },
      depthWrite: true,
      depthTest: true,
    });
    const geometry = new THREE.BufferGeometry();
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    scene.add(points);
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.32, 0.15, 1.2);
    const output = new OutputPass();
    composer.addPass(renderPass);
    composer.addPass(bloom);
    composer.addPass(output);
    let time = 0;
    const targetCamera = new THREE.Vector3();
    const targetLook = new THREE.Vector3();

    const render = (delta: number) => {
      const settings = untrack(() => params);
      time += delta * settings.speed;
      material.uniforms.uTime.value = time;
      material.uniforms.uPointScale.value = settings.pointSize;
      material.uniforms.uWaveStrength.value = settings.waveStrength;
      material.uniforms.uWaveFrequency.value = settings.waveFrequency;
      if (delta > 0) {
        targetCamera
          .set(pointerX * 0.8, pointerY * -0.4, -Math.abs(pointerX) * 0.2)
          .add(CAMERA_HOME);
        targetLook.set(pointerX * 0.3, pointerY * -0.15, 0).add(LOOK_AT_HOME);
        camera.position.lerp(targetCamera, 1 - Math.exp(-3.2 * delta));
        camera.lookAt(targetLook);
      }
      composer.render();
    };

    // Refresh the cloud on theme changes; retain the renderer, camera and wave clock.
    $effect(() => {
      void themeVersion;
      const palette = resolveZonePalette(getComputedStyle(document.documentElement));
      const cloud = buildParametricSunset(palette, {
        now: SUNSET_STUDY_TIME,
        count: window.matchMedia("(max-width: 639px)").matches ? 90_000 : 180_000,
      });
      // Dispose old GPU buffers before replacing attributes on a palette change.
      geometry.dispose();
      geometry.setAttribute("position", new THREE.BufferAttribute(cloud.positions, 3));
      geometry.setAttribute("particleColor", new THREE.BufferAttribute(cloud.colors, 3));
      geometry.setAttribute("particleSize", new THREE.BufferAttribute(cloud.sizes, 1));
      geometry.setAttribute("particleSeed", new THREE.BufferAttribute(cloud.seeds, 1));
      geometry.setAttribute("particleMotion", new THREE.BufferAttribute(cloud.motion, 1));
      geometry.setDrawRange(0, cloud.count);
      render(0);
    });

    let renderWidth = 0;
    let renderDpr = 0;
    let resizeFrame = 0;
    const resize = () => {
      const width = Math.max(1, Math.round(element.getBoundingClientRect().width));
      const height = Math.max(360, Math.round(width * 0.7));
      const dpr = Math.min(window.devicePixelRatio || 1, width < 640 ? 1.25 : 1.5);
      if (width === renderWidth && dpr === renderDpr) return;
      renderWidth = width;
      renderDpr = dpr;
      renderer.setPixelRatio(dpr);
      renderer.setSize(width, height, false);
      composer.setPixelRatio(dpr);
      composer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      material.uniforms.uPixelRatio.value = dpr;
      material.uniforms.uViewportHeight.value = height;
      render(0);
    };
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(resize);
    });
    resize();
    observer.observe(element);
    draw = render;
    return () => {
      observer.disconnect();
      cancelAnimationFrame(resizeFrame);
      draw = null;
      geometry.dispose();
      material.dispose();
      bloom.dispose();
      output.dispose();
      composer.dispose();
      renderer.dispose();
    };
  });

  $effect(() => {
    const render = draw;
    if (!render || !shouldAnimate) return;
    let frameId = 0;
    let previous = performance.now();
    let pending = 0;
    const tick = (now: number) => {
      pending += Math.max(0, now - previous);
      previous = now;
      if (pending + 0.001 >= FRAME_INTERVAL_MS) {
        const steps = Math.floor((pending + 0.001) / FRAME_INTERVAL_MS);
        const elapsed = steps * FRAME_INTERVAL_MS;
        pending = Math.max(0, pending - elapsed);
        render(Math.min(0.1, elapsed / 1000));
      }
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  });

  function movePointer(event: PointerEvent) {
    if (
      !container ||
      !shouldAnimate ||
      !window.matchMedia("(hover: hover) and (pointer: fine)").matches
    )
      return;
    const rect = container.getBoundingClientRect();
    pointerX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    pointerY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
  }
</script>

{#if supported}
  <div
    bind:this={container}
    class="canvas-shell"
    onpointermove={movePointer}
    onpointerleave={() => {
      pointerX = 0;
      pointerY = 0;
    }}
    role="presentation"
  >
    <canvas bind:this={canvas} class="render-surface" aria-hidden="true"></canvas>
  </div>
{:else}
  <div class="fallback-note horizon-scene">
    <p>The particle view is unavailable in this browser. Here is the ASCII ocean.</p>
    <AsciiHorizonDom
      waveParams={DEFAULT_WAVE_PARAMS}
      skyParams={DEFAULT_SKY_PARAMS}
      weatherParams={DEFAULT_WEATHER_PARAMS}
      {paused}
    />
  </div>
{/if}
<MotionControl bind:paused {reducedMotion} />

<style>
  .canvas-shell {
    width: 100%;
    overflow: hidden;
  }
  .render-surface {
    display: block;
    width: 100%;
    height: auto;
    touch-action: pan-y;
  }
  .fallback-note {
    display: grid;
    gap: 0.75rem;
    padding: 1rem;
  }
  .fallback-note p {
    margin: 0;
    font-size: 0.8rem;
    color: var(--color-theme-subtle);
    text-align: center;
  }
</style>
