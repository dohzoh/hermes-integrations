#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------------------------------
# post‑pi‑agent.sh
# Runs after the pi agent finishes successfully (exit status 0) in
# scripts/dispatch-ready.sh. Its purpose is to:
#   1. Verify that the project directory and spec.md are present.
#   2. Run any project‑specific tests (if a package.json & test runner exist).
#   3. Show the current git state so the operator can review changes.
#   4. Optionally stage, commit and push the implementation.
#
# The script exits with 0 on success, or non‑zero if something is amiss.
# ---------------------------------------------------------------------------

ROOT="$(cd "$(dirname "$0")/.." && pwd)"          # hermes‑integrations root
PROJECT="${ROOT}/projects/english-training-"
SPEC="${PROJECT}/docs/spec.md"

# 1️⃣ Basic sanity checks
if [ ! -d "$PROJECT" ]; then
  echo "❌ Project directory $PROJECT not found"
  exit 1
fi
if [ ! -f "$SPEC" ]; then
  echo "❌ Spec file $SPEC not found"
  exit 1
fi

echo "✅ Project directory and spec.md present"

# 2️⃣ Run tests if package.json exists
if [ -f "$PROJECT/package.json" ]; then
  echo "🧪 Running tests (npm test)…"
  cd "$PROJECT"
  npm test || { echo "❌ Tests failed"; exit 1; }
  echo "✅ Tests passed"
else
  echo "ℹ️ No package.json – skipping tests"
fi

# 3️⃣ Show git status / diff
echo "📋 Git status:"
cd "$ROOT"
git status
echo "📝 Recent changes (git diff):"
git diff

# 4️⃣ Optional auto‑commit / push (disabled by default; enable by setting AUTO_COMMIT=1)
if [ "${AUTO_COMMIT:-0}" = "1" ]; then
  ISSUE_NUMBER="${ISSUE_NUMBER:-unknown}"
  COMMIT_MSG="implement english-training- (#${ISSUE_NUMBER})"
  echo "🚀 Auto‑commit enabled – committing as: $COMMIT_MSG"
  git add "$PROJECT/src/$PROJECT".js "$PROJECT/tests/test.js" 2>/dev/null || true
  git commit -m "$COMMIT_MSG" || echo "⚠️ No changes to commit"
  git push origin main || echo "⚠️ push failed"
else
  echo "ℹ️ Set AUTO_COMMIT=1 in the environment to auto‑commit/push"
fi

echo "✅ post‑pi‑agent.sh completed successfully"
exit 0