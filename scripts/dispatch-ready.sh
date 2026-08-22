#!/usr/bin/env bash
set -euo pipefail

# brew-installed tools (bd, gh, jq, ...) — cron PATH doesn't include linuxbrew
if [ -x /home/linuxbrew/.linuxbrew/bin/brew ] && ! command -v bd >/dev/null 2>&1; then
  eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
fi
export PATH="/home/dozo/.bun/bin:$PATH"

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

GITHUB_REPOSITORY="${GITHUB_REPOSITORY:-dohzoh/hermes-integrations}"
LOG_DIR="$ROOT_DIR/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/dispatch.log"

# Timeout threshold for stale dispatches (2 hours in seconds)
STALE_THRESHOLD=7200

log() {
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*" >> "$LOG_FILE"
}

# Cleanup function: release claimed bead on unexpected exit
cleanup() {
  log "cleanup called; releasing bead $BEAD_ID"
  if [ -n "$BEAD_ID" ]; then
    bd update "$BEAD_ID" --release --reason "dispatch exit" >> "$LOG_FILE" 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

# Initialize the dispatch.json path variable (set in Step 5)
CURRENT_DISPATCH_JSON=""

log "=== dispatch-ready start ==="

# --- Step 1: Orphan/stale detection ---
log "checking for orphan/stale in-progress dispatches"

IN_PROGRESS=$(bd list --status in_progress --json 2>>"$LOG_FILE" || echo '{"data":[]}')

# Extract bead IDs from in_progress list
IN_PROGRESS_IDS=$(echo "$IN_PROGRESS" | jq -r '
  if type=="object" and .data then
    .data[] | select(.id != null) | .id
  elif type=="array" then
    .[] | select(.id != null) | .id
  else empty end
' 2>>"$LOG_FILE" || echo "")

if [ -n "$IN_PROGRESS_IDS" ]; then
  log "stale dispatch found, releasing"
  bd update "$IN_PROGRESS_IDS" --release --reason "orphan dispatch" >> "$LOG_FILE" 2>&1 || true
fi

# --- Step 2: Claim one ready task ---
log "claiming ready task"

READY_JSON=$(BD_JSON_ENVELOPE=1 bd ready --type task --limit 1 --claim --json 2>>"$LOG_FILE" || echo '{"data":[]}')

# Parse BEAD_ID robustly (handle envelope + array shapes)
BEAD_ID=$(echo "$READY_JSON" | jq -r '
  if type=="object" and .data then
    .data[0].id // empty
  elif type=="array" then
    .[0].id // empty
  else empty end
' 2>>"$LOG_FILE" || echo "")

if [ -z "$BEAD_ID" ]; then
  log "no ready bead found"
  exit 0
fi

log "claimed bead: $BEAD_ID"

# --- Step 3: Parse metadata ---
TITLE=$(echo "$READY_JSON" | jq -r '
  if type=="object" and .data then
    .data[0].title // empty
  elif type=="array" then
    .[0].title // empty
  else empty end
' 2>>"$LOG_FILE" || echo "")

EXTERNAL_REF=$(echo "$READY_JSON" | jq -r '
  if type=="object" and .data then
    .data[0].external_ref // empty
  elif type=="array" then
    .[0].external_ref // empty
  else empty end
' 2>>"$LOG_FILE" || echo "")

ISSUE_NUMBER=""
if [[ "$EXTERNAL_REF" =~ /issues/([0-9]+)$ ]]; then
  ISSUE_NUMBER="${BASH_REMATCH[1]}"
fi

PROJECT_NAME=$(echo "$TITLE" \
  | sed 's/\[App\] *//' \
  | tr '[:upper:]' '[:lower:]' \
  | tr ' ' '-' \
  | tr -cd 'a-z0-9_-')

log "parsed: project=$PROJECT_NAME, issue=$ISSUE_NUMBER"

# --- Step 4: Validate project dir + spec ---
if [ ! -d "projects/$PROJECT_NAME" ]; then
  log "project directory projects/$PROJECT_NAME does not exist"
  bd update "$BEAD_ID" --release --reason "project dir missing" >> "$LOG_FILE" 2>&1 || true
  exit 1
fi

SPEC_FILE="projects/$PROJECT_NAME/docs/spec.md"
if [ ! -f "$SPEC_FILE" ]; then
  log "spec.md not found in projects/$PROJECT_NAME/docs/spec.md"
  bd update "$BEAD_ID" --release --reason "spec missing" >> "$LOG_FILE" 2>&1 || true
  exit 1
fi

log "validation OK: project dir and spec.md found"

# --- Step 5: Write dispatch.json ---
CURRENT_DISPATCH_JSON="$ROOT_DIR/projects/$PROJECT_NAME/.dispatch.json"
DISPATCH_JSON="$CURRENT_DISPATCH_JSON"
CURRENT_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)

jq -n \
  --arg bead_id "$BEAD_ID" \
  --arg project_name "$PROJECT_NAME" \
  --arg issue_number "$ISSUE_NUMBER" \
  --arg started_at "$CURRENT_TIME" \
  --arg last_heartbeat "$CURRENT_TIME" \
  --argjson attempt 1 \
  --arg status "running" \
  '{
    bead_id: $bead_id,
    project_name: $project_name,
    issue_number: $issue_number,
    started_at: $started_at,
    last_heartbeat: $last_heartbeat,
    attempt: $attempt,
    status: $status
  }' > "$DISPATCH_JSON"

log "dispatch.json written: $DISPATCH_JSON"

# --- Step 6: Run pi agent ---
log "starting pi agent for $PROJECT_NAME"

cd "$ROOT_DIR/projects/$PROJECT_NAME"

PI_EXIT=0
pi -p "
Read the spec at docs/spec.md and implement it.
Work inside this directory.
Write tests, commit with message 'implement $PROJECT_NAME (#$ISSUE_NUMBER)', and create a PR.
" || PI_EXIT=$?

# --- Step 7: Auto‑implement from issue description (new) ---
if [ "$PI_EXIT" -eq 0 ]; then
  log "pi agent succeeded – running auto‑implement script"
  bash "$ROOT_DIR/scripts/auto-implement.sh"
fi

# --- Step 8: Handle pi result ---
if [ "$PI_EXIT" -eq 0 ]; then
  log "pi agent finished successfully"
fi