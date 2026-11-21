# AGENTS.md

Repository-specific notes for AI agents working in this repo.

## Working style

- Verify before stating. If a claim is checkable, check it — do not assert what
  you have not confirmed.
- After finishing a task, surface anything material found along the way: a bug,
  a rule that contradicts the request, a doc that misleads. One or two points,
  not a list. If nothing matters, say nothing.
- Suggestions are suggestions. Ask before acting on a judgment call, even when
  the fix looks obvious.
- If an instruction conflicts with a rule in this file, say so rather than
  silently picking one.

## Git workflow

- Never push to `main`. Create a branch, push that branch, and open a pull
  request. The owner reviews and merges.
- One PR per task. If a PR already exists for the work, add commits to it.
- Do NOT add an AI/agent attribution note to PR titles or descriptions (no
  mention of OpenHands or of an AI agent acting on the owner's behalf). Write
  the PR as the owner.

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
- Two READMEs, on purpose. GitHub surfaces `.github/README.md` (preview +
  license card) and hides the root `README.md` (build and content docs), which
  the card links to. Do not merge them. Card links need `../README.md`: relative
  links resolve against the file's own directory, so a plain `README.md` would
  point at the card itself.

## Chatguys bots

- `chatguys/` is a public room; messages live in Supabase and clear after a week.
- Two server-side responders post as reserved names, both blocked from clients:
  `@bot` (deterministic commands in `cloudflare-worker/worker.js`) and `@ai`
  (Groq chat completions, model from the `GROQ_MODEL` var).
- The Groq key is a Worker secret (`GROQ_API_KEY`), never sent to the browser and
  never committed. The client only shows a typing indicator; replies are generated
  and written by the Worker with the service-role key.
- `@ai` has short-term memory: it reads the last few room messages as context.
  Rate-limited per session and per day (KV binding `AI_RATE_LIMIT`, or an
  in-isolate fallback when unbound).
- Keep the Worker's `mentionRegex()` and the client's `willTriggerBot()` in sync.
- Link previews: a message containing a URL gets an Open Graph card. The Worker's
  `/link-preview?url=` route fetches the page, parses the tags, and caches the result;
  the browser cannot (CORS, no HTML parser). The SSRF guard in `normalizePreviewUrl()`
  re-checks every redirect hop, so keep it in place when touching that path.
- Admin deletes are **soft**: `admin/index.html` PATCHes `message: ''` and
  `deleted_at`, and the row stays so the room can show
  `[ admin deleted this message ]` in place. Detect a tombstone by `deleted_at`,
  never by the name — the reserved-name guard is in the Worker while RLS only
  blocks `bot`, so an anon client can insert any other name directly. The text is
  blanked deliberately; keeping it would leave the content readable through the
  public read policy. No undo.
- The room's poll asks for `id=gt.<newest>`, so it can never see a row that was
  edited behind it. `syncChatTombstones()` covers that on a slower timer, and
  `mergeChatMessages()` replaces changed rows by id instead of skipping known ids.
  Anything that edits an existing message has to account for both.

## Error reporting

- `assets/errors.js` is loaded in `<head>` on every public page (after `theme.js`,
  before anything that can throw). It forwards `window.onerror` and
  `unhandledrejection` to the Worker's `/notify` as `type: 'error'`, which relays
  to Telegram.
- Client-side it dedupes identical errors and caps at 3 per page load. The Worker
  applies a best-effort 50/day cap (`ERR_LIMIT_GLOBAL_DAY`, shared `AI_RATE_LIMIT`
  KV namespace) to keep a broken build from flooding Telegram. It is a soft limit:
  concurrent reports can read a stale counter before writes propagate, and KV
  allows only 1 write/sec per key. Telegram's own ~1 msg/sec per-chat limit is the
  backstop. That limiter fails **closed** — unlike the AI limiter, which fails open.
- Worker `console.*` output ships to the dashboard via `[observability]` in
  `wrangler.toml` (Workers Logs, free plan). There is no Sentry integration and
  none is wanted; do not add a browser error SDK.

## Conventions

- Prefer minimal, focused changes. Do not add unrequested files.
- Keep motion transform-only and honor `prefers-reduced-motion`.

## Layout gotchas

- The game pages (`games/snake`, `games/flappy`, `games/waifu-or-not`) are
  full-viewport centred flex columns. Do not use `height: 100%; overflow: hidden`
  on `html, body` there: on short viewports (landscape phones) it clips the
  controls and makes them unreachable. Use `min-height: 100%; overflow-x: hidden`
  with `justify-content: safe center` so content scrolls into view instead.
