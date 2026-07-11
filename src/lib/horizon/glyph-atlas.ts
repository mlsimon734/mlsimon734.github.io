/**
 * Resolve any CSS color string to normalized RGB via a canvas round-trip.
 * (Remnant of the retired WebGL glyph-atlas renderer; kept for the
 * particles sketch, which drives shader uniforms from CSS custom props.)
 */
export function parseCssColor(color: string): [number, number, number] {
  const probe = document.createElement("canvas");
  const ctx = probe.getContext("2d");
  if (!ctx) return [1, 1, 1];
  ctx.fillStyle = color;
  const normalized = ctx.fillStyle.toString();

  if (normalized.startsWith("#")) {
    const hex = normalized.slice(1);
    const full =
      hex.length === 3
        ? hex
            .split("")
            .map((ch) => ch + ch)
            .join("")
        : hex;
    return [
      parseInt(full.slice(0, 2), 16) / 255,
      parseInt(full.slice(2, 4), 16) / 255,
      parseInt(full.slice(4, 6), 16) / 255,
    ];
  }

  const parts = normalized.match(/[\d.]+/g)?.map(Number) ?? [255, 255, 255];
  return [(parts[0] ?? 255) / 255, (parts[1] ?? 255) / 255, (parts[2] ?? 255) / 255];
}
