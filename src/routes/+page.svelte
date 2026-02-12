<script lang="ts">
  import { fly } from "svelte/transition";
  import { ArrowUpRight } from "lucide-svelte";
  import { SiMeta } from "@icons-pack/svelte-simple-icons";
  import AsciiHorizon from "$lib/components/AsciiHorizon.svelte";
  import AsciiDivider from "$lib/components/AsciiDivider.svelte";
  import SocialLinks from "$lib/components/SocialLinks.svelte";
  import OrgChip from "$lib/components/OrgChip.svelte";
  import ConfluentLogo from "$lib/components/logos/ConfluentLogo.svelte";
  import ExcavaiteLogo from "$lib/components/logos/ExcavaiteLogo.svelte";
  import { inview } from "$lib/actions/inview";

  const orgColor = {
    ucla: { light: "#2774AE", dark: "#5fa3d9" },
    excavaite: { light: "#d97706", dark: "#fbbf24" },
    meta: { light: "#1877f2", dark: "#60a5fa" },
    confluent: { light: "#173361", dark: "#7aa6d4" },
    agrofocal: { light: "#4d7c0f", dark: "#a3e635" },
  };

  type Work = {
    name: string;
    href: string;
    desc: string;
    aside?: string;
    kind: "project" | "paper";
  };

  const selectedWork: Work[] = [
    {
      kind: "project",
      name: "Excavaite / Sentry",
      href: "https://github.com/excavaite",
      desc: "AI-native semantic IP loss prevention — screens emails and attachments for potential inventions and cross-references against patent portfolios.",
      aside: "CTO & Co-founder",
    },
    {
      kind: "paper",
      name: "Paper Knowledge Graphs",
      href: "https://github.com/mlsimon734",
      desc: "Novel representations of academic papers as logical dependency graphs between assumptions, methodology decisions, and conclusions.",
      aside: "In prep · 2026",
    },
    {
      kind: "paper",
      name: "AV Diffusion Models",
      href: "https://github.com/mlsimon734",
      desc: "ControlNet-style diffusion trained on driving images for domain transfer to augment the nuScenes dataset.",
      aside: "UCLA Zhou Lab · 2024",
    },
    {
      kind: "project",
      name: "CLIP Explainability",
      href: "https://ucladeepvision.github.io/CS188-Projects-2023Winter/2023/03/29/team33-CLIP-CoCa.html",
      desc: "Attention heatmap analysis and classification benchmarks exploring how CLIP represents visual concepts.",
      aside: "Deep Learning",
    },
    {
      kind: "project",
      name: "Agrofocal CV Pipeline",
      href: "https://github.com/mlsimon734",
      desc: "PyTorch computer vision models for grape bunch and leaf mineral deficiency detection across 10+ varieties.",
      aside: "80%+ throughput improvement",
    },
  ];
</script>

<div class="layout-md text-lg">
  <header class="home-header" in:fly={{ y: 20, duration: 800, delay: 200 }}>
    <div class="home-header-text">
      <p class="home-tagline">
        <span class="muted">is an</span> aspiring polymath,<span class="muted">
        </span> <br />
        researcher<span class="muted">,</span> engineer<span class="muted"
          >,</span
        > <br />
        <span class="muted">and</span> builder<span class="muted">.</span>
      </p>

      <div class="home-bio space-y-5 mt-6">
        <p>
          I'm an incoming (accidental) CS PhD student at
          <OrgChip
            name="UCLA"
            href="https://www.cs.ucla.edu"
            color={orgColor.ucla.light}
            darkColor={orgColor.ucla.dark}
            logoSrc="/logos/ucla.png"
          />
          advised by
          <a href="https://emjun.github.io" class="link">Eunice Jun</a>. I work
          at the <em>intersection of HCI and AI</em>, developing models and
          software that empowers people to
          <em>think, learn, and create</em>.
        </p>

        <p>
          I recently CTO'd at
          <OrgChip
            name="Excavaite"
            href="https://excavaite.com"
            color={orgColor.excavaite.light}
            darkColor={orgColor.excavaite.dark}
            logo={excavaiteLogo}
          />, an <em>agentic</em> Intellectual Property mining and protection platform.
        </p>

        <p>
          Previously, I worked at
          <OrgChip
            name="Meta"
            href="https://about.meta.com"
            color={orgColor.meta.light}
            darkColor={orgColor.meta.dark}
            icon={SiMeta}
          />
          on CodeGen, and at
          <OrgChip
            name="Confluent"
            href="https://www.confluent.io"
            color={orgColor.confluent.light}
            darkColor={orgColor.confluent.dark}
            logo={confluentLogo}
          />
          on core Kafka Metadata. Earlier, I trained CV models for grape and leaf-mineral
          analysis at
          <OrgChip
            name="Agrofocal"
            href="https://www.agrofocal.com"
            color={orgColor.agrofocal.light}
            darkColor={orgColor.agrofocal.dark}
          />, and explored diffusion for autonomous-vehicle perception and
          sythetic data augmentation in the
          <OrgChip
            name="UCLA VAIL Lab"
            href="https://bzhou.ucla.edu"
            color={orgColor.ucla.light}
            darkColor={orgColor.ucla.dark}
            logoSrc="/logos/ucla.png"
          />.
        </p>
      </div>

      {#snippet excavaiteLogo()}<ExcavaiteLogo />{/snippet}
      {#snippet confluentLogo()}<ConfluentLogo />{/snippet}

      <SocialLinks class="mt-6" />
    </div>
    <img
      src="/headshot.jpg"
      alt="Michael Simon"
      width="160"
      height="200"
      loading="eager"
      class="home-headshot"
      onerror={(e) =>
        ((e.currentTarget as HTMLImageElement).style.display = "none")}
    />
  </header>

  <AsciiDivider />

  <section class="mt-16 sm:mt-20 reveal" use:inview>
    <h2 class="heading2">
      <span class="text-sunset-amber-300 font-mono text-base font-normal mr-2"
        >//</span
      >selected work
    </h2>
    <ul class="space-y-2">
      {#each selectedWork as item}
        <li>
          <a
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            class="work-link"
          >
            <span class="work-name">
              {item.name}
              <ArrowUpRight size={18} class="work-arrow" />
            </span>
            <span class="work-desc">
              {item.desc}
              {#if item.aside}
                <span class="aside" class:paper={item.kind === "paper"}
                  >— {item.aside}</span
                >
              {/if}
            </span>
          </a>
        </li>
      {/each}
    </ul>
  </section>

  <AsciiDivider />

  <section class="mt-16 sm:mt-20 reveal" use:inview>
    <div in:fly={{ y: 20, duration: 800, delay: 200 }}>
      <AsciiHorizon />
    </div>
  </section>
</div>

<style>
  .home-header {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 2rem;
    align-items: start;
  }

  .home-tagline {
    color: var(--color-theme-heading);
    font-size: 1.5rem;
    font-weight: 600;
    line-height: 1.45;
    margin: 0;
  }

  .home-tagline .muted {
    color: var(--color-theme-subtle);
    font-weight: 400;
  }

  .home-bio {
    color: var(--color-theme-text);
  }

  .home-bio :global(em) {
    font-family: var(--font-serif);
    font-style: italic;
    font-size: 1.05em;
    letter-spacing: -0.005em;
  }

  .home-headshot {
    width: 160px;
    height: 200px;
    border-radius: 0.75rem;
    object-fit: cover;
    border: 1px solid var(--color-theme-border);
    box-shadow: 0 1px 0 rgba(0, 0, 0, 0.04);
  }

  .aside {
    color: var(--color-theme-subtle);
  }

  .aside.paper {
    font-family: var(--font-mono);
    font-size: 0.875rem;
    color: var(--color-sunset-amber-500);
  }

  @media (max-width: 640px) {
    .home-header {
      grid-template-columns: 1fr;
    }
    .home-headshot {
      width: 120px;
      height: 150px;
      order: -1;
      justify-self: start;
    }
    .home-tagline {
      font-size: 1.25rem;
    }
  }
</style>
