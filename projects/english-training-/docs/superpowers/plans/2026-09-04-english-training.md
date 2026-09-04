# English Training Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Goal
Implement the English conversation training app with Browser, CLI, and API server modes. The app provides session-based questions, keyword-based grading (Excellent/Good/Needs Improvement), hints, example answers, text-to-speech, and speech recognition.

## Architecture
- **Core App** (`src/main.js`): Central application logic coordinating browser, CLI, and API modes
- **Questions Generator** (`src/questions.js`): Generates session-based questions across 8 real-world situations
- **Grading Engine** (`src/grading.js`): Keyword-based grading with tiered scores
- **Speech Components** (`src/recognizer.js`, `src/speaker.js`): Web Speech API for speech I/O
- **API Server** (`src/worker.js`): Cloudflare Worker exposing `/api/questions`, `/api/grade`, `/api/situations`
- **CLI** (`src/main-cli.js`): Command-line interface entry point
- **Tests** (`tests/`): Unit and integration tests

## Spec Coverage
- ✅ Browser mode with session-based questions
- ✅ CLI mode with question interaction
- ✅ API server with question generation and grading endpoints
- ✅ Keyword-based grading (Excellent/Good/Needs Improvement)
- ✅ Hints and example answers
- ✅ Text-to-speech (speaker.js)
- ✅ Speech recognition (recognizer.js)

## Global Constraints
- Version: 1.0.0 (from package.json)
- Language: Vanilla JavaScript (ESM)
- Framework: No external frameworks - uses native Web APIs
- Must support three modes: Browser, CLI, API Server
- Tests must pass before committing

## Task Breakdown

### Task 1: Write failing tests (baseline)
- [ ] Create test files that fail initially (verify test infrastructure works)
- [ ] Write tests for grading logic
- [ ] Write tests for question generation
- [ ] Write tests for speech recognition/text-to-speech

### Task 2: Implement core app logic (main.js)
- [ ] Integrate questions generator
- [ ] Implement session-based question flow
- [ ] Add grading integration
- [ ] Add speech recognition (voice input)
- [ ] Add text-to-speech (voice output)

### Task 3: Implement CLI mode (main-cli.js)
- [ ] Parse command-line arguments
- [ ] Route to browser or API modes
- [ ] Handle question interaction in CLI

### Task 4: Implement API server (worker.js)
- [ ] Set up Express-like endpoint handling
- [ ] Implement `/api/questions` (generate session)
- [ ] Implement `/api/grade` (grade answer)
- [ ] Implement `/api/situations` (list situations)

### Task 5: Run tests and verify
- [ ] Run `npm test` to ensure all tests pass
- [ ] Fix any failing tests
- [ ] Ensure all three modes work correctly

### Task 6: Commit
- [ ] Commit with message 'implement english-training- (#6)'
