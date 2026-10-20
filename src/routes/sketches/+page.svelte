<script lang="ts">
  import { ArrowUpRight } from "@lucide/svelte";
  import Seo from "#lib/components/Seo.svelte";
  import { inview } from "#lib/actions/inview.js";

  type Sketch = {
    name: string;
    href: string;
    desc: string;
    aside?: string;
  };

  const sketches: Sketch[] = [
    {
      name: "Last Light",
      href: "/sketches/ocean-sunset",
      desc: "Santa Monica Bay at this minute as a million drifting grains: the sky from atmospheric scattering, the sea from wave spectra and sun glitter, the clouds from today's weather.",
      aside: "WebGPU",
    },
    {
      name: "Ascii Horizon",
      href: "/",
      desc: "The animated sunset on the home page: a mathematically generated ASCII ocean rendered off the main thread with OffscreenCanvas, driven by LA local time and lunar phase.",
      aside: "see home →",
    },
  ];
</script>

<Seo
  title="Sketches"
  path="/sketches"
  description="Generative ASCII and WebGL sketches by Michael Simon."
/>

<div class="layout-md text-lg">
  <h1 class="sr-only">Sketches</h1>

  <section class="reveal" use:inview>
    <p class="text-warm-500 mb-8">
      Generative ASCII experiments. Small browser-only pieces, mostly excuses to try a rendering
      technique I've been curious about.
    </p>

    <ul class="space-y-2">
      {#each sketches as s}
        <li>
          <a href={s.href} class="work-link">
            <span class="work-name">
              {s.name}
              <ArrowUpRight size={18} class="work-arrow" />
              {#if s.aside}<span class="period">{s.aside}</span>{/if}
            </span>
            <span class="work-desc">{s.desc}</span>
          </a>
        </li>
      {/each}
    </ul>
  </section>
</div>

<style>
  .period {
    display: inline-block;
    margin-left: 0.5rem;
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--color-sunset-amber-500);
    font-weight: 400;
    letter-spacing: 0.02em;
  }
</style>
