/// <reference types="@webgpu/types" />
import { compute, draw, effect, frame, init, sampler, storage, surface, target } from "vgpu";
import { PerspectiveCamera, Vector3, WebGPUCoordinateSystem } from "three";
import {
  EYE,
  LIGHT_FLOATS,
  POINT_FLOATS,
  buildLayout,
  buildLights,
  viewFor,
  type View,
} from "./scene";
// The noise, the bead shading, the bloom and the grade are the ocean's.
import commonShader from "../vgpu/common.wgsl?raw";
import grainShader from "../vgpu/grains.wgsl?raw";
import bloomShader from "../vgpu/bloom.wgsl?raw";
import presentShader from "../vgpu/present.wgsl?raw";
import bakeShader from "./bake.wgsl?raw";
import flowShader from "./flow.wgsl?raw";

export type ForestVgpu = Awaited<ReturnType<typeof createForestVgpu>>;

export interface Frame {
  /** Seconds since the previous frame; zero renders a still. */
  delta: number;
  /** Pointer position, −1 to 1 on each axis. */
  pointer: readonly [number, number];
}

const DEG = Math.PI / 180;
// Expected grain area per unit of frame at the reference depth: overlapping, so surfaces read as
// solid there, denser nearer and dustier farther.
const COVERAGE = 1.6;
// Mean squared size over a life (envelope in flow.wgsl) times the spread of grain sizes.
const GROWTH_SQUARED = 0.58;
const AMBIENT: [number, number, number] = [0.05, 0.06, 0.1];
// The far haze in flow.wgsl, as the clear colour, so the gaps between grains are distance too.
const FOG: [number, number, number, number] = [0.03, 0.045, 0.08, 1];

/** Owns one device and its resources. The Svelte component owns visibility and time. */
export async function createForestVgpu(
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
      clearColor: FOG,
    });
    const bloomX = target(gpu, { size: [1, 1], format: "rgba16float" });
    const bloomY = target(gpu, { size: [1, 1], format: "rgba16float" });
    const haloX = target(gpu, { size: [1, 1], format: "rgba16float" });
    const haloY = target(gpu, { size: [1, 1], format: "rgba16float" });
    const linearSampler = sampler(gpu, { minFilter: "linear", magFilter: "linear" });

    const lights = buildLights();
    const lightCount = lights.length / LIGHT_FLOATS;
    const pointBuffer = storage(gpu, count * POINT_FLOATS * 4);
    const lightBuffer = storage(gpu, lights.byteLength, "read");
    const stateBuffer = storage(gpu, count * 16);
    const litBuffer = storage(gpu, count * 32);
    lightBuffer.write(lights);
    // Stagger lives so the wood breathes unevenly from the first frame.
    const initialState = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) initialState[i * 4 + 3] = (i * 0.618034) % 1;
    stateBuffer.write(initialState);

    const camera = new PerspectiveCamera(45, 16 / 9, 0.05, 200);
    camera.coordinateSystem = WebGPUCoordinateSystem;
    const bake = compute(gpu, bakeShader, {
      label: "bake",
      set: { points: pointBuffer, lights: lightBuffer },
    });
    const flow = compute(gpu, commonShader + flowShader, {
      label: "flow",
      set: { points: pointBuffer, state: stateBuffer, lit: litBuffer },
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

    let view: View | undefined;
    let density = 1;
    let pixelSize = 4;
    let time = 0;
    const look = { x: 0, y: 0 };
    const forward = new Vector3();

    /** Lays the wood out for this frame shape and lights it. */
    const layOut = (next: View) => {
      view = next;
      const layout = buildLayout(count, view);
      density = layout.density;
      pointBuffer.write(layout.points);
      // New homes: every grain starts its life over, with no offset carried from the old one.
      stateBuffer.write(initialState);
      bake.set({ bake: { eye: EYE, count, ambient: AMBIENT, lightCount } });
      bake.dispatch(Math.ceil(count / 64));
    };

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
        // Re-lay the wood only when the frame's shape really changes.
        if (!view || Math.abs(Math.log(aspect / view.aspect)) > 0.08) layOut(viewFor(aspect));
        const fov = view?.fov ?? 45 * DEG;
        camera.aspect = aspect;
        camera.fov = fov / DEG;
        camera.updateProjectionMatrix();
        // Size grains so they cover COVERAGE of the frame at the reference depth.
        const angle = Math.sqrt((4 * COVERAGE) / (Math.PI * GROWTH_SQUARED * density));
        pixelSize = (angle * size[1]) / (2 * Math.tan(fov / 2));
        cameraUniform.viewport = size;
      },
      render({ delta, pointer }: Frame) {
        if (!view) return;
        time += delta;
        // The source demo's rig, scaled down for a path in a wood: a slow dolly on the same
        // 12.6 s cycle, a slight roll, and damped parallax that follows the pointer.
        const damping = 1 - Math.exp(-2 * delta);
        look.x += (pointer[0] * 0.55 - look.x) * damping;
        look.y += (-pointer[1] * 0.2 - look.y) * damping;
        const dolly = 0.6 * Math.sin(time * 0.5);
        camera.position.set(
          EYE[0] + look.x + 0.12 * Math.sin(time * 0.21),
          EYE[1] + look.y + 0.04 * Math.sin(time * 0.37),
          EYE[2] - dolly,
        );
        camera.up.set(0, 1, 0);
        camera.lookAt(view.target[0], view.target[1], view.target[2]);
        camera.rotateZ(1.1 * DEG * Math.sin(time * 0.5));
        camera.updateMatrixWorld();
        camera.getWorldDirection(forward);

        flow.set({
          flow: {
            camera: [camera.position.x, camera.position.y, camera.position.z],
            time,
            forward: [forward.x, forward.y, forward.z],
            delta,
            pixelSize,
            strength: 0.75,
            influence: 0.1,
            count,
          },
        });
        flow.dispatch(Math.ceil(count / 64));
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
      },
      dispose: () => gpu.dispose(),
    };
  } catch (error) {
    gpu.dispose();
    throw error;
  }
}
