import { intBuffer, GRAY8 } from "@thi.ng/pixel";
import type { IntBuffer } from "@thi.ng/pixel";
import type { WorldParams, GridConfig, WaveParams, SkyParams, WeatherParams } from "./types";
import { DEFAULT_WAVE_PARAMS, DEFAULT_SKY_PARAMS, DEFAULT_WEATHER_PARAMS } from "./types";
import { computeReflectionMetrics, sampleOceanSurface } from "./waves";

/** Mulberry32 PRNG — deterministic, ~8 lines */
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function generateSkyBuffer(
  params: WorldParams,
  config: GridConfig,
  waveParams: WaveParams = DEFAULT_WAVE_PARAMS,
  skyParams: SkyParams = DEFAULT_SKY_PARAMS,
  weatherParams: WeatherParams = DEFAULT_WEATHER_PARAMS,
): { original: IntBuffer; dithered: IntBuffer } {
  const { subWidth, subHeight } = config;
  const buf = intBuffer(subWidth, subHeight, GRAY8);
  const data = buf.data;

  const horizonRow = Math.floor(subHeight * 0.65);
  // Snap sun center to character-cell center so the narrow top of
  // the semicircle is symmetric at the character level
  const sunCenterX = Math.round(params.sunX * config.width) * 2 + 1;
  const sunCenterY = params.sunY * subHeight;
  // Aspect correction for sub-pixel grid: each char cell is 2×4 sub-pixels
  // Horizontal: sunRadius * 1.6 (aspect) * 2 (sub-pixel cols per char)
  const sunRadiusX = skyParams.sunRadius * 1.6 * 2;
  // Vertical: sunRadius * 4 (sub-pixel rows per char)
  const sunRadiusY = skyParams.sunRadius * 4;

  const skyBase = clamp(40 + params.sunElevation * 50);
  const skyTop = clamp(skyBase * 0.2);

  for (let y = 0; y < subHeight; y++) {
    for (let x = 0; x < subWidth; x++) {
      const idx = y * subWidth + x;
      let brightness: number;

      if (y < horizonRow) {
        // --- Sky zone ---
        const skyT = y / horizonRow;
        brightness = skyTop + (skyBase - skyTop) * skyT;

        if (skyT > 0.5) {
          const glowT = (skyT - 0.5) / 0.5;
          const dxNorm = (x - sunCenterX) / subWidth;
          const lateral = Math.exp(-(dxNorm * dxNorm) / (2 * 0.2 * 0.2));
          brightness += params.horizonGlow * 50 * glowT * lateral;
        }

        const dx = (x - sunCenterX) / sunRadiusX;
        const dy = (y - sunCenterY) / sunRadiusY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (params.isNight) {
          // Moon disc — phase terminator masks the unlit side. A point on the
          // projected disc is lit when it sits sunward of the terminator
          // ellipse x = cos(2π·phase)·√(1−y²).
          if (dist < 2.2) {
            const litLimit =
              Math.cos(params.moonPhase * 2 * Math.PI) * Math.sqrt(Math.max(0, 1 - dy * dy));
            const lit = params.moonPhase < 0.5 ? dx >= litLimit : dx <= -litLimit;
            let moonBrightness = 0;
            if (dist < 1 && lit) {
              moonBrightness = dist < 0.78 ? 235 : 235 * (1 - (dist - 0.78) / 0.22);
            } else if (dist < 1) {
              // Faint earthshine keeps the dark limb barely legible
              moonBrightness = 34;
            }
            const halo = Math.max(0, 1 - dist / 2.2);
            brightness = Math.max(brightness, moonBrightness, halo * halo * 46 * params.moonIllum);
          }
        } else if (dist < 3.0) {
          // Sun disc — solid core with smooth quadratic edge
          let sunBrightness: number;
          if (dist < 0.62) {
            // Keep only the very center solid; the edge carries the circle.
            sunBrightness = 255;
          } else {
            const t = Math.min((dist - 0.62) / 0.88, 1);
            sunBrightness = 255 * (1 - t * t);
          }
          // Glow halo extends further
          const glowStrength = Math.max(0.3, params.horizonGlow);
          const glow = Math.max(0, 1 - dist / 3.0);
          const glowBrightness = glow * glow * 80 * glowStrength;
          brightness = Math.max(brightness, sunBrightness + glowBrightness);
        }
      } else if (y >= horizonRow && y < horizonRow + 4) {
        // --- Horizon band --- blends from horizon glow into water+reflection
        const bandT = (y - horizonRow) / 4;
        const dxNorm = (x - sunCenterX) / subWidth;
        const gauss = Math.exp(-(dxNorm * dxNorm) / (2 * 0.11 * 0.11));
        const peak = 158 + params.horizonGlow * 28;
        const horizonBright = 86 + (peak - 86) * gauss;
        const sample = sampleOceanSurface(
          x,
          bandT * 0.08,
          params.waterTime,
          subWidth,
          subHeight,
          waveParams,
          weatherParams,
        );
        const reflection = computeReflectionMetrics(
          x,
          bandT * 0.08,
          sunCenterX,
          params.bodyElevation,
          subWidth,
          sample,
          waveParams,
          weatherParams,
        );
        const horizonReflect =
          36 * Math.max(0.25, params.horizonGlow) * Math.max(reflection.reflectScore, gauss * 0.16);
        const bandShimmer = 10 * (sample.glitter - 0.5) * 2;
        const waterBright = 126 + 8 * sample.crest + horizonReflect + bandShimmer;
        const blend = bandT * bandT;
        brightness = clamp(horizonBright * (1 - blend) + waterBright * blend);
      } else {
        // --- Water zone ---
        const waterT = (y - horizonRow) / (subHeight - horizonRow);
        const waterBase = 160 - waterT * 120;
        const sample = sampleOceanSurface(
          x,
          waterT,
          params.waterTime,
          subWidth,
          subHeight,
          waveParams,
          weatherParams,
        );
        const reflection = computeReflectionMetrics(
          x,
          waterT,
          sunCenterX,
          params.bodyElevation,
          subWidth,
          sample,
          waveParams,
          weatherParams,
        );
        const twilight = Math.max(0, (params.sunElevation + 0.5) / 1.5);
        const moonlight = params.isNight ? 0.45 * params.moonIllum : 0;
        const glowFactor = Math.max(0.15, params.horizonGlow, twilight * 0.6, moonlight);
        const amplitude = lerp(14, 32, Math.pow(waterT, 0.9));
        const reflectBrightness = 132 * glowFactor * reflection.reflectScore;
        const shimmerBrightness = lerp(8, 18, waterT) * (sample.glitter - 0.5) * 2;
        brightness = clamp(
          waterBase + amplitude * sample.crest + reflectBrightness + shimmerBrightness,
        );
      }

      data[idx] = clamp(brightness);
    }
  }

  // --- Stars ---
  // Fill 2×4 blocks so stars remain visible at character-cell scale
  const date = new Date();
  const rng = mulberry32(params.dayOfYear * 1000 + date.getFullYear());
  const starCount = Math.floor(config.maxStars * params.starDensity);
  // Place stars in char-cell coordinates, then fill 2×4 sub-pixel blocks
  const charHorizonRow = Math.floor(config.height * 0.65);
  const starTopRows = Math.floor(charHorizonRow * 0.6);

  for (let i = 0; i < starCount; i++) {
    const cx = Math.floor(rng() * config.width);
    const cy = Math.floor(rng() * starTopRows);
    // Keep stars away from the sun/moon disc — a 255 block inside the moon
    // would read as a bright square on the unlit side of the crescent.
    const sdx = (cx * 2 + 1 - sunCenterX) / sunRadiusX;
    const sdy = (cy * 4 + 2 - sunCenterY) / sunRadiusY;
    if (Math.sqrt(sdx * sdx + sdy * sdy) < 3.0) continue;
    // Fill entire 2×4 sub-pixel block with 255
    for (let dx = 0; dx < 2; dx++) {
      for (let dy = 0; dy < 4; dy++) {
        const sx = cx * 2 + dx;
        const sy = cy * 4 + dy;
        if (sx < subWidth && sy < subHeight) {
          data[sy * subWidth + sx] = 255;
        }
      }
    }
  }

  const ditheredBuf = intBuffer(subWidth, subHeight, GRAY8);
  ditheredBuf.data.set(buf.data);

  return { original: buf, dithered: ditheredBuf };
}
