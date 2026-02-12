<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import { Moon, Sun } from "lucide-svelte";

  const THEME_STORAGE_KEY = "theme";

  const links: { name: string; href: string }[] = [
    { name: "experience", href: "/experience" },
    { name: "writing", href: "/writing" },
    { name: "projects", href: "/projects" },
  ];

  let theme: "light" | "dark" = $state("light");

  const title = $derived.by(() => {
    const path = page.url.pathname;
    if (path === "/") return null;
    const segment = path.split("/")[1];
    return segment.charAt(0).toUpperCase() + segment.slice(1);
  });

  onMount(() => {
    const activeTheme = document.documentElement.dataset.theme;
    theme = activeTheme === "dark" ? "dark" : "light";
  });

  function toggleTheme() {
    theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }
</script>

<header class="layout-md border-warm-100 border-b">
  <div class="header-content">
    <nav class="header-nav">
      <a href="/" class="name font-serif">
        Michael Simon
        {#if title}
          <span class="text-warm-400 font-sans font-normal"> / {title}</span>
        {/if}
      </a>
      <div class="nav-actions">
        <ul class="nav-links">
          {#each links as link}
            <li>
              <a
                href={link.href}
                class="nav-link"
                class:active={page.url.pathname.startsWith(link.href)}
              >
                {link.name}
              </a>
            </li>
          {/each}
        </ul>
        <button
          type="button"
          class="theme-toggle"
          onclick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          aria-pressed={theme === "dark"}
        >
          {#if theme === "dark"}
            <Sun size={14} strokeWidth={1.8} />
            <span>light</span>
          {:else}
            <Moon size={14} strokeWidth={1.8} />
            <span>dark</span>
          {/if}
        </button>
      </div>
    </nav>
  </div>
</header>

<style>
  .header-content {
    padding-bottom: 1rem;
  }

  .header-nav {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: baseline;
    gap: 1rem;
  }

  .name {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--color-theme-heading);
    text-decoration: none;
  }

  .name:hover {
    text-decoration: underline;
    text-decoration-color: var(--color-sunset-amber-400);
  }

  .nav-links {
    display: flex;
    gap: 1.25rem;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .nav-link {
    color: var(--color-theme-muted);
    text-decoration: none;
    transition:
      color 0.2s,
      text-decoration-color 0.2s;
  }

  .nav-link:hover {
    color: var(--color-theme-heading);
    text-decoration: underline;
    text-decoration-color: var(--color-sunset-amber-400);
    text-underline-offset: 3px;
  }

  .active {
    color: var(--color-theme-heading);
    text-decoration: underline;
    text-decoration-color: var(--color-sunset-amber-400);
    text-underline-offset: 3px;
  }

  .nav-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.9rem;
  }

  .theme-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.35rem 0.6rem;
    border: 1px solid var(--color-theme-border);
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-theme-surface) 84%, transparent);
    color: var(--color-theme-muted);
    font: inherit;
    line-height: 1;
    cursor: pointer;
    transition:
      color 0.2s,
      border-color 0.2s,
      background-color 0.2s;
  }

  .theme-toggle:hover {
    color: var(--color-theme-heading);
    border-color: var(--color-sunset-amber-400);
    background: var(--color-theme-hover);
  }

  @media (max-width: 420px) {
    .header-nav {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }
  }
</style>
