# Dispatch Flow Redesign — Design Doc

**Date**: 2024-07-30
**Author**: pi agent
**Project**: hermes-integrations
**Target**: `scripts/dispatch-ready.sh` (GCE cron)

## 1. Problem Statement

The current dispatch flow (`scripts/dispatch-ready.sh`) has three bugs:

1. **JSON format change breaks parsing silently**: `bd ready --json` now emits a v2.0 envelope NOTE and the format is changing. The current parser (`jq '.[0].id'`) expects the old flat-array format. When parsing fails, `BEAD_ID` becomes empty and the script `exit 0`s — a silent no-op. Issues pile up unprocessed.

2. **`pi` failure is not checked**: The script runs `bd close` unconditionally after `pi`, so a failed `pi` run wrongly closes the bead with reason "Implemented via pi agent" — reporting success on failure.

3. **Recovery is best-effort (`|| true`)**: On validation failures (project dir missing, spec missing), the script tries `bd update --status open || true`. If that fails, the bead stays `in_progress` and the next cron run skips it (claimed) — it rots. This is the "bead error shutdown" / "何が起こったかわからないまま止まる" problem.

Additionally, there is no visibility into "in-progress but unknown state" beads — a `pi` run can crash mid-flight and leave a bead claimed with no record of what it was doing.

## 2. Goals & Non-Goals

### Goals
- Adopt the new `BD_JSON_ENVELOPE=1` format and parse both old/new shapes robustly.
- Close the bead **only on `pi` success**; release it on failure.
- Make recovery reliable: no `|| true` swallowing on status transitions; use a trap to release on mid-flight death.
- Add **orphan/stale detection**: find in-progress beads with no `dispatch.json` (or timed out) and release them.
- Ensure `pi` is **never launched when there's no ready work**.
- Split concerns: `git pull` is **not** in the dispatch flow.
- Log every step with timestamps so failures are diagnosable.

### Non-Goals
- No monorepo-wide builds or test suites.
- No restructuring of the Beads issue model itself.
- `pi` execution is charged; must not run spuriously.

## 3. Constraints

- Issues are added only a few times per day → cron cadence is **hourly-ish**, not minute-level.
- `pi` agent is a paid resource → must only run when there is genuinely ready work.
- `pi` runs serially (one `pi` process per machine) → a new dispatch must not start if one is already running.
- Timeout for a stuck `pi` run: **2 hours** (confirmed). After 2 hours with no `dispatch.json` update, release the bead.
- Local environment has `bd` installed; no Dolt DB is present locally, so live probing of `bd ready` output was done via `bd help` and config inspection.

## 4. Architecture

### Scripts
Split into three independent scripts, each its own cron line:

```
scripts/
├── git-sync.sh          # git pull --rebase only (separate cadence)
├── bd-sync.sh           # bd github sync --pull-only only
└── dispatch-ready.sh    # claim ONE ready task → dispatch to pi (the redesign target)
```

### Cron (GCE) — hourly-ish cadence
```
0   */6 * * *  bash scripts/git-sync.sh       >> logs/git-sync.log 2>&1
15  */3 * * *  bash scripts/bd-sync.sh         >> logs/bd-sync.log 2>&1
30  */4 * * *  bash scripts/dispatch-ready.sh  >> logs/dispatch.log 2>&1
```

### dispatch.json — per-dispatch ledger
Located at `projects/<name>/.dispatch.json`. Written by `dispatch-ready.sh`:
```json
{
  "bead_id": "bd-42",
  "project_name": "my-project",
  "issue_number": "42",
  "started_at": "2024-07-30T12:00:00Z",
  "last_heartbeat": "2024-07-30T12:00:00Z",
  "attempt": 1,
  "status": "running"
}
```

**Lifecycle:**
- Written once at `pi` start (`started_at`, `attempt`).
- Updated once at `pi` end (`finished_at`, `status: "done"|"failed"`, `exit_code`).
- Deleted after cleanup (success) or after release (failure).

## 5. dispatch-ready.sh Flow (Redesigned)

```
1. Setup: set -euo pipefail, trap EXIT/INT/TERM → cleanup function
   cleanup function: if dispatch.json exists and status==running, release bead + rm dispatch.json
2. Orphan/stale detection:
   a. bd list --status in_progress --json → find beads claimed in_progress
   b. For each such bead:
      - If its project has a dispatch.json with status=="running":
        - If started_at > 2h ago → stale → release bead, rm dispatch.json
      - If NO dispatch.json exists → orphan (crashed mid-run) → release bead
   c. (This guarantees at most one in-progress dispatch at a time.)
3. bd ready --type task --limit 1 --claim --json (BD_JSON_ENVELOPE=1)
4. Parse BEAD_ID robustly (handle envelope + array shapes)
5. If BEAD_ID empty → exit 0 (no ready work; do NOT launch pi)
6. Parse TITLE, EXTERNAL_REF, ISSUE_NUMBER, PROJECT_NAME
7. Validate project dir + spec.md exist:
   - If missing → release bead (bd update --status open), log, exit 1
8. Write dispatch.json (running)
9. Run pi agent:
   pi -p "..." --workdir "$ROOT_DIR/projects/$PROJECT_NAME"
10. Check pi exit code:
    - Success (0): bd close --reason "Implemented via pi agent"; rm dispatch.json
    - Failure (non-zero): bd update --status open; rm dispatch.json; exit with pi's code
11. trap cleanup runs on any unexpected exit
```

## 6. Error Handling & Visibility

- **Every step logs** to `logs/dispatch.log` with a timestamp: `claim OK`, `project OK`, `pi start`, `pi exit $code`, `close OK` / `released to open`.
- **No `|| true`** on status transitions (claim, release, close). Failures propagate with exit codes.
- **trap-based cleanup** ensures a mid-flight crash never leaves a bead in limbo.
- **Orphan detection** on every cron run cleans up any bead left in_progress by a previous crashed run.

## 7. Testing Plan

Since there's no live Dolt DB locally, testing is via:
- Shellcheck on the scripts.
- Dry-run mode: a `--dry-run` flag that prints the parsed BEAD_ID / PROJECT_NAME without running `pi` or closing beads.
- Manual verification of orphan detection using `bd create` + `bd update --status in_progress` on a local test DB.
