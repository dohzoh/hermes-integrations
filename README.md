# hermes-integrations

小さなプロジェクトを集めたモノレポ。各プロジェクトは `projects/` 配下で独立して開発し、プロトタイプ完了後に独立リポジトリへ移行する。

## アーキテクチャ

```mermaid
flowchart LR
  subgraph GitHub
    A[Idea] -->|app-idea template| B[Issue]
    B -->|Actions: scaffold| C[projects/name/]
  end

  subgraph GCE [GCE VM]
    D[poll-issues.sh] -->|kanban create| E[Hermes Kanban]
    E -->|dispatch| F[Worker]
    F -->|pi -p implement| G[pi agent]
  end

  subgraph Model
    H[OpenCode Zen]
  end

  G -->|tool calling| H
  G -->|commit + pr| I[Pull Request]
```

| レイヤー | コンポーネント | 役割 |
|---|---|---|
| **Trigger** | GitHub Actions | Issue 検出 → project scaffold + commit |
| **Orchestration** | Hermes Agent (Kanban) | タスク管理、状態遷移、キューイング、リトライ |
| **Execution** | pi agent | コード生成・編集・bash実行（tool calling 内蔵） |
| **Model** | OpenCode Zen | 検証済みモデルを提供（function calling 安定） |

## ワークフロー

```mermaid
flowchart LR
  A[Idea] -->|app-idea template| B[Issue]
  B -->|Actions| C[projects/name/]
  C -->|poll-issues.sh| D[Kanban]
  D -->|Worker + pi| E[Implement]
  E -->|commit + pr| F[Pull Request]
  F -->|done| G[独立 repo]
```

### Step-by-Step

1. **Idea** — GitHub Issue を `app-idea` テンプレートで投稿
2. **Scaffold (auto)** — GitHub Actions がラベルを検出し、`create-project.sh` を実行 → `projects/` にコミット
3. **Queue (auto)** — GCE の cron (`poll-issues.sh`) が未処理 Issue を Kanban に追加
4. **Implement (auto)** — Hermes Worker がタスクを取得 → pi agent が実装・テスト・commit・PR
5. **Extract** — プロトタイプ完成後、独立リポジトリに移行

手動実行も可能:

```bash
# scaffold
./scripts/create-project.sh my-app --issue <issue_url>

# kanban enqueue
hermes kanban create "my-app を実装" --body "Issue #N" --assignee worker
```

## 構成

```
hermes-integrations/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   └── app-idea.md           # アプリ案のIssueテンプレート
│   └── workflows/
│       └── app-idea.yml          # Issue → scaffold (Actions)
├── scripts/
│   ├── create-project.sh         # プロジェクト雛形生成
│   └── poll-issues.sh            # Issue → Kanban 同期 (GCE cron)
├── projects/                     # 各プロジェクト
│   └── <name>/
│       ├── src/
│       ├── tests/
│       ├── docs/
│       ├── README.md
│       └── .gitignore
└── README.md
```

---

## GitHub Actions

Issue に `app-idea` ラベルが付与された時（テンプレート投稿時または後付）に起動。

**`.github/workflows/app-idea.yml`**:

```yaml
name: App Idea Scaffold

on:
  issues:
    types: [opened, labeled]

jobs:
  scaffold:
    if: contains(github.event.issue.labels.*.name, 'app-idea')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Extract project name
        id: extract
        run: |
          TITLE="${{ github.event.issue.title }}"
          NAME=$(echo "$TITLE" \
            | sed 's/\[App\] *//' \
            | tr '[:upper:]' '[:lower:]' \
            | tr ' ' '-' \
            | tr -cd 'a-z0-9_-')
          echo "name=$NAME" >> "$GITHUB_OUTPUT"

      - name: Create project directory
        run: |
          bash scripts/create-project.sh "${{ steps.extract.outputs.name }}" \
            --issue "${{ github.event.issue.html_url }}"

      - name: Commit project
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add projects/
          git commit -m "scaffold ${{ steps.extract.outputs.name }} from #${{ github.event.issue.number }}"
          git push

      - name: Comment on issue
        uses: actions/github-script@v7
        with:
          script: |
            const name = '${{ steps.extract.outputs.name }}';
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `✅ プロジェクト \`${name}\` を scaffold しました\n\`\`\`\nprojects/${name}/\n├── src/\n├── tests/\n├── docs/\n├── README.md\n└── .gitignore\n\`\`\`\nGCE の Hermes Kanban がタスクを検出次第、実装を開始します。`
            });
```

### トリガー条件

| Event | 動作 |
|---|---|
| Issue opened (テンプレート使用時) | 自動起動（`app-idea` ラベル付き） |
| 後から `app-idea` ラベル追加 | 起動 |
| Issue 編集 | 起動しない（再実行したい場合はラベルの付け直し） |

---

## GCE セットアップ手順

### 前提インストール

```bash
# Hermes Agent
curl -fsSL https://hermes-agent.sh/install | sh

# pi agent
curl -fsSL https://pi.sh/install | sh

# GitHub CLI
sudo apt install gh

# bun (pi のランタイム)
curl -fsSL https://bun.sh/install | bash
```

### OpenCode Zen の API キー設定

```bash
export OPENCODE_API_KEY="sk-..."
export GITHUB_TOKEN="ghp_..."
```

pi のデフォルト設定:

```bash
pi config set defaultProvider opencode
pi config set defaultModel opencode/deepseek-v4-flash
```

### Hermes Kanban 初期化

```bash
hermes kanban init
hermes gateway start
```

---

## Hermes 設定詳細

### Worker プロファイル設定

**`~/.hermes/profiles/hermes_worker/profile.yaml`**:

```yaml
description: >
  あなたは Worker です。与えられたタスクを pi agent に委譲して実行します。
  自分でコードを書かず、terminal 経由で pi を呼び出してください。
  pi の呼び出しが完了したら結果を確認し、kanban_complete または kanban_block で
  タスクをクローズします。
description_auto: false
```

**`~/.hermes/profiles/hermes_worker/config.yaml`**（主要箇所）:

```yaml
model:
  provider: opencode
  default: opencode/deepseek-v4-flash
  base_url: https://opencode.ai/zen/v1

agent:
  max_turns: 50
  tool_use_enforcement: auto

terminal:
  backend: local
  cwd: /path/to/hermes-integrations
  timeout: 600
```

> Worker 自身はタスク解釈と `terminal` + `kanban_*` の呼び出しのみ。`deepseek-v4-flash` で十分。コード品質は pi 側のモデルに依存。

### pi-agent SKILL.md

**作成先**: `~/.hermes/skills/devops/pi-agent/SKILL.md`

```markdown
---
name: pi-agent
description: "Delegate coding to pi agent (read/bash/edit/write)."
version: 1.0.0
metadata:
  hermes:
    tags: [Coding-Agent, pi, Autonomous]
    related_skills: [kanban-worker]
---

# pi agent

pi は read / bash / edit / write のツールを持つ AI コーディングエージェント。
`pi -p "prompt"` でワンショット実行できる。

## When to Use

- 実装・コード生成・ファイル編集が必要なタスク
- テストの作成・実行
- git commit / gh pr create

## 基本コマンド

```bash
pi -p "タスク内容" --provider opencode --model opencode/deepseek-v4-flash
pi -p "タスク" --workdir "$HERMES_KANBAN_WORKSPACE"
```

## Worker の手順

1. `kanban_show()` でタスクの title / body を読む
2. タスク内容から pi に渡すプロンプトを構築
3. `terminal(command="pi -p '...'", workdir="$HERMES_KANBAN_WORKSPACE")` を実行
4. 実行結果を確認。失敗したらモデルを変えてリトライ
5. `kanban_complete(summary=..., metadata={"changed_files": [...]})` で完了

## プロンプトテンプレート

```bash
pi -p "
仕様: {task_body}

以下を実行:
1. 必要なファイルを作成・編集
2. テストを書いて実行
3. git add + git commit
4. gh pr create --title '{task_title}' --body 'Closes #{issue_number}'
" --provider opencode --model opencode/deepseek-v4-flash
```

## 注意

- `clarify` は使わない（ヘッドレス実行）
- 判断が必要な場合は `kanban_comment()` + `kanban_block()` でブロック
```

---

## Issue Poll（GCE cron `poll-issues.sh`）

GitHub Issue を定期的にチェックし、未処理の `app-idea` Issue を Kanban に追加する。
Project scaffold は既に Actions が済ませているので、`poll-issues.sh` は Kanban キューイングのみ担当。

**`scripts/poll-issues.sh`**:

```bash
#!/usr/bin/env bash
set -euo pipefail

gh issue list --label app-idea --state open --json number,title,body \
  | jq -c '.[]' | while read -r issue; do

  NUMBER=$(echo "$issue" | jq -r '.number')
  TITLE=$(echo "$issue" | jq -r '.title')
  BODY=$(echo "$issue" | jq -r '.body')

  # 既に Kanban にあればスキップ
  if hermes kanban list --status todo,ready --json \
    | jq -e ".[] | select(.title | contains(\"#$NUMBER\"))" > /dev/null 2>&1; then
    continue
  fi

  PROJECT_NAME=$(echo "$TITLE" | sed 's/\[App\] //' | tr 'A-Z' 'a-z' | tr ' ' '-')

  # project ディレクトリがなければ作成（念のため）
  if [ ! -d "projects/$PROJECT_NAME" ]; then
    ./scripts/create-project.sh "$PROJECT_NAME" \
      --issue "https://github.com/$GITHUB_REPOSITORY/issues/$NUMBER"
  fi

  hermes kanban create \
    "$PROJECT_NAME を実装 (#$NUMBER)" \
    --body "$BODY" \
    --assignee worker
done
```

**cron**:

```cron
*/5 * * * * cd /path/to/hermes-integrations && bash scripts/poll-issues.sh >> /var/log/poll-issues.log 2>&1
```

---

## モデル戦略

| 役割 | モデル | 理由 |
|---|---|---|
| **Hermes Worker** | `opencode/deepseek-v4-flash` ($0.14/$0.28) | タスク解釈 + ツール呼び出しのみ。安くて十分 |
| **pi agent (実装)** | `opencode/deepseek-v4-flash` | コスパ重視。デイリー開発向け |
| **pi agent (難しいタスク)** | `opencode/claude-sonnet-5` ($2/$10) | 複雑な実装・精度が必要な場合 |
| **テスト・軽作業** | `opencode/deepseek-v4-flash-free` (無料) | 期間限定だがコストゼロ |

pi 呼び出し時に `--model` で切り替え:

```bash
# 通常
pi -p "..." --provider opencode --model opencode/deepseek-v4-flash

# 精度重視
pi -p "..." --provider opencode --model opencode/claude-sonnet-5
```

---

## 課題と対策

### LM Studio の function calling 問題

Qwen3.5-9B / Gemma-4-26B などローカルモデルは function calling が不安定で、
`execute\n ls -la` のようにコマンドをテキストで書いて終わってしまう。

**対策**: Hermes Kanban はタスク管理に専念させ、実際のコード生成は pi agent（→ OpenCode Zen）に委譲するハイブリッド構成。pi は独自の tool calling 機構を持ち、モデルに依存しない安定動作が可能。

---

## ルール

- 各プロジェクトは `projects/` 配下に配置
- 標準構成: `src/`, `tests/`, `docs/`, `README.md`, `.gitignore`
- プロトタイプ完了後は独立リポジトリに分離
