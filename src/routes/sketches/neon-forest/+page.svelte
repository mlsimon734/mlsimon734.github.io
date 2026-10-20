<script lang="ts">
  import ForestVgpu from "#lib/components/ForestVgpu.svelte";
  import Seo from "#lib/components/Seo.svelte";
</script>

<Seo
  title="Neon Wood"
  path="/sketches/neon-forest"
  description="An overgrown alley at night, strung with lights, drawn as a million drifting points."
/>

<div class="layout-md text-lg">
  <h1 class="heading2">neon wood</h1>
  <p class="lede">
    An alley gone back to forest at night, strung with lights, with a door left open at the end.
  </p>
</div>

<div class="bleed">
  <ForestVgpu />
</div>

<div class="layout-md study-notes">
  <details>
    <summary>How it works</summary>
    <p>
      The idea was a cyberpunk street that the forest has taken back. The alley started as one
      image, generated with Gemini from a description of the scene.
      <a
        href="https://github.com/microsoft/MoGe"
        class="link"
        target="_blank"
        rel="noopener noreferrer">MoGe-2</a
      >, a model that estimates the shape of a scene from a single picture, gave every pixel a
      distance in metres, which turns the picture into points in space. Each pixel gets grains in
      proportion to the patch of view it fills, with a bias toward the distance, so the near plants
      are drawn by fewer, larger grains and the far end by fine dust. The brightest pixels count as
      lights: they are drawn brighter than white, so they bloom, and with finer grains.
    </p>
    <p>
      Every grain lives about a second. It is born in place, swells, and, where a slowly wandering
      region of the alley comes loose, is carried through the curl of a noise field before it fades
      and forms again at home. The lights and the doorway hold still. Grains keep the color they
      were born with, so a swirl reads as the alley itself coming apart, and because they move in
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
