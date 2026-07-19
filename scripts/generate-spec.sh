#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

if [ $# -lt 2 ]; then
  echo "Usage: $(basename "$0") <project-name> <issue-number>"
  echo "Requires ISSUE_BODY env var."
  exit 1
fi

PROJECT_NAME="$1"
ISSUE_NUMBER="$2"

if [ -z "${ISSUE_BODY:-}" ]; then
  echo "Error: ISSUE_BODY environment variable is empty" >&2
  exit 1
fi

MODEL="${OPENROUTER_MODEL:-google/gemini-2.0-flash-001}"

PROJECT_DIR="$ROOT_DIR/projects/$PROJECT_NAME"
mkdir -p "$PROJECT_DIR/docs"

PROMPT="以下のGitHub Issueを分析し、詳細な実装スペックを生成してください。
Issue内容:
---
$ISSUE_BODY
---
以下のセクションでMarkdown形式で出力してください:
1. Overview (概要)
2. Functional Requirements (機能要件)
3. Technical Design (技術設計)
4. File Structure (ファイル構成)
5. Implementation Phases (実装フェーズ)
6. Constraints (制約)
7. Acceptance Criteria (acceptance criteria)
言語は日本語で。"

RESPONSE=$(curl -s https://openrouter.ai/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -d "$(jq -n \
    --arg model "$MODEL" \
    --arg prompt "$PROMPT" \
    '{model: $model, messages: [{role: "user", content: $prompt}]}')")

SPEC=$(echo "$RESPONSE" | jq -r '.choices[0].message.content')

if [ -z "$SPEC" ] || [ "$SPEC" = "null" ]; then
  echo "Error: Failed to generate spec" >&2
  echo "$RESPONSE" >&2
  exit 1
fi

echo "$SPEC" > "$PROJECT_DIR/docs/spec.md"
echo "Spec written to $PROJECT_DIR/docs/spec.md"

gh issue comment "$ISSUE_NUMBER" --body "$SPEC"
echo "Spec posted to Issue #$ISSUE_NUMBER"
