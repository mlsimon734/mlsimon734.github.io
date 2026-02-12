<script lang="ts">
	import { onMount } from 'svelte';
	import { DESKTOP_CONFIG, MOBILE_CONFIG, type SkyParams, type WaveParams } from '$lib/horizon';
	import {
		createMonoMetrics,
		resolveZonePalette,
		type MonoMetrics,
		type ZonePalette
	} from '$lib/horizon/render';
	import AsciiHorizonDom from './AsciiHorizonDom.svelte';

	let {
		waveParams,
		skyParams
	}: {
		waveParams: WaveParams;
		skyParams: SkyParams;
	} = $props();

	let canvas: HTMLCanvasElement | undefined = $state();
	let container: HTMLDivElement | undefined = $state();
	let isDesktop = $state(false);
	let reducedMotion = $state(false);
	let inViewport = $state(true);
	let pageVisible = $state(true);
	let supported = $state(true);
	let initialized = $state(false);
	let metrics: MonoMetrics | null = $state(null);
	let palette: ZonePalette | null = $state(null);

	let worker: Worker | null = null;

	const config = $derived(isDesktop ? DESKTOP_CONFIG : MOBILE_CONFIG);
	const shouldAnimate = $derived(!reducedMotion && inViewport && pageVisible);

	function measureCharWidth(font: string): number {
		const probe = document.createElement('canvas');
		const ctx = probe.getContext('2d');
		if (!ctx) {
			return 6.6;
		}

		ctx.font = font;
		return ctx.measureText('M').width;
	}

	async function refreshPresentation() {
		if (!canvas) return;
		await document.fonts.ready;
		if (!canvas) return;

		const nextMetrics = createMonoMetrics(config, measureCharWidth('11px "JetBrains Mono", ui-monospace, monospace'));
		const nextPalette = resolveZonePalette(getComputedStyle(document.documentElement));

		metrics = nextMetrics;
		palette = nextPalette;
		canvas.style.width = `${nextMetrics.cssWidth}px`;
		canvas.style.height = `${nextMetrics.cssHeight}px`;
	}

	onMount(() => {
		supported =
			typeof Worker !== 'undefined' &&
			typeof OffscreenCanvas !== 'undefined' &&
			typeof HTMLCanvasElement !== 'undefined' &&
			'transferControlToOffscreen' in HTMLCanvasElement.prototype;

		if (!supported) {
			return;
		}

		worker = new Worker(new URL('../workers/ascii-horizon.worker.ts', import.meta.url), {
			type: 'module'
		});

		return () => {
			worker?.terminate();
			worker = null;
		};
	});

	$effect(() => {
		const mql = window.matchMedia('(min-width: 640px)');
		isDesktop = mql.matches;
		const handler = (e: MediaQueryListEvent) => (isDesktop = e.matches);
		mql.addEventListener('change', handler);
		return () => mql.removeEventListener('change', handler);
	});

	$effect(() => {
		const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
		reducedMotion = mql.matches;
		const handler = (e: MediaQueryListEvent) => (reducedMotion = e.matches);
		mql.addEventListener('change', handler);
		return () => mql.removeEventListener('change', handler);
	});

	$effect(() => {
		if (!container) return;

		const observer = new IntersectionObserver(
			([entry]) => {
				inViewport = entry?.isIntersecting ?? true;
			},
			{ rootMargin: '200px 0px' }
		);

		observer.observe(container);
		return () => observer.disconnect();
	});

	$effect(() => {
		pageVisible = document.visibilityState === 'visible';
		const handleVisibilityChange = () => {
			pageVisible = document.visibilityState === 'visible';
		};

		document.addEventListener('visibilitychange', handleVisibilityChange);
		return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
	});

	$effect(() => {
		if (!supported) return;

		let cancelled = false;
		void (async () => {
			await refreshPresentation();
			if (cancelled) return;
		})();

		return () => {
			cancelled = true;
		};
	});

	$effect(() => {
		if (!supported) return;

		const observer = new MutationObserver(() => {
			void refreshPresentation();
		});

		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['data-theme']
		});

		return () => observer.disconnect();
	});

	$effect(() => {
		if (!supported || !worker || !canvas || initialized || !metrics || !palette) return;

		const offscreen = canvas.transferControlToOffscreen();
		worker.postMessage(
			{
				type: 'init',
				canvas: offscreen
			},
			[offscreen]
		);
		initialized = true;
	});

	$effect(() => {
		if (!supported || !worker || !initialized || !metrics || !palette) return;

		worker.postMessage({
			type: 'sync',
			config,
			dpr: window.devicePixelRatio || 1,
			metrics: {
				font: metrics.font,
				fontSize: metrics.fontSize,
				lineHeightPx: metrics.lineHeightPx,
				charWidth: metrics.charWidth,
				cssWidth: metrics.cssWidth,
				cssHeight: metrics.cssHeight
			},
			palette: {
				star: palette.star,
				sky: palette.sky,
				'sky-glow': palette['sky-glow'],
				'sun-core': palette['sun-core'],
				sun: palette.sun,
				horizon: palette.horizon,
				water: palette.water,
				'water-reflect': palette['water-reflect'],
				'water-reflect-warm': palette['water-reflect-warm'],
				'water-reflect-cool': palette['water-reflect-cool'],
				'water-far': palette['water-far']
			},
			reducedMotion,
			active: shouldAnimate,
			waveParams: { ...waveParams },
			skyParams: { ...skyParams }
		});
	});
</script>

{#if supported}
	<div bind:this={container} class="canvas-shell">
		<canvas bind:this={canvas} class="render-surface" aria-hidden="true"></canvas>
	</div>
{:else}
	<div class="fallback-note">
		<p>OffscreenCanvas isn&apos;t available here, so this mode falls back to the DOM renderer.</p>
		<AsciiHorizonDom {waveParams} {skyParams} />
	</div>
{/if}

<style>
	.canvas-shell {
		display: flex;
		justify-content: center;
		overflow: hidden;
	}

	.render-surface {
		display: block;
		max-width: 100%;
		height: auto;
	}

	.fallback-note {
		display: grid;
		gap: 0.75rem;
	}

	.fallback-note p {
		margin: 0;
		font-size: 0.8rem;
		color: var(--color-theme-subtle);
		text-align: center;
	}
</style>
