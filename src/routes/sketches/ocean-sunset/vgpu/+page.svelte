<script lang="ts">
  import OceanSunsetVgpu from "#lib/components/OceanSunsetVgpu.svelte";
  import Seo from "#lib/components/Seo.svelte";
</script>

<Seo
  title="Ocean Sunset · Drifting Spray"
  path="/sketches/ocean-sunset/vgpu"
  description="An experimental particle ocean: fine spray rises from the waves and settles into the last light."
/>

<div class="layout-md text-lg">
  <section>
    <h1 class="heading2">ocean sunset particles</h1>
    <p class="lede">Fine spray rises from the waves and settles into the last light.</p>
    <OceanSunsetVgpu />
    <div class="study-notes">
      <a href="/sketches/ocean-sunset" class="link">Compare with the original ocean</a>
      <details>
        <summary>About this study</summary>
        <p>
          This WebGPU prototype uses the same 180,000 particles on desktop and 90,000 on smaller
          screens. A small cohort of sea particles carries velocity between frames, lifting from the
          water and falling back under gravity. Turn off drifting spray to compare the surface
          motion.
        </p>
        <p>
          Built with <a href="https://github.com/vercel-labs/vgpu" class="link">vgpu</a>, with
          depth-tested grains, a half-resolution bloom pass, and the original sunset palette. The
          original ocean remains available for browsers without WebGPU.
        </p>
      </details>
    </div>
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
  .study-notes {
    margin-top: 1.5rem;
    color: var(--color-theme-muted);
    font-size: 0.9rem;
  }
  details {
    margin-top: 0.75rem;
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
</style>
