# english-training-

> Issue: [https://github.com/dohzoh/hermes-integrations/issues/6](https://github.com/dohzoh/hermes-integrations/issues/6)

## Overview

English conversation training app with **Browser**, **CLI**, and **API server** modes. Practice instant English composition (瞬間英作文) with session-based questions, intelligent grading, and speech I/O.

**Features:**
- 10-question training sessions across 8 real-world situations (Daily Life, Shopping, Restaurant, Travel, Weather, Work, Hobbies, Health)
- Keyword-based grading with three tiers: Excellent / Good / Needs Improvement
- Hints and example answers for learning
- Text-to-speech for pronunciation practice
- Speech recognition for voice input (browser)
- Runs in browser, terminal, or as an API server (Cloudflare Worker)

## Getting Started

```bash
# Install dependencies (none required - vanilla JS)
# Run in browser
npx serve public    # or any static server

# Run CLI
node src/main-cli.js

# Run tests
npm test

# Deploy as Cloudflare Worker
# wrangler deploy src/worker.js
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/questions` | GET | Generate session questions (`?count=10`) |
| `/api/grade` | POST | Grade an answer (`{ question, answer }`) |
| `/api/situations` | GET | List available situations |

## Project Structure

```
english-training-/
├── src/
│   ├── app.js          # Browser controller
│   ├── main.js         # Core app logic (EnglishTrainingApp)
│   ├── main-cli.js     # CLI entry point
│   ├── worker.js       # Cloudflare Worker API server
│   ├── questions.js    # Question generator
│   ├── grading.js      # Answer grading logic
│   ├── recognizer.js   # Speech recognition (Web Speech API)
│   └── speaker.js      # Text-to-speech (Web Speech API)
├── tests/
│   ├── test.test.js       # Integration tests
│   ├── grading.test.js    # Grading edge cases
│   ├── recognizer.test.js # Recognizer stub tests
│   └── speaker.test.js    # Speaker stub tests
├── public/
│   └── index.html      # Browser UI
├── docs/
│   └── spec.md         # Implementation spec
└── package.json
```

## Development

```bash
# Run all tests
npm test

# Run tests with verbose output
node --test tests/*.test.js
```

## License

MIT