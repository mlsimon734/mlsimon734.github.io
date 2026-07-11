import { type WorldParams, type SkyParams, DEFAULT_SKY_PARAMS } from "./types";

const LOS_ANGELES_TIME_ZONE = "America/Los_Angeles";
const LA_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  timeZone: LOS_ANGELES_TIME_ZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  hour12: false,
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
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]),
  );

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour === 24 ? 0 : values.hour,
    minute: values.minute,
  };
}

export function getLosAngelesHours(now: number = Date.now()): number {
  const date = getLosAngelesDateParts(now);
  return date.hour + date.minute / 60;
}

const SYNODIC_MONTH_DAYS = 29.530588853;
// Reference new moon: 2000-01-06 18:14 UTC
const NEW_MOON_EPOCH_MS = Date.UTC(2000, 0, 6, 18, 14);

/** Lunar phase 0–1 (0 = new moon, 0.5 = full moon). */
export function computeMoonPhase(now: number): number {
  const days = (now - NEW_MOON_EPOCH_MS) / 86_400_000;
  return (((days / SYNODIC_MONTH_DAYS) % 1) + 1) % 1;
}

// Sun stops reading as "setting" and the moon takes over once the sun is
// this far below the horizon — past the point where horizonGlow matters.
const NIGHT_ELEVATION = -0.25;

function arcPosition(hourAngle: number): { x: number; y: number; elevation: number } {
  const elevation = Math.sin((hourAngle - 0.25) * 2 * Math.PI);
  const x = 0.5 - 0.35 * Math.sin(hourAngle * 2 * Math.PI);
  // Map elevation onto a visible sky arc so time offset changes height as well as azimuth.
  const visibleElevation = Math.max(-0.35, elevation);
  const y = Math.max(0.18, Math.min(0.78, 0.65 - visibleElevation * 0.28));
  return { x, y, elevation };
}

export function computeWorldParams(
  now: number,
  waterTime: number = 0,
  skyParams: SkyParams = DEFAULT_SKY_PARAMS,
): WorldParams {
  const date = getLosAngelesDateParts(now);
  const hours = getLosAngelesHours(now) + skyParams.timeOffset;
  const hourAngle = (((hours % 24) + 24) % 24) / 24;

  // Sun elevation: peaks at noon (hour 12), bottoms at midnight
  const sun = arcPosition(hourAngle);
  const sunElevation = sun.elevation;

  // At night the moon rides the same arc half a day out of phase, so it
  // rises in the east as the sun sets in the west.
  const isNight = sunElevation < NIGHT_ELEVATION;
  const moon = arcPosition((hourAngle + 0.5) % 1);
  const body = isNight ? moon : sun;
  const moonPhase = computeMoonPhase(now);
  const moonIllum = (1 - Math.cos(moonPhase * 2 * Math.PI)) / 2;

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
    sunX: body.x,
    sunY: body.y,
    bodyElevation: body.elevation,
    isNight,
    moonPhase,
    moonIllum,
    seasonFactor,
    starDensity,
    horizonGlow,
    waterTime,
    dayOfYear,
  };
}
