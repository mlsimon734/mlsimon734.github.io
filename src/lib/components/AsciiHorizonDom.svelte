<script lang="ts">
	import { fade } from 'svelte/transition';
	import {
		generateHorizon,
		DESKTOP_CONFIG,
		MOBILE_CONFIG,
		type AsciiCell,
		type WaveParams,
		type SkyParams
	} from '$lib/horizon';
	import { encodeRuns } from '$lib/horizon/render';

	const TARGET_FPS = 12;
	const FRAME_INTERVAL_MS = 1000 / TARGET_FPS;

	let {
		waveParams,
		skyParams
	}: {
		waveParams: WaveParams;
		skyParams: SkyParams;
	} = $props();

	let container: HTMLDivElement | undefined = $state();
	let isDesktop = $state(false);
	let reducedMotion = $state(false);
	let inViewport = $state(true);
	let pageVisible = $state(true);
	let waterTime = $state(0);
	let now = $state(Date.now());

	const config = $derived(isDesktop ? DESKTOP_CONFIG : MOBILE_CONFIG);
	const shouldAnimate = $derived(!reducedMotion && inViewport && pageVisible);
	const grid = $derived(generateHorizon(now, config, waterTime, waveParams, skyParams));
	const spans = $derived(encodeRuns(grid) as { chars: string; zone: AsciiCell['zone']; twinkleDelay?: number }[][]);

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
		if (reducedMotion) {
			waterTime = 0;
		}
	});

	$effect(() => {
		if (!shouldAnimate) {
			return;
		}

		const speed = Math.max(waveParams.speed, 0.001);
		const animationStart = performance.now() - (waterTime / speed) * 1000;
		let frameId = 0;
		let lastCommittedFrame = -FRAME_INTERVAL_MS;

		const tick = (frameNow: number) => {
			if (frameNow - lastCommittedFrame >= FRAME_INTERVAL_MS) {
				waterTime = ((frameNow - animationStart) / 1000) * speed;
				lastCommittedFrame = frameNow;
			}
			frameId = requestAnimationFrame(tick);
		};

		frameId = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frameId);
	});

	$effect(() => {
		const id = setInterval(() => {
			now = Date.now();
		}, 60_000);
		return () => clearInterval(id);
	});
</script>

<div
	bind:this={container}
	class="ascii-horizon font-mono select-none"
	class:motion-paused={!shouldAnimate}
	transition:fade={{ duration: 1000 }}
	aria-hidden="true"
>
	<div class="art-block">
		{#each spans as row}
			<p>{#each row as run}<span
						class={run.zone}
						style={run.twinkleDelay != null
							? `animation-delay: ${run.twinkleDelay}s`
							: undefined}>{run.chars}</span>{/each}</p>
		{/each}
	</div>
</div>

<style>
	.ascii-horizon {
		line-height: 1.15;
		letter-spacing: 0;
		overflow: hidden;
		text-align: center;
	}

	.art-block {
		display: inline-block;
		text-align: left;
		white-space: pre;
		font-size: 11px;
	}

	.star {
		color: var(--color-horizon-star);
		animation: var(--animate-glow);
	}

	.sky {
		color: var(--color-horizon-sky);
	}

	.sky-glow {
		color: var(--color-horizon-sky-glow);
	}

	.sun-core {
		color: var(--color-horizon-sun-core);
	}

	.sun {
		color: var(--color-horizon-sun);
	}

	.horizon {
		color: var(--color-horizon-horizon);
	}

	.water {
		color: var(--color-horizon-water);
	}

	.water-reflect {
		color: var(--color-horizon-water-reflect);
	}

	.water-reflect-warm {
		color: var(--color-horizon-water-reflect-warm);
	}

	.water-reflect-cool {
		color: var(--color-horizon-water-reflect-cool);
	}

	.water-far {
		color: var(--color-horizon-water-far);
	}

	.motion-paused .star {
		animation: none;
		opacity: 0.8;
	}

	@media (prefers-reduced-motion: reduce) {
		.star {
			animation: none;
			opacity: 0.8;
		}
	}
</style>
