# GitHub Trend → X/Twitter

Automatically fetches GitHub trending repositories (weekly) and posts
them to X/Twitter with a summary tweet + URL reply.

## Files

| File | Purpose |
|------|---------|
| `github_trend_twitterx.py` | Main script — scrape, format, post |
| `check_deps.py` | Dependency checker |
| `.venv/` | Python virtual environment (bs4, lxml, requests) |

## Usage

```bash
# Dry-run (print only, no posting)
cd /home/dozo/.hermes/kanban/workspaces/t_fc7e83de
source .venv/bin/activate
python github_trend_twitterx.py

# Post to X (main tweet only)
python github_trend_twitterx.py --post

# Post + reply with GitHub URLs
python github_trend_twitterx.py --post --reply
```

## Prerequisites

1. **xurl CLI** — already installed (`npm install -g @xdevplatform/xurl`)
2. **X API credentials** — you need to set up an X Developer App

### X/Twitter auth setup (one-time, done by you)

```bash
# 1. Register your app
xurl auth apps add my-app --client-id YOUR_CLIENT_ID --client-secret YOUR_CLIENT_SECRET

# 2. Authenticate (opens browser for OAuth)
xurl auth oauth2 --app my-app

# 3. Set as default
xurl auth default my-app

# 4. Verify
xurl auth status
```

See [xurl docs](https://github.com/xdevplatform/xurl) for details.

## Cron example (weekly)

```bash
0 10 * * 1 cd /home/dozo/.hermes/kanban/workspaces/t_fc7e83de && \
  .venv/bin/python github_trend_twitterx.py --post --reply >> /tmp/github-trend.log 2>&1
```
