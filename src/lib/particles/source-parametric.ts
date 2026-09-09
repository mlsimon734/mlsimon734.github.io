import { computeWorldParams } from "$lib/horizon/world";
import type { ZonePalette } from "$lib/horizon/render";
import { parseCssColor } from "$lib/horizon/glyph-atlas";
import type { ParticleCloud } from "./types";

type Color = [number, number, number];
interface BuildOptions {
  count?: number;
  now?: number;
  seed?: number;
}

function randomGenerator(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function mix(a: Color, b: Color, t: number): Color {
  return a.map((v, i) => v + (b[i] - v) * t) as Color;
}
function scale(a: Color, t: number): Color {
  return a.map((v) => v * t) as Color;
}
function texture(x: number, y: number): number {
  return (
    Math.sin(x * 1.7 + Math.sin(y * 1.3)) * 0.5 +
    Math.sin(x * 4.1 - y * 2.8) * 0.28 +
    Math.sin(x * 11.3 + y * 7.1) * 0.14
  );
}

/** Dense surface samples: coastal rock, cloud banks, water and emissive glints.
 * All geometry is procedural; no source photograph or reconstructed PLY is needed.
 */
export function buildParametricSunset(
  palette: ZonePalette,
  options: BuildOptions = {},
): ParticleCloud {
  const { count = 180_000, now = Date.now(), seed = 1337 } = options;
  const rand = randomGenerator(seed);
  const sunX = -0.4 + computeWorldParams(now).sunX * 1.1;
  const sunY = 0.7;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const seeds = new Float32Array(count);
  const motion = new Float32Array(count);
  const amber = mix(parseCssColor(palette.sun), [1, 0.42, 0.07], 0.65);
  const gold: Color = [1, 0.77, 0.3];
  const cyan: Color = [0.08, 0.74, 0.94];
  const deep: Color = [0.014, 0.055, 0.15];
  const violet: Color = [0.38, 0.055, 0.36];
  let index = 0;
  function point(x: number, y: number, z: number, color: Color, size: number, kind: number) {
    positions.set([x, y, z], index * 3);
    // Linear input for HDR bloom + OutputPass. Values above 1 carry emitted light.
    colors.set(
      color.map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)),
      index * 3,
    );
    sizes[index] = size;
    seeds[index] = rand();
    motion[index] = kind;
    index++;
  }
  const sunEnd = Math.round(count * 0.065);
  const skyEnd = Math.round(count * 0.25);
  const seaEnd = Math.round(count * 0.65);
  const reflectionEnd = Math.round(count * 0.75);
  const rockEnd = Math.round(count * 0.997);

  while (index < sunEnd) {
    const theta = rand() * Math.PI * 2;
    const r = Math.sqrt(rand());
    // Dense luminous disc, a softer incandescent perimeter.
    point(
      sunX + Math.cos(theta) * r * 0.71,
      sunY + Math.sin(theta) * r * 0.71,
      -6.8 + (rand() - 0.5) * 0.09,
      scale(mix(gold, amber, r * r), 1.2),
      2 + rand() * 2.5,
      3,
    );
  }
  while (index < skyEnd) {
    const x = (rand() - 0.5) * 16;
    const y = 0.0 + rand() * 4.5;
    const field = texture(x * 0.65, y * 2.2);
    // Wind-stretched banks, with actual negative space between them.
    if (field < -0.08 && rand() > 0.08) continue;
    const glow = Math.exp(-((x - sunX) ** 2) / 14 - (y - sunY) ** 2 / 3);
    const edge = Math.max(0, 1 - Math.abs(field - 0.1) * 3);
    const color = mix(mix(deep, violet, 0.25 + edge * 0.5), amber, glow * (0.25 + edge * 0.65));
    point(x, y, -8.2 + field * 0.65, color, 1.5 + rand() * 3, 4);
  }
  while (index < seaEnd) {
    const z = -6.3 + rand() * 11.5;
    const x = (rand() - 0.5) * 17;
    const depth = (z + 6.3) / 11.5;
    const ridge = texture(x * 0.65, z * 1.4);
    const wave = Math.sin(z * 3.4 + Math.sin(x * 1.7)) * (0.08 + depth * 0.14);
    const y = -0.55 - depth * 1.9 + wave + ridge * 0.1;
    const foam = Math.max(0, Math.sin(z * 3.4 + Math.sin(x * 1.7)) - 0.65) / 0.35;
    const color = mix(deep, cyan, 0.14 + foam * 0.82 + Math.max(0, ridge) * 0.2);
    point(x, y, z, color, 1.2 + rand() * (1.2 + depth), 1);
  }
  while (index < reflectionEnd) {
    const z = -6.2 + rand() * 11.2;
    const depth = (z + 6.3) / 11.5;
    const x = sunX + (rand() - 0.5) * (0.35 + depth * 3.1);
    const ridge = texture(x * 0.65, z * 1.4);
    const crest = Math.sin(z * 3.4 + Math.sin(x * 1.7));
    if (crest < 0.0 && rand() > 0.15) continue;
    const y = -0.55 - depth * 1.9 + crest * (0.08 + depth * 0.14) + ridge * 0.1 + 0.018;
    point(x, y, z, mix(amber, gold, Math.max(0, crest)), 1.7 + rand() * 3, 2);
  }
  while (index < rockEnd) {
    const side = rand() < 0.5 ? -1 : 1;
    const z = -4.5 + rand() * 7.0;
    const depth = (z + 4.5) / 7.0;
    const y = -2.6 + rand() * 5.8;
    const peak = side < 0 ? 2.3 : 1.4;
    const summit = peak + texture(z * 0.5, side) * 0.65;
    if (y > summit) continue;
    const rock = texture(y * 2.1, z * 1.5);
    const edge = 2.25 + depth * 0.45 + Math.max(0, y + 0.5) * 0.18 + rock * 0.24;
    const x = side * (edge + rand() * 1.6);
    const light = Math.max(0, rock) * 0.5 + Math.max(0, Math.sin(y * 5.5 + z)) * 0.12;
    const reflected = y < -0.6 ? cyan : mix(violet, amber, side > 0 ? 0.55 : 0.1);
    point(x, y, z, mix(deep, reflected, light + 0.24), 1.6 + rand() * 3.4, 0);
  }
  while (index < count) {
    const z = -5 + rand() * 9;
    const x = (rand() - 0.5) * 12;
    point(x, -0.5 + rand() * 1.1, z, mix(cyan, gold, rand()), 0.8 + rand() * 1.7, 5);
  }
  return { count, positions, colors, sizes, seeds, motion };
}
