<script lang="ts">
  import OceanSunsetVgpu from "#lib/components/OceanSunsetVgpu.svelte";
  import Seo from "#lib/components/Seo.svelte";
</script>

<Seo
  title="Last Light · Santa Monica Bay"
  path="/sketches/ocean-sunset"
  description="The Pacific off Los Angeles at this moment, rebuilt from the position of the sun and today's weather as drifting points of light."
/>

<div class="layout-md text-lg">
  <h1 class="heading2">last light</h1>
  <p class="lede">
    The bay off Santa Monica as it is right now, rebuilt from the sun, the moon, and today's
    weather.
  </p>
</div>

<div class="bleed">
  <OceanSunsetVgpu />
</div>

<div class="layout-md study-notes">
  <details>
    <summary>How it works</summary>
    <p>
      You stand at the end of the pier, facing the point on the horizon where the sun sets today.
      The sun and stars take their real positions over Los Angeles for this minute, the moon a close
      approximation, and the sky is lit by single scattering through a modeled atmosphere, so the
      colors of twilight come out of the arithmetic rather than a palette. Wind speed, wind
      direction, cloud cover and humidity come from a live forecast and shape the waves, the clouds
      and the haze.
    </p>
    <p>
      The sea is a sum of travelling waves: a long westerly swell and a wind sea sized by the
      Pierson–Moskowitz spectrum. Roughness too fine to draw follows Cox and Munk's measurements of
      sunlit sea slopes, and each grain either catches the sun or doesn't, with a probability that
      matches the expected glare. That is where the path of light comes from.
    </p>
    <p>
      Every grain lives a few seconds, drifts on a slow noise field, and returns to its place, a
      motion borrowed from
      <a
        href="https://github.com/cullenwebber/three-ml-sharp"
        class="link"
        target="_blank"
        rel="noopener noreferrer">cullenwebber/three-ml-sharp</a
      >. Built with <a href="https://github.com/vercel-labs/vgpu" class="link">vgpu</a> on WebGPU.
    </p>
  </details>
  <a href="/sketches/ocean-sunset/webgl" class="link">The earlier WebGL version</a>
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
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
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
