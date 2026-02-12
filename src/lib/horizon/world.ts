import { type WorldParams, type SkyParams, DEFAULT_SKY_PARAMS } from './types';

export function computeWorldParams(
	now: number,
	waterTime: number = 0,
	skyParams: SkyParams = DEFAULT_SKY_PARAMS
): WorldParams {
	const date = new Date(now);
	const hours = date.getHours() + date.getMinutes() / 60 + skyParams.timeOffset;
	const hourAngle = (hours % 24) / 24;

	// Sun elevation: peaks at noon (hour 12), bottoms at midnight
	const sunElevation = Math.sin((hourAngle - 0.25) * 2 * Math.PI);

	// Sun moves east→west across the sky
	const sunX = 0.5 - 0.35 * Math.sin(hourAngle * 2 * Math.PI);
	// Map solar elevation onto a visible sky arc so time offset changes height as well as azimuth.
	const visibleElevation = Math.max(-0.35, sunElevation);
	const sunY = Math.max(0.18, Math.min(0.78, 0.65 - visibleElevation * 0.28));

	// Season factor: cosine curve peaking at summer solstice (~day 172)
	const startOfYear = new Date(date.getFullYear(), 0, 0).getTime();
	const dayOfYear = Math.floor((now - startOfYear) / 86_400_000);
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
