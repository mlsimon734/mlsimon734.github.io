<script lang="ts">
  import { page } from "$app/state";
  import AsciiHorizon from "$lib/components/AsciiHorizon.svelte";
</script>

<svelte:head>
  <title>{page.status} · Michael Simon</title>
</svelte:head>

<div class="layout-md text-lg">
  <div class="error-horizon" aria-hidden="true">
    <AsciiHorizon />
  </div>

  <section class="error-block">
    <p class="error-code font-mono text-base">// {page.status}</p>
    <p class="error-line font-serif text-3xl">this shore is uncharted —</p>
    <p class="error-detail text-warm-500 mt-3">
      {page.error?.message ?? "the page you were looking for slipped past the horizon."}
    </p>
    <p class="mt-8">
      <a href="/" class="link">return home →</a>
    </p>
  </section>
</div>

<style>
  .error-horizon {
    opacity: 0.4;
    filter: saturate(0.6);
    transition: opacity 0.6s ease;
  }

  .error-block {
    text-align: center;
    margin-top: 2rem;
  }

  .error-code {
    color: var(--color-sunset-amber-500);
    margin-bottom: 0.5rem;
  }

  .error-line {
    color: var(--color-theme-heading);
  }

  .error-detail {
    font-family: var(--font-mono);
    font-size: 0.875rem;
  }
</style>
