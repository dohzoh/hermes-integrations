#!/usr/bin/env python3
"""
github-trend-twitterx — GitHub trending → X/Twitter auto-poster.

Fetches GitHub trending repositories (weekly), picks the fastest-growing
ones, posts a featured-repo tweet, and replies with the raw GitHub URLs.

Usage:
    python3 github_trend_twitterx.py              # dry-run (print only)
    python3 github_twitterx.py --post              # post to X via xurl
    python3 github_twitterx.py --post --reply      # post + reply with URLs

Requires: beautifulsoup4, lxml, requests, and `xurl` CLI with auth configured.
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
import textwrap
from dataclasses import dataclass, field
from datetime import datetime, timezone

import requests
from bs4 import BeautifulSoup

# ── Config ────────────────────────────────────────────────────────────────
TRENDING_URL = "https://github.com/trending?since=weekly"
USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
)
MAX_REPOS_SHOW = 3  # repos in main tweet
MAX_REPOS_REPLY = 5  # repos in reply with URLs

# ── Data model ────────────────────────────────────────────────────────────

@dataclass
class Repo:
    name: str           # e.g. "owner/repo"
    description: str    # short description
    language: str       # primary language (or "")
    stars: int          # total stars
    stars_today: int    # stars gained today/week

    @property
    def slug(self) -> str:
        """Return the GitHub URL slug."""
        return self.name

    def github_url(self) -> str:
        return f"https://github.com/{self.name}"


# ── Scraper ───────────────────────────────────────────────────────────────

def fetch_trending() -> list[Repo]:
    """Fetch and parse GitHub trending weekly page. Returns repos sorted by
    stars_today descending (fastest-growing first)."""
    headers = {"User-Agent": USER_AGENT}
    resp = requests.get(TRENDING_URL, headers=headers, timeout=30)
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "lxml")
    articles = soup.select('article[class*="Box-row"]')
    repos: list[Repo] = []

    for article in articles:
        # -- name --
        h2 = article.select_one("h2")
        if not h2:
            continue
        a = h2.select_one("a")
        if not a:
            continue
        # GitHub renders as "/owner/repo" or "owner/repo"
        raw = a.get("href", "").strip().lstrip("/")
        name = raw

        # -- description --
        desc_el = article.select_one("p")
        description = desc_el.get_text(strip=True) if desc_el else ""

        # -- language --
        lang_el = article.select_one('[itemprop="programmingLanguage"]')
        language = lang_el.get_text(strip=True) if lang_el else ""

        # -- total stars --
        stars = 0
        stars_today = 0

        # GitHub has multiple star counts; we want the total and delta
        # Structure: two <a> tags with Octicon 'star' followed by a <span>
        star_spans = article.select('[class*="d-inline-block"] span')
        # Safer: find all <a> containing star icons
        star_links = article.select('a[href*="/"][href$="/stargazers"]')
        # Totals: often the first star link
        if star_links:
            stars_text = star_links[0].get_text(strip=True).replace(",", "")
            try:
                stars = int(stars_text)
            except ValueError:
                stars = 0

        # -- stars today --
        # Look for the <span> that contains "X stars today" or similar
        for span in article.select("span"):
            text = span.get_text(strip=True)
            if "," in text and ("stars" in text or "star" in text):
                # Format: "1,234 stars today"
                parts = text.split()
                if parts:
                    num = parts[0].replace(",", "")
                    try:
                        stars_today = int(num)
                    except ValueError:
                        stars_today = 0
            elif "stars today" in text or "star today" in text:
                parts = text.split()
                if parts:
                    num = parts[0].replace(",", "")
                    try:
                        stars_today = int(num)
                    except ValueError:
                        stars_today = 0

        repos.append(Repo(
            name=name,
            description=description,
            language=language,
            stars=stars,
            stars_today=stars_today,
        ))

    # Sort by stars_today descending
    repos.sort(key=lambda r: r.stars_today, reverse=True)
    return repos


# ── Tweet formatting ──────────────────────────────────────────────────────

def format_main_tweet(repos: list[Repo]) -> str:
    """Format the main tweet summarising top trending repos.

    X character limit is 280, but we keep it shorter for readability.
    Uses a compact format:
      🔥 GitHub Weekly Trending
    
      #{rank} {name} ({lang}) — {stars_today}⭐ today
      {description[:truncated]}
      ...
    
      #{trending #github
    """
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    lines = [f"🔥 GitHub Weekly Trending — {now}", ""]

    for i, r in enumerate(repos[:MAX_REPOS_SHOW], 1):
        lang_part = f" / {r.language}" if r.language else ""
        star_str = f"+{r.stars_today}⭐" if r.stars_today else ""
        lines.append(
            f"{i}. {r.name}{lang_part} {star_str}".strip()
        )
        if r.description:
            # Truncate description to ~60 chars
            desc = r.description[:80]
            if len(r.description) > 80:
                desc += "…"
            lines.append(f"   {desc}")
        lines.append("")

    lines.append("#github #trending #opensource")
    return "\n".join(lines).strip()


def format_reply_text(repos: list[Repo]) -> str:
    """Format a reply tweet with GitHub URLs."""
    lines = ["📌 Direct links:", ""]
    for r in repos[:MAX_REPOS_REPLY]:
        lines.append(f"• {r.name}")
        lines.append(f"  {r.github_url()}")
        lines.append("")
    # Remember X/Twitter limits
    return "\n".join(lines).strip()


# ── X/Twitter posting via xurl ────────────────────────────────────────────

def xurl_available() -> bool:
    """Check if xurl CLI is installed and auth'd."""
    return shutil.which("xurl") is not None


def xurl_auth_ok() -> bool:
    """Check xurl auth status."""
    try:
        r = subprocess.run(
            ["xurl", "auth", "status"],
            capture_output=True, text=True, timeout=15,
        )
        out = r.stdout.strip()
        # Successful auth has an app with oauth2 tokens
        return "No apps registered" not in out and bool(out)
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return False


def xurl_post(text: str) -> dict | None:
    """Post a tweet via xurl. Returns parsed JSON response."""
    r = subprocess.run(
        ["xurl", "post", text],
        capture_output=True, text=True, timeout=30,
    )
    if r.returncode != 0:
        print(f"  [ERROR] xurl post failed:\n  {r.stderr.strip() or r.stdout.strip()}")
        return None
    try:
        return json.loads(r.stdout)
    except json.JSONDecodeError:
        print(f"  [WARN] could not parse xurl response: {r.stdout[:200]}")
        return {"raw": r.stdout.strip()}


def xurl_reply(post_id: str, text: str) -> dict | None:
    """Reply to a tweet via xurl."""
    r = subprocess.run(
        ["xurl", "reply", post_id, text],
        capture_output=True, text=True, timeout=30,
    )
    if r.returncode != 0:
        print(f"  [ERROR] xurl reply failed:\n  {r.stderr.strip() or r.stdout.strip()}")
        return None
    try:
        return json.loads(r.stdout)
    except json.JSONDecodeError:
        return {"raw": r.stdout.strip()}


def extract_post_id(response: dict | None) -> str | None:
    """Extract tweet ID from xurl JSON response."""
    if not response:
        return None
    data = response.get("data") or {}
    return data.get("id")


# ── Report ────────────────────────────────────────────────────────────────

def print_report(repos: list[Repo]):
    """Print a nicely formatted report to stdout."""
    print("=" * 60)
    print("  GitHub Weekly Trending Report")
    print(f"  {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")
    print("=" * 60)
    print()

    if not repos:
        print("  No repos found (parsing may have changed).")
        return

    for i, r in enumerate(repos[:MAX_REPOS_REPLY], 1):
        print(f"  #{i}  {r.name}")
        if r.language:
            print(f"      Language: {r.language}")
        print(f"      ⭐ {r.stars:,}  (+{r.stars_today} today)")
        if r.description:
            print(f"      {r.description[:120]}")
        print(f"      {r.github_url()}")
        print()

    print(f"  ({len(repos)} trending repos fetched total)")


# ── Main ──────────────────────────────────────────────────────────────────

def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="GitHub Trending → X/Twitter auto-poster",
    )
    p.add_argument("--post", action="store_true",
                    help="Actually post to X (default: dry-run)")
    p.add_argument("--reply", action="store_true",
                    help="Also post a reply with direct GitHub URLs")
    p.add_argument("--max", type=int, default=MAX_REPOS_REPLY,
                    help=f"Max repos to show (default: {MAX_REPOS_REPLY})")
    p.add_argument("--since", choices=["daily", "weekly", "monthly"],
                    default="weekly", help="Trending timeframe")
    return p.parse_args(argv)


def main() -> int:
    args = parse_args()
    dry_run = not args.post

    # 1. Fetch trending
    print("🌐 Fetching GitHub trending (weekly)…", end=" ", flush=True)
    try:
        repos = fetch_trending()
        print(f"OK — {len(repos)} repos found")
    except Exception as e:
        print(f"FAILED: {e}")
        return 1

    if not repos:
        print("⚠ No repos parsed. GitHub markup may have changed.")
        return 1

    # 2. Print report
    print_report(repos)

    # 3. Format tweet
    tweet = format_main_tweet(repos)
    print("\n" + "─" * 60)
    print("  PREVIEW TWEET")
    print("─" * 60)
    print(tweet)
    print(f"\n  ({len(tweet)} chars)")

    reply_text = format_reply_text(repos)
    print("\n" + "─" * 60)
    print("  PREVIEW REPLY")
    print("─" * 60)
    print(reply_text)
    print(f"\n  ({len(reply_text)} chars)")

    if dry_run:
        print("\n  ✅ Dry-run — use --post to actually post.")
        return 0

    # 4. Check xurl
    if not xurl_available():
        print("\n❌ xurl CLI not found. Install it:")
        print("   npm install -g @xdevplatform/xurl")
        return 1

    if not xurl_auth_ok():
        print("\n❌ xurl auth not configured. Run:")
        print("   xurl auth apps add my-app --client-id X --client-secret Y")
        print("   xurl auth oauth2 --app my-app")
        print("   xurl auth default my-app")
        return 1

    # 5. Post
    print("\n🐦 Posting main tweet…", end=" ", flush=True)
    post_resp = xurl_post(tweet)
    post_id = extract_post_id(post_resp)
    if post_id:
        print(f"OK — id={post_id}")
        print(f"    https://x.com/i/status/{post_id}")
    else:
        print("FAILED")
        if post_resp:
            print(f"    Response: {json.dumps(post_resp, indent=2)}")
        return 1

    # 6. Reply (optional)
    if args.reply:
        print("  Replying with URLs…", end=" ", flush=True)
        reply_resp = xurl_reply(post_id, reply_text)
        reply_id = extract_post_id(reply_resp)
        if reply_id:
            print(f"OK — id={reply_id}")
        else:
            print("FAILED")
            if reply_resp:
                print(f"    Response: {json.dumps(reply_resp, indent=2)}")

    print("\n✅ Done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
