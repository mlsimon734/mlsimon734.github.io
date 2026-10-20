import type { AsciiCell, GridConfig, WorldParams } from "./types";
import type { BackgroundPalette } from "./background";
import { hexToRgb, mix, rgbString, sunWarmth } from "./color";

type Zone = AsciiCell["zone"];

export interface AsciiRun {
  chars: string;
  zone: Zone;
  tone: number;
  twinkleDelay?: number;
}

/** Glyph colors per zone, plus the painted background ramp. All tokens are hex. */
export type ZonePalette = Record<Zone, string> & BackgroundPalette;

export interface MonoMetrics {
  font: string;
  fontSize: number;
  lineHeightPx: number;
  charWidth: number;
  cssWidth: number;
  cssHeight: number;
}

const CANVAS_FONT_SIZE = 11;
const CANVAS_LINE_HEIGHT = 1.15;

const ZONES: readonly Zone[] = [
  "star",
  "sky",
  "cloud-light",
  "cloud-shadow",
  "rain",
  "spray",
  "sun-core",
  "sun",
  "moon-core",
  "moon",
  "water",
  "water-reflect",
  "water-reflect-warm",
  "water-reflect-cool",
  "foam",
];

const BACKGROUND_KEYS: readonly Exclude<keyof BackgroundPalette, Zone>[] = [
  "bg-night-zenith",
  "bg-night-horizon",
  "bg-blue-zenith",
  "bg-blue-horizon",
  "bg-dusk-zenith",
  "bg-dusk-horizon",
  "bg-day-zenith",
  "bg-day-horizon",
  "bg-glow",
  "bg-aureole",
  "bg-moon-glow",
  "bg-cloud-light",
  "bg-cloud-shadow",
  "bg-water-deep",
];

/**
 * Group a row into draw calls. Cells sharing zone, tone, and twinkle extend a run, and
 * blank cells join whatever run is open, so a broken line of waves is a single call.
 */
export function encodeRuns(grid: AsciiCell[][]): AsciiRun[][] {
  return grid.map((row) => {
    const runs: AsciiRun[] = [];
    let current: AsciiRun | null = null;

    for (const cell of row) {
      const tone = cell.tone ?? 1;
      if (
        current &&
        (cell.char === " " ||
          (cell.zone === current.zone &&
            tone === current.tone &&
            cell.twinkleDelay === current.twinkleDelay))
      ) {
        current.chars += cell.char;
        continue;
      }
      current = { chars: cell.char, zone: cell.zone, tone, twinkleDelay: cell.twinkleDelay };
      runs.push(current);
    }

    return runs;
  });
}

function recordOf<K extends string>(
  keys: readonly K[],
  value: (key: K) => string,
): Record<K, string> {
  return Object.fromEntries(keys.map((key) => [key, value(key)])) as Record<K, string>;
}

export function resolveZonePalette(styles: CSSStyleDeclaration): ZonePalette {
  return recordOf([...ZONES, ...BACKGROUND_KEYS], (key) =>
    styles.getPropertyValue(`--color-horizon-${key}`).trim(),
  );
}

/**
 * Glyph colors for this moment. The sun and its glitter redden as it nears the
 * horizon, and lit cloud picks up the warm band at dusk; other zones are fixed.
 */
export function sceneColors(
  palette: ZonePalette,
  world: Pick<WorldParams, "sunElevation" | "horizonGlow" | "sunVisibility">,
): Record<Zone, string> {
  const warmth = sunWarmth(world);
  const high = hexToRgb(palette["sun-core"]);
  const low = hexToRgb(palette.sun);
  const gold = hexToRgb(palette["water-reflect"]);
  const ember = hexToRgb(palette["water-reflect-warm"]);
  const dusk = Math.min(1, world.horizonGlow) * (0.3 + 0.7 * world.sunVisibility);
  const colors = recordOf(ZONES, (zone) => palette[zone]);

  // The disc's dots burn a little hotter than the glow painted beneath them.
  colors["sun-core"] = rgbString(mix(high, mix(low, gold, 0.6), warmth));
  colors.sun = rgbString(mix(mix(high, gold, 0.3), mix(low, gold, 0.25), warmth));
  colors["water-reflect"] = rgbString(mix(high, gold, warmth));
  colors["water-reflect-warm"] = rgbString(mix(gold, ember, warmth));
  // At dusk the sea reflects the warm band, so its strokes take a little of it.
  colors.water = rgbString(mix(hexToRgb(palette.water), mix(low, gold, 0.5), 0.3 * dusk));
  colors["cloud-light"] = rgbString(
    mix(hexToRgb(palette["cloud-light"]), mix(low, gold, 0.3), 0.3 * dusk),
  );
  return colors;
}

/**
 * Opacity multiplier for glyph tones. Over a pale wash the glyphs are ink, and
 * dark ink blended toward paper loses contrast faster than light glyphs do toward
 * night, so a light palette lifts every tone.
 */
export function toneGain(palette: ZonePalette): number {
  const [r, g, b] = hexToRgb(palette["bg-day-horizon"]);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.5 ? 1.45 : 1;
}

export function createMonoMetrics(config: GridConfig, charWidth: number): MonoMetrics {
  const lineHeightPx = CANVAS_FONT_SIZE * CANVAS_LINE_HEIGHT;

  return {
    font: `${CANVAS_FONT_SIZE}px "JetBrains Mono", ui-monospace, monospace`,
    fontSize: CANVAS_FONT_SIZE,
    lineHeightPx,
    charWidth,
    cssWidth: Math.ceil(config.width * charWidth),
    cssHeight: Math.ceil(config.height * lineHeightPx),
  };
}
