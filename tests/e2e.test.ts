import { describe, it, expect } from 'vitest';
import { parseGitHubUrl } from '../src/services/github';
import { analyzeRepository } from '../src/services/analysis';
import { buildArchitectureGraph } from '../src/services/graphBuilder';
import { parseDatabaseFiles } from '../src/services/databaseParser';
import { parseDependencies } from '../src/services/dependencyParser';
import { runSecurityChecks } from '../src/services/securityScanner';
import { WebLLMService } from '../src/services/webLLMService';
import { RepoMetadata, RepoFile } from '../src/types';

describe('End-to-End Application Flow', () => {
  it('successfully processes full repository pipeline', async () => {
    // 1. Submit GitHub URL
    const parsed = parseGitHubUrl('https://github.com/my-org/web-service');
    expect(parsed).toEqual({
      owner: 'my-org',
      repo: 'web-service',
      branch: undefined,
    });

    // 2. Metadata & Files
    const metadata: RepoMetadata = {
      owner: 'my-org',
      repo: 'web-service',
      fullName: 'my-org/web-service',
      description: 'A full-stack TypeScript web application',
      defaultBranch: 'main',
      stars: 120,
      forks: 15,
      watchers: 20,
      openIssues: 3,
      language: 'TypeScript',
      license: 'MIT',
      updatedAt: '2026-09-26T00:00:00Z',
      createdAt: '2025-01-01T00:00:00Z',
      size: 4096,
      isPrivate: false,
      htmlUrl: 'https://github.com/my-org/web-service',
    };

    const files: RepoFile[] = [
      { path: 'package.json', name: 'package.json', type: 'blob', sha: '1', extension: 'json', category: 'config' },
      { path: 'src/main.tsx', name: 'main.tsx', type: 'blob', sha: '2', extension: 'tsx', category: 'component' },
      { path: 'src/App.tsx', name: 'App.tsx', type: 'blob', sha: '3', extension: 'tsx', category: 'component' },
      { path: 'src/services/api.ts', name: 'api.ts', type: 'blob', sha: '4', extension: 'ts', category: 'service' },
      { path: 'prisma/schema.prisma', name: 'schema.prisma', type: 'blob', sha: '5', extension: 'prisma', category: 'database' },
    ];

    const fileContents = new Map<string, string>();
    fileContents.set('package.json', JSON.stringify({ dependencies: { react: '^18.0.0', '@prisma/client': '^5.0.0' } }));
    fileContents.set('src/main.tsx', "import App from './App';");
    fileContents.set('src/App.tsx', "import { fetchUsers } from './services/api';");
    fileContents.set('src/services/api.ts', "export const fetchUsers = () => fetch('/api/users');");
    fileContents.set('prisma/schema.prisma', 'model User { id Int @id, email String @unique }');

    // 3. Analyze repository
    const analysis = analyzeRepository(metadata, files);
    expect(analysis.detectedTools).toContain('React');
    expect(analysis.detectedTools).toContain('TypeScript');
    expect(analysis.detectedTools).toContain('Prisma');
    expect(analysis.entryPoints).toContain('src/main.tsx');

    // 4. Graph Generation
    const graph = buildArchitectureGraph(files, fileContents);
    expect(graph.nodes.length).toBeGreaterThan(0);
    expect(graph.edges.length).toBeGreaterThan(0);

    // 5. Database ERD Extraction
    const schema = parseDatabaseFiles([{ path: 'prisma/schema.prisma', content: fileContents.get('prisma/schema.prisma')! }]);
    expect(schema.tables.length).toBe(1);
    expect(schema.tables[0].name).toBe('User');

    // 6. Dependencies Parsing
    const deps = parseDependencies([{ path: 'package.json', content: fileContents.get('package.json')! }], []);
    expect(deps.length).toBe(2);

    // 7. Security Scanner
    const findings = runSecurityChecks([{ path: 'src/main.tsx', content: fileContents.get('src/main.tsx')! }]);
    expect(findings.length).toBe(0);

    // 8. Ask Assistant Grounded Answer
    const answer = await WebLLMService.askQuestion('Where does the app start?', analysis, files, fileContents);
    expect(answer.text).toContain('src/main.tsx');
    expect(answer.referencedFiles).toContain('src/main.tsx');
  });
});
