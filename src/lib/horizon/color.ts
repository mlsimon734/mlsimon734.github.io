import type { WorldParams } from "./types";
import { smoothstep } from "./atmosphere";

export type Rgb = readonly [number, number, number];

/** Parse a #rgb or #rrggbb token; the horizon palette is authored in hex. */
export function hexToRgb(hex: string): Rgb {
  const clean = hex.trim().replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : clean;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

export function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function rgbString(rgb: Rgb): string {
  return `rgb(${Math.round(rgb[0])} ${Math.round(rgb[1])} ${Math.round(rgb[2])})`;
}

/**
 * How reddened the sunlight is: 1 with the sun on the horizon, easing to 0 by about
 * 30° as its path through the atmosphere shortens.
 */
export function sunWarmth(world: Pick<WorldParams, "sunElevation">): number {
  return 1 - smoothstep(0.02, 0.5, world.sunElevation);
}
