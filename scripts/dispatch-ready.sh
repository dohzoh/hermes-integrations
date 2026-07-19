#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

GITHUB_REPOSITORY="${GITHUB_REPOSITORY:-dohzoh/hermes-integrations}"

bd github pull --quiet 2>/dev/null || true

READY=$(bd ready --type task --limit 1 --claim --json 2>/dev/null || echo "[]")

BEAD_ID=$(echo "$READY" | jq -r '.[0].id // empty')
if [ -z "$BEAD_ID" ]; then
  exit 0
fi

TITLE=$(echo "$READY" | jq -r '.[0].title // empty')
EXTERNAL_REF=$(echo "$READY" | jq -r '.[0].external_ref // empty')

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

if [ ! -d "projects/$PROJECT_NAME" ]; then
  echo "Project directory not found: projects/$PROJECT_NAME" >&2
  bd update "$BEAD_ID" --status open --json 2>/dev/null || true
  exit 1
fi

SPEC_FILE="projects/$PROJECT_NAME/docs/spec.md"
if [ ! -f "$SPEC_FILE" ]; then
  echo "Spec file not found: $SPEC_FILE" >&2
  bd update "$BEAD_ID" --status open --json 2>/dev/null || true
  exit 1
fi

ISSUE_URL=""
if [ -n "$ISSUE_NUMBER" ]; then
  ISSUE_URL="https://github.com/$GITHUB_REPOSITORY/issues/$ISSUE_NUMBER"
fi

bd update "$BEAD_ID" --status in_progress --json 2>/dev/null || true

pi -p "
Read the spec at projects/$PROJECT_NAME/docs/spec.md and implement it.
Work inside projects/$PROJECT_NAME/.
Write tests, commit with message 'implement $PROJECT_NAME (#$ISSUE_NUMBER)', and create a PR.
" --workdir "$ROOT_DIR/projects/$PROJECT_NAME"

bd close "$BEAD_ID" --reason "Implemented via pi agent" --json 2>/dev/null || true
