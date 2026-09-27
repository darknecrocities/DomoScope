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

  it('builds an isolated, dynamic Database diagram when filterCategory is database', () => {
    const files: RepoFile[] = [
      { path: 'lib/main.dart', name: 'main.dart', type: 'blob', sha: '1', extension: 'dart', category: 'component' },
      { path: 'lib/screens/home.dart', name: 'home.dart', type: 'blob', sha: '2', extension: 'dart', category: 'component' },
      { path: 'lib/services/api.dart', name: 'api.dart', type: 'blob', sha: '3', extension: 'dart', category: 'service' },
      { path: 'lib/models/agent.dart', name: 'agent.dart', type: 'blob', sha: '4', extension: 'dart', category: 'database' },
    ];

    const databaseSchema = {
      tables: [
        {
          name: 'Agent',
          columns: [
            { name: 'id', type: 'String', isPrimary: true, isNullable: false, isForeignKey: false },
            { name: 'name', type: 'String', isPrimary: false, isNullable: false, isForeignKey: false },
          ],
          sourceFile: 'lib/models/agent.dart',
          schemaType: 'domain',
        },
        {
          name: 'Session',
          columns: [
            { name: 'id', type: 'String', isPrimary: true, isNullable: false, isForeignKey: false },
            { name: 'agentId', type: 'String', isPrimary: false, isNullable: false, isForeignKey: true },
          ],
          sourceFile: 'lib/models/session.dart',
          schemaType: 'domain',
        },
      ],
      relationships: [
        {
          id: 'rel-1',
          fromTable: 'Session',
          fromColumn: 'agentId',
          toTable: 'Agent',
          toColumn: 'id',
          type: 'one-to-many' as const,
          isInferred: false,
        },
      ],
      detectedTypes: ['domain'],
      sourceFiles: ['lib/models/agent.dart'],
    };

    // When filterCategory is database, only database tables and database files are returned
    const dbGraph = buildArchitectureGraph(files, new Map(), {
      filterCategory: 'database',
      databaseSchema,
    });

    // Must NOT return main.dart, home.dart, or api.dart
    const nodeIds = dbGraph.nodes.map((n) => n.id);
    expect(nodeIds).not.toContain('lib/main.dart');
    expect(nodeIds).not.toContain('lib/screens/home.dart');
    expect(nodeIds).not.toContain('lib/services/api.dart');

    // Must contain the database tables and models
    expect(nodeIds).toContain('table:Agent');
    expect(nodeIds).toContain('table:Session');
    expect(nodeIds).toContain('lib/models/agent.dart');

    // Must contain relationship edge between Session and Agent
    const relEdge = dbGraph.edges.find((e) => e.source === 'table:Session' && e.target === 'table:Agent');
    expect(relEdge).toBeDefined();

    // Must NOT be the same as 'all'
    const allGraph = buildArchitectureGraph(files, new Map(), { filterCategory: 'all', databaseSchema });
    expect(allGraph.nodes.length).not.toBe(dbGraph.nodes.length);
  });
});
