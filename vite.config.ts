import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { execSync } from "node:child_process";

const lastUpdate = execSync("git log -1 --format=%cs").toString().trim();
const currentYear = new Date().getFullYear();

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  define: {
    __LAST_UPDATE__: JSON.stringify(lastUpdate),
    __CURRENT_YEAR__: JSON.stringify(currentYear),
  },
});
