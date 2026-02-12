<script lang="ts">
	import { fade } from 'svelte/transition';
	import {
		generateHorizon,
		DESKTOP_CONFIG,
		MOBILE_CONFIG,
		DEFAULT_WAVE_PARAMS,
		DEFAULT_SKY_PARAMS,
		type AsciiCell,
		type WaveParams,
		type SkyParams
	} from '$lib/horizon';
	import WaveControls from './WaveControls.svelte';

	let isDesktop = $state(false);
	let reducedMotion = $state(false);
	let waterTime = $state(0);
	let now = $state(Date.now());
	let visible = $state(true);
	let waveParams: WaveParams = $state({ ...DEFAULT_WAVE_PARAMS });
	let skyParams: SkyParams = $state({ ...DEFAULT_SKY_PARAMS });

	const config = $derived(isDesktop ? DESKTOP_CONFIG : MOBILE_CONFIG);
	const grid = $derived(generateHorizon(now, config, waterTime, waveParams, skyParams));

	// Run-length encode: consecutive cells with the same zone → single span
	const spans = $derived(
		grid.map((row) => {
			const runs: { chars: string; zone: AsciiCell['zone']; twinkleDelay?: number }[] = [];
			let current = { chars: '', zone: row[0].zone, twinkleDelay: row[0].twinkleDelay };

			for (const cell of row) {
				if (cell.zone === current.zone) {
					current.chars += cell.char;
				} else {
					runs.push(current);
					current = { chars: cell.char, zone: cell.zone, twinkleDelay: cell.twinkleDelay };
				}
			}
			runs.push(current);
			return runs;
		})
	);

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

	// Drive the water from a continuous animation clock to avoid stepped phase jumps.
	$effect(() => {
		if (reducedMotion) {
			waterTime = 0;
			return;
		}

		const animationStart = performance.now();
		let frameId = 0;
		const tick = (frameNow: number) => {
			waterTime = ((frameNow - animationStart) / 1000) * waveParams.speed;
			frameId = requestAnimationFrame(tick);
		};

		frameId = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frameId);
	});

	// Time drift: regenerate from Date.now() every ~60s
	$effect(() => {
		if (reducedMotion) return;
		const id = setInterval(() => {
			now = Date.now();
		}, 60_000);
		return () => clearInterval(id);
	});
</script>

{#if visible}
	<div
		class="ascii-horizon font-mono select-none"
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
		<WaveControls bind:params={waveParams} bind:skyParams={skyParams} />
	</div>
{/if}

<style>
	.ascii-horizon {
		line-height: 1.15;
		letter-spacing: 0;
		margin-bottom: 2rem;
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
		color: var(--color-sunset-amber-300);
		animation: var(--animate-glow);
	}

	.sky {
		color: var(--color-sunset-slate-400);
	}

	.sky-glow {
		color: var(--color-sunset-orange-400);
	}

	.sun-core {
		color: var(--color-sunset-amber-400);
	}

	.sun {
		color: var(--color-sunset-amber-300);
	}

	.horizon {
		color: var(--color-sunset-orange-500);
	}

	.water {
		color: var(--color-sunset-blue-300);
	}

	.water-reflect {
		color: var(--color-sunset-amber-300);
	}

	.water-reflect-warm {
		color: var(--color-sunset-reflect-warm);
	}

	.water-reflect-cool {
		color: var(--color-sunset-reflect-cool);
	}

	.water-far {
		color: var(--color-sunset-blue-400);
	}

	@media (prefers-reduced-motion: reduce) {
		.star {
			animation: none;
			opacity: 0.8;
		}
	}
</style>
