<script lang="ts">
  import OceanSunsetParticles from "$lib/components/OceanSunsetParticles.svelte";
  import Seo from "$lib/components/Seo.svelte";
</script>

<Seo
  title="Ocean Sunset Particles"
  path="/sketches/ocean-sunset"
  description="A particle study of sunset over the Pacific: a quiet sky and ribbons of light moving across the water."
/>

<div class="layout-md text-lg">
  <section>
    <h1 class="heading2">ocean sunset particles</h1>
    <p class="lede">A quiet sky, a moving sea, and the last light on the water.</p>
    <OceanSunsetParticles />
    <details class="making-of">
      <summary>How it works</summary>
      <p>
        Up to 180,000 shaded points form the coastal rock, clouds, sun, and sea. Waves move the
        water while fine particles drift away and reform around the surfaces. Move your pointer
        across the scene to shift the perspective, or pause to keep a still view.
      </p>
      <dl>
        <dt>renderer</dt>
        <dd>Three.js WebGL2 point cloud with shaded grains, depth, and luminous highlights</dd>
        <dt>motion</dt>
        <dd>GPU wave and flow displacement, depth-tested particles, HDR bloom, and filmic color</dd>
        <dt>palette</dt>
        <dd>
          Sunset amber from the <a href="/" class="link">ASCII ocean</a>, with cyan water and violet
          rock
        </dd>
      </dl>
      <p>
        Inspired by <a
          href="https://github.com/cullenwebber/three-ml-sharp"
          class="link"
          target="_blank"
          rel="noopener noreferrer">cullenwebber/three-ml-sharp</a
        >, adapted as a procedural ocean study for this site.
      </p>
    </details>
  </section>
</div>

<style>
  .layout-md {
    max-width: 72rem;
  }
  .heading2 {
    margin-bottom: 0.5rem;
  }
  .lede {
    color: var(--color-theme-muted);
    margin: 0 0 1.5rem;
    font-size: 1rem;
  }
  .making-of {
    margin-top: 1.5rem;
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
  p {
    max-width: 65ch;
    margin: 1rem 0;
  }
  dl {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 0.5rem 1rem;
  }
  dt {
    color: var(--color-theme-text);
  }
  dd {
    margin: 0;
  }
  @media (max-width: 480px) {
    dl {
      grid-template-columns: 1fr;
    }
    dd {
      margin-bottom: 0.5rem;
    }
  }
</style>
