import { error } from "@sveltejs/kit";
import { listPosts, loadPost } from "$lib/posts";

export const prerender = true;

/** Prerender every published post, including any the crawler can't reach from a link. */
export async function entries() {
  const posts = await listPosts();
  return posts.map(({ slug }) => ({ slug }));
}

export async function load({ params }) {
  const post = await loadPost(params.slug);
  if (!post) error(404, `No post named "${params.slug}"`);

  // Universal load — the result is recomputed on the client rather than
  // serialized, so returning a component here is safe.
  return post;
}
