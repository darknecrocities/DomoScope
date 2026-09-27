import { describe, it, expect } from 'vitest';
import { generateReverseEngineerSpec } from '../src/services/reverseEngineerGenerator';
import { RepoAnalysis, RepoFile, DatabaseSchema, RepoDependency } from '../src/types';

describe('Reverse Engineer Specification Generator', () => {
  const mockAnalysis: RepoAnalysis = {
    metadata: {
      owner: 'testowner',
      repo: 'testrepo',
      fullName: 'testowner/testrepo',
      defaultBranch: 'main',
      stars: 120,
      forks: 15,
      openIssues: 2,
      language: 'TypeScript',
      description: 'An advanced cloud-native web application.',
      htmlUrl: 'https://github.com/testowner/testrepo',
    },
    totalFiles: 45,
    totalDirs: 8,
    languages: { TypeScript: 35, CSS: 5, JSON: 5 },
    detectedTools: ['React', 'Vite', 'TailwindCSS'],
    entryPoints: ['src/main.tsx'],
    categoriesCount: {
      component: 15,
      service: 8,
      database: 4,
      config: 5,
      style: 3,
      test: 5,
      api: 3,
      documentation: 2,
      asset: 0,
      unknown: 0,
    },
    files: [],
    summary: 'Cloud-native application using Supabase, Cloudflare, and React.',
  };

  const mockFiles: RepoFile[] = Array.from({ length: 40 }, (_, i) => ({
    path: `src/components/Component${i + 1}.tsx`,
    name: `Component${i + 1}.tsx`,
    type: 'blob' as const,
    size: 2048,
    category: 'component' as const,
    complexityScore: 25,
  })).concat([
    {
      path: 'src/services/supabaseClient.ts',
      name: 'supabaseClient.ts',
      type: 'blob' as const,
      size: 1500,
      category: 'service' as const,
      complexityScore: 20,
    },
    {
      path: 'supabase/functions/checkout/index.ts',
      name: 'index.ts',
      type: 'blob' as const,
      size: 1800,
      category: 'api' as const,
      complexityScore: 30,
    },
  ]);

  const mockContents = new Map<string, string>([
    [
      'package.json',
      JSON.stringify({
        dependencies: {
          '@supabase/supabase-js': '^2.39.0',
          wrangler: '^3.0.0',
          react: '^18.2.0',
        },
      }),
    ],
    [
      'src/services/supabaseClient.ts',
      `import { createClient } from '@supabase/supabase-js';\nexport const supabase = createClient('url', 'key');`,
    ],
  ]);

  const mockSchema: DatabaseSchema = {
    tables: Array.from({ length: 10 }, (_, i) => ({
      name: `users_${i + 1}`,
      sourceFile: 'schema.sql',
      schemaType: 'sql' as const,
      columns: [
        { name: 'id', type: 'uuid', isPrimary: true, isNullable: false },
        { name: 'email', type: 'varchar(255)', isPrimary: false, isNullable: false },
        { name: 'created_at', type: 'timestamp', isPrimary: false, isNullable: false },
      ],
    })),
    relationships: [],
  };

  const mockDeps: RepoDependency[] = [
    { name: '@supabase/supabase-js', version: '2.39.0', type: 'prod' },
    { name: 'wrangler', version: '3.0.0', type: 'dev' },
  ];

  it('generates a detailed fullstack blueprint with cloud services and storage', () => {
    const spec = generateReverseEngineerSpec(
      'fullstack',
      'testowner/testrepo',
      mockAnalysis,
      mockFiles,
      mockContents,
      mockSchema,
      mockDeps
    );

    expect(spec).toContain('# Complete Full-Stack Architectural Blueprint: testowner/testrepo');
    expect(spec).toContain('SUPABASE');
    expect(spec).toContain('CLOUDFLARE');
    expect(spec).toContain('10-Phase Step-by-Step Reproduction Blueprint');
    expect(spec.split('\n').length).toBeGreaterThan(100);
  });

  it('generates an AI agent SKILL.md pack', () => {
    const spec = generateReverseEngineerSpec(
      'agent_skill',
      'testowner/testrepo',
      mockAnalysis,
      mockFiles,
      mockContents,
      mockSchema,
      mockDeps
    );

    expect(spec).toContain('name: clone-testowner-testrepo');
    expect(spec).toContain('# AI Agent Engineering Skill Pack');
    expect(spec).toContain('Monochrome Design Discipline');
  });

  it('generates UI/UX design system specification', () => {
    const spec = generateReverseEngineerSpec(
      'ui_ux',
      'testowner/testrepo',
      mockAnalysis,
      mockFiles,
      mockContents,
      mockSchema,
      mockDeps
    );

    expect(spec).toContain('UI/UX & Design System Architecture');
    expect(spec).toContain('Color Palette & Token Scale');
  });

  it('generates database and data models specification with SQL DDL', () => {
    const spec = generateReverseEngineerSpec(
      'database',
      'testowner/testrepo',
      mockAnalysis,
      mockFiles,
      mockContents,
      mockSchema,
      mockDeps
    );

    expect(spec).toContain('Database Schema & Data Models Specification');
    expect(spec).toContain('CREATE TABLE IF NOT EXISTS');
  });
});
