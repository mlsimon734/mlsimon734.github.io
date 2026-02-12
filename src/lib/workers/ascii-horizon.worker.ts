/// <reference lib="webworker" />

import { generateHorizon, type GridConfig, type SkyParams, type WaveParams } from "$lib/horizon";
import { encodeRuns, type MonoMetrics, type ZonePalette } from "$lib/horizon/render";

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

function render() {
  if (
    !state.ctx ||
    !state.config ||
    !state.metrics ||
    !state.palette ||
    !state.waveParams ||
    !state.skyParams
  ) {
    return;
  }

  const waterTime = getWaterTime(performance.now());
  const grid = generateHorizon(
    Date.now(),
    state.config,
    waterTime,
    state.waveParams,
    state.skyParams,
  );
  const runs = encodeRuns(grid);
  const { ctx } = state;

  ctx.clearRect(0, 0, state.metrics.cssWidth, state.metrics.cssHeight);
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
