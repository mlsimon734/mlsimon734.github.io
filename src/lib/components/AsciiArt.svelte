<script lang="ts">
	import { fade } from 'svelte/transition';

	interface Props {
		piece: string;
	}

	let { piece }: Props = $props();
	let visible = $state(true);
</script>

{#if visible}
	<div
		class="ascii-art font-mono select-none"
		transition:fade={{ duration: 1000 }}
		aria-hidden="true"
	>
		<pre class="art-block">{piece.trim()}</pre>
	</div>
{/if}

<style>
	.ascii-art {
		overflow: hidden;
		text-align: center;
		margin-bottom: 2rem;
	}

	.art-block {
		display: inline-block;
		text-align: left;
		white-space: pre;
		line-height: 1.15;
		font-size: clamp(0.35rem, 1.1vw, 0.75rem);
		color: var(--color-warm-300);
		font-family: var(--font-mono);
	}

	@media (prefers-reduced-motion: reduce) {
		.ascii-art {
			animation: none;
		}
	}
</style>
