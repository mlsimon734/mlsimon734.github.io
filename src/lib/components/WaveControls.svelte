<script lang="ts">
	import { slide } from 'svelte/transition';
	import { DEFAULT_WAVE_PARAMS, DEFAULT_SKY_PARAMS, type WaveParams, type SkyParams } from '$lib/horizon';
	import { getLosAngelesHours } from '$lib/horizon/world';

	let {
		params = $bindable(),
		skyParams = $bindable()
	}: { params: WaveParams; skyParams: SkyParams } = $props();
	let open = $state(false);
	let reducedMotion = $state(false);
	let currentLaTime = $state(getLosAngelesHours());

	const sceneTime = $derived(wrapHours(currentLaTime + skyParams.timeOffset));

	$effect(() => {
		const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
		reducedMotion = mql.matches;
		const handler = (e: MediaQueryListEvent) => (reducedMotion = e.matches);
		mql.addEventListener('change', handler);
		return () => mql.removeEventListener('change', handler);
	});

	$effect(() => {
		const id = setInterval(() => {
			currentLaTime = getLosAngelesHours();
		}, 60_000);
		return () => clearInterval(id);
	});

	function wrapHours(hours: number): number {
		return ((hours % 24) + 24) % 24;
	}

	function formatClock(hours: number): string {
		const totalMinutes = Math.round(wrapHours(hours) * 60) % (24 * 60);
		const h = Math.floor(totalMinutes / 60);
		const m = totalMinutes % 60;
		return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
	}

	function setSceneTime(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const targetTime = Number(input.value);
		skyParams.timeOffset = targetTime - currentLaTime;
	}

	function reset() {
		params = { ...DEFAULT_WAVE_PARAMS };
		skyParams = { ...DEFAULT_SKY_PARAMS };
	}
</script>

<div class="wave-controls font-mono">
	<button
		class="toggle"
		onclick={() => (open = !open)}
		aria-expanded={open}
	>
		<span class="comment-prefix">//</span> math {open ? '▴' : '▾'}
	</button>

	{#if open}
		<div
			class="panel"
			transition:slide={{ duration: reducedMotion ? 0 : 200 }}
		>
			<div class="section-title"><span class="comment-prefix">//</span> atmosphere</div>
			<div class="equation">
				<p class="eq-line">
					<em>E</em>(<em>t</em>) = sin(2&#960;((<em>t</em> - 6) / 24))
				</p>
				<p class="eq-detail">
					Sun Elevation Model
				</p>
			</div>
			<div class="sliders">
				<label class="slider-row">
					<span class="slider-label">Time <span class="slider-value">{formatClock(sceneTime)}</span></span>
					<input
						type="range"
						min="0"
						max="23.75"
						step="0.25"
						value={sceneTime}
						oninput={setSceneTime}
					/>
				</label>
				<label class="slider-row">
					<span class="slider-label">Glow <span class="slider-value">{skyParams.glowStrength.toFixed(1)}</span></span>
					<input
						type="range"
						min="0"
						max="3"
						step="0.1"
						bind:value={skyParams.glowStrength}
					/>
				</label>
				<label class="slider-row">
					<span class="slider-label">Sun R. <span class="slider-value">{skyParams.sunRadius.toFixed(1)}</span></span>
					<input
						type="range"
						min="1"
						max="8"
						step="0.5"
						bind:value={skyParams.sunRadius}
					/>
				</label>
			</div>

			<div class="section-title" style="margin-top: 1rem;"><span class="comment-prefix">//</span> ocean surface</div>
			<div class="equation">
				<p class="eq-line">
					<em>h</em>(<em>u</em>, <em>v</em>, <em>t</em>)
					= <em>S</em>(<em>u</em>, <em>v</em>, <em>t</em>)
					+ <em>v</em><sup>1.2</sup><em>C</em>(<em>u</em>, <em>v</em>, <em>t</em>)
				</p>
				<p class="eq-detail">
					Two-band directional wave synthesis:
					slow swell + foreground chop
				</p>
				<p class="eq-detail">
					Reflection uses local slope alignment, not wave height
				</p>
			</div>

			<div class="sliders">
				<label class="slider-row">
					<span class="slider-label">Swell <span class="slider-value">{params.swellScale.toFixed(0)}</span></span>
					<input
						type="range"
						min="8"
						max="40"
						step="1"
						bind:value={params.swellScale}
					/>
				</label>

				<label class="slider-row">
					<span class="slider-label">Chop <span class="slider-value">{params.chopScale.toFixed(0)}</span></span>
					<input
						type="range"
						min="4"
						max="24"
						step="1"
						bind:value={params.chopScale}
					/>
				</label>

				<label class="slider-row">
					<span class="slider-label">Crest <span class="slider-value">{params.crestSharpness.toFixed(2)}</span></span>
					<input
						type="range"
						min="0.4"
						max="2.5"
						step="0.01"
						bind:value={params.crestSharpness}
					/>
				</label>

				<label class="slider-row">
					<span class="slider-label">Reflect <span class="slider-value">{params.reflectionSharpness.toFixed(2)}</span></span>
					<input
						type="range"
						min="1.2"
						max="4.5"
						step="0.05"
						bind:value={params.reflectionSharpness}
					/>
				</label>

				<label class="slider-row">
					<span class="slider-label">Speed <span class="slider-value">{params.speed.toFixed(2)}x</span></span>
					<input
						type="range"
						min="0.2"
						max="2"
						step="0.05"
						bind:value={params.speed}
					/>
				</label>
			</div>

			<button class="reset" onclick={reset}>
				<span class="comment-prefix">//</span> reset defaults
			</button>
		</div>
	{/if}
</div>

<style>
	.wave-controls {
		margin-top: 0.5rem;
		text-align: center;
	}

	.toggle {
		display: block;
		margin: 0 auto;
		background: none;
		border: none;
		color: var(--color-warm-400);
		font-family: var(--font-mono);
		font-size: 0.75rem;
		cursor: pointer;
		padding: 0.25rem 0.5rem;
		transition: color 0.2s;
	}

	.toggle:hover {
		color: var(--color-warm-300);
	}

	.comment-prefix {
		color: var(--color-sunset-amber-400);
	}

	.panel {
		text-align: left;
		padding: 0.75rem 1rem;
		max-width: 22rem;
		margin: 0 auto;
	}

	.section-title {
		color: var(--color-warm-300);
		font-size: 0.7rem;
		margin-bottom: 0.5rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.equation {
		margin-bottom: 0.75rem;
		border-bottom: 1px solid var(--color-warm-700);
		padding-bottom: 0.75rem;
	}

	.equation em {
		font-family: var(--font-serif);
		font-style: italic;
		letter-spacing: 0.02em;
	}

	.eq-line {
		color: var(--color-warm-300);
		font-size: 0.8rem;
		margin-bottom: 0.35rem;
		line-height: 1.6;
	}

	.eq-detail {
		color: var(--color-warm-500);
		font-size: 0.7rem;
		margin-bottom: 0.15rem;
		line-height: 1.5;
	}

	.sliders {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.slider-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.slider-label {
		color: var(--color-warm-400);
		font-size: 0.75rem;
		min-width: 4.5rem;
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}

	.slider-value {
		color: var(--color-warm-500);
		font-size: 0.65rem;
	}

	input[type='range'] {
		flex: 1;
		height: 2px;
		appearance: none;
		background: var(--color-warm-700);
		border-radius: 1px;
		outline: none;
	}

	input[type='range']::-webkit-slider-thumb {
		appearance: none;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--color-sunset-amber-400);
		cursor: pointer;
	}

	input[type='range']::-moz-range-thumb {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		border: none;
		background: var(--color-sunset-amber-400);
		cursor: pointer;
	}

	.reset {
		background: none;
		border: none;
		color: var(--color-warm-500);
		font-family: var(--font-mono);
		font-size: 0.7rem;
		cursor: pointer;
		padding: 0.25rem 0;
		transition: color 0.2s;
	}

	.reset:hover {
		color: var(--color-warm-300);
	}
</style>
