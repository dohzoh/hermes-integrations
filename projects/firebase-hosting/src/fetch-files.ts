import type { FirebaseRelease } from './types.js';

/**
 * Gets the latest version name for a Firebase Hosting site.
 * Requires FIREBASE_TOKEN environment variable to be set.
 */
export async function getLatestVersion(site: string): Promise<string> {
  const token = process.env.FIREBASE_TOKEN;
  if (!token) {
    throw new Error('FIREBASE_TOKEN environment variable is required');
  }

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