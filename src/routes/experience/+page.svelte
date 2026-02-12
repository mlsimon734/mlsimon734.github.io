<script lang="ts">
	import { Download } from 'lucide-svelte';
	import AsciiDivider from '$lib/components/AsciiDivider.svelte';
	import SocialLinks from '$lib/components/SocialLinks.svelte';
	import { inview } from '$lib/actions/inview';

	type Entry = {
		period: string;
		role: string;
		org: string;
		location?: string;
		bullets: string[];
	};

	const education: Entry[] = [
		{
			period: '2026–',
			role: 'PhD, Computer Science',
			org: 'UCLA',
			location: 'Los Angeles, CA',
			bullets: [
				'Continuing on from MS. Research at the intersection of HCI and AI — knowledge representations of academic literature, adaptive interfaces.'
			]
		},
		{
			period: '2024–2026',
			role: 'MS, Computer Science',
			org: 'UCLA',
			location: 'Los Angeles, CA',
			bullets: ['HCI + AI research. Coursework: deep learning, optimization, computer vision, real analysis.']
		},
		{
			period: '2020–2024',
			role: 'BS, Computer Science',
			org: 'UCLA',
			location: 'Los Angeles, CA',
			bullets: [
				'GPA 3.7 · 4× Dean’s Honor List.',
				'Coursework spanning algorithms, deep learning, computer vision, optimization, and real analysis.'
			]
		}
	];

	const experience: Entry[] = [
		{
			period: '2024–',
			role: 'CTO & Co-founder',
			org: 'Excavaite',
			bullets: [
				'Building Sentry — an AI-native semantic IP loss prevention layer for enterprises.',
				'Designed the cross-referencing engine that screens outbound communication against patent portfolios.'
			]
		},
		{
			period: '2024–',
			role: 'HCI + AI Researcher',
			org: 'Independent',
			bullets: [
				'Novel knowledge graph representations of academic papers as logical dependency structures.',
				'Exploring RL for adaptive user interfaces.'
			]
		},
		{
			period: 'Summer 2023',
			role: 'Software Engineer Intern',
			org: 'Confluent',
			bullets: [
				'Built a metadata recovery tool for Kafka, reducing cluster failure recovery from hours to minutes.'
			]
		},
		{
			period: '2023',
			role: 'CV Researcher',
			org: 'UCLA Zhou Lab',
			bullets: [
				'Representation learning for autonomous vehicle perception via diffusion models and domain transfer.'
			]
		},
		{
			period: 'Summer 2022',
			role: 'Software Engineer Intern',
			org: 'Meta',
			bullets: [
				'Created a centralized code generation framework, cutting data onboarding from ~1 hr to ~5 min across teams.'
			]
		},
		{
			period: '2021–2023',
			role: 'ML / SWE Intern',
			org: 'Agrofocal Technologies',
			bullets: [
				'Trained CV models for grape and leaf-mineral analysis across 10+ varieties.',
				'Implemented mixed-precision quantization, removing GPU dependency on edge devices (80%+ throughput improvement).'
			]
		}
	];

	type Pub = { authors: string; title: string; venue: string; year: string; href?: string; status?: string };
	const publications: Pub[] = [
		{
			authors: 'M. Simon, et al.',
			title: 'Paper Knowledge Graphs: Logical Dependency Structures for Academic Literature',
			venue: 'In preparation',
			year: '2026',
			status: 'in prep'
		},
		{
			authors: 'M. Simon, Zhou Lab',
			title: 'ControlNet-Style Diffusion for Driving-Scene Domain Transfer',
			venue: 'UCLA Technical Report',
			year: '2024',
			href: 'https://github.com/mlsimon734'
		}
	];

	const awards: { period: string; text: string }[] = [
		{ period: '2021–2024', text: 'Dean’s Honor List, UCLA (4×)' },
		{ period: '2020', text: 'UCLA Engineering Achievement Scholarship' }
	];

	const service: Entry[] = [
		{
			period: '2025',
			role: 'Reviewer',
			org: 'CHI Late-Breaking Work',
			bullets: ['Reviewed submissions on adaptive AI interfaces.']
		}
	];

	const skills = [
		{ group: 'languages', items: 'Python · TypeScript · Rust · C++ · SQL' },
		{ group: 'ml / research', items: 'PyTorch · JAX · diffusion · CLIP · CV · RL' },
		{ group: 'systems', items: 'Kafka · Postgres · Redis · Docker · GCP · AWS' },
		{ group: 'frontend', items: 'Svelte · React · Tailwind · Vite' }
	];
</script>

<svelte:head>
	<title>Experience · Michael Simon</title>
</svelte:head>

<div class="layout-md text-lg">
	<header class="cv-header">
		<div class="cv-header-text">
			<h1 class="cv-name font-serif">Michael Simon</h1>
			<p class="cv-subtitle">CS PhD student, UCLA · researcher, engineer, builder</p>
			<SocialLinks showCvLabel class="mt-4" />
			<a href="/resume.pdf" target="_blank" rel="noopener noreferrer" class="pdf-button mt-5">
				<Download size={16} strokeWidth={1.8} />
				<span>Download PDF</span>
			</a>
		</div>
		<!-- TODO: drop static/headshot.jpg in place; replaced placeholder when file lands. -->
		<img
			src="/headshot.jpg"
			alt="Michael Simon"
			width="120"
			height="120"
			loading="eager"
			class="cv-headshot"
			onerror={(e) => (e.currentTarget as HTMLImageElement).style.display = 'none'}
		/>
	</header>

	<AsciiDivider />

	<section class="mt-16 reveal" use:inview>
		<h2 class="heading2">
			<span class="text-sunset-amber-300 font-mono text-base font-normal mr-2">//</span>education
		</h2>
		{#each education as e}
			<div class="cv-row">
				<span class="cv-period">{e.period}</span>
				<div class="cv-content">
					<div>
						<span class="cv-role">{e.role}</span>
						<span class="cv-org"> · {e.org}{#if e.location}, {e.location}{/if}</span>
					</div>
					<ul>
						{#each e.bullets as b}
							<li>{b}</li>
						{/each}
					</ul>
				</div>
			</div>
		{/each}
	</section>

	<AsciiDivider />

	<section class="mt-16 reveal" use:inview>
		<h2 class="heading2">
			<span class="text-sunset-amber-300 font-mono text-base font-normal mr-2">//</span>experience
		</h2>
		{#each experience as e}
			<div class="cv-row">
				<span class="cv-period">{e.period}</span>
				<div class="cv-content">
					<div>
						<span class="cv-role">{e.role}</span>
						<span class="cv-org"> · {e.org}</span>
					</div>
					<ul>
						{#each e.bullets as b}
							<li>{b}</li>
						{/each}
					</ul>
				</div>
			</div>
		{/each}
	</section>

	<AsciiDivider />

	<section class="mt-16 reveal" use:inview>
		<h2 class="heading2">
			<span class="text-sunset-amber-300 font-mono text-base font-normal mr-2">//</span>publications
		</h2>
		{#each publications as p}
			<div class="cv-row">
				<span class="cv-period">{p.year}</span>
				<div class="cv-content">
					<div class="pub-title">
						{#if p.href}
							<a href={p.href} target="_blank" rel="noopener noreferrer" class="link">{p.title}</a>
						{:else}
							{p.title}
						{/if}
						{#if p.status}<span class="pub-status">[{p.status}]</span>{/if}
					</div>
					<div class="pub-meta">
						<span>{p.authors}</span>
						<span class="pub-venue"> · {p.venue}</span>
					</div>
				</div>
			</div>
		{/each}
	</section>

	<AsciiDivider />

	<section class="mt-16 reveal" use:inview>
		<h2 class="heading2">
			<span class="text-sunset-amber-300 font-mono text-base font-normal mr-2">//</span>awards & honors
		</h2>
		{#each awards as a}
			<div class="cv-row">
				<span class="cv-period">{a.period}</span>
				<div class="cv-content">{a.text}</div>
			</div>
		{/each}
	</section>

	<AsciiDivider />

	<section class="mt-16 reveal" use:inview>
		<h2 class="heading2">
			<span class="text-sunset-amber-300 font-mono text-base font-normal mr-2">//</span>service & teaching
		</h2>
		{#each service as e}
			<div class="cv-row">
				<span class="cv-period">{e.period}</span>
				<div class="cv-content">
					<div>
						<span class="cv-role">{e.role}</span>
						<span class="cv-org"> · {e.org}</span>
					</div>
					<ul>
						{#each e.bullets as b}
							<li>{b}</li>
						{/each}
					</ul>
				</div>
			</div>
		{/each}
	</section>

	<AsciiDivider />

	<section class="mt-16 reveal" use:inview>
		<h2 class="heading2">
			<span class="text-sunset-amber-300 font-mono text-base font-normal mr-2">//</span>skills
		</h2>
		{#each skills as s}
			<div class="cv-row">
				<span class="cv-period">{s.group}</span>
				<div class="cv-content">{s.items}</div>
			</div>
		{/each}
	</section>
</div>

<style>
	.cv-header {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 2rem;
		align-items: start;
		margin-bottom: 2rem;
	}

	.cv-name {
		font-size: 2rem;
		font-weight: 600;
		color: var(--color-theme-heading);
		margin: 0 0 0.25rem;
	}

	.cv-subtitle {
		color: var(--color-theme-muted);
		font-size: 1rem;
		margin: 0;
	}

	.cv-headshot {
		width: 120px;
		height: 120px;
		border-radius: 50%;
		object-fit: cover;
		border: 1px solid var(--color-theme-border);
		box-shadow: 0 1px 0 rgba(0, 0, 0, 0.04);
	}

	.pdf-button {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.5rem 0.9rem;
		background: var(--color-sunset-amber-400);
		color: #1a1410;
		font-family: var(--font-mono);
		font-size: 0.8125rem;
		letter-spacing: 0.04em;
		border-radius: 999px;
		text-decoration: none;
		transition: transform 0.2s, background-color 0.2s, box-shadow 0.2s;
		box-shadow: 0 1px 0 rgba(0, 0, 0, 0.04);
	}

	.pdf-button:hover {
		background: var(--color-sunset-amber-500);
		transform: translateY(-1px);
		box-shadow: 0 3px 8px rgba(245, 158, 11, 0.25);
	}

	.pub-title {
		color: var(--color-theme-heading);
		font-weight: 500;
	}

	.pub-status {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--color-sunset-amber-500);
		margin-left: 0.35rem;
	}

	.pub-meta {
		color: var(--color-theme-muted);
		font-size: 0.9375rem;
		margin-top: 0.125rem;
	}

	.pub-venue {
		color: var(--color-theme-subtle);
	}

	@media (max-width: 640px) {
		.cv-header {
			grid-template-columns: 1fr;
		}
		.cv-headshot {
			width: 88px;
			height: 88px;
			order: -1;
		}
	}
</style>
