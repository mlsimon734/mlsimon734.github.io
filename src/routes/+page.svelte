<script lang="ts">
	import { fly } from 'svelte/transition';
	import { ArrowUpRight } from 'lucide-svelte';
	import AsciiHorizon from '$lib/components/AsciiHorizon.svelte';
	import AsciiDivider from '$lib/components/AsciiDivider.svelte';
	import { inview } from '$lib/actions/inview';

	const featuredProjects: {
		name: string;
		href: string;
		desc: string;
		aside?: string;
	}[] = [
		{
			name: 'Excavaite / Sentry',
			href: 'https://github.com/mlsimon734',
			desc: 'AI-native semantic IP data loss prevention — screens emails and attachments for potential inventions and cross-references against patent portfolios.',
			aside: 'CTO & Co-founder'
		},
		{
			name: 'Paper Knowledge Graphs',
			href: 'https://github.com/mlsimon734',
			desc: 'Novel representations of academic papers as logical dependency graphs between assumptions, methodology decisions, and conclusions.',
			aside: 'HCI + AI Research'
		},
		{
			name: 'AV Diffusion Models',
			href: 'https://github.com/mlsimon734',
			desc: 'ControlNet-style diffusion models trained on driving images for domain transfer to augment the nuScenes dataset.',
			aside: 'UCLA Zhou Lab'
		},
		{
			name: 'CLIP Explainability',
			href: 'https://github.com/mlsimon734',
			desc: 'Attention heatmap analysis and classification benchmarks exploring how CLIP represents visual concepts.',
			aside: 'Deep Learning'
		},
		{
			name: 'Agrofocal CV Pipeline',
			href: 'https://github.com/mlsimon734',
			desc: 'PyTorch computer vision models for grape bunch and leaf mineral deficiency detection across 10+ varieties.',
			aside: '80%+ throughput improvement'
		}
	];

	const experience: {
		role: string;
		org: string;
		period: string;
		desc: string;
	}[] = [
		{
			role: 'CTO & Co-founder',
			org: 'Excavaite',
			period: 'Current',
			desc: 'Building Sentry — an AI-native semantic IP loss prevention layer for enterprises.'
		},
		{
			role: 'HCI + AI Researcher',
			org: 'Independent',
			period: 'Current',
			desc: 'Novel knowledge graph representations of academic papers. Exploring RL for adaptive user interfaces.'
		},
		{
			role: 'Software Engineer Intern',
			org: 'Confluent',
			period: 'Summer 2023',
			desc: 'Built a metadata recovery tool for Kafka, reducing cluster failure recovery from hours to minutes.'
		},
		{
			role: 'Software Engineer Intern',
			org: 'Meta',
			period: 'Summer 2022',
			desc: 'Created a centralized code generation framework, cutting data onboarding from ~1 hr to ~5 min.'
		},
		{
			role: 'ML / SWE Intern',
			org: 'Agrofocal Technologies',
			period: '2021–2023',
			desc: 'Trained CV models for agriculture. Implemented mixed-precision quantization, removing GPU dependency on edge devices.'
		},
		{
			role: 'CV Researcher',
			org: 'UCLA Zhou Lab',
			period: '2023',
			desc: 'Representation learning for autonomous vehicle perception using diffusion models and domain transfer.'
		}
	];
</script>

<div class="layout-md text-lg">
	<div in:fly={{ y: 20, duration: 800, delay: 200 }}>
		<AsciiHorizon />
	</div>

	<section class="intro" in:fly={{ y: 20, duration: 800, delay: 400 }}>
		<p class="text-black text-3xl">
			I'm <em class="font-serif text-[110%]">an aspiring polymath</em> — researcher, engineer, builder.
		</p>
	</section>

	<section class="mt-16 sm:mt-20 reveal" use:inview>
		<p class="mb-4">
			Currently, I'm building <a href="https://github.com/mlsimon734" class="link">Sentry at Excavaite</a> — an AI-native semantic IP loss prevention layer — and researching novel ways to represent academic papers as knowledge graphs at the intersection of HCI and AI.
		</p>
		<p>
			I care about building software that connects cutting-edge research with real human needs. The best AI work isn't about maximizing benchmarks — it's about understanding how people actually think, learn, and create.
		</p>
	</section>

	<AsciiDivider />

	<section class="mt-16 sm:mt-20 reveal" use:inview>
		<h2 class="heading2">
			<span class="text-sunset-amber-300 font-mono text-base font-normal mr-2">//</span>Featured Projects
		</h2>
		<ul class="space-y-4">
			{#each featuredProjects as project}
				<li>
					<a
						href={project.href}
						target="_blank"
						rel="noopener noreferrer"
						class="project-link"
					>
						<span class="project-name">
							{project.name}
							<ArrowUpRight size={18} class="arrow-icon" />
						</span>
						<span class="project-desc">
							{project.desc}
							{#if project.aside}
								<span class="text-warm-400">— {project.aside}</span>
							{/if}
						</span>
					</a>
				</li>
			{/each}
		</ul>
	</section>

	<AsciiDivider />

	<section class="mt-16 sm:mt-20 reveal" use:inview>
		<h2 class="heading2">
			<span class="text-sunset-amber-300 font-mono text-base font-normal mr-2">//</span>Background
		</h2>
		<p class="mb-6">
			<strong class="text-black">UCLA</strong> — BS Computer Science, 2024. GPA 3.7, 4x Dean's Honor List. Coursework spanning algorithms, deep learning, computer vision, optimization, and real analysis.
		</p>
		<div class="space-y-3">
			{#each experience as exp}
				<div class="exp-row">
					<div class="exp-header">
						<span class="text-black font-medium">{exp.role}</span>
						<span class="text-warm-400 text-base"> · {exp.org}</span>
					</div>
					<span class="text-warm-400 text-base">{exp.period}</span>
					<p class="text-warm-600 text-base mt-0.5">{exp.desc}</p>
				</div>
			{/each}
		</div>
	</section>

	<AsciiDivider />

	<section class="mt-16 sm:mt-20 reveal" use:inview>
		<h2 class="heading2">
			<span class="text-sunset-amber-300 font-mono text-base font-normal mr-2">//</span>Interests
		</h2>
		<p class="mb-4">
			Outside of work, I climb, play piano (classical training, know the theory, trying to get back into it), play chess, cook, and read — especially forward-facing sci-fi and speculative fiction.
		</p>
		<p class="mb-4">
			I'm fascinated by fiction becoming reality. Charles Stross's <em>Accelerando</em> predicted that the first uploaded consciousnesses would be lobsters — small brains, low neuron count. Recently, someone built <em>moltenet</em>, a social network for language model agents as crabs and lobsters. Those moments where vision becomes real captivate me.
		</p>
		<p>
			I think a lot about AI and social bonds — the risk that connections between people weaken as AI becomes more capable. And I admire Anthony Bourdain's worldview: a world where we travel, appreciate each other's cultures, and live within them fully rather than being fearful.
		</p>
	</section>
</div>

<style>
	.project-link {
		display: grid;
		grid-template-columns: 1fr 2fr;
		gap: 1rem;
		padding: 0.75rem 0.5rem;
		text-decoration: none;
		color: inherit;
		transition: background-color 0.2s, border-color 0.2s;
		margin: 0 -0.5rem;
		border-radius: 0.375rem;
		border-left: 2px solid transparent;
	}

	.project-link:hover {
		background-color: var(--color-theme-hover);
		border-left-color: var(--color-sunset-amber-300);
	}

	.project-link:hover :global(.arrow-icon) {
		transform: translate(1px, -1px);
		color: var(--color-sunset-amber-400);
	}

	:global(.arrow-icon) {
		display: inline;
		margin-top: -2px;
		margin-left: 2px;
		opacity: 0.5;
		transition: transform 0.2s, color 0.2s, opacity 0.2s;
	}

	.project-link:hover :global(.arrow-icon) {
		opacity: 1;
	}

	.project-name {
		font-weight: 500;
		color: var(--color-theme-heading);
	}

	.project-desc {
		color: var(--color-theme-text);
	}

	.exp-row {
		padding: 0.25rem 0;
	}

	.exp-header {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		align-items: baseline;
	}

	@media (max-width: 640px) {
		.project-link {
			grid-template-columns: 1fr;
			gap: 0.25rem;
		}
	}

	em {
		font-style: italic;
	}
</style>
