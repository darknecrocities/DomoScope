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

  it('builds connected DAG nodes and edges with vertical coordinates', () => {
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

    const graph = buildArchitectureGraph(files, contents, { rankDirection: 'TB' });
    expect(graph.nodes.length).toBe(2);
    expect(graph.edges.length).toBe(1);
    expect(graph.edges[0].source).toBe('src/main.tsx');
    expect(graph.edges[0].target).toBe('src/App.tsx');

    // Vertical top-to-bottom layout: main is at lower Y than App
    const mainNode = graph.nodes.find((n) => n.id === 'src/main.tsx');
    const appNode = graph.nodes.find((n) => n.id === 'src/App.tsx');
    expect(mainNode?.position.y).toBeLessThan(appNode?.position.y!);
  });

  it('enforces balanced vertical multi-column layout without wide horizontal stretching', () => {
    // Generate 12 component files
    const files: RepoFile[] = [
      { path: 'src/main.tsx', name: 'main.tsx', type: 'blob', sha: '0', extension: 'tsx', category: 'component' }
    ];
    for (let i = 1; i <= 11; i++) {
      files.push({
        path: `src/components/Card${i}.tsx`,
        name: `Card${i}.tsx`,
        type: 'blob',
        sha: `${i}`,
        extension: 'tsx',
        category: 'component',
      });
    }

    const contents = new Map<string, string>();
    const graph = buildArchitectureGraph(files, contents, { rankDirection: 'TB' });

    expect(graph.nodes.length).toBe(12);

    // Get the unique Y coordinate levels
    const yLevels = new Set(graph.nodes.map((n) => n.position.y));
    // Must be arranged into multiple vertical rows (not all on 1 or 2 rows)
    expect(yLevels.size).toBeGreaterThanOrEqual(4);

    // Maximum width of any row should not exceed 4 nodes (~1030px)
    const xs = graph.nodes.map((n) => n.position.x);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const totalWidth = maxX - minX;
    expect(totalWidth).toBeLessThan(1200);
  });

  it('computes heatmap metrics including healthColor and complexityScore', () => {
    const files: RepoFile[] = [
      {
        path: 'src/HeavyService.ts',
        name: 'HeavyService.ts',
        type: 'blob',
        sha: '10',
        extension: 'ts',
        category: 'service',
        size: 15000,
      },
    ];

    const graph = buildArchitectureGraph(files, new Map(), { heatmapMode: true });
    expect(graph.nodes.length).toBe(1);
    const node = graph.nodes[0];
    expect(node.data.heatmapMode).toBe(true);
    expect(node.data.complexityScore).toBeDefined();
    expect(['green', 'yellow', 'red']).toContain(node.data.healthColor);
  });
});
