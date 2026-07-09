# GitHub Trend → X/Twitter

Automatically fetches GitHub trending repositories (weekly) and posts
them to X/Twitter with a summary tweet + URL reply.

Uses **Playwright** (browser automation) — no API key, no X Developer account, **free**.

## Files

| File | Purpose |
|------|---------|
| `github_trend_twitterx.py` | Main script — scrape, format, post |
| `check_deps.py` | Dependency checker |

## Setup

```bash
# Install dependencies
pip install playwright beautifulsoup4 lxml requests
playwright install chromium

# One-time X login (opens browser — log in manually, then press Enter)
python github_trend_twitterx.py --login
```

Cookies are saved to `~/.github-trend-twitterx-cookies.json`.
Subsequent runs use headless mode (no browser window).

## Usage

```bash
# Dry-run (print only)
python github_trend_twitterx.py

# Post tweet
python github_trend_twitterx.py --post

# Post tweet + reply with GitHub URLs
python github_trend_twitterx.py --post --reply

# Monthly trend instead of weekly
python github_trend_twitterx.py --since monthly
```

## Cron example (weekly)

```bash
0 10 * * 1 cd /path/to/project && \
  python github_trend_twitterx.py --post --reply >> /tmp/github-trend.log 2>&1
```

## How it works

1. Scrapes https://github.com/trending?since=weekly
2. Sorts repos by star velocity (fastest-growing first)
3. Formats a compact tweet (top 3 repos) + reply (top 5 URLs)
4. Posts via Playwright-controlled Chromium using saved cookies

No API costs, no rate limits, no X Developer account needed.
