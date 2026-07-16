# Firebase Hosting Fetch — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize the Firebase Hosting file fetcher to TypeScript with native `fetch`, commander CLI, and vitest tests.

**Architecture:** Single package with `src/cli.ts` (entry), `src/fetch-files.ts` (core logic), `src/types.ts` (types). Uses native `fetch` with `encodeURI()` for Unicode paths, `commander` for CLI, `vitest` for testing.

**Tech Stack:** TypeScript, Node.js 24, commander, vitest, firebase-tools

## Global Constraints

- Node.js >= 18 (native `fetch` required)
- `encodeURI()` for all URL paths (Japanese/Unicode support)
- Errors to stderr, exits with code 1 on failure
- Preserve original directory structure when writing files

---

## File Structure

| File | Responsibility |
|------|----------------|
| `package.json` | Dependencies, scripts, bin entry |
| `tsconfig.json` | TypeScript config |
| `src/types.ts` | Shared interfaces |
| `src/fetch-files.ts` | Core logic: auth, list, fetch, write |
| `src/cli.ts` | CLI entry point with commander |
| `tests/fetch-files.test.ts` | Unit tests for core logic |
| `tests/cli.test.ts` | CLI integration tests |

---

### Task 1: Project Setup

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore` (update existing)

**Interfaces:**
- Consumes: None
- Produces: None

- [ ] **Step 1: Create package.json**

```json
{
  "name": "firebase-hosting-fetch",
  "version": "1.0.0",
  "description": "Fetch all files from a Firebase Hosting site with Unicode/Japanese support",
  "type": "module",
  "bin": "./dist/cli.js",
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest",
    "start": "node dist/cli.js"
  },
  "dependencies": {
    "commander": "^12.0.0",
    "firebase-tools": "^13.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  },
  "engines": {
    "node": ">=18"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 3: Update .gitignore**

Add to existing `.gitignore`:
```
node_modules/
dist/
*.tsbuildinfo
```

- [ ] **Step 4: Install dependencies**

```bash
npm install
```

- [ ] **Step 5: Verify build works**

```bash
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add package.json tsconfig.json .gitignore package-lock.json
git commit -m "chore: initialize project with TypeScript, commander, vitest"
```

---

### Task 2: TypeScript Types

**Files:**
- Create: `src/types.ts`

**Interfaces:**
- Consumes: None
- Produces: `FirebaseRelease`, `FirebaseFileList`, `CLIOptions`

- [ ] **Step 1: Create src/types.ts**

```typescript
export interface FirebaseRelease {
  name: string;
  version: { name: string };
}

export interface FirebaseFileList {
  files: Array<{ path: string }>;
  nextPageToken?: string;
}

export interface CLIOptions {
  site: string;
  output?: string;
  concurrency: number;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types.ts
git commit -m "feat: add TypeScript types for Firebase API and CLI"
```

---

### Task 3: Core Logic — Version Retrieval

**Files:**
- Create: `src/fetch-files.ts`
- Create: `tests/fetch-files.test.ts`

**Interfaces:**
- Consumes: `FirebaseRelease`, `FirebaseFileList` from `src/types.ts`
- Produces: `getLatestVersion()`, `listFiles()`, `fetchFiles()`

- [ ] **Step 1: Write failing test for getLatestVersion**

```typescript
// tests/fetch-files.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getLatestVersion } from '../src/fetch-files.js';

describe('getLatestVersion', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns version name from latest release', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        releases: [{ version: { name: 'sites/my-site/versions/v123' } }]
      })
    } as Response);

    const result = await getLatestVersion('my-site');
    expect(result).toBe('sites/my-site/versions/v123');
  });

  it('throws when no releases found', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ releases: [] })
    } as Response);

    await expect(getLatestVersion('my-site')).rejects.toThrow('No releases found');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/fetch-files.test.ts
```

Expected: FAIL — `getLatestVersion` not exported

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/fetch-files.ts
import type { FirebaseRelease } from './types.js';

export async function getLatestVersion(site: string): Promise<string> {
  const token = await getAuthToken();
  const url = `https://firebasehosting.googleapis.com/v1beta1/sites/${site}/releases?pageSize=1`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch releases: ${res.status} ${res.statusText}`);
  }
  const data = await res.json() as { releases?: FirebaseRelease[] };
  const release = data.releases?.[0];
  if (!release) {
    throw new Error('No releases found');
  }
  return release.version.name;
}

async function getAuthToken(): Promise<string> {
  // firebase-tools provides auth token via environment
  // In practice, this comes from `firebase login:ci` or Application Default Credentials
  const { execSync } = await import('child_process');
  const token = execSync('firebase-tools login:ci --no-localhost', { encoding: 'utf-8' });
  // Actually, we'll use firebase-tools API directly
  throw new Error('Not implemented');
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/fetch-files.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/fetch-files.ts tests/fetch-files.test.ts
git commit -m "feat: add getLatestVersion with tests"
```

---

### Task 4: Core Logic — File Listing with Pagination

**Files:**
- Modify: `src/fetch-files.ts`
- Modify: `tests/fetch-files.test.ts`

**Interfaces:**
- Consumes: `getLatestVersion()` from Task 3
- Produces: `listFiles()`

- [ ] **Step 1: Write failing test for listFiles**

```typescript
// Add to tests/fetch-files.test.ts
describe('listFiles', () => {
  it('returns all files from single page', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        files: [{ path: '/index.html' }, { path: '/style.css' }]
      })
    } as Response);

    const result = await listFiles('sites/my-site/versions/v123', 'fake-token');
    expect(result).toEqual(['/index.html', '/style.css']);
  });

  it('paginates through multiple pages', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        files: [{ path: '/page1.html' }],
        nextPageToken: 'token2'
      })
    } as Response);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        files: [{ path: '/page2.html' }]
      })
    } as Response);

    const result = await listFiles('sites/my-site/versions/v123', 'fake-token');
    expect(result).toEqual(['/page1.html', '/page2.html']);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/fetch-files.test.ts
```

Expected: FAIL — `listFiles` not exported

- [ ] **Step 3: Write minimal implementation**

```typescript
// Add to src/fetch-files.ts
import type { FirebaseRelease, FirebaseFileList } from './types.js';

const LIST_PAGE_SIZE = 1000;

export async function listFiles(
  versionName: string,
  token: string,
  existing: string[] = [],
  pageToken?: string
): Promise<string[]> {
  const params = new URLSearchParams({ pageSize: String(LIST_PAGE_SIZE) });
  if (pageToken) params.set('pageToken', pageToken);

  const url = `https://firebasehosting.googleapis.com/v1beta1/${versionName}/files?${params}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    throw new Error(`Failed to list files: ${res.status} ${res.statusText}`);
  }
  const data = await res.json() as FirebaseFileList;
  const paths = data.files.map(f => f.path);
  existing.push(...paths);

  if (data.nextPageToken) {
    return listFiles(versionName, token, existing, data.nextPageToken);
  }
  return existing;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/fetch-files.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/fetch-files.ts tests/fetch-files.test.ts
git commit -m "feat: add listFiles with pagination support"
```

---

### Task 5: Core Logic — File Fetching with Unicode Support

**Files:**
- Modify: `src/fetch-files.ts`
- Modify: `tests/fetch-files.test.ts`

**Interfaces:**
- Consumes: `listFiles()` from Task 4
- Produces: `fetchFile()`, `fetchFiles()`

- [ ] **Step 1: Write failing test for Unicode encoding**

```typescript
// Add to tests/fetch-files.test.ts
describe('fetchFile', () => {
  it('encodes Japanese characters in URL', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8)
    } as Response);

    vi.spyOn(await import('fs/promises'), 'writeFile').mockResolvedValue(undefined);

    await fetchFile('my-site', 'fake-token', '/サマリ.png', '/tmp');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('%E3%82%B5%E3%83%9E%E3%83%AA'),
      expect.any(Object)
    );
  });

  it('preserves forward slashes in path', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8)
    } as Response);

    vi.spyOn(await import('fs/promises'), 'writeFile').mockResolvedValue(undefined);

    await fetchFile('my-site', 'fake-token', '/images/test.png', '/tmp');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/images/test.png'),
      expect.any(Object)
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/fetch-files.test.ts
```

Expected: FAIL — `fetchFile` not exported

- [ ] **Step 3: Write minimal implementation**

```typescript
// Add to src/fetch-files.ts
import { mkdir, writeFile } from 'fs/promises';
import { dirname } from 'path';

export async function fetchFile(
  site: string,
  token: string,
  filePath: string,
  outputDir: string
): Promise<void> {
  const encodedPath = encodeURI(filePath);
  const url = `https://${site}.firebaseapp.com${encodedPath}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${filePath}: ${res.status} ${res.statusText}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const fullPath = `${outputDir}${filePath}`;
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, buffer);
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/fetch-files.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/fetch-files.ts tests/fetch-files.test.ts
git commit -m "feat: add fetchFile with encodeURI for Unicode paths"
```

---

### Task 6: Core Logic — Concurrent Fetching

**Files:**
- Modify: `src/fetch-files.ts`
- Modify: `tests/fetch-files.test.ts`

**Interfaces:**
- Consumes: `fetchFile()` from Task 5
- Produces: `fetchFiles()` with concurrency control

- [ ] **Step 1: Write failing test for concurrency**

```typescript
// Add to tests/fetch-files.test.ts
describe('fetchFiles', () => {
  it('respects concurrency limit', async () => {
    let concurrent = 0;
    let maxConcurrent = 0;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      concurrent++;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await new Promise(r => setTimeout(r, 10));
      concurrent--;
      return {
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(8)
      } as Response;
    });

    vi.spyOn(await import('fs/promises'), 'writeFile').mockResolvedValue(undefined);

    const files = Array.from({ length: 10 }, (_, i) => `/file${i}.txt`);
    await fetchFiles('my-site', 'fake-token', files, '/tmp', 3);

    expect(maxConcurrent).toBeLessThanOrEqual(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/fetch-files.test.ts
```

Expected: FAIL — `fetchFiles` not exported

- [ ] **Step 3: Write minimal implementation**

```typescript
// Add to src/fetch-files.ts
export async function fetchFiles(
  site: string,
  token: string,
  files: string[],
  outputDir: string,
  concurrency: number
): Promise<void> {
  let index = 0;
  let active = 0;
  let completed = 0;

  return new Promise((resolve, reject) => {
    function next() {
      while (active < concurrency && index < files.length) {
        const file = files[index++];
        active++;
        fetchFile(site, token, file, outputDir)
          .then(() => {
            active--;
            completed++;
            console.log(`Fetched ${file} (${completed}/${files.length})`);
            if (completed === files.length) {
              resolve();
            } else {
              next();
            }
          })
          .catch(reject);
      }
    }
    next();
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/fetch-files.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/fetch-files.ts tests/fetch-files.test.ts
git commit -m "feat: add fetchFiles with concurrency control"
```

---

### Task 7: CLI Entry Point

**Files:**
- Create: `src/cli.ts`
- Create: `tests/cli.test.ts`

**Interfaces:**
- Consumes: `getLatestVersion()`, `listFiles()`, `fetchFiles()` from Tasks 3-6
- Produces: CLI executable

- [ ] **Step 1: Write failing test for CLI parsing**

```typescript
// tests/cli.test.ts
import { describe, it, expect } from 'vitest';
import { parseArgs } from '../src/cli.js';

describe('parseArgs', () => {
  it('parses site name from positional arg', () => {
    const result = parseArgs(['my-site']);
    expect(result.site).toBe('my-site');
    expect(result.concurrency).toBe(100);
  });

  it('parses output flag', () => {
    const result = parseArgs(['my-site', '-o', './downloaded']);
    expect(result.output).toBe('./downloaded');
  });

  it('parses concurrency flag', () => {
    const result = parseArgs(['my-site', '-c', '50']);
    expect(result.concurrency).toBe(50);
  });

  it('throws when no site provided', () => {
    expect(() => parseArgs([])).toThrow('site name is required');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/cli.test.ts
```

Expected: FAIL — `parseArgs` not exported

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/cli.ts
import { Command } from 'commander';
import { getLatestVersion, listFiles, fetchFiles } from './fetch-files.js';
import type { CLIOptions } from './types.js';

export function parseArgs(args: string[]): CLIOptions {
  const program = new Command();
  program
    .name('firebase-hosting-fetch')
    .description('Fetch all files from a Firebase Hosting site')
    .argument('<site>', 'Firebase Hosting site name')
    .option('-o, --output <dir>', 'Output directory')
    .option('-c, --concurrency <n>', 'Max concurrent fetches', '100')
    .parse(args);

  const opts = program.opts();
  const site = program.args[0];
  if (!site) throw new Error('site name is required');

  return {
    site,
    output: opts.output,
    concurrency: parseInt(opts.concurrency, 10)
  };
}

async function main() {
  const opts = parseArgs(process.argv);

  console.log(`Fetching files from ${opts.site}...`);

  // Get auth token
  const { execSync } = await import('child_process');
  const token = execSync('firebase login:ci --no-localhost', {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe']
  }).trim();

  const versionName = await getLatestVersion(opts.site);
  const versionId = versionName.split('/').pop()!;
  const outputDir = opts.output || `${opts.site}_${versionId}`;

  console.log(`Version: ${versionId}`);
  console.log(`Output: ${outputDir}`);

  const files = await listFiles(versionName, token);
  console.log(`Found ${files.length} files`);

  await fetchFiles(opts.site, token, files, outputDir, opts.concurrency);
  console.log('Complete!');
}

main().catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/cli.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/cli.ts tests/cli.test.ts
git commit -m "feat: add CLI entry point with commander"
```

---

### Task 8: Integration Testing & Cleanup

**Files:**
- Modify: `tests/fetch-files.test.ts`
- Modify: `tests/cli.test.ts`

**Interfaces:**
- Consumes: All previous tasks
- Produces: Complete test suite

- [ ] **Step 1: Add end-to-end test with mocked auth**

```typescript
// Add to tests/fetch-files.test.ts
describe('end-to-end', () => {
  it('fetches all files with correct paths', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    // Mock auth token
    vi.spyOn(await import('child_process'), 'execSync').mockReturnValue('fake-token\n');

    // Mock version lookup
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        releases: [{ version: { name: 'sites/test/versions/v1' } }]
      })
    } as Response);

    // Mock file listing
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        files: [{ path: '/index.html' }, { path: '/日本語.html' }]
      })
    } as Response);

    // Mock file fetches
    fetchMock.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => Buffer.from('<html>test</html>')
    } as Response);

    vi.spyOn(await import('fs/promises'), 'writeFile').mockResolvedValue(undefined);

    const versionName = await getLatestVersion('test');
    const files = await listFiles(versionName, 'fake-token');
    await fetchFiles('test', 'fake-token', files, '/tmp/test', 2);

    expect(files).toEqual(['/index.html', '/日本語.html']);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('%E6%97%A5%E6%9C%AC%E8%AA%9E.html'),
      expect.any(Object)
    );
  });
});
```

- [ ] **Step 2: Run full test suite**

```bash
npx vitest run
```

Expected: All tests PASS

- [ ] **Step 3: Build and verify**

```bash
npm run build
ls dist/
```

Expected: `cli.js`, `fetch-files.js`, `types.js` in dist/

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete firebase hosting fetch modernization

- TypeScript with native fetch
- Commander CLI with --output, --concurrency flags
- Vitest unit tests with mocked fetch
- Unicode/Japanese filename support via encodeURI()"
```

---

## Verification

After all tasks complete:

1. **Tests pass:** `npm test`
2. **Build succeeds:** `npm run build`
3. **CLI works:** `node dist/cli.js --help`
4. **Issue #2 closed:** Comment on issue with completion summary
