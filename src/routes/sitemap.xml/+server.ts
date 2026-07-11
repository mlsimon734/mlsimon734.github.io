import { execSync } from "node:child_process";

// Prerendered at build time by adapter-static; git is only needed then.
export const prerender = true;

const SITE = "https://mlsimon.com";

interface SitemapPage {
  path: string;
  priority: string;
  /** Paths whose git history determines this page's lastmod. */
  sources: string[];
}

const PAGES: SitemapPage[] = [
  { path: "/", priority: "1.0", sources: ["src/routes/+page.svelte", "src/lib"] },
  { path: "/experience", priority: "0.8", sources: ["src/routes/experience"] },
  { path: "/projects", priority: "0.8", sources: ["src/routes/projects"] },
  { path: "/writing", priority: "0.6", sources: ["src/routes/writing"] },
];

function lastCommitDate(sources: string[]): string {
  const dated = execSync(`git log -1 --format=%cs -- ${sources.join(" ")}`)
    .toString()
    .trim();
  // Shallow clones may have no history for a path; fall back to the tip commit.
  return dated || execSync("git log -1 --format=%cs").toString().trim();
}

export function GET(): Response {
  const urls = PAGES.map(
    (page) =>
      `  <url>\n` +
      `    <loc>${SITE}${page.path}</loc>\n` +
      `    <lastmod>${lastCommitDate(page.sources)}</lastmod>\n` +
      `    <priority>${page.priority}</priority>\n` +
      `  </url>`,
  ).join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

  return new Response(body, {
    headers: { "Content-Type": "application/xml" },
  });
}
