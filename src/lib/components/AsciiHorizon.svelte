<script lang="ts">
  import {
    DEFAULT_WAVE_PARAMS,
    DEFAULT_SKY_PARAMS,
    type WaveParams,
    type SkyParams,
  } from "$lib/horizon";
  import AsciiHorizonWorkerCanvas from "./AsciiHorizonWorkerCanvas.svelte";
  import WaveControls from "./WaveControls.svelte";

  let waveParams: WaveParams = $state({ ...DEFAULT_WAVE_PARAMS });
  let skyParams: SkyParams = $state({ ...DEFAULT_SKY_PARAMS });
</script>

<div class="ascii-horizon-stack">
  <div class="horizon-card horizon-scene">
    <AsciiHorizonWorkerCanvas {waveParams} {skyParams} />
  </div>

  <WaveControls bind:params={waveParams} bind:skyParams />
</div>

<style>
  .ascii-horizon-stack {
    display: grid;
    gap: 0.85rem;
    margin-bottom: 2rem;
  }

  .horizon-card {
    background: var(--color-horizon-bg);
    border: 1px solid var(--color-theme-border);
    border-radius: 0.75rem;
    padding: 1.5rem 1rem;
    overflow: hidden;
    box-shadow: 0 1px 0 rgba(0, 0, 0, 0.04);
    transition: background-color 0.25s;
  }
</style>
