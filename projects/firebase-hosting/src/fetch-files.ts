import type { FirebaseRelease, FirebaseFileList, CLIOptions } from './types.js';
import { mkdir, writeFile } from 'fs/promises';
import { dirname } from 'path';
import { getAccessToken } from './auth.js';

/**
 * Gets the latest version name for a Firebase Hosting site.
 * Uses GOOGLE_APPLICATION_CREDENTIALS for authentication.
 */
export async function getLatestVersion(site: string): Promise<string> {
  const token = await getAccessToken();

  const url = `https://firebasehosting.googleapis.com/v1beta1/sites/${site}/releases?pageSize=1`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch releases: ${response.status} ${response.statusText}\n${errorText}`);
  }

  const data = await response.json() as { releases?: FirebaseRelease[] };
  const release = data.releases?.[0];

  if (!release) {
    throw new Error(`No releases found for site ${site}`);
  }

  return release.version.name;
}

/**
 * Lists all files from a Firebase Hosting version with pagination support.
 * Recursively fetches all pages until no more results are returned.
 */
export async function listFiles(
  versionName: string,
  existing: string[] = [],
  pageToken?: string
): Promise<string[]> {
  const token = await getAccessToken();
  const params = new URLSearchParams({ pageSize: '1000' });
  if (pageToken) params.set('pageToken', pageToken);

  const url = `https://firebasehosting.googleapis.com/v1beta1/${versionName}/files?${params}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error(`Failed to list files: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as FirebaseFileList;
  const paths = data.files.map(f => f.path);
  existing.push(...paths);

  if (data.nextPageToken) {
    return listFiles(versionName, existing, data.nextPageToken);
  }

  return existing;
}

/**
 * Fetches a single file from a Firebase Hosting site and writes it to disk.
 * Uses encodeURI() to safely handle Unicode/Japanese characters in paths.
 * CDN access is public — no auth header needed.
 */
export async function fetchFile(
  site: string,
  filePath: string,
  outputDir: string
): Promise<void> {
  const encodedPath = encodeURI(filePath);
  const url = `https://${site}.firebaseapp.com${encodedPath}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${filePath}: ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const fullPath = `${outputDir}${filePath}`;

  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, buffer);
}

/**
 * Fetches all files concurrently with a configurable concurrency limit.
 * Uses a semaphore pattern to control parallelism.
 */
export async function fetchFiles(
  site: string,
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

        fetchFile(site, file, outputDir)
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
