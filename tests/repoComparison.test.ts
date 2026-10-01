import { describe, it, expect } from 'vitest';
import {
  ComparableRepoInput,
  gradeRepository,
  compareRepositories,
  generateComparisonMarkdown,
  formatComparisonTerminal,
  fromWorkspaceAnalysis,
  fromLocalSnapshot,
} from '../src/services/repoComparison';

describe('Repository Comparison & Dynamic Grading Engine', () => {
  const mockRepoA: ComparableRepoInput = {
    name: 'acme/frontend',
    primaryLanguage: 'TypeScript',
    primaryFramework: 'React / Next.js',
    secondaryFrameworks: ['TailwindCSS'],
    stats: {
      totalFiles: 42,
      totalDirs: 8,
      totalLines: 5400,
    },
    dependencies: {
      total: 16,
      direct: 10,
      dev: 6,
      ecosystem: 'npm',
    },
    database: {
      tablesCount: 5,
      relationshipsCount: 4,
      detectedTypes: ['Prisma', 'PostgreSQL'],
    },
    apiRoutes: {
      totalCount: 12,
      methods: ['GET', 'POST'],
    },
    security: {
      findingsCount: 0,
      criticalCount: 0,
      highCount: 0,
      secretsCount: 0,
    },
    architecture: {
      nodesCount: 42,
      edgesCount: 68,
      entryPointsCount: 2,
      detectedStyle: 'Modular Next.js Architecture',
    },
  };

  const mockRepoB: ComparableRepoInput = {
    name: 'acme/legacy-backend',
    primaryLanguage: 'JavaScript',
    primaryFramework: 'Express',
    secondaryFrameworks: ['Mongoose'],
    stats: {
      totalFiles: 120,
      totalDirs: 15,
      totalLines: 32000,
    },
    dependencies: {
      total: 48,
      direct: 35,
      dev: 13,
      ecosystem: 'npm',
    },
    database: {
      tablesCount: 18,
      relationshipsCount: 12,
      detectedTypes: ['MongoDB', 'Mongoose'],
    },
    apiRoutes: {
      totalCount: 34,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
    security: {
      findingsCount: 3,
      criticalCount: 1,
      highCount: 1,
      secretsCount: 1,
    },
    architecture: {
      nodesCount: 120,
      edgesCount: 150,
      entryPointsCount: 1,
      detectedStyle: 'Monolithic Backend',
    },
  };

  describe('Dynamic Grading Engine', () => {
    it('grades a clean, well-structured repository with high marks (A or A+)', () => {
      const grade = gradeRepository(mockRepoA);
      expect(grade.overallScore).toBeGreaterThanOrEqual(85);
      expect(['A+', 'A', 'B+']).toContain(grade.letterGrade);
      expect(grade.breakdown.security.score).toBe(100);
      expect(grade.rebuildReadiness.complexity).toBe('Moderate');
      expect(grade.rebuildReadiness.estimatedPhases).toBe(3);
    });

    it('penalizes repositories with critical security findings and leaked secrets', () => {
      const grade = gradeRepository(mockRepoB);
      expect(grade.breakdown.security.score).toBeLessThanOrEqual(60);
      expect(grade.overallScore).toBeLessThan(gradeRepository(mockRepoA).overallScore);
      expect(grade.rebuildReadiness.complexity).toBe('High');
      expect(grade.rebuildReadiness.estimatedPhases).toBe(4);
    });
  });

  describe('Side-by-Side Comparison & Deltas', () => {
    it('accurately computes metric deltas and directional winners', () => {
      const result = compareRepositories(mockRepoA, mockRepoB);

      // Lines of code (Repo A is leaner than Repo B)
      expect(result.metrics.linesOfCode.baseValue).toBe(5400);
      expect(result.metrics.linesOfCode.compareValue).toBe(32000);
      expect(result.metrics.linesOfCode.delta).toBe(26600);

      // Security (Repo A has fewer risks than Repo B)
      expect(result.metrics.securityRisksCount.winner).toBe('base');

      // Database tables (Repo B has more tables)
      expect(result.metrics.databaseTablesCount.compareValue).toBe(18);
      expect(result.metrics.databaseTablesCount.winner).toBe('compare');
    });

    it('produces accessible, plain-language takeaways without compiler jargon', () => {
      const result = compareRepositories(mockRepoA, mockRepoB);

      expect(result.takeaways.length).toBeGreaterThanOrEqual(4);

      // Check for presence of key takeaway topics
      const titles = result.takeaways.map((t) => t.title);
      expect(titles).toContain('Codebase Volume & Scale');
      expect(titles).toContain('Framework & Core Stack');
      expect(titles).toContain('Security & Secret Hygiene');
      expect(titles).toContain('Rebuild & Porting Effort');

      // Ensure descriptions are human-readable
      const scaleTakeaway = result.takeaways.find((t) => t.category === 'scale');
      expect(scaleTakeaway?.description).toContain('larger in code volume');

      const secTakeaway = result.takeaways.find((t) => t.category === 'security');
      expect(secTakeaway?.description).toContain('cleaner security posture');
    });
  });

  describe('Report Formatting', () => {
    it('generates a clean markdown comparison report with zero emojis', () => {
      const result = compareRepositories(mockRepoA, mockRepoB);
      const markdown = generateComparisonMarkdown(result);

      expect(markdown).toContain('# DomoScope Repository Comparison Report');
      expect(markdown).toContain('acme/frontend');
      expect(markdown).toContain('acme/legacy-backend');
      expect(markdown).toContain('## 1. Executive Summary');
      expect(markdown).toContain('## 2. Key Takeaways & Observations');
      expect(markdown).toContain('## 3. Detailed Metrics Comparison');

      // Strict check: zero emojis in the output
      const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{1FA00}-\u{1FAFF}]/u;
      expect(emojiRegex.test(markdown)).toBe(false);
    });

    it('formats terminal table output properly for CLI usage', () => {
      const result = compareRepositories(mockRepoA, mockRepoB);
      const terminal = formatComparisonTerminal(result);

      expect(terminal).toContain('DomoScope Repository Comparison & Architectural Grading');
      expect(terminal).toContain('Overall Health Score');
      expect(terminal).toContain('KEY TAKEAWAYS & DIVERGENCES');
    });
  });

  describe('Score Quality Diagnostic Rubric & AI Review', () => {
    it('generates 5 detailed pillars with dynamic sub-metrics and benchmarks', () => {
      const result = compareRepositories(mockRepoA, mockRepoB);
      expect(result.pillars).toHaveLength(5);

      const archPillar = result.pillars.find((p) => p.key === 'architecture');
      expect(archPillar).toBeDefined();
      expect(archPillar?.dimA.subMetrics.length).toBe(4);
      expect(archPillar?.dimA.telemetry.nodes).toBe(42);
      expect(archPillar?.verdict).toBeTruthy();

      const secPillar = result.pillars.find((p) => p.key === 'security');
      expect(secPillar?.winner).toBe('base');
      expect(secPillar?.dimA.subMetrics.find((s) => s.id === 'sec-critical')?.score).toBe(100);
      expect(secPillar?.dimB.subMetrics.find((s) => s.id === 'sec-critical')?.score).toBeLessThan(100);
    });

    it('generates comprehensive AI quality review with tradeoffs, agent prompts, and action items', () => {
      const result = compareRepositories(mockRepoA, mockRepoB);
      expect(result.aiReview).toBeDefined();
      expect(result.aiReview.headline).toContain('acme/frontend');
      expect(result.aiReview.architecturalTradeoffs.length).toBeGreaterThanOrEqual(3);
      expect(result.aiReview.agentRebuildFeasibility.agentTaskDelegationPrompt).toContain('Principal Software Architect');
      expect(result.aiReview.keyActionItems.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('State Adapters', () => {
    it('converts workspace analysis state into comparable input', () => {
      const input = fromWorkspaceAnalysis(
        'facebook/react',
        {
          metadata: { owner: 'facebook', repo: 'react', language: 'JavaScript' },
          totalFiles: 50,
          totalDirs: 6,
          detectedTools: ['Rollup', 'Jest'],
          entryPoints: ['src/index.js'],
        },
        { tables: [{ name: 'User' }], relationships: [] },
        [{ name: 'object-assign', isDev: false }],
        [{ id: 'sec-1', severity: 'low', category: 'general' }],
        [{ path: '/api/health', method: 'GET' }]
      );

      expect(input.name).toBe('facebook/react');
      expect(input.stats.totalFiles).toBe(50);
      expect(input.database.tablesCount).toBe(1);
      expect(input.apiRoutes.totalCount).toBe(1);
      expect(input.security.findingsCount).toBe(1);
    });

    it('converts local analysis snapshot into comparable input', () => {
      const input = fromLocalSnapshot({
        projectName: 'local-test',
        metadata: { repo: 'local-test' },
        frameworks: { primary: { name: 'Vite / React' } },
        stats: { totalFiles: 20, totalDirs: 3, totalLines: 1500 },
        dependencies: [{ name: 'react', isDev: false }],
        database: { tables: [], relationships: [] },
        apiRoutes: [],
        securityFindings: [],
      });

      expect(input.name).toBe('local-test');
      expect(input.primaryFramework).toBe('Vite / React');
      expect(input.stats.totalLines).toBe(1500);
      expect(input.security.findingsCount).toBe(0);
    });
  });
});
