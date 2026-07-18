import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getLatestVersion } from '../src/fetch-files.js';

describe('getLatestVersion', () => {
  let fetchMock: any;

  beforeEach(() => {
    fetchMock = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchMock?.mockRestore();
    delete process.env.FIREBASE_TOKEN;
  });

  it('returns version name from latest release', async () => {
    process.env.FIREBASE_TOKEN = 'test-token';
    
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => {
        return {
          releases: [{ version: { name: 'sites/my-site/versions/v123' } }]
        }
      }
    } as Response);

    const result = await getLatestVersion('my-site');
    expect(result).toBe('sites/my-site/versions/v123');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://firebasehosting.googleapis.com/v1beta1/sites/my-site/releases?pageSize=1',
      expect.objectContaining({
        headers: { Authorization: 'Bearer test-token' }
      })
    );
  });

  it('throws when no releases found', async () => {
    process.env.FIREBASE_TOKEN = 'test-token';

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => {
        return { releases: [] }
      }
    } as Response);

    await expect(getLatestVersion('my-site')).rejects.toThrow('No releases found');
  });

  it('throws when FIREBASE_TOKEN not set', async () => {
    await expect(getLatestVersion('my-site')).rejects.toThrow('FIREBASE_TOKEN environment variable is required');
  });
});