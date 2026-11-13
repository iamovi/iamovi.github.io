# AGENTS.md

Repository-specific notes for AI agents working in this repo.

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
- Keep commit messages short and to the point: a concise subject line, and at
  most a few brief bullet lines if detail is truly needed. No long paragraphs.

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
