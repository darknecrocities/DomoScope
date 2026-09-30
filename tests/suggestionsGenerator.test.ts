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
      path: 'package-lock.json',
      name: 'package-lock.json',
      type: 'blob',
      extension: 'json',
      category: 'config',
      content: '{"lockfileVersion": 3}',
    },
    {
      path: '.nvmrc',
      name: '.nvmrc',
      type: 'blob',
      extension: '',
      category: 'config',
      content: '20.18.0',
    },
    {
      path: '.editorconfig',
      name: '.editorconfig',
      type: 'blob',
      extension: '',
      category: 'config',
      content: 'root = true\n[*]\nindent_size = 2',
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
      config: 6,
      test: 1,
      style: 0,
      doc: 1,
      file: 0,
      folder: 0,
    },
    languages: { TypeScript: 80, YAML: 10, Markdown: 10 },
    totalFiles: 9,
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

  it('generates standard setup checklist items with checkmark status across domains', () => {
    const { items, stats } = generateSetupChecklist({
      analysis: mockAnalysis,
      files: mockFiles,
      databaseSchema: mockSchema,
      securityFindings: [],
      dependencies: mockDependencies,
    });

    expect(items.length).toBeGreaterThanOrEqual(14);
    expect(stats.total).toBe(items.length);
    expect(stats.completedCount).toBeGreaterThan(0);
    expect(stats.completionPercentage).toBeGreaterThanOrEqual(50);
    expect(stats.byCategory.essential.total).toBeGreaterThan(0);

    // .gitignore check
    const gitignoreItem = items.find((i) => i.id === 'setup-gitignore');
    expect(gitignoreItem).toBeDefined();
    expect(gitignoreItem?.status).toBe('completed');

    // README check
    const readmeItem = items.find((i) => i.id === 'setup-readme');
    expect(readmeItem).toBeDefined();
    expect(readmeItem?.status).toBe('completed');

    // Lockfile check
    const lockfileItem = items.find((i) => i.id === 'setup-lockfile');
    expect(lockfileItem).toBeDefined();
    expect(lockfileItem?.status).toBe('completed');

    // .editorconfig check
    const editorconfigItem = items.find((i) => i.id === 'setup-editorconfig');
    expect(editorconfigItem).toBeDefined();
    expect(editorconfigItem?.status).toBe('completed');

    // .nvmrc check
    const nvmrcItem = items.find((i) => i.id === 'setup-node-version');
    expect(nvmrcItem).toBeDefined();
    expect(nvmrcItem?.status).toBe('completed');

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

    const securityDoc = items.find((i) => i.id === 'setup-security-policy');
    expect(securityDoc?.status).toBe('needs_setup');
  });

  it('filters checklist correctly by status, category, and search query', () => {
    const { items } = generateSetupChecklist({
      analysis: mockAnalysis,
      files: mockFiles,
      databaseSchema: mockSchema,
      securityFindings: [],
      dependencies: mockDependencies,
    });

    const completedOnly = filterChecklist(items, { status: 'completed' });
    expect(completedOnly.every((i) => i.status === 'completed')).toBe(true);

    const essentialOnly = filterChecklist(items, { category: 'essential' });
    expect(essentialOnly.every((i) => i.category === 'essential')).toBe(true);

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

  it('dynamically adapts suggestions for Python repositories without React or main.ts references', () => {
    const pythonFiles: RepoFile[] = [
      {
        path: 'app.py',
        name: 'app.py',
        type: 'blob',
        extension: 'py',
        category: 'service',
        content: 'from fastapi import FastAPI\napp = FastAPI()',
      },
      {
        path: 'requirements.txt',
        name: 'requirements.txt',
        type: 'blob',
        extension: 'txt',
        category: 'config',
        content: 'fastapi==0.110.0\nuvicorn==0.28.0',
      },
    ];

    const pythonAnalysis: RepoAnalysis = {
      ...mockAnalysis,
      metadata: { ...mockMetadata, language: 'Python' },
      files: pythonFiles,
      categoriesCount: { component: 0, service: 1, api: 0, database: 0, config: 1, test: 0, style: 0, doc: 0, file: 0, folder: 0 },
      languages: { Python: 100 },
      entryPoints: [],
    };

    const { items } = generateSetupChecklist({
      analysis: pythonAnalysis,
      files: pythonFiles,
      databaseSchema: null,
      securityFindings: [],
      dependencies: [],
    });

    const entryItem = items.find((i) => i.id === 'setup-entrypoint');
    expect(entryItem).toBeDefined();
    // Must NOT contain main.tsx or main.ts
    expect(entryItem?.targetFiles?.[0]).not.toContain('main.tsx');
    expect(entryItem?.targetFiles?.[0]).toMatch(/main\.py|app\.py/);

    const errorItem = items.find((i) => i.id === 'setup-error-boundary');
    expect(errorItem).toBeDefined();
    expect(errorItem?.title).not.toContain('React');
    expect(errorItem?.title).toContain('Exception Handler');

    const testItem = items.find((i) => i.id === 'setup-testing');
    expect(testItem).toBeDefined();
    expect(testItem?.title).toContain('pytest');

    const typeItem = items.find((i) => i.id === 'setup-typescript');
    expect(typeItem).toBeDefined();
    expect(typeItem?.title).toContain('mypy');
  });

  it('dynamically adapts suggestions for Go repositories with native static type safety and go test', () => {
    const goFiles: RepoFile[] = [
      {
        path: 'go.mod',
        name: 'go.mod',
        type: 'blob',
        extension: 'mod',
        category: 'config',
        content: 'module github.com/test-owner/test-repo\n\ngo 1.22',
      },
      {
        path: 'main.go',
        name: 'main.go',
        type: 'blob',
        extension: 'go',
        category: 'service',
        content: 'package main\nfunc main() {}',
      },
    ];

    const goAnalysis: RepoAnalysis = {
      ...mockAnalysis,
      metadata: { ...mockMetadata, language: 'Go' },
      files: goFiles,
      categoriesCount: { component: 0, service: 1, api: 0, database: 0, config: 1, test: 0, style: 0, doc: 0, file: 0, folder: 0 },
      languages: { Go: 100 },
      entryPoints: ['main.go'],
    };

    const { items } = generateSetupChecklist({
      analysis: goAnalysis,
      files: goFiles,
      databaseSchema: null,
      securityFindings: [],
      dependencies: [],
    });

    const typeItem = items.find((i) => i.id === 'setup-typescript');
    expect(typeItem).toBeDefined();
    expect(typeItem?.status).toBe('completed');
    expect(typeItem?.title).toContain('Static Type Safety (Go');

    const testItem = items.find((i) => i.id === 'setup-testing');
    expect(testItem).toBeDefined();
    expect(testItem?.title).toContain('go test');

    const lintItem = items.find((i) => i.id === 'setup-linting');
    expect(lintItem).toBeDefined();
    expect(lintItem?.title).toContain('golangci-lint');
  });

  it('dynamically adapts suggestions for Flutter repositories without Node dependencies', () => {
    const flutterFiles: RepoFile[] = [
      {
        path: 'pubspec.yaml',
        name: 'pubspec.yaml',
        type: 'blob',
        extension: 'yaml',
        category: 'config',
        content: 'name: flutter_app\nenvironment:\n  sdk: ">=3.0.0 <4.0.0"\ndependencies:\n  flutter:\n    sdk: flutter',
      },
      {
        path: 'lib/main.dart',
        name: 'main.dart',
        type: 'blob',
        extension: 'dart',
        category: 'component',
        content: 'import "package:flutter/material.dart";\nvoid main() => runApp(const MyApp());',
      },
    ];

    const flutterAnalysis: RepoAnalysis = {
      ...mockAnalysis,
      metadata: { ...mockMetadata, language: 'Dart' },
      files: flutterFiles,
      categoriesCount: { component: 1, service: 0, api: 0, database: 0, config: 1, test: 0, style: 0, doc: 0, file: 0, folder: 0 },
      languages: { Dart: 100 },
      entryPoints: ['lib/main.dart'],
    };

    const { items } = generateSetupChecklist({
      analysis: flutterAnalysis,
      files: flutterFiles,
      databaseSchema: null,
      securityFindings: [],
      dependencies: [],
    });

    const entryItem = items.find((i) => i.id === 'setup-entrypoint');
    expect(entryItem?.actionFile).toBe('lib/main.dart');

    const errorItem = items.find((i) => i.id === 'setup-error-boundary');
    expect(errorItem).toBeDefined();
    expect(errorItem?.title).toContain('Flutter');
    expect(errorItem?.title).not.toContain('React');

    const typeItem = items.find((i) => i.id === 'setup-typescript');
    expect(typeItem?.status).toBe('completed');
    expect(typeItem?.title).toContain('Dart');
  });

  it('dynamically adapts suggestions for Express backend APIs with centralized error middleware', () => {
    const expressFiles: RepoFile[] = [
      {
        path: 'package.json',
        name: 'package.json',
        type: 'blob',
        extension: 'json',
        category: 'config',
        content: JSON.stringify({
          name: 'express-api',
          dependencies: { express: '^4.19.0', cors: '^2.8.5' },
          devDependencies: { typescript: '^5.0.0' },
        }),
      },
      {
        path: 'src/server.ts',
        name: 'server.ts',
        type: 'blob',
        extension: 'ts',
        category: 'service',
        content: 'import express from "express";\nconst app = express();\napp.listen(3000);',
      },
    ];

    const expressAnalysis: RepoAnalysis = {
      ...mockAnalysis,
      metadata: { ...mockMetadata, language: 'TypeScript' },
      files: expressFiles,
      categoriesCount: { component: 0, service: 1, api: 0, database: 0, config: 1, test: 0, style: 0, doc: 0, file: 0, folder: 0 },
      languages: { TypeScript: 100 },
      entryPoints: ['src/server.ts'],
    };

    const { items } = generateSetupChecklist({
      analysis: expressAnalysis,
      files: expressFiles,
      databaseSchema: null,
      securityFindings: [],
      dependencies: [{ name: 'express', version: '^4.19.0', isDev: false, ecosystem: 'npm', manifestPath: 'package.json', usedInFiles: [] }],
    });

    const errorItem = items.find((i) => i.id === 'setup-error-boundary');
    expect(errorItem).toBeDefined();
    expect(errorItem?.title).not.toContain('React');
    expect(errorItem?.title).toContain('Centralized Error Handling');
    expect(errorItem?.targetFiles?.[0]).toBe('src/middleware/errorHandler.ts');

    const testItem = items.find((i) => i.id === 'setup-testing');
    expect(testItem).toBeDefined();
    expect(testItem?.codeSnippet?.code).toContain("environment: 'node'");
    expect(testItem?.codeSnippet?.code).not.toContain('jsdom');
  });
});
