import { describe, it, expect } from 'vitest';
import { parseDependencies } from '../src/services/dependencyParser';

describe('Dependency Parser', () => {
  it('parses package.json runtime and dev dependencies', () => {
    const pkgJson = JSON.stringify({
      dependencies: {
        react: '^18.2.0',
        'lucide-react': '^0.300.0',
      },
      devDependencies: {
        typescript: '^5.0.0',
        vitest: '^1.0.0',
      },
    });

    const sourceFiles = [
      {
        path: 'src/App.tsx',
        content: "import React from 'react';\nimport { Shield } from 'lucide-react';",
      },
    ];

    const deps = parseDependencies(
      [{ path: 'package.json', content: pkgJson }],
      sourceFiles
    );

    expect(deps.length).toBe(4);
    const reactDep = deps.find((d) => d.name === 'react');
    expect(reactDep?.isDev).toBe(false);
    expect(reactDep?.usedInFiles).toContain('src/App.tsx');

    const tsDep = deps.find((d) => d.name === 'typescript');
    expect(tsDep?.isDev).toBe(true);
  });

  it('parses Python requirements.txt', () => {
    const reqs = `
      fastapi==0.104.1
      uvicorn>=0.24.0
      pydantic~=2.5.0
    `;

    const deps = parseDependencies([{ path: 'requirements.txt', content: reqs }], []);
    expect(deps.length).toBe(3);
    expect(deps[0].name).toBe('fastapi');
    expect(deps[0].version).toBe('0.104.1');
    expect(deps[0].ecosystem).toBe('python');
  });
});
