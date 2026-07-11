export interface WorldParams {
  hourAngle: number;
  sunElevation: number;
  /** Position of the visible celestial body — the sun by day, the moon at night. */
  sunX: number;
  sunY: number;
  /** Elevation of the visible body; drives reflection strength on the water. */
  bodyElevation: number;
  /** True when the sun is well below the horizon and the moon takes over. */
  isNight: boolean;
  /** Lunar phase 0–1: 0 = new, 0.5 = full. */
  moonPhase: number;
  /** Illuminated fraction of the lunar disc, 0–1. */
  moonIllum: number;
  seasonFactor: number;
  starDensity: number;
  horizonGlow: number;
  waterTime: number;
  dayOfYear: number;
}

export interface AsciiCell {
  char: string;
  zone:
    | "star"
    | "sky"
    | "sky-glow"
    | "sun-core"
    | "sun"
    | "moon-core"
    | "moon"
    | "horizon"
    | "water"
    | "water-reflect"
    | "water-reflect-warm"
    | "water-reflect-cool"
    | "water-far";
  twinkleDelay?: number;
}

export interface WaveParams {
  swellScale: number;
  chopScale: number;
  crestSharpness: number;
  reflectionSharpness: number;
  shimmer: number;
  speed: number;
}

export const DEFAULT_WAVE_PARAMS: WaveParams = {
  swellScale: 24,
  chopScale: 14,
  crestSharpness: 1.3,
  reflectionSharpness: 2.4,
  shimmer: 1.0,
  speed: 0.28,
};

export interface SkyParams {
  timeOffset: number; // Hours offset from current Los Angeles time
  glowStrength: number;
  sunRadius: number;
}

export const DEFAULT_SKY_PARAMS: SkyParams = {
  timeOffset: 0,
  glowStrength: 1.0,
  sunRadius: 4.0,
};

export interface GridConfig {
  width: number;
  height: number;
  subWidth: number;
  subHeight: number;
  maxStars: number;
  ditherThreshold: number;
  ditherBleed: number;
}

export const DESKTOP_CONFIG: GridConfig = {
  width: 120,
  height: 36,
  subWidth: 240,
  subHeight: 144,
  maxStars: 20,
  ditherThreshold: 0.6,
  ditherBleed: 0.75,
};

export const MOBILE_CONFIG: GridConfig = {
  width: 60,
  height: 18,
  subWidth: 120,
  subHeight: 72,
  maxStars: 10,
  ditherThreshold: 0.6,
  ditherBleed: 0.75,
};
