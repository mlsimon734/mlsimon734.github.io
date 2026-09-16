<script lang="ts">
  import { Pause, Play } from "lucide-svelte";
  let {
    paused = $bindable(false),
    reducedMotion = false,
  }: {
    paused?: boolean;
    reducedMotion?: boolean;
  } = $props();
</script>

<div class="motion-control">
  {#if reducedMotion}
    <span>Still view · reduced motion</span>
  {:else}
    <button
      onclick={() => (paused = !paused)}
      aria-label={paused ? "Play ocean animation" : "Pause ocean animation"}
    >
      {#if paused}<Play size={14} aria-hidden="true" />{:else}<Pause
          size={14}
          aria-hidden="true"
        />{/if}
      {paused ? "Play" : "Pause"}
    </button>
  {/if}
</div>

<style>
  .motion-control {
    display: flex;
    justify-content: flex-end;
    font-size: 0.8rem;
    color: var(--color-theme-muted);
  }
  button {
    display: inline-flex;
    gap: 0.4rem;
    align-items: center;
    padding: 0.5rem 0.25rem;
    min-height: 44px;
    cursor: pointer;
  }
  button:hover {
    color: var(--color-theme-text);
  }
  button:focus-visible {
    outline: 2px solid var(--color-sunset-amber-400);
    outline-offset: 3px;
    border-radius: 3px;
  }
</style>
