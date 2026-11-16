# iamovi.github.io

Personal site: static GitHub Pages, with a Cloudflare Worker and Supabase for
reactions and the guestbook.

## Content workflow

`projects.json` and `blog.json` are the source of truth. `scripts/build.py`
reads them and generates the parts of the site that used to be built in the
browser, so crawlers and AI agents that do not run JavaScript still see the
content. `.github/workflows/build.yml` runs the script on every push to `main`
and commits the result — you never run it by hand.

### Adding a project

Append an entry to `projects.json` and push.

```json
{
  "name": "Project name",
  "url": "https://github.com/iamovi/repo",
  "description": "One line about it.",
  "date": "Created on November 2026"
}
```

Entries are reversed before rendering, so the **last** entry in the array
appears first on the site.

### Adding a blog post

1. Copy `blog/_template/` to `blog/<slug>/` and replace the placeholder text. The
   file holds just the article body (the markup that goes inside
   `<article class="post-content">`). `blog/my-first-website/content.html` is a
   filled-in example.
2. Add an entry to `blog.json`.
3. Push. The build generates `blog/<slug>/index.html`, the feed item and the
   sitemap entry.

`blog/_template/` is never built — the build only reads slugs listed in
`blog.json`. Do not add `_template` to `blog.json`.

```json
{
  "title": "Post title",
  "slug": "post-title",
  "date": "November 2026",
  "date_full": "NOVEMBER 12, 2026",
  "published": "2026-11-12",
  "tag": "web dev",
  "excerpt": "One or two lines shown in the homepage listing and the RSS feed.",
  "subtitle": "Shown under the title on the post page.",
  "description": "Used for the meta description and Open Graph tags."
}
```

`slug` must match the folder name. `published` is required for the feed and
sitemap; it is also used as a fallback for `lastmod`.

Do not edit the generated `blog/<slug>/index.html` — the build overwrites it.
Edit `content.html` instead.

### Generated files

These are written by the build and should not be edited by hand:

- `index.html` — content between `<!-- build:* -->` markers
- `blog/<slug>/index.html`
- `feed.xml` — content between `<!-- build:feed-items -->` markers
- `sitemap.xml` — content between `<!-- build:blog-urls -->` markers

Only blog URLs in `sitemap.xml` are generated. The other entries (`/`, `/games/`,
the individual game pages, `/chatguys/`) are written by hand — add a new game
page to `sitemap.xml` yourself. Projects and posts need nothing: projects live on
the homepage and post URLs are generated.

### Build failures

The script exits with a non-zero code, and the workflow fails, if:

- a `slug` in `blog.json` has no `blog/<slug>/content.html`
- a post has no parseable date (add `published`)
- a `<!-- build:* -->` marker is missing from a generated file
- a post page still contains an unfilled `{{PLACEHOLDER}}` — add the matching
  value in `render_post()`, or remove the placeholder from
  `scripts/post-template.html`

## Layout

| Path | Purpose |
|---|---|
| `index.html` | Homepage |
| `assets/` | CSS and JS shared by the pages |
| `blog/` | Post pages |
| `games/`, `chatguys/`, `game/` | Browser games |
| `admin/`, `settings/` | Private pages, `noindex` |
| `cloudflare-worker/`, `supabase/` | Backend for reactions, the guestbook, and the chatguys bots |
| `scripts/` | Build script and post template |
| `llms.txt` | Machine-readable summary for AI agents |

## Live chat (chatguys)

Messages are stored in Supabase (`chat_messages`) and pushed to open tabs by a
Cloudflare Durable Object (`ChatRoom` in `cloudflare-worker/worker.js`). The
object holds no state of its own: it only fans each stored row out to the open
sockets, so Supabase stays the source of truth.

- A client inserts through the Worker (`/proxy/...`), which stores the row and
  then broadcasts it. A socket can only *receive* — the public route is `/ws`,
  and it requires a WebSocket upgrade, so a client cannot inject a fabricated
  message. The internal `/broadcast` path is reachable only by the Worker.
- The online count comes from the connected sockets, de-duplicated by session id,
  so two tabs from one visitor count once.
- Sockets hibernate while idle. A non-hibernating object would bill its full
  memory for every second a socket is open, which would exhaust the Workers Free
  daily budget; this is why the class uses `state.acceptWebSocket()` rather than
  `ws.addEventListener()`.
- Polling is still the fallback. If the socket never opens, or drops, the client
  reverts to the original 3.5s message poll and REST presence. While the socket is
  live it keeps a slow 30s poll as a backstop, so a silently dropped connection
  cannot hide messages.

The Durable Object needs the `CHAT_ROOM` binding and the `v1` migration in
`wrangler.toml`; both apply on the next `wrangler deploy`.

## Local preview

```
python3 -m http.server 12000 --bind 0.0.0.0
```

Then open <http://localhost:12000/>.

## Build

```
python3 scripts/build.py
```

No dependencies beyond the Python standard library.
