import { listPosts } from "$lib/posts";
import { dev } from "$app/environment";

export const prerender = true;

export async function load() {
  // Drafts are visible while developing so you can read them in place.
  return { posts: await listPosts(dev) };
}
