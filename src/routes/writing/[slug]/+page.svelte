<script lang="ts">
  import { ArrowLeft } from "lucide-svelte";
  import Seo from "$lib/components/Seo.svelte";
  import { inview } from "$lib/actions/inview";

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
      {#if data.meta.draft}<span class="essay-draft">draft</span>{/if}
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
    font-family: var(--font-mono);
    font-size: 0.8125rem;
    color: var(--color-theme-muted);
    text-decoration: none;
    transition: color 0.2s;
  }

  .essay-back:hover {
    color: var(--color-sunset-amber-500);
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
    gap: 0.625rem;
    margin-top: 0.75rem;
    font-family: var(--font-mono);
    font-size: 0.8125rem;
    color: var(--color-sunset-amber-500);
  }

  .essay-draft {
    border: 1px solid var(--color-theme-border);
    border-radius: 0.25rem;
    padding: 0.0625rem 0.375rem;
    color: var(--color-theme-subtle);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-size: 0.6875rem;
  }
</style>
