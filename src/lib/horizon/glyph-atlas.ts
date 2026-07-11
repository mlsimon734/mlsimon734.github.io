export interface GlyphAtlasOptions {
  cellSize?: number;
  fontSize?: number;
  fontFamily?: string;
}

const DEFAULT_OPTIONS: Required<GlyphAtlasOptions> = {
  cellSize: 64,
  fontSize: 54,
  fontFamily: '"JetBrains Mono", ui-monospace, monospace',
};

export function createGlyphAtlas(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  glyphs: readonly string[],
  options: GlyphAtlasOptions = {},
): WebGLTexture {
  const { cellSize, fontSize, fontFamily } = { ...DEFAULT_OPTIONS, ...options };

  const glyphCanvas = document.createElement("canvas");
  glyphCanvas.width = glyphs.length * cellSize;
  glyphCanvas.height = cellSize;

  const ctx = glyphCanvas.getContext("2d");
  if (!ctx) {
    throw new Error("Unable to create glyph atlas");
  }

  ctx.clearRect(0, 0, glyphCanvas.width, glyphCanvas.height);
  ctx.fillStyle = "#ffffff";
  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let index = 0; index < glyphs.length; index++) {
    ctx.fillText(glyphs[index], index * cellSize + cellSize / 2, cellSize / 2 + 2);
  }

  const texture = gl.createTexture();
  if (!texture) {
    throw new Error("Unable to create glyph atlas texture");
  }

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, glyphCanvas);

  return texture;
}

export function measureCharWidth(font: string): number {
  const probe = document.createElement("canvas");
  const ctx = probe.getContext("2d");
  if (!ctx) return 6.6;
  ctx.font = font;
  return ctx.measureText("M").width;
}

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
