/// <reference lib="webworker" />

import {
  generateHorizon,
  type AsciiCell,
  type GridConfig,
  type SkyParams,
  type WaveParams,
  type WeatherParams,
} from "#lib/horizon/index.js";
import { renderBackgroundPixels } from "#lib/horizon/background.js";
import {
  encodeRuns,
  sceneColors,
  toneGain,
  type MonoMetrics,
  type ZonePalette,
} from "#lib/horizon/render.js";
import {
  sampleAtmosphereGrid,
  startDrift,
  steerDrift,
  type AtmosphereSample,
  type CloudDrift,
} from "#lib/horizon/atmosphere.js";
import { forEachBrailleDot } from "#lib/horizon/braille.js";
import { horizonRow } from "#lib/horizon/frame.js";
import { computeWorldParams } from "#lib/horizon/world.js";
import type { WorldParams } from "#lib/horizon/types.js";

interface InitMessage {
  type: "init";
  canvas: OffscreenCanvas;
}

interface SyncMessage {
  type: "sync";
  config: GridConfig;
  dpr: number;
  metrics: MonoMetrics;
  palette: ZonePalette;
  reducedMotion: boolean;
  active: boolean;
  waveParams: WaveParams;
  skyParams: SkyParams;
  weatherParams: WeatherParams;
}

type WorkerMessage = InitMessage | SyncMessage;

interface WorkerState {
  canvas: OffscreenCanvas | null;
  ctx: OffscreenCanvasRenderingContext2D | null;
  config: GridConfig | null;
  dpr: number;
  metrics: MonoMetrics | null;
  palette: ZonePalette | null;
  reducedMotion: boolean;
  active: boolean;
  waveParams: WaveParams | null;
  skyParams: SkyParams | null;
  weatherParams: WeatherParams | null;
  drift: CloudDrift | null;
  waterTime: number;
  animationStart: number;
  timerId: number | null;
}

const FRAME_INTERVAL_MS = 1000 / 12;

const state: WorkerState = {
  canvas: null,
  ctx: null,
  config: null,
  dpr: 1,
  metrics: null,
  palette: null,
  reducedMotion: false,
  active: false,
  waveParams: null,
  skyParams: null,
  weatherParams: null,
  drift: null,
  waterTime: 0,
  animationStart: 0,
  timerId: null,
};

// Workers can't see the page's web fonts, so the glyphs load their own subset of
// JetBrains Mono. Nothing draws until it settles, so the scene never changes typeface
// in view; if it fails, the system monospace stands in.
const glyphFont = new FontFace("JetBrains Mono", 'url("/fonts/jetbrains-mono-horizon.woff2")');
self.fonts.add(glyphFont);
let fontSettled = false;
const settleFont = () => {
  fontSettled = true;
  render();
};
void glyphFont.load().then(settleFont, settleFont);

function getWaterTime(now: number): number {
  if (state.reducedMotion) {
    return 0;
  }

  if (!state.active || !state.waveParams) {
    return state.waterTime;
  }

  const speed = Math.max(state.waveParams.speed, 0.001);
  return ((now - state.animationStart) / 1000) * speed;
}

function stopLoop() {
  if (state.timerId != null) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
}

function startLoop() {
  stopLoop();
  state.timerId = self.setInterval(() => {
    render();
  }, FRAME_INTERVAL_MS);
}

function resizeCanvas() {
  if (!state.canvas || !state.metrics || !state.ctx) return;

  state.canvas.width = Math.max(1, Math.round(state.metrics.cssWidth * state.dpr));
  state.canvas.height = Math.max(1, Math.round(state.metrics.cssHeight * state.dpr));
  state.ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  state.ctx.font = state.metrics.font;
  state.ctx.textBaseline = "top";
}

// Clouds move slowly; they are sampled at steps of scene time and held between frames.
function cloudTime(waterTime: number): number {
  return Math.floor(waterTime * 12) / 12;
}

let atmosphereTime = -Infinity;
let atmosphereGrid: AtmosphereSample[] = [];
let skyTile: OffscreenCanvas | null = null;
let seaTile: OffscreenCanvas | null = null;

function tile(current: OffscreenCanvas | null, width: number, height: number): OffscreenCanvas {
  return current && current.width === width && current.height === height
    ? current
    : new OffscreenCanvas(width, height);
}

/**
 * Paint the scene wash: rendered at one pixel per character cell and scaled up
 * smoothly. Sky and sea are separate tiles so filtering never blurs the horizon.
 */
function paintBackground(
  ctx: OffscreenCanvasRenderingContext2D,
  metrics: MonoMetrics,
  config: GridConfig,
  palette: ZonePalette,
  world: WorldParams,
  weatherParams: WeatherParams,
  skyParams: SkyParams,
) {
  const seaTop = horizonRow(config);
  const pixels = new ImageData(
    renderBackgroundPixels(config, palette, world, weatherParams, atmosphereGrid, skyParams),
    config.width,
    config.height,
  );
  skyTile = tile(skyTile, config.width, seaTop);
  seaTile = tile(seaTile, config.width, config.height - seaTop);
  skyTile.getContext("2d")?.putImageData(pixels, 0, 0);
  seaTile.getContext("2d")?.putImageData(pixels, 0, -seaTop);

  const horizonY = seaTop * metrics.lineHeightPx;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(skyTile, 0, 0, metrics.cssWidth, horizonY);
  ctx.drawImage(seaTile, 0, horizonY, metrics.cssWidth, metrics.cssHeight - horizonY);
}

const DISC_ZONES = new Set<AsciiCell["zone"]>(["sun-core", "sun", "moon-core", "moon"]);

/**
 * Draw a run of braille as dots at their exact sub-cell positions. Braille comes
 * from whatever system font has it, with its own spacing; drawing the dots keeps
 * the sun and moon round on every platform.
 */
function drawDots(
  ctx: OffscreenCanvasRenderingContext2D,
  chars: string,
  x: number,
  y: number,
  metrics: MonoMetrics,
) {
  const pitchX = metrics.charWidth / 2;
  const pitchY = metrics.lineHeightPx / 4;
  const radius = Math.min(pitchX, pitchY) * 0.36;
  ctx.beginPath();
  for (let i = 0; i < chars.length; i++) {
    const left = x + i * metrics.charWidth;
    forEachBrailleDot(chars[i], (dx, dy) => {
      const cx = left + (dx + 0.5) * pitchX;
      const cy = y + (dy + 0.5) * pitchY;
      ctx.moveTo(cx + radius, cy);
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    });
  }
  ctx.fill();
}

function render() {
  if (
    !fontSettled ||
    !state.ctx ||
    !state.config ||
    !state.metrics ||
    !state.palette ||
    !state.waveParams ||
    !state.skyParams ||
    !state.weatherParams ||
    !state.drift
  ) {
    return;
  }

  const waterTime = getWaterTime(performance.now());
  const now = Date.now();
  const world = computeWorldParams(now, waterTime, state.skyParams);
  const nextAtmosphereTime = cloudTime(waterTime);
  if (nextAtmosphereTime !== atmosphereTime) {
    atmosphereTime = nextAtmosphereTime;
    atmosphereGrid = sampleAtmosphereGrid(
      state.config,
      atmosphereTime,
      state.weatherParams,
      state.drift,
    );
  }
  const grid = generateHorizon(
    now,
    state.config,
    waterTime,
    state.waveParams,
    state.skyParams,
    state.weatherParams,
    world,
    atmosphereGrid,
  );
  const runs = encodeRuns(grid);
  const colors = sceneColors(state.palette, world);
  const gain = toneGain(state.palette);
  const { ctx } = state;

  paintBackground(
    ctx,
    state.metrics,
    state.config,
    state.palette,
    world,
    state.weatherParams,
    state.skyParams,
  );
  ctx.font = state.metrics.font;
  ctx.textBaseline = "top";

  for (let rowIndex = 0; rowIndex < runs.length; rowIndex++) {
    let x = 0;
    const y = rowIndex * state.metrics.lineHeightPx;

    for (const run of runs[rowIndex]) {
      const advance = run.chars.length * state.metrics.charWidth;
      // Only blank cells carry the sky zone; the wash already paints them.
      if (run.zone === "sky") {
        x += advance;
        continue;
      }
      ctx.fillStyle = colors[run.zone];

      if (run.zone === "star") {
        // A slow breath, staggered per star; held still while paused.
        const phase = (performance.now() / 1000 + (run.twinkleDelay ?? 0)) * (Math.PI / 3);
        const breath = state.active ? 0.7 + 0.3 * ((Math.sin(phase) + 1) / 2) : 0.85;
        ctx.globalAlpha = Math.min(1, run.tone * gain * breath);
      } else {
        ctx.globalAlpha = Math.min(1, run.tone * gain);
      }

      if (DISC_ZONES.has(run.zone)) drawDots(ctx, run.chars, x, y, state.metrics);
      else ctx.fillText(run.chars, x, y);
      x += advance;
    }
  }

  ctx.globalAlpha = 1;
  state.waterTime = waterTime;
}

function syncState(message: SyncMessage) {
  const currentWaterTime = getWaterTime(performance.now());

  atmosphereTime = -Infinity;
  state.config = message.config;
  state.dpr = message.dpr;
  state.metrics = message.metrics;
  state.palette = message.palette;
  state.waveParams = message.waveParams;
  state.skyParams = message.skyParams;
  state.weatherParams = message.weatherParams;
  state.reducedMotion = message.reducedMotion;
  state.waterTime = state.reducedMotion ? 0 : currentWaterTime;
  // A new wind turns the clouds from where they are drawn instead of jumping them.
  state.drift = state.drift
    ? steerDrift(state.drift, message.weatherParams, cloudTime(state.waterTime))
    : startDrift(message.weatherParams, message.waveParams.speed);

  if (message.active && !state.reducedMotion) {
    const speed = Math.max(message.waveParams.speed, 0.001);
    state.animationStart = performance.now() - (state.waterTime / speed) * 1000;
    state.active = true;
    startLoop();
  } else {
    state.active = false;
    stopLoop();
  }

  resizeCanvas();
  render();
}

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;

  if (message.type === "init") {
    state.canvas = message.canvas;
    state.ctx = state.canvas.getContext("2d", { alpha: true });
    if (!state.ctx) {
      throw new Error("OffscreenCanvas 2D context is unavailable");
    }
    return;
  }

  syncState(message);
};
