import {
  RepoAnalysis,
  RepoFile,
  DatabaseSchema,
  SecurityFinding,
  RepoDependency,
  ApiEndpoint,
} from '../types';

export type SuggestionCategory =
  | 'architecture'
  | 'security'
  | 'performance'
  | 'database'
  | 'testing'
  | 'dx'
  | 'positive';

export type SuggestionImpact = 'critical' | 'high' | 'medium' | 'low' | 'positive';
export type SuggestionEffort = 'quick-win' | 'medium' | 'major' | 'none';

export interface CodeSnippet {
  language: string;
  filename?: string;
  code: string;
}

export interface MetricItem {
  label: string;
  value: string | number;
}

export interface CodebaseSuggestion {
  id: string;
  title: string;
  category: SuggestionCategory;
  impact: SuggestionImpact;
  effort: SuggestionEffort;
  type: 'improvement' | 'positive' | 'warning' | 'info';
  summary: string;
  detailedExplanation: string;
  affectedFiles: string[];
  actionText?: string;
  actionFile?: string;
  codeSnippet?: CodeSnippet;
  agentPrompt?: string;
  metrics?: MetricItem[];
  tags: string[];
}

export interface SuggestionStats {
  total: number;
  byCategory: Record<SuggestionCategory, number>;
  byImpact: Record<SuggestionImpact, number>;
  highPriorityCount: number;
  quickWinsCount: number;
  positiveCount: number;
  overallScore: number;
}

export interface SuggestionsResult {
  suggestions: CodebaseSuggestion[];
  stats: SuggestionStats;
}

/**
 * Deterministic Engine that analyzes repository AST, file structure, dependencies,
 * database schema, security findings, and API endpoints to produce actionable insights.
 */
export function generateCodebaseSuggestions(params: {
  analysis: RepoAnalysis;
  files: RepoFile[];
  fileContents?: Map<string, string>;
  databaseSchema?: DatabaseSchema | null;
  securityFindings?: SecurityFinding[];
  dependencies?: RepoDependency[];
  apiRoutes?: ApiEndpoint[];
}): SuggestionsResult {
  const {
    analysis,
    files,
    fileContents = new Map(),
    databaseSchema = null,
    securityFindings = [],
    dependencies = [],
    apiRoutes = [],
  } = params;

  const suggestions: CodebaseSuggestion[] = [];
  const repoName = analysis.metadata?.fullName || 'Project';

  // Helper to safely get file content
  const getFileContent = (path: string): string => {
    return fileContents.get(path) || files.find((f) => f.path === path)?.content || '';
  };

  const sourceFiles = files.filter(
    (f) => f.type === 'blob' && !/\.(png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot|lock|map)$/i.test(f.path)
  );
  const totalSourceCount = Math.max(1, sourceFiles.length);

  // =========================================================================
  // 1. ARCHITECTURE & MODULAR DESIGN
  // =========================================================================

  // A. Monolithic Hotspots (Files exceeding 350 LOC)
  const largeFiles: { path: string; lines: number }[] = [];
  for (const file of sourceFiles) {
    const content = getFileContent(file.path);
    const lineCount = content ? content.split('\n').length : file.size ? Math.round(file.size / 38) : 0;
    if (lineCount > 350 && !file.path.includes('node_modules') && !file.path.includes('dist') && !file.path.endsWith('.json')) {
      largeFiles.push({ path: file.path, lines: lineCount });
    }
  }

  if (largeFiles.length > 0) {
    largeFiles.sort((a, b) => b.lines - a.lines);
    const topFiles = largeFiles.slice(0, 4);
    suggestions.push({
      id: 'arch-monolithic-hotspots',
      title: `Decompose ${largeFiles.length} Monolithic File Hotspots (>350 LOC)`,
      category: 'architecture',
      impact: largeFiles.length >= 3 ? 'high' : 'medium',
      effort: 'medium',
      type: 'improvement',
      summary: `Detected ${largeFiles.length} source file(s) exceeding 350 lines of code. Large single files increase cognitive load, elevate merge conflict frequency, and complicate unit testing.`,
      detailedExplanation: `In clean architecture, components and modules should adhere to the Single Responsibility Principle (SRP). Breaking oversized files into dedicated custom hooks, atomic UI components, and domain services isolates state logic and simplifies automated test authoring.`,
      affectedFiles: topFiles.map((f) => f.path),
      actionText: 'View Top Hotspot',
      actionFile: topFiles[0]?.path,
      metrics: [
        { label: 'Hotspot Files', value: largeFiles.length },
        { label: 'Largest File', value: `${topFiles[0]?.path.split('/').pop()} (${topFiles[0]?.lines} LOC)` },
        { label: 'Recommended Limit', value: '350 LOC' },
      ],
      tags: ['refactoring', 'modularity', 'srp', 'clean-code'],
      agentPrompt: `Refactor the large file \`${topFiles[0]?.path}\` (${topFiles[0]?.lines} lines) in \`${repoName}\`.
1. Identify distinct concerns (state management, UI presentation, API querying, data transformation).
2. Extract business logic into dedicated custom hooks or service functions.
3. Split complex sub-views into separate child components.
4. Ensure all unit tests pass without regression.`,
      codeSnippet: {
        language: 'typescript',
        filename: 'Recommended Refactoring Pattern',
        code: `// Before: Monolithic 600-line Component with intertwined state, data fetching, and rendering
// export function MonolithicView() { ... 600 lines ... }

// After: Decomposed modular architecture
// 1. Hook for state & data logic
export function useFeatureLogic() {
  // state, queries, side-effects
  return { state, handlers };
}

// 2. Focused presentation component
export function FeatureView() {
  const { state, handlers } = useFeatureLogic();
  return <FeatureLayout data={state} onAction={handlers.onAction} />;
}`,
      },
    });
  } else {
    suggestions.push({
      id: 'arch-clean-modularity',
      title: 'Balanced File Size & Modular Structure',
      category: 'architecture',
      impact: 'positive',
      effort: 'none',
      type: 'positive',
      summary: 'All source files maintain a manageable line count under 350 LOC, demonstrating good modular decomposition and component isolation.',
      detailedExplanation: 'Keeping source files concise reduces cognitive complexity and improves code review velocity across distributed teams.',
      affectedFiles: sourceFiles.slice(0, 3).map((f) => f.path),
      tags: ['clean-architecture', 'modularity'],
      metrics: [
        { label: 'Max File Size', value: '< 350 LOC' },
        { label: 'Total Files', value: totalSourceCount },
      ],
    });
  }

  // B. Service Layer Separation vs Direct UI Data Fetching
  const uiFiles = sourceFiles.filter((f) => f.category === 'component' || /\.(tsx|jsx|vue|svelte)$/i.test(f.path));
  const serviceFiles = sourceFiles.filter((f) => f.category === 'service' || /services|repositories|api|client/i.test(f.path));

  const uiWithDirectFetch: string[] = [];
  for (const uiFile of uiFiles) {
    const content = getFileContent(uiFile.path);
    if (/(\bfetch\(|axios\.(get|post|put|delete)|supabase\.from\(|useQuery\(|useMutation\()/i.test(content) && !/import.*from.*(services|api|client)/i.test(content)) {
      uiWithDirectFetch.push(uiFile.path);
    }
  }

  if (uiWithDirectFetch.length > 2 && serviceFiles.length === 0) {
    suggestions.push({
      id: 'arch-service-layer-abstraction',
      title: 'Introduce Centralized API & Service Layer Abstraction',
      category: 'architecture',
      impact: 'medium',
      effort: 'medium',
      type: 'improvement',
      summary: `Found ${uiWithDirectFetch.length} UI components invoking network calls or database clients directly without an intermediary service layer.`,
      detailedExplanation: `Direct network requests in presentation components couple UI to backend endpoint contracts. Abstracting requests into dedicated service modules (e.g. \`src/services/\` or \`src/api/\`) makes endpoints reusable, centralized for error handling, and easy to mock in unit tests.`,
      affectedFiles: uiWithDirectFetch.slice(0, 4),
      actionText: 'View Component',
      actionFile: uiWithDirectFetch[0],
      tags: ['clean-architecture', 'api-client', 'separation-of-concerns'],
      metrics: [
        { label: 'Direct Fetch Components', value: uiWithDirectFetch.length },
        { label: 'Dedicated Services', value: serviceFiles.length },
      ],
      agentPrompt: `Create a clean service layer abstraction for \`${repoName}\`.
1. Create \`src/services/apiClient.ts\` with a typed HTTP or backend client.
2. Refactor components in \`${uiWithDirectFetch.slice(0, 3).join(', ')}\` to import typed service methods rather than calling \`fetch\` or backend APIs directly.
3. Centralize error interceptors and response parsing.`,
      codeSnippet: {
        language: 'typescript',
        filename: 'src/services/dataService.ts',
        code: `// Dedicated service abstraction
import { apiClient } from './apiClient';

export interface ItemPayload {
  id: string;
  name: string;
}

export const DataService = {
  async fetchItems(): Promise<ItemPayload[]> {
    const response = await apiClient.get<ItemPayload[]>('/api/items');
    return response.data;
  },
  async updateItem(id: string, updates: Partial<ItemPayload>): Promise<ItemPayload> {
    const response = await apiClient.patch<ItemPayload>(\`/api/items/\${id}\`, updates);
    return response.data;
  }
};`,
      },
    });
  } else if (serviceFiles.length > 0) {
    suggestions.push({
      id: 'arch-service-layer-present',
      title: `Dedicated Service & Data Layer Detected (${serviceFiles.length} modules)`,
      category: 'architecture',
      impact: 'positive',
      effort: 'none',
      type: 'positive',
      summary: 'The repository leverages dedicated service or repository modules, isolating presentation logic from data access.',
      detailedExplanation: 'This pattern adheres to Clean Architecture guidelines and simplifies mock creation during automated integration testing.',
      affectedFiles: serviceFiles.slice(0, 4).map((f) => f.path),
      tags: ['clean-architecture', 'services'],
      metrics: [
        { label: 'Service Modules', value: serviceFiles.length },
        { label: 'UI Components', value: uiFiles.length },
      ],
    });
  }

  // C. Application Entry Point Check
  if (analysis.entryPoints && analysis.entryPoints.length > 0) {
    suggestions.push({
      id: 'arch-entry-point-detected',
      title: `Clear Application Entry Point: ${analysis.entryPoints[0]}`,
      category: 'architecture',
      impact: 'positive',
      effort: 'none',
      type: 'positive',
      summary: `Standard application bootstrap lifecycle detected at \`${analysis.entryPoints[0]}\`.`,
      detailedExplanation: 'A well-defined bootstrap entry point ensures predictable initialization of providers, routers, and global telemetry.',
      affectedFiles: [analysis.entryPoints[0]],
      actionText: 'Open Entry Point',
      actionFile: analysis.entryPoints[0],
      tags: ['bootstrap', 'entry-point'],
    });
  }

  // =========================================================================
  // 2. SECURITY, SECRETS & DEFENSIVE CODING
  // =========================================================================

  // A. Real Security Findings from AST Security Scanner
  if (securityFindings.length > 0) {
    const criticals = securityFindings.filter((f) => f.severity === 'critical');
    const highs = securityFindings.filter((f) => f.severity === 'high');
    const mediums = securityFindings.filter((f) => f.severity === 'medium');

    const topFinding = criticals[0] || highs[0] || mediums[0] || securityFindings[0];

    suggestions.push({
      id: 'sec-vulnerabilities-remediation',
      title: `Remediate ${securityFindings.length} Security Finding(s) (${criticals.length} Critical, ${highs.length} High)`,
      category: 'security',
      impact: criticals.length > 0 ? 'critical' : highs.length > 0 ? 'high' : 'medium',
      effort: 'quick-win',
      type: 'warning',
      summary: `Static AST security analysis identified ${securityFindings.length} issue(s) including potential token leaks, untrusted input injection, or insecure storage.`,
      detailedExplanation: `Primary finding: "${topFinding.title}" in \`${topFinding.file}:${topFinding.line}\`. ${topFinding.explanation} Remediation: ${topFinding.suggestedAction}`,
      affectedFiles: Array.from(new Set(securityFindings.map((f) => f.file))),
      actionText: 'Inspect Finding File',
      actionFile: topFinding.file,
      metrics: [
        { label: 'Critical Severity', value: criticals.length },
        { label: 'High Severity', value: highs.length },
        { label: 'Medium Severity', value: mediums.length },
      ],
      tags: ['security', 'cwe', 'secrets', 'remediation'],
      agentPrompt: `Remediate the following security finding in \`${repoName}\`:
- File: \`${topFinding.file}\` (line ${topFinding.line})
- Issue: ${topFinding.title}
- Evidence: \`${topFinding.evidence}\`
- Required Fix: ${topFinding.suggestedAction}
Ensure sensitive tokens are loaded from server environment variables and client-side data is sanitized.`,
      codeSnippet: {
        language: 'typescript',
        filename: topFinding.file,
        code: `// Security Best Practice: Use Environment Variables & Safe Storage
// Never commit API keys or private tokens in source code
const apiKey = process.env.API_KEY || import.meta.env.VITE_API_KEY;
if (!apiKey) {
  throw new Error('API_KEY must be provided via environment configuration.');
}`,
      },
    });
  } else {
    suggestions.push({
      id: 'sec-clean-secrets-scan',
      title: 'Zero Hardcoded Secrets or Vulnerabilities Detected',
      category: 'security',
      impact: 'positive',
      effort: 'none',
      type: 'positive',
      summary: 'Static analysis found no plain-text API credentials, hardcoded JWT secrets, or insecure eval statements.',
      detailedExplanation: 'Maintaining clean source code without committed credentials complies with OWASP Top 10 and SAIF standards.',
      affectedFiles: [],
      tags: ['security', 'owasp', 'saif'],
      metrics: [
        { label: 'Secret Leaks', value: 0 },
        { label: 'High Severity Findings', value: 0 },
      ],
    });
  }

  // B. Environment Variable Schema Validation (.env.example & Type-Safe Env)
  const hasEnvExample = files.some((f) => /^\.env(\.example|\.template|\.sample)$/i.test(f.name));
  const hasEnvFile = files.some((f) => /^\.env/i.test(f.name));
  const hasZodOrT3Env = dependencies.some((d) => d.name === 'zod' || d.name === '@t3-oss/env-core' || d.name === '@t3-oss/env-nextjs' || d.name === 'envalid');

  if (!hasEnvExample && (hasEnvFile || sourceFiles.some((f) => /process\.env|import\.meta\.env/i.test(getFileContent(f.path))))) {
    suggestions.push({
      id: 'sec-env-example-template',
      title: 'Commit a Validated .env.example Configuration Template',
      category: 'security',
      impact: 'medium',
      effort: 'quick-win',
      type: 'improvement',
      summary: 'The repository references environment variables but lacks a committed .env.example template file.',
      detailedExplanation: 'Providing an .env.example file with dummy values and explanatory comments accelerates developer onboarding and prevents misconfiguration errors in staging and production CI environments.',
      affectedFiles: ['.env.example'],
      tags: ['dx', 'security', 'environment-variables', 'onboarding'],
      agentPrompt: `Scan \`${repoName}\` for all occurrences of \`process.env\` and \`import.meta.env\`. Create a comprehensive \`.env.example\` file documenting every required variable with descriptive placeholder comments and type hints.`,
      codeSnippet: {
        language: 'bash',
        filename: '.env.example',
        code: `# Server Environment Configuration
PORT=3000
NODE_ENV=development

# Database Connection URI
DATABASE_URL="postgresql://user:password@localhost:5432/mydb?schema=public"

# Authentication & API Keys (Do not commit real keys)
AUTH_SECRET="replace-with-secure-32-char-random-string"
VITE_API_URL="http://localhost:3000"`,
      },
    });
  } else if (hasEnvExample) {
    suggestions.push({
      id: 'sec-env-example-present',
      title: 'Environment Template (.env.example) Committed',
      category: 'security',
      impact: 'positive',
      effort: 'none',
      type: 'positive',
      summary: 'A documented .env.example template is available, facilitating rapid local configuration.',
      detailedExplanation: 'Committed environment templates standardize variable keys across local, preview, and production environments.',
      affectedFiles: ['.env.example'],
      tags: ['dx', 'configuration'],
    });
  }

  // =========================================================================
  // 3. PERFORMANCE, BUNDLE & RUNTIME OPTIMIZATION
  // =========================================================================

  // A. Code Splitting & Dynamic Imports
  const heavyLibraries = ['@xyflow/react', 'monaco-editor', 'shiki', 'chart.js', 'recharts', 'three', 'd3', 'pdfjs-dist'];
  const detectedHeavyLibs = dependencies.filter((d) => heavyLibraries.some((hl) => d.name.includes(hl)));

  const hasLazyImports = sourceFiles.some((f) => /React\.lazy|lazy\(|import\(/i.test(getFileContent(f.path)));

  if (detectedHeavyLibs.length > 0 && !hasLazyImports) {
    suggestions.push({
      id: 'perf-code-splitting-heavy-deps',
      title: `Implement Dynamic Imports for Heavy Libraries (${detectedHeavyLibs.map((d) => d.name).join(', ')})`,
      category: 'performance',
      impact: 'high',
      effort: 'quick-win',
      type: 'improvement',
      summary: `The project bundles heavy third-party dependencies (${detectedHeavyLibs.map((d) => d.name).join(', ')}) synchronously into the main bundle.`,
      detailedExplanation: `Synchronous bundling of interactive visualization or editing libraries inflates initial JavaScript payload size, degrading Largest Contentful Paint (LCP) and Interaction to Next Paint (INP). Using \`React.lazy()\` or dynamic \`import()\` defers parsing until the user opens the relevant view.`,
      affectedFiles: detectedHeavyLibs.flatMap((d) => d.usedInFiles || []).slice(0, 3),
      tags: ['performance', 'bundle-size', 'code-splitting', 'cwv'],
      metrics: [
        { label: 'Heavy Dependencies', value: detectedHeavyLibs.length },
        { label: 'Lazy Splitting', value: 'Not Configured' },
      ],
      agentPrompt: `Audit bundle entry points in \`${repoName}\`. Wrap views importing ${detectedHeavyLibs.map((d) => d.name).join(', ')} with \`React.lazy()\` and \`<Suspense fallback={<LoadingSpinner />}>\` to achieve route-level code splitting and reduce initial asset payload.`,
      codeSnippet: {
        language: 'typescript',
        filename: 'src/App.tsx',
        code: `// Before: Heavy synchronous import
// import { HeavyInteractiveView } from './components/HeavyInteractiveView';

// After: Dynamic Code Splitting with Suspense
import React, { Suspense, lazy } from 'react';

const HeavyInteractiveView = lazy(() => import('./components/HeavyInteractiveView'));

export function App() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-zinc-500 font-mono text-xs">Loading module...</div>}>
      <HeavyInteractiveView />
    </Suspense>
  );
}`,
      },
    });
  } else if (hasLazyImports) {
    suggestions.push({
      id: 'perf-lazy-loading-active',
      title: 'Dynamic Code Splitting & Lazy Loading Active',
      category: 'performance',
      impact: 'positive',
      effort: 'none',
      type: 'positive',
      summary: 'Dynamic imports (React.lazy / import()) are active across components, optimizing initial browser bundle delivery.',
      detailedExplanation: 'Lazy-loaded chunks ensure faster page loads and improved Core Web Vitals across low-bandwidth network environments.',
      affectedFiles: sourceFiles.filter((f) => /React\.lazy|lazy\(/i.test(getFileContent(f.path))).map((f) => f.path).slice(0, 3),
      tags: ['performance', 'lazy-loading'],
    });
  }

  // =========================================================================
  // 4. DATABASE & DATA ARCHITECTURE
  // =========================================================================

  if (databaseSchema && databaseSchema.tables && databaseSchema.tables.length > 0) {
    const tables = databaseSchema.tables;
    const missingPkTables = tables.filter((t) => !t.columns.some((c) => c.isPrimary));
    const relationships = databaseSchema.relationships || [];

    // Check PK completeness
    if (missingPkTables.length > 0) {
      suggestions.push({
        id: 'db-missing-primary-keys',
        title: `Enforce Primary Keys on ${missingPkTables.length} Database Table(s)`,
        category: 'database',
        impact: 'high',
        effort: 'quick-win',
        type: 'improvement',
        summary: `Tables without explicit primary keys detected: ${missingPkTables.map((t) => t.name).join(', ')}.`,
        detailedExplanation: 'Every relational and document table requires a unique identifier (Primary Key or _id) to guarantee deterministic row addressing, prevent duplicate entries, and support indexed mutations.',
        affectedFiles: missingPkTables.map((t) => t.sourceFile).filter(Boolean),
        actionText: 'View Schema File',
        actionFile: missingPkTables[0]?.sourceFile,
        tags: ['database', 'primary-keys', 'referential-integrity'],
        agentPrompt: `Add unique Primary Key constraints (e.g. \`id UUID PRIMARY KEY DEFAULT gen_random_uuid()\` or \`id String @id @default(cuid())\`) to the following database models in \`${repoName}\`: ${missingPkTables.map((t) => t.name).join(', ')}.`,
        codeSnippet: {
          language: 'sql',
          filename: 'schema.sql',
          code: `-- Add primary key constraint to table
ALTER TABLE ${missingPkTables[0]?.name || 'table_name'}
ADD COLUMN id UUID PRIMARY KEY DEFAULT gen_random_uuid();`,
        },
      });
    }

    // Check FK Relationships
    if (relationships.length === 0 && tables.length > 2) {
      suggestions.push({
        id: 'db-foreign-key-constraints',
        title: 'Define Explicit Foreign Key Relations Across Entities',
        category: 'database',
        impact: 'medium',
        effort: 'medium',
        type: 'improvement',
        summary: `Discovered ${tables.length} database entities but zero explicit foreign key relations.`,
        detailedExplanation: 'Explicit foreign key constraints guarantee referential integrity in the database engine, preventing orphaned rows when parent records are updated or deleted.',
        affectedFiles: tables.map((t) => t.sourceFile).filter(Boolean).slice(0, 3),
        tags: ['database', 'foreign-keys', 'integrity'],
        metrics: [
          { label: 'Total Tables', value: tables.length },
          { label: 'Explicit Relations', value: relationships.length },
        ],
        codeSnippet: {
          language: 'prisma',
          filename: 'schema.prisma',
          code: `// Example Prisma Relation
model User {
  id    String @id @default(cuid())
  posts Post[]
}

model Post {
  id       String @id @default(cuid())
  authorId String
  author   User   @relation(fields: [authorId], references: [id], onDelete: Cascade)
}`,
        },
      });
    } else if (relationships.length > 0) {
      suggestions.push({
        id: 'db-relations-intact',
        title: `Relational Integrity Enforced (${relationships.length} relationships across ${tables.length} models)`,
        category: 'database',
        impact: 'positive',
        effort: 'none',
        type: 'positive',
        summary: 'Database schema implements explicit relational foreign keys, ensuring data integrity.',
        detailedExplanation: 'Foreign key constraints prevent orphan records and support efficient JOIN execution across relational engines.',
        affectedFiles: databaseSchema.sourceFiles || [],
        tags: ['database', 'relational-integrity'],
        metrics: [
          { label: 'Database Models', value: tables.length },
          { label: 'Defined Relations', value: relationships.length },
        ],
      });
    }

    // Audit Columns (createdAt / updatedAt)
    const tablesWithoutTimestamps = tables.filter(
      (t) => !t.columns.some((c) => /created_?at|createdAt/i.test(c.name))
    );
    if (tablesWithoutTimestamps.length > 0 && tablesWithoutTimestamps.length < tables.length) {
      suggestions.push({
        id: 'db-audit-timestamps',
        title: `Add Audit Timestamps (createdAt, updatedAt) to ${tablesWithoutTimestamps.length} Models`,
        category: 'database',
        impact: 'low',
        effort: 'quick-win',
        type: 'improvement',
        summary: `Some database models lack standard audit timestamps: ${tablesWithoutTimestamps.slice(0, 3).map((t) => t.name).join(', ')}.`,
        detailedExplanation: 'Tracking creation and modification timestamps provides immutable record lineage and simplifies cache invalidation policies.',
        affectedFiles: tablesWithoutTimestamps.map((t) => t.sourceFile).filter(Boolean).slice(0, 3),
        tags: ['database', 'audit-trail', 'schema-standards'],
      });
    }
  }

  // =========================================================================
  // 5. TESTING, QUALITY ASSURANCE & RELIABILITY
  // =========================================================================

  const testFileCount = analysis.categoriesCount?.test || 0;
  const testRatio = testFileCount / totalSourceCount;

  if (testFileCount === 0) {
    suggestions.push({
      id: 'test-zero-coverage',
      title: 'Establish Automated Unit & Integration Test Suite',
      category: 'testing',
      impact: 'high',
      effort: 'medium',
      type: 'improvement',
      summary: 'No automated test files (.test.ts, .spec.ts, or tests/) were found in the codebase.',
      detailedExplanation: 'Without automated unit tests, regressions can easily slip into production deployments. Configuring Vitest or Jest enables fast, localized test execution that catches logic breaks immediately.',
      affectedFiles: ['vitest.config.ts'],
      tags: ['testing', 'vitest', 'qa', 'reliability'],
      metrics: [
        { label: 'Test Files', value: 0 },
        { label: 'Source Files', value: totalSourceCount },
        { label: 'Recommended Ratio', value: '>= 20%' },
      ],
      agentPrompt: `Set up Vitest in \`${repoName}\`.
1. Install \`vitest\` and \`@testing-library/react\` (if UI).
2. Create \`vitest.config.ts\`.
3. Add initial unit tests for critical domain services and utility functions.
4. Add \`"test": "vitest run"\` script to package.json.`,
      codeSnippet: {
        language: 'typescript',
        filename: 'tests/coreService.test.ts',
        code: `import { describe, it, expect } from 'vitest';
import { calculateHealthScore } from '../src/services/health';

describe('Health Calculation Engine', () => {
  it('returns maximum score for clean repository input', () => {
    const result = calculateHealthScore({ files: 50, issues: 0 });
    expect(result).toBe(100);
  });
});`,
      },
    });
  } else if (testRatio < 0.1) {
    suggestions.push({
      id: 'test-low-coverage',
      title: `Expand Automated Test Coverage (Currently ${testFileCount} test files, ${(testRatio * 100).toFixed(0)}% ratio)`,
      category: 'testing',
      impact: 'medium',
      effort: 'medium',
      type: 'improvement',
      summary: `Test files account for only ${(testRatio * 100).toFixed(0)}% of source code. Increase coverage for core business logic and API endpoints.`,
      detailedExplanation: 'Aim for at least 20-30% test-to-source ratio, prioritizing regression test coverage for parser services and database operations.',
      affectedFiles: sourceFiles.filter((f) => f.category === 'test').map((f) => f.path).slice(0, 3),
      tags: ['testing', 'vitest', 'regression-testing'],
      metrics: [
        { label: 'Test Files', value: testFileCount },
        { label: 'Test Ratio', value: `${(testRatio * 100).toFixed(1)}%` },
      ],
    });
  } else {
    suggestions.push({
      id: 'test-strong-coverage',
      title: `Comprehensive Automated Test Suite (${testFileCount} test files)`,
      category: 'testing',
      impact: 'positive',
      effort: 'none',
      type: 'positive',
      summary: `Automated test coverage is well-established across ${testFileCount} test files (${(testRatio * 100).toFixed(0)}% of source files).`,
      detailedExplanation: 'Continuous automated testing ensures high stability and confidence during refactoring and feature additions.',
      affectedFiles: sourceFiles.filter((f) => f.category === 'test').map((f) => f.path).slice(0, 4),
      tags: ['testing', 'vitest', 'qa-excellence'],
      metrics: [
        { label: 'Test Files', value: testFileCount },
        { label: 'Test Ratio', value: `${(testRatio * 100).toFixed(1)}%` },
      ],
    });
  }

  // Error Boundary Check
  const hasErrorBoundary = sourceFiles.some((f) => /ErrorBoundary|componentDidCatch/i.test(getFileContent(f.path)));
  if (!hasErrorBoundary && uiFiles.length > 5) {
    suggestions.push({
      id: 'test-react-error-boundary',
      title: 'Wrap Application Workspace in React Error Boundary',
      category: 'testing',
      impact: 'medium',
      effort: 'quick-win',
      type: 'improvement',
      summary: 'No React ErrorBoundary found in client view hierarchy.',
      detailedExplanation: 'An unhandled render exception in a subcomponent can cause the entire browser viewport to crash to a blank screen. An Error Boundary gracefully catches render faults and renders a fallback recovery UI.',
      affectedFiles: ['src/components/common/ErrorBoundary.tsx'],
      tags: ['reliability', 'error-handling', 'react'],
      codeSnippet: {
        language: 'typescript',
        filename: 'src/components/common/ErrorBoundary.tsx',
        code: `import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI Render Error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-6 bg-zinc-50 border border-zinc-200 rounded-xl text-center space-y-2">
          <p className="text-sm font-bold text-zinc-950">Component Encountered an Error</p>
          <p className="text-xs text-zinc-600">{this.state.error?.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}`,
      },
    });
  }

  // =========================================================================
  // 6. DEVELOPER EXPERIENCE (DX), TOOLING & STANDARDS
  // =========================================================================

  // A. Documentation (README.md)
  const readmeFile = files.find((f) => /readme\.md$/i.test(f.path));
  if (!readmeFile) {
    suggestions.push({
      id: 'dx-missing-readme',
      title: 'Add a Comprehensive Root README.md Guide',
      category: 'dx',
      impact: 'high',
      effort: 'quick-win',
      type: 'improvement',
      summary: 'No README.md documentation found at the root of the repository.',
      detailedExplanation: 'A well-structured README outlines project mission, quickstart instructions, environment setup, architecture highlights, and contribution guidelines.',
      affectedFiles: ['README.md'],
      tags: ['dx', 'documentation', 'onboarding'],
      agentPrompt: `Generate a comprehensive, editorial README.md for \`${repoName}\` containing Overview, Key Features, Architecture Diagram, Prerequisites, Local Setup Guide, and License sections.`,
    });
  } else {
    suggestions.push({
      id: 'dx-readme-present',
      title: 'Root Documentation Available (README.md)',
      category: 'dx',
      impact: 'positive',
      effort: 'none',
      type: 'positive',
      summary: 'The repository provides root documentation for quick developer onboarding.',
      detailedExplanation: 'Committed project documentation provides clear setup commands and contribution instructions.',
      affectedFiles: [readmeFile.path],
      actionText: 'Open README',
      actionFile: readmeFile.path,
      tags: ['dx', 'documentation'],
    });
  }

  // B. Continuous Integration (CI/CD)
  const hasCI = files.some((f) => /^\.github\/workflows\/|\.gitlab-ci\.yml|\.circleci\//i.test(f.path));
  if (!hasCI) {
    suggestions.push({
      id: 'dx-ci-pipeline-setup',
      title: 'Configure Automated CI Pipeline (GitHub Actions)',
      category: 'dx',
      impact: 'medium',
      effort: 'quick-win',
      type: 'improvement',
      summary: 'No CI/CD workflow configuration (.github/workflows) detected in the repository.',
      detailedExplanation: 'Automated CI pipelines validate TypeScript compilation, run automated test suites, and execute linter checks on every Pull Request before merging.',
      affectedFiles: ['.github/workflows/ci.yml'],
      tags: ['dx', 'ci-cd', 'github-actions', 'automation'],
      agentPrompt: `Create a GitHub Actions CI workflow in \`.github/workflows/ci.yml\` for \`${repoName}\` that runs on push and pull_request to main. Include steps for checkout, Node.js setup with caching, \`npm ci\`, \`npm run build\`, and \`npx vitest run\`.`,
      codeSnippet: {
        language: 'yaml',
        filename: '.github/workflows/ci.yml',
        code: `name: Continuous Integration

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - run: npx vitest run`,
      },
    });
  } else {
    suggestions.push({
      id: 'dx-ci-pipeline-present',
      title: 'Automated CI/CD Workflow Pipeline Configured',
      category: 'dx',
      impact: 'positive',
      effort: 'none',
      type: 'positive',
      summary: 'Continuous Integration workflows (.github/workflows) are active, enforcing automated build and test validation.',
      detailedExplanation: 'Automated pipelines prevent broken builds and broken contracts from reaching the main branch.',
      affectedFiles: files.filter((f) => /^\.github\/workflows\//i.test(f.path)).map((f) => f.path),
      tags: ['dx', 'ci-cd', 'automation'],
    });
  }

  // C. Open Source License
  if (!analysis.metadata?.license) {
    suggestions.push({
      id: 'dx-missing-license',
      title: 'Specify an Open-Source License (MIT / Apache-2.0)',
      category: 'dx',
      impact: 'low',
      effort: 'quick-win',
      type: 'info',
      summary: 'No standard open-source license (e.g. MIT, Apache-2.0) is specified in repository metadata or root files.',
      detailedExplanation: 'Explicit licensing clarifies distribution, contribution, and commercial usage rights for users and downstream organizations.',
      affectedFiles: ['LICENSE'],
      tags: ['dx', 'licensing', 'legal'],
    });
  } else {
    suggestions.push({
      id: 'dx-license-present',
      title: `Licensed Under ${analysis.metadata.license}`,
      category: 'dx',
      impact: 'positive',
      effort: 'none',
      type: 'positive',
      summary: `The repository operates under an explicit ${analysis.metadata.license} license.`,
      detailedExplanation: 'Explicit licensing ensures predictable copyright and usage rights for public and private contributors.',
      affectedFiles: files.filter((f) => /^license/i.test(f.name)).map((f) => f.path),
      tags: ['dx', 'licensing'],
    });
  }

  // =========================================================================
  // STATS CALCULATION
  // =========================================================================

  const byCategory: Record<SuggestionCategory, number> = {
    architecture: 0,
    security: 0,
    performance: 0,
    database: 0,
    testing: 0,
    dx: 0,
    positive: 0,
  };

  const byImpact: Record<SuggestionImpact, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    positive: 0,
  };

  let highPriorityCount = 0;
  let quickWinsCount = 0;
  let positiveCount = 0;

  for (const s of suggestions) {
    byCategory[s.category] = (byCategory[s.category] || 0) + 1;
    byImpact[s.impact] = (byImpact[s.impact] || 0) + 1;

    if (s.impact === 'critical' || s.impact === 'high') {
      highPriorityCount++;
    }
    if (s.effort === 'quick-win') {
      quickWinsCount++;
    }
    if (s.impact === 'positive') {
      positiveCount++;
    }
  }

  // Calculate Overall Health Score
  let score = 95;
  score -= byImpact.critical * 20;
  score -= byImpact.high * 10;
  score -= byImpact.medium * 4;
  score -= byImpact.low * 1;
  score += Math.min(10, positiveCount * 2);
  const overallScore = Math.min(100, Math.max(40, score));

  return {
    suggestions,
    stats: {
      total: suggestions.length,
      byCategory,
      byImpact,
      highPriorityCount,
      quickWinsCount,
      positiveCount,
      overallScore,
    },
  };
}

/**
 * Filter suggestions by category, impact, and search query.
 */
export function filterSuggestions(
  suggestions: CodebaseSuggestion[],
  filters: {
    category?: SuggestionCategory | 'all';
    impact?: SuggestionImpact | 'all';
    searchQuery?: string;
  }
): CodebaseSuggestion[] {
  const { category = 'all', impact = 'all', searchQuery = '' } = filters;
  const q = searchQuery.trim().toLowerCase();

  return suggestions.filter((item) => {
    if (category !== 'all') {
      if (category === 'positive' && item.impact !== 'positive') return false;
      if (category !== 'positive' && item.category !== category) return false;
    }

    if (impact !== 'all' && item.impact !== impact) {
      return false;
    }

    if (q) {
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchSummary = item.summary.toLowerCase().includes(q);
      const matchExplanation = item.detailedExplanation.toLowerCase().includes(q);
      const matchTags = item.tags.some((t) => t.toLowerCase().includes(q));
      const matchFiles = item.affectedFiles.some((f) => f.toLowerCase().includes(q));
      if (!matchTitle && !matchSummary && !matchExplanation && !matchTags && !matchFiles) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Generate formatted Markdown export of all suggestions and action plan.
 */
export function generateSuggestionsMarkdown(
  repoName: string,
  suggestions: CodebaseSuggestion[],
  stats: SuggestionStats
): string {
  const timestamp = new Date().toISOString().split('T')[0];

  let md = `# Codebase Insights & Action Plan: ${repoName}\n\n`;
  md += `**Generated Date:** ${timestamp}  \n`;
  md += `**Overall Codebase Health:** ${stats.overallScore}/100  \n`;
  md += `**Total Suggestions:** ${stats.total} (${stats.highPriorityCount} High Priority, ${stats.quickWinsCount} Quick Wins, ${stats.positiveCount} Positive Patterns)\n\n`;
  md += `---\n\n`;

  md += `## Executive Summary\n\n`;
  md += `| Category | Total Recommendations | High/Critical Priority |\n`;
  md += `| :--- | :--- | :--- |\n`;
  md += `| Architecture & Modularity | ${stats.byCategory.architecture || 0} | ${suggestions.filter((s) => s.category === 'architecture' && (s.impact === 'critical' || s.impact === 'high')).length} |\n`;
  md += `| Security & Secrets | ${stats.byCategory.security || 0} | ${suggestions.filter((s) => s.category === 'security' && (s.impact === 'critical' || s.impact === 'high')).length} |\n`;
  md += `| Performance & Optimization | ${stats.byCategory.performance || 0} | ${suggestions.filter((s) => s.category === 'performance' && (s.impact === 'critical' || s.impact === 'high')).length} |\n`;
  md += `| Database & Entities | ${stats.byCategory.database || 0} | ${suggestions.filter((s) => s.category === 'database' && (s.impact === 'critical' || s.impact === 'high')).length} |\n`;
  md += `| Testing & Reliability | ${stats.byCategory.testing || 0} | ${suggestions.filter((s) => s.category === 'testing' && (s.impact === 'critical' || s.impact === 'high')).length} |\n`;
  md += `| Developer Experience (DX) | ${stats.byCategory.dx || 0} | ${suggestions.filter((s) => s.category === 'dx' && (s.impact === 'critical' || s.impact === 'high')).length} |\n\n`;

  md += `## Detailed Action Items\n\n`;

  suggestions.forEach((s, idx) => {
    md += `### ${idx + 1}. [${s.impact.toUpperCase()}] ${s.title}\n\n`;
    md += `**Category:** ${s.category.toUpperCase()} | **Effort:** ${s.effort.toUpperCase()}\n\n`;
    md += `${s.summary}\n\n`;
    md += `**Detailed Analysis:**  \n${s.detailedExplanation}\n\n`;

    if (s.affectedFiles.length > 0) {
      md += `**Affected Files:**  \n`;
      s.affectedFiles.forEach((f) => {
        md += `- \`${f}\`\n`;
      });
      md += `\n`;
    }

    if (s.codeSnippet) {
      md += `**Recommended Implementation Recipe (\`${s.codeSnippet.filename || 'Example'}\`):**\n\n`;
      md += `\`\`\`${s.codeSnippet.language}\n${s.codeSnippet.code}\n\`\`\`\n\n`;
    }

    if (s.agentPrompt) {
      md += `**AI Agent Execution Prompt (Codex / Antigravity / Claude):**\n\n`;
      md += `> ${s.agentPrompt.split('\n').join('\n> ')}\n\n`;
    }

    md += `---\n\n`;
  });

  return md;
}
