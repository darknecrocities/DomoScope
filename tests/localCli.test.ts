import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parseCliArgs, runCli } from '../src/services/local/localCli';

describe('Local CLI', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'domoscope-test-cli-'));
  });

  afterEach(async () => {
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch {}
  });

  describe('Argument Parser', () => {
    it('parses command and long/short flags correctly', () => {
      const parsed = parseCliArgs(['analyze', '--dir', '/path/to/project', '--json', '-v']);
      expect(parsed.command).toBe('analyze');
      expect(parsed.options.dir).toBe('/path/to/project');
      expect(parsed.options.json).toBe(true);
      expect(parsed.options.v).toBe(true);
    });

    it('parses inverted flags (--no-cache)', () => {
      const parsed = parseCliArgs(['analyze', '--no-cache']);
      expect(parsed.command).toBe('analyze');
      expect(parsed.options.cache).toBe(false);
    });
  });

  describe('CLI Command Execution', () => {
    it('runs init command and creates .domoscope.json', async () => {
      const exitCode = await runCli(['init', '--dir', tempDir]);
      expect(exitCode).toBe(0);

      const configPath = join(tempDir, '.domoscope.json');
      const content = await readFile(configPath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.name).toBeDefined();
      expect(parsed.analysis.enabled).toBe(true);
    });

    it('runs doctor command and passes diagnostics on valid project', async () => {
      const exitCode = await runCli(['doctor', '--dir', tempDir]);
      expect(exitCode).toBe(0);
    });

    it('runs analyze command with --json output', async () => {
      await writeFile(
        join(tempDir, 'package.json'),
        JSON.stringify({ name: 'cli-test-app', dependencies: { react: '^18.0.0' } })
      );

      const jsonOutPath = join(tempDir, 'analysis.json');
      const exitCode = await runCli(['analyze', '--dir', tempDir, '--json', '--output', jsonOutPath]);
      expect(exitCode).toBe(0);

      const savedJson = JSON.parse(await readFile(jsonOutPath, 'utf-8'));
      expect(savedJson.metadata.repo).toBe('cli-test-app');
      expect(savedJson.frameworks.primary.name).toContain('React');
    });

    it('runs graph command with mermaid format output', async () => {
      await writeFile(
        join(tempDir, 'package.json'),
        JSON.stringify({ name: 'cli-graph-app', dependencies: { react: '^18.0.0' } })
      );

      const graphOutPath = join(tempDir, 'graph.mmd');
      const exitCode = await runCli(['graph', '--dir', tempDir, '--format', 'mermaid', '--output', graphOutPath]);
      expect(exitCode).toBe(0);

      const graphContent = await readFile(graphOutPath, 'utf-8');
      expect(graphContent).toContain('graph TD');
    });

    it('runs docs command to generate markdown documentation suite', async () => {
      await writeFile(
        join(tempDir, 'package.json'),
        JSON.stringify({ name: 'cli-docs-app', dependencies: { express: '^4.18.0' } })
      );

      const docsOutDir = join(tempDir, 'docs');
      const exitCode = await runCli(['docs', '--dir', tempDir, '--output', docsOutDir]);
      expect(exitCode).toBe(0);

      const overviewDoc = await readFile(join(docsOutDir, 'PROJECT_OVERVIEW.md'), 'utf-8');
      expect(overviewDoc).toContain('cli-docs-app');
      expect(overviewDoc).toContain('Express');
      const skillDoc = await readFile(join(docsOutDir, 'SKILL.md'), 'utf-8');
      expect(skillDoc.length).toBeGreaterThan(50);
    });

    it('runs skill command to generate standalone SKILL.md file', async () => {
      await writeFile(
        join(tempDir, 'package.json'),
        JSON.stringify({ name: 'cli-skill-app', dependencies: { react: '^18.0.0' } })
      );

      const skillPath = join(tempDir, 'MY_SKILL.md');
      const exitCode = await runCli(['skill', '--dir', tempDir, '--output', skillPath]);
      expect(exitCode).toBe(0);

      const content = await readFile(skillPath, 'utf-8');
      expect(content).toContain('cli-skill-app');
      expect(content.length).toBeGreaterThan(50);
    });
  });
});
