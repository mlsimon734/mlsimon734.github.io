import type { GridConfig, WorldParams, WeatherParams } from "./types";
import { DEFAULT_WEATHER_PARAMS } from "./types";
import { sampleAtmosphere } from "./atmosphere";

/** The bg-* subset of the zone palette the painted scene needs. */
export interface BackgroundPalette {
  "bg-sky-top": string;
  "bg-sky-low": string;
  "bg-glow": string;
  "bg-moon-glow": string;
  "bg-cloud-light": string;
  "bg-cloud-shadow": string;
  "bg-water-top": string;
  "bg-water-deep": string;
}

type Rgb = readonly [number, number, number];

// 4×4 Bayer ordered-dither thresholds; the painted washes quantize into a
// few flat bands and dither between them so the background sits at the same
// chunky cell resolution as the glyphs instead of a smooth gradient.
const BAYER_4X4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5] as const;

const SKY_LEVELS = 8;
const WATER_LEVELS = 8;
const GLOW_LEVELS = 7;

// Character cells are roughly twice as tall as wide; used to keep the
// sun/moon halo circular in pixel space while working in cell coordinates.
const CELL_ASPECT = 0.52;
const HALO_RADIUS_ROWS = 7.5;

function hexToRgb(hex: string): Rgb {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : clean;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function bayerThreshold(x: number, y: number): number {
  return (BAYER_4X4[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** Quantize t into `levels` bands, dithering the boundary with the Bayer threshold. */
function ditherQuantize(t: number, levels: number, threshold: number): number {
  const v = clamp01(t) * (levels - 1);
  const base = Math.floor(v);
  const idx = v - base > threshold ? base + 1 : base;
  return Math.min(idx, levels - 1) / (levels - 1);
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/**
 * Render the painted scene background at one pixel per character cell.
 * Callers scale it up without smoothing so the wash stays quantized to the
 * same grid as the glyphs. Returns RGBA pixels, config.width × config.height.
 */
export function renderBackgroundPixels(
  config: GridConfig,
  palette: BackgroundPalette,
  world: Pick<
    WorldParams,
    | "sunX"
    | "sunY"
    | "sunVisibility"
    | "sunElevation"
    | "moonX"
    | "moonY"
    | "moonVisibility"
    | "horizonGlow"
    | "nightFactor"
    | "moonIllum"
    | "waterTime"
    | "dayOfYear"
  >,
  weather: WeatherParams = DEFAULT_WEATHER_PARAMS,
): Uint8ClampedArray<ArrayBuffer> {
  const { width, height } = config;
  const skyTop = hexToRgb(palette["bg-sky-top"]);
  const glow = hexToRgb(palette["bg-glow"]);
  const moonGlow = hexToRgb(palette["bg-moon-glow"]);
  const cloudLight = hexToRgb(palette["bg-cloud-light"]);
  const cloudShadow = hexToRgb(palette["bg-cloud-shadow"]);
  const waterDeep = hexToRgb(palette["bg-water-deep"]);
  // Deep night pulls the dusk band toward the zenith color so midnight
  // doesn't keep wearing sunset tones; dusk itself stays warm.
  const nightT = world.nightFactor;
  const skyLow = mix(hexToRgb(palette["bg-sky-low"]), skyTop, 0.65 * nightT);
  const waterTop = mix(hexToRgb(palette["bg-water-top"]), waterDeep, 0.5 * nightT);

  const horizonRow = Math.floor(height * 0.65);
  const glowStrength = clamp01(world.horizonGlow);
  const sunCol = world.sunX * width;
  const sunRow = world.sunY * height;
  const moonCol = world.moonX * width;
  const moonRow = world.moonY * height;

  const pixels = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const threshold = bayerThreshold(x, y);
      const u = (x + 0.5) / width;
      const sunDxNorm = u - world.sunX;
      const moonDxNorm = u - world.moonX;
      let rgb: Rgb;
      let sunGlowMix = 0;
      let moonGlowMix = 0;

      if (y < horizonRow) {
        const skyT = y / Math.max(horizonRow - 1, 1);
        rgb = mix(skyTop, skyLow, ditherQuantize(skyT, SKY_LEVELS, threshold));
        const lateral = Math.exp(-(sunDxNorm * sunDxNorm) / (2 * 0.32 * 0.32));
        sunGlowMix = 0.85 * glowStrength * lateral * Math.pow(skyT, 1.6);

        const atmosphere = sampleAtmosphere(
          x + 0.5,
          y + 0.5,
          world.waterTime,
          width,
          height,
          weather,
          world.dayOfYear,
        );
        const daylightHaze = mix(skyLow, glow, 0.28 * glowStrength);
        const hazeTint = mix(daylightHaze, moonGlow, nightT);
        rgb = mix(rgb, hazeTint, ditherQuantize(atmosphere.haze * 0.28, 5, threshold));
        const litCloud = mix(
          cloudShadow,
          cloudLight,
          clamp01(atmosphere.cloudLight + Math.max(0, world.sunElevation) * 0.24),
        );
        rgb = mix(
          rgb,
          litCloud,
          ditherQuantize(atmosphere.cloud * (0.52 + 0.2 * atmosphere.cloudEdge), 6, threshold),
        );
      } else {
        const waterT = (y - horizonRow) / Math.max(height - 1 - horizonRow, 1);
        rgb = mix(
          waterTop,
          waterDeep,
          ditherQuantize(Math.pow(waterT, 0.85), WATER_LEVELS, threshold),
        );
        const sunLateral = Math.exp(-(sunDxNorm * sunDxNorm) / (2 * 0.18 * 0.18));
        const moonLateral = Math.exp(-(moonDxNorm * moonDxNorm) / (2 * 0.14 * 0.14));
        sunGlowMix = 0.4 * glowStrength * sunLateral * world.sunVisibility * (1 - waterT);
        // Subtle cool wash under the moonglint column.
        moonGlowMix = 0.22 * world.moonIllum * world.moonVisibility * moonLateral * (1 - waterT);
        rgb = mix(
          rgb,
          skyLow,
          ditherQuantize(weather.humidity * Math.pow(1 - waterT, 4) * 0.14, 4, threshold),
        );
      }

      // Independent halos make twilight continuous: neither body replaces the other.
      // Column offsets compensate for the tall character-cell aspect ratio.
      const sunDCol = (x - sunCol) * CELL_ASPECT;
      const sunDRow = y - sunRow;
      const sunHaloDist = Math.sqrt(sunDCol * sunDCol + sunDRow * sunDRow) / HALO_RADIUS_ROWS;
      const sunHalo = Math.max(0, 1 - sunHaloDist);
      sunGlowMix += 0.5 * world.sunVisibility * sunHalo * sunHalo;

      const moonDCol = (x - moonCol) * CELL_ASPECT;
      const moonDRow = y - moonRow;
      const moonHaloDist = Math.sqrt(moonDCol * moonDCol + moonDRow * moonDRow) / HALO_RADIUS_ROWS;
      const moonHalo = Math.max(0, 1 - moonHaloDist);
      moonGlowMix +=
        0.4 * world.moonVisibility * (0.35 + 0.65 * world.moonIllum) * moonHalo * moonHalo;

      const sunMixed = mix(
        rgb,
        glow,
        ditherQuantize(Math.min(sunGlowMix, 0.9), GLOW_LEVELS, threshold),
      );
      const mixed = mix(
        sunMixed,
        moonGlow,
        ditherQuantize(Math.min(moonGlowMix, 0.75), GLOW_LEVELS, threshold),
      );

      const idx = (y * width + x) * 4;
      pixels[idx] = mixed[0];
      pixels[idx + 1] = mixed[1];
      pixels[idx + 2] = mixed[2];
      pixels[idx + 3] = 255;
    }
  }

  return pixels;
}
