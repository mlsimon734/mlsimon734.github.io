import type { Component } from "svelte";

/** Frontmatter contract for every file in `src/posts`. */
export type PostMeta = {
  title: string;
  /** ISO `YYYY-MM-DD`. Drives sort order and the sitemap lastmod. */
  date: string;
  description: string;
  /** Drafts are excluded from the index and from prerendered entries. */
  draft?: boolean;
};

export type Post = PostMeta & { slug: string };

type PostModule = {
  default: Component;
  metadata: PostMeta;
};

const modules = import.meta.glob<PostModule>("/src/posts/*.md");

const slugOf = (path: string): string => path.slice("/src/posts/".length, -".md".length);

/** Published posts, newest first. Drafts are omitted unless `includeDrafts`. */
export async function listPosts(includeDrafts = false): Promise<Post[]> {
  const posts = await Promise.all(
    Object.entries(modules).map(async ([path, load]) => {
      const { metadata } = await load();
      return { ...metadata, slug: slugOf(path) };
    }),
  );

  return posts
    .filter((post) => includeDrafts || !post.draft)
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** Resolves a single post to its rendered component, or null when the slug is unknown. */
export async function loadPost(slug: string): Promise<{ meta: Post; content: Component } | null> {
  const load = modules[`/src/posts/${slug}.md`];
  if (!load) return null;

  const { default: content, metadata } = await load();
  return { meta: { ...metadata, slug }, content };
}
