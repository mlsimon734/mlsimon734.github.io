// An overgrown alley at night, built as points from one photograph: a generated image, and the
// depth MoGe-2 estimates for each of its pixels. The export script packs the two as alley.jpg and
// alley.depth: deflated, a header, then a log-spaced code per pixel (0 where MoGe saw nothing),
// stored as differences along each row. Units are metres; the photograph's camera sits at the
// origin and looks down −z, y up.
import colorUrl from "./alley.jpg?url";
import depthUrl from "./alley.depth?url";

/** Per point: position + size factor, linear colour + material. */
export const POINT_FLOATS = 8;
/** Read by flow.wgsl: lights hold still and are drawn with finer grains. */
export const MATERIAL = { surface: 0, emissive: 1 } as const;

/** Distance at which grains are sized to cover the frame; nearer they overlap, farther they thin. */
const REFERENCE_DEPTH = 8;
/** Grains per steradian grow with distance as d^DENSITY_POWER; flow.wgsl shrinks them to match. */
const DENSITY_POWER = 0.9;
/** Lights are drawn with finer grains (flow.wgsl), so they take more of them. */
const FINE = 4;
/** The frame stays this far inside the photograph, so the rig's drift never shows its edge. */
const MARGIN = 0.92;

export interface Photo {
  width: number;
  height: number;
  /** Focal lengths, as fractions of the width and the height; the principal point is central. */
  fx: number;
  fy: number;
  /** Metres along the axis for each pixel, row by row from the top; 0 for none. */
  depth: Float32Array;
  /** RGBA, sRGB. */
  color: Uint8ClampedArray;
}

export interface View {
  aspect: number;
  /** Vertical field of view, radians. */
  fov: number;
  target: [number, number, number];
}

export interface Layout {
  points: Float32Array<ArrayBuffer>;
  /** Grains per steradian of view at REFERENCE_DEPTH. */
  density: number;
}

export async function loadPhoto(): Promise<Photo> {
  const fetched = async (url: string) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url}: ${response.status}`);
    return response;
  };
  const [bitmap, buffer] = await Promise.all([
    fetched(colorUrl)
      .then((response) => response.blob())
      .then((blob) => createImageBitmap(blob, { colorSpaceConversion: "none" })),
    fetched(depthUrl).then((response) =>
      new Response(response.body?.pipeThrough(new DecompressionStream("deflate"))).arrayBuffer(),
    ),
  ]);
  const header = new DataView(buffer, 0, 28);
  const width = header.getUint32(0, true);
  const height = header.getUint32(4, true);
  const levels = header.getUint32(8, true);
  const near = header.getFloat32(20, true);
  const far = header.getFloat32(24, true);
  if (bitmap.width !== width || bitmap.height !== height) throw new Error("alley assets disagree");
  const deltas = new DataView(buffer, 28);
  const depth = new Float32Array(width * height);
  const step = Math.log(far / near) / (levels - 1);
  for (let j = 0; j < height; j++) {
    let code = 0;
    for (let i = 0; i < width; i++) {
      const k = j * width + i;
      code += deltas.getInt16(k * 2, true);
      if (code) depth[k] = near * Math.exp((code - 1) * step);
    }
  }
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("no 2D context to decode the alley");
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  return {
    width,
    height,
    fx: header.getFloat32(12, true),
    fy: header.getFloat32(16, true),
    depth,
    color: context.getImageData(0, 0, width, height).data,
  };
}

/** Frames the photograph's view: whole height on narrow screens, whole width on wide ones. */
export function viewFor(aspect: number, photo: Photo): View {
  const across = (MARGIN * 0.5) / photo.fx;
  const tall = (MARGIN * 0.5) / photo.fy;
  const fov = 2 * Math.atan(Math.min(tall, across / aspect));
  return { aspect, fov, target: [0, 0, -10] };
}

const LINEAR = Array.from({ length: 256 }, (_, i) => {
  const c = i / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
});

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** How far a pixel reads as a light: its brightest channel, near the top of the range. */
function glowOf(color: Uint8ClampedArray, o: number): number {
  const peak = Math.max(color[o], color[o + 1], color[o + 2]) / 255;
  const t = Math.min(Math.max((peak - 0.78) / 0.22, 0), 1);
  return t * t * (3 - 2 * t);
}

export function buildLayout(count: number, photo: Photo): Layout {
  const { width, height, fx, fy, depth, color } = photo;
  const random = mulberry32(20261019);
  // A pixel's share is the solid angle it covers, biased toward the distance: the near alley is
  // drawn by fewer, larger grains and the far end by fine dust.
  const pixel = 1 / (fx * width * fy * height);
  const weights = new Float32Array(width * height);
  let total = 0;
  for (let j = 0; j < height; j++) {
    const y = ((j + 0.5) / height - 0.5) / fy;
    for (let i = 0; i < width; i++) {
      const k = j * width + i;
      const d = depth[k];
      if (!d) continue;
      const x = ((i + 0.5) / width - 0.5) / fx;
      const solid = pixel / Math.pow(1 + x * x + y * y, 1.5);
      const fine = glowOf(color, k * 4) > 0.5 ? FINE : 1;
      weights[k] = fine * solid * Math.pow(d / REFERENCE_DEPTH, DENSITY_POWER);
      total += weights[k];
    }
  }
  const density = count / total;
  const points = new Float32Array(count * POINT_FLOATS);
  let written = 0;
  // Each pixel's fractional share carries into the next, so the total comes out exact.
  let carry = random();
  for (let k = 0; k < weights.length && written < count; k++) {
    carry += weights[k] * density;
    const n = Math.floor(carry);
    carry -= n;
    if (!n) continue;
    const i = k % width;
    const j = (k - i) / width;
    const d = depth[k];
    const o = k * 4;
    const glow = glowOf(color, o);
    // Lights carry more than white, so they bloom: up to six times, at the very brightest.
    const gain = 1 + 5 * glow;
    const material = glow > 0.5 ? MATERIAL.emissive : MATERIAL.surface;
    for (let g = 0; g < n && written < count; g++) {
      // Anywhere inside the pixel, at its depth.
      const x = ((i + random()) / width - 0.5) / fx;
      const y = ((j + random()) / height - 0.5) / fy;
      const p = written * POINT_FLOATS;
      points[p] = x * d;
      points[p + 1] = -y * d;
      points[p + 2] = -d;
      points[p + 3] = 0.7 + random() * 0.6;
      points[p + 4] = LINEAR[color[o]] * gain;
      points[p + 5] = LINEAR[color[o + 1]] * gain;
      points[p + 6] = LINEAR[color[o + 2]] * gain;
      points[p + 7] = material;
      written++;
    }
  }
  // Any shortfall stays zero-sized, and draws nothing.
  return { points, density };
}
