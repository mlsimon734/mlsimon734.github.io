import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { mdsvex } from "mdsvex";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  extensions: [".svelte", ".md"],
  preprocess: [vitePreprocess(), mdsvex({ extensions: [".md"] })],
  kit: {
    adapter: adapter({
      pages: "build",
      assets: "build",
      fallback: undefined,
      precompress: false,
      strict: true,
    }),
    prerender: {
      handleHttpError: ({ path, message }) => {
        // Placeholder static assets the user will drop in (resume PDF, headshot).
        // Don't fail the build while they're missing.
        if (path === "/resume.pdf" || path === "/headshot.jpg") return;
        throw new Error(message);
      },
      handleUnseenRoutes: ({ routes, message }) => {
        // When every post is still a draft, /writing/[slug] yields no entries and
        // the crawler never reaches it. That's expected; anything else is not.
        if (routes.some((route) => route !== "/writing/[slug]")) throw new Error(message);
      },
    },
  },
};

export default config;
