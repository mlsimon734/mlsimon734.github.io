<script lang="ts">
  import { ArrowUpRight } from "@lucide/svelte";
  import Seo from "#lib/components/Seo.svelte";
  import { inview } from "#lib/actions/inview.js";

  type Project = {
    name: string;
    href: string;
    desc: string;
    stack: string[];
    period: string;
  };

  type Category = {
    name: string;
    projects: Project[];
  };

  const categories: Category[] = [
    {
      name: "Research",
      projects: [
        {
          name: "CS239: Adaptive Thinking",
          href: "https://github.com/mlsimon734/cs239-hci-adaptive-thinking",
          desc: "A Streamlit chat that adapts Claude’s thinking budget to query complexity in real time — debounced complexity scoring as you type, routed across three thinking tiers. Built for CS239 the moment Anthropic first exposed the thinking parameter on Claude 3.7, over a year before adaptive thinking became the default on Opus 4.7.",
          stack: ["Python", "Streamlit", "Anthropic SDK"],
          period: "Spring 2025",
        },
        {
          name: "CLIP Explainability Study",
          href: "https://github.com/mlsimon734",
          desc: "Studied how CLIP’s learned representations shift across pre-training dataset scales — attention heatmaps and image-classification benchmarks to characterize how data scale shapes representation quality.",
          stack: ["PyTorch", "CLIP", "NumPy", "Jupyter"],
          period: "2023",
        },
      ],
    },
    {
      name: "Art",
      projects: [
        {
          name: "Neon Wood",
          href: "/projects/neon-forest",
          desc: "An overgrown alley at night, strung with lights, as a million drifting grains: one generated image, given depth by MoGe-2, coming loose in slow swirls of curl noise.",
          stack: ["Svelte 5", "WebGPU", "WGSL", "vgpu", "MoGe-2"],
          period: "2026",
        },
        {
          name: "Last Light",
          href: "/projects/last-light",
          desc: "Santa Monica Bay at the current minute, rebuilt as a million GPU particles in the manner of three-ml-sharp: single-scattering sky, Gerstner waves with Cox–Munk sun glitter, and clouds, wind and haze from live LA weather.",
          stack: ["Svelte 5", "WebGPU", "WGSL", "vgpu"],
          period: "2026",
        },
        {
          name: "Ascii Horizon",
          href: "/",
          desc: "A real-time animated ASCII sunset rendered on an OffscreenCanvas worker, with a DOM renderer as fallback. Waves, sun glitter, moon phase and stars driven by LA local time and live weather. The personality glue holding the rest of this site together.",
          stack: ["Svelte 5", "TypeScript", "Canvas", "Web Workers"],
          period: "2025 –",
        },
      ],
    },
  ];

  /** Fragment id for a heading or entry: "CS239: Adaptive Thinking" → "cs239-adaptive-thinking". */
  const anchor = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
</script>

<Seo
  title="Projects"
  path="/projects"
  description="Selected software, research, and generative graphics projects by Michael Simon."
/>

<div class="layout-md text-lg">
  <h1 class="sr-only">Projects</h1>

  <section class="reveal" use:inview>
    <p class="text-warm-500 mb-8">Floodgates soon to open.</p>

    <nav aria-label="Contents">
      {#each categories as c}
        <div class="cv-row">
          <span class="cv-period">{c.name}</span>
          <ul class="toc">
            {#each c.projects as p}
              <li><a href="#{anchor(p.name)}" class="link">{p.name}</a></li>
            {/each}
          </ul>
        </div>
      {/each}
    </nav>
  </section>

  {#each categories as c}
    <section class="reveal mt-16" use:inview>
      <h2 id={anchor(c.name)} class="heading2">{c.name}</h2>
      <ul class="space-y-2">
        {#each c.projects as p}
          <li id={anchor(p.name)}>
            <a
              href={p.href}
              target={p.href.startsWith("/") ? undefined : "_blank"}
              rel={p.href.startsWith("/") ? undefined : "noopener noreferrer"}
              class="work-link"
            >
              <span class="work-name">
                <span class="work-title">{p.name}</span>
                <ArrowUpRight size={18} class="work-arrow" />
                <span class="meta period">{p.period}</span>
              </span>
              <span class="work-desc">
                {p.desc}
                <span class="meta stack">{p.stack.join(", ")}</span>
              </span>
            </a>
          </li>
        {/each}
      </ul>
    </section>
  {/each}
</div>

<style>
  .toc {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .toc li + li {
    margin-top: 0.25rem;
  }

  h2,
  li {
    scroll-margin-top: 1.5rem;
  }

  .period,
  .stack {
    display: block;
  }

  .stack {
    margin-top: 0.375rem;
  }
</style>
