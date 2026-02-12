<script lang="ts">
	import { ArrowUpRight } from 'lucide-svelte';
	import AsciiDivider from '$lib/components/AsciiDivider.svelte';
	import { inview } from '$lib/actions/inview';

	type Project = {
		name: string;
		href: string;
		desc: string;
		stack: string[];
		period: string;
	};

	const projects: Project[] = [
		{
			name: 'Excavaite / Sentry',
			href: 'https://github.com/mlsimon734',
			desc: 'AI-native semantic IP loss prevention for enterprises. Screens outbound emails and attachments for potential inventions and cross-references against the company’s patent portfolio with retrieval-augmented LLMs and a custom claim-graph index.',
			stack: ['TypeScript', 'Python', 'Postgres', 'pgvector', 'GCP'],
			period: '2024 –'
		},
		{
			name: 'Paper Knowledge Graphs',
			href: 'https://github.com/mlsimon734',
			desc: 'A research prototype for representing academic papers as logical dependency graphs — assumptions and methodology decisions as nodes, conclusions as derived edges. Built around an HCI study on how researchers navigate unfamiliar literatures.',
			stack: ['Python', 'Svelte', 'D3', 'PyTorch', 'CLIP'],
			period: '2024 –'
		},
		{
			name: 'AV Diffusion Models',
			href: 'https://github.com/mlsimon734',
			desc: 'ControlNet-style diffusion trained on driving images for domain transfer to augment the nuScenes dataset. Used at UCLA Zhou Lab to expand minority-condition training data without recapture.',
			stack: ['PyTorch', 'Diffusers', 'CUDA'],
			period: '2023 – 2024'
		},
		{
			name: 'CLIP Explainability Toolkit',
			href: 'https://github.com/mlsimon734',
			desc: 'Attention heatmap analysis and classification benchmarks exploring how CLIP represents visual concepts. A teaching tool I built while learning the architecture more deeply.',
			stack: ['PyTorch', 'CLIP', 'Captum', 'Jupyter'],
			period: '2023'
		},
		{
			name: 'Agrofocal CV Pipeline',
			href: 'https://github.com/mlsimon734',
			desc: 'PyTorch computer vision models for grape bunch and leaf-mineral deficiency detection across 10+ varieties. Implemented mixed-precision quantization, removing GPU dependency on edge devices and improving inference throughput by 80%+.',
			stack: ['PyTorch', 'ONNX', 'C++', 'Edge TPU'],
			period: '2021 – 2023'
		},
		{
			name: 'AsciiHorizon (this site)',
			href: 'https://github.com/mlsimon734/mlsimon734.github.io',
			desc: 'A real-time animated ASCII sunset rendered three different ways: DOM, WebGL shader with a glyph atlas, and an OffscreenCanvas worker. Wave equations driven by LA local time, dithered into Braille and ASCII zones. The personality glue holding the rest of this site together.',
			stack: ['Svelte 5', 'TypeScript', 'WebGL', 'Web Workers'],
			period: '2025 –'
		}
	];
</script>

<svelte:head>
	<title>Projects · Michael Simon</title>
</svelte:head>

<div class="layout-md text-lg">
	<section class="reveal" use:inview>
		<h1 class="heading2">
			<span class="text-sunset-amber-300 font-mono text-base font-normal mr-2">//</span>projects
		</h1>
		<p class="text-warm-500 mb-8">
			Things I’ve built — with a little more detail than fits on the home page.
		</p>

		<ul class="space-y-2">
			{#each projects as p}
				<li>
					<a href={p.href} target="_blank" rel="noopener noreferrer" class="work-link">
						<span class="work-name">
							{p.name}
							<ArrowUpRight size={18} class="work-arrow" />
							<span class="period">{p.period}</span>
						</span>
						<span class="work-desc">
							{p.desc}
							<span class="stack">
								{#each p.stack as s, i}
									<span class="tag">{s}</span>{#if i < p.stack.length - 1}<span class="sep">·</span>{/if}
								{/each}
							</span>
						</span>
					</a>
				</li>
			{/each}
		</ul>
	</section>

	<AsciiDivider />
</div>

<style>
	.period {
		display: inline-block;
		margin-left: 0.5rem;
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--color-sunset-amber-500);
		font-weight: 400;
		letter-spacing: 0.02em;
	}

	.stack {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		margin-top: 0.5rem;
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--color-theme-subtle);
	}

	.tag {
		display: inline-block;
	}

	.sep {
		color: var(--color-sunset-amber-300);
	}
</style>
