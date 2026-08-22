#!/usr/bin/env bash
set -euo pipefail

# auto-implement.sh
# - Fetches the GitHub Issue that triggered this dispatch
# - Sends the issue description to an LLM (OpenRouter) to generate minimal code
# - Writes generated files under projects/<project_name>/
# - Commits the scaffold

###############################################################################
# 1. Configuration / environment
###############################################################################

# Root of the monorepo (same as where dispatch-ready.sh runs)
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Where project folders live
PROJECTS_DIR="$ROOT_DIR/projects"

# The project directory that dispatches-ready.sh already resolved
# It is stored in dispatch.json; fall back to the environment variable if set.
DISPATCH_JSON="${DISPATCH_JSON:-}"
if [ -z "$DISPATCH_JSON" ]; then
  # try to read from the last dispatch file created by dispatch-ready.sh
  # look in the repo root for any .dispatch.json
  DISPATCH_JSON=$(ls -t "$ROOT_DIR/projects/"*.dispatch.json 2>/dev/null | head -1)
fi

if [ -z "$DISPATCH_JSON" ] || [ ! -f "$DISPATCH_JSON" ]; then
  echo "❌ Could not locate dispatch.json – cannot determine project/issue" >&2
  exit 1
fi

# Pull metadata from dispatch.json
BEAD_ID=$(jq -r '.bead_id' "$DISPATCH_JSON")
PROJECT_NAME=$(jq -r '.project_name' "$DISPATCH_JSON")
ISSUE_NUMBER=$(jq -r '.issue_number' "$DISPATCH_JSON")

# If issue number is missing, try to derive it from the bead id or gh issue list
if [ -z "$ISSUE_NUMBER" ]; then
  # Strip leading "bd-" if present
  ISSUE_NUMBER=$(echo "$BEAD_ID" | sed 's/^bd-//')
fi

# If still missing, attempt to find the most recent app-idea issue via gh
if [ -z "$ISSUE_NUMBER" ]; then
  ISSUE_NUMBER=$(gh issue list --label app-idea --limit 1 --json number -q '.[0].number' 2>/dev/null || echo "")
fi

echo "🔎 Detected bead=$BEAD_ID project=$PROJECT_NAME issue=#$ISSUE_NUMBER"

###############################################################################
# 2. Fetch issue body from GitHub
###############################################################################

if [ -z "$ISSUE_NUMBER" ]; then
  echo "❌ No issue number available – cannot fetch issue body" >&2
  exit 1
fi

ISSUE_BODY=$(gh issue view "$ISSUE_NUMBER" --json body -q .body 2>/dev/null || echo "")
if [ -z "$ISSUE_BODY" ]; then
  echo "⚠️ Could not fetch issue #$ISSUE_NUMBER body – using minimal stub" >&2
  ISSUE_BODY="Create an English training app where the user replies in 3 words."
fi

echo "📄 Fetched issue #$ISSUE_NUMBER body (truncated)"

###############################################################################
# 3. Generate code via LLM (OpenRouter) or fallback stub
###############################################################################

# If OpenRouter key is available, ask the model to produce JSON of file->content.
# Otherwise use a hard‑coded stub that provides a working "greet" function etc.

GENERATED_JSON=""

if [ -n "${OPENROUTER_API_KEY:-}" ]; then
  echo "🤖 Sending issue to OpenRouter LLM…"
  PROMPT="You are a helpful assistant that writes minimal, runnable Node.js (ES‑module) code from a GitHub Issue description.

Issue #$ISSUE_NUMBER:
$ISSUE_BODY

Generate a JSON object with exactly these four keys and no other text:
{
  \"src/main.js\": \"<minimal runnable code>\",
  \"tests/test.js\": \"<minimal test code>\",
  \"package.json\": \"<minimal package.json>\",
  \"README.md\": \"< brief README >\"
}

Requirements:
- src/main.js must export at least one function (e.g. greet(name)).
- tests/test.js must import from ../src/main.js and contain at least one test.
- package.json must have \"type\": \"module\" and a test script.
- README.md should be a one‑line description.
- Keep each file as short as possible while still being functional.

Output **only** the JSON object – no surrounding markdown, no explanations."
  # Call OpenRouter
  RESPONSE=$(curl -sS \
    -H "Authorization: Bearer $OPENROUTER_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"model\":\"openrouter/deepseek-v4-flash\",\"messages\":[{\"role\":\"user\",\"content\":\"$PROMPT\"}]}" \
    https://openrouter.ai/api/v1/chat/completions)

  # Extract the content field
  GENERATED_JSON=$(echo "$RESPONSE" | jq -r '.choices[0].message.content // empty' 2>/dev/null || echo "")
  if [ -z "$GENERATED_JSON" ]; then
    echo "⚠️ LLM returned empty – falling back to stub" >&2
    GENERATED_JSON='{
        "src/main.js": "export function greet(name) { return `Hello, ${name}!`; }",
        "tests/test.js": "import { greet } from \`../src/main.js\`; test(\"greet says hello\", () => { expect(greet(\"World\")).toBe(\"Hello, World!\"); });",
        "package.json": "{\"name\":\"english-training-\",\"version\":\"1.0.0\",\"type\":\"module\",\"scripts\":{\"test\":\"node --test tests/*.test.js\"}}",
        "README.md": "# english-training-\nAuto‑generated scaffold from issue #$ISSUE_NUMBER"
    }'
  fi
else
  echo "⚠️ OPENROUTER_API_KEY not set – using stub generator"
  # Simple deterministic stub that always creates a "greet" function and a test
  GENERATED_JSON='{
        "src/main.js": "export function greet(name) { return \`Hello, \${name}!\`; }",
        "tests/test.js": "import { greet } from \`../src/main.js\`; test(\"greet says hello\", () => { expect(greet(\"World\")).toBe(\"Hello, World!\"); });",
        "package.json": "{\"name\":\"english-training-\",\"version\":\"1.0.0\",\"type\":\"module\",\"scripts\":{\"test\":\"node --test tests/*.test.js\"}}",
        "README.md": "# english-training-\nAuto‑generated scaffold from issue #$ISSUE_NUMBER"
    }'
fi

###############################################################################
# 4. Write generated files under the project directory
###############################################################################

# The project directory is already known from dispatch.json; ensure it exists
PROJECT_DIR="$PROJECTS_DIR/$PROJECT_NAME"
mkdir -p "$PROJECT_DIR/src" "$PROJECT_DIR/tests"

# Parse the JSON and write each file
echo "$GENERATED_JSON" | jq -r '.["src/main.js"]' > "$PROJECT_DIR/src/main.js"
echo "$GENERATED_JSON" | jq -r '.["tests/test.js"]' > "$PROJECT_DIR/tests/test.js"
echo "$GENERATED_JSON" | jq -r '.["package.json"]' > "$PROJECT_DIR/package.json"
echo "$GENERATED_JSON" | jq -r '.["README.md"]' > "$PROJECT_DIR/README.md"

echo "✅ Files written to $PROJECT_DIR"
ls -l "$PROJECT_DIR/"

###############################################################################
# 5. Git add / commit
###############################################################################

cd "$PROJECT_DIR"

# Stage everything (new and modified)
git add -A

# Commit with a message that references the issue
if git commit -m "auto‑implement issue #$ISSUE_NUMBER – scaffold from LLM"; then
  echo "📦 Committed scaffold for issue #$ISSUE_NUMBER"
else
  echo "⚠️ Commit failed (maybe nothing changed or already committed)" >&2
fi

exit 0