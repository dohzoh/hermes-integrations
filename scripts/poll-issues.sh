#!/usr/bin/env bash
set -euo pipefail

GITHUB_REPOSITORY="${GITHUB_REPOSITORY:-dohzoh/hermes-integrations}"

gh issue list --label app-idea --state open --json number,title,body \
  | jq -c '.[]' | while read -r issue; do

  NUMBER=$(echo "$issue" | jq -r '.number')
  TITLE=$(echo "$issue" | jq -r '.title')
  BODY=$(echo "$issue" | jq -r '.body')

  if hermes kanban list --json \
    | jq -e ".[] | select(.title | contains(\"#$NUMBER\"))" > /dev/null 2>&1; then
    continue
  fi

  PROJECT_NAME=$(echo "$TITLE" | sed 's/\[App\] *//' | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd 'a-z0-9_-')

  if [ ! -d "projects/$PROJECT_NAME" ]; then
    bash scripts/create-project.sh "$PROJECT_NAME" \
      --issue "https://github.com/$GITHUB_REPOSITORY/issues/$NUMBER"
  fi

  hermes kanban create \
    "$PROJECT_NAME を実装 (#$NUMBER)" \
    --body "$BODY" \
    --assignee worker
done
