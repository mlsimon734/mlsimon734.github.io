import type { IntBuffer } from '@thi.ng/pixel';
import type { WorldParams, GridConfig, AsciiCell, SkyParams, WaveParams } from './types';
import { DEFAULT_WAVE_PARAMS } from './types';
import { computeReflectionMetrics, sampleOceanSurface } from './waves';

type Zone = AsciiCell['zone'];

/**
 * Classify each character cell into a rendering zone based on sub-pixel coordinates.
 * Uses the center of each 2×4 sub-pixel block for classification.
 */
export function classifyZoneGrid(
	original: IntBuffer,
	config: GridConfig,
	params: WorldParams,
	skyParams: SkyParams,
	waveParams: WaveParams = DEFAULT_WAVE_PARAMS
): Zone[][] {
	const { width, height, subWidth, subHeight } = config;
	const origData = original.data;
	const subHorizonRow = Math.floor(subHeight * 0.65);

	const sunCenterX = Math.round(params.sunX * width) * 2 + 1;
	const sunCenterY = params.sunY * subHeight;
	const sunRadiusX = skyParams.sunRadius * 1.6 * 2;
	const sunRadiusY = skyParams.sunRadius * 4;

	// Pre-identify star cells: scan all 8 sub-pixels per cell for 255 values
	const charHorizonRow = Math.floor(height * 0.65);
	const starTopRows = Math.floor(charHorizonRow * 0.6);

	const starCells = new Set<string>();
	for (let cy = 0; cy < starTopRows; cy++) {
		for (let cx = 0; cx < width; cx++) {
			// Exclude cells near the sun — stars don't overlap with sun brightness
			const csx = cx * 2 + 1;
			const csy = cy * 4 + 2;
			const sdx = (csx - sunCenterX) / sunRadiusX;
			const sdy = (csy - sunCenterY) / sunRadiusY;
			if (Math.sqrt(sdx * sdx + sdy * sdy) < 3.0) continue;

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
			if (hasMax) starCells.add(`${cx},${cy}`);
		}
	}

	const zones: Zone[][] = [];

	for (let cy = 0; cy < height; cy++) {
		const row: Zone[] = [];
		for (let cx = 0; cx < width; cx++) {
			// Center of the 2×4 sub-pixel block
			const centerSx = cx * 2 + 1;
			const centerSy = cy * 4 + 2;

			if (starCells.has(`${cx},${cy}`)) {
				row.push('star');
				continue;
			}

			if (centerSy < subHorizonRow) {
				// Sky — check sun proximity (matches gradient.ts smooth falloff)
				const dx = (centerSx - sunCenterX) / sunRadiusX;
				const dy = (centerSy - sunCenterY) / sunRadiusY;
				const dist = Math.sqrt(dx * dx + dy * dy);

				if (dist < 0.7) {
					row.push('sun-core');
				} else if (dist < 1.4) {
					row.push('sun');
				} else if (dist < 2.8 && params.horizonGlow > 0.3) {
					row.push('sky-glow');
				} else {
					const skyT = centerSy / subHorizonRow;
					if (skyT > 0.5 && params.horizonGlow > 0.3) {
						const skyDxNorm = (centerSx - sunCenterX) / subWidth;
						const skyLateral = Math.exp(-(skyDxNorm * skyDxNorm) / (2 * 0.3 * 0.3));
						if (skyLateral > 0.3) {
							row.push('sky-glow');
						} else {
							row.push('sky');
						}
					} else {
						row.push('sky');
					}
				}
			} else if (centerSy >= subHorizonRow && centerSy < subHorizonRow + 8) {
				const dxNorm = (centerSx - sunCenterX) / subWidth;
				const proximity = Math.exp(-(dxNorm * dxNorm) / (2 * 0.22 * 0.22));
				if (proximity > 0.08) {
					row.push('horizon');
				} else {
					row.push(params.horizonGlow > 0.2 ? 'sky-glow' : 'water');
				}
			} else {
				// Water — reflection intensity comes from the column mask, then local slope modulates it.
				const waterT = (centerSy - subHorizonRow) / (subHeight - subHorizonRow);
				const sample = sampleOceanSurface(centerSx, waterT, params.waterTime, subWidth, subHeight, waveParams);
				const reflection = computeReflectionMetrics(centerSx, waterT, sunCenterX, params.sunElevation, subWidth, sample, waveParams);
				const reflectFade = Math.max(0, Math.min(1, (params.sunElevation + 0.75) / 0.85));
				const reflectScore = reflection.reflectScore * reflectFade;
				const isCoolBreak = sample.crest < -0.18;

				if (reflectScore > 0.05) {
					if (reflectScore > 0.25) {
						row.push(isCoolBreak ? 'water-reflect-warm' : 'water-reflect');
					} else if (reflectScore > 0.12) {
						row.push(isCoolBreak ? 'water-reflect-cool' : 'water-reflect-warm');
					} else {
						row.push(isCoolBreak ? 'water' : 'water-reflect-cool');
					}
				} else if (waterT > 0.6) {
					row.push('water-far');
				} else {
					row.push('water');
				}
			}
		}
		zones.push(row);
	}

	return zones;
}
