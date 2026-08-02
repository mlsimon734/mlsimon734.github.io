import type { WeatherParams } from "./types";

export interface AtmosphereSample {
  cloud: number;
  cloudEdge: number;
  cloudLight: number;
  haze: number;
  rain: number;
}

const TAU = Math.PI * 2;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp01((value - edge0) / Math.max(edge1 - edge0, 0.0001));
  return t * t * (3 - 2 * t);
}

function hash2(x: number, y: number, seed: number): number {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 69069);
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function valueNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy, seed);
  const b = hash2(ix + 1, iy, seed);
  const c = hash2(ix, iy + 1, seed);
  const d = hash2(ix + 1, iy + 1, seed);
  const top = a + (b - a) * ux;
  const bottom = c + (d - c) * ux;
  return top + (bottom - top) * uy;
}

function fbm(x: number, y: number, seed: number): number {
  let sum = 0;
  let amplitude = 0.56;
  let frequency = 1;
  let normalizer = 0;

  for (let octave = 0; octave < 4; octave++) {
    sum += amplitude * valueNoise(x * frequency, y * frequency, seed + octave * 1013);
    normalizer += amplitude;
    amplitude *= 0.5;
    frequency *= 2.03;
  }

  return sum / normalizer;
}

/**
 * Samples a layered, wind-advected marine atmosphere at character-grid coordinates.
 * The field is deterministic for a given day and parameter set, so changes feel like
 * weather moving through one place rather than television static.
 */
export function sampleAtmosphere(
  x: number,
  y: number,
  timeSeconds: number,
  width: number,
  height: number,
  weather: WeatherParams,
  daySeed: number,
): AtmosphereSample {
  const horizon = height * 0.65;
  const skyT = clamp01(y / Math.max(horizon, 1));
  const cover = clamp01(weather.cloudCover);
  const humidity = clamp01(weather.humidity);
  const direction = ((weather.windDirection - 90) * Math.PI) / 180;
  const advection = timeSeconds * (0.006 + weather.windSpeed * 0.0012);
  const driftX = Math.cos(direction) * advection;
  const driftY = Math.sin(direction) * advection * 0.22;

  // High, stretched cirrus and a lower marine deck move at slightly different rates.
  const highMask = smoothstep(0.04, 0.18, skyT) * (1 - smoothstep(0.5, 0.72, skyT));
  const lowMask = smoothstep(0.28, 0.48, skyT) * (1 - smoothstep(0.9, 1.02, skyT));
  const high = fbm((x / width) * 3.1 + driftX * 1.6, skyT * 6.5 + driftY, daySeed + 17);
  const low = fbm((x / width) * 4.6 + driftX, skyT * 9.5 + driftY, daySeed + 53);
  const billow = Math.max(high * highMask, (0.72 * low + 0.28 * high) * lowMask);
  const threshold = 0.82 - cover * 0.5 - humidity * 0.08;
  const cloud = smoothstep(threshold, threshold + 0.17, billow);
  const cloudEdge = smoothstep(0.08, 0.42, cloud) * (1 - smoothstep(0.68, 0.96, cloud));
  const cloudLight = clamp01(0.28 + 0.55 * (1 - skyT) + 0.24 * high - 0.2 * low);

  // Haze is strongest at the marine horizon and lifts as humidity rises.
  const haze = humidity * Math.pow(skyT, 3.2) * (0.5 + 0.5 * cover);

  // Rain hangs below the lower deck in slanted, coherent curtains.
  const rainBand = smoothstep(0.48, 0.62, skyT);
  const curtain = fbm(
    (x / width) * 7.5 + driftX * 1.35,
    skyT * 2.2 - timeSeconds * 0.018,
    daySeed + 97,
  );
  const streak = 0.5 + 0.5 * Math.sin(x * 2.7 + y * 0.72 - timeSeconds * 4.8);
  const rain =
    clamp01(weather.precipitation) *
    rainBand *
    smoothstep(0.42, 0.72, curtain) *
    (0.45 + 0.55 * streak) *
    smoothstep(0.2, 0.72, cover + humidity * 0.35);

  return { cloud, cloudEdge, cloudLight, haze, rain };
}

export function rainGlyph(windDirection: number, x: number, y: number): string {
  const crosswind = Math.sin(((windDirection - 180) / 180) * Math.PI);
  if (Math.abs(crosswind) < 0.22) return (x + y) % 3 === 0 ? "|" : "·";
  return crosswind > 0 ? "/" : "\\";
}

export function weatherPulse(x: number, y: number, timeSeconds: number): number {
  return 0.5 + 0.5 * Math.sin(TAU * (x * 0.019 + y * 0.037) - timeSeconds * 0.7);
}
