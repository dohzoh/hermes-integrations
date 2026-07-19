# Repository Guidelines

## Project Overview

**hermes-integrations** is a monorepo for small, experimental projects (prototypes, tools, automations). Each project lives under `projects/<name>/` as an independent unit. Once a prototype reaches completion, it graduates to its own standalone repository.

The monorepo itself is the **infrastructure layer**: scaffolding scripts, CI/CD pipelines, and Beads orchestration that automate the flow from "idea" → "scaffolded project" → "implemented prototype" → "pull request."

The entire pipeline is designed for **fully automated, AI-driven development** using Beads (`bd`) + `pi` agent + OpenCode Zen.

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
GCE VM (cron: scripts/dispatch-ready.sh)
  │  └─ Runs bd github pull (syncs GitHub Issues → Beads)
  │  └─ Runs bd ready --claim (finds unblocked work)
  │  └─ Dispatches to pi agent
  │
  ▼
pi agent
   └─ Reads spec.md, implements: edit files, write tests, commit, PR
   └─ bd close on completion
```

### Key Layers

| Layer | Component | Role |
|-------|-----------|------|
| **Trigger** | GitHub Actions | Detect Issue → scaffold project + generate spec via OpenRouter API |
| **Orchestration** | Beads (`bd`) | Dependency-aware issue tracker, ready-work dispatch, Dolt-backed state |
| **Execution** | pi agent | Code generation, editing, bash, git operations |
| **Model** | OpenCode Zen | LLM backend with stable function calling |

---

## Key Directories

| Path | Purpose |
|------|---------|
| `scripts/` | Infrastructure scripts for scaffolding and dispatch |
| `scripts/create-project.sh` | Creates a new project directory structure |
| `scripts/generate-spec.sh` | Generates implementation spec from Issue via OpenRouter API |
| `scripts/dispatch-ready.sh` | Syncs GitHub Issues → Beads, dispatches ready work to pi (GCE cron) |
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

### Generate spec from Issue (manual)

```bash
export OPENROUTER_API_KEY="sk-..."
ISSUE_BODY="$(gh issue view 42 --json body -q .body)"
ISSUE_BODY="$ISSUE_BODY" bash scripts/generate-spec.sh my-project 42
```

### Dispatch ready work (manual)

```bash
bash scripts/dispatch-ready.sh
```

### Beads commands

```bash
bd init                          # Initialize Beads in repo
bd github pull                   # Sync GitHub Issues → Beads
bd ready --json                  # List ready (unblocked) work
bd ready --claim --json          # Atomically claim next ready issue
bd create "Task" -t task -p 1   # Create a new issue
bd show bd-42 --json             # Show issue details
bd close bd-42 --reason "Done"   # Close an issue
bd dolt push                     # Sync database to remote
```

### Working inside a project

Each project is independent with its own language, framework, and tooling. There are no monorepo-wide build/test commands — run project-specific commands inside `projects/<name>/`.

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
- Ready-work → implement pipeline: GCE cron runs `dispatch-ready.sh`, which syncs GitHub Issues via `bd github pull`, finds ready work via `bd ready --claim`, and dispatches to pi agent.
- Commit messages from automation: `scaffold <name> from #<N>`, `implement <name> (#<N>)`.

### AI agent patterns (Beads + pi)

- `dispatch-ready.sh` claims a Beads issue atomically via `bd ready --claim`, then dispatches to `pi -p "..." --workdir projects/<name>`.
- `pi` agent reads `spec.md`, implements the feature, writes tests, commits, creates PR.
- On success, `dispatch-ready.sh` runs `bd close` with the issue ID.
- On failure, the issue stays `in_progress` (not closed); next cron run will skip it since it's already claimed.
- `pi` agent uses `--provider opencode --model opencode/deepseek-v4-flash`.

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
| `scripts/dispatch-ready.sh` | Beads sync + ready-work dispatch (cron target) |
| `.github/workflows/app-idea.yml` | Actions workflow: Issue → scaffold + spec |
| `.github/ISSUE_TEMPLATE/app-idea.md` | Issue template for new project ideas |

---

## Runtime / Tooling Preferences

| Tool | Purpose | Notes |
|------|---------|-------|
| **Beads (`bd`)** | Issue tracking & orchestration | `curl -fsSL https://raw.githubusercontent.com/gastownhall/beads/main/scripts/install.sh \| bash` |
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
