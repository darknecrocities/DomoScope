import { describe, it, expect } from 'vitest';
import { MarkdownSpecGenerator } from '../src/services/markdownSpecGenerator';
import { RepoAnalysis, RepoFile } from '../src/types';

describe('Markdown Spec Generator', () => {
  it('generates fully detailed 1000+ line specification', () => {
    const analysis: RepoAnalysis = {
      metadata: {
        owner: 'darknecrocities',
        repo: 'Agentdeck',
        fullName: 'darknecrocities/Agentdeck',
        description: 'Autonomous AI Agent Desktop Workspace',
        language: 'TypeScript',
        stars: 42,
        forks: 5,
        openIssues: 2,
        defaultBranch: 'main',
        isPrivate: false,
        size: 15400,
        updatedAt: '2026-09-27T00:00:00Z',
      },
      files: [],
      summary: 'Agentdeck is a modern desktop workspace for building and orchestrating AI agents.',
      categoriesCount: {
        component: 12,
        service: 6,
        api: 4,
        database: 2,
        config: 4,
        test: 3,
        style: 2,
        doc: 1,
        file: 5,
        folder: 4,
      },
      languages: { TypeScript: 25, CSS: 2, JSON: 4 },
      totalFiles: 35,
      totalDirs: 6,
      detectedTools: ['React', 'Vite', 'Tailwind CSS', 'TypeScript', 'Node.js'],
      entryPoints: ['src/main.tsx', 'src/App.tsx'],
    };

    const files: RepoFile[] = [
      { path: 'src/main.tsx', name: 'main.tsx', type: 'blob', sha: '1', extension: 'tsx', category: 'component', size: 1200 },
      { path: 'src/App.tsx', name: 'App.tsx', type: 'blob', sha: '2', extension: 'tsx', category: 'component', size: 3400 },
      { path: 'src/components/layout/Navbar.tsx', name: 'Navbar.tsx', type: 'blob', sha: '3', extension: 'tsx', category: 'component', size: 4500 },
      { path: 'src/components/workspace/ArchitectureGraph.tsx', name: 'ArchitectureGraph.tsx', type: 'blob', sha: '4', extension: 'tsx', category: 'component', size: 12000 },
      { path: 'src/services/graphBuilder.ts', name: 'graphBuilder.ts', type: 'blob', sha: '5', extension: 'ts', category: 'service', size: 8500 },
      { path: 'src/services/apiClient.ts', name: 'apiClient.ts', type: 'blob', sha: '6', extension: 'ts', category: 'api', size: 3200 },
    ];

    const fileContents = new Map<string, string>();
    fileContents.set('src/main.tsx', 'import React from "react"; import App from "./App";');
    fileContents.set('src/App.tsx', 'export function App() { return <div>Agentdeck</div>; }');
    fileContents.set('src/services/apiClient.ts', 'export async function fetchAgents() { return fetch("/api/agents"); }');

    const spec = MarkdownSpecGenerator.generateSpec(analysis, files, fileContents);
    const lineCount = spec.split('\n').length;
    console.log(`Generated specification line count: ${lineCount}`);

    expect(lineCount).toBeGreaterThanOrEqual(1000);
    expect(spec).toContain('# Complete Reverse Engineering & System Architecture Specification');
    expect(spec).toContain('## 1. Executive Summary & High-Level Purpose');
    expect(spec).toContain('## 3. Frontend Architecture, UI Hierarchy & Interaction Design');
    expect(spec).toContain('## 4. Backend API Engine, Route Contracts & Middleware');
    expect(spec).toContain('## 6. End-to-End Application Runtime Behavior & Lifecycles');
    expect(spec).toContain('## 8. Exhaustive 10-Phase Step-by-Step Reconstruction Guide');
  });
});
