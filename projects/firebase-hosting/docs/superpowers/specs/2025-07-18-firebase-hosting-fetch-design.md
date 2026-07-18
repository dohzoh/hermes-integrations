# Firebase Hosting Fetch — Modernization Design

**Issue:** [#2](https://github.com/dohzoh/hermes-integrations/issues/2)  
**Date:** 2025-07-18  
**Status:** Approved

---

## Goal

Modernize the Firebase Hosting file fetching gist to:
- TypeScript with native `fetch` (replace deprecated `request`)
- Robust CLI with `commander`
- Basic unit tests with `vitest`
- Preserve Unicode/Japanese filename support (`encodeURI()` fix)

---

## Architecture

Single package with clear separation:

```
src/
  cli.ts          — CLI entry (commander), validates args, calls main
  fetch-files.ts  — Core logic: list files, fetch with encoding, write to disk
  types.ts        — Shared types (FirebaseRelease, FirebaseFile, etc.)
tests/
  fetch-files.test.ts — Unit tests (mocked fetch)
  cli.test.ts         — CLI integration tests (mocked fetch)
```

---

## CLI Interface

```
npx firebase-hosting-fetch <site_name> [options]

Options:
  -o, --output <dir>       Output directory (default: <site>_<version>)
  -c, --concurrency <n>    Max concurrent fetches (default: 100)
  -h, --help               Show help
```

**Examples:**
```bash
npx firebase-hosting-fetch my-site
npx firebase-hosting-fetch my-site -o ./downloaded -c 50
```

---

## Core Logic

1. Authenticate with Firebase (reuse `firebase-tools/lib/requireAuth`)
2. Get latest version via Firebase Hosting API
3. List all files (paginate if >1000)
4. Fetch concurrently with `encodeURI()` for safe paths
5. Write to disk, preserving directory structure

**Key implementation details:**
- `encodeURI()` encodes non-ASCII (e.g., `サマリ` → `%E3%82%B5%E3%83%9E%E3%83%AA`) while preserving `/`, `?`, `&`
- Concurrency controlled via a semaphore pattern (no external dep)
- Progress logging: `Fetching /path...` → `Fetched /path`

---

## TypeScript Types

```typescript
// types.ts
interface FirebaseRelease {
  name: string;
  version: { name: string };
}

interface FirebaseFileList {
  files: Array<{ path: string }>;
  nextPageToken?: string;
}

interface CLIOptions {
  site: string;
  output?: string;
  concurrency: number;
}
```

---

## Error Handling

- **Auth failure:** Catch from `requireAuth`, log clear error, exit 1
- **API errors:** Catch from `fetch`, log status + message, exit 1
- **File write errors:** Catch from `fs.writeFile`, log path + error, continue (don't abort)
- **Invalid site name:** Validate before API call, exit with usage message

All errors go to stderr.

---

## Testing

**Unit tests (mocked `fetch`):**
- Verify `encodeURI()` applied to Japanese paths (`/サマリ.png` → `%E3%82%B5...`)
- Verify pagination handling (multiple pages)
- Verify concurrency limit respected
- Verify file write calls correct paths

**CLI tests:**
- Verify flags parsed correctly
- Verify `--help` output

---

## Dependencies

- `firebase-tools` — Firebase auth + API
- `commander` — CLI flag parsing
- `vitest` — Testing (dev)
- `typescript` — TypeScript compiler (dev)
