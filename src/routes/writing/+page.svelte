<script lang="ts">
  import Seo from "#lib/components/Seo.svelte";
  import { inview } from "#lib/actions/inview.js";

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
              <span class="work-title">{post.title}</span>
              <span class="meta essay-date">
                <time datetime={post.date}>{formatted(post.date)}</time>
                {#if post.draft}<span class="essay-draft">· draft</span>{/if}
              </span>
            </span>
            <span class="work-desc">{post.description}</span>
          </a>
        </li>
      {/each}
    </ul>
  </section>

  <p class="meta mt-10">More coming as I write them.</p>
</div>

<style>
  .essay-date {
    display: block;
  }
</style>
