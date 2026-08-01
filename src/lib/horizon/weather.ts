import type { WeatherParams } from "./types";

const LOS_ANGELES_LATITUDE = 34.0522;
const LOS_ANGELES_LONGITUDE = -118.2437;

const CURRENT_FIELDS = [
  "relative_humidity_2m",
  "precipitation",
  "weather_code",
  "cloud_cover",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
].join(",");

const FORECAST_URL =
  `https://api.open-meteo.com/v1/forecast?latitude=${LOS_ANGELES_LATITUDE}` +
  `&longitude=${LOS_ANGELES_LONGITUDE}&current=${CURRENT_FIELDS}` +
  "&wind_speed_unit=ms&timezone=America%2FLos_Angeles&forecast_days=1";

export type WeatherSource = "loading" | "live" | "cached" | "fallback" | "manual";

export interface LosAngelesWeather {
  params: WeatherParams;
  modelTime: string;
  fetchedAt: number;
}

interface OpenMeteoResponse {
  current?: {
    time?: unknown;
    relative_humidity_2m?: unknown;
    precipitation?: unknown;
    weather_code?: unknown;
    cloud_cover?: unknown;
    wind_speed_10m?: unknown;
    wind_direction_10m?: unknown;
    wind_gusts_10m?: unknown;
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function finiteNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Los Angeles weather is missing ${field}.`);
  }
  return value;
}

function precipitationFloorForCode(code: number): number {
  if (code >= 95) return 0.78;
  if (code >= 80) return 0.48;
  if (code >= 65) return 0.64;
  if (code >= 61) return 0.38;
  if (code >= 51) return 0.16;
  return 0;
}

export function mapOpenMeteoWeather(payload: OpenMeteoResponse): LosAngelesWeather {
  const current = payload.current;
  if (!current || typeof current.time !== "string") {
    throw new Error("Los Angeles weather has no current model time.");
  }

  const wind = finiteNumber(current.wind_speed_10m, "wind speed");
  const gust = finiteNumber(current.wind_gusts_10m, "wind gusts");
  const directionFrom = finiteNumber(current.wind_direction_10m, "wind direction");
  const precipitationMm = finiteNumber(current.precipitation, "precipitation");
  const weatherCode = finiteNumber(current.weather_code, "weather code");

  // Open-Meteo reports the meteorological direction wind comes from. The
  // renderer wants the direction the cloud/wave system travels toward.
  const windDirection = (directionFrom + 180) % 360;
  const measuredRain = 1 - Math.exp(-Math.max(0, precipitationMm) / 1.5);

  return {
    params: {
      windSpeed: clamp(Math.max(wind, gust * 0.55), 0, 22),
      windDirection,
      cloudCover: clamp(finiteNumber(current.cloud_cover, "cloud cover") / 100, 0, 1),
      humidity: clamp(finiteNumber(current.relative_humidity_2m, "relative humidity") / 100, 0, 1),
      precipitation: clamp(Math.max(measuredRain, precipitationFloorForCode(weatherCode)), 0, 1),
    },
    modelTime: current.time,
    fetchedAt: Date.now(),
  };
}

export async function fetchLosAngelesWeather(signal?: AbortSignal): Promise<LosAngelesWeather> {
  const response = await fetch(FORECAST_URL, { signal });
  if (!response.ok) {
    throw new Error(`Los Angeles weather request failed (${response.status}).`);
  }

  return mapOpenMeteoWeather((await response.json()) as OpenMeteoResponse);
}
