---
title: "Essential Apps and DevTools"
date: "2026-10-13"
description:
  "The macOS apps, command-line tools, and dotfiles I use day to day, with a few lighter
  alternatives to the usual picks."
---

My current developer essentials (subject to change, in no particular order).

## macOS Apps

- **[FluidVoice](https://altic.dev/fluid)** — Speedy, local, voice-to-text dictation with cleanup.
  It even has meeting recording now! In my opinion, heading towards being a free, no-brainer app
  better than SuperWhisper/Granola etc.
- **[Karabiner-Elements](https://karabiner-elements.pqrs.org)** — I remap the Caps Lock to Hyperkey
  (cmd+shift+ctrl+option) when held and Escape when tapped in a terminal, and plain Caps Lock
  everywhere else. Classic key remapping app, fully customizable.
- **[BetterCmdTab](https://github.com/rokartur/BetterCmdTab)** — The stock Cmd-Tab only cycles
  applications; this one cycles individual windows, with live previews and fuzzy search on `/`. It
  also surfaces minimized and hidden windows and can scope to the current Space or app with cmd+`.
  Free!
- **[Tinycast](https://abue-ammar.github.io/tinycast/)** — A launcher in the Raycast mold (app
  search, clipboard history, calculator, window management, snippets) that is native Swift which is
  a pro since Raycast went Electron. It can also import a Raycast setup and run Raycast extensions,
  so switching is largely frictionless, with some exceptions.
- **[1Password](https://1password.com)** — Free options like Bitwarden exist, and Apple Passwords
  can be sufficient. I find 1Password to be on the cutting edge of password tech and autofill
  though. The browser extension covers autofill in every browser below.
- **[Crisp](https://github.com/didriksg/Crisp)** — Adds the HiDPI scaled resolutions macOS hides on
  external monitors that aren't Retina, so a 1440p panel can look sharp instead of soft or tiny. It
  does that one job and nothing else.
- **[AirStats](https://airstats.app)** — Menu bar monitor for CPU, GPU, memory, network, disk,
  battery, and temperature, with a drop-down panel and an optional desktop widget. It's a single
  small MIT-licensed process with no helper daemon or telemetry, which is the reason I switched to
  it over [Stats](https://github.com/exelban/stats). Apple silicon only.
- **[CodexBar](https://codexbar.app)** — Menu bar usage monitor for Codex and Claude. Sorta buggy
  and occasionally resource hog, but nothing bad enough to use something else

- **[BoringNotch](https://github.com/TheBoredTeam/boring.notch)** turns the notch into a media and
  status HUD. Cool project, slow release cycle. I like music living in the notch.
- **[Thaw](https://github.com/thaw-app/Thaw)** keeps the menu bar uncluttered. Evolved from the
  [Ice](https://github.com/jordanbaird/Ice) project.
- **[Reminders MenuBar](https://github.com/DamascenoRafael/reminders-menubar)** shows Apple
  Reminders in the menu bar so you can add and check off tasks without opening the app.
- **[BetterMouse](https://better-mouse.com)** fixes scrolling and button mapping for Logitech mice.
- **[IINA](https://iina.io)** is a free, open-source media player that plays almost any format.
- **[Keka](https://www.keka.io)** handles archives, including formats Finder can't open.
- **[ScreenZen](https://screenzen.co)** blocks distracting apps and sites for focus. Best addictive
  app management tool I've ever used. Hits the core issue, which isn't reaching for apps like
  Twitter (X), but 10x the time intended after getting sucked in.
- **[Recordly](https://github.com/webadderallorg/Recordly)** is a free, open-source screen recorder
  with a built-in editor and auto-zoom, for demos.
- **[Tailscale](https://tailscale.com)** connect to your other machines with ease.
- **[QLMarkdown](https://github.com/sbarex/QLMarkdown)** and
  **[Syntax Highlight](https://github.com/sbarex/SourceCodeSyntaxHighlight)** make Quick Look render
  Markdown and highlight source files (`brew install --cask qlmarkdown syntax-highlight`).

And the Claude desktop and Codex/ChatGPT desktop apps go without saying...

## Browsers

- **[Zen](https://zen-browser.app)** — Firefox-based browser with vertical tabs and workspaces.
  Daily driver.
- **[Helium](https://github.com/imputnet/helium)** — Privacy-focused Chromium browser. Still support
  mv2 and ublock origin.

Extensions:

- **[uBlock Origin](https://github.com/gorhill/uBlock)** and its Manifest V3 version, **uBlock
  Origin Lite**, for content blocking, depending on what the browser supports.
- **[Vimium C](https://github.com/gdh1995/vimium-c)** — Vim-style keyboard navigation in Chromium
  and Firefox.
- **[Vimari](https://github.com/televator-apps/vimari)** — The same idea for Safari.
- **[Refined GitHub](https://github.com/refined-github/refined-github)** — Fixes small GitHub
  annoyances, like hiding whitespace-only diffs.
- **[Dark Reader](https://darkreader.org)** — Dark mode for sites that don't have one.
- **[Auto Tab Discard](https://github.com/rNeomy/auto-tab-discard)** — Unloads idle tabs to save
  memory.
- **[Unhook](https://unhook.app)** — Hides YouTube recommendations and other distractions.
- **[Minimal Theme for Twitter](https://github.com/typefully/minimal-twitter)** and **Sink It for
  Reddit** — Cleaner layouts for Twitter and Reddit.
- **[The Camelizer](https://camelcamelcamel.com/camelizer)** — Amazon price history from
  camelcamelcamel.
- **[Readwise](https://readwise.io)** — Highlights from the web go into my Readwise library.
- **[Bonjourr](https://bonjourr.fr)** — A minimal new-tab page.

Also in the browser, covered with their apps: 1Password, Zotero Connector, Obsidian Web Clipper, and
Raindrop.

## Terminal & Homebrew CLI Essentials

Homebrew installs (`brew install ...`) except where noted.

- **[herdr](https://herdr.dev)** — Terminal workspace manager built for running AI coding agents:
  worktrees, sessions, and tabs per project, so several agents can work in parallel without stepping
  on each other. Pretty much never reach for tmux anymore nowadays. I ported over a lot of tmux
  keybinds though for continuity.
- **[ripgrep](https://github.com/BurntSushi/ripgrep)** (`rg`) — Fast recursive file search that
  respects `.gitignore`.
- **[fd](https://github.com/sharkdp/fd)** — Simpler, faster `find`.
- **[fzf](https://github.com/junegunn/fzf)** — Fuzzy finder for shell history, files, and git
  commits.
- **[zoxide](https://github.com/ajeetdsouza/zoxide)** — A smarter `cd` (`z`) that learns which
  directories you use.
- **[eza](https://github.com/eza-community/eza)** — `ls` with colors, tree view, and git status.
- **[bat](https://github.com/sharkdp/bat)** — `cat` with syntax highlighting and line numbers.
- **[yazi](https://github.com/sxyazi/yazi)** — Terminal file manager with image previews.
- **[jq](https://jqlang.github.io/jq/)** — JSON processing on the command line.
- **[topgrade](https://github.com/topgrade-rs/topgrade)** — One command to upgrade Homebrew, the App
  Store, shell and Neovim plugins, and more. I'm a compulsive updater, so I use this daily!
- **[btop](https://github.com/aristocratos/btop)** — Terminal resource monitor.
- **[tlrc](https://github.com/tldr-pages/tlrc)** (`tldr`) — Short community cheat sheets for
  commands.
- **[glow](https://github.com/charmbracelet/glow)** — Terminal Markdown renderer.
- **[typst](https://typst.app)** — Markup-based typesetting system, a faster alternative to LaTeX
  for simple documents.
- **[pandoc](https://pandoc.org)** — Document converter, mostly Markdown → PDF/LaTeX for
  submissions.

Git:

- **[tig](https://jonas.github.io/tig/)** — Terminal browser for git history. Good for "what
  happened to this file / this line".
- **[lazygit](https://github.com/jesseduffield/lazygit)** — TUI for staging chunks, interactive
  rebases, and diff previews.
- **[git-delta](https://github.com/dandavison/delta)** (`delta`) — Syntax-highlighted, side-by-side
  diff pager. Set it once in `.gitconfig`.
- **[gh](https://cli.github.com)** — GitHub CLI for pull requests, releases, and Actions.

Project and environment plumbing:

- **[just](https://github.com/casey/just)** — Per-project command runner. Like Make without the
  build semantics.
- **[uv](https://docs.astral.sh/uv)** — Python package and project manager. Fast enough that
  throwaway environments are cheap.
- **[pixi](https://pixi.sh)** — Better conda in every way, with a lockfile.
- **[mise](https://mise.jdx.dev)** — Runtime version manager, for Go, Ruby, Erlang, and Elixir.
- **[prek](https://github.com/j178/prek)** — Drop-in `pre-commit` replacement written in Rust.

### Zotero

The [Zotero Connector](https://www.zotero.org/download/connectors) browser extension saves papers
from the browser into the library. Plugins I use:

- **[Better BibTeX](https://retorque.re/zotero-better-bibtex/)** — Stable citation keys and a `.bib`
  file that auto-exports, so LaTeX projects stay in sync with the library.
- **[ZotMoov](https://github.com/wileyyugioh/zotmoov)** — Moves and renames attachments into a
  folder you control, so PDFs stay on disk and in cloud sync. Maintained replacement for ZotFile.
- **[Bionic for Zotero](https://github.com/euclpts/bionic-for-zotero)** — Bolds word stems in the
  PDF reader. Sounds silly, but it helps me get through a reading pile.

### Around it

- **[Obsidian](https://obsidian.md)** — The notes vault, leaning on
  [Dataview](https://blacksmithgu.github.io/obsidian-dataview/) for querying notes as a database,
  [Templater](https://silentvoid13.github.io/Templater/) for note scaffolding,
  [Excalidraw](https://github.com/zsviczian/obsidian-excalidraw-plugin) for diagrams,
  [Omnisearch](https://github.com/scambier/obsidian-omnisearch) for search that tolerates my
  spelling, and Paper Note Filler for turning an arXiv ID or DOI into a stub note. Newer additions:
  - **[Notebook Navigator](https://github.com/johansan/notebook-navigator)** replaces the default
    file explorer with a two-pane view: folder tree and tags on one side, note list with previews on
    the other, plus pinned notes and keyboard navigation.
  - **[Git](https://github.com/Vinzent03/obsidian-git)** backs the vault up to a repository
    automatically.
  - **[Completr](https://github.com/tth05/obsidian-completr)** and
    **[Quick LaTeX](https://github.com/joeyuping/quick_latex_obsidian)** speed up writing: the first
    autocompletes LaTeX, frontmatter, and prose, the second adds shorthand for math.
  - **Better Paste** cleans up pasted content, like stripping tracking from links, saving images to
    the vault, and unwrapping terminal output. **Vimrc Support** loads a startup file for Vim
    keybindings, and **ZotFlow** connects the vault to Zotero.
- **[Skim](https://skim-app.sourceforge.io)** — PDF reader with SyncTeX support, basically for LaTeX
  live preview when editing in neovim.
- **[MacTeX](https://www.tug.org/mactex/)** — Full TeX distribution.
- **[Obsidian Web Clipper](https://obsidian.md/clipper)** and **[Raindrop.io](https://raindrop.io)**
  — Other capture paths: Raindrop for links I want to find again, the clipper (a browser extension)
  for single pages.

## AI-Assisted Development

- **[VS Code](https://code.visualstudio.com)** — Editor for when I want a mouse and a real diff
  view.

## Shell, Development Environment & Dotfiles

- **Zsh & Zimfw** — [Zimfw](https://zimfw.sh) for Zsh modules, prompt, and completion, with fast
  startup.
- **Dotfiles Repository** — Managed with **[chezmoi](https://www.chezmoi.io)**: Zsh, Neovim, Git
  config, and terminal themes.
- **Neovim Configuration** — [LazyVim](https://www.lazyvim.org) as the base, with per-language
  extras enabled:
  - Plugin manager: [Lazy.nvim](https://github.com/folke/lazy.nvim)
  - Syntax parser: [nvim-treesitter](https://github.com/nvim-treesitter/nvim-treesitter)
  - Fuzzy picker and file explorer: [snacks.nvim](https://github.com/folke/snacks.nvim)
  - Completion: [blink.cmp](https://github.com/Saghen/blink.cmp)
  - Language Server Protocol: `nvim-lspconfig` +
    [mason.nvim](https://github.com/mason-org/mason.nvim)
- **[tmux](https://github.com/tmux/tmux)** — Sessions keyed to the working directory, so `t` in any
  project creates or reattaches. Prefix is `C-Space`;
  [vim-tmux-navigator](https://github.com/christoomey/vim-tmux-navigator) lets `C-hjkl` move between
  Neovim and tmux panes, and resurrect + continuum restore my layout after a reboot.
- **[Ghostty](https://ghostty.org)** — GPU-accelerated terminal emulator. I like the quick terminal:
  `ctrl+opt+space` drops a terminal over whatever is on screen.
- **Gruvbox everywhere** — Ghostty, tmux, Neovim, and `bat` all use the same theme.

## Small System Tweaks

Terminal commands that make macOS feel snappier. Run `killall Dock` afterward for the Dock ones, and
log out and back in for the global ones. Each can be undone with `defaults delete` on the same key.

```sh
# Dock auto-hide: no hover delay, shorter slide animation
defaults write com.apple.dock autohide-delay -float 0
defaults write com.apple.dock autohide-time-modifier -float 0.15

# Minimize to the Dock with the quicker scale effect instead of genie
defaults write com.apple.dock mineffect -string scale

# No bouncing icon while an app launches
defaults write com.apple.dock launchanim -bool false

# Skip window open/close animations, and make window resizing near-instant
defaults write NSGlobalDomain NSAutomaticWindowAnimationsEnabled -bool false
defaults write NSGlobalDomain NSWindowResizeTime -float 0.001
```
