# Repository Guidelines

## Project Overview

**english-training** is a Svelte 5 + Vite TypeScript app implementing the "Instant English Composition" (瞬間英作文) methodology. Users practice answering situational questions in English with keyword-based grading, text-to-speech support, and a Cloudflare Worker backend serving both REST APIs and static UI. No database — all data embedded in source code.
## Tech Stack

svelte + typescript7 + vite8, vitest, oxlint, oxfmt

## Development Commands
```bash
npm create vite@latest my-project --template svelte-ts
cd my-project && npm install
pnpm install          # Install dependencies (pnpm)
pnpm dev              # Start Vite dev server
pnpm build            # Production build → dist/
pnpm preview          # Preview production build locally
pnpm test             # Run Vitest suite
pnpm test:watch       # Watch mode for tests
pnpm lint             # oxlint (correctness ruleset)
pnpm lint:fix         # Auto-fix lint issues
pnpm fmt              # oxfmt formatting
pnpm fmt:fix          # Auto-format with oxfmt

# CLI demo (no browser): generates questions to stdout
pnpm run cli-demo      # or directly import main-cli.ts
```
## Architecture & Data Flow

```
Browser SPA (Vite dev/build)          Cloudflare Worker Backend
┌───────────────────────┐            ┌──────────────────────────┐
│ App.svelte             │            │ worker.ts                 │
│ EnglishTrainingApp     │◄──state──►│ fetch handler              │
│ Speaker singleton      │            │ GET /api/questions?count=N│
│                        │            │ POST /api/grade           │
│                        │            │ GET /api/situations       │
└───────────────────────┘            └──────────────────────────┘
        │                                        ▲
        ▼                                        │
  Vite dev server (localhost)              All data embedded in source
```

**Core logic is pure TypeScript** — no framework dependencies in `src/`:
- **`grading.ts`**: keyword-based scoring (1pt per matched keyword, bonus for non-empty answer), returns `GradeResult` with score/grade/feedback/hint/example
- **`questions.ts`**: 8 situations × ~5 questions = 40 total. Fisher-Yates shuffle for session randomization via `generateSessionQuestions(count=10)`
- **`engine.ts`**: `EnglishTrainingApp` class — session state, score tracking, progress management. Percentage = `round(score / (count * 3) * 100)`
- **`speaker.ts`**: Singleton wrapping Web Speech API (`window.SpeechSynthesis`) for TTS of questions
- **`worker.ts`**: Cloudflare Worker entry point — single fetch handler routes all API + static HTML

**User flow**: start session → generate 10 shuffled questions → display current question with situation context → user types answer or clicks "Listen" → submit grades via keyword matching → reveals hint and example → next advances to following question → session complete when all 10 answered → shows final score percentage.

## Key Directories

| Path | Purpose |
|---|---|
| `src/` | Core TypeScript source — engine, grading, questions, speaker, types, worker entry point |
| `tests/` | Vitest test files (4 files) covering question generator, grading module, and app flow |
| `docs/` | Design spec (`spec.md`) with Quizlet-style color tokens, typography, component guidelines |
| `public/` | Static assets — `index.html` entry point for Vite dev server |

## Development Commands

```bash
pnpm install          # Install dependencies (pnpm)
pnpm dev              # Start Vite dev server
pnpm build            # Production build → dist/
pnpm preview          # Preview production build locally
pnpm test             # Run Vitest suite
pnpm test:watch       # Watch mode for tests
pnpm lint             # oxlint (correctness ruleset)
pnpm lint:fix         # Auto-fix lint issues
pnpm fmt              # oxfmt formatting
pnpm fmt:fix          # Auto-format with oxfmt

# CLI demo (no browser): generates questions to stdout
pnpm run cli-demo      # or directly import main-cli.ts
```

## Code Conventions & Common Patterns

- **TypeScript strict mode** with bundler resolution (`tsconfig.json` targets ES2022, `noEmit`, `isolatedModules`)
- **Svelte 5 reactive state** — `$state`, `$derived`, `$effect` for UI reactivity in `App.svelte`
- **Keyword-based grading**: each question has `keywords[]`; score = keyword matches (1pt each) + bonus 1pt for non-empty answer if no keywords matched. Grades: `'Excellent' | 'Good' | 'Needs Improvement'`
- **Fisher-Yates shuffle** for randomizing question bank into sessions (`questions.ts`)
- **Web Speech API** via singleton `Speaker` class — `initialize()`, `speak(text)`, `isReady()`, `stop()`
- **Class-based session manager**: `EnglishTrainingApp` encapsulates state (sessionQuestions, currentIndex, score, sessionStarted), methods: `startSession()`, `getCurrentQuestion()`, `submitAnswer(userAnswer)` → `SubmitResult`, `getResults()` → `SessionResults`, `isComplete()`
- **Inline styles** in `App.svelte` matching Quizlet design spec (#282e3e text, #f6f7fb canvas, #4255ff accent)
- **No external framework dependencies** — all logic is pure TypeScript; Svelte only provides UI reactivity
## Important Files

| File | Purpose |
|---|---|
| `src/App.svelte` | Main UI component — reactive state, DOM handlers (submit/reveal/speak), inline styles |
| `src/engine.ts` | `EnglishTrainingApp` class — session lifecycle, scoring, progress tracking |
| `src/grading.ts` | `gradeAnswer(question, userAnswer)` — keyword matching algorithm with feedback generation |
| `src/questions.ts` | Question bank (8 situations × ~5 questions) + Fisher-Yates shuffle for sessions |
| `src/speaker.ts` | Singleton wrapping Web Speech API for TTS |
| `src/types.ts` | Shared types: `Question`, `GradeResult`, `SubmitResult`, `SessionResults` |
| `src/worker.ts` | Cloudflare Worker entry — fetch handler routing `/api/questions`, `/api/grade`, `/api/situations`, static HTML |
| `src/main-cli.ts` | CLI demo: generates questions and prints to console (no browser) |
| `tests/test.js` | Vitest tests for question generator (count, uniqueness, required fields, situation coverage) |
| `tests/app.test.js` | Mixed Node `node:test` + Vitest — app flow, grading module, question generator |
| `tests/grading.test.js` | Vitest tests for grading: keyword matching, partial matches, empty answers, feedback output |
| `tests/questions.test.js` | Vitest tests for session generation and answer submission flow |
| `docs/spec.md` | Design spec — Quizlet-style color tokens, typography (Hurme Geometric Sans), component/layout rules |

## Runtime / Tooling Preferences

- **Runtime**: Node.js 20+ (ESM). Browser runtime uses Web Speech API. Cloudflare Workers for backend.
- **Package manager**: pnpm (`pnpm-lock.yaml`)
- **Build toolchain**: Vite 8 + Svelte 5
- **Test framework**: Vitest v4.1.11 (primary) + Node's built-in `node:test` in one file
- **Linting/formatting**: oxlint (correctness-only ruleset via `.oxlintrc.json`) + oxfmt
- **TypeScript**: strict mode, bundler resolution, ES2022 target, noEmit, isolatedModules
- **Vite aliases**: `@` → `/src`

## Testing & QA

- **Primary framework**: Vitest v4.1.11 with jsdom environment and globals mode (`svelte.config.js`)
- **Secondary**: Node's built-in `node:test` + `assert` in one test file (`tests/app.test.js`)
- **Test organization**: 4 files — `test.js`, `app.test.js`, `grading.test.js`, `questions.test.js`
- **No fixtures or setup/teardown hooks** — tests instantiate classes/functions directly
- **Assertions**: `expect()` (Vitest) and `assert` (Node)
- **Coverage scope**: question generator (`generateSessionQuestions`, `getSituations`), grading module (`gradeAnswer` with keyword matching/scoring/feedback), app flow (`EnglishTrainingApp` lifecycle: `startSession`, `submitAnswer`, `isComplete`, `getResults`)
