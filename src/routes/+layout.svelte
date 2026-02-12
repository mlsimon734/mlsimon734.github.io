<script lang="ts">
	import '../app.css';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Colophon from '$lib/components/Colophon.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<title>Michael Simon</title>
	<meta name="description" content="Personal website of Michael Simon" />
</svelte:head>

<Header />

<main>
	{@render children()}
</main>

<Footer />

<Colophon />
