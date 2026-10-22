<script lang="ts">
  import { page } from "$app/state";
  import AsciiHorizon from "#lib/components/AsciiHorizon.svelte";
  import Seo from "#lib/components/Seo.svelte";
</script>

<Seo
  title={`${page.status}`}
  noindex
  description="The page you were looking for was not found on Michael Simon's website."
/>

<div class="layout-md text-lg">
  <div class="error-horizon" aria-hidden="true">
    <AsciiHorizon />
  </div>

  <section class="error-block">
    <p class="error-code">{page.status}</p>
    <p class="error-line font-serif text-3xl">This shore is uncharted.</p>
    <p class="error-detail text-warm-500 mt-3">
      {page.error?.message ?? "the page you were looking for slipped past the horizon."}
    </p>
    <p class="mt-8">
      <a href="/" class="link">Return home</a>
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
    color: var(--color-theme-subtle);
    font-variant-numeric: tabular-nums;
    margin-bottom: 0.5rem;
  }

  .error-line {
    color: var(--color-theme-heading);
  }

  .error-detail {
    font-size: 1rem;
  }
</style>
