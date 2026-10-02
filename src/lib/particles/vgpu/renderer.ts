/// <reference types="@webgpu/types" />
import { compute, draw, effect, frame, init, sampler, storage, surface, target } from "vgpu";
import { PerspectiveCamera, Vector3, WebGPUCoordinateSystem } from "three";
import type { ParticleCloud, ParticleParams } from "../types";
import particleShader from "./particles.wgsl?raw";
import sprayShader from "./spray.wgsl?raw";
import bloomShader from "./bloom.wgsl?raw";
import presentShader from "./present.wgsl?raw";

export type OceanVgpu = Awaited<ReturnType<typeof createOceanVgpu>>;

/** Owns one device and its resources. The Svelte component owns visibility and time. */
export async function createOceanVgpu(
  canvas: HTMLCanvasElement,
  cloud: ParticleCloud,
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
      clearColor: [2 / 255, 4 / 255, 11 / 255, 1],
    });
    const bloomX = target(gpu, { size: [1, 1], format: "rgba16float" });
    const bloomY = target(gpu, { size: [1, 1], format: "rgba16float" });
    const haloX = target(gpu, { size: [1, 1], format: "rgba16float" });
    const haloY = target(gpu, { size: [1, 1], format: "rgba16float" });
    const linearSampler = sampler(gpu, { minFilter: "linear", magFilter: "linear" });
    const particleData = new Float32Array(cloud.count * 12);
    // Lift a sparse cohort from the sea; total particle count remains unchanged.
    const sprayIndices: number[] = [];
    for (let i = 0; i < cloud.count; i++) {
      if (cloud.motion[i] === 1 && i % 24 === 0) sprayIndices.push(i);
    }
    const sprayIndex = new Map(sprayIndices.map((index, slot) => [index, slot]));
    const anchors = new Float32Array(sprayIndices.length * 4);
    const initialSpray = new Float32Array(sprayIndices.length * 8);
    for (const [slot, index] of sprayIndices.entries()) {
      const seed = cloud.seeds[index];
      anchors.set([...cloud.positions.subarray(index * 3, index * 3 + 3), seed], slot * 4);
      // Stagger the launch times; the first frame retains the original surface.
      initialSpray.set([0, 0, 0, seed * 2, 0, 0, 0, 2 + seed * 2], slot * 8);
    }
    const particles = storage(gpu, particleData.byteLength, "read");
    const spray = storage(gpu, initialSpray.byteLength);
    const anchorBuffer = storage(gpu, anchors.byteLength, "read");
    spray.write(initialSpray);
    anchorBuffer.write(anchors);
    function setCloud(next: ParticleCloud) {
      if (next.count !== cloud.count) throw new Error("Particle count changed during a scene");
      for (let i = 0; i < next.count; i++) {
        const p = i * 3;
        const offset = i * 12;
        particleData.set(
          [
            next.positions[p],
            next.positions[p + 1],
            next.positions[p + 2],
            next.sizes[i],
            next.colors[p],
            next.colors[p + 1],
            next.colors[p + 2],
            next.seeds[i],
            next.motion[i],
            sprayIndex.get(i) ?? -1,
            0,
            0,
          ],
          offset,
        );
      }
      particles.write(particleData);
    }
    setCloud(cloud);
    const camera = new PerspectiveCamera(43, 1, 0.1, 40);
    camera.coordinateSystem = WebGPUCoordinateSystem;
    const home = new Vector3(0, 0.18, 7.3);
    const lookHome = new Vector3(0.15, -0.22, -2.8);
    const cameraTarget = new Vector3();
    const lookTarget = new Vector3();
    camera.position.copy(home);
    camera.lookAt(lookHome);
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();
    const uniforms = {
      view: camera.matrixWorldInverse.elements,
      projection: camera.projectionMatrix.elements,
      viewport: [1, 1],
      time: 0,
      pointScale: 1,
      waveStrength: 0.09,
      waveFrequency: 1,
      sprayEnabled: 1,
      padding: 0,
    };
    const grains = draw(gpu, {
      shader: particleShader,
      vertices: 6,
      instances: cloud.count,
      set: { particles, spray, scene: uniforms },
    });
    const simulation = compute(gpu, sprayShader, {
      set: {
        spray,
        anchors: anchorBuffer,
        step: { time: 0, delta: 0, count: sprayIndices.length, padding: 0 },
      },
    });
    const horizontal = effect(gpu, bloomShader, {
      set: { source: scene, linearSampler, blur: { direction: [1, 0], threshold: 1, padding: 0 } },
    });
    const vertical = effect(gpu, bloomShader, {
      set: { source: bloomX, linearSampler, blur: { direction: [0, 1], threshold: 0, padding: 0 } },
    });
    const present = effect(gpu, presentShader, {
      set: { scene, bloom: bloomY, halo: haloY, linearSampler },
    });
    const haloHorizontal = effect(gpu, bloomShader, {
      set: { source: bloomY, linearSampler, blur: { direction: [1, 0], threshold: 0, padding: 0 } },
    });
    const haloVertical = effect(gpu, bloomShader, {
      set: { source: haloX, linearSampler, blur: { direction: [0, 1], threshold: 0, padding: 0 } },
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
    return {
      setCloud,
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
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        uniforms.viewport = size;
      },
      render(
        delta: number,
        settings: ParticleParams,
        pointer: readonly [number, number],
        sprayEnabled: boolean,
      ) {
        time += delta * settings.speed;
        if (delta > 0) {
          cameraTarget
            .set(pointer[0] * 0.8, pointer[1] * -0.4, -Math.abs(pointer[0]) * 0.2)
            .add(home);
          lookTarget.set(pointer[0] * 0.3, pointer[1] * -0.15, 0).add(lookHome);
          camera.position.lerp(cameraTarget, 1 - Math.exp(-3.2 * delta));
          camera.lookAt(lookTarget);
          camera.updateMatrixWorld();
          if (sprayEnabled) {
            simulation.set({ step: { time, delta: delta * settings.speed } });
            simulation.dispatch(Math.ceil(sprayIndices.length / 64));
          }
        }
        uniforms.time = time;
        uniforms.pointScale = settings.pointSize;
        uniforms.waveStrength = settings.waveStrength;
        uniforms.waveFrequency = settings.waveFrequency;
        uniforms.sprayEnabled = Number(sprayEnabled);
        grains.set({ scene: uniforms });
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
