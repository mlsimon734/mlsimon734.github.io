# Project Conventions

## Package Manager

Use `bun` — not `npm`. All commands: `bun run`, `bun install`, `bunx`, etc.

## Stack

- SvelteKit 2 + Svelte 5 + Tailwind CSS 4 + TypeScript
- Static site (GitHub Pages) via `@sveltejs/adapter-static`

## Linting & Formatting

- `bun run lint` — oxlint (lints `<script>` blocks of `.svelte` plus `.ts`/`.js`)
- `bun run lint:fix` — apply oxlint auto-fixes
- `bun run format` — prettier (with `prettier-plugin-svelte` + `prettier-plugin-tailwindcss`)
- `bun run format:check` — verify formatting without writing
- Config in `.prettierrc`: 2-space, double quotes, trailing commas, 100 col

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
