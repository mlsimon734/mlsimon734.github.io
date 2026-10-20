/// <reference types="@webgpu/types" />
import { compute, draw, effect, frame, init, sampler, storage, surface, target } from "vgpu";
import { PerspectiveCamera, WebGPUCoordinateSystem } from "three";
import type { WeatherParams } from "#lib/horizon/types.js";
import {
  GRAIN_FLOATS,
  MAX_WAVES,
  OBSERVER_LATITUDE,
  WAVE_FLOATS,
  buildLayout,
  environmentAt,
  viewFor,
  waveSpectrum,
  type View,
} from "./scene";
import commonShader from "./common.wgsl?raw";
import skyShader from "./sky.wgsl?raw";
import fieldShader from "./field.wgsl?raw";
import grainShader from "./grains.wgsl?raw";
import bloomShader from "./bloom.wgsl?raw";
import presentShader from "./present.wgsl?raw";

export type OceanVgpu = Awaited<ReturnType<typeof createOceanVgpu>>;

export interface Frame {
  /** Wall-clock milliseconds: sets the sun, moon and stars. */
  now: number;
  /** Seconds since the previous frame; zero renders a still. */
  delta: number;
  weather: WeatherParams;
  /** Pointer position, −1 to 1 on each axis. */
  pointer: readonly [number, number];
}

const LUT_ENTRIES = 128 * 64 + 4;
const SUN_INTENSITY = 18;
const DEG = Math.PI / 180;
// Grains overlap into solid surfaces, as in the source reconstruction; darkness comes from
// where the scene thins out, not from gaps between grains.
const COVERAGE = 0.9;
// Mean squared size over a life (envelope in field.wgsl) times the spread of grain sizes.
const GROWTH_SQUARED = 0.72;

/** Owns one device and its resources. The Svelte component owns visibility and time. */
export async function createOceanVgpu(
  canvas: HTMLCanvasElement,
  count: number,
  onError: (error: unknown) => void,
) {
  const gpu = await init();
  try {
    gpu.onError(onError);
    void gpu.gpu.lost.then((info) => {
      if (!gpu.disposed) onError(new Error(info.message || "WebGPU device lost"));
    });
    const output = surface(gpu, canvas, { autoResize: false, size: [1, 1], dpr: 1 });
    const scene = target(gpu, {
      size: [1, 1],
      depth: true,
      format: "rgba16float",
      clearColor: [1 / 255, 2 / 255, 6 / 255, 1],
    });
    const bloomX = target(gpu, { size: [1, 1], format: "rgba16float" });
    const bloomY = target(gpu, { size: [1, 1], format: "rgba16float" });
    const haloX = target(gpu, { size: [1, 1], format: "rgba16float" });
    const haloY = target(gpu, { size: [1, 1], format: "rgba16float" });
    const linearSampler = sampler(gpu, { minFilter: "linear", magFilter: "linear" });

    const grainBuffer = storage(gpu, count * GRAIN_FLOATS * 4, "read");
    const stateBuffer = storage(gpu, count * 16);
    const litBuffer = storage(gpu, count * 32);
    const lutBuffer = storage(gpu, LUT_ENTRIES * 16);
    const waveBuffer = storage(gpu, MAX_WAVES * WAVE_FLOATS * 4, "read");
    let view: View = viewFor(16 / 9);
    const layout = buildLayout(count, view);
    grainBuffer.write(layout);
    // Stagger lives from each grain's own seed so the field breathes unevenly from the start.
    const initialState = new Float32Array(count * 4);
    for (let i = 0; i < count; i++)
      initialState[i * 4 + 3] = (layout[i * GRAIN_FLOATS + 4] * 7.31) % 1;
    stateBuffer.write(initialState);

    const camera = new PerspectiveCamera(30, 16 / 9, 0.5, 6000);
    camera.coordinateSystem = WebGPUCoordinateSystem;
    camera.rotation.order = "YXZ";
    const sky = compute(gpu, commonShader + skyShader, {
      label: "sky",
      set: { lut: lutBuffer },
    });
    const field = compute(gpu, commonShader + fieldShader, {
      label: "field",
      set: {
        grains: grainBuffer,
        state: stateBuffer,
        lit: litBuffer,
        lut: lutBuffer,
        waves: waveBuffer,
      },
    });
    const cameraUniform = {
      view: camera.matrixWorldInverse.elements,
      projection: camera.projectionMatrix.elements,
      viewport: [1, 1],
    };
    const grains = draw(gpu, {
      label: "grains",
      shader: grainShader,
      vertices: 6,
      instances: count,
      set: { lit: litBuffer, camera: cameraUniform },
    });
    const horizontal = effect(gpu, bloomShader, {
      set: { source: scene, linearSampler, blur: { direction: [1, 0], threshold: 1, padding: 0 } },
    });
    const vertical = effect(gpu, bloomShader, {
      set: { source: bloomX, linearSampler, blur: { direction: [0, 1], threshold: 0, padding: 0 } },
    });
    const haloHorizontal = effect(gpu, bloomShader, {
      set: { source: bloomY, linearSampler, blur: { direction: [1, 0], threshold: 0, padding: 0 } },
    });
    const haloVertical = effect(gpu, bloomShader, {
      set: { source: haloX, linearSampler, blur: { direction: [0, 1], threshold: 0, padding: 0 } },
    });
    const present = effect(gpu, presentShader, {
      set: { scene, bloom: bloomY, halo: haloY, linearSampler },
    });
    await Promise.all([
      grains.compile(scene),
      horizontal.compile(bloomX),
      vertical.compile(bloomY),
      haloHorizontal.compile(haloX),
      haloVertical.compile(haloY),
      present.compile({ colors: [output.format] }),
    ]);

    let time = 0;
    let drift: [number, number] = [0, 0];
    let pixelSize = 2;
    let pixelAngle = 0.0005;
    let waveKey = "";
    const look = { yaw: 0, pitch: 0, x: 0 };

    return {
      resize(width: number, height: number, dpr: number) {
        const size: [number, number] = [Math.round(width * dpr), Math.round(height * dpr)];
        output.resize(size);
        scene.resize(size);
        const half: [number, number] = [
          Math.max(1, Math.round(size[0] / 2)),
          Math.max(1, Math.round(size[1] / 2)),
        ];
        bloomX.resize(half);
        bloomY.resize(half);
        const haloSize: [number, number] = [
          Math.max(1, Math.round(size[0] / 16)),
          Math.max(1, Math.round(size[1] / 16)),
        ];
        haloX.resize(haloSize);
        haloY.resize(haloSize);
        horizontal.set({ blur: { direction: [2 / size[0], 0] } });
        vertical.set({ blur: { direction: [0, 2 / size[1]] } });
        haloHorizontal.set({ blur: { direction: [16 / size[0], 0] } });
        haloVertical.set({ blur: { direction: [0, 16 / size[1]] } });
        const aspect = width / height;
        // Re-lay the grains only when the frame's shape really changes.
        if (Math.abs(Math.log(aspect / view.aspect)) > 0.08) {
          view = viewFor(aspect);
          grainBuffer.write(buildLayout(count, view));
        }
        camera.aspect = aspect;
        camera.fov = view.fov / DEG;
        camera.updateProjectionMatrix();
        pixelAngle = view.fov / size[1];
        // Size grains so they cover about COVERAGE of the frame between them.
        const density = count / (size[0] * size[1] * 1.14 * 1.12);
        pixelSize = Math.sqrt(-Math.log(1 - COVERAGE) / (density * GROWTH_SQUARED * (Math.PI / 4)));
        cameraUniform.viewport = size;
      },
      render({ now, delta, weather, pointer }: Frame) {
        time += delta;
        const environment = environmentAt(now);
        const windEnergy = Math.min(1, Math.max(0, (weather.windSpeed - 1.5) / 14));
        const travel = (weather.windDirection - environment.heading) * DEG;
        const wind: [number, number] = [Math.sin(travel), -Math.cos(travel)];
        // Clouds aloft move a little faster than the surface wind.
        const speedAloft = 4 + weather.windSpeed * 1.6;
        drift = [drift[0] + wind[0] * speedAloft * delta, drift[1] + wind[1] * speedAloft * delta];
        const key = `${weather.windSpeed.toFixed(2)}:${weather.windDirection.toFixed(1)}:${environment.heading.toFixed(1)}`;
        if (key !== waveKey) {
          waveKey = key;
          waveBuffer.write(waveSpectrum(weather, environment.heading));
        }

        // Damped pointer parallax and a slow standing sway, much gentler than the demo's rig.
        const damping = delta > 0 ? 1 - Math.exp(-1.8 * delta) : 1;
        look.yaw += (-pointer[0] * 2.4 * DEG - look.yaw) * damping;
        look.pitch += (-pointer[1] * 1.1 * DEG - look.pitch) * damping;
        look.x += (pointer[0] * 0.8 - look.x) * damping;
        camera.position.set(
          look.x + 0.35 * Math.sin(time * 0.05),
          view.eyeHeight + 0.05 * Math.sin(time * 0.17),
          0,
        );
        camera.rotation.set(
          view.pitch + look.pitch + 0.08 * DEG * Math.sin(time * 0.13),
          look.yaw,
          0.22 * DEG * Math.sin(time * 0.21),
        );
        camera.updateMatrixWorld();

        const haze = 1 + 2.2 * weather.humidity ** 2 + 1.5 * weather.precipitation;
        const moonIntensity =
          SUN_INTENSITY * 0.0016 * environment.moonIllumination ** 1.5 * environment.night;
        sky.set({
          sky: {
            sun: environment.sunDirection,
            sunIntensity: SUN_INTENSITY,
            moon: environment.moonDirection,
            moonIntensity,
            drift,
            time,
            cover: weather.cloudCover,
            haze,
          },
        });
        sky.dispatch(Math.ceil(LUT_ENTRIES / 64));
        field.set({
          field: {
            camera: [camera.position.x, camera.position.y, camera.position.z],
            time,
            sun: environment.sunDirection,
            sunIntensity: SUN_INTENSITY,
            moon: environment.moonDirection,
            moonIntensity,
            drift,
            windSpeed: weather.windSpeed,
            cover: weather.cloudCover,
            haze,
            exposure: 1,
            delta,
            night: environment.night,
            sidereal: environment.sidereal,
            latitude: OBSERVER_LATITUDE,
            heading: environment.heading * DEG,
            pixelAngle,
            flowInfluence: 0.3 - 0.25 * windEnergy,
            flowStrength: 0.004 + 0.006 * windEnergy,
            pixelSize,
            count,
            waveCount: MAX_WAVES,
            rain: weather.precipitation,
            wind,
          },
        });
        field.dispatch(Math.ceil(count / 64));
        cameraUniform.view = camera.matrixWorldInverse.elements;
        cameraUniform.projection = camera.projectionMatrix.elements;
        grains.set({ camera: cameraUniform });
        frame(gpu, (f) => {
          f.pass(scene, grains);
          f.pass(bloomX, horizontal);
          f.pass(bloomY, vertical);
          f.pass(haloX, haloHorizontal);
          f.pass(haloY, haloVertical);
          f.pass(output, present);
        });
        return environment;
      },
      dispose: () => gpu.dispose(),
    };
  } catch (error) {
    gpu.dispose();
    throw error;
  }
}
