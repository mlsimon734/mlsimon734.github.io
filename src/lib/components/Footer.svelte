<script lang="ts">
  import AsciiDivider from "./AsciiDivider.svelte";

  type Row = { label: string; href?: string; handle: string };

  // TODO: replace Scholar/X placeholders with real values when ready.
  const links: Row[] = [
    {
      label: "GitHub",
      href: "https://github.com/mlsimon734",
      handle: "@mlsimon734",
    },
    {
      label: "LinkedIn",
      href: "https://linkedin.com/in/michael-simon02",
      handle: "michael-simon02",
    },
    {
      label: "Scholar",
      href: "https://scholar.google.com/citations?user=A9w7q54-NEUC&hl=en",
      handle: "Michael Simon",
    },
    { label: "X", href: "https://x.com/mlsimon0", handle: "@mlsimon0" },
    {
      label: "Email",
      href: "mailto:mlsimon@cs.ucla.edu",
      handle: "mlsimon@cs.ucla.edu",
    },
    // { label: "Résumé", href: "/resume.pdf", handle: "resume.pdf" },
  ];
</script>

<footer class="layout-md mt-24 sm:mt-32 text-lg pb-16 sm:pb-24">
  <AsciiDivider />

  <div class="footer-content mt-6">
    {#each links as link}
      <div class="footer-row">
        <span class="label">{link.label}</span>
        <div class="divider"></div>
        {#if link.href}
          <a
            href={link.href}
            target={link.href.startsWith("mailto:") || link.href.startsWith("/")
              ? undefined
              : "_blank"}
            rel={link.href.startsWith("http")
              ? "noopener noreferrer"
              : undefined}
            class="link"
          >
            {link.handle}
          </a>
        {:else}
          <span class="contact-value">{link.handle}</span>
        {/if}
      </div>
    {/each}
  </div>

  <p class="footer-note mt-8 font-mono text-sm text-center">
    // built with care · press <kbd>?</kbd> for the colophon
  </p>
</footer>

<style>
  .footer-content {
    display: flex;
    flex-direction: column;
  }

  .footer-row {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    padding: 0.5rem 0;
  }

  .label {
    color: var(--color-theme-subtle);
    flex-shrink: 0;
  }

  .divider {
    flex-grow: 1;
    border-bottom: 1px dotted var(--color-theme-divider);
    margin: 0 0.5rem;
    min-width: 2rem;
  }

  .contact-value {
    color: var(--color-theme-heading);
  }

  .footer-note {
    color: var(--color-theme-subtle);
  }

  kbd {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    padding: 0.05rem 0.35rem;
    border: 1px solid var(--color-theme-border);
    border-radius: 4px;
    color: var(--color-theme-muted);
  }
</style>
