<script lang="ts">
	import AsciiDivider from './AsciiDivider.svelte';

	const links = [
		{ label: 'GitHub', href: 'https://github.com/mlsimon734', handle: '@mlsimon734' },
		{
			label: 'LinkedIn',
			href: 'https://linkedin.com/in/michael-simon02',
			handle: 'michael-simon02'
		},
		{ label: 'Email', handle: 'mlsimon AT cs DOT ucla DOT edu' }
	];
</script>

<footer class="layout-md mt-24 sm:mt-32 text-lg pb-16 sm:pb-24">
	<AsciiDivider />

	<div class="footer-content mt-6">
		{#each links as link}
			<div class="footer-row">
				<span class="label">{link.label}</span>
				<div class="divider"></div>
				{#if link.href}
					<a href={link.href} target="_blank" rel="noopener noreferrer" class="link">
						{link.handle}
					</a>
				{:else}
					<span class="contact-value">{link.handle}</span>
				{/if}
			</div>
		{/each}
	</div>

	<p class="footer-note mt-8 font-mono text-sm text-center">// built with care</p>
</footer>

<style>
	.footer-content {
		display: flex;
		flex-direction: column;
	}

	.footer-row {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		padding: 0.5rem 0;
	}

	.label {
		color: var(--color-theme-subtle);
		flex-shrink: 0;
	}

	.divider {
		flex-grow: 1;
		border-bottom: 1px dotted var(--color-theme-divider);
		margin: 0 0.5rem;
		min-width: 2rem;
	}

	.contact-value {
		color: var(--color-theme-heading);
	}

	.footer-note {
		color: var(--color-theme-subtle);
	}
</style>
