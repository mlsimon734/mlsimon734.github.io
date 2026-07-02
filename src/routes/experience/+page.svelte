<script lang="ts">
  import { slide } from "svelte/transition";
  import AsciiDivider from "$lib/components/AsciiDivider.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import { inview } from "$lib/actions/inview";

  type Entry = {
    period: string;
    role: string;
    org: string;
    location?: string;
    bullets: string[];
    defaultOpen?: boolean;
  };

  const education: Entry[] = [
    {
      period: "2026–",
      role: "PhD, Computer Science",
      org: "UCLA",
      location: "Los Angeles, CA",
      bullets: [
        "Continuing on from MS. Research at the intersection of HCI and AI — knowledge representations of academic literature, adaptive interfaces.",
      ],
    },
    {
      period: "2024–2026",
      role: "MS, Computer Science",
      org: "UCLA",
      location: "Los Angeles, CA",
      bullets: ["Advised by Eunice Jun. HCI + AI research."],
    },
    {
      period: "2020–2024",
      role: "BS, Computer Science",
      org: "UCLA",
      location: "Los Angeles, CA",
      bullets: ["Probably should've finished the mathematics double major..."],
    },
  ];

  const experience: Entry[] = [
    {
      period: "2024–2026",
      role: "CTO & Co-founder",
      org: "Excavaite",
      defaultOpen: true,
      bullets: [
        "Built terabyte-scale patent corpus with RaBitQ-indexed vector search.",
        "Designed agentic systems for patent leakage prevention, automated patent drafting, and claim-chart generation; instrumented automated evals to gate model and prompt changes.",
        "Raised pre-seed ($400k+); landed 6-figure pilot with a Fortune 500 partner; managed 8+ contractor team.",
      ],
    },
    {
      period: "2023–2024",
      role: "Undergraduate Researcher",
      org: "VAIL Lab",
      defaultOpen: true,
      bullets: [
        "Worked on diffusion models for synthetic driving-data generation, resulting in a NeurIPS 2024 publication.",
        "Created a unified terabyte-scale driving dataset by combining 4K YouTube driving footage with open-source datasets.",
      ],
    },
    {
      period: "Summer 2023",
      role: "Software Engineer Intern",
      org: "Confluent",
      bullets: [
        "Built a last-resort metadata recovery tool (Java) for the Kafka Metadata Team — reduced metadata-related cluster failure recovery from hours to minutes.",
        "Wrote a user-facing runbook and design doc to support tool usage and ongoing development.",
      ],
    },
    {
      period: "Summer 2022",
      role: "Software Engineer Intern",
      org: "Meta",
      bullets: [
        "Built a centralized Hack code-generation framework for the Metrics Platform Governance team — cut data onboarding from ~1 hr to ~5 min.",
        "Added parallelism to script execution, reducing runtimes 4×.",
      ],
    },
    {
      period: "2021–2023",
      role: "Machine Learning Intern",
      org: "Agrofocal Technologies",
      bullets: [
        "Implemented a mixed-precision quantization pipeline, improving inference throughput 80%+ and cutting latency 2×.",
        "Implemented a state-of-the-art model architecture, improving object detection by 0.15+ mAP.",
      ],
    },
  ];

  /*
  const coursework: { group: string; items: string[] }[] = [
    {
      group: "ai / ml",
      items: [
        "Natural Language Processing (CS 263)",
        "Neurosymbolic Reasoning w/ LLMs (CS 269)",
        "Advanced Deep Learning (EE 239AS)",
        "AI & Climate Change (CS 269)",
        "Deep Learning & Computer Vision (CS 188)",
        "Neural Networks & Deep Learning (EE C147)",
        "Machine Learning (CS M146)",
        "Artificial Intelligence (CS 161)",
      ],
    },
    {
      group: "hci",
      items: [
        "Intro to Human-Computer Interaction (CS 239)",
        "Communicating w/ Computers (CS 269)",
      ],
    },
    {
      group: "systems",
      items: [
        "Big Data Systems (CS 214)",
        "Cloud Software Systems (CS 239)",
        "Operating Systems (CS 111)",
        "Computer Networks (CS 118)",
      ],
    },
    {
      group: "theory",
      items: [
        "Automated Reasoning Theory & Applications (CS 264A)",
        "Algorithms & Complexity (CS 180)",
        "Formal Languages & Automata (CS 181)",
      ],
    },
    {
      group: "math",
      items: [
        "Real Analysis I & II (MATH 131A/B)",
        "Linear Algebra (MATH 115A)",
        "Optimization (MATH 164)",
        "Probability (STATS 100A)",
        "Discrete Structures (MATH 61)",
        "Networks (MATH 168)",
      ],
    },
  ];
  */

  type Pub = {
    authors: string;
    title: string;
    venue: string;
    year: string;
    href?: string;
    status?: string;
  };
  const publications: Pub[] = [
    {
      authors: "M. Simon*, Y. Xiao*, N. Agarwal, E. Jun  (* equal contribution)",
      title:
        "Syrup: An Intermediate Representation for Bidirectional Human-AI Scientific Reasoning",
      venue: "",
      year: "2026",
      status: "under review",
    },
    {
      authors: "Y. Zhou, M. Simon, Z. Peng, S. Mo, H. Zhu, M. Guo, B. Zhou",
      title: "SimGen: Simulator-conditioned Driving Scene Generation",
      venue: "NeurIPS 2024",
      year: "2024",
    },
  ];

  const awards: { period: string; text: string }[] = [
    { period: "2021–2024", text: "Dean’s Honor List, UCLA (4×)" },
    { period: "2020", text: "National Merit Finalist" },
    { period: "2020", text: "Marilyn Bussey IB Scholarship, Sequoia HS" },
    { period: "2020", text: "Sequoia Math Award, Sequoia HS" },
    { period: "2020", text: "IB Diploma" },
    {
      period: "2020",
      text: "RCM Level 10 First-Class Honors — Piano Practical, Music Theory, Music History",
    },
    {
      period: "2017–2020",
      text: "AMC 10/12 Top Scorer, Sequoia HS (3 consecutive years)",
    },
  ];

  let expOpen = $state(experience.map((e) => !!e.defaultOpen));

  const service: Entry[] = [
    {
      period: "2026",
      role: "Teaching Assistant",
      org: "UCLA",
      bullets: ["Upper Division CS 188: AI for Human Interaction."],
    },
    {
      period: "2025",
      role: "Reviewer",
      org: "ICLR 2026",
      bullets: [],
    },
  ];
</script>

<Seo
  title="Experience"
  path="/experience"
  description="Education, experience, publications, awards, and teaching by Michael Simon."
/>

<div class="layout-md text-lg">
  <h1 class="sr-only">Experience</h1>

  <section class="reveal" use:inview>
    <h2 class="heading2">
      <span class="text-sunset-amber-300 mr-2 font-mono text-base font-normal">//</span>education
    </h2>
    {#each education as e}
      <div class="cv-row">
        <span class="cv-period">{e.period}</span>
        <div class="cv-content">
          <div>
            <span class="cv-role">{e.role}</span>
            <span class="cv-org">
              · {e.org}{#if e.location}, {e.location}{/if}</span
            >
          </div>
          <ul>
            {#each e.bullets as b}
              <li>{b}</li>
            {/each}
          </ul>
        </div>
      </div>
    {/each}
  </section>

  <AsciiDivider />

  <section class="reveal mt-16" use:inview>
    <h2 class="heading2">
      <span class="text-sunset-amber-300 mr-2 font-mono text-base font-normal">//</span>experience
    </h2>
    {#each experience as e, i}
      <div class="cv-row">
        <span class="cv-period">{e.period}</span>
        <div class="cv-content">
          <button
            type="button"
            class="exp-toggle"
            aria-expanded={expOpen[i]}
            aria-controls={`exp-bullets-${i}`}
            onclick={() => (expOpen[i] = !expOpen[i])}
          >
            <span>
              <span class="cv-role">{e.role}</span>
              <span class="cv-org"> · {e.org}</span>
            </span>
            <span class="exp-toggle-icon" aria-hidden="true">{expOpen[i] ? "−" : "+"}</span>
          </button>
          {#if expOpen[i]}
            <ul id={`exp-bullets-${i}`} transition:slide={{ duration: 180 }}>
              {#each e.bullets as b}
                <li>{b}</li>
              {/each}
            </ul>
          {/if}
        </div>
      </div>
    {/each}
  </section>

  <AsciiDivider />

  <section class="reveal mt-16" use:inview>
    <h2 class="heading2">
      <span class="text-sunset-amber-300 mr-2 font-mono text-base font-normal">//</span>publications
    </h2>
    {#each publications as p}
      <div class="cv-row">
        <span class="cv-period">{p.year}</span>
        <div class="cv-content">
          <div class="pub-title">
            {#if p.href}
              <a href={p.href} target="_blank" rel="noopener noreferrer" class="link">{p.title}</a>
            {:else}
              {p.title}
            {/if}
            {#if p.status}<span class="pub-status">[{p.status}]</span>{/if}
          </div>
          <div class="pub-meta">
            <span>{p.authors}</span>
            {#if p.venue}<span class="pub-venue"> · {p.venue}</span>{/if}
          </div>
        </div>
      </div>
    {/each}
  </section>

  <AsciiDivider />

  <section class="reveal mt-16" use:inview>
    <h2 class="heading2">
      <span class="text-sunset-amber-300 mr-2 font-mono text-base font-normal">//</span>awards &
      honors
    </h2>
    {#each awards as a}
      <div class="cv-row">
        <span class="cv-period">{a.period}</span>
        <div class="cv-content">{a.text}</div>
      </div>
    {/each}
  </section>

  <AsciiDivider />

  <section class="reveal mt-16" use:inview>
    <h2 class="heading2">
      <span class="text-sunset-amber-300 mr-2 font-mono text-base font-normal">//</span>service &
      teaching
    </h2>
    {#each service as e}
      <div class="cv-row">
        <span class="cv-period">{e.period}</span>
        <div class="cv-content">
          <div>
            <span class="cv-role">{e.role}</span>
            <span class="cv-org"> · {e.org}</span>
          </div>
          <ul>
            {#each e.bullets as b}
              <li>{b}</li>
            {/each}
          </ul>
        </div>
      </div>
    {/each}
  </section>

  <!--
  <AsciiDivider />

  <section class="reveal mt-16" use:inview>
    <h2 class="heading2">
      <span class="text-sunset-amber-300 mr-2 font-mono text-base font-normal">//</span>technical
      coursework
    </h2>
    {#each coursework as c}
      <div class="cv-row">
        <span class="cv-period">{c.group}</span>
        <div class="cv-content">
          {#each c.items as item}
            <div>{item}</div>
          {/each}
        </div>
      </div>
    {/each}
  </section>
  -->
</div>

<style>
  .pub-title {
    color: var(--color-theme-heading);
    font-weight: 500;
  }

  .pub-status {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--color-sunset-amber-500);
    margin-left: 0.35rem;
  }

  .pub-meta {
    color: var(--color-theme-muted);
    font-size: 0.9375rem;
    margin-top: 0.125rem;
  }

  .pub-venue {
    color: var(--color-theme-subtle);
  }

  .exp-toggle {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    width: 100%;
    background: none;
    border: 0;
    padding: 0;
    font: inherit;
    color: inherit;
    text-align: left;
    cursor: pointer;
  }

  .exp-toggle:hover .cv-role,
  .exp-toggle:focus-visible .cv-role {
    color: var(--color-sunset-amber-500);
  }

  .exp-toggle-icon {
    font-family: var(--font-mono);
    font-size: 0.875rem;
    color: var(--color-theme-subtle);
    margin-left: 0.75rem;
    transition: color 120ms;
  }

  .exp-toggle:hover .exp-toggle-icon {
    color: var(--color-sunset-amber-500);
  }
</style>
