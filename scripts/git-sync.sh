#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

LOG_DIR="$ROOT_DIR/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/git-sync.log"

log() {
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*" >> "$LOG_FILE"
}

log "=== git-sync start ==="

if git pull --rebase >> "$LOG_FILE" 2>&1; then
  log "git pull --rebase OK"
else
  EXIT_CODE=$?
  log "git pull --rebase FAILED (exit $EXIT_CODE)"
  exit "$EXIT_CODE"
fi

log "=== git-sync end ==="
