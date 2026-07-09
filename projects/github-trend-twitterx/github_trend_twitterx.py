#!/usr/bin/env python3
"""
github-trend-twitterx — GitHub trending → X/Twitter auto-poster.

Uses Playwright to post via browser (no API key / no xurl).
One-time manual login → cookies saved → headless thereafter.

Usage:
    python3 github_trend_twitterx.py              # dry-run (print only)
    python3 github_trend_twitterx.py --login      # manual X login (first time)
    python3 github_trend_twitterx.py --post       # post tweet
    python3 github_trend_twitterx.py --post --reply  # post + reply with URLs
"""

import argparse
import json
import os
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

TRENDING_URL = "https://github.com/trending?since=weekly"
USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
)
MAX_REPOS_SHOW = 3
MAX_REPOS_REPLY = 5
COOKIE_FILE = Path.home() / ".github-trend-twitterx-cookies.json"


@dataclass
class Repo:
    name: str
    description: str
    language: str
    stars: int
    stars_today: int

    def github_url(self) -> str:
        return f"https://github.com/{self.name}"


def fetch_trending(since: str = "weekly") -> list[Repo]:
    url = f"https://github.com/trending?since={since}"
    resp = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=30)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "lxml")
    repos: list[Repo] = []
    for article in soup.select('article[class*="Box-row"]'):
        h2 = article.select_one("h2")
        if not h2:
            continue
        a = h2.select_one("a")
        if not a:
            continue
        name = a.get("href", "").strip().lstrip("/")
        desc_el = article.select_one("p")
        desc = desc_el.get_text(strip=True) if desc_el else ""
        lang_el = article.select_one('[itemprop="programmingLanguage"]')
        lang = lang_el.get_text(strip=True) if lang_el else ""
        stars = 0
        star_links = article.select('a[href*="/"][href$="/stargazers"]')
        if star_links:
            try:
                stars = int(star_links[0].get_text(strip=True).replace(",", ""))
            except ValueError:
                pass
        stars_today = 0
        for span in article.select("span"):
            text = span.get_text(strip=True)
            if "stars today" in text or "star today" in text:
                parts = text.split()
                if parts:
                    try:
                        stars_today = int(parts[0].replace(",", ""))
                    except ValueError:
                        pass
        repos.append(Repo(name, desc, lang, stars, stars_today))
    repos.sort(key=lambda r: r.stars_today, reverse=True)
    return repos


def format_main_tweet(repos: list[Repo]) -> str:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    lines = [f"🔥 GitHub Weekly Trending — {now}", ""]
    for i, r in enumerate(repos[:MAX_REPOS_SHOW], 1):
        lang = f" / {r.language}" if r.language else ""
        star = f" +{r.stars_today}⭐" if r.stars_today else ""
        lines.append(f"{i}. {r.name}{lang}{star}".strip())
        if r.description:
            d = r.description[:80] + ("…" if len(r.description) > 80 else "")
            lines.append(f"   {d}")
        lines.append("")
    lines.append("#github #trending #opensource")
    return "\n".join(lines).strip()


def format_reply_text(repos: list[Repo]) -> str:
    lines = ["📌 Direct links:", ""]
    for r in repos[:MAX_REPOS_REPLY]:
        lines.append(f"• {r.name}")
        lines.append(f"  {r.github_url()}")
        lines.append("")
    return "\n".join(lines).strip()


def print_report(repos: list[Repo]):
    print("=" * 60)
    print(f"  GitHub Weekly Trending Report — {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")
    print("=" * 60)
    if not repos:
        print("  No repos found.")
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


# ── Playwright X/Twitter poster ───────────────────────────────────────────

def _ensure_playwright():
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("❌ Playwright not installed. Run:")
        print("   pip install playwright && playwright install chromium")
        sys.exit(1)
    return sync_playwright


def login():
    """Open browser for manual X login and save cookies."""
    print("🔐 Opening browser for X login...")
    pw = _ensure_playwright()
    with pw() as p:
        browser = p.chromium.launch(headless=False)
        ctx = browser.new_context(viewport={"width": 1280, "height": 800})
        page = ctx.new_page()
        page.goto("https://x.com/login")
        input("⏳ Log in to X in the browser, then press Enter here to save cookies...")
        ctx.storage_state(path=str(COOKIE_FILE))
        browser.close()
    print(f"✅ Cookies saved to {COOKIE_FILE}")


def _load_cookies(ctx):
    if COOKIE_FILE.exists():
        ctx.add_cookies(json.loads(COOKIE_FILE.read_text()))


def _save_cookies(ctx):
    COOKIE_FILE.write_text(json.dumps(ctx.cookies(), indent=2))


def post_tweet(text: str, reply_to: str | None = None) -> str | None:
    """Post a tweet via Playwright. Returns tweet URL or None."""
    pw = _ensure_playwright()
    with pw() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent=USER_AGENT,
        )
        _load_cookies(ctx)
        page = ctx.new_page()

        if reply_to:
            page.goto(f"https://x.com/intent/post?in_reply_to={reply_to}")
        else:
            page.goto("https://x.com/intent/post")
        page.wait_for_timeout(2000)

        # Check if logged in
        if page.url.startswith("https://x.com/i/flow/login"):
            print("❌ Session expired. Run --login first.")
            browser.close()
            return None

        # Type the tweet
        text_area = page.locator('[data-testid="tweetTextarea_0"]')
        text_area.wait_for(timeout=10000)
        text_area.click()
        page.keyboard.insert_text(text[:280])
        page.wait_for_timeout(500)

        # Click Post button
        post_btn = page.locator('[data-testid="tweetButton"]')
        post_btn.wait_for(timeout=5000)
        post_btn.click()
        page.wait_for_timeout(3000)

        # Get the tweet URL from the page URL
        current_url = page.url
        browser.close()

        if "x.com/" in current_url and "/status/" in current_url:
            return current_url
        # Fallback: check if we're on the home page (post succeeded)
        if current_url == "https://x.com/" or current_url == "https://x.com/home":
            return "https://x.com/home"
        print(f"  [WARN] Unexpected URL after posting: {current_url}")
        return current_url


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="GitHub Trending → X/Twitter auto-poster (Playwright)")
    p.add_argument("--login", action="store_true", help="Open browser for one-time X login")
    p.add_argument("--post", action="store_true", help="Actually post to X (default: dry-run)")
    p.add_argument("--reply", action="store_true", help="Also reply with GitHub URLs")
    p.add_argument("--since", choices=["daily", "weekly", "monthly"], default="weekly")
    return p.parse_args(argv)


def main() -> int:
    args = parse_args()

    if args.login:
        login()
        return 0

    dry_run = not args.post

    print("🌐 Fetching GitHub trending...", end=" ", flush=True)
    try:
        repos = fetch_trending(args.since)
        print(f"OK — {len(repos)} repos")
    except Exception as e:
        print(f"FAILED: {e}")
        return 1

    if not repos:
        print("⚠ No repos found.")
        return 1

    print_report(repos)

    tweet = format_main_tweet(repos)
    print("\n" + "─" * 60)
    print("  PREVIEW TWEET")
    print("─" * 60)
    print(tweet)
    print(f"  ({len(tweet)} chars)")

    reply_text = format_reply_text(repos)
    print("\n" + "─" * 60)
    print("  PREVIEW REPLY")
    print("─" * 60)
    print(reply_text)
    print(f"  ({len(reply_text)} chars)")

    if dry_run:
        print("\n  ✅ Dry-run. Use --post to post.")
        return 0

    print("\n🐦 Posting tweet...", end=" ", flush=True)
    url = post_tweet(tweet)
    if url:
        print(f"OK")
        print(f"    {url}")
    else:
        print("FAILED")
        return 1

    if args.reply:
        print("  Replying with URLs...", end=" ", flush=True)
        reply_id = url.rstrip("/").rsplit("/", 1)[-1] if url else None
        if reply_id:
            reply_url = post_tweet(reply_text, reply_to=reply_id)
            if reply_url:
                print(f"OK — {reply_url}")
            else:
                print("FAILED")
        else:
            print("FAILED (no parent tweet id)")

    print("\n✅ Done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
