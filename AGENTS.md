# AGENTS.md

Repository-specific notes for AI agents working in this repo.

## Git workflow

- Never push to `main`. Create a branch, push that branch, and open a pull
  request. The owner reviews and merges.
- One PR per task. If a PR already exists for the work, add commits to it.

## Commits and attribution

- Commit as the repository owner, not as the agent:
  - `user.name`  = `Hasan Ovi`
  - `user.email` = `hasanovi.human@gmail.com`
  - Set repo-locally (`git config --local`), never globally.
  - This email is linked to the GitHub account `iamovi`, so commits are attributed
    to the owner (avatar + profile link).
- Do NOT add a `Co-authored-by:` trailer (no `openhands@all-hands.dev` line).
  The owner wants commits to read as solely their own.
- Conventional Commits style with a scope, e.g. `feat(projects): ...`,
  `fix(chatguys): ...`. Match the existing history.
- **Subject line only. Do not add a body.** No bullets, no paragraphs, no
  "what/why" detail — the heading alone. Anything else belongs in the PR
  description, not the commit.

## Site overview

- Static GitHub Pages site: blog + projects + chatguys + Cloudflare Worker + Supabase.
- `assets/style.css` is loaded ONLY by `index.html`; other pages have their own CSS.
  Check blast radius before editing shared assets.
- `python3 scripts/build.py` regenerates baked content (blog post pages, `feed.xml`,
  `sitemap.xml`) from `blog.json`. It must stay idempotent — re-running it on a
  clean tree should produce no diff.
- Local preview: `python3 -m http.server 12000 --bind 0.0.0.0` from the repo root.

## Conventions

- Prefer minimal, focused changes. Do not add unrequested files.
- Keep motion transform-only and honor `prefers-reduced-motion`.

## Layout gotchas

- The game pages (`games/snake`, `games/flappy`, `games/waifu-or-not`) are
  full-viewport centred flex columns. Do not use `height: 100%; overflow: hidden`
  on `html, body` there: on short viewports (landscape phones) it clips the
  controls and makes them unreachable. Use `min-height: 100%; overflow-x: hidden`
  with `justify-content: safe center` so content scrolls into view instead.
