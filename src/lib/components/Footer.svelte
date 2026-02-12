<script lang="ts">
  import { page } from "$app/state";

  type Row = { label: string; href?: string; handle: string };

  const links: Row[] = [
    {
      label: "GitHub",
      href: "https://github.com/mlsimon734",
      handle: "@mlsimon734",
    },
    { label: "Twitter", href: "https://x.com/mlsimon0", handle: "@mlsimon0" },
    {
      label: "Email",
      href: "mailto:mlsimon@cs.ucla.edu",
      handle: "mlsimon@cs.ucla.edu",
    },
    // { label: "Résumé", href: "/resume.pdf", handle: "resume.pdf" },
  ];
</script>

<footer class="layout-md mt-16 pb-16 text-lg sm:mt-20 sm:pb-24">
  {#if page.url.pathname !== "/"}
    <div class="footer-content">
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
              rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
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
  {/if}

  <p class="footer-note mt-8 text-center font-mono text-sm">
    // © {__CURRENT_YEAR__} Michael Simon · updated {__LAST_UPDATE__}
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
</style>
