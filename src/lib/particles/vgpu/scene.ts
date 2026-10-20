import { computeWorldParams } from "#lib/horizon/world.js";
import type { WeatherParams } from "#lib/horizon/types.js";

/** Grain kinds, mirrored by the `KIND_*` constants in common.wgsl. */
export const KIND = { sky: 0, sun: 1, moon: 2, star: 3, ocean: 4 } as const;
/** Floats per grain in the layout buffer: reference (xyz, kind) and (seed, size, u, v). */
export const GRAIN_FLOATS = 8;
/** Floats per wave component: (dir.xz, k, amplitude) and (omega, phase, steepness, 0). */
export const WAVE_FLOATS = 8;
export const MAX_WAVES = 12;

const EYE_HEIGHT = 8; // metres: the end of the Santa Monica Pier
const OCEAN_REACH = 3_000;
const LATITUDE = (34.0522 * Math.PI) / 180;
const LONGITUDE = -118.2437;
const DEG = Math.PI / 180;
const GRAVITY = 9.81;

export interface View {
  aspect: number;
  /** Vertical field of view, radians. */
  fov: number;
  /** Pitch of the reference camera, radians; negative looks down. */
  pitch: number;
  eyeHeight: number;
}

/** A wide frame on desktop; portrait screens keep at least ~40° across. */
export function viewFor(aspect: number): View {
  const fov = Math.max(30 * DEG, 2 * Math.atan(Math.tan(20 * DEG) / aspect));
  // Wide frames put the horizon a little above centre so the light path has room; tall ones put
  // it below, giving the height to the sky instead of the dark water at the viewer's feet.
  const horizon = aspect < 1 ? -0.14 : 0.1;
  const pitch = -Math.atan(horizon * Math.tan(fov / 2));
  return { aspect, fov, pitch, eyeHeight: EYE_HEIGHT };
}

function random(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Roberts' R2 sequence: even, grid-free coverage without blue-noise precomputation.
const PLASTIC = 1.324717957244746;
const R2: readonly [number, number] = [1 / PLASTIC, 1 / (PLASTIC * PLASTIC)];

/**
 * Lay grains out as a reconstruction of one fixed view: evenly spaced on screen, then
 * unprojected onto the sky dome or the sea plane, the way a single-image depth
 * reconstruction would place them. Sun, moon and stars are placed per frame in the shader.
 */
export function buildLayout(count: number, view: View, seed = 7): Float32Array<ArrayBuffer> {
  const rand = random(seed);
  const data = new Float32Array(count * GRAIN_FLOATS);
  const sunCount = Math.round(count * 0.005);
  const moonCount = Math.round(count * 0.003);
  const starCount = Math.round(count * 0.004);
  const screenCount = count - sunCount - moonCount - starCount;
  const tan = Math.tan(view.fov / 2);
  const cosPitch = Math.cos(view.pitch);
  const sinPitch = Math.sin(view.pitch);
  let index = 0;
  const write = (values: readonly number[]) => {
    data.set(values, index * GRAIN_FLOATS);
    index++;
  };
  // Margins leave room for pointer parallax and the swell's gentle roll.
  const spanX = 1.14;
  const spanY = 1.12;
  for (let n = 0; n < screenCount; n++) {
    const u = ((0.5 + n * R2[0] + rand() * 0.02) % 1) * 2 - 1;
    const v = ((0.5 + n * R2[1] + rand() * 0.02) % 1) * 2 - 1;
    const cx = u * spanX * tan * view.aspect;
    const cy = v * spanY * tan;
    // Camera basis: right (1,0,0), up (0,cos,sin), forward (0,sin,-cos).
    const dx = cx;
    const dy = cy * cosPitch + sinPitch;
    const dz = cy * sinPitch - cosPitch;
    const length = Math.hypot(dx, dy, dz);
    const size = 0.7 + rand() * 0.6;
    if (dy / length > -0.004) {
      write([dx / length, dy / length, dz / length, KIND.sky, rand(), size, u, v]);
    } else {
      const t = Math.min(view.eyeHeight / -dy, OCEAN_REACH / length);
      write([dx * t, view.eyeHeight + dy * t, dz * t, KIND.ocean, rand(), size, u, v]);
    }
  }
  for (const [kind, total] of [
    [KIND.sun, sunCount],
    [KIND.moon, moonCount],
  ] as const) {
    for (let n = 0; n < total; n++) {
      const angle = (0.5 + n * R2[0]) % 1;
      const radius = Math.sqrt((0.5 + n * R2[1]) % 1);
      const x = Math.cos(angle * 2 * Math.PI) * radius;
      const y = Math.sin(angle * 2 * Math.PI) * radius;
      write([x, y, 0, kind, rand(), 0.7 + rand() * 0.6, x, y]);
    }
  }
  for (let n = 0; n < starCount; n++) {
    const ascension = rand() * 2 * Math.PI;
    const declination = Math.asin(rand() * 2 - 1);
    // Many faint stars, few bright ones.
    const magnitude = Math.pow(rand(), 3.2);
    write([ascension, declination, magnitude, KIND.star, rand(), 0.6 + magnitude, rand(), rand()]);
  }
  return data;
}

export interface Environment {
  /** Camera heading, degrees clockwise from north: where today's sun sets. */
  heading: number;
  sunsetTime: number;
  /** Unit vectors in the heading frame: +x right, +y up, −z ahead. */
  sunDirection: [number, number, number];
  moonDirection: [number, number, number];
  sunElevation: number;
  moonElevation: number;
  moonIllumination: number;
  /** Local sidereal angle, radians, for the star field. */
  sidereal: number;
  night: number;
}

function directionFrom(azimuth: number, sineElevation: number, heading: number) {
  const relative = (azimuth - heading) * DEG;
  const elevation = Math.asin(Math.max(-1, Math.min(1, sineElevation)));
  return [
    Math.sin(relative) * Math.cos(elevation),
    Math.sin(elevation),
    -Math.cos(relative) * Math.cos(elevation),
  ] as [number, number, number];
}

const SUNSET_SINE = Math.sin(-0.833 * DEG);
const sunsetCache = new Map<string, { time: number; azimuth: number }>();

/** Today's sunset in Los Angeles, found by bisecting the afternoon. */
export function sunsetFor(now: number): { time: number; azimuth: number } {
  const key = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(now);
  const cached = sunsetCache.get(key);
  if (cached) return cached;
  const noon = Date.parse(`${key}T12:00:00Z`) + 8 * 3_600_000;
  let low = noon;
  let high = noon + 11 * 3_600_000;
  for (let i = 0; i < 24; i++) {
    const middle = (low + high) / 2;
    if (computeWorldParams(middle).sunElevation > SUNSET_SINE) low = middle;
    else high = middle;
  }
  const sunset = { time: low, azimuth: computeWorldParams(low).solarAzimuth };
  sunsetCache.set(key, sunset);
  return sunset;
}

export function environmentAt(now: number): Environment {
  const world = computeWorldParams(now);
  const sunset = sunsetFor(now);
  const heading = sunset.azimuth + 3;
  const julian = now / 86_400_000 + 2440587.5;
  const sidereal = ((280.46061837 + 360.98564736629 * (julian - 2451545) + LONGITUDE) % 360) * DEG;
  return {
    heading,
    sunsetTime: sunset.time,
    sunDirection: directionFrom(world.solarAzimuth, world.sunElevation, heading),
    moonDirection: directionFrom(world.moonAzimuth, world.moonElevation, heading),
    sunElevation: Math.asin(world.sunElevation) / DEG,
    moonElevation: Math.asin(world.moonElevation) / DEG,
    moonIllumination: world.moonIllum,
    sidereal,
    night: world.nightFactor,
  };
}

/** Star placement needs the observer's latitude; exported for the shader uniforms. */
export const OBSERVER_LATITUDE = LATITUDE;

/**
 * A small directional spectrum: a long Pacific swell from the west-northwest, plus a wind sea
 * whose peak wavelength and height follow Pierson–Moskowitz for the live wind.
 */
export function waveSpectrum(weather: WeatherParams, heading: number): Float32Array<ArrayBuffer> {
  const data = new Float32Array(MAX_WAVES * WAVE_FLOATS);
  const rand = random(19);
  const wind = Math.max(0.5, weather.windSpeed);
  const windEnergy = Math.min(1, Math.max(0, (wind - 1.5) / 14));
  const components: [number, number, number][] = [
    // [wavelength m, amplitude m, travel azimuth deg]
    [150, 0.42, 100],
    [104, 0.24, 92],
    [72, 0.13, 112],
  ];
  const peak = Math.max(4, (8.17 * wind * wind) / GRAVITY);
  const height = Math.min(2.4, (0.21 * wind * wind) / GRAVITY);
  const spread = [0, 18, -22, 34, -30, 12, -40, 26, -12];
  const weights = spread.map((_, i) => Math.pow(0.68, i * 1.15));
  const weightSum = weights.reduce((sum, w) => sum + w, 0);
  for (let i = 0; i < spread.length; i++) {
    components.push([
      peak * Math.pow(0.7, i),
      (height / 2) * (weights[i] / weightSum) * 1.6,
      weather.windDirection + spread[i],
    ]);
  }
  const steepness = 0.55 + 0.3 * windEnergy;
  for (const [i, [wavelength, amplitude, travel]] of components.entries()) {
    const k = (2 * Math.PI) / wavelength;
    const relative = (travel - heading) * DEG;
    data.set(
      [
        Math.sin(relative),
        -Math.cos(relative),
        k,
        amplitude,
        Math.sqrt(GRAVITY * k),
        rand() * 2 * Math.PI,
        Math.min(1, steepness / (k * Math.max(amplitude, 1e-4) * components.length)),
        0,
      ],
      i * WAVE_FLOATS,
    );
  }
  return data;
}
