<script lang="ts">
  import ForestVgpu from "#lib/components/ForestVgpu.svelte";
  import Seo from "#lib/components/Seo.svelte";
</script>

<Seo
  title="Neon Wood"
  path="/sketches/neon-forest"
  description="A path through a wood at night, wired with strings of light, drawn as a million drifting points."
/>

<div class="layout-md text-lg">
  <h1 class="heading2">neon wood</h1>
  <p class="lede">
    A path through a wood at night, strung with lights, with a door left open at the end.
  </p>
</div>

<div class="bleed">
  <ForestVgpu />
</div>

<div class="layout-md study-notes">
  <details>
    <summary>How it works</summary>
    <p>
      Nothing here is a photograph or a model file. The trunks, the canopy, the paving and the
      doorway are laid out from a seed when the page loads, then sampled as points: every visible
      surface gets grains in proportion to the patch of view it fills, with a bias toward the
      distance, so the near trees are drawn by fewer, larger grains and the far ones by fine dust.
      Each grain is lit once, from where it was born, by the bulbs on the three strands and by the
      open door; the wet paving adds a streak toward your eye for every light.
    </p>
    <p>
      Every grain lives about a second. It is born in place, swells, and, where a slowly wandering
      region of the wood comes loose, is carried through the curl of a noise field before it fades
      and forms again at home. The lights and the doorway hold still. Grains keep the color they
      were born with, so a swirl reads as the wood itself coming apart, and because they move in
      metres, near swirls cross more of the frame than far ones. The motion and camera are borrowed
      from
      <a
        href="https://github.com/cullenwebber/three-ml-sharp"
        class="link"
        target="_blank"
        rel="noopener noreferrer">cullenwebber/three-ml-sharp</a
      >. Built with <a href="https://github.com/vercel-labs/vgpu" class="link">vgpu</a> on WebGPU.
    </p>
  </details>
</div>

<style>
  .heading2 {
    margin-bottom: 0.5rem;
  }
  .lede {
    color: var(--color-theme-muted);
    margin: 0 0 1.5rem;
    font-size: 1rem;
    max-width: 52ch;
  }
  .bleed {
    width: min(100%, 88rem);
    margin: 0 auto;
    padding: 0 clamp(0rem, 3vw, 2rem);
  }
  .study-notes {
    margin-top: 1.25rem;
    color: var(--color-theme-muted);
    font-size: 0.9rem;
  }
  summary {
    cursor: pointer;
    width: fit-content;
    padding: 0.5rem 0;
    color: var(--color-theme-text);
  }
  summary:focus-visible {
    outline: 2px solid var(--color-sunset-amber-400);
    outline-offset: 4px;
  }
  details p {
    max-width: 65ch;
    margin: 1rem 0;
  }
  @media (max-width: 639px) {
    .bleed :global(figcaption) {
      padding-inline: 1rem;
    }
  }
</style>
