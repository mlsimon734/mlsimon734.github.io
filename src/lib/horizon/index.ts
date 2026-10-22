import { computeWorldParams } from "./world";
import { discCell, type Disc } from "./braille";
import {
  hash2,
  rainGlyph,
  sampleAtmosphereGrid,
  smoothstep,
  valueNoise,
  weatherPulse,
  type AtmosphereSample,
} from "./atmosphere";
import { TONE_LEVELS, horizonRow, placeBody, quantizeTone } from "./frame";
import { glint, sampleSea, seaView, skyReflectance, type LightSource } from "./waves";
import type {
  GridConfig,
  AsciiCell,
  WaveParams,
  SkyParams,
  WeatherParams,
  WorldParams,
} from "./types";
import { DEFAULT_WAVE_PARAMS, DEFAULT_SKY_PARAMS, DEFAULT_WEATHER_PARAMS } from "./types";

export {
  DESKTOP_CONFIG,
  MOBILE_CONFIG,
  DEFAULT_WAVE_PARAMS,
  DEFAULT_SKY_PARAMS,
  DEFAULT_WEATHER_PARAMS,
} from "./types";
export type { AsciiCell, GridConfig, WaveParams, SkyParams, WeatherParams } from "./types";
export type { WeatherSource } from "./weather";

type Grid = AsciiCell[][];

interface Body {
  disc: Disc;
  /** Overall brightness after twilight, phase, and cloud. */
  light: number;
  core: AsciiCell["zone"];
  limb: AsciiCell["zone"];
  /** Lit dots beyond this normalized radius take the limb color. */
  limbRadius: number;
  /** Tone of the unlit side. */
  earthshine: number;
}

/** Mulberry32 PRNG: deterministic so the star field is the same sky every night. */
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function cloudAt(atmosphere: readonly AtmosphereSample[], config: GridConfig, disc: Disc): number {
  const col = Math.max(0, Math.min(config.width - 1, Math.floor(disc.col)));
  const row = Math.max(0, Math.min(disc.clipRow - 1, Math.floor(disc.row)));
  return atmosphere[row * config.width + col]?.cloud ?? 0;
}

// The frame shows this fraction of the celestial circle, so stars drift across it
// at the sidereal rate instead of being re-scattered each day.
const STAR_SPAN = 2.4;
const STAR_FIELD = (() => {
  const rng = mulberry32(0x0c3a17);
  return Array.from({ length: 96 }, () => ({
    longitude: rng(),
    altitude: rng(),
    // Few bright stars, many faint ones.
    brightness: Math.pow(rng(), 2.6),
  }));
})();

function paintStars(
  grid: Grid,
  config: GridConfig,
  world: WorldParams,
  atmosphere: readonly AtmosphereSample[],
  bodies: readonly Body[],
) {
  if (world.starDensity <= 0) return;
  const seaTop = horizonRow(config);
  const turn = world.hourAngle + world.dayOfYear / 365.25;
  const count = Math.min(STAR_FIELD.length, Math.round(config.maxStars * STAR_SPAN));

  for (let i = 0; i < count; i++) {
    const star = STAR_FIELD[i];
    const x = Math.floor(((star.longitude + turn) % 1) * STAR_SPAN * config.width);
    if (x >= config.width) continue;
    const y = Math.floor(star.altitude * (seaTop - 2));
    // Moonlight and its halo wash out nearby stars.
    const nearBody = bodies.some(({ disc, light }) => {
      const dc = (x + 0.5 - disc.col) / disc.radiusCols;
      const dr = (y + 0.5 - disc.row) / disc.radiusRows;
      return light > 0.05 && dc * dc + dr * dr < 2.6;
    });
    if (nearBody) continue;
    // Brighter stars come out first at dusk; all of them dim into the horizon haze.
    const emergence = smoothstep(
      1 - star.brightness,
      1.25 - star.brightness,
      world.starDensity * 1.1,
    );
    const extinction = 1 - smoothstep(seaTop - 7, seaTop - 1, y);
    const cloud = atmosphere[y * config.width + x]?.cloud ?? 0;
    const tone =
      emergence * extinction * (0.4 + 0.6 * star.brightness) * (1 - smoothstep(0.05, 0.3, cloud));
    if (tone < 0.12) continue;
    grid[y][x] = {
      char: star.brightness > 0.6 ? "•" : star.brightness > 0.2 ? "·" : ".",
      zone: "star",
      tone: quantizeTone(tone),
      twinkleDelay: (i % 7) * 0.9,
    };
  }
}

function paintAtmosphere(
  grid: Grid,
  config: GridConfig,
  world: WorldParams,
  weather: WeatherParams,
  atmosphere: readonly AtmosphereSample[],
) {
  const seaTop = horizonRow(config);
  const spray = Math.max(0, (weather.windSpeed - 11) / 8);

  for (let y = 0; y < seaTop; y++) {
    for (let x = 0; x < config.width; x++) {
      const sample = atmosphere[y * config.width + x];
      if (sample.rain > 0.24) {
        // Rain falls in sparse slanted streaks, never a solid hatch.
        if (hash2(x, y, 3) > 0.2 + 0.4 * sample.rain) continue;
        grid[y][x] = {
          char: rainGlyph(weather.windDirection, x, y),
          zone: "rain",
          tone: quantizeTone(0.15 + 0.35 * sample.rain),
        };
      } else if (sample.cloud > 0.18) {
        // The wash carries the cloud's body; sparse strokes give it grain, gathered
        // along the edges where light catches.
        const grain = sample.cloud * (0.06 + 0.6 * sample.cloudEdge);
        if (hash2(x, y, 5) > grain * 0.6) continue;
        grid[y][x] = {
          char: sample.cloud > 0.55 ? "-" : "·",
          zone: sample.cloudLight > 0.58 ? "cloud-light" : "cloud-shadow",
          tone: quantizeTone(0.2 + 0.25 * sample.cloud + 0.3 * sample.cloudEdge),
        };
      } else if (y >= seaTop - 2 && spray > 0) {
        const lift =
          spray *
          weatherPulse(x, y, world.waterTime) *
          valueNoise(x * 0.7, world.waterTime * 2, 71);
        if (lift > 0.32) {
          grid[y][x] = {
            char: (x + y) % 3 === 0 ? "'" : "·",
            zone: "spray",
            tone: quantizeTone(lift),
          };
        }
      }
    }
  }
}

function paintBodies(
  grid: Grid,
  config: GridConfig,
  bodies: readonly Body[],
  atmosphere: readonly AtmosphereSample[],
) {
  for (const { disc, light, core, limb, limbRadius, earthshine } of bodies) {
    if (light <= 0.02) continue;
    // Cloud dims part of a visible disc but never cuts it into fragments.
    const minTone = Math.min(quantizeTone(light), 1 / TONE_LEVELS);
    const top = Math.max(0, Math.floor(disc.row - disc.radiusRows));
    const bottom = Math.min(disc.clipRow - 1, disc.row + disc.radiusRows);
    const left = Math.max(0, Math.floor(disc.col - disc.radiusCols));
    const right = Math.min(config.width - 1, disc.col + disc.radiusCols);

    for (let y = top; y <= bottom; y++) {
      for (let x = left; x <= right; x++) {
        const cell = discCell(disc, x, y);
        if (!cell) continue;
        // Cloud crossing the disc dims it; the wash shows the cloud itself, so its
        // grain would only read as scratches here.
        const cloud = atmosphere[y * config.width + x]?.cloud ?? 0;
        const veil = 1 - 0.7 * smoothstep(0.15, 0.85, cloud);
        grid[y][x] =
          cell.lit !== " "
            ? {
                char: cell.lit,
                zone: cell.radius < limbRadius ? core : limb,
                tone: Math.max(minTone, quantizeTone(light * veil)),
              }
            : // Earthshine: a thin crescent's dark side stays just legible.
              { char: cell.shade, zone: limb, tone: quantizeTone(earthshine * veil) };
      }
    }
  }
}

function paintSea(
  grid: Grid,
  config: GridConfig,
  world: WorldParams,
  waveParams: WaveParams,
  weather: WeatherParams,
  [sun, moon]: readonly Body[],
) {
  const { width, height } = config;
  const seaTop = horizonRow(config);
  const time = world.waterTime;
  const sunLight: LightSource = {
    x: sun.disc.col / width,
    elevation: Math.asin(world.sunElevation),
  };
  const moonLight: LightSource = {
    x: moon.disc.col / width,
    elevation: Math.asin(world.moonElevation),
  };
  // Moonlight is far dimmer than sunlight; its path is a quieter, cooler echo.
  const moonGain = 0.75 * moon.light;
  // Under a heavy deck the light is diffuse even where the disc shows through.
  const sunGain = sun.light * (1 - 0.4 * weather.cloudCover);
  // The open sea reflects the sky, so it dims through twilight into night.
  const skyLight = 1 - 0.4 * world.nightFactor;

  for (let y = seaTop; y < height; y++) {
    const view = seaView((y + 0.5 - seaTop) / height, width, height);
    const sheen = skyReflectance(view);
    const depth = (y - seaTop + 0.5) / (height - seaTop);

    for (let x = 0; x < width; x++) {
      const u = (x + 0.5) / width;
      const sample = sampleSea(u, view, time, waveParams, weather);

      if (sample.foam > 0.4) {
        grid[y][x] = {
          char: sample.foam > 0.75 ? "≈" : "~",
          zone: "foam",
          tone: quantizeTone(0.35 + 0.65 * sample.foam),
        };
        continue;
      }

      const sunGlint =
        sunGain > 0.01 ? glint(u, view, sunLight, sample, weather.windSpeed) * sunGain : 0;
      const moonGlint =
        moonGain > 0.01 ? glint(u, view, moonLight, sample, weather.windSpeed) * moonGain : 0;
      const light = Math.max(sunGlint, moonGlint);
      if (light > 0.17) {
        const strength = Math.min(1, light);
        grid[y][x] = {
          // Glints are horizontal flecks; on a near crest they follow its curve.
          char: depth > 0.3 && sample.chop > 0.35 ? "~" : strength > 0.55 ? "—" : "-",
          zone:
            moonGlint > sunGlint
              ? "water-reflect-cool"
              : strength > 0.6
                ? "water-reflect"
                : "water-reflect-warm",
          tone: quantizeTone(0.35 + 0.65 * strength),
        };
        continue;
      }

      // Chop varies along a row, so it decides where strokes fall and each row breaks
      // into its own line of waves. Where chop has blurred away, a slow drifting fleck
      // stands in; the swell lifts whole bands, as long swells do at sea.
      const fleck = valueNoise(x * 0.8 + time * 0.3, y * 3.1 + time * 0.15, 19) * 2 - 1;
      const texture = sample.chop + (1 - sample.chopResolved) * fleck * 0.8 + 0.3 * sample.swell;
      if (texture < 0.08 + 0.3 * depth) continue;
      const char =
        sample.chopResolved < 0.45 || sample.chop < 0.2
          ? "-"
          : depth > 0.5 && sample.chop > 0.72 && sample.crest > 0.55
            ? "≈"
            : "~";
      grid[y][x] = {
        char,
        // Strokes at the path's edge carry its light without glinting.
        zone:
          light > 0.08
            ? moonGlint > sunGlint
              ? "water-reflect-cool"
              : "water-reflect-warm"
            : "water",
        tone: quantizeTone(
          skyLight * (0.28 + 0.3 * sheen + 0.15 * sample.swell + 0.3 * Math.max(0, sample.chop)),
        ),
      };
    }
  }
}

export function generateHorizon(
  now: number,
  config: GridConfig,
  waterTime: number = 0,
  waveParams: WaveParams = DEFAULT_WAVE_PARAMS,
  skyParams: SkyParams = DEFAULT_SKY_PARAMS,
  weatherParams: WeatherParams = DEFAULT_WEATHER_PARAMS,
  params = computeWorldParams(now, waterTime, skyParams),
  atmosphereGrid = sampleAtmosphereGrid(config, params.waterTime, weatherParams),
): AsciiCell[][] {
  const grid: Grid = Array.from({ length: config.height }, () =>
    Array.from({ length: config.width }, (): AsciiCell => ({ char: " ", zone: "sky" })),
  );

  const sunDisc = placeBody(
    params.sunX,
    params.sunY,
    Math.asin(params.sunElevation),
    config,
    skyParams,
  );
  const moonDisc = placeBody(
    params.moonX,
    params.moonY,
    Math.asin(params.moonElevation),
    config,
    skyParams,
    params.moonPhase,
  );
  const bodies: Body[] = [
    {
      disc: sunDisc,
      // The disc fades faster than its glow as it slips under the horizon.
      light:
        params.sunVisibility *
        params.sunVisibility *
        (1 - 0.8 * cloudAt(atmosphereGrid, config, sunDisc)),
      core: "sun-core",
      limb: "sun",
      limbRadius: 0.62,
      earthshine: 0,
    },
    {
      disc: moonDisc,
      light:
        params.moonVisibility *
        (0.3 + 0.7 * params.moonIllum) *
        (1 - 0.8 * cloudAt(atmosphereGrid, config, moonDisc)),
      core: "moon-core",
      limb: "moon",
      // The moon shows almost no limb darkening.
      limbRadius: Infinity,
      earthshine: 0.3 * params.moonVisibility * Math.pow(1 - params.moonIllum, 3),
    },
  ];

  paintAtmosphere(grid, config, params, weatherParams, atmosphereGrid);
  paintStars(grid, config, params, atmosphereGrid, bodies);
  paintBodies(grid, config, bodies, atmosphereGrid);
  paintSea(grid, config, params, waveParams, weatherParams, bodies);
  return grid;
}
