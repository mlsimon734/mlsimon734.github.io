<script lang="ts">
	import { onMount } from 'svelte';
	import {
		DEFAULT_WAVE_PARAMS,
		DEFAULT_SKY_PARAMS,
		type WaveParams,
		type SkyParams
	} from '$lib/horizon';
	import AsciiHorizonDom from './AsciiHorizonDom.svelte';
	import AsciiHorizonWorkerCanvas from './AsciiHorizonWorkerCanvas.svelte';
	import AsciiHorizonWebGL from './AsciiHorizonWebGL.svelte';
	import WaveControls from './WaveControls.svelte';

	type RendererMode = 'worker' | 'webgl' | 'dom';

	const MODES: { id: RendererMode; label: string; desc: string }[] = [
		{
			id: 'worker',
			label: 'Worker Canvas',
			desc: 'Current ASCII horizon rendered off the main thread with OffscreenCanvas.'
		},
		{
			id: 'webgl',
			label: 'WebGL Shader',
			desc: 'GPU shader version that approximates the scene with an ASCII glyph atlas.'
		},
		{
			id: 'dom',
			label: 'DOM Baseline',
			desc: 'The original DOM text renderer for comparison.'
		}
	];

	let mode = $state<RendererMode>('worker');
	let showRendererTools = $state(false);
	let waveParams: WaveParams = $state({ ...DEFAULT_WAVE_PARAMS });
	let skyParams: SkyParams = $state({ ...DEFAULT_SKY_PARAMS });

	const activeMode = $derived(MODES.find((candidate) => candidate.id === mode) ?? MODES[0]);

	onMount(() => {
		const params = new URLSearchParams(window.location.search);
		const queryMode = params.get('renderer');
		showRendererTools = params.get('rendererTools') === '1' || queryMode != null;

		if (
			(queryMode === 'worker' || queryMode === 'webgl' || queryMode === 'dom') &&
			queryMode !== mode
		) {
			mode = queryMode;
		}
	});
</script>

<div class="ascii-horizon-stack">
	{#if showRendererTools}
		<div class="renderer-switcher">
			<div class="switcher-label">
				<span class="comment-prefix">//</span> renderer
			</div>
			<div class="switcher-buttons" role="tablist" aria-label="Horizon renderer">
				{#each MODES as candidate}
					<button
						type="button"
						role="tab"
						class="mode-button"
						class:active={candidate.id === mode}
						aria-selected={candidate.id === mode}
						onclick={() => (mode = candidate.id)}
					>
						{candidate.label}
					</button>
				{/each}
			</div>
			<p class="mode-description">{activeMode.desc}</p>
		</div>
	{/if}

	<div class="horizon-card">
		{#if mode === 'worker'}
			<AsciiHorizonWorkerCanvas {waveParams} {skyParams} />
		{:else if mode === 'webgl'}
			<AsciiHorizonWebGL {waveParams} {skyParams} />
		{:else}
			<AsciiHorizonDom {waveParams} {skyParams} />
		{/if}
	</div>

	<WaveControls bind:params={waveParams} bind:skyParams={skyParams} />
</div>

<style>
	.ascii-horizon-stack {
		display: grid;
		gap: 0.85rem;
		margin-bottom: 2rem;
	}

	.horizon-card {
		background: #08111d;
		border-radius: 0.75rem;
		padding: 1.5rem 1rem;
		overflow: hidden;
		box-shadow: 0 1px 0 rgba(0, 0, 0, 0.04);
	}

	.renderer-switcher {
		display: grid;
		gap: 0.4rem;
		text-align: center;
	}

	.switcher-label {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		color: var(--color-theme-subtle);
		text-transform: lowercase;
	}

	.switcher-buttons {
		display: flex;
		justify-content: center;
		flex-wrap: wrap;
		gap: 0.45rem;
	}

	.mode-button {
		border: 1px solid var(--color-theme-border);
		border-radius: 999px;
		padding: 0.35rem 0.7rem;
		background: color-mix(in srgb, var(--color-theme-surface) 85%, transparent);
		color: var(--color-theme-muted);
		font: inherit;
		font-size: 0.8rem;
		cursor: pointer;
		transition: color 0.2s, border-color 0.2s, background-color 0.2s;
	}

	.mode-button:hover {
		color: var(--color-theme-heading);
		border-color: var(--color-sunset-amber-400);
	}

	.mode-button.active {
		color: var(--color-theme-heading);
		border-color: var(--color-sunset-amber-400);
		background: var(--color-theme-hover);
	}

	.mode-description {
		margin: 0;
		font-size: 0.8rem;
		color: var(--color-theme-subtle);
	}

	.comment-prefix {
		color: var(--color-sunset-amber-400);
	}
</style>
