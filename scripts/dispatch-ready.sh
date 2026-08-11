#!/usr/bin/env bash
set -euo pipefail

# brew-installed tools (bd, gh, jq, ...) — cron PATH doesn't include linuxbrew
if [ -x /home/linuxbrew/.linuxbrew/bin/brew ] && ! command -v bd >/dev/null 2>&1; then
  eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
fi

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
  local EXIT_CODE=$?
  # Only attempt cleanup if we've already written a dispatch.json
  if [ -n "${CURRENT_DISPATCH_JSON:-}" ] && [ -f "$CURRENT_DISPATCH_JSON" ]; then
    local STATUS=$(jq -r '.status // empty' "$CURRENT_DISPATCH_JSON" 2>/dev/null || echo "")
    if [ "$STATUS" = "running" ]; then
      local BEAD_ID=$(jq -r '.bead_id // empty' "$CURRENT_DISPATCH_JSON" 2>/dev/null || echo "")
      if [ -n "$BEAD_ID" ]; then
        log "cleanup: releasing stuck bead $BEAD_ID (exit code $EXIT_CODE)"
        bd update "$BEAD_ID" --status open >> "$LOG_FILE" 2>&1 || log "cleanup: failed to release bead $BEAD_ID"
      fi
      rm -f "$CURRENT_DISPATCH_JSON"
    fi
  fi
  exit "$EXIT_CODE"
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
  while IFS= read -r BEAD_ID; do
    [ -z "$BEAD_ID" ] && continue
    log "found in-progress bead: $BEAD_ID"

    # Try to find dispatch.json for this bead across all project directories
    DISPATCH_JSON=""
    for f in $(find "$ROOT_DIR/projects" -name ".dispatch.json" 2>/dev/null); do
      if jq -e --arg id "$BEAD_ID" ".bead_id == \$id and .status == \"running\"" "$f" >/dev/null 2>&1; then
        DISPATCH_JSON="$f"
        break
      fi
    done

    if [ -n "$DISPATCH_JSON" ]; then
      # Has dispatch.json with running status — check staleness
      STARTED_AT=$(jq -r '.started_at // empty' "$DISPATCH_JSON" 2>/dev/null || echo "")
      if [ -n "$STARTED_AT" ]; then
        STARTED_EPOCH=$(date -d "$STARTED_AT" +%s 2>/dev/null || echo 0)
        NOW_EPOCH=$(date -u +%s)
        ELAPSED=$((NOW_EPOCH - STARTED_EPOCH))
        if [ "$ELAPSED" -gt "$STALE_THRESHOLD" ]; then
          log "stale dispatch: $BEAD_ID (elapsed ${ELAPSED}s > ${STALE_THRESHOLD}s), releasing"
          bd update "$BEAD_ID" --status open >> "$LOG_FILE" 2>&1 || log "failed to release stale bead $BEAD_ID"
          rm -f "$DISPATCH_JSON"
        else
          log "in-progress bead $BEAD_ID still running (elapsed ${ELAPSED}s), skipping dispatch"
          # Another pi is running — exit without claiming new work
          log "=== dispatch-ready end (another dispatch in progress) ==="
          exit 0
        fi
      fi
    else
      # No dispatch.json — orphan (crashed mid-run), release
      log "orphan bead: $BEAD_ID (no dispatch.json), releasing"
      bd update "$BEAD_ID" --status open >> "$LOG_FILE" 2>&1 || log "failed to release orphan bead $BEAD_ID"
    fi
  done <<< "$IN_PROGRESS_IDS"
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
  log "no ready work found, exiting"
  log "=== dispatch-ready end (no ready work) ==="
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
elif [[ "$EXTERNAL_REF" =~ ^gh-([0-9]+)$ ]]; then
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
  log "ERROR: Project directory not found: projects/$PROJECT_NAME"
  bd update "$BEAD_ID" --status open >> "$LOG_FILE" 2>&1 || log "failed to release bead $BEAD_ID"
  log "=== dispatch-ready end (validation failed) ==="
  exit 1
fi

SPEC_FILE="projects/$PROJECT_NAME/docs/spec.md"
if [ ! -f "$SPEC_FILE" ]; then
  log "ERROR: Spec file not found: $SPEC_FILE"
  bd update "$BEAD_ID" --status open >> "$LOG_FILE" 2>&1 || log "failed to release bead $BEAD_ID"
  log "=== dispatch-ready end (validation failed) ==="
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

# --- Step 7: Handle pi result ---
if [ "$PI_EXIT" -eq 0 ]; then
  log "pi agent completed successfully (exit 0)"
  # Update dispatch.json with final status
  jq '.status = "done" | .finished_at = "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'" | .exit_code = 0' "$CURRENT_DISPATCH_JSON" > "${CURRENT_DISPATCH_JSON}.tmp" && mv "${CURRENT_DISPATCH_JSON}.tmp" "$CURRENT_DISPATCH_JSON"
  # Close the bead
  bd close "$BEAD_ID" --reason "Implemented via pi agent" >> "$LOG_FILE" 2>&1
  log "bead $BEAD_ID closed"
  rm -f "$CURRENT_DISPATCH_JSON"
  log "=== dispatch-ready end (success) ==="
  exit 0
else
  log "pi agent FAILED (exit $PI_EXIT)"
  # Update dispatch.json with final status
  jq '.status = "failed" | .finished_at = "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'" | .exit_code = '"$PI_EXIT" "$CURRENT_DISPATCH_JSON" > "${CURRENT_DISPATCH_JSON}.tmp" && mv "${CURRENT_DISPATCH_JSON}.tmp" "$CURRENT_DISPATCH_JSON"
  # Release the bead back to open for retry
  bd update "$BEAD_ID" --status open >> "$LOG_FILE" 2>&1 || log "failed to release bead $BEAD_ID after pi failure"
  log "bead $BEAD_ID released back to open (attempt for retry)"
  rm -f "$CURRENT_DISPATCH_JSON"
  log "=== dispatch-ready end (pi failed) ==="
  exit "$PI_EXIT"
fi
