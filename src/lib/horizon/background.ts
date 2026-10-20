import type { GridConfig, WorldParams, WeatherParams, SkyParams } from "./types";
import { DEFAULT_WEATHER_PARAMS, DEFAULT_SKY_PARAMS } from "./types";
import { sampleAtmosphereGrid, smoothstep } from "./atmosphere";
import { discCell, type Disc } from "./braille";
import { CELL_ASPECT, horizonRow, placeBody } from "./frame";
import { expectedGlint, seaView, skyReflectance } from "./waves";
import { type Rgb, hexToRgb, mix, sunWarmth } from "./color";

/** The bg-* subset of the zone palette the painted scene needs, plus the sun's tones. */
export interface BackgroundPalette {
  "bg-night-zenith": string;
  "bg-night-horizon": string;
  "bg-blue-zenith": string;
  "bg-blue-horizon": string;
  "bg-dusk-zenith": string;
  "bg-dusk-horizon": string;
  "bg-day-zenith": string;
  "bg-day-horizon": string;
  "bg-glow": string;
  "bg-aureole": string;
  "bg-moon-glow": string;
  "bg-cloud-light": string;
  "bg-cloud-shadow": string;
  "bg-water-deep": string;
  "sun-core": string;
  sun: string;
}

type SkyKey = "night" | "blue" | "dusk" | "day";

// Sky keyframes by solar elevation in degrees: astronomical night, blue hour,
// the moment of sunset, and full day. Between them the wash eases continuously.
const SKY_KEYFRAMES: readonly { elevation: number; key: SkyKey }[] = [
  { elevation: -15, key: "night" },
  { elevation: -6, key: "blue" },
  { elevation: 0.5, key: "dusk" },
  { elevation: 16, key: "day" },
];

function skyAt(
  palette: BackgroundPalette,
  elevationDegrees: number,
): { zenith: Rgb; horizon: Rgb } {
  const pick = (key: SkyKey) => ({
    zenith: hexToRgb(palette[`bg-${key}-zenith`]),
    horizon: hexToRgb(palette[`bg-${key}-horizon`]),
  });
  const first = SKY_KEYFRAMES[0];
  if (elevationDegrees <= first.elevation) return pick(first.key);
  for (let i = 1; i < SKY_KEYFRAMES.length; i++) {
    const lower = SKY_KEYFRAMES[i - 1];
    const upper = SKY_KEYFRAMES[i];
    if (elevationDegrees <= upper.elevation) {
      const t = smoothstep(lower.elevation, upper.elevation, elevationDegrees);
      const a = pick(lower.key);
      const b = pick(upper.key);
      return { zenith: mix(a.zenith, b.zenith, t), horizon: mix(a.horizon, b.horizon, t) };
    }
  }
  return pick(SKY_KEYFRAMES[SKY_KEYFRAMES.length - 1].key);
}

/**
 * Render the painted wash behind the glyphs at one pixel per character cell; callers
 * scale it up smoothly. The sky eases through keyframes set by the sun's elevation,
 * with a warm band and halo around the sun and a cool one around the moon. The sea
 * mirrors the sky above it by the Fresnel reflectance of its viewing angle, darkening
 * toward the viewer, and carries the glitter path's smooth body under the glyphs.
 * Returns RGBA pixels, config.width × config.height.
 */
export function renderBackgroundPixels(
  config: GridConfig,
  palette: BackgroundPalette,
  world: WorldParams,
  weather: WeatherParams = DEFAULT_WEATHER_PARAMS,
  atmosphereGrid = sampleAtmosphereGrid(config, world.waterTime, weather),
  skyParams: SkyParams = DEFAULT_SKY_PARAMS,
): Uint8ClampedArray<ArrayBuffer> {
  const { width, height } = config;
  const seaTop = horizonRow(config);
  const elevation = Math.asin(world.sunElevation);
  const sky = skyAt(palette, (elevation * 180) / Math.PI);
  const glow = hexToRgb(palette["bg-glow"]);
  const moonGlow = hexToRgb(palette["bg-moon-glow"]);
  const cloudLight = hexToRgb(palette["bg-cloud-light"]);
  const cloudShadow = hexToRgb(palette["bg-cloud-shadow"]);
  // The sea's own body color is the sky's light scattered back out of the water.
  const waterBody = mix(hexToRgb(palette["bg-water-deep"]), sky.zenith, 0.5);
  const warmth = sunWarmth(world);
  const sunTone = mix(hexToRgb(palette.sun), hexToRgb(palette["sun-core"]), 1 - warmth);
  // The light around the sun: an orange glow on the horizon, a pale aureole up high.
  const aureole = mix(glow, hexToRgb(palette["bg-aureole"]), 1 - warmth);
  const glowStrength = Math.min(1, world.horizonGlow);
  // After sunset the afterglow spreads along the horizon before it fades.
  const glowWidth = 0.2 + 0.22 * (1 - world.sunVisibility);
  // Clouds turn to silhouettes at night; at dusk their undersides catch the glow
  // near the sun.
  const cloudNight = mix(cloudShadow, sky.zenith, 0.6);

  const sun = placeBody(world.sunX, world.sunY, elevation, config, skyParams);
  const moonElevation = Math.asin(world.moonElevation);
  const moon = placeBody(
    world.moonX,
    world.moonY,
    moonElevation,
    config,
    skyParams,
    world.moonPhase,
  );
  const moonLight = world.moonVisibility * (0.25 + 0.75 * world.moonIllum);
  const sunU = sun.col / width;

  const pixels = new Uint8ClampedArray(width * height * 4);
  const put = (x: number, y: number, rgb: Rgb) => {
    const i = (y * width + x) * 4;
    pixels[i] = rgb[0];
    pixels[i + 1] = rgb[1];
    pixels[i + 2] = rgb[2];
    pixels[i + 3] = 255;
  };
  const halo = (x: number, y: number, body: Disc, reach: number) => {
    const dc = (x + 0.5 - body.col) / CELL_ASPECT;
    const dr = y + 0.5 - body.row;
    const r = Math.sqrt(dc * dc + dr * dr) / body.radiusRows;
    return Math.exp(-Math.max(0, r - 1) / reach);
  };
  // The lit disc glows in the wash, so the braille dots above it read as one body.
  const disc = (x: number, y: number, body: Disc) => discCell(body, x, y)?.coverage ?? 0;

  for (let y = 0; y < seaTop; y++) {
    const t = (seaTop - (y + 0.5)) / seaTop;
    const base = mix(sky.horizon, sky.zenith, 1 - Math.pow(1 - t, 2.4));
    for (let x = 0; x < width; x++) {
      const u = (x + 0.5) / width;
      const du = u - sunU;
      let rgb = base;

      const band =
        glowStrength *
        (0.75 * Math.exp(-(du * du) / (2 * glowWidth * glowWidth)) + 0.25) *
        Math.exp(-t / 0.28);
      rgb = mix(rgb, glow, 0.8 * band);
      rgb = mix(rgb, aureole, 0.45 * world.sunVisibility * halo(x, y, sun, 1.2));
      rgb = mix(rgb, moonGlow, 0.45 * moonLight * halo(x, y, moon, 0.9));

      const atmosphere = atmosphereGrid[y * width + x];
      rgb = mix(rgb, sky.horizon, 0.35 * atmosphere.haze);
      const sunward = glowStrength * Math.exp(-(du * du) / (2 * 0.3 * 0.3));
      const warmCloud = mix(cloudLight, glow, 0.65 * sunward * (0.4 + 0.6 * Math.exp(-t / 0.5)));
      const cloudLit = mix(cloudShadow, warmCloud, atmosphere.cloudLight);
      const cloudColor = mix(cloudLit, cloudNight, world.nightFactor);
      rgb = mix(rgb, cloudColor, 0.7 * atmosphere.cloud);
      put(x, y, rgb);
    }
  }

  const sunLight = { x: sunU, elevation };
  const moonSource = { x: moon.col / width, elevation: moonElevation };
  for (let y = seaTop; y < height; y++) {
    const view = seaView((y + 0.5 - seaTop) / height, width, height);
    const reflectance = Math.min(0.7, skyReflectance(view));
    const mirrorRow = Math.max(0, 2 * seaTop - 1 - y);
    for (let x = 0; x < width; x++) {
      const u = (x + 0.5) / width;
      const i = (mirrorRow * width + x) * 4;
      const mirrored: Rgb = [pixels[i], pixels[i + 1], pixels[i + 2]];
      let rgb = mix(waterBody, mirrored, reflectance);
      if (world.sunVisibility > 0.01) {
        const body = expectedGlint(u, view, sunLight, weather.windSpeed) * world.sunVisibility;
        rgb = mix(rgb, aureole, 0.5 * body);
      }
      if (moonLight > 0.01) {
        const body = expectedGlint(u, view, moonSource, weather.windSpeed) * moonLight;
        rgb = mix(rgb, moonGlow, 0.45 * body);
      }
      put(x, y, rgb);
    }
  }

  // Discs go on last: the sea mirrors the sky's light, but waves break the bodies
  // themselves into glitter rather than a mirror image.
  for (const [body, color, strength] of [
    [sun, mix(sunTone, aureole, 0.5), 0.85 * world.sunVisibility * world.sunVisibility],
    [moon, moonGlow, 0.6 * moonLight],
  ] as const) {
    if (strength <= 0.01) continue;
    for (let y = Math.max(0, Math.floor(body.row - body.radiusRows)); y < seaTop; y++) {
      if (y > body.row + body.radiusRows) break;
      for (let x = Math.max(0, Math.floor(body.col - body.radiusCols)); x < width; x++) {
        if (x > body.col + body.radiusCols) break;
        const coverage = disc(x, y, body);
        if (coverage <= 0) continue;
        const i = (y * width + x) * 4;
        const veil = 1 - 0.7 * atmosphereGrid[y * width + x].cloud;
        put(
          x,
          y,
          mix([pixels[i], pixels[i + 1], pixels[i + 2]], color, strength * veil * coverage),
        );
      }
    }
  }

  return pixels;
}
