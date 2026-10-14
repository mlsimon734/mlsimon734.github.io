import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { mdsvex } from "mdsvex";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { execSync } from "node:child_process";

const lastUpdate = execSync("git log -1 --format=%cs").toString().trim();
const currentYear = new Date().getFullYear();

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit({
      extensions: [".svelte", ".md"],
      preprocess: [vitePreprocess(), mdsvex({ extensions: [".md"] })],
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
    }),
  ],
  define: {
    __LAST_UPDATE__: JSON.stringify(lastUpdate),
    __CURRENT_YEAR__: JSON.stringify(currentYear),
  },
});
