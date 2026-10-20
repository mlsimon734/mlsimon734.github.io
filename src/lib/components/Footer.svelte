<script lang="ts">
  import { page } from "$app/state";
  import SocialLinks from "./SocialLinks.svelte";
</script>

<footer class="layout-md mt-16 pb-16 sm:mt-20 sm:pb-24">
  {#if page.url.pathname !== "/"}
    <SocialLinks class="justify-center" />
  {/if}

  <p class="footer-note mt-8 text-center text-sm">
    © {__CURRENT_YEAR__} Michael Simon · updated {__LAST_UPDATE__}
  </p>
</footer>

<style>
  .footer-note {
    color: var(--color-theme-subtle);
    font-variant-numeric: tabular-nums;
  }
</style>
