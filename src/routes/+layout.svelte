<script lang="ts">
  import "../app.css";
  import Header from "$lib/components/Header.svelte";
  import Footer from "$lib/components/Footer.svelte";
  import Colophon from "$lib/components/Colophon.svelte";

  let { children } = $props();
</script>

<Header />

<main class="mt-6 sm:mt-8">
  {@render children()}
</main>

<Footer />

<Colophon />
