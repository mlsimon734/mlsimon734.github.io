/**
 * Braille discs for the sun and moon.
 *
 * Each Unicode Braille character (U+2800–U+28FF) encodes a 2×4 dot grid, so a
 * disc drawn dot by dot keeps a clean round edge at twice the column and four
 * times the row resolution of the character grid.
 *
 * Braille bit layout (column-major):
 *   ⠁ = dot 1  (0,0)    ⠈ = dot 4  (1,0)
 *   ⠂ = dot 2  (0,1)    ⠐ = dot 5  (1,1)
 *   ⠄ = dot 3  (0,2)    ⠠ = dot 6  (1,2)
 *   ⡀ = dot 7  (0,3)    ⢀ = dot 8  (1,3)
 */

const BRAILLE_BITS = [
  [0, 1, 2, 6],
  [3, 4, 5, 7],
] as const;

export interface Disc {
  /** Center in character columns and rows. */
  col: number;
  row: number;
  /** Radii in columns and rows. */
  radiusCols: number;
  radiusRows: number;
  /** Dots at or below this row (the horizon) are hidden. */
  clipRow: number;
  /** Lunar phase 0–1 for a terminator, or undefined for a full disc. */
  phase?: number;
}

export interface DiscCell {
  /** Braille glyph of the dots inside the disc's lit part. */
  lit: string;
  /** Braille glyph of the dots on the unlit side (earthshine). */
  shade: string;
  /** Share of the cell's eight dots that are lit. */
  coverage: number;
  /** Normalized distance of the cell center from the disc center. */
  radius: number;
}

/** Calls `dot` with each raised dot's column (0–1) and row (0–3) in a braille glyph. */
export function forEachBrailleDot(char: string, dot: (dx: number, dy: number) => void) {
  const bits = char.charCodeAt(0) - 0x2800;
  if (bits <= 0 || bits > 0xff) return;
  for (let dx = 0; dx < 2; dx++) {
    for (let dy = 0; dy < 4; dy++) {
      if (bits & (1 << BRAILLE_BITS[dx][dy])) dot(dx, dy);
    }
  }
}

function brailleChar(bits: number): string {
  // An empty pattern becomes a plain space; U+2800 renders zero-width in some fonts.
  return bits === 0 ? " " : String.fromCodePoint(0x2800 + bits);
}

/** The disc's dots inside one character cell, or null if the cell misses the disc. */
export function discCell(disc: Disc, cellX: number, cellY: number): DiscCell | null {
  let litBits = 0;
  let shadeBits = 0;
  let litDots = 0;
  const waxing = (disc.phase ?? 0.5) < 0.5;
  const terminator = Math.cos((disc.phase ?? 0.5) * 2 * Math.PI);

  for (let dx = 0; dx < 2; dx++) {
    for (let dy = 0; dy < 4; dy++) {
      const y = cellY + (dy + 0.5) / 4;
      if (y >= disc.clipRow) continue;
      const nx = (cellX + (dx + 0.5) / 2 - disc.col) / disc.radiusCols;
      const ny = (y - disc.row) / disc.radiusRows;
      if (nx * nx + ny * ny > 1) continue;

      // The terminator is an ellipse whose half-width follows the phase.
      const limit = terminator * Math.sqrt(1 - ny * ny);
      const lit = disc.phase == null || (waxing ? nx >= limit : nx <= -limit);
      if (lit) {
        litBits |= 1 << BRAILLE_BITS[dx][dy];
        litDots++;
      } else shadeBits |= 1 << BRAILLE_BITS[dx][dy];
    }
  }

  if (litBits === 0 && shadeBits === 0) return null;
  const nx = (cellX + 0.5 - disc.col) / disc.radiusCols;
  const ny = (cellY + 0.5 - disc.row) / disc.radiusRows;
  return {
    lit: brailleChar(litBits),
    shade: brailleChar(shadeBits),
    coverage: litDots / 8,
    radius: Math.sqrt(nx * nx + ny * ny),
  };
}
