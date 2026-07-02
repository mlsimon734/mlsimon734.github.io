<script lang="ts">
  import { ArrowUpRight } from "lucide-svelte";
  import Seo from "$lib/components/Seo.svelte";
  import { inview } from "$lib/actions/inview";

  type Essay = {
    title: string;
    href: string;
    external?: boolean;
    date: string;
    blurb: string;
  };

  // TODO: replace placeholder with real essays as you write them.
  const essays: Essay[] = [
    {
      title: "Lobsters first: on Stross, moltenet, and fiction-becoming-reality",
      href: "https://github.com/mlsimon734",
      external: true,
      date: "forthcoming",
      blurb:
        "Charles Stross predicted that the first uploaded consciousnesses would be lobsters — small brains, low neuron count. Recently, someone built moltenet, a social network for language model agents as crabs and lobsters. A note on the moments when speculative fiction quietly becomes ambient.",
    },
  ];
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
      {#each essays as essay}
        <li>
          <a
            href={essay.href}
            target={essay.external ? "_blank" : undefined}
            rel={essay.external ? "noopener noreferrer" : undefined}
            class="work-link"
          >
            <span class="work-name">
              {essay.title}
              {#if essay.external}<ArrowUpRight size={18} class="work-arrow" />{/if}
            </span>
            <span class="work-desc">
              {essay.blurb}
              <span class="essay-date">— {essay.date}</span>
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
</style>
