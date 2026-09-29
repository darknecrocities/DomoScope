import { describe, it, expect } from 'vitest';
import {
  generateCodebaseSuggestions,
  filterSuggestions,
  generateSuggestionsMarkdown,
} from '../src/services/suggestionsGenerator';
import { RepoAnalysis, RepoFile, DatabaseSchema, SecurityFinding, RepoDependency } from '../src/types';

describe('Codebase Suggestions & Insights Engine', () => {
  const mockMetadata = {
    owner: 'test-owner',
    repo: 'test-repo',
    fullName: 'test-owner/test-repo',
    description: 'Test repository for architectural suggestions',
    defaultBranch: 'main',
    stars: 100,
    forks: 20,
    watchers: 50,
    openIssues: 2,
    language: 'TypeScript',
    license: 'MIT',
    updatedAt: '2026-09-29T00:00:00Z',
    createdAt: '2024-01-01T00:00:00Z',
    size: 2048,
    isPrivate: false,
    htmlUrl: 'https://github.com/test-owner/test-repo',
  };

  const mockFiles: RepoFile[] = [
    {
      path: 'src/main.tsx',
      name: 'main.tsx',
      type: 'blob',
      extension: 'tsx',
      category: 'component',
      content: 'import React from "react";\nexport function App() { return <div>App</div>; }',
    },
    {
      path: 'src/components/HugeView.tsx',
      name: 'HugeView.tsx',
      type: 'blob',
      extension: 'tsx',
      category: 'component',
      content: Array(450).fill('const line = 1;').join('\n'),
    },
    {
      path: 'src/services/dataService.ts',
      name: 'dataService.ts',
      type: 'blob',
      extension: 'ts',
      category: 'service',
      content: 'export const DataService = { fetchAll: () => [] };',
    },
    {
      path: 'tests/dataService.test.ts',
      name: 'dataService.test.ts',
      type: 'blob',
      extension: 'ts',
      category: 'test',
      content: 'import { describe, it, expect } from "vitest";\ndescribe("test", () => {});',
    },
    {
      path: 'README.md',
      name: 'README.md',
      type: 'blob',
      extension: 'md',
      category: 'doc',
      content: '# Test Repo\nSetup guide',
    },
    {
      path: '.github/workflows/ci.yml',
      name: 'ci.yml',
      type: 'blob',
      extension: 'yml',
      category: 'config',
      content: 'name: CI\non: push',
    },
  ];

  const mockAnalysis: RepoAnalysis = {
    metadata: mockMetadata,
    files: mockFiles,
    summary: 'A modular TypeScript web application.',
    categoriesCount: {
      component: 2,
      service: 1,
      api: 0,
      database: 0,
      config: 1,
      test: 1,
      style: 0,
      doc: 1,
      file: 0,
      folder: 0,
    },
    languages: { TypeScript: 80, YAML: 10, Markdown: 10 },
    totalFiles: 6,
    totalDirs: 3,
    detectedTools: ['vite', 'vitest'],
    entryPoints: ['src/main.tsx'],
  };

  const mockSchema: DatabaseSchema = {
    tables: [
      {
        name: 'users',
        sourceFile: 'prisma/schema.prisma',
        schemaType: 'prisma',
        columns: [
          { name: 'id', type: 'String', isPrimary: true, isNullable: false, isForeignKey: false },
          { name: 'email', type: 'String', isPrimary: false, isNullable: false, isForeignKey: false },
          { name: 'createdAt', type: 'DateTime', isPrimary: false, isNullable: false, isForeignKey: false },
        ],
      },
      {
        name: 'posts',
        sourceFile: 'prisma/schema.prisma',
        schemaType: 'prisma',
        columns: [
          { name: 'id', type: 'String', isPrimary: true, isNullable: false, isForeignKey: false },
          { name: 'userId', type: 'String', isPrimary: false, isNullable: false, isForeignKey: true },
          { name: 'createdAt', type: 'DateTime', isPrimary: false, isNullable: false, isForeignKey: false },
        ],
      },
    ],
    relationships: [
      {
        id: 'rel-users-posts',
        fromTable: 'posts',
        fromColumn: 'userId',
        toTable: 'users',
        toColumn: 'id',
        type: 'one-to-many',
        isInferred: false,
      },
    ],
    detectedTypes: ['prisma'],
    sourceFiles: ['prisma/schema.prisma'],
  };

  const mockSecurityFindings: SecurityFinding[] = [
    {
      id: 'sec-1',
      title: 'Potential Hardcoded Secret',
      severity: 'high',
      category: 'Secrets',
      file: 'src/config/keys.ts',
      line: 12,
      evidence: 'const KEY = "sk_live_12345"',
      explanation: 'Hardcoded secret token in source file.',
      suggestedAction: 'Move to process.env.KEY.',
    },
  ];

  const mockDependencies: RepoDependency[] = [
    {
      name: 'react',
      version: '^18.2.0',
      isDev: false,
      ecosystem: 'npm',
      manifestPath: 'package.json',
      usedInFiles: ['src/main.tsx'],
    },
    {
      name: '@xyflow/react',
      version: '^12.0.0',
      isDev: false,
      ecosystem: 'npm',
      manifestPath: 'package.json',
      usedInFiles: ['src/components/HugeView.tsx'],
    },
  ];

  it('generates multi-category suggestions from repository static analysis', () => {
    const { suggestions, stats } = generateCodebaseSuggestions({
      analysis: mockAnalysis,
      files: mockFiles,
      databaseSchema: mockSchema,
      securityFindings: mockSecurityFindings,
      dependencies: mockDependencies,
    });

    expect(suggestions.length).toBeGreaterThan(0);
    expect(stats.total).toBe(suggestions.length);
    expect(stats.overallScore).toBeGreaterThanOrEqual(40);
    expect(stats.overallScore).toBeLessThanOrEqual(100);

    // Should detect the 450-line file as a monolithic hotspot
    const hotspot = suggestions.find((s) => s.id === 'arch-monolithic-hotspots');
    expect(hotspot).toBeDefined();
    expect(hotspot?.affectedFiles).toContain('src/components/HugeView.tsx');
    expect(hotspot?.agentPrompt).toContain('Refactor');

    // Should detect security finding
    const sec = suggestions.find((s) => s.id === 'sec-vulnerabilities-remediation');
    expect(sec).toBeDefined();
    expect(sec?.impact).toBe('high');

    // Should detect heavy dependency dynamic import recommendation
    const perf = suggestions.find((s) => s.id === 'perf-code-splitting-heavy-deps');
    expect(perf).toBeDefined();
    expect(perf?.category).toBe('performance');

    // Should detect database relational integrity as positive
    const db = suggestions.find((s) => s.id === 'db-relations-intact');
    expect(db).toBeDefined();
    expect(db?.impact).toBe('positive');
  });

  it('filters suggestions correctly by category, priority, and text query', () => {
    const { suggestions } = generateCodebaseSuggestions({
      analysis: mockAnalysis,
      files: mockFiles,
      databaseSchema: mockSchema,
      securityFindings: mockSecurityFindings,
      dependencies: mockDependencies,
    });

    // Filter by category
    const archOnly = filterSuggestions(suggestions, { category: 'architecture' });
    expect(archOnly.every((s) => s.category === 'architecture')).toBe(true);

    // Filter by impact
    const highOnly = filterSuggestions(suggestions, { impact: 'high' });
    expect(highOnly.every((s) => s.impact === 'high')).toBe(true);

    // Search query
    const searchMatch = filterSuggestions(suggestions, { searchQuery: 'monolithic' });
    expect(searchMatch.length).toBeGreaterThan(0);
    expect(searchMatch[0].title.toLowerCase()).toContain('monolithic');
  });

  it('generates clean, emoji-free markdown action plan', () => {
    const { suggestions, stats } = generateCodebaseSuggestions({
      analysis: mockAnalysis,
      files: mockFiles,
      databaseSchema: mockSchema,
      securityFindings: mockSecurityFindings,
      dependencies: mockDependencies,
    });

    const markdown = generateSuggestionsMarkdown('test-owner/test-repo', suggestions, stats);

    expect(markdown).toContain('# Codebase Insights & Action Plan: test-owner/test-repo');
    expect(markdown).toContain('## Executive Summary');
    expect(markdown).toContain('## Detailed Action Items');
    expect(markdown).not.toMatch(/[\u{1F300}-\u{1F9FF}]/u); // Zero emojis
  });
});
