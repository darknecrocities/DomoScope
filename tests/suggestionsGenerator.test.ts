import { describe, it, expect } from 'vitest';
import {
  generateSetupChecklist,
  filterChecklist,
  generateChecklistMarkdown,
} from '../src/services/suggestionsGenerator';
import { RepoAnalysis, RepoFile, DatabaseSchema, SecurityFinding, RepoDependency } from '../src/types';

describe('Repository Setup & Standards Checklist Engine', () => {
  const mockMetadata = {
    owner: 'test-owner',
    repo: 'test-repo',
    fullName: 'test-owner/test-repo',
    description: 'Test repository for setup checklist',
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
      path: '.gitignore',
      name: '.gitignore',
      type: 'blob',
      extension: '',
      category: 'config',
      content: 'node_modules\n.env\ndist\n.DS_Store',
    },
    {
      path: 'src/main.tsx',
      name: 'main.tsx',
      type: 'blob',
      extension: 'tsx',
      category: 'component',
      content: 'import React from "react";\nexport function App() { return <div>App</div>; }',
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
      path: 'tests/main.test.ts',
      name: 'main.test.ts',
      type: 'blob',
      extension: 'ts',
      category: 'test',
      content: 'import { describe, it, expect } from "vitest";\ndescribe("main", () => {});',
    },
    {
      path: '.github/workflows/ci.yml',
      name: 'ci.yml',
      type: 'blob',
      extension: 'yml',
      category: 'config',
      content: 'name: CI\non: push',
    },
    {
      path: 'tsconfig.json',
      name: 'tsconfig.json',
      type: 'blob',
      extension: 'json',
      category: 'config',
      content: '{"compilerOptions": {"strict": true}}',
    },
  ];

  const mockAnalysis: RepoAnalysis = {
    metadata: mockMetadata,
    files: mockFiles,
    summary: 'A modular TypeScript web application.',
    categoriesCount: {
      component: 1,
      service: 0,
      api: 0,
      database: 0,
      config: 3,
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
        ],
      },
    ],
    relationships: [],
    detectedTypes: ['prisma'],
    sourceFiles: ['prisma/schema.prisma'],
  };

  const mockDependencies: RepoDependency[] = [
    {
      name: 'eslint',
      version: '^9.0.0',
      isDev: true,
      ecosystem: 'npm',
      manifestPath: 'package.json',
      usedInFiles: [],
    },
  ];

  it('generates standard setup checklist items with checkmark status', () => {
    const { items, stats } = generateSetupChecklist({
      analysis: mockAnalysis,
      files: mockFiles,
      databaseSchema: mockSchema,
      securityFindings: [],
      dependencies: mockDependencies,
    });

    expect(items.length).toBeGreaterThanOrEqual(10);
    expect(stats.total).toBe(items.length);
    expect(stats.completedCount).toBeGreaterThan(0);
    expect(stats.completionPercentage).toBeGreaterThanOrEqual(50);

    // .gitignore check
    const gitignoreItem = items.find((i) => i.id === 'setup-gitignore');
    expect(gitignoreItem).toBeDefined();
    expect(gitignoreItem?.status).toBe('completed');

    // README check
    const readmeItem = items.find((i) => i.id === 'setup-readme');
    expect(readmeItem).toBeDefined();
    expect(readmeItem?.status).toBe('completed');

    // Tests check
    const testItem = items.find((i) => i.id === 'setup-testing');
    expect(testItem).toBeDefined();
    expect(testItem?.status).toBe('completed');

    // CI check
    const ciItem = items.find((i) => i.id === 'setup-ci');
    expect(ciItem).toBeDefined();
    expect(ciItem?.status).toBe('completed');
  });

  it('flags missing setup items as needs_setup with code snippet recipes', () => {
    const emptyFiles: RepoFile[] = [
      {
        path: 'src/app.js',
        name: 'app.js',
        type: 'blob',
        extension: 'js',
        category: 'component',
        content: 'console.log("hello");',
      },
    ];

    const emptyAnalysis: RepoAnalysis = {
      ...mockAnalysis,
      files: emptyFiles,
      categoriesCount: { component: 1, service: 0, api: 0, database: 0, config: 0, test: 0, style: 0, doc: 0, file: 0, folder: 0 },
      metadata: { ...mockMetadata, license: null },
      entryPoints: [],
    };

    const { items, stats } = generateSetupChecklist({
      analysis: emptyAnalysis,
      files: emptyFiles,
      databaseSchema: null,
      securityFindings: [],
      dependencies: [],
    });

    expect(stats.needsSetupCount).toBeGreaterThan(0);

    const gitignoreItem = items.find((i) => i.id === 'setup-gitignore');
    expect(gitignoreItem?.status).toBe('needs_setup');
    expect(gitignoreItem?.codeSnippet).toBeDefined();
    expect(gitignoreItem?.codeSnippet?.code).toContain('node_modules');

    const readmeItem = items.find((i) => i.id === 'setup-readme');
    expect(readmeItem?.status).toBe('needs_setup');

    const testItem = items.find((i) => i.id === 'setup-testing');
    expect(testItem?.status).toBe('needs_setup');
  });

  it('filters checklist correctly by status and search query', () => {
    const { items } = generateSetupChecklist({
      analysis: mockAnalysis,
      files: mockFiles,
      databaseSchema: mockSchema,
      securityFindings: [],
      dependencies: mockDependencies,
    });

    const completedOnly = filterChecklist(items, { status: 'completed' });
    expect(completedOnly.every((i) => i.status === 'completed')).toBe(true);

    const searchMatch = filterChecklist(items, { searchQuery: 'gitignore' });
    expect(searchMatch.length).toBeGreaterThan(0);
    expect(searchMatch[0].id).toBe('setup-gitignore');
  });

  it('exports clean markdown checklist without emojis', () => {
    const { items, stats } = generateSetupChecklist({
      analysis: mockAnalysis,
      files: mockFiles,
      databaseSchema: mockSchema,
      securityFindings: [],
      dependencies: mockDependencies,
    });

    const markdown = generateChecklistMarkdown('test-owner/test-repo', items, stats);

    expect(markdown).toContain('# Repository Setup & Standards Checklist: test-owner/test-repo');
    expect(markdown).toContain('## Checklist Overview');
    expect(markdown).not.toMatch(/[\u{1F300}-\u{1F9FF}]/u); // Zero emojis
  });
});
