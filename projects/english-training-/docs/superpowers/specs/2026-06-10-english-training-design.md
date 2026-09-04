# English Training App - Design Spec

## Classification
**Bounded** - New project with clear scope: English conversation training app with Browser + CLI + API server, session-based questions, grading, and speech I/O.

## Design Overview

### Core Components
1. **Browser Frontend** - Web application for English conversation training
2. **CLI Interface** - Command-line interface for training sessions
3. **API Server** - REST/GraphQL API for managing sessions, storing responses, and serving speech I/O

### Architecture
- **Backend**: Node.js/Express (or similar) with REST API
- **Frontend**: React/Vue or vanilla JS for browser app
- **Speech I/O**: Integration with speech recognition/text-to-speech libraries
- **Data Storage**: PostgreSQL or MongoDB for session history, user progress, and training data

### Key Features
- Session-based conversation training
- Grading system for responses
- Speech input/output (speech-to-text and text-to-speech)
- Progress tracking
- Multiple exercise types (grammar, vocabulary, comprehension, etc.)

### Implementation Plan
1. Set up project structure (package.json, directories)
2. Build API server with basic CRUD for sessions
3. Build browser frontend with conversation interface
4. Integrate speech I/O
5. Add grading and progress tracking
6. Write tests
7. Deploy

## Next Steps
- Review design and approve
- Begin implementation
- Write tests
- Commit with message 'implement english-training- (#6)'
- Create PR
