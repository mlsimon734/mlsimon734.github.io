<script lang="ts">
  import { ArrowLeft } from "@lucide/svelte";
  import Seo from "#lib/components/Seo.svelte";
  import { inview } from "#lib/actions/inview.js";

  let { data } = $props();

  const formatted = $derived(
    new Date(`${data.meta.date}T00:00:00Z`).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    }),
  );
</script>

<Seo
  title={data.meta.title}
  path="/writing/{data.meta.slug}"
  description={data.meta.description}
  type="article"
  noindex={data.meta.draft}
/>

<article class="layout-md">
  <header class="reveal mb-10" use:inview>
    <a href="/writing" class="essay-back">
      <ArrowLeft size={14} aria-hidden="true" />
      Writing
    </a>
    <h1 class="essay-title">{data.meta.title}</h1>
    <p class="essay-meta">
      <time datetime={data.meta.date}>{formatted}</time>
      {#if data.meta.draft}<span>· draft</span>{/if}
    </p>
  </header>

  <div class="prose reveal" use:inview>
    <data.content />
  </div>
</article>

<style>
  .essay-back {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.9375rem;
    color: var(--color-theme-muted);
    text-decoration: none;
    transition: color 0.2s;
  }

  .essay-back:hover {
    color: var(--color-theme-heading);
  }

  .essay-title {
    font-family: var(--font-serif);
    font-size: clamp(1.875rem, 5vw, 2.5rem);
    line-height: 1.15;
    font-weight: 500;
    letter-spacing: -0.015em;
    color: var(--color-theme-heading);
    margin-top: 1.25rem;
    text-wrap: balance;
  }

  .essay-meta {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    margin-top: 0.75rem;
    font-size: 0.9375rem;
    color: var(--color-theme-subtle);
    font-variant-numeric: tabular-nums;
  }
</style>
