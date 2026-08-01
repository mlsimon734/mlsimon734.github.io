/// <reference lib="webworker" />

import {
  generateHorizon,
  type GridConfig,
  type SkyParams,
  type WaveParams,
  type WeatherParams,
} from "$lib/horizon";
import { renderBackgroundPixels } from "$lib/horizon/background";
import { encodeRuns, type MonoMetrics, type ZonePalette } from "$lib/horizon/render";
import { computeWorldParams } from "$lib/horizon/world";
import type { WorldParams } from "$lib/horizon/types";

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
  waterTime: 0,
  animationStart: 0,
  timerId: null,
};

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

let bgTile: OffscreenCanvas | null = null;
let bgTileCtx: OffscreenCanvasRenderingContext2D | null = null;

/**
 * Paint the dithered scene wash: rendered at one pixel per character cell,
 * then scaled up without smoothing so the background shares the glyphs'
 * chunky grid resolution instead of a smooth gradient.
 */
function paintBackground(
  ctx: OffscreenCanvasRenderingContext2D,
  metrics: MonoMetrics,
  config: GridConfig,
  palette: ZonePalette,
  world: WorldParams,
  weatherParams: WeatherParams,
) {
  if (!bgTile || bgTile.width !== config.width || bgTile.height !== config.height) {
    bgTile = new OffscreenCanvas(config.width, config.height);
    bgTileCtx = bgTile.getContext("2d");
  }
  if (!bgTileCtx) return;

  const pixels = renderBackgroundPixels(config, palette, world, weatherParams);
  bgTileCtx.putImageData(new ImageData(pixels, config.width, config.height), 0, 0);

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(bgTile, 0, 0, metrics.cssWidth, metrics.cssHeight);
}

function render() {
  if (
    !state.ctx ||
    !state.config ||
    !state.metrics ||
    !state.palette ||
    !state.waveParams ||
    !state.skyParams ||
    !state.weatherParams
  ) {
    return;
  }

  const waterTime = getWaterTime(performance.now());
  const world = computeWorldParams(Date.now(), waterTime, state.skyParams);
  const grid = generateHorizon(
    Date.now(),
    state.config,
    waterTime,
    state.waveParams,
    state.skyParams,
    state.weatherParams,
  );
  const runs = encodeRuns(grid);
  const { ctx } = state;

  paintBackground(ctx, state.metrics, state.config, state.palette, world, state.weatherParams);
  ctx.font = state.metrics.font;
  ctx.textBaseline = "top";

  for (let rowIndex = 0; rowIndex < runs.length; rowIndex++) {
    let x = 0;
    const y = rowIndex * state.metrics.lineHeightPx;

    for (const run of runs[rowIndex]) {
      ctx.fillStyle = state.palette[run.zone];

      if (run.zone === "star") {
        const phase = (performance.now() / 1000 + (run.twinkleDelay ?? 0)) * (Math.PI / 2);
        ctx.globalAlpha = state.active ? 0.65 + 0.35 * ((Math.sin(phase) + 1) / 2) : 0.8;
      } else {
        ctx.globalAlpha = 1;
      }

      ctx.fillText(run.chars, x, y);
      x += run.chars.length * state.metrics.charWidth;
    }
  }

  ctx.globalAlpha = 1;
  state.waterTime = waterTime;
}

function syncState(message: SyncMessage) {
  const currentWaterTime = getWaterTime(performance.now());

  state.config = message.config;
  state.dpr = message.dpr;
  state.metrics = message.metrics;
  state.palette = message.palette;
  state.waveParams = message.waveParams;
  state.skyParams = message.skyParams;
  state.weatherParams = message.weatherParams;
  state.reducedMotion = message.reducedMotion;
  state.waterTime = state.reducedMotion ? 0 : currentWaterTime;

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
