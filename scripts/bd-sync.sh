#!/usr/bin/env bash
set -euo pipefail

# brew-installed tools (bd, gh, jq, ...) — cron PATH doesn't include linuxbrew
if [ -x /home/linuxbrew/.linuxbrew/bin/brew ] && ! command -v bd >/dev/null 2>&1; then
  eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
fi

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

LOG_DIR="$ROOT_DIR/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/bd-sync.log"

log() {
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*" >> "$LOG_FILE"
}

log "=== bd-sync start ==="

if bd github sync --pull-only >> "$LOG_FILE" 2>&1; then
  log "bd github sync OK"
else
  EXIT_CODE=$?
  log "bd github sync FAILED (exit $EXIT_CODE)"
  exit "$EXIT_CODE"
fi

log "=== bd-sync end ==="
