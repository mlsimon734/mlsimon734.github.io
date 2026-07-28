# Project Conventions

## Package Manager

Use `bun` — not `npm`. All commands: `bun run`, `bun install`, `bunx`, etc.

## Stack

- SvelteKit 2 + Svelte 5 + Tailwind CSS 4 + TypeScript
- Static site (GitHub Pages) via `@sveltejs/adapter-static`

## Linting & Formatting

- `bun run lint` — oxlint (lints `<script>` blocks of `.svelte` plus
  `.ts`/`.js`)
- `bun run lint:fix` — apply oxlint auto-fixes
- `bun run format` — prettier (with `prettier-plugin-svelte` +
  `prettier-plugin-tailwindcss`)
- `bun run format:check` — verify formatting without writing
- Config in `.prettierrc`: 2-space, double quotes, trailing commas, 100 col
- Markdown overrides to 80 col with `proseWrap: "always"` — paragraphs hard-wrap
  on format, so prose diffs stay line-scoped instead of one long line. Don't
  hand-wrap; let `bun run format` do it.

## Fonts

- Serif: Newsreader (`--font-serif`)
- Sans: Source Sans 3 (`--font-sans`)
- Mono: JetBrains Mono (`--font-mono`)

## Color Palette

Warm sunset theme using CSS custom properties:

- `--color-warm-*` (50–800) — warm neutrals
- `--color-sunset-amber-*` (50–500) — primary accent
- `--color-sunset-orange-*` (400–500) — secondary accent

## Patterns

- `transition:fade` / `in:fly` for entrance animations
- `inview` action (`src/lib/actions/inview.ts`) for scroll-triggered reveals
- `aria-hidden="true"` on decorative elements
- Respect `prefers-reduced-motion`

## Blog Posts

Posts are markdown in `src/posts/`, rendered by
[mdsvex](https://mdsvex.pngwn.io/) through the existing site — there is no
separate blog platform. Drafting happens in Obsidian; publishing means copying
the finished markdown into `src/posts/`.

Frontmatter is the contract in `PostMeta` (`src/lib/posts.ts`):

```yaml
---
title: "Post Title"
date: "2026-07-25" # ISO YYYY-MM-DD; drives sort order and sitemap lastmod
description: "One sentence. Used on the index and as the meta description."
draft: true # optional
---
```

- The filename is the slug: `src/posts/lobsters-first.md` →
  `/writing/lobsters-first`.
- `draft: true` keeps a post out of the index, the sitemap, and the prerendered
  build, and marks it `noindex`. Drafts still render in `bun run dev` so you can
  read them in place.
- `/writing` and `/writing/[slug]` are prerendered; `entries()` in
  `src/routes/writing/[slug]/+page.ts` enumerates published posts so nothing
  depends on the crawler finding a link.
- `src/routes/sitemap.xml/+server.ts` picks up posts automatically.

Body styles live in the global `.prose` block in `src/app.css` — they must stay
unscoped, since the markup comes from mdsvex rather than a `.svelte` file.

**Gotcha:** mdsvex parses `{` as a Svelte expression. Escape literal braces as
`\{`, or put the run inside a fenced code block.
