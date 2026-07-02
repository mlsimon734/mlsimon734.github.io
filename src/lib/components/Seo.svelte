<script lang="ts">
  import { page } from "$app/state";

  type Props = {
    title?: string;
    description?: string;
    path?: string;
    image?: string;
    type?: "website" | "profile" | "article";
    noindex?: boolean;
  };

  const siteName = "Michael Simon";
  const siteUrl = "https://mlsimon.com";
  const defaultTitle = "Michael Simon";
  const defaultDescription =
    "Michael Simon is a UCLA CS PhD student and engineer working at the intersection of HCI and AI.";

  let {
    title = defaultTitle,
    description = defaultDescription,
    path,
    image = "/headshot.jpg",
    type = "website",
    noindex = false,
  }: Props = $props();

  const fullTitle = $derived(title === defaultTitle ? title : `${title} · ${siteName}`);
  const canonicalUrl = $derived(new URL(path ?? page.url.pathname, siteUrl).toString());
  const imageUrl = $derived(new URL(image, siteUrl).toString());
</script>

<svelte:head>
  <title>{fullTitle}</title>
  <meta name="description" content={description} />
  {#if noindex}
    <meta name="robots" content="noindex" />
  {/if}
  <link rel="canonical" href={canonicalUrl} />

  <meta property="og:site_name" content={siteName} />
  <meta property="og:type" content={type} />
  <meta property="og:title" content={fullTitle} />
  <meta property="og:description" content={description} />
  <meta property="og:url" content={canonicalUrl} />
  <meta property="og:image" content={imageUrl} />

  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content={fullTitle} />
  <meta name="twitter:description" content={description} />
  <meta name="twitter:image" content={imageUrl} />
</svelte:head>
