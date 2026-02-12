import { ditherWith, ATKINSON } from "@thi.ng/pixel-dither";
import { computeWorldParams } from "./world";
import { generateSkyBuffer } from "./gradient";
import { packBraille, packBrailleOrdered } from "./braille";
import { classifyZoneGrid } from "./ascii-map";
import { sampleOceanSurface } from "./waves";
import type { GridConfig, AsciiCell, WaveParams, SkyParams } from "./types";
import { DEFAULT_WAVE_PARAMS, DEFAULT_SKY_PARAMS } from "./types";

export { DESKTOP_CONFIG, MOBILE_CONFIG, DEFAULT_WAVE_PARAMS, DEFAULT_SKY_PARAMS } from "./types";
export type { AsciiCell, GridConfig, WaveParams, SkyParams } from "./types";

// Zone-specific character gradients (dark → bright)
const GLOW_GRADIENT = "  ·∙:;";

const ZONE_GRADIENTS: Record<string, string> = {
  "sky-glow": GLOW_GRADIENT,
};
const STAR_CHARS = ["✦", "\u00B7", "\u2217", "."];
const MIRRORED_SUN_ZONES = new Set<AsciiCell["zone"]>(["sun-core", "sun", "sky-glow"]);

// Average the 2×4 sub-pixel block corresponding to a char cell
function averageBlock(data: ArrayLike<number>, cx: number, cy: number, config: GridConfig): number {
  let sum = 0;
  for (let dx = 0; dx < 2; dx++) {
    for (let dy = 0; dy < 4; dy++) {
      const sx = cx * 2 + dx;
      const sy = cy * 4 + dy;
      if (sx < config.subWidth && sy < config.subHeight) {
        sum += data[sy * config.subWidth + sx];
      }
    }
  }
  return sum / 8;
}

// Pick a character from a gradient string based on brightness (0–255)
function gradientChar(brightness: number, gradient: string): string {
  const idx = Math.floor((brightness / 256) * gradient.length);
  return gradient[Math.min(idx, gradient.length - 1)];
}

function foregroundWaterChar(
  x: number,
  y: number,
  config: GridConfig,
  params: ReturnType<typeof computeWorldParams>,
  waveParams: WaveParams,
  fallbackChar: string,
): string {
  const subHorizonRow = Math.floor(config.subHeight * 0.65);
  const centerSx = x * 2 + 1;
  const centerSy = y * 4 + 2;
  const waterT = (centerSy - subHorizonRow) / (config.subHeight - subHorizonRow);

  if (waterT < 0.62) return fallbackChar;

  const sample = sampleOceanSurface(
    centerSx,
    waterT,
    params.waterTime,
    config.subWidth,
    config.subHeight,
    waveParams,
  );
  const slope = sample.slopeX;
  const steepness = Math.abs(slope);

  if (sample.crest > 0.5) {
    return steepness > 0.013 ? (slope > 0 ? "/" : "\\") : "~";
  }
  if (sample.crest > 0.18) {
    return steepness > 0.01 ? (slope > 0 ? "/" : "\\") : "-";
  }
  if (sample.crest < -0.45) {
    return "_";
  }
  if (sample.crest < -0.12) {
    return steepness > 0.012 ? "." : "=";
  }

  return steepness > 0.011 ? ":" : ".";
}

export function generateHorizon(
  now: number,
  config: GridConfig,
  waterTime: number = 0,
  waveParams: WaveParams = DEFAULT_WAVE_PARAMS,
  skyParams: SkyParams = DEFAULT_SKY_PARAMS,
): AsciiCell[][] {
  const params = computeWorldParams(now, waterTime, skyParams);
  const { original, dithered } = generateSkyBuffer(params, config, waveParams, skyParams);

  const subHorizonRow = Math.floor(config.subHeight * 0.65);

  // Mask sky region to 0 BEFORE Atkinson runs to keep water dithering clean
  const dithData = dithered.data;
  for (let y = 0; y < subHorizonRow; y++) {
    for (let x = 0; x < config.subWidth; x++) {
      dithData[y * config.subWidth + x] = 0;
    }
  }

  // Atkinson dithers water
  ditherWith(ATKINSON, dithered, {
    threshold: config.ditherThreshold,
    bleed: config.ditherBleed,
  });

  const waterBraille = packBraille(dithered, config);
  const orderedBraille = packBrailleOrdered(original, config);
  const origData = original.data;
  const zones = classifyZoneGrid(original, config, params, skyParams, waveParams);

  // Sun center in char-cell coordinates for symmetry mirroring
  const sunCenterCx = Math.round(params.sunX * config.width);
  const sunCenterCy = Math.round((params.sunY * config.subHeight) / 4);
  const sunRadiusCx = Math.ceil(skyParams.sunRadius * 1.6) + 2;
  const sunRadiusCy = Math.ceil(skyParams.sunRadius) + 2;

  const grid: AsciiCell[][] = [];
  let twinkleCounter = 0;

  for (let y = 0; y < config.height; y++) {
    const row: AsciiCell[] = [];
    for (let x = 0; x < config.width; x++) {
      const zone = zones[y][x];
      let char: string;

      if (zone === "star") {
        char = STAR_CHARS[(x * 7 + y * 13) % STAR_CHARS.length];
      } else if (zone === "water") {
        char = foregroundWaterChar(x, y, config, params, waveParams, waterBraille[y][x].char);
      } else if (
        zone === "water-far" ||
        zone === "water-reflect" ||
        zone === "water-reflect-warm" ||
        zone === "water-reflect-cool"
      ) {
        char = waterBraille[y][x].char;
      } else if (zone === "sky") {
        char = " ";
      } else if (zone === "sun-core" || zone === "sun") {
        char = orderedBraille[y][x].char;
        if (char === " ") char = zone === "sun-core" ? "⣿" : "·";
      } else if (zone === "horizon") {
        char = x % 3 === 0 ? "⠒" : "⠤";
      } else {
        const gradient = ZONE_GRADIENTS[zone];
        if (gradient) {
          const avg = averageBlock(origData, x, y, config);
          char = gradientChar(avg, gradient);
        } else {
          char = " ";
        }
      }

      const cell: AsciiCell = { char, zone };
      if (zone === "star") {
        cell.twinkleDelay = (twinkleCounter++ % 5) * 0.8;
      }

      row.push(cell);
    }
    grid.push(row);
  }

  // Bilateral symmetry mirroring for sun disc and glow
  const charHorizonRow = Math.floor(config.height * 0.65);
  const sunMirrorTop = Math.max(0, sunCenterCy - sunRadiusCy * 2);
  const sunMirrorBottom = Math.min(charHorizonRow, sunCenterCy + sunRadiusCy + 1);
  for (let y = sunMirrorTop; y < sunMirrorBottom; y++) {
    for (let dx = 1; dx <= sunRadiusCx; dx++) {
      const leftX = sunCenterCx - dx;
      const rightX = sunCenterCx + dx;
      if (leftX < 0 || rightX >= config.width) continue;

      const leftZone = grid[y][leftX].zone;
      const rightZone = grid[y][rightX].zone;

      // Only mirror cells within sun/glow zones
      if (!MIRRORED_SUN_ZONES.has(leftZone) && !MIRRORED_SUN_ZONES.has(rightZone)) continue;

      // Non-Braille gradient chars are inherently symmetric — just copy
      grid[y][rightX] = {
        char: grid[y][leftX].char,
        zone: grid[y][leftX].zone,
        twinkleDelay: grid[y][leftX].twinkleDelay,
      };
    }
  }

  return grid;
}
