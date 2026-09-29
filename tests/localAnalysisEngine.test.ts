import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { analyzeLocalRepository } from '../src/services/local/localAnalysisEngine';

describe('Local Analysis Engine', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'domoscope-test-engine-'));
  });

  afterEach(async () => {
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('runs complete AST static analysis pipeline on a local project', async () => {
    // 1. package.json
    await writeFile(
      join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'sample-local-app',
        version: '1.0.0',
        dependencies: {
          react: '^18.2.0',
          'react-dom': '^18.2.0',
          express: '^4.18.2',
        },
      })
    );

    // 2. SQL schema
    await mkdir(join(tempDir, 'db'));
    await writeFile(
      join(tempDir, 'db', 'schema.sql'),
      `
CREATE TABLE accounts (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL
);

CREATE TABLE profiles (
  id SERIAL PRIMARY KEY,
  account_id INTEGER REFERENCES accounts(id),
  bio TEXT
);
`
    );

    // 3. Express route
    await mkdir(join(tempDir, 'src'));
    await writeFile(
      join(tempDir, 'src', 'server.ts'),
      `
import express from 'express';
const app = express();

app.get('/api/accounts', (req, res) => {
  res.json({ accounts: [] });
});

app.listen(3000);
`
    );

    const snapshot = await analyzeLocalRepository({ rootDir: tempDir });

    expect(snapshot.metadata.repo).toBe('sample-local-app');
    expect(snapshot.frameworks.primary.name).toContain('Express');
    expect(snapshot.databaseSchema.tables.length).toBe(2);
    expect(snapshot.databaseSchema.relationships.length).toBe(1);
    expect(snapshot.apiEndpoints.length).toBe(1);
    expect(snapshot.apiEndpoints[0].path).toBe('/api/accounts');
    expect(snapshot.apiEndpoints[0].method).toBe('GET');
    expect(snapshot.dependencies.length).toBe(3);
    expect(snapshot.graph.nodes.length).toBeGreaterThan(0);
  });

  it('serves fast cached analysis on repeated calls without changes', async () => {
    await writeFile(
      join(tempDir, 'package.json'),
      JSON.stringify({ name: 'cached-app', dependencies: { react: '^18.0.0' } })
    );

    const firstRun = await analyzeLocalRepository({ rootDir: tempDir });
    expect(firstRun.isCached).toBe(false);

    const secondRun = await analyzeLocalRepository({ rootDir: tempDir });
    expect(secondRun.isCached).toBe(true);
    expect(secondRun.durationMs).toBeLessThanOrEqual(firstRun.durationMs + 20);
  });
});
