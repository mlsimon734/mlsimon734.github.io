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
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.05rem 0.5rem 0.1rem 0.4rem;
    margin: 0 0.05rem;
    border-radius: 0.3rem;
    background: color-mix(in srgb, var(--active-color) 9%, transparent);
    border: 1px solid color-mix(in srgb, var(--active-color) 22%, transparent);
    color: var(--active-color);
    font-weight: 500;
    text-decoration: none;
    line-height: 1.35;
    vertical-align: baseline;
    white-space: nowrap;
    transition:
      background-color 0.2s,
      border-color 0.2s,
      transform 0.2s;
  }

  :global(html[data-theme="dark"]) .org-chip {
    --active-color: var(--chip-color-dark);
    background: color-mix(in srgb, var(--active-color) 14%, transparent);
    border-color: color-mix(in srgb, var(--active-color) 32%, transparent);
  }

  .org-chip:hover {
    background: color-mix(in srgb, var(--active-color) 16%, transparent);
    border-color: color-mix(in srgb, var(--active-color) 36%, transparent);
    transform: translateY(-1px);
  }

  :global(html[data-theme="dark"]) .org-chip:hover {
    background: color-mix(in srgb, var(--active-color) 24%, transparent);
    border-color: color-mix(in srgb, var(--active-color) 48%, transparent);
  }

  .org-chip-logo {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    flex-shrink: 0;
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

  .org-chip-name {
    font-size: 0.95em;
  }
</style>
