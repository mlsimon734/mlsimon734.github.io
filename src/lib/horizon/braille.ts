/**
 * Braille dot-matrix packing.
 *
 * Each Unicode Braille character (U+2800–U+28FF) encodes a 2×4 sub-pixel dot grid,
 * giving 8× the visual resolution of single-character rendering.
 *
 * Braille bit layout (column-major):
 *   ⡀ = dot 7  (0,3)    ⢀ = dot 8  (1,3)
 *   ⠄ = dot 3  (0,2)    ⠠ = dot 6  (1,2)
 *   ⠂ = dot 2  (0,1)    ⠐ = dot 5  (1,1)
 *   ⠁ = dot 1  (0,0)    ⠈ = dot 4  (1,0)
 */

import type { IntBuffer } from "@thi.ng/pixel";
import type { GridConfig } from "./types";

// Bit positions for each (dx, dy) within a 2×4 Braille cell
// dx=0 (left column): dots 1,2,3,7 → bits 0,1,2,6
// dx=1 (right column): dots 4,5,6,8 → bits 3,4,5,7
const BRAILLE_BITS: number[][] = [
  [0, 1, 2, 6], // dx=0: rows 0–3
  [3, 4, 5, 7], //  dx=1: rows 0–3
];

export interface BrailleCell {
  char: string;
  litCount: number;
}

// Bayer 2×4 ordered dithering thresholds (scaled 0–255)
// Produces smooth tonal gradients without the "worm" artifacts of error-diffusion
const BAYER_2x4: number[][] = [
  [32, 160],
  [96, 224],
  [48, 176],
  [112, 240],
];

export function packBrailleOrdered(original: IntBuffer, config: GridConfig): BrailleCell[][] {
  const { width, height, subWidth, subHeight } = config;
  const data = original.data;
  const grid: BrailleCell[][] = [];

  for (let cy = 0; cy < height; cy++) {
    const row: BrailleCell[] = [];
    for (let cx = 0; cx < width; cx++) {
      let bits = 0;
      let litCount = 0;

      for (let dx = 0; dx < 2; dx++) {
        for (let dy = 0; dy < 4; dy++) {
          const sx = cx * 2 + dx;
          const sy = cy * 4 + dy;
          if (sx < subWidth && sy < subHeight) {
            const val = data[sy * subWidth + sx];
            if (val > BAYER_2x4[dy][dx]) {
              bits |= 1 << BRAILLE_BITS[dx][dy];
              litCount++;
            }
          }
        }
      }

      const char = bits === 0 ? " " : String.fromCodePoint(0x2800 + bits);
      row.push({ char, litCount });
    }
    grid.push(row);
  }

  return grid;
}

export function packBraille(dithered: IntBuffer, config: GridConfig): BrailleCell[][] {
  const { width, height, subWidth, subHeight } = config;
  const data = dithered.data;
  const grid: BrailleCell[][] = [];

  for (let cy = 0; cy < height; cy++) {
    const row: BrailleCell[] = [];
    for (let cx = 0; cx < width; cx++) {
      let bits = 0;
      let litCount = 0;

      for (let dx = 0; dx < 2; dx++) {
        for (let dy = 0; dy < 4; dy++) {
          const sx = cx * 2 + dx;
          const sy = cy * 4 + dy;
          if (sx < subWidth && sy < subHeight) {
            const val = data[sy * subWidth + sx];
            if (val > 127) {
              bits |= 1 << BRAILLE_BITS[dx][dy];
              litCount++;
            }
          }
        }
      }

      // Empty cell → regular space (U+2800 renders as zero-width in some fonts)
      const char = bits === 0 ? " " : String.fromCodePoint(0x2800 + bits);
      row.push({ char, litCount });
    }
    grid.push(row);
  }

  return grid;
}
