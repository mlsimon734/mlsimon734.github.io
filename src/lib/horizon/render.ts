import type { AsciiCell, GridConfig } from './types';

export interface AsciiRun {
	chars: string;
	zone: AsciiCell['zone'];
	twinkleDelay?: number;
}

export interface ZonePalette {
	star: string;
	sky: string;
	'sky-glow': string;
	'sun-core': string;
	sun: string;
	horizon: string;
	water: string;
	'water-reflect': string;
	'water-reflect-warm': string;
	'water-reflect-cool': string;
	'water-far': string;
}

export interface MonoMetrics {
	font: string;
	fontSize: number;
	lineHeightPx: number;
	charWidth: number;
	cssWidth: number;
	cssHeight: number;
}

export const CANVAS_FONT_SIZE = 11;
export const CANVAS_LINE_HEIGHT = 1.15;

const ZONE_VARIABLES: Record<AsciiCell['zone'], string> = {
	star: '--color-horizon-star',
	sky: '--color-horizon-sky',
	'sky-glow': '--color-horizon-sky-glow',
	'sun-core': '--color-horizon-sun-core',
	sun: '--color-horizon-sun',
	horizon: '--color-horizon-horizon',
	water: '--color-horizon-water',
	'water-reflect': '--color-horizon-water-reflect',
	'water-reflect-warm': '--color-horizon-water-reflect-warm',
	'water-reflect-cool': '--color-horizon-water-reflect-cool',
	'water-far': '--color-horizon-water-far'
};

export function encodeRuns(grid: AsciiCell[][]): AsciiRun[][] {
	return grid.map((row) => {
		const runs: AsciiRun[] = [];
		let current: AsciiRun = { chars: '', zone: row[0].zone, twinkleDelay: row[0].twinkleDelay };

		for (const cell of row) {
			if (cell.zone === current.zone) {
				current.chars += cell.char;
				continue;
			}

			runs.push(current);
			current = { chars: cell.char, zone: cell.zone, twinkleDelay: cell.twinkleDelay };
		}

		runs.push(current);
		return runs;
	});
}

export function resolveZonePalette(styles: CSSStyleDeclaration): ZonePalette {
	return {
		star: styles.getPropertyValue(ZONE_VARIABLES.star).trim(),
		sky: styles.getPropertyValue(ZONE_VARIABLES.sky).trim(),
		'sky-glow': styles.getPropertyValue(ZONE_VARIABLES['sky-glow']).trim(),
		'sun-core': styles.getPropertyValue(ZONE_VARIABLES['sun-core']).trim(),
		sun: styles.getPropertyValue(ZONE_VARIABLES.sun).trim(),
		horizon: styles.getPropertyValue(ZONE_VARIABLES.horizon).trim(),
		water: styles.getPropertyValue(ZONE_VARIABLES.water).trim(),
		'water-reflect': styles.getPropertyValue(ZONE_VARIABLES['water-reflect']).trim(),
		'water-reflect-warm': styles.getPropertyValue(ZONE_VARIABLES['water-reflect-warm']).trim(),
		'water-reflect-cool': styles.getPropertyValue(ZONE_VARIABLES['water-reflect-cool']).trim(),
		'water-far': styles.getPropertyValue(ZONE_VARIABLES['water-far']).trim()
	};
}

export function createMonoMetrics(config: GridConfig, charWidth: number): MonoMetrics {
	const lineHeightPx = CANVAS_FONT_SIZE * CANVAS_LINE_HEIGHT;

	return {
		font: `${CANVAS_FONT_SIZE}px "JetBrains Mono", ui-monospace, monospace`,
		fontSize: CANVAS_FONT_SIZE,
		lineHeightPx,
		charWidth,
		cssWidth: Math.ceil(config.width * charWidth),
		cssHeight: Math.ceil(config.height * lineHeightPx)
	};
}
