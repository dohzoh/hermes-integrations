# Repository Guidelines

## Project Overview

**hermes-integrations** is a monorepo for small, experimental projects (prototypes, tools, automations). Each project lives under `projects/<name>/` as an independent unit. Once a prototype reaches completion, it graduates to its own standalone repository.

The monorepo itself is the **infrastructure layer**: scaffolding scripts, CI/CD pipelines, and Kanban orchestration that automate the flow from "idea" → "scaffolded project" → "implemented prototype" → "pull request."

The entire pipeline is designed for **fully automated, AI-driven development** using Hermes Agent (Kanban) + `pi` agent + OpenCode Zen.

---

## Architecture & Data Flow

```
GitHub Issue (app-idea template)
  │
  ▼
GitHub Actions (app-idea.yml)
  │  └─ Extracts project name from title
  │  └─ Runs scripts/create-project.sh
  │  └─ Runs scripts/generate-spec.sh (OpenRouter API → spec.md)
  │  └─ Commits scaffold + spec to projects/<name>/
  │  └─ Comments on Issue with status
  │
  ▼
GCE VM (cron: poll-issues.sh)
  │  └─ Queries open `app-idea` Issues
  │  └─ Creates Kanban card if not already queued
  │  └─ Assigns to hermes_worker
  │
  ▼
Hermes Kanban → Worker → pi agent
     └─ Worker reads task, delegates to `pi -p "..."` (AI coding agent)
     └─ pi agent reads spec.md, implements: edit files, write tests, commit, PR
```

### Key Layers

| Layer | Component | Role |
|-------|-----------|------|
| **Trigger** | GitHub Actions | Detect Issue → scaffold project + generate spec via OpenRouter API |
| **Orchestration** | Hermes Agent (Kanban) | Task queue, state machine, retry, worker dispatch |
| **Execution** | pi agent | Code generation, editing, bash, git operations |
| **Model** | OpenCode Zen | LLM backend with stable function calling |

---

## Key Directories

| Path | Purpose |
|------|---------|
| `scripts/` | Infrastructure scripts for scaffolding and polling |
| `scripts/create-project.sh` | Creates a new project directory structure |
| `scripts/generate-spec.sh` | Generates implementation spec from Issue via OpenRouter API |
| `scripts/poll-issues.sh` | Polls GitHub Issues → enqueues Kanban cards (GCE cron) |
| `.github/workflows/` | GitHub Actions automation |
| `.github/ISSUE_TEMPLATE/` | Issue templates for `app-idea` |
| `projects/` | Individual project directories (each self-contained) |
| `projects/<name>/src/` | Source code for a project |
| `projects/<name>/tests/` | Tests for a project |
| `projects/<name>/docs/` | Documentation for a project |

---

## Development Commands

### Scaffold a new project

```bash
# Interactive (prompts for name)
./scripts/create-project.sh my-project

# With issue URL (includes reference in README)
./scripts/create-project.sh my-project --issue https://github.com/owner/repo/issues/42
```

### Manual Kanban enqueue

```bash
hermes kanban create "implement my-project (#42)" \
  --body "Description..." \
  --assignee hermes_worker
```

### Generate spec from Issue (manual)

```bash
export OPENROUTER_API_KEY="sk-..."
ISSUE_BODY="$(gh issue view 42 --json body -q .body)"
ISSUE_BODY="$ISSUE_BODY" bash scripts/generate-spec.sh my-project 42
```

### Working inside a project

Each project is independent with its own language, framework, and tooling. There are no monorepo-wide build/test commands — run project-specific commands inside `projects/<name>/`.

### Infrastructure scripts

```bash
# Simulate issue polling (dry run against local state)
GITHUB_REPOSITORY="owner/repo" bash scripts/poll-issues.sh
```

---

## Code Conventions & Common Patterns

### Monorepo conventions

- **Project names**: lowercase, kebab-case, alphanumeric only (`a-z0-9_-`), must start with a letter.
- **Project structure**: every project gets `src/`, `tests/`, `docs/`, `README.md`, `.gitignore`.
- **No shared dependencies** across projects — each project manages its own (Python venv, npm packages, etc.).
- **No monorepo-level package.json / Cargo.toml / pyproject.toml** — all tooling is project-local.

### Shell scripts

- Use `#!/usr/bin/env bash` with `set -euo pipefail`.
- Root discovery: `"$(cd "$(dirname "$0")/.." && pwd)"`.

### Workflows & automation

- Issue → scaffold pipeline: GitHub Actions, triggered on `issues: [opened, labeled]` when label `app-idea` present.
- Kanban → implement pipeline: GCE cron runs `poll-issues.sh`, Hermes Worker delegates to `pi` agent.
- Commit messages from automation: `scaffold <name> from #<N>`, `implement <name> (#<N>)`.

### AI agent patterns (Hermes Worker + pi)

- Worker **never writes code directly** — it reads task details, crafts a prompt, and delegates to `pi` via `terminal(command="pi -p '...'")`.
- Worker uses `kanban_show()`, `kanban_complete()`, `kanban_block()`, `kanban_comment()` for lifecycle.
- `pi` agent uses `--provider opencode --model opencode/deepseek-v4-flash`.
- `pi` runs with `--workdir $HERMES_KANBAN_WORKSPACE` (scoped to the project).
- Failed tasks: retry with a different model before blocking.

### Python project pattern (reference: `github-trend-twitterx`)

- Single-file scripts or small modules — no framework, no package boilerplate.
- `argparse` for CLI, `dataclass` for value objects.
- `main()` returns `int` (exit code), guarded by `if __name__ == "__main__": sys.exit(main())`.
- Type hints used throughout (`list[Repo]`, `str | None`).
- Playwright for browser automation when APIs aren't available.

---

## Important Files

| File | Purpose |
|------|---------|
| `scripts/create-project.sh` | Project scaffolding script |
| `scripts/generate-spec.sh` | Issue → spec generation via OpenRouter API |
| `scripts/poll-issues.sh` | GitHub Issue → Kanban poller (cron target) |
| `.github/workflows/app-idea.yml` | Actions workflow: Issue → scaffold + spec |
| `.github/ISSUE_TEMPLATE/app-idea.md` | Issue template for new project ideas |

---

## Runtime / Tooling Preferences

| Tool | Purpose | Notes |
|------|---------|-------|
| **Hermes Agent** | Kanban task orchestration | Installed via `curl -fsSL https://hermes-agent.sh/install \| sh` |
| **pi agent** | AI coding agent (read/bash/edit/write) | Installed via `curl -fsSL https://pi.sh/install \| sh` |
| **GitHub CLI (`gh`)** | Issue polling, PR creation | `sudo apt install gh` |
| **Bun** | pi agent runtime | `curl -fsSL https://bun.sh/install \| bash` |
| **OpenCode Zen** | LLM provider | API key via `OPENCODE_API_KEY` env var |
| **OpenRouter** | Spec generation (Actions) | API key via `OPENROUTER_API_KEY` GitHub Secret |
| **Playwright** | Browser automation (reference project) | `pip install playwright && playwright install chromium` |

**No monorepo-level language runtime** — each project defines its own. The infra layer (scripts, workflows) is bash + YAML.

---

## Testing & QA

- **No monorepo-level test suite.** Each project manages its own tests in `projects/<name>/tests/`.
- The pi agent writes and runs tests during implementation (part of its prompt).
- Testing framework varies per project; the `github-trend-twitterx` reference uses no test framework (manual dry-run via `--post` / `--reply` flags).
- CI runs per-project on extraction to standalone repo (not in this monorepo).
