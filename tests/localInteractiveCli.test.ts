import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { PassThrough } from 'node:stream';
import { DomoScopeInteractiveCli } from '../src/services/local/localInteractiveCli';

describe('DomoScope Antigravity Interactive CLI', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'domoscope-test-interactive-'));
    // Setup minimal project fixture
    await writeFile(
      join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'interactive-test-project',
        version: '1.0.0',
        dependencies: {
          react: '^18.2.0',
          express: '^4.18.2',
        },
      })
    );
    await mkdir(join(tempDir, 'src', 'api'), { recursive: true });
    await writeFile(
      join(tempDir, 'src', 'api', 'users.ts'),
      '// GET /api/users\nexport function getUsers() { return []; }'
    );
  });

  afterEach(async () => {
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('initializes and executes slash commands directly', async () => {
    const outputLines: string[] = [];
    const customOutput = new PassThrough();
    customOutput.on('data', (chunk) => {
      outputLines.push(chunk.toString());
    });

    const cli = new DomoScopeInteractiveCli({
      rootDir: tempDir,
      noColor: true,
      output: customOutput,
    });

    // 1. Help
    await cli.executeSlashCommand('help', []);
    const helpOutput = outputLines.join('');
    expect(helpOutput).toContain('DomoScope Terminal Commands & Navigation');
    expect(helpOutput).toContain('/analyze');
    expect(helpOutput).toContain('/routes');

    // 2. Banner
    outputLines.length = 0;
    await cli.executeSlashCommand('banner', []);
    expect(outputLines.join('')).toContain('interactive-test-project');

    // 3. Status
    outputLines.length = 0;
    await cli.executeSlashCommand('status', []);
    const statusOutput = outputLines.join('');
    expect(statusOutput).toContain('Repository Status & Metrics');
    expect(statusOutput).toContain('interactive-test-project');

    // 4. Routes
    outputLines.length = 0;
    await cli.executeSlashCommand('routes', []);
    const routesOutput = outputLines.join('');
    expect(routesOutput).toContain('API Route & Endpoint Catalog');

    // 5. Security
    outputLines.length = 0;
    await cli.executeSlashCommand('security', []);
    expect(outputLines.join().length).toBeGreaterThan(10);

    // 6. MCP
    outputLines.length = 0;
    await cli.executeSlashCommand('mcp', []);
    expect(outputLines.join('')).toContain('Model Context Protocol (MCP) Integration');

    // 7. Doctor
    outputLines.length = 0;
    await cli.executeSlashCommand('doctor', []);
    expect(outputLines.join('')).toContain('System & Repository Diagnostics');
  });

  it('answers natural language queries about codebase', async () => {
    const outputLines: string[] = [];
    const customOutput = new PassThrough();
    customOutput.on('data', (chunk) => {
      outputLines.push(chunk.toString());
    });

    const cli = new DomoScopeInteractiveCli({
      rootDir: tempDir,
      noColor: true,
      output: customOutput,
    });

    // Ask about routes
    await cli.handleNaturalQuery('show api routes');
    expect(outputLines.join('')).toContain('API Route & Endpoint Catalog');

    // Ask about security
    outputLines.length = 0;
    await cli.handleNaturalQuery('check security vulnerabilities');
    expect(outputLines.join('').length).toBeGreaterThan(10);

    // Ask general explanation
    outputLines.length = 0;
    await cli.handleNaturalQuery('what does this project do');
    const genOutput = outputLines.join('');
    expect(genOutput).toContain('Summary:');
    expect(genOutput).toContain('interactive-test-project');
  });

  it('runs interactive stream loop with sequential commands and exits cleanly', async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    let accumulated = '';
    output.on('data', (d) => {
      accumulated += d.toString();
    });

    const cli = new DomoScopeInteractiveCli({
      rootDir: tempDir,
      noColor: true,
      input,
      output,
    });

    const cliPromise = cli.start();

    input.write('/status\n');
    input.write('/routes\n');
    input.write('/reverse\n');
    input.write('/mcp\n');
    input.write('/exit\n');

    const exitCode = await cliPromise;
    expect(exitCode).toBe(0);
    expect(accumulated).toContain('Repository Status & Metrics');
    expect(accumulated).toContain('API Route & Endpoint Catalog');
    expect(accumulated).toContain('Autonomous Reverse-Engineering Blueprint');
    expect(accumulated).toContain('Model Context Protocol (MCP) Integration');
    expect(accumulated).toContain('Thank you for using DomoScope');
  });
});
