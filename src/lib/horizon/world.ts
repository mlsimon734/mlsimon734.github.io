import { type WorldParams, type SkyParams, DEFAULT_SKY_PARAMS } from "./types";

const LOS_ANGELES_TIME_ZONE = "America/Los_Angeles";
const LOS_ANGELES_LATITUDE = (34.0522 * Math.PI) / 180;
const LOS_ANGELES_LONGITUDE = -118.2437;
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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function timezoneOffsetHours(now: number, date: ReturnType<typeof getLosAngelesDateParts>): number {
  const representedAsUtc = Date.UTC(date.year, date.month - 1, date.day, date.hour, date.minute);
  return Math.round((representedAsUtc - now) / 3_600_000);
}

function positionOnSky(
  hourAngle: number,
  declination: number,
): {
  x: number;
  y: number;
  elevation: number;
  azimuth: number;
} {
  const sinElevation =
    Math.sin(LOS_ANGELES_LATITUDE) * Math.sin(declination) +
    Math.cos(LOS_ANGELES_LATITUDE) * Math.cos(declination) * Math.cos(hourAngle);
  const elevation = clamp(sinElevation, -1, 1);
  const azimuth =
    Math.atan2(
      Math.sin(hourAngle),
      Math.cos(hourAngle) * Math.sin(LOS_ANGELES_LATITUDE) -
        Math.tan(declination) * Math.cos(LOS_ANGELES_LATITUDE),
    ) + Math.PI;

  // Project the real solar hour angle into the postcard's wide sky dome.
  const x = clamp(0.5 + 0.45 * Math.sin(hourAngle), 0.035, 0.965);
  const y = clamp(0.65 - Math.max(-0.26, elevation) * 0.5, 0.14, 0.79);
  return { x, y, elevation, azimuth };
}

export function computeWorldParams(
  now: number,
  waterTime: number = 0,
  skyParams: SkyParams = DEFAULT_SKY_PARAMS,
): WorldParams {
  const date = getLosAngelesDateParts(now);
  const hours = getLosAngelesHours(now) + skyParams.timeOffset;
  const hourAngle = (((hours % 24) + 24) % 24) / 24;

  // Season factor: cosine curve peaking at summer solstice (~day 172)
  const startOfYear = Date.UTC(date.year, 0, 0);
  const currentDay = Date.UTC(date.year, date.month - 1, date.day);
  const dayOfYear = Math.floor((currentDay - startOfYear) / 86_400_000);
  const seasonFactor = 0.5 + 0.5 * Math.cos(((dayOfYear - 172) / 365) * 2 * Math.PI);

  // NOAA-style fractional-year solar geometry. This gives the sun a seasonal
  // declination, equation-of-time correction, and Los Angeles solar noon.
  const fractionalYear =
    (2 * Math.PI * (dayOfYear - 1 + (hours - 12) / 24)) / (date.year % 4 === 0 ? 366 : 365);
  const equationOfTime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(fractionalYear) -
      0.032077 * Math.sin(fractionalYear) -
      0.014615 * Math.cos(2 * fractionalYear) -
      0.040849 * Math.sin(2 * fractionalYear));
  const solarDeclination =
    0.006918 -
    0.399912 * Math.cos(fractionalYear) +
    0.070257 * Math.sin(fractionalYear) -
    0.006758 * Math.cos(2 * fractionalYear) +
    0.000907 * Math.sin(2 * fractionalYear) -
    0.002697 * Math.cos(3 * fractionalYear) +
    0.00148 * Math.sin(3 * fractionalYear);
  const timezone = timezoneOffsetHours(now, date);
  const trueSolarMinutes =
    (((hours * 60 + equationOfTime + 4 * LOS_ANGELES_LONGITUDE - 60 * timezone) % 1440) + 1440) %
    1440;
  const solarHourAngle = ((trueSolarMinutes / 4 - 180) * Math.PI) / 180;
  const sun = positionOnSky(solarHourAngle, solarDeclination);
  const sunElevation = sun.elevation;

  // The lunar elongation follows the synodic phase: new moons travel near
  // the sun, full moons opposite it. A small declination term keeps the arc organic.
  const moonPhase = computeMoonPhase(now);
  const moonIllum = (1 - Math.cos(moonPhase * 2 * Math.PI)) / 2;
  const moonHourAngle = solarHourAngle - moonPhase * 2 * Math.PI;
  const moonDeclination =
    -0.16 * solarDeclination + 0.12 * Math.sin(moonPhase * 2 * Math.PI + dayOfYear * 0.075);
  const moon = positionOnSky(moonHourAngle, moonDeclination);

  // The two bodies remain independent. Their apparent intensity fades through
  // the horizon and twilight instead of switching at an arbitrary clock time.
  const sunVisibility = smoothstep(-0.09, 0.025, sunElevation);
  const nightFactor = 1 - smoothstep(-0.28, 0.12, sunElevation);
  const moonAltitudeVisibility = smoothstep(-0.1, 0.045, moon.elevation);
  const moonTwilightVisibility = 1 - smoothstep(-0.18, 0.15, sunElevation);
  const moonVisibility = moonAltitudeVisibility * moonTwilightVisibility;

  // Stars visible when sun is near/below horizon
  const starDensity = clamp((-sunElevation + 0.08) / 0.72, 0, 1);

  // Horizon glow peaks at sunrise/sunset (sunElevation near 0)
  const horizonGlow = Math.max(0, 1 - Math.abs(sunElevation) * 3) * skyParams.glowStrength;

  return {
    hourAngle,
    sunElevation,
    solarAzimuth: (sun.azimuth * 180) / Math.PI,
    sunX: sun.x,
    sunY: sun.y,
    sunVisibility,
    moonX: moon.x,
    moonY: moon.y,
    moonElevation: moon.elevation,
    moonVisibility,
    nightFactor,
    moonPhase,
    moonIllum,
    seasonFactor,
    starDensity,
    horizonGlow,
    waterTime,
    dayOfYear,
  };
}
