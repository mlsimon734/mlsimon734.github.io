import type { GridConfig, WeatherParams } from "./types";
import { HORIZON, horizonRow } from "./frame";

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

/** Hermite ease from 0 at edge0 to 1 at edge1; edges must ascend. */
export function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp01((value - edge0) / Math.max(edge1 - edge0, 0.0001));
  return t * t * (3 - 2 * t);
}

/** Stable value in [0, 1] per lattice point. */
export function hash2(x: number, y: number, seed: number): number {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 69069);
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

export function valueNoise(x: number, y: number, seed: number): number {
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
 * How far the cloud field has drifted through its noise: (x, y) at scene time zero,
 * moving at (vx, vy) per second of scene time.
 */
export interface CloudDrift {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

function windVelocity(weather: WeatherParams): { vx: number; vy: number } {
  const direction = ((weather.windDirection - 90) * Math.PI) / 180;
  const speed = 0.006 + weather.windSpeed * 0.0012;
  return { vx: Math.cos(direction) * speed, vy: Math.sin(direction) * speed * 0.22 };
}

/**
 * A drift along this wind that had already blown for `elapsed` seconds of scene time
 * at time zero. Seeding that from the wall clock gives every moment its own sky.
 */
export function startDrift(weather: WeatherParams, elapsed = 0): CloudDrift {
  const { vx, vy } = windVelocity(weather);
  return { x: vx * elapsed, y: vy * elapsed, vx, vy };
}

/**
 * Re-aim the drift along a new wind at scene time `time`, keeping the clouds where
 * they stand so they turn instead of jumping. An unchanged wind changes nothing.
 */
export function steerDrift(drift: CloudDrift, weather: WeatherParams, time: number): CloudDrift {
  const { vx, vy } = windVelocity(weather);
  return { x: drift.x + (drift.vx - vx) * time, y: drift.y + (drift.vy - vy) * time, vx, vy };
}

/**
 * Samples a layered, wind-advected marine atmosphere at character-grid coordinates.
 * The field is deterministic for a given drift and parameter set, so changes feel like
 * weather moving through one place rather than television static.
 */
export function sampleAtmosphere(
  x: number,
  y: number,
  timeSeconds: number,
  width: number,
  height: number,
  weather: WeatherParams,
  driftX: number,
  driftY: number,
): AtmosphereSample {
  const horizon = height * HORIZON;
  const skyT = clamp01(y / Math.max(horizon, 1));
  const cover = clamp01(weather.cloudCover);
  const humidity = clamp01(weather.humidity);

  // High, stretched cirrus and a lower marine deck move at slightly different rates.
  const highMask = smoothstep(0.04, 0.18, skyT) * (1 - smoothstep(0.5, 0.72, skyT));
  const lowMask = smoothstep(0.28, 0.48, skyT) * (1 - smoothstep(0.9, 1.02, skyT));
  const high = fbm((x / width) * 3.1 + driftX * 1.6, skyT * 6.5 + driftY, 17);
  const low = fbm((x / width) * 4.6 + driftX, skyT * 9.5 + driftY, 53);
  const billow = Math.max(high * highMask, (0.72 * low + 0.28 * high) * lowMask);
  const threshold = 0.82 - cover * 0.5 - humidity * 0.08;
  const cloud = smoothstep(threshold, threshold + 0.17, billow);
  const cloudEdge = smoothstep(0.08, 0.42, cloud) * (1 - smoothstep(0.68, 0.96, cloud));
  const cloudLight = clamp01(0.28 + 0.55 * (1 - skyT) + 0.24 * high - 0.2 * low);

  // Haze is strongest at the marine horizon and lifts as humidity rises.
  const haze = humidity * Math.pow(skyT, 3.2) * (0.5 + 0.5 * cover);

  // Rain hangs below the lower deck in slanted, coherent curtains.
  const rainBand = smoothstep(0.48, 0.62, skyT);
  const curtain = fbm((x / width) * 7.5 + driftX * 1.35, skyT * 2.2 - timeSeconds * 0.018, 97);
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

/** One cell-resolution atmosphere field, shared by glyphs and painted background. */
export function sampleAtmosphereGrid(
  config: GridConfig,
  time: number,
  weather: WeatherParams,
  drift: CloudDrift = startDrift(weather),
): AtmosphereSample[] {
  const driftX = drift.x + drift.vx * time;
  const driftY = drift.y + drift.vy * time;
  const samples: AtmosphereSample[] = [];
  for (let y = 0; y < horizonRow(config); y++) {
    for (let x = 0; x < config.width; x++) {
      samples.push(
        sampleAtmosphere(
          x + 0.5,
          y + 0.5,
          time,
          config.width,
          config.height,
          weather,
          driftX,
          driftY,
        ),
      );
    }
  }
  return samples;
}
