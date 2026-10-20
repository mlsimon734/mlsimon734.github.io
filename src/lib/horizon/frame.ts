import type { Disc } from "./braille";
import type { GridConfig, SkyParams } from "./types";
import { DESKTOP_CONFIG } from "./types";

/** The horizon sits at this fraction of the frame height (see `positionOnSky`). */
export const HORIZON = 0.65;

/** Character cells are this many times taller than wide (11px JetBrains Mono, 1.15 leading). */
export const CELL_ASPECT = 1.92;

/** Glyph opacity steps; tones are quantised so neighbouring cells share a draw call. */
export const TONE_LEVELS = 6;

/**
 * The world's sky dome spans the full frame width at sunrise and sunset. The ASCII
 * frame shows it slightly zoomed out, so the setting sun stays whole and its path on
 * the water has room on both sides.
 */
const SKY_SPAN = 0.74;

/** Frame position of a body at world-dome x (0–1). */
export function frameX(x: number): number {
  return 0.5 + (x - 0.5) * SKY_SPAN;
}

/** First character row of the sea. */
export function horizonRow(config: GridConfig): number {
  return Math.floor(config.height * HORIZON);
}

export function quantizeTone(value: number): number {
  return Math.round(Math.max(0, Math.min(1, value)) * TONE_LEVELS) / TONE_LEVELS;
}

/**
 * Where a sun or moon at world position (x, y) lands on the grid, as a braille disc.
 * Elevation zero sits exactly on the horizon row, which clips the disc; the centre
 * snaps to a cell centre so the dots are symmetric; and the radius scales with the
 * grid so the phone frame keeps its proportions. Near the horizon, refraction
 * flattens the disc a little, as it does in the sky.
 */
export function placeBody(
  x: number,
  y: number,
  elevation: number,
  config: GridConfig,
  skyParams: SkyParams,
  phase?: number,
): Disc {
  const radiusRows = (skyParams.sunRadius * config.height) / DESKTOP_CONFIG.height;
  const flatten = 1 - 0.16 * (1 - Math.min(1, Math.max(0, elevation / 0.1)));
  const seaTop = horizonRow(config);
  return {
    col: Math.round(frameX(x) * config.width - 0.5) + 0.5,
    row: seaTop + (y - HORIZON) * config.height,
    radiusCols: radiusRows * CELL_ASPECT,
    radiusRows: radiusRows * flatten,
    clipRow: seaTop,
    phase,
  };
}
