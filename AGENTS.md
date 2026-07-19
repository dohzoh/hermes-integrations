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
  │  └─ Commits scaffold to projects/<name>/
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
     └─ pi agent implements: edit files, write tests, commit, PR
```

### Key Layers

| Layer | Component | Role |
|-------|-----------|------|
| **Trigger** | GitHub Actions | Detect Issue → scaffold project + commit |
| **Orchestration** | Hermes Agent (Kanban) | Task queue, state machine, retry, worker dispatch |
| **Execution** | pi agent | Code generation, editing, bash, git operations |
| **Model** | OpenCode Zen | LLM backend with stable function calling |

---

## Key Directories

| Path | Purpose |
|------|---------|
| `scripts/` | Infrastructure scripts for scaffolding and polling |
| `scripts/create-project.sh` | Creates a new project directory structure |
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
| `scripts/poll-issues.sh` | GitHub Issue → Kanban poller (cron target) |
| `.github/workflows/app-idea.yml` | Actions workflow: Issue → scaffold |
| `.github/ISSUE_TEMPLATE/app-idea.md` | Issue template for new project ideas |
| `projects/github-trend-twitterx/github_trend_twitterx.py` | Reference project: Python + Playwright automation |

---

## Runtime / Tooling Preferences

| Tool | Purpose | Notes |
|------|---------|-------|
| **Hermes Agent** | Kanban task orchestration | Installed via `curl -fsSL https://hermes-agent.sh/install \| sh` |
| **pi agent** | AI coding agent (read/bash/edit/write) | Installed via `curl -fsSL https://pi.sh/install \| sh` |
| **GitHub CLI (`gh`)** | Issue polling, PR creation | `sudo apt install gh` |
| **Bun** | pi agent runtime | `curl -fsSL https://bun.sh/install \| bash` |
| **OpenCode Zen** | LLM provider | API key via `OPENCODE_API_KEY` env var |
| **Playwright** | Browser automation (reference project) | `pip install playwright && playwright install chromium` |

**No monorepo-level language runtime** — each project defines its own. The infra layer (scripts, workflows) is bash + YAML.

---

## Testing & QA

- **No monorepo-level test suite.** Each project manages its own tests in `projects/<name>/tests/`.
- The pi agent writes and runs tests during implementation (part of its prompt).
- Testing framework varies per project; the `github-trend-twitterx` reference uses no test framework (manual dry-run via `--post` / `--reply` flags).
- CI runs per-project on extraction to standalone repo (not in this monorepo).

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:970c3bf2 -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/SYNC_CONCEPTS.md for details and anti-patterns.

## Agent Context Profiles

The managed Beads block is task-tracking guidance, not permission to override repository, user, or orchestrator instructions.

- **Conservative (default)**: Use `bd` for task tracking. Do not run git commits, git pushes, or Dolt remote sync unless explicitly asked. At handoff, report changed files, validation, and suggested next commands.
- **Minimal**: Keep tool instruction files as pointers to `bd prime`; use the same conservative git policy unless active instructions say otherwise.
- **Team-maintainer**: Only when the repository explicitly opts in, agents may close beads, run quality gates, commit, and push as part of session close. A current "do not commit" or "do not push" instruction still wins.

## Session Completion

This protocol applies when ending a Beads implementation workflow. It is subordinate to explicit user, repository, and orchestrator instructions.

1. **File issues for remaining work** - Create beads for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **Handle git/sync by active profile**:
   ```bash
   # Conservative/minimal/default: report status and proposed commands; wait for approval.
   git status

   # Team-maintainer opt-in only, unless current instructions forbid it:
   git pull --rebase
   bd dolt push
   git push
   git status
   ```
5. **Hand off** - Summarize changes, validation, issue status, and any blocked sync/commit/push step

**Critical rules:**
- Explicit user or orchestrator instructions override this Beads block.
- Do not commit or push without clear authority from the active profile or the current user request.
- If a required sync or push is blocked, stop and report the exact command and error.
<!-- END BEADS INTEGRATION -->

<!-- BEGIN BEADS CODEX SETUP: generated by bd setup codex -->
## Beads Issue Tracker

Use Beads (`bd`) for durable task tracking in repositories that include it. Use the `beads` skill at `.agents/skills/beads/SKILL.md` (project install) or `~/.agents/skills/beads/SKILL.md` (global install) for Beads workflow guidance, then use the `bd` CLI for issue operations.

### Quick Reference

```bash
bd ready                # Find available work
bd show <id>            # View issue details
bd update <id> --claim  # Claim work
bd close <id>           # Complete work
bd prime                # Refresh Beads context
```

### Rules

- Use `bd` for all task tracking; do not create markdown TODO lists.
- Run `bd prime` when Beads context is missing or stale. Codex 0.129.0+ can load Beads context automatically through native hooks; use `/hooks` to inspect or toggle them.
- Keep persistent project memory in Beads via `bd remember`; do not create ad hoc memory files.

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/SYNC_CONCEPTS.md for details and anti-patterns.
<!-- END BEADS CODEX SETUP -->
