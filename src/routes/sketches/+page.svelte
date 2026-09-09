<script lang="ts">
  import { ArrowUpRight } from "lucide-svelte";
  import Seo from "$lib/components/Seo.svelte";
  import { inview } from "$lib/actions/inview";

  type Sketch = {
    name: string;
    href: string;
    desc: string;
    aside?: string;
  };

  const sketches: Sketch[] = [
    {
      name: "Ocean Sunset Particles",
      href: "/sketches/ocean-sunset",
      desc: "A quiet particle sky above a moving ocean. Shared waves reveal ribbons of reflected light, with pointer-driven perspective and a pauseable still view.",
      aside: "Three.js point cloud",
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
