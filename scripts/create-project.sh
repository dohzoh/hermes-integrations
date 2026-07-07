#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PROJECTS_DIR="$ROOT_DIR/projects"

usage() {
  cat <<EOF
Usage: $(basename "$0") <project-name> [--issue <url>]

Create a new project directory under projects/ with standard structure.

Arguments:
  project-name    Hyphenated name (e.g., my-cool-app)
  --issue <url>   Link to GitHub Issue (optional)

Example:
  $(basename "$0") my-cool-app --issue https://github.com/user/hermes-integrations/issues/1
EOF
  exit 1
}

if [ $# -lt 1 ]; then
  usage
fi

PROJECT_NAME="$1"
shift

ISSUE_URL=""

while [ $# -gt 0 ]; do
  case "$1" in
    --issue)
      ISSUE_URL="$2"
      shift 2
      ;;
    *)
      usage
      ;;
  esac
done

# Validate project name
if ! echo "$PROJECT_NAME" | grep -qE '^[a-z][a-z0-9_-]*$'; then
  echo "Error: Project name must start with a letter and contain only lowercase letters, digits, hyphens, or underscores."
  exit 1
fi

PROJECT_DIR="$PROJECTS_DIR/$PROJECT_NAME"

if [ -d "$PROJECT_DIR" ]; then
  echo "Error: Project '$PROJECT_NAME' already exists at $PROJECT_DIR"
  exit 1
fi

# Create directory structure
mkdir -p "$PROJECT_DIR"/{src,tests,docs}
touch "$PROJECT_DIR"/src/.gitkeep
touch "$PROJECT_DIR"/tests/.gitkeep
touch "$PROJECT_DIR"/docs/.gitkeep

# Create .gitignore
cat > "$PROJECT_DIR/.gitignore" <<GITIGNORE
# Project specific
node_modules/
.env
dist/
build/
*.log
.DS_Store
GITIGNORE

# Create README.md
{
  echo "# $PROJECT_NAME"
  echo ""
  if [ -n "$ISSUE_URL" ]; then
    echo "> Issue: [$ISSUE_URL]($ISSUE_URL)"
    echo ""
  fi
  echo "## Overview"
  echo ""
  echo "TODO: Write project description"
  echo ""
  echo "## Getting Started"
  echo ""
  echo '```bash'
  echo '# Setup instructions'
  echo '```'
  echo ""
  echo "## Structure"
  echo ""
  echo '```'
  echo "$PROJECT_NAME/"
  echo "├── src/"
  echo "├── tests/"
  echo "├── docs/"
  echo "├── README.md"
  echo "└── .gitignore"
  echo '```'
} > "$PROJECT_DIR/README.md"

echo "✅ Project '$PROJECT_NAME' created at $PROJECT_DIR"
echo "   Directory structure:"
echo "   $PROJECT_DIR/"
echo "   ├── src/"
echo "   ├── tests/"
echo "   ├── docs/"
echo "   ├── README.md"
echo "   └── .gitignore"
