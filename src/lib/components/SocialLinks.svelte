<script lang="ts">
  import { Mail, GraduationCap, FileText } from "@lucide/svelte";
  import { SiGithub, SiX } from "@icons-pack/svelte-simple-icons";
  import AiCv from "./AiCv.svelte";
  import SiLinkedin from "./SiLinkedin.svelte";

  let { showCvLabel = false, class: className = "" }: { showCvLabel?: boolean; class?: string } =
    $props();

  // TODO: replace placeholders with real values when ready.
  const links = [
    {
      label: "Email",
      href: "mailto:mlsimon@cs.ucla.edu",
      icon: Mail,
    },
    {
      label: "GitHub",
      href: "https://github.com/mlsimon734",
      icon: SiGithub,
    },
    {
      label: "Google Scholar",
      href: "https://scholar.google.com/citations?user=A9w7q54-NEUC&hl=en",
      icon: GraduationCap,
    },
    {
      label: "LinkedIn",
      href: "https://linkedin.com/in/michael-simon02",
      icon: SiLinkedin,
    },
    {
      label: "X",
      href: "https://x.com/mlsimon0",
      icon: SiX,
    },
  ] as const;
</script>

<div class="social-links {className}">
  {#each links as link}
    <a
      href={link.href}
      target={link.href.startsWith("mailto:") ? undefined : "_blank"}
      rel={link.href.startsWith("mailto:") ? undefined : "noopener noreferrer"}
      aria-label={link.label}
      title={link.label}
      class="social-icon"
    >
      <link.icon size={18} strokeWidth={1.6} />
    </a>
  {/each}
  <a
    href="/cv.pdf"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="CV (PDF)"
    title="CV (PDF)"
    class="social-icon cv"
    class:with-label={showCvLabel}
  >
    <AiCv size={18} />
    {#if showCvLabel}<span class="cv-label">CV</span>{/if}
  </a>
  <a
    href="/resume.pdf"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Résumé (PDF)"
    title="Résumé (PDF)"
    class="social-icon"
  >
    <FileText size={18} strokeWidth={1.6} />
  </a>
</div>

<style>
  .social-links {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 1.25rem;
  }

  .social-icon {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    color: var(--color-theme-muted);
    text-decoration: none;
    transition: color 0.2s;
  }

  .social-icon:hover {
    color: var(--color-theme-heading);
  }

  .social-icon.with-label {
    font-size: 0.9375rem;
  }

  .cv-label {
    display: inline-block;
  }
</style>
