import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir, symlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { scanLocalRepository, computeFileHash, isPathWithinRoot } from '../src/services/local/localScanner';

describe('Local Repository Scanner', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'domoscope-test-scan-'));
  });

  afterEach(async () => {
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('scans text files and calculates sha256 & mtime fingerprints', async () => {
    await writeFile(join(tempDir, 'index.ts'), 'console.log("hello world");');
    await mkdir(join(tempDir, 'src'));
    await writeFile(join(tempDir, 'src', 'App.tsx'), 'export const App = () => <div>App</div>;');

    const result = await scanLocalRepository({ rootDir: tempDir });
    const blobs = result.files.filter((f) => f.type === 'blob');
    expect(blobs.length).toBe(2);

    const indexFile = result.files.find((f) => f.path === 'index.ts');
    expect(indexFile).toBeDefined();
    expect(indexFile?.sha).toBeDefined();
    expect(result.fileContents.get('index.ts')).toBe('console.log("hello world");');

    const appFile = result.files.find((f) => f.path === 'src/App.tsx');
    expect(appFile).toBeDefined();
    expect(appFile?.category).toBe('component');
  });

  it('respects .gitignore patterns and excludes ignored directories', async () => {
    await writeFile(
      join(tempDir, '.gitignore'),
      `
node_modules/
dist/
*.log
secret.key
`
    );
    await writeFile(join(tempDir, 'index.ts'), 'console.log("main");');
    await writeFile(join(tempDir, 'debug.log'), 'sensitive log info');
    await writeFile(join(tempDir, 'secret.key'), 'SUPER_SECRET_KEY');

    await mkdir(join(tempDir, 'node_modules'));
    await writeFile(join(tempDir, 'node_modules', 'pkg.js'), 'module.exports = {}');

    await mkdir(join(tempDir, 'dist'));
    await writeFile(join(tempDir, 'dist', 'bundle.js'), 'minified');

    const result = await scanLocalRepository({ rootDir: tempDir });
    const paths = result.files.map((f) => f.path);

    expect(paths).toContain('index.ts');
    expect(paths).toContain('.gitignore');
    expect(paths).not.toContain('debug.log');
    expect(paths).not.toContain('secret.key');
    expect(paths).not.toContain('node_modules/pkg.js');
    expect(paths).not.toContain('dist/bundle.js');
  });

  it('prevents symlink directory traversal escaping the root directory', async () => {
    const outsideDir = await mkdtemp(join(tmpdir(), 'domoscope-outside-'));
    try {
      await writeFile(join(outsideDir, 'secret.env'), 'SECRET_VAR=12345');
      await writeFile(join(tempDir, 'valid.ts'), 'export const x = 1;');

      // Create a symlink pointing outside
      try {
        await symlink(outsideDir, join(tempDir, 'escaped-link'), 'dir');
      } catch {
        // If symlink permissions are restricted on some OS runners, skip symlink creation
      }

      const result = await scanLocalRepository({ rootDir: tempDir });
      const paths = result.files.map((f) => f.path);
      expect(paths).toContain('valid.ts');
      expect(paths).not.toContain('escaped-link/secret.env');
    } finally {
      await rm(outsideDir, { recursive: true, force: true });
    }
  });

  it('detects and handles binary files appropriately without crashing', async () => {
    await writeFile(join(tempDir, 'code.ts'), 'const a = 1;');
    // Write binary buffer with null bytes
    const binaryBuf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x00, 0x00, 0x0d]);
    await writeFile(join(tempDir, 'image.png'), binaryBuf);

    const result = await scanLocalRepository({ rootDir: tempDir });
    const pngFile = result.files.find((f) => f.path === 'image.png');
    expect(pngFile).toBeDefined();
    // Binary content should not be stored in utf8 text map
    expect(result.fileContents.has('image.png')).toBe(false);
    expect(result.fileContents.has('code.ts')).toBe(true);
  });
});
