import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { analyzeLocalRepository } from '../src/services/local/localAnalysisEngine';
import { generateLocalDocs } from '../src/services/local/localDocsGenerator';

describe('Local Docs Generator', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'domoscope-test-docs-'));
  });

  afterEach(async () => {
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('generates all 6 markdown documentation files in output directory', async () => {
    await writeFile(
      join(tempDir, 'package.json'),
      JSON.stringify({ name: 'doc-test-repo', dependencies: { react: '^18.0.0' } })
    );

    const snapshot = await analyzeLocalRepository({ rootDir: tempDir });
    const outputDir = join(tempDir, 'generated-docs');
    const generated = await generateLocalDocs(snapshot, { outputDir });

    expect(generated.length).toBe(7);

    const files = generated.map((g) => g.path);
    expect(files).toContain('PROJECT_OVERVIEW.md');
    expect(files).toContain('ARCHITECTURE.md');
    expect(files).toContain('DATABASE.md');
    expect(files).toContain('API_REFERENCE.md');
    expect(files).toContain('SECURITY_AUDIT.md');
    expect(files).toContain('REVERSE_ENGINEER_SPEC.md');
    expect(files).toContain('SKILL.md');

    for (const doc of generated) {
      expect(doc.content.length).toBeGreaterThan(50);
      expect(doc.content).toContain('doc-test-repo');
    }
  });
});
