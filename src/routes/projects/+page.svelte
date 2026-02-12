<script lang="ts">
  import { ArrowUpRight } from "lucide-svelte";
  import { inview } from "$lib/actions/inview";

  type Project = {
    name: string;
    href: string;
    desc: string;
    stack: string[];
    period: string;
  };

  const projects: Project[] = [
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
    {
      name: "AsciiHorizon (this site)",
      href: "https://github.com/mlsimon734/mlsimon734.github.io",
      desc: "A real-time animated ASCII sunset rendered three different ways: DOM, WebGL shader with a glyph atlas, and an OffscreenCanvas worker. Wave equations driven by LA local time, dithered into Braille and ASCII zones. The personality glue holding the rest of this site together.",
      stack: ["Svelte 5", "TypeScript", "WebGL", "Web Workers"],
      period: "2025 –",
    },
  ];
</script>

<svelte:head>
  <title>Projects · Michael Simon</title>
</svelte:head>

<div class="layout-md text-lg">
  <section class="reveal" use:inview>
    <p class="text-warm-500 mb-8">Floodgates soon to open.</p>

    <ul class="space-y-2">
      {#each projects as p}
        <li>
          <a href={p.href} target="_blank" rel="noopener noreferrer" class="work-link">
            <span class="work-name">
              {p.name}
              <ArrowUpRight size={18} class="work-arrow" />
              <span class="period">{p.period}</span>
            </span>
            <span class="work-desc">
              {p.desc}
              <span class="stack">
                {#each p.stack as s, i}
                  <span class="tag">{s}</span>{#if i < p.stack.length - 1}<span class="sep">·</span
                    >{/if}
                {/each}
              </span>
            </span>
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

  .stack {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-top: 0.5rem;
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--color-theme-subtle);
  }

  .tag {
    display: inline-block;
  }

  .sep {
    color: var(--color-sunset-amber-300);
  }
</style>
