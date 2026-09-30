/**
 * DomoScope Repository Comparison & Dynamic Grading Engine
 *
 * Evaluates and contrasts two software repositories side-by-side across:
 * 1. Architecture & Modularity
 * 2. Codebase Scale & Maintainability
 * 3. Database Modeling & Structure
 * 4. API Surface & Connectivity
 * 5. Security & Secret Hygiene
 * 6. Reverse Engineering & Rebuild Readiness
 *
 * Produces deterministic, non-over-technical insights with zero emojis.
 */

export interface ComparableRepoInput {
  name: string;
  owner?: string;
  repo?: string;
  defaultBranch?: string;
  primaryLanguage?: string;
  primaryFramework?: string;
  secondaryFrameworks?: string[];
  stats: {
    totalFiles: number;
    totalDirs: number;
    totalLines: number;
  };
  dependencies: {
    total: number;
    direct: number;
    dev: number;
    ecosystem?: string;
  };
  database: {
    tablesCount: number;
    relationshipsCount: number;
    detectedTypes: string[];
  };
  apiRoutes: {
    totalCount: number;
    methods: string[];
  };
  security: {
    findingsCount: number;
    criticalCount: number;
    highCount: number;
    secretsCount: number;
  };
  architecture?: {
    nodesCount: number;
    edgesCount: number;
    entryPointsCount: number;
    detectedStyle?: string;
  };
}

export type LetterGrade = 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D';

export interface DimensionScore {
  score: number;
  label: string;
  grade: LetterGrade;
  details: string;
}

export interface RepoGrade {
  overallScore: number;
  letterGrade: LetterGrade;
  summary: string;
  breakdown: {
    architecture: DimensionScore;
    scale: DimensionScore;
    database: DimensionScore;
    apiSurface: DimensionScore;
    security: DimensionScore;
  };
  rebuildReadiness: {
    complexity: 'Low' | 'Moderate' | 'High' | 'Very High';
    estimatedPhases: number;
    architecturePattern: string;
    summary: string;
  };
}

export interface MetricComparison<T = number> {
  baseValue: T;
  compareValue: T;
  delta: number;
  deltaPercent: number;
  winner: 'base' | 'compare' | 'tie';
  displayText: string;
}

export interface ComparisonTakeaway {
  category: 'scale' | 'architecture' | 'database' | 'api' | 'security' | 'readiness';
  title: string;
  description: string;
}

export interface RepoComparisonResult {
  repoA: {
    summary: ComparableRepoInput;
    grade: RepoGrade;
  };
  repoB: {
    summary: ComparableRepoInput;
    grade: RepoGrade;
  };
  metrics: {
    linesOfCode: MetricComparison<number>;
    filesCount: MetricComparison<number>;
    directoriesCount: MetricComparison<number>;
    dependenciesCount: MetricComparison<number>;
    databaseTablesCount: MetricComparison<number>;
    apiRoutesCount: MetricComparison<number>;
    securityRisksCount: MetricComparison<number>;
    healthScore: MetricComparison<number>;
  };
  takeaways: ComparisonTakeaway[];
  generatedAt: string;
}

function calculateLetterGrade(score: number): LetterGrade {
  if (score >= 94) return 'A+';
  if (score >= 88) return 'A';
  if (score >= 82) return 'B+';
  if (score >= 74) return 'B';
  if (score >= 65) return 'C';
  return 'D';
}

/**
 * Dynamically grades a repository across 5 core dimensions
 */
export function gradeRepository(repo: ComparableRepoInput): RepoGrade {
  // 1. Architecture & Modularity (25%)
  let archScore = 85;
  const entryCount = repo.architecture?.entryPointsCount ?? 0;
  if (entryCount > 0) archScore += 5;
  const nodes = repo.architecture?.nodesCount ?? repo.stats.totalFiles;
  const edges = repo.architecture?.edgesCount ?? 0;
  if (nodes > 0 && edges / nodes > 1.2 && edges / nodes < 5.0) {
    archScore += 5; // Healthy module interconnection
  } else if (nodes > 20 && edges === 0) {
    archScore -= 10; // Unconnected or flat structure
  }
  archScore = Math.max(45, Math.min(98, archScore));

  const archDetails =
    archScore >= 90
      ? 'Well-organized directory structure with clearly identified entry points.'
      : archScore >= 80
      ? 'Standard modular structure with consistent component separation.'
      : 'Monolithic or flat layout with opportunities for cleaner separation.';

  // 2. Scale & Maintainability (20%)
  const avgLinesPerFile = repo.stats.totalFiles > 0
    ? Math.round(repo.stats.totalLines / repo.stats.totalFiles)
    : 0;

  let scaleScore = 90;
  if (avgLinesPerFile > 0 && avgLinesPerFile <= 200) {
    scaleScore = 95;
  } else if (avgLinesPerFile <= 400) {
    scaleScore = 88;
  } else if (avgLinesPerFile <= 700) {
    scaleScore = 78;
  } else {
    scaleScore = 65; // Bloated individual files
  }

  // Directory organization check
  const fileToDirRatio = repo.stats.totalDirs > 0
    ? repo.stats.totalFiles / repo.stats.totalDirs
    : repo.stats.totalFiles;
  if (fileToDirRatio > 35) {
    scaleScore -= 8; // Too many files dumped in root or single folders
  }
  scaleScore = Math.max(45, Math.min(98, scaleScore));

  const scaleDetails =
    avgLinesPerFile <= 200
      ? `Lean files averaging ${avgLinesPerFile} lines per file.`
      : `Moderate file sizes averaging ${avgLinesPerFile} lines per file.`;

  // 3. Database Modeling (20%)
  let dbScore = 80;
  const tables = repo.database.tablesCount;
  const rels = repo.database.relationshipsCount;
  if (tables > 0) {
    dbScore = 85;
    if (rels > 0) dbScore += 8;
    if (repo.database.detectedTypes.length > 0) dbScore += 5;
  } else {
    // Non-database project baseline
    dbScore = 82;
  }
  dbScore = Math.max(50, Math.min(98, dbScore));

  const dbDetails =
    tables > 0
      ? `${tables} data entities mapped with ${rels} relationships (${repo.database.detectedTypes.join(', ') || 'Standard Schema'}).`
      : 'Stateless codebase without dedicated persistence models.';

  // 4. API Surface & Connectivity (15%)
  let apiScore = 80;
  const routes = repo.apiRoutes.totalCount;
  const methods = repo.apiRoutes.methods.length;
  if (routes > 0) {
    apiScore = 85;
    if (methods >= 3) apiScore += 10;
    else if (methods >= 1) apiScore += 5;
  } else {
    apiScore = 82; // Client-only or library baseline
  }
  apiScore = Math.max(50, Math.min(98, apiScore));

  const apiDetails =
    routes > 0
      ? `${routes} API endpoints discovered across ${methods} HTTP methods.`
      : 'Front-end or library architecture without standalone REST routes.';

  // 5. Security & Secret Hygiene (20%)
  let secScore = 100;
  secScore -= repo.security.criticalCount * 25;
  secScore -= repo.security.highCount * 15;
  secScore -= (repo.security.findingsCount - repo.security.criticalCount - repo.security.highCount) * 4;
  secScore -= repo.security.secretsCount * 12;
  secScore = Math.max(30, Math.min(100, secScore));

  const secDetails =
    secScore >= 95
      ? 'Zero high-risk issues or leaked credentials detected.'
      : secScore >= 80
      ? `${repo.security.findingsCount} potential security flags identified.`
      : `High-risk security findings (${repo.security.criticalCount} critical, ${repo.security.secretsCount} secrets).`;

  // Compute Overall Weighted Score
  const overall = Math.round(
    archScore * 0.25 +
    scaleScore * 0.20 +
    dbScore * 0.20 +
    apiScore * 0.15 +
    secScore * 0.20
  );

  // Rebuild Readiness & Complexity
  let complexity: 'Low' | 'Moderate' | 'High' | 'Very High' = 'Low';
  let phases = 2;
  const totalLoc = repo.stats.totalLines;

  if (totalLoc > 100000 || tables > 25 || routes > 40) {
    complexity = 'Very High';
    phases = 5;
  } else if (totalLoc > 25000 || tables > 10 || routes > 15) {
    complexity = 'High';
    phases = 4;
  } else if (totalLoc > 5000 || tables > 2 || routes > 4) {
    complexity = 'Moderate';
    phases = 3;
  }

  const detectedStyle = repo.architecture?.detectedStyle ||
    (routes > 10 && tables > 5 ? 'Service-Oriented Architecture' : 'Modular Application');

  const rebuildSummary =
    `Estimated ${complexity.toLowerCase()} rebuild complexity spanning ${phases} structured implementation phases.`;

  return {
    overallScore: overall,
    letterGrade: calculateLetterGrade(overall),
    summary: `Overall repository health rated at ${overall}/100 (${calculateLetterGrade(overall)}).`,
    breakdown: {
      architecture: {
        score: archScore,
        label: 'Architecture & Modularity',
        grade: calculateLetterGrade(archScore),
        details: archDetails,
      },
      scale: {
        score: scaleScore,
        label: 'Code Scale & Maintainability',
        grade: calculateLetterGrade(scaleScore),
        details: scaleDetails,
      },
      database: {
        score: dbScore,
        label: 'Database & Data Models',
        grade: calculateLetterGrade(dbScore),
        details: dbDetails,
      },
      apiSurface: {
        score: apiScore,
        label: 'API Surface & Connectivity',
        grade: calculateLetterGrade(apiScore),
        details: apiDetails,
      },
      security: {
        score: secScore,
        label: 'Security & Secret Hygiene',
        grade: calculateLetterGrade(secScore),
        details: secDetails,
      },
    },
    rebuildReadiness: {
      complexity,
      estimatedPhases: phases,
      architecturePattern: detectedStyle,
      summary: rebuildSummary,
    },
  };
}

function compareMetric(
  base: number,
  compare: number,
  preferHigher: boolean = true
): MetricComparison<number> {
  const delta = compare - base;
  const deltaPercent = base > 0 ? Math.round((delta / base) * 100) : (compare > 0 ? 100 : 0);

  let winner: 'base' | 'compare' | 'tie' = 'tie';
  if (delta !== 0) {
    if (preferHigher) {
      winner = delta > 0 ? 'compare' : 'base';
    } else {
      winner = delta < 0 ? 'compare' : 'base';
    }
  }

  const sign = delta > 0 ? '+' : '';
  const displayText = delta === 0 ? 'Identical' : `${sign}${delta.toLocaleString()} (${sign}${deltaPercent}%)`;

  return {
    baseValue: base,
    compareValue: compare,
    delta,
    deltaPercent,
    winner,
    displayText,
  };
}

/**
 * Generates natural, human-readable takeaways without over-technical jargon
 */
function generateTakeaways(
  repoA: ComparableRepoInput,
  repoB: ComparableRepoInput,
  gradeA: RepoGrade,
  gradeB: RepoGrade
): ComparisonTakeaway[] {
  const takeaways: ComparisonTakeaway[] = [];

  // 1. Scale Comparison
  const locDiff = Math.abs(repoA.stats.totalLines - repoB.stats.totalLines);
  const largerRepo = repoA.stats.totalLines >= repoB.stats.totalLines ? repoA.name : repoB.name;
  const smallerRepo = repoA.stats.totalLines >= repoB.stats.totalLines ? repoB.name : repoA.name;
  const multiplier = Math.max(
    repoA.stats.totalLines,
    repoB.stats.totalLines
  ) / Math.max(1, Math.min(repoA.stats.totalLines, repoB.stats.totalLines));

  takeaways.push({
    category: 'scale',
    title: 'Codebase Volume & Scale',
    description: locDiff > 500
      ? `${largerRepo} is approximately ${multiplier.toFixed(1)}x larger in code volume than ${smallerRepo} (${Math.max(repoA.stats.totalLines, repoB.stats.totalLines).toLocaleString()} vs ${Math.min(repoA.stats.totalLines, repoB.stats.totalLines).toLocaleString()} lines).`
      : `Both repositories are closely matched in code volume (${repoA.stats.totalLines.toLocaleString()} vs ${repoB.stats.totalLines.toLocaleString()} lines).`,
  });

  // 2. Framework & Tech Stack
  const fwA = repoA.primaryFramework || repoA.primaryLanguage || 'Generic';
  const fwB = repoB.primaryFramework || repoB.primaryLanguage || 'Generic';
  takeaways.push({
    category: 'architecture',
    title: 'Framework & Core Stack',
    description: fwA.toLowerCase() === fwB.toLowerCase()
      ? `Both projects share a common technical foundation based on ${fwA}.`
      : `${repoA.name} is built with ${fwA}, whereas ${repoB.name} is powered by ${fwB}.`,
  });

  // 3. Database Modeling
  const tablesA = repoA.database.tablesCount;
  const tablesB = repoB.database.tablesCount;
  takeaways.push({
    category: 'database',
    title: 'Database & Persistence Models',
    description: tablesA > 0 && tablesB > 0
      ? `${repoA.name} maps ${tablesA} entities, while ${repoB.name} defines ${tablesB} entities.`
      : tablesA > 0
      ? `${repoA.name} includes dedicated database schemas (${tablesA} tables), while ${repoB.name} operates without declared persistence models.`
      : tablesB > 0
      ? `${repoB.name} includes dedicated database schemas (${tablesB} tables), while ${repoA.name} operates without declared persistence models.`
      : 'Neither repository defines explicit local database tables or schema declarations.',
  });

  // 4. API Surface
  const routesA = repoA.apiRoutes.totalCount;
  const routesB = repoB.apiRoutes.totalCount;
  takeaways.push({
    category: 'api',
    title: 'API Endpoints & Integration',
    description: routesA > 0 && routesB > 0
      ? `${repoA.name} exposes ${routesA} endpoints, while ${repoB.name} provides ${routesB} endpoints.`
      : routesA > 0
      ? `${repoA.name} functions as an API provider (${routesA} endpoints), whereas ${repoB.name} contains no backend endpoints.`
      : routesB > 0
      ? `${repoB.name} functions as an API provider (${routesB} endpoints), whereas ${repoA.name} contains no backend endpoints.`
      : 'Neither repository declares public HTTP REST routes.',
  });

  // 5. Security Posture
  const secA = repoA.security.findingsCount;
  const secB = repoB.security.findingsCount;
  takeaways.push({
    category: 'security',
    title: 'Security & Secret Hygiene',
    description: secA === 0 && secB === 0
      ? 'Both repositories maintain high security hygiene with zero detected vulnerabilities or leaked secrets.'
      : secA < secB
      ? `${repoA.name} demonstrates a cleaner security posture (${secA} findings vs ${secB} in ${repoB.name}).`
      : secB < secA
      ? `${repoB.name} demonstrates a cleaner security posture (${secB} findings vs ${secA} in ${repoA.name}).`
      : `Both repositories show similar security audit counts (${secA} finding${secA === 1 ? '' : 's'}).`,
  });

  // 6. Rebuild Readiness
  takeaways.push({
    category: 'readiness',
    title: 'Rebuild & Porting Effort',
    description: `${repoA.name} has a ${gradeA.rebuildReadiness.complexity.toLowerCase()} rebuild complexity (${gradeA.rebuildReadiness.estimatedPhases} phases), compared to ${gradeB.rebuildReadiness.complexity.toLowerCase()} for ${repoB.name} (${gradeB.rebuildReadiness.estimatedPhases} phases).`,
  });

  return takeaways;
}

/**
 * Main Comparison Function: Accepts two repositories and produces side-by-side analysis
 */
export function compareRepositories(
  repoA: ComparableRepoInput,
  repoB: ComparableRepoInput
): RepoComparisonResult {
  const gradeA = gradeRepository(repoA);
  const gradeB = gradeRepository(repoB);

  return {
    repoA: { summary: repoA, grade: gradeA },
    repoB: { summary: repoB, grade: gradeB },
    metrics: {
      linesOfCode: compareMetric(repoA.stats.totalLines, repoB.stats.totalLines, false), // less LOC often leaner
      filesCount: compareMetric(repoA.stats.totalFiles, repoB.stats.totalFiles, false),
      directoriesCount: compareMetric(repoA.stats.totalDirs, repoB.stats.totalDirs, false),
      dependenciesCount: compareMetric(repoA.dependencies.total, repoB.dependencies.total, false),
      databaseTablesCount: compareMetric(repoA.database.tablesCount, repoB.database.tablesCount, true),
      apiRoutesCount: compareMetric(repoA.apiRoutes.totalCount, repoB.apiRoutes.totalCount, true),
      securityRisksCount: compareMetric(repoA.security.findingsCount, repoB.security.findingsCount, false),
      healthScore: compareMetric(gradeA.overallScore, gradeB.overallScore, true),
    },
    takeaways: generateTakeaways(repoA, repoB, gradeA, gradeB),
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Generates an exportable Markdown comparison report
 */
export function generateComparisonMarkdown(result: RepoComparisonResult): string {
  const { repoA, repoB, metrics, takeaways } = result;

  return `# DomoScope Repository Comparison Report
Generated: ${new Date(result.generatedAt).toLocaleString()}

## 1. Executive Summary

| Dimension | ${repoA.summary.name} | ${repoB.summary.name} | Status |
|---|---|---|---|
| Overall Grade | ${repoA.grade.letterGrade} (${repoA.grade.overallScore}/100) | ${repoB.grade.letterGrade} (${repoB.grade.overallScore}/100) | ${metrics.healthScore.winner === 'base' ? repoA.summary.name + ' Leads' : metrics.healthScore.winner === 'compare' ? repoB.summary.name + ' Leads' : 'Tied'} |
| Primary Framework | ${repoA.summary.primaryFramework || 'Generic'} | ${repoB.summary.primaryFramework || 'Generic'} | ${repoA.summary.primaryFramework === repoB.summary.primaryFramework ? 'Match' : 'Divergent'} |
| Rebuild Complexity | ${repoA.grade.rebuildReadiness.complexity} (${repoA.grade.rebuildReadiness.estimatedPhases} Phases) | ${repoB.grade.rebuildReadiness.complexity} (${repoB.grade.rebuildReadiness.estimatedPhases} Phases) | - |
| Security Hygiene | ${repoA.grade.breakdown.security.score}/100 | ${repoB.grade.breakdown.security.score}/100 | ${repoA.summary.security.findingsCount <= repoB.summary.security.findingsCount ? repoA.summary.name : repoB.summary.name} |

---

## 2. Key Takeaways & Observations

${takeaways.map((t) => `- **${t.title}**: ${t.description}`).join('\n')}

---

## 3. Detailed Metrics Comparison

| Metric | ${repoA.summary.name} | ${repoB.summary.name} | Difference |
|---|---|---|---|
| Total Lines of Code | ${metrics.linesOfCode.baseValue.toLocaleString()} | ${metrics.linesOfCode.compareValue.toLocaleString()} | ${metrics.linesOfCode.displayText} |
| Total Files | ${metrics.filesCount.baseValue.toLocaleString()} | ${metrics.filesCount.compareValue.toLocaleString()} | ${metrics.filesCount.displayText} |
| Total Directories | ${metrics.directoriesCount.baseValue.toLocaleString()} | ${metrics.directoriesCount.compareValue.toLocaleString()} | ${metrics.directoriesCount.displayText} |
| Third-Party Dependencies | ${metrics.dependenciesCount.baseValue.toLocaleString()} | ${metrics.dependenciesCount.compareValue.toLocaleString()} | ${metrics.dependenciesCount.displayText} |
| Database Entities / Tables | ${metrics.databaseTablesCount.baseValue.toLocaleString()} | ${metrics.databaseTablesCount.compareValue.toLocaleString()} | ${metrics.databaseTablesCount.displayText} |
| Discovered API Endpoints | ${metrics.apiRoutesCount.baseValue.toLocaleString()} | ${metrics.apiRoutesCount.compareValue.toLocaleString()} | ${metrics.apiRoutesCount.displayText} |
| Security Findings | ${metrics.securityRisksCount.baseValue.toLocaleString()} | ${metrics.securityRisksCount.compareValue.toLocaleString()} | ${metrics.securityRisksCount.displayText} |

---

## 4. Grading Breakdown

| Category | ${repoA.summary.name} | ${repoB.summary.name} |
|---|---|---|
| Architecture & Modularity | ${repoA.grade.breakdown.architecture.grade} (${repoA.grade.breakdown.architecture.score}/100) | ${repoB.grade.breakdown.architecture.grade} (${repoB.grade.breakdown.architecture.score}/100) |
| Scale & Maintainability | ${repoA.grade.breakdown.scale.grade} (${repoA.grade.breakdown.scale.score}/100) | ${repoB.grade.breakdown.scale.grade} (${repoB.grade.breakdown.scale.score}/100) |
| Database Architecture | ${repoA.grade.breakdown.database.grade} (${repoA.grade.breakdown.database.score}/100) | ${repoB.grade.breakdown.database.grade} (${repoB.grade.breakdown.database.score}/100) |
| API Connectivity | ${repoA.grade.breakdown.apiSurface.grade} (${repoA.grade.breakdown.apiSurface.score}/100) | ${repoB.grade.breakdown.apiSurface.grade} (${repoB.grade.breakdown.apiSurface.score}/100) |
| Security & Secret Hygiene | ${repoA.grade.breakdown.security.grade} (${repoA.grade.breakdown.security.score}/100) | ${repoB.grade.breakdown.security.grade} (${repoB.grade.breakdown.security.score}/100) |
`;
}

/**
 * Formats comparison result as terminal text for CLI
 */
export function formatComparisonTerminal(result: RepoComparisonResult): string {
  const { repoA, repoB, metrics, takeaways } = result;

  const pad = (str: string, len: number) => (str.length >= len ? str.slice(0, len) : str + ' '.repeat(len - str.length));

  const col1 = 28;
  const col2 = 24;
  const col3 = 24;

  const divider = '='.repeat(col1 + col2 + col3 + 4);
  const subDivider = '-'.repeat(col1 + col2 + col3 + 4);

  const lines = [
    divider,
    'DomoScope Repository Comparison & Architectural Grading',
    divider,
    `${pad('METRIC', col1)}  ${pad(repoA.summary.name, col2)}  ${pad(repoB.summary.name, col3)}`,
    subDivider,
    `${pad('Overall Health Score', col1)}  ${pad(`${repoA.grade.letterGrade} (${repoA.grade.overallScore}/100)`, col2)}  ${pad(`${repoB.grade.letterGrade} (${repoB.grade.overallScore}/100)`, col3)}`,
    `${pad('Primary Framework', col1)}  ${pad(repoA.summary.primaryFramework || 'Generic', col2)}  ${pad(repoB.summary.primaryFramework || 'Generic', col3)}`,
    `${pad('Total Lines of Code', col1)}  ${pad(metrics.linesOfCode.baseValue.toLocaleString(), col2)}  ${pad(metrics.linesOfCode.compareValue.toLocaleString(), col3)}`,
    `${pad('Total Files', col1)}  ${pad(metrics.filesCount.baseValue.toLocaleString(), col2)}  ${pad(metrics.filesCount.compareValue.toLocaleString(), col3)}`,
    `${pad('Dependencies', col1)}  ${pad(metrics.dependenciesCount.baseValue.toLocaleString(), col2)}  ${pad(metrics.dependenciesCount.compareValue.toLocaleString(), col3)}`,
    `${pad('Database Tables', col1)}  ${pad(metrics.databaseTablesCount.baseValue.toLocaleString(), col2)}  ${pad(metrics.databaseTablesCount.compareValue.toLocaleString(), col3)}`,
    `${pad('API Endpoints', col1)}  ${pad(metrics.apiRoutesCount.baseValue.toLocaleString(), col2)}  ${pad(metrics.apiRoutesCount.compareValue.toLocaleString(), col3)}`,
    `${pad('Security Warnings', col1)}  ${pad(metrics.securityRisksCount.baseValue.toLocaleString(), col2)}  ${pad(metrics.securityRisksCount.compareValue.toLocaleString(), col3)}`,
    `${pad('Rebuild Complexity', col1)}  ${pad(repoA.grade.rebuildReadiness.complexity, col2)}  ${pad(repoB.grade.rebuildReadiness.complexity, col3)}`,
    subDivider,
    'KEY TAKEAWAYS & DIVERGENCES',
    subDivider,
    ...takeaways.map((t) => `* ${t.title}: ${t.description}`),
    divider,
  ];

  return lines.join('\n');
}

/**
 * Adapter to convert a LocalAnalysisSnapshot into ComparableRepoInput
 */
export function fromLocalSnapshot(snapshot: any): ComparableRepoInput {
  const securityFindings: any[] = snapshot.securityFindings || [];
  const criticalCount = securityFindings.filter((f) => f.severity === 'critical').length;
  const highCount = securityFindings.filter((f) => f.severity === 'high').length;
  const secretsCount = securityFindings.filter((f) =>
    (f.category || '').toLowerCase().includes('secret') || (f.title || '').toLowerCase().includes('key')
  ).length;

  const apiRoutes = snapshot.apiRoutes || snapshot.apiEndpoints || [];
  const methods = Array.from(new Set(apiRoutes.map((r: any) => (r.method || 'GET').toUpperCase()))) as string[];

  const deps = snapshot.dependencies || [];
  const directDeps = deps.filter((d: any) => !d.isDev).length;
  const devDeps = deps.filter((d: any) => d.isDev).length;

  const totalLines = snapshot.stats?.totalLines ||
    (snapshot.files || []).reduce((acc: number, f: any) => acc + (f.size ? Math.round(f.size / 30) : 50), 0);

  return {
    name: snapshot.projectName || snapshot.metadata?.repo || 'Local Project',
    owner: snapshot.metadata?.owner,
    repo: snapshot.metadata?.repo,
    defaultBranch: snapshot.metadata?.defaultBranch || 'main',
    primaryLanguage: snapshot.metadata?.language || snapshot.frameworks?.primary?.language || 'Polyglot',
    primaryFramework: snapshot.frameworks?.primary?.name || 'Standard Application',
    secondaryFrameworks: (snapshot.frameworks?.secondary || []).map((f: any) => f.name),
    stats: {
      totalFiles: snapshot.stats?.totalFiles || (snapshot.files || []).length,
      totalDirs: snapshot.stats?.totalDirs || 1,
      totalLines,
    },
    dependencies: {
      total: deps.length,
      direct: directDeps,
      dev: devDeps,
      ecosystem: deps[0]?.ecosystem || 'npm',
    },
    database: {
      tablesCount: snapshot.database?.tables?.length || snapshot.databaseSchema?.tables?.length || 0,
      relationshipsCount: snapshot.database?.relationships?.length || snapshot.databaseSchema?.relationships?.length || 0,
      detectedTypes: snapshot.database?.detectedTypes || snapshot.databaseSchema?.detectedTypes || [],
    },
    apiRoutes: {
      totalCount: apiRoutes.length,
      methods,
    },
    security: {
      findingsCount: securityFindings.length,
      criticalCount,
      highCount,
      secretsCount,
    },
    architecture: {
      nodesCount: snapshot.graph?.nodes?.length || snapshot.stats?.totalFiles || 0,
      edgesCount: snapshot.graph?.edges?.length || 0,
      entryPointsCount: snapshot.analysis?.entryPoints?.length || 0,
      detectedStyle: snapshot.reverseEngineer?.fullstack ? 'Service-Oriented' : undefined,
    },
  };
}

/**
 * Adapter to convert workspace analysis state into ComparableRepoInput
 */
export function fromWorkspaceAnalysis(
  name: string,
  analysis: any,
  databaseSchema?: any,
  dependencies: any[] = [],
  securityFindings: any[] = [],
  apiRoutes: any[] = []
): ComparableRepoInput {
  const criticalCount = securityFindings.filter((f) => f.severity === 'critical').length;
  const highCount = securityFindings.filter((f) => f.severity === 'high').length;
  const secretsCount = securityFindings.filter((f) =>
    (f.category || '').toLowerCase().includes('secret') || (f.title || '').toLowerCase().includes('key')
  ).length;

  const methods = Array.from(new Set(apiRoutes.map((r: any) => (r.method || 'GET').toUpperCase()))) as string[];
  const directDeps = dependencies.filter((d: any) => !d.isDev).length;
  const devDeps = dependencies.filter((d: any) => d.isDev).length;

  const totalLines = (analysis.files || []).reduce(
    (acc: number, f: any) => acc + (f.size ? Math.round(f.size / 30) : 50),
    0
  );

  return {
    name,
    owner: analysis.metadata?.owner,
    repo: analysis.metadata?.repo,
    defaultBranch: analysis.metadata?.defaultBranch || 'main',
    primaryLanguage: analysis.metadata?.language || Object.keys(analysis.languages || {})[0] || 'Polyglot',
    primaryFramework: analysis.detectedTools?.[0] || 'Web Application',
    secondaryFrameworks: analysis.detectedTools?.slice(1) || [],
    stats: {
      totalFiles: analysis.totalFiles || (analysis.files || []).length,
      totalDirs: analysis.totalDirs || 1,
      totalLines: totalLines > 0 ? totalLines : 1200,
    },
    dependencies: {
      total: dependencies.length,
      direct: directDeps,
      dev: devDeps,
      ecosystem: dependencies[0]?.ecosystem || 'npm',
    },
    database: {
      tablesCount: databaseSchema?.tables?.length || 0,
      relationshipsCount: databaseSchema?.relationships?.length || 0,
      detectedTypes: databaseSchema?.detectedTypes || [],
    },
    apiRoutes: {
      totalCount: apiRoutes.length,
      methods,
    },
    security: {
      findingsCount: securityFindings.length,
      criticalCount,
      highCount,
      secretsCount,
    },
    architecture: {
      nodesCount: analysis.totalFiles || 0,
      edgesCount: Math.round((analysis.totalFiles || 0) * 1.5),
      entryPointsCount: analysis.entryPoints?.length || 1,
    },
  };
}
