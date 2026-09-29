import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { LocalCacheManager } from '../src/services/local/localCacheManager';
import { LocalFileEntry } from '../src/services/local/localScanner';

describe('Local Cache Manager', () => {
  let tempDir: string;
  let cacheManager: LocalCacheManager;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'domoscope-test-cache-'));
    cacheManager = new LocalCacheManager(tempDir);
  });

  afterEach(async () => {
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('loads empty cache if cache file does not exist', async () => {
    const cache = await cacheManager.load();
    expect(cache).toBeNull();
  });

  it('saves cache atomically and loads it back accurately', async () => {
    const files: LocalFileEntry[] = [
      {
        path: 'src/index.ts',
        absolutePath: join(tempDir, 'src/index.ts'),
        category: 'code',
        size: 120,
        mtime: Date.now(),
        hash: 'abc123hash',
        isBinary: false,
      },
    ];

    await cacheManager.save({
      version: 1,
      timestamp: Date.now(),
      files,
      git: { branch: 'main', commitSha: 'abcdef12' },
    });

    const loaded = await cacheManager.load();
    expect(loaded).toBeDefined();
    expect(loaded?.files.length).toBe(1);
    expect(loaded?.files[0].path).toBe('src/index.ts');
    expect(loaded?.git.branch).toBe('main');
  });

  it('calculates file diff correctly (added, modified, deleted, unchanged)', async () => {
    const cachedFiles: LocalFileEntry[] = [
      {
        path: 'unchanged.ts',
        absolutePath: join(tempDir, 'unchanged.ts'),
        category: 'code',
        size: 50,
        mtime: 1000,
        hash: 'hash-unchanged',
        isBinary: false,
      },
      {
        path: 'modified.ts',
        absolutePath: join(tempDir, 'modified.ts'),
        category: 'code',
        size: 80,
        mtime: 1000,
        hash: 'hash-v1',
        isBinary: false,
      },
      {
        path: 'deleted.ts',
        absolutePath: join(tempDir, 'deleted.ts'),
        category: 'code',
        size: 40,
        mtime: 1000,
        hash: 'hash-del',
        isBinary: false,
      },
    ];

    await cacheManager.save({
      version: 1,
      timestamp: 1000,
      files: cachedFiles,
      git: {},
    });

    const currentFiles: LocalFileEntry[] = [
      {
        path: 'unchanged.ts',
        absolutePath: join(tempDir, 'unchanged.ts'),
        category: 'code',
        size: 50,
        mtime: 1000,
        hash: 'hash-unchanged',
        isBinary: false,
      },
      {
        path: 'modified.ts',
        absolutePath: join(tempDir, 'modified.ts'),
        category: 'code',
        size: 110,
        mtime: 2000,
        hash: 'hash-v2', // modified hash
        isBinary: false,
      },
      {
        path: 'added.ts',
        absolutePath: join(tempDir, 'added.ts'),
        category: 'code',
        size: 60,
        mtime: 2000,
        hash: 'hash-new',
        isBinary: false,
      },
    ];

    const diff = await cacheManager.diffWithCurrentFiles(currentFiles);
    expect(diff.isChanged).toBe(true);
    expect(diff.added.map((f) => f.path)).toEqual(['added.ts']);
    expect(diff.modified.map((f) => f.path)).toEqual(['modified.ts']);
    expect(diff.deleted).toEqual(['deleted.ts']);
    expect(diff.unchanged.map((f) => f.path)).toEqual(['unchanged.ts']);
  });

  it('recovers gracefully from corrupted cache file', async () => {
    await mkdir(join(tempDir, '.domoscope'), { recursive: true });
    await writeFile(join(tempDir, '.domoscope', 'cache.json'), '{ broken JSON syntax !!!');

    const loaded = await cacheManager.load();
    expect(loaded).toBeNull();
  });
});
