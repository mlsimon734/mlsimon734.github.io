import { type WorldParams, type SkyParams, DEFAULT_SKY_PARAMS } from './types';

const LOS_ANGELES_TIME_ZONE = 'America/Los_Angeles';
const LA_DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
	timeZone: LOS_ANGELES_TIME_ZONE,
	year: 'numeric',
	month: 'numeric',
	day: 'numeric',
	hour: 'numeric',
	minute: 'numeric',
	hour12: false
});

function getLosAngelesDateParts(now: number): {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
} {
	const parts = LA_DATE_FORMAT.formatToParts(new Date(now));
	const values = Object.fromEntries(
		parts
			.filter((part) => part.type !== 'literal')
			.map((part) => [part.type, Number(part.value)])
	);

	return {
		year: values.year,
		month: values.month,
		day: values.day,
		hour: values.hour === 24 ? 0 : values.hour,
		minute: values.minute
	};
}

export function getLosAngelesHours(now: number = Date.now()): number {
	const date = getLosAngelesDateParts(now);
	return date.hour + date.minute / 60;
}

export function computeWorldParams(
	now: number,
	waterTime: number = 0,
	skyParams: SkyParams = DEFAULT_SKY_PARAMS
): WorldParams {
	const date = getLosAngelesDateParts(now);
	const hours = getLosAngelesHours(now) + skyParams.timeOffset;
	const hourAngle = (((hours % 24) + 24) % 24) / 24;

	// Sun elevation: peaks at noon (hour 12), bottoms at midnight
	const sunElevation = Math.sin((hourAngle - 0.25) * 2 * Math.PI);

	// Sun moves east→west across the sky
	const sunX = 0.5 - 0.35 * Math.sin(hourAngle * 2 * Math.PI);
	// Map solar elevation onto a visible sky arc so time offset changes height as well as azimuth.
	const visibleElevation = Math.max(-0.35, sunElevation);
	const sunY = Math.max(0.18, Math.min(0.78, 0.65 - visibleElevation * 0.28));

	// Season factor: cosine curve peaking at summer solstice (~day 172)
	const startOfYear = Date.UTC(date.year, 0, 0);
	const currentDay = Date.UTC(date.year, date.month - 1, date.day);
	const dayOfYear = Math.floor((currentDay - startOfYear) / 86_400_000);
	const seasonFactor = 0.5 + 0.5 * Math.cos(((dayOfYear - 172) / 365) * 2 * Math.PI);

	// Stars visible when sun is near/below horizon
	const starDensity = Math.max(0, -sunElevation * 0.8 + 0.2);

	// Horizon glow peaks at sunrise/sunset (sunElevation near 0)
	const horizonGlow = Math.max(0, 1 - Math.abs(sunElevation) * 3) * skyParams.glowStrength;

	return {
		hourAngle,
		sunElevation,
		sunX,
		sunY,
		seasonFactor,
		starDensity,
		horizonGlow,
		waterTime,
		dayOfYear
	};
}
