import { describe, it, expect } from 'vitest';
import { extractImportsFromCode, resolveImportPath, buildArchitectureGraph } from '../src/services/graphBuilder';
import { RepoFile } from '../src/types';

describe('Architecture Graph Builder', () => {
  it('extracts ES6 import targets', () => {
    const code = `
      import React from 'react';
      import { Navbar } from './components/Navbar';
      import Dashboard from '../views/Dashboard';
      export * from './utils/format';
    `;
    const imports = extractImportsFromCode(code, 'src/App.tsx');
    expect(imports).toContain('react');
    expect(imports).toContain('./components/Navbar');
    expect(imports).toContain('../views/Dashboard');
    expect(imports).toContain('./utils/format');
  });

  it('resolves relative import paths to known repository files', () => {
    const allFiles = new Set([
      'src/App.tsx',
      'src/components/Navbar.tsx',
      'src/views/Dashboard.tsx',
    ]);

    const resolved = resolveImportPath('./components/Navbar', 'src/App.tsx', allFiles);
    expect(resolved).toBe('src/components/Navbar.tsx');
  });

  it('builds connected DAG nodes and edges with Dagre coordinates', () => {
    const files: RepoFile[] = [
      {
        path: 'src/main.tsx',
        name: 'main.tsx',
        type: 'blob',
        sha: '1',
        extension: 'tsx',
        category: 'component',
      },
      {
        path: 'src/App.tsx',
        name: 'App.tsx',
        type: 'blob',
        sha: '2',
        extension: 'tsx',
        category: 'component',
      },
    ];

    const contents = new Map<string, string>();
    contents.set('src/main.tsx', "import App from './App';");
    contents.set('src/App.tsx', "export default function App() { return null; }");

    const graph = buildArchitectureGraph(files, contents);
    expect(graph.nodes.length).toBe(2);
    expect(graph.edges.length).toBe(1);
    expect(graph.edges[0].source).toBe('src/main.tsx');
    expect(graph.edges[0].target).toBe('src/App.tsx');
  });
});
