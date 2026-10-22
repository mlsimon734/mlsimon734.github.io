<script lang="ts">
  import type { Component, Snippet } from "svelte";

  let {
    name,
    href,
    color,
    darkColor,
    icon,
    iconSize = 12,
    logo,
    logoSrc,
    ariaLabel,
  }: {
    name: string;
    href: string;
    color: string;
    darkColor?: string;
    icon?: Component<{ size?: number; color?: string }>;
    iconSize?: number;
    logo?: Snippet;
    logoSrc?: string;
    ariaLabel?: string;
  } = $props();
</script>

<a
  {href}
  target="_blank"
  rel="noopener noreferrer"
  class="org-chip"
  aria-label={ariaLabel}
  style="--chip-color: {color}; --chip-color-dark: {darkColor ?? color};"
>
  {#if logo}
    <span class="org-chip-logo" aria-hidden="true">{@render logo()}</span>
  {:else if logoSrc}
    <span class="org-chip-logo org-chip-logo-img" aria-hidden="true">
      <img src={logoSrc} alt="" />
    </span>
  {:else if icon}
    {@const Icon = icon}
    <span class="org-chip-logo" aria-hidden="true">
      <Icon size={iconSize} color="var(--active-color)" />
    </span>
  {/if}
  <span class="org-chip-name">{name}</span>
</a>

<style>
  .org-chip {
    --active-color: var(--chip-color);
    white-space: nowrap;
    color: var(--color-theme-heading);
    text-decoration: none;
  }

  :global(html[data-theme="dark"]) .org-chip {
    --active-color: var(--chip-color-dark);
  }

  .org-chip-name {
    text-decoration: underline;
    text-decoration-thickness: 1px;
    text-decoration-color: color-mix(in srgb, var(--color-theme-accent) 55%, transparent);
    text-underline-offset: 3px;
    transition: text-decoration-color 0.2s;
  }

  .org-chip:hover .org-chip-name {
    text-decoration-color: var(--color-theme-accent);
  }

  .org-chip-logo {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 0.875em;
    height: 0.875em;
    vertical-align: -0.075em;
  }

  .org-chip-logo :global(svg) {
    width: 100%;
    height: 100%;
  }

  .org-chip-logo-img img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    border-radius: 2px;
  }
</style>
