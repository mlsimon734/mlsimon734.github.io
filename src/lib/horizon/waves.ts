import type { WaveParams } from "./types";
import { DEFAULT_WAVE_PARAMS } from "./types";

interface OceanSample {
  height: number;
  slopeX: number;
  slopeY: number;
  crest: number;
  /** Fine ripple field, 0–1 centred on 0.5 — drives ambient glitter and micro-texture. */
  glitter: number;
}

interface ReflectionMetrics {
  columnMask: number;
  verticalFade: number;
  specular: number;
  glint: number;
  reflectScore: number;
}

interface OceanComponent {
  k: number;
  amplitude: number;
  speed: number;
  dirX: number;
  dirY: number;
  phase: number;
}

const TAU = Math.PI * 2;
const REFLECTION_SLOPE_WEIGHT_X = 1.35;
const REFLECTION_SLOPE_WEIGHT_Y = 0.85;
const REFLECTION_TARGET_TILT = 0.1;

function component(
  k: number,
  amplitude: number,
  speed: number,
  angleDegrees: number,
  phase: number,
): OceanComponent {
  const radians = (angleDegrees * Math.PI) / 180;
  return {
    k,
    amplitude,
    speed,
    dirX: Math.cos(radians),
    dirY: Math.sin(radians),
    phase,
  };
}

const SWELL_COMPONENTS: readonly OceanComponent[] = [
  component(1.6, 1.0, 0.42, 82, 0.2),
  component(2.4, 0.58, 0.58, 97, 1.3),
  component(3.5, 0.34, 0.74, 70, 2.1),
];

const CHOP_COMPONENTS: readonly OceanComponent[] = [
  component(6.5, 0.2, 1.05, 76, 0.7),
  component(9.0, 0.16, 1.22, 104, 1.9),
  component(12.5, 0.11, 1.46, 64, 2.8),
  component(16.0, 0.08, 1.72, 116, 4.0),
];

// High-frequency fast ripple: sampled with a *linear* perspective map so rows
// near the horizon keep distinct phases (the swell/chop perspective curve
// compresses them into one phase, which is what left the far field static).
const RIPPLE_COMPONENTS: readonly OceanComponent[] = [
  component(21.0, 0.55, 2.1, 84, 0.4),
  component(27.0, 0.4, 2.7, 66, 3.4),
  component(34.0, 0.3, 3.2, 112, 1.6),
];

const SWELL_TOTAL = SWELL_COMPONENTS.reduce((sum, wave) => sum + wave.amplitude, 0);
const CHOP_TOTAL = CHOP_COMPONENTS.reduce((sum, wave) => sum + wave.amplitude, 0);
const RIPPLE_TOTAL = RIPPLE_COMPONENTS.reduce((sum, wave) => sum + wave.amplitude, 0);

// Height range that maps onto the crest sigmoid; without it tanh saturates
// into flat ±1 patches and the mid-tone glyphs never appear.
const CREST_RANGE = 14;
// How strongly ripple micro-facets perturb the reflection slopes.
// Keep small: too much breaks specular alignment and starves the sun column.
const RIPPLE_SLOPE_SCALE = 1.2;

function derivativeVPerspective(v: number): number {
  if (v <= 0) return 0;
  return 0.82 * 1.35 * Math.pow(v, 0.35);
}

function derivativeChopEnvelope(v: number): number {
  if (v <= 0) return 0;
  return 1.2 * Math.pow(v, 0.2);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function sigmaForWater(waterT: number, sunElevation: number): number {
  const lowSunFactor = 1 - clamp01((sunElevation + 0.1) / 1.1);
  return 0.016 + (0.085 + 0.035 * lowSunFactor) * Math.pow(waterT, 0.88);
}

function verticalFadeForWater(waterT: number, sunElevation: number): number {
  const highSunFactor = clamp01((sunElevation + 0.15) / 1.15);
  return Math.exp(-waterT * (0.72 + 0.78 * highSunFactor));
}

function sampleBand(
  components: readonly OceanComponent[],
  u: number,
  vPerspective: number,
  timeSeconds: number,
): { sum: number; slopeX: number; slopeY: number } {
  let sum = 0;
  let slopeX = 0;
  let slopeY = 0;

  for (const wave of components) {
    const theta =
      TAU * wave.k * (wave.dirX * u + wave.dirY * vPerspective) -
      wave.speed * timeSeconds +
      wave.phase;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);
    const common = TAU * wave.k * wave.amplitude * cosTheta;

    sum += wave.amplitude * sinTheta;
    slopeX += common * wave.dirX;
    slopeY += common * wave.dirY;
  }

  return { sum, slopeX, slopeY };
}

/**
 * Sample the directional ocean field at a sub-pixel coordinate.
 *
 * The returned `height` is the raw band-combined height field. Use `crest`
 * for displayed wave modulation and `slopeX` / `slopeY` for reflection logic.
 */
export function sampleOceanSurface(
  x: number,
  waterT: number,
  timeSeconds: number,
  width: number,
  height: number,
  waveParams: WaveParams = DEFAULT_WAVE_PARAMS,
): OceanSample {
  const { swellScale, chopScale, crestSharpness } = waveParams;
  const shimmer = waveParams.shimmer ?? 1;
  const u = width > 0 ? x / width : 0;
  const v = Math.max(0, Math.min(1, waterT));
  const vPerspective = 0.18 + 0.82 * Math.pow(v, 1.35);
  const vChop = Math.pow(v, 1.2);
  const vCrest = Math.pow(v, 1.1);
  const vRipple = 0.06 + 0.94 * v;
  const rippleEnvelope = 0.4 + 0.6 * v;
  const swell = sampleBand(SWELL_COMPONENTS, u, vPerspective, timeSeconds);
  const chop = sampleBand(CHOP_COMPONENTS, u, vPerspective, timeSeconds);
  const ripple = sampleBand(RIPPLE_COMPONENTS, u, vRipple, timeSeconds);
  const swellSum = swell.sum / SWELL_TOTAL;
  const chopSum = chop.sum / CHOP_TOTAL;
  const rippleSum = ripple.sum / RIPPLE_TOTAL;
  const dvPerspective = derivativeVPerspective(v);
  const dvChop = derivativeChopEnvelope(v);
  const rippleScale = RIPPLE_SLOPE_SCALE * shimmer * rippleEnvelope;

  const heightRaw = swellScale * swellSum + chopScale * vChop * chopSum;
  const slopeXRaw =
    swellScale * (swell.slopeX / SWELL_TOTAL) +
    chopScale * vChop * (chop.slopeX / CHOP_TOTAL) +
    rippleScale * (ripple.slopeX / RIPPLE_TOTAL);
  const slopeYRaw =
    swellScale * (swell.slopeY / SWELL_TOTAL) * dvPerspective +
    chopScale * (dvChop * chopSum + vChop * (chop.slopeY / CHOP_TOTAL) * dvPerspective) +
    rippleScale * (ripple.slopeY / RIPPLE_TOTAL) * 0.94;

  // Convert from normalised-coordinate derivatives into screen-space-ish slopes.
  const slopeX = slopeXRaw / Math.max(width, 1);
  const slopeY = slopeYRaw / Math.max(height * 0.35, 1);
  const crest = Math.tanh(
    heightRaw / CREST_RANGE +
      crestSharpness * vCrest * chopSum +
      0.15 * shimmer * rippleSum * rippleEnvelope,
  );
  const glitter = clamp01(0.5 + 0.5 * shimmer * rippleSum * rippleEnvelope);

  return {
    height: heightRaw,
    slopeX,
    slopeY,
    crest,
    glitter,
  };
}

export function computeReflectionMetrics(
  x: number,
  waterT: number,
  sunCenterX: number,
  sunElevation: number,
  width: number,
  sample: Pick<OceanSample, "slopeX" | "slopeY">,
  waveParams: WaveParams = DEFAULT_WAVE_PARAMS,
): ReflectionMetrics {
  const dxNorm = (x - sunCenterX) / width;
  const sigma = sigmaForWater(waterT, sunElevation);
  const columnMask = Math.exp(-(dxNorm * dxNorm) / (2 * sigma * sigma));
  const verticalFade = verticalFadeForWater(waterT, sunElevation);
  const facetAlignment = Math.max(
    0,
    1 -
      REFLECTION_SLOPE_WEIGHT_X * Math.abs(sample.slopeX) -
      REFLECTION_SLOPE_WEIGHT_Y * Math.abs(sample.slopeY - REFLECTION_TARGET_TILT),
  );
  const specular = Math.pow(facetAlignment, waveParams.reflectionSharpness);
  const glint = 0.12 + 0.88 * specular;
  const reflectScore = columnMask * verticalFade * glint;

  return {
    columnMask,
    verticalFade,
    specular,
    glint,
    reflectScore,
  };
}
