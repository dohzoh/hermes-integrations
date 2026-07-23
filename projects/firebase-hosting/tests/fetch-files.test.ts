import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../src/auth.js', () => ({
  getAccessToken: vi.fn().mockResolvedValue('fake-token')
}));

import { getLatestVersion, listFiles, fetchFile, fetchFiles } from '../src/fetch-files.js';

describe('getLatestVersion', () => {
  let fetchMock: any;

  beforeEach(() => {
    fetchMock = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchMock?.mockRestore();
  });

  it('returns version name from latest release', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        releases: [{ version: { name: 'sites/my-site/versions/v123' } }]
      })
    } as Response);

    const result = await getLatestVersion('my-site');
    expect(result).toBe('sites/my-site/versions/v123');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://firebasehosting.googleapis.com/v1beta1/sites/my-site/releases?pageSize=1',
      expect.objectContaining({
        headers: { Authorization: 'Bearer fake-token' }
      })
    );
  });

  it('throws when no releases found', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ releases: [] })
    } as Response);

    await expect(getLatestVersion('my-site')).rejects.toThrow('No releases found');
  });
});

describe('listFiles', () => {
  let fetchMock: any;

  beforeEach(() => {
    fetchMock = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchMock?.mockRestore();
  });

  it('returns all files from single page', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        files: [{ path: '/index.html' }, { path: '/style.css' }]
      })
    } as Response);

    const result = await listFiles('sites/my-site/versions/v123');
    expect(result).toEqual(['/index.html', '/style.css']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('paginates through multiple pages', async () => {
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

    const result = await listFiles('sites/my-site/versions/v123');
    expect(result).toEqual(['/page1.html', '/page2.html']);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('fetchFile', () => {
  let fetchMock: any;

  beforeEach(() => {
    fetchMock = vi.spyOn(globalThis, 'fetch');
    vi.spyOn(require('fs/promises'), 'writeFile').mockResolvedValue(undefined);
    vi.spyOn(require('fs/promises'), 'mkdir').mockResolvedValue(undefined);
  });

  afterEach(() => {
    fetchMock?.mockRestore();
  });

  it('encodes Japanese characters in URL', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8)
    } as Response);

    await fetchFile('my-site', '/サマリ.png', '/tmp');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://my-site.firebaseapp.com/%E3%82%B5%E3%83%9E%E3%83%AA.png'
    );
  });

  it('preserves forward slashes in path', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8)
    } as Response);

    await fetchFile('my-site', '/images/test.png', '/tmp');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://my-site.firebaseapp.com/images/test.png'
    );
  });

  it('throws when fetch fails', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: async () => 'Not Found'
    } as Response);

    await expect(fetchFile('my-site', '/missing.html', '/tmp'))
      .rejects.toThrow('Failed to fetch /missing.html: 404 Not Found');
  });
});

describe('fetchFiles', () => {
  let fetchMock: any;

  beforeEach(() => {
    fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8)
    } as Response);
    vi.spyOn(require('fs/promises'), 'writeFile').mockResolvedValue(undefined);
    vi.spyOn(require('fs/promises'), 'mkdir').mockResolvedValue(undefined);
  });

  afterEach(() => {
    fetchMock?.mockRestore();
    vi.clearAllMocks();
  });

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

    const files = Array.from({ length: 10 }, (_, i) => `/file${i}.txt`);
    await fetchFiles('my-site', files, '/tmp', 3);

    expect(maxConcurrent).toBeLessThanOrEqual(3);
  });

  it('reports progress during fetch', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation();

    const files = ['/file1.txt', '/file2.txt'];
    await fetchFiles('my-site', files, '/tmp', 2);

    expect(logSpy).toHaveBeenCalledTimes(2);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Fetched /file1.txt'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Fetched /file2.txt'));
  });
});

describe('end-to-end', () => {
  let fetchMock: any;

  beforeEach(() => {
    fetchMock = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchMock?.mockRestore();
  });

  it('fetches all files with correct paths', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        releases: [{ version: { name: 'sites/test/versions/v1' } }]
      })
    } as Response);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        files: [{ path: '/index.html' }, { path: '/日本語.html' }]
      })
    } as Response);

    fetchMock.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => Buffer.from('<html>test</html>')
    } as Response);

    vi.spyOn(require('fs/promises'), 'writeFile').mockResolvedValue(undefined);
    vi.spyOn(require('fs/promises'), 'mkdir').mockResolvedValue(undefined);

    const versionName = await getLatestVersion('test');
    expect(versionName).toBe('sites/test/versions/v1');

    const files = await listFiles(versionName);
    expect(files).toEqual(['/index.html', '/日本語.html']);

    await fetchFiles('test', files, '/tmp/test', 2);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('%E6%97%A5%E6%9C%AC%E8%AA%9E.html')
    );
  });
});
