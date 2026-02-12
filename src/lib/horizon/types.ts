export interface WorldParams {
	hourAngle: number;
	sunElevation: number;
	sunX: number;
	sunY: number;
	seasonFactor: number;
	starDensity: number;
	horizonGlow: number;
	waterTime: number;
	dayOfYear: number;
}

export interface AsciiCell {
	char: string;
	zone: 'star' | 'sky' | 'sky-glow' | 'sun-core' | 'sun' | 'horizon' | 'water' | 'water-reflect' | 'water-reflect-warm' | 'water-reflect-cool' | 'water-far';
	twinkleDelay?: number;
}

export interface WaveParams {
	swellScale: number;
	chopScale: number;
	crestSharpness: number;
	reflectionSharpness: number;
	speed: number;
}

export const DEFAULT_WAVE_PARAMS: WaveParams = {
	swellScale: 24,
	chopScale: 14,
	crestSharpness: 1.3,
	reflectionSharpness: 2.4,
	speed: 0.45
};

export interface SkyParams {
	timeOffset: number; // Hours offset from real time
	glowStrength: number;
	sunRadius: number;
}

export const DEFAULT_SKY_PARAMS: SkyParams = {
	timeOffset: 4.5,
	glowStrength: 1.0,
	sunRadius: 4.0
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
	ditherBleed: 0.75
};

export const MOBILE_CONFIG: GridConfig = {
	width: 60,
	height: 18,
	subWidth: 120,
	subHeight: 72,
	maxStars: 10,
	ditherThreshold: 0.6,
	ditherBleed: 0.75
};
