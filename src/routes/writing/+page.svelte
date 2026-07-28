<script lang="ts">
  import Seo from "$lib/components/Seo.svelte";
  import { inview } from "$lib/actions/inview";

  let { data } = $props();

  const formatted = (date: string): string =>
    new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      timeZone: "UTC",
    });
</script>

<Seo
  title="Writing"
  path="/writing"
  description="Notes by Michael Simon on research, software, and theories of knowledge."
/>

<div class="layout-md text-lg">
  <h1 class="sr-only">Writing</h1>

  <section class="reveal" use:inview>
    <p class="text-warm-500 mb-8">Notes on research, software, and theory of knowledge.</p>

    <ul class="space-y-2">
      {#each data.posts as post (post.slug)}
        <li>
          <a href="/writing/{post.slug}" class="work-link">
            <span class="work-name">
              {post.title}
              {#if post.draft}<span class="essay-draft">draft</span>{/if}
            </span>
            <span class="work-desc">
              {post.description}
              <span class="essay-date">— {formatted(post.date)}</span>
            </span>
          </a>
        </li>
      {/each}
    </ul>
  </section>

  <p class="text-warm-400 mt-10 text-center font-mono text-sm">// more coming as I write them</p>
</div>

<style>
  .essay-date {
    font-family: var(--font-mono);
    font-size: 0.8125rem;
    color: var(--color-sunset-amber-500);
  }

  .essay-draft {
    margin-left: 0.375rem;
    border: 1px solid var(--color-theme-border);
    border-radius: 0.25rem;
    padding: 0.0625rem 0.375rem;
    font-family: var(--font-mono);
    font-size: 0.6875rem;
    font-weight: 400;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-theme-subtle);
  }
</style>
