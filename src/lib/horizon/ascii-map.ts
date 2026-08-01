import type { IntBuffer } from "@thi.ng/pixel";
import type {
  WorldParams,
  GridConfig,
  AsciiCell,
  SkyParams,
  WaveParams,
  WeatherParams,
} from "./types";
import { DEFAULT_WAVE_PARAMS, DEFAULT_WEATHER_PARAMS } from "./types";
import { sampleAtmosphere, weatherPulse } from "./atmosphere";
import { computeReflectionMetrics, sampleOceanSurface } from "./waves";

type Zone = AsciiCell["zone"];

/**
 * Classify each character cell into a rendering zone based on sub-pixel coordinates.
 * Uses the center of each 2×4 sub-pixel block for classification.
 */
export function classifyZoneGrid(
  original: IntBuffer,
  config: GridConfig,
  params: WorldParams,
  skyParams: SkyParams,
  waveParams: WaveParams = DEFAULT_WAVE_PARAMS,
  weatherParams: WeatherParams = DEFAULT_WEATHER_PARAMS,
): Zone[][] {
  const { width, height, subWidth, subHeight } = config;
  const origData = original.data;
  const subHorizonRow = Math.floor(subHeight * 0.65);

  const sunCenterX = Math.round(params.sunX * width) * 2 + 1;
  const sunCenterY = params.sunY * subHeight;
  const moonCenterX = Math.round(params.moonX * width) * 2 + 1;
  const moonCenterY = params.moonY * subHeight;
  const sunRadiusX = skyParams.sunRadius * 1.6 * 2;
  const sunRadiusY = skyParams.sunRadius * 4;

  // Pre-identify star cells: scan all 8 sub-pixels per cell for 255 values
  const charHorizonRow = Math.floor(height * 0.65);
  const starTopRows = Math.floor(charHorizonRow * 0.6);

  const starCells = new Uint8Array(width * starTopRows);
  for (let cy = 0; cy < starTopRows; cy++) {
    for (let cx = 0; cx < width; cx++) {
      // Exclude cells near either visible body.
      const csx = cx * 2 + 1;
      const csy = cy * 4 + 2;
      const sunDx = (csx - sunCenterX) / sunRadiusX;
      const sunDy = (csy - sunCenterY) / sunRadiusY;
      const moonDx = (csx - moonCenterX) / sunRadiusX;
      const moonDy = (csy - moonCenterY) / sunRadiusY;
      if (
        (params.sunVisibility > 0.02 && Math.sqrt(sunDx * sunDx + sunDy * sunDy) < 3) ||
        (params.moonVisibility > 0.02 && Math.sqrt(moonDx * moonDx + moonDy * moonDy) < 2.4)
      ) {
        continue;
      }

      let hasMax = false;
      for (let dx = 0; dx < 2 && !hasMax; dx++) {
        for (let dy = 0; dy < 4 && !hasMax; dy++) {
          const sx = cx * 2 + dx;
          const sy = cy * 4 + dy;
          if (sx < subWidth && sy < subHeight && origData[sy * subWidth + sx] === 255) {
            hasMax = true;
          }
        }
      }
      if (hasMax) starCells[cy * width + cx] = 1;
    }
  }

  const zones: Zone[][] = [];

  for (let cy = 0; cy < height; cy++) {
    const row: Zone[] = [];
    for (let cx = 0; cx < width; cx++) {
      // Center of the 2×4 sub-pixel block
      const centerSx = cx * 2 + 1;
      const centerSy = cy * 4 + 2;
      const atmosphere =
        centerSy < subHorizonRow
          ? sampleAtmosphere(
              cx + 0.5,
              cy + 0.5,
              params.waterTime,
              width,
              height,
              weatherParams,
              params.dayOfYear,
            )
          : null;

      if (cy < starTopRows && starCells[cy * width + cx] === 1 && (atmosphere?.cloud ?? 0) < 0.14) {
        row.push("star");
        continue;
      }

      if (centerSy < subHorizonRow) {
        // Sky — classify the independently visible solar and lunar discs.
        const sunDx = (centerSx - sunCenterX) / sunRadiusX;
        const sunDy = (centerSy - sunCenterY) / sunRadiusY;
        const sunDist = Math.sqrt(sunDx * sunDx + sunDy * sunDy);
        const moonDx = (centerSx - moonCenterX) / sunRadiusX;
        const moonDy = (centerSy - moonCenterY) / sunRadiusY;
        const moonDist = Math.sqrt(moonDx * moonDx + moonDy * moonDy);

        const nearHorizon = centerSy > subHorizonRow - 12;
        const spraySource = nearHorizon
          ? sampleOceanSurface(
              centerSx,
              0.08,
              params.waterTime,
              subWidth,
              subHeight,
              waveParams,
              weatherParams,
            ).foam
          : 0;
        const sprayStrength =
          spraySource *
          Math.max(0, (weatherParams.windSpeed - 11) / 8) *
          weatherPulse(cx, cy, params.waterTime);

        if (sprayStrength > 0.3) {
          row.push("spray");
        } else if ((atmosphere?.rain ?? 0) > 0.24) {
          row.push("rain");
        } else if (
          sunDist < 0.55 &&
          params.sunVisibility > 0.02 &&
          (atmosphere?.cloud ?? 0) < 0.72
        ) {
          row.push("sun-core");
        } else if (
          sunDist < 1.45 &&
          params.sunVisibility > 0.02 &&
          (atmosphere?.cloud ?? 0) < 0.58
        ) {
          row.push("sun");
        } else if (
          moonDist < 0.55 &&
          params.moonVisibility > 0.02 &&
          (atmosphere?.cloud ?? 0) < 0.72
        ) {
          row.push("moon-core");
        } else if (
          moonDist < 1.45 &&
          params.moonVisibility > 0.02 &&
          (atmosphere?.cloud ?? 0) < 0.58
        ) {
          row.push("moon");
        } else if ((atmosphere?.cloud ?? 0) > 0.2) {
          row.push((atmosphere?.cloudLight ?? 0) > 0.58 ? "cloud-light" : "cloud-shadow");
        } else if (sunDist < 2.8 && params.horizonGlow > 0.3) {
          row.push("sky-glow");
        } else {
          const skyT = centerSy / subHorizonRow;
          if (skyT > 0.5 && params.horizonGlow > 0.3) {
            const skyDxNorm = (centerSx - sunCenterX) / subWidth;
            const skyLateral = Math.exp(-(skyDxNorm * skyDxNorm) / (2 * 0.3 * 0.3));
            if (skyLateral > 0.3) {
              row.push("sky-glow");
            } else {
              row.push("sky");
            }
          } else {
            row.push("sky");
          }
        }
      } else if (centerSy >= subHorizonRow && centerSy < subHorizonRow + 4) {
        const dxNorm = (centerSx - sunCenterX) / subWidth;
        const proximity = Math.exp(-(dxNorm * dxNorm) / (2 * 0.11 * 0.11));
        if (proximity * params.sunVisibility > 0.18) {
          // The warm horizon band belongs to visible sunlight; moonlight stays cool.
          row.push("horizon");
        } else {
          row.push("water");
        }
      } else {
        // Water — reflection intensity comes from the column mask, then local slope modulates it.
        const waterT = (centerSy - subHorizonRow) / (subHeight - subHorizonRow);
        const sample = sampleOceanSurface(
          centerSx,
          waterT,
          params.waterTime,
          subWidth,
          subHeight,
          waveParams,
          weatherParams,
        );
        const sunReflection = computeReflectionMetrics(
          centerSx,
          waterT,
          sunCenterX,
          params.sunElevation,
          subWidth,
          sample,
          waveParams,
          weatherParams,
        );
        const moonReflection = computeReflectionMetrics(
          centerSx,
          waterT,
          moonCenterX,
          params.moonElevation,
          subWidth,
          sample,
          waveParams,
          weatherParams,
        );
        const sunReflectScore = sunReflection.reflectScore * params.sunVisibility;
        const moonReflectScore =
          moonReflection.reflectScore *
          params.moonVisibility *
          (0.25 + 0.75 * params.moonIllum) *
          0.62;
        const isCoolBreak = sample.crest < -0.18;

        if (sample.foam > 0.68 && waterT > 0.1) {
          row.push("foam");
        } else if (moonReflectScore > sunReflectScore && moonReflectScore > 0.08) {
          // Moonglint column reads as pale light, never amber
          row.push(moonReflectScore > 0.2 ? "water-reflect-cool" : "water");
        } else if (sunReflectScore > 0.06) {
          if (sunReflectScore > 0.28) {
            row.push(isCoolBreak ? "water-reflect-warm" : "water-reflect");
          } else if (sunReflectScore > 0.13) {
            row.push(isCoolBreak ? "water-reflect-cool" : "water-reflect-warm");
          } else {
            row.push(isCoolBreak ? "water" : "water-reflect-cool");
          }
        } else if (sample.glitter > 0.85 && waterT > 0.12) {
          // Ambient sky glints scattered across the open water
          row.push("water-reflect-cool");
        } else if (waterT > 0.6) {
          row.push("water-far");
        } else {
          row.push("water");
        }
      }
    }
    zones.push(row);
  }

  return zones;
}
