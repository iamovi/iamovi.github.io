#!/usr/bin/env python3
"""Bake projects.json and blog.json into index.html.

The homepage renders both lists client-side, so the raw HTML contains empty
containers and a stale "no posts yet" placeholder. Crawlers and AI agents that
do not execute JavaScript therefore see an empty portfolio.

This script writes the real content between <!-- build:* --> markers. It runs
in CI on push (see .github/workflows/build.yml), so the JSON files stay the
only thing that needs editing.

The generated markup must match assets/script.js exactly, otherwise the client
re-render would visibly change what the baked HTML already showed.
"""

import html
import json
import re
import sys
from datetime import date, datetime
from email.utils import format_datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INDEX = ROOT / "index.html"
TEMPLATE = Path(__file__).resolve().parent / "post-template.html"
FEED = ROOT / "feed.xml"
SITEMAP = ROOT / "sitemap.xml"
PER_PAGE = 3  # keep in sync with PER_PAGE in assets/script.js
SITE = "https://iamovi.github.io"

REACTIONS = [
    ("skull", "\U0001f480"),
    ("fire", "\U0001f525"),
    ("alien", "\U0001f47e"),
    ("lol", "[ lol ]"),
]


def esc(value):
    return html.escape(str(value), quote=True)


def slugify(text):
    """Mirror slugify() in assets/script.js."""
    return re.sub(r"^-|-$", "", re.sub(r"[^a-z0-9]+", "-", str(text).lower()))


def reaction_bar(kind, ident):
    buttons = "".join(
        '<button class="reaction-btn" '
        "onclick=\"addReaction('%s','%s','%s',this)\" title=\"%s\">"
        '<span class="reaction-emoji">%s</span>'
        '<span class="reaction-count" id="rc-%s-%s-%s">\u00b7</span></button>'
        % (kind, esc(ident), key, key, label, kind, esc(ident), key)
        for key, label in REACTIONS
    )
    return (
        '<div class="reaction-bar" data-type="%s" data-id="%s">%s</div>'
        % (kind, esc(ident), buttons)
    )


def project_item(project):
    return (
        "                <li>\n"
        '                    <h2><a href="%s" target="_blank" rel="noopener noreferrer">%s</a></h2>\n'
        "                    <p>%s</p>\n"
        '                    <div class="date">%s</div>\n'
        "                    %s\n"
        "                </li>"
        % (
            esc(project["url"]),
            esc(project["name"]),
            esc(project["description"]),
            esc(project["date"]),
            reaction_bar("project", slugify(project["name"])),
        )
    )


def blog_item(post):
    tag = (
        '\n                        <span class="blog-post-tag">%s</span>' % esc(post["tag"])
        if post.get("tag")
        else ""
    )
    return (
        '                <li class="blog-post-item">\n'
        '                    <div class="blog-post-meta">\n'
        '                        <span class="blog-post-date">%s</span>%s\n'
        "                    </div>\n"
        '                    <h2 class="blog-post-title">%s</h2>\n'
        '                    <p class="blog-post-excerpt">%s</p>\n'
        '                    <a class="blog-post-link" href="./blog/%s/">read more \u2192</a>\n'
        "                    %s\n"
        "                </li>"
        % (
            esc(post["date"]),
            tag,
            esc(post["title"]),
            esc(post["excerpt"]),
            esc(post["slug"]),
            reaction_bar("blog", post["slug"]),
        )
    )


def replace_between(source, marker, body, path):
    """Replace the content between <!-- build:X --> and <!-- /build:X -->."""
    pattern = re.compile(
        r"(<!-- build:%s -->)(.*?)(<!-- /build:%s -->)"
        % (re.escape(marker), re.escape(marker)),
        re.DOTALL,
    )
    if not pattern.search(source):
        sys.exit("error: marker '%s' not found in %s" % (marker, path.name))
    return pattern.sub(lambda m: m.group(1) + body + m.group(3), source, count=1)


def parse_published(post):
    """Return a datetime for feed/sitemap, from `published` or `date`."""
    published = post.get("published")
    if published:
        return datetime.strptime(published, "%Y-%m-%d")
    # Fall back to the display date ("August 2021" / "August 23, 2021").
    text = str(post.get("date", "")).strip()
    for fmt in ("%B %d, %Y", "%B %Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(text, fmt)
        except ValueError:
            continue
    sys.exit("error: cannot parse a date for post '%s' (add a 'published' field)" % post.get("slug"))


def render_post(post, template):
    content_file = ROOT / "blog" / post["slug"] / "content.html"
    if not content_file.exists():
        sys.exit(
            "error: blog.json lists '%s' but %s is missing"
            % (post["slug"], content_file.relative_to(ROOT))
        )

    values = {
        "TITLE": esc(post["title"]),
        "SLUG": esc(post["slug"]),
        "DATE": esc(post.get("date_full") or post.get("date", "")),
        "TAG": esc(post.get("tag", "")),
        "SUBTITLE": esc(post.get("subtitle") or post.get("excerpt", "")),
        "DESCRIPTION": esc(post.get("description") or post.get("excerpt", "")),
        "CONTENT": content_file.read_text(encoding="utf-8").rstrip("\n"),
    }

    page = template
    for key, value in values.items():
        page = page.replace("{{%s}}" % key, value)

    leftover = re.findall(r"\{\{[A-Z]+\}\}", page)
    if leftover:
        sys.exit("error: unfilled placeholders in post '%s': %s" % (post["slug"], leftover))
    return page


def write_posts(posts):
    template = TEMPLATE.read_text(encoding="utf-8")
    written = 0
    for post in posts:
        target = ROOT / "blog" / post["slug"] / "index.html"
        page = render_post(post, template)
        if not target.exists() or target.read_text(encoding="utf-8") != page:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(page, encoding="utf-8")
            written += 1
    return written


def write_feed(posts):
    items = []
    for post in posts:
        url = "%s/blog/%s/" % (SITE, post["slug"])
        items.append(
            "    <item>\n"
            "      <title>%s</title>\n"
            "      <link>%s</link>\n"
            "      <guid>%s</guid>\n"
            "      <pubDate>%s</pubDate>\n"
            "      <description>%s</description>\n"
            "    </item>"
            % (
                esc(post["title"]),
                url,
                url,
                format_datetime(parse_published(post)).replace("-0000", "+0000"),
                esc(post.get("excerpt", "")),
            )
        )
    source = FEED.read_text(encoding="utf-8")
    FEED.write_text(replace_between(source, "feed-items", "\n" + "\n".join(items) + "\n\n  ", FEED), encoding="utf-8")


def write_sitemap(posts):
    entries = []
    for post in posts:
        entries.append(
            "  <url>\n"
            "    <loc>%s/blog/%s/</loc>\n"
            "    <lastmod>%s</lastmod>\n"
            "  </url>"
            % (SITE, post["slug"], parse_published(post).strftime("%Y-%m-%d"))
        )
    source = SITEMAP.read_text(encoding="utf-8")
    SITEMAP.write_text(
        replace_between(source, "blog-urls", "\n" + "\n".join(entries) + "\n  ", SITEMAP),
        encoding="utf-8",
    )


def main():
    projects = json.loads((ROOT / "projects.json").read_text(encoding="utf-8"))
    posts = json.loads((ROOT / "blog.json").read_text(encoding="utf-8"))

    # script.js reverses both lists (data.reverse()), so the last JSON entry
    # renders first. Mirror that exactly, otherwise the client re-render would
    # visibly reorder what the baked HTML already showed.
    projects = list(reversed(projects))
    posts = list(reversed(posts))

    total_pages = max(1, -(-len(projects) // PER_PAGE))

    source = INDEX.read_text(encoding="utf-8")

    # All projects are baked, not just page 1: a crawler reading the raw HTML
    # should see the whole portfolio. CSS hides items past the first page, and
    # script.js paginates by toggling visibility.
    source = replace_between(
        source,
        "projects",
        "\n" + "\n".join(project_item(p) for p in projects) + "\n                ",
        INDEX,
    )
    source = replace_between(source, "page-indicator", "1 / %d" % total_pages, INDEX)

    if posts:
        source = replace_between(
            source,
            "blog",
            "\n" + "\n".join(blog_item(p) for p in posts) + "\n                ",
            INDEX,
        )
        # With posts present the empty-state block must not reach the raw HTML,
        # otherwise text-only readers report "no posts yet" as fact.
        source = replace_between(source, "blog-empty", "", INDEX)
    else:
        source = replace_between(source, "blog", "", INDEX)

    INDEX.write_text(source, encoding="utf-8")

    written = write_posts(posts)
    write_feed(posts)
    write_sitemap(posts)

    print("  baked %d projects (%d pages)" % (len(projects), total_pages))
    print("  baked %d blog post(s)" % len(posts))
    print("  wrote %d post page(s), feed.xml, sitemap.xml" % written)


if __name__ == "__main__":
    main()
