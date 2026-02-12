<script lang="ts">
  import { onMount } from "svelte";
  import { fly } from "svelte/transition";
  import { X } from "lucide-svelte";

  const quotes = [
    {
      text: "Without new experiences, something inside of us sleeps. The sleeper must awaken.",
      by: "Frank Herbert",
    },
    {
      text: "Your body is not a temple, it’s an amusement park. Enjoy the ride.",
      by: "Anthony Bourdain",
    },
    {
      text: "The future is already here — it’s just not very evenly distributed.",
      by: "William Gibson",
    },
    {
      text: "Lobsters first.",
      by: "Charles Stross, Accelerando",
    },
  ];

  let visible = $state(false);
  let quoteIndex = $state(0);
  const buildDate = "2026-05";

  onMount(() => {
    function handleKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isInInput =
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (isInInput) return;

      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        visible = !visible;
        if (visible) quoteIndex = Math.floor(Math.random() * quotes.length);
      } else if (e.key === "Escape" && visible) {
        visible = false;
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  function rotate() {
    quoteIndex = (quoteIndex + 1) % quotes.length;
  }
</script>

{#if visible}
  <aside class="colophon" transition:fly={{ y: 16, duration: 240 }} aria-label="Site colophon">
    <div class="colophon-inner">
      <div class="colophon-row">
        <span class="key">built</span>
        <span>SvelteKit · Tailwind · Svelte 5 · {buildDate}</span>
      </div>
      <div class="colophon-row">
        <span class="key">type</span>
        <span>Newsreader · Source Sans 3 · JetBrains Mono</span>
      </div>
      <div class="colophon-row">
        <span class="key">horizon</span>
        <span>OffscreenCanvas · LA local time</span>
      </div>
      <button type="button" class="quote" onclick={rotate} aria-label="Show another quote">
        <span class="quote-text">“{quotes[quoteIndex].text}”</span>
        <span class="quote-by">— {quotes[quoteIndex].by}</span>
      </button>
    </div>
    <button
      type="button"
      class="close"
      onclick={() => (visible = false)}
      aria-label="Close colophon"
    >
      <X size={14} strokeWidth={1.8} />
    </button>
  </aside>
{/if}

<style>
  .colophon {
    position: fixed;
    bottom: 1rem;
    right: 1rem;
    max-width: 22rem;
    padding: 0.85rem 1rem 0.85rem 1rem;
    background: var(--color-theme-surface);
    border: 1px solid var(--color-theme-border);
    border-radius: 8px;
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.08);
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--color-theme-text);
    z-index: 50;
    display: flex;
    gap: 0.5rem;
    align-items: flex-start;
  }

  .colophon-inner {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .colophon-row {
    display: grid;
    grid-template-columns: 4.25rem 1fr;
    gap: 0.5rem;
  }

  .key {
    color: var(--color-sunset-amber-500);
  }

  .quote {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    margin-top: 0.5rem;
    padding: 0.5rem 0 0;
    border-top: 1px dotted var(--color-theme-divider);
    background: none;
    border-left: 0;
    border-right: 0;
    border-bottom: 0;
    text-align: left;
    cursor: pointer;
    font: inherit;
    color: inherit;
  }

  .quote:hover {
    color: var(--color-theme-heading);
  }

  .quote-text {
    font-family: var(--font-serif);
    font-style: italic;
    font-size: 0.875rem;
    line-height: 1.4;
    color: var(--color-theme-heading);
  }

  .quote-by {
    color: var(--color-theme-subtle);
  }

  .close {
    background: none;
    border: 0;
    padding: 2px;
    cursor: pointer;
    color: var(--color-theme-subtle);
    transition: color 0.2s;
  }

  .close:hover {
    color: var(--color-theme-heading);
  }

  @media (max-width: 480px) {
    .colophon {
      left: 1rem;
      right: 1rem;
      max-width: none;
    }
  }
</style>
