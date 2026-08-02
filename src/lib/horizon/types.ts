export interface WorldParams {
  hourAngle: number;
  sunElevation: number;
  solarAzimuth: number;
  /** Independent solar position and optical visibility. */
  sunX: number;
  sunY: number;
  sunVisibility: number;
  /** Independent lunar position, elevation, and atmospheric visibility. */
  moonX: number;
  moonY: number;
  moonElevation: number;
  moonVisibility: number;
  /** Continuous daylight-to-night blend used by the atmosphere. */
  nightFactor: number;
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
    | "cloud-light"
    | "cloud-shadow"
    | "rain"
    | "spray"
    | "sun-core"
    | "sun"
    | "moon-core"
    | "moon"
    | "horizon"
    | "water"
    | "water-reflect"
    | "water-reflect-warm"
    | "water-reflect-cool"
    | "foam"
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

export interface WeatherParams {
  /** Wind speed in metres per second. Couples the chop, foam, cloud advection, and rain. */
  windSpeed: number;
  /** Direction the weather travels toward, in screen-compass degrees. */
  windDirection: number;
  cloudCover: number;
  humidity: number;
  precipitation: number;
}

export const DEFAULT_WEATHER_PARAMS: WeatherParams = {
  windSpeed: 9.5,
  windDirection: 252,
  cloudCover: 0.34,
  humidity: 0.58,
  precipitation: 0.06,
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
