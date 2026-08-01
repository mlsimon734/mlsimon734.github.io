import type { AsciiCell, GridConfig } from "./types";

export interface AsciiRun {
  chars: string;
  zone: AsciiCell["zone"];
  twinkleDelay?: number;
}

export interface ZonePalette {
  star: string;
  sky: string;
  "sky-glow": string;
  "cloud-light": string;
  "cloud-shadow": string;
  rain: string;
  spray: string;
  "sun-core": string;
  sun: string;
  "moon-core": string;
  moon: string;
  horizon: string;
  water: string;
  "water-reflect": string;
  "water-reflect-warm": string;
  "water-reflect-cool": string;
  foam: string;
  "water-far": string;
  /* Painted scene background ramp (not glyph zones) */
  "bg-sky-top": string;
  "bg-sky-low": string;
  "bg-glow": string;
  "bg-moon-glow": string;
  "bg-cloud-light": string;
  "bg-cloud-shadow": string;
  "bg-water-top": string;
  "bg-water-deep": string;
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

const ZONE_VARIABLES: Record<AsciiCell["zone"], string> = {
  star: "--color-horizon-star",
  sky: "--color-horizon-sky",
  "sky-glow": "--color-horizon-sky-glow",
  "cloud-light": "--color-horizon-cloud-light",
  "cloud-shadow": "--color-horizon-cloud-shadow",
  rain: "--color-horizon-rain",
  spray: "--color-horizon-spray",
  "sun-core": "--color-horizon-sun-core",
  sun: "--color-horizon-sun",
  "moon-core": "--color-horizon-moon-core",
  moon: "--color-horizon-moon",
  horizon: "--color-horizon-horizon",
  water: "--color-horizon-water",
  "water-reflect": "--color-horizon-water-reflect",
  "water-reflect-warm": "--color-horizon-water-reflect-warm",
  "water-reflect-cool": "--color-horizon-water-reflect-cool",
  foam: "--color-horizon-foam",
  "water-far": "--color-horizon-water-far",
};

const BACKGROUND_VARIABLES = {
  "bg-sky-top": "--color-horizon-bg-sky-top",
  "bg-sky-low": "--color-horizon-bg-sky-low",
  "bg-glow": "--color-horizon-bg-glow",
  "bg-moon-glow": "--color-horizon-bg-moon-glow",
  "bg-cloud-light": "--color-horizon-bg-cloud-light",
  "bg-cloud-shadow": "--color-horizon-bg-cloud-shadow",
  "bg-water-top": "--color-horizon-bg-water-top",
  "bg-water-deep": "--color-horizon-bg-water-deep",
} as const;

export function encodeRuns(grid: AsciiCell[][]): AsciiRun[][] {
  return grid.map((row) => {
    const runs: AsciiRun[] = [];
    let current: AsciiRun = { chars: "", zone: row[0].zone, twinkleDelay: row[0].twinkleDelay };

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
    "sky-glow": styles.getPropertyValue(ZONE_VARIABLES["sky-glow"]).trim(),
    "cloud-light": styles.getPropertyValue(ZONE_VARIABLES["cloud-light"]).trim(),
    "cloud-shadow": styles.getPropertyValue(ZONE_VARIABLES["cloud-shadow"]).trim(),
    rain: styles.getPropertyValue(ZONE_VARIABLES.rain).trim(),
    spray: styles.getPropertyValue(ZONE_VARIABLES.spray).trim(),
    "sun-core": styles.getPropertyValue(ZONE_VARIABLES["sun-core"]).trim(),
    sun: styles.getPropertyValue(ZONE_VARIABLES.sun).trim(),
    "moon-core": styles.getPropertyValue(ZONE_VARIABLES["moon-core"]).trim(),
    moon: styles.getPropertyValue(ZONE_VARIABLES.moon).trim(),
    horizon: styles.getPropertyValue(ZONE_VARIABLES.horizon).trim(),
    water: styles.getPropertyValue(ZONE_VARIABLES.water).trim(),
    "water-reflect": styles.getPropertyValue(ZONE_VARIABLES["water-reflect"]).trim(),
    "water-reflect-warm": styles.getPropertyValue(ZONE_VARIABLES["water-reflect-warm"]).trim(),
    "water-reflect-cool": styles.getPropertyValue(ZONE_VARIABLES["water-reflect-cool"]).trim(),
    foam: styles.getPropertyValue(ZONE_VARIABLES.foam).trim(),
    "water-far": styles.getPropertyValue(ZONE_VARIABLES["water-far"]).trim(),
    "bg-sky-top": styles.getPropertyValue(BACKGROUND_VARIABLES["bg-sky-top"]).trim(),
    "bg-sky-low": styles.getPropertyValue(BACKGROUND_VARIABLES["bg-sky-low"]).trim(),
    "bg-glow": styles.getPropertyValue(BACKGROUND_VARIABLES["bg-glow"]).trim(),
    "bg-moon-glow": styles.getPropertyValue(BACKGROUND_VARIABLES["bg-moon-glow"]).trim(),
    "bg-cloud-light": styles.getPropertyValue(BACKGROUND_VARIABLES["bg-cloud-light"]).trim(),
    "bg-cloud-shadow": styles.getPropertyValue(BACKGROUND_VARIABLES["bg-cloud-shadow"]).trim(),
    "bg-water-top": styles.getPropertyValue(BACKGROUND_VARIABLES["bg-water-top"]).trim(),
    "bg-water-deep": styles.getPropertyValue(BACKGROUND_VARIABLES["bg-water-deep"]).trim(),
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
    cssHeight: Math.ceil(config.height * lineHeightPx),
  };
}
