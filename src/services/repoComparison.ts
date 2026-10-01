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

export interface SubMetricScore {
  id: string;
  name: string;
  weight: number; // percentage e.g. 25
  score: number; // 0-100
  status: 'optimal' | 'moderate' | 'warning';
  observation: string;
  benchmark: string;
}

export interface DimensionScore {
  score: number;
  label: string;
  grade: LetterGrade;
  details: string;
  subMetrics: SubMetricScore[];
  telemetry: Record<string, string | number>;
  recommendations: string[];
}

export interface PillarComparison {
  key: 'architecture' | 'scale' | 'database' | 'apiSurface' | 'security';
  title: string;
  weight: number;
  dimA: DimensionScore;
  dimB: DimensionScore;
  deltaScore: number;
  winner: 'base' | 'compare' | 'tie';
  verdict: string;
  comparativeObservations: string[];
}

export interface AiQualityTradeoff {
  title: string;
  description: string;
  recommendation: string;
}

export interface AiActionItem {
  priority: 'high' | 'medium' | 'low';
  targetRepo: string;
  action: string;
  expectedImpact: string;
}

export interface AiQualityReview {
  headline: string;
  executiveSummary: string;
  architecturalTradeoffs: AiQualityTradeoff[];
  maintainabilityDebtAssessment: string;
  databaseIntegrityComparison: string;
  apiSurfaceCritique: string;
  securityHygieneVerdict: string;
  agentRebuildFeasibility: {
    recommendedStrategy: string;
    complexityEstimate: string;
    estimatedPhasesCount: number;
    agentTaskDelegationPrompt: string;
  };
  keyActionItems: AiActionItem[];
  generatedAt: string;
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
  pillars: PillarComparison[];
  aiReview: AiQualityReview;
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

  // Dynamic Sub-metrics for Architecture
  const archDensity = nodes > 0 ? edges / nodes : 0;
  const hierarchyScore = Math.max(60, Math.min(99, Math.round(100 - Math.abs(fileToDirRatio - 8.5) * 1.5)));
  const entryScore = entryCount === 0 ? 68 : entryCount === 1 ? 92 : entryCount <= 4 ? Math.min(98, 92 + entryCount * 2) : 96;
  const couplingScore = archDensity === 0
    ? 70
    : archDensity >= 1.0 && archDensity <= 3.5
    ? Math.max(75, Math.min(99, Math.round(98 - Math.abs(archDensity - 2.0) * 4)))
    : Math.max(60, Math.min(90, Math.round(90 - Math.abs(archDensity - 2.5) * 6)));
  const frameworkScore = repo.primaryFramework ? Math.min(98, 90 + Math.min(8, (repo.secondaryFrameworks?.length || 0) * 2)) : 80;

  const archSubMetrics: SubMetricScore[] = [
    {
      id: 'arch-hierarchy',
      name: 'Directory Hierarchy & Nesting',
      weight: 25,
      score: hierarchyScore,
      status: fileToDirRatio <= 15 ? 'optimal' : fileToDirRatio <= 30 ? 'moderate' : 'warning',
      observation: `Directory partitioning ratio of ${fileToDirRatio.toFixed(1)} files per directory across ${repo.stats.totalDirs} directories.`,
      benchmark: 'Target: 4 to 15 files per directory for clean component isolation.',
    },
    {
      id: 'arch-entry',
      name: 'Entry Point Discoverability',
      weight: 25,
      score: entryScore,
      status: entryCount >= 1 ? 'optimal' : 'warning',
      observation: entryCount > 0
        ? `Identified ${entryCount} primary execution entry point${entryCount === 1 ? '' : 's'}.`
        : 'No standardized entry points detected in root or source directory.',
      benchmark: 'Target: Explicit entry point declarations (e.g. main, index, app, server).',
    },
    {
      id: 'arch-coupling',
      name: 'Import Graph Coupling & Density',
      weight: 25,
      score: couplingScore,
      status: archDensity >= 1.2 && archDensity <= 4.5 ? 'optimal' : archDensity > 0 ? 'moderate' : 'warning',
      observation: `Interconnection density of ${archDensity.toFixed(2)} import edges per module (${edges} edges across ${nodes} nodes).`,
      benchmark: 'Target: 1.2 to 4.5 edges per node to avoid cyclic dependencies.',
    },
    {
      id: 'arch-framework',
      name: 'Framework Architecture Alignment',
      weight: 25,
      score: frameworkScore,
      status: repo.primaryFramework ? 'optimal' : 'moderate',
      observation: `Structured according to ${repo.primaryFramework || repo.primaryLanguage || 'Standard'} project conventions.`,
      benchmark: 'Target: Idiomatic file organization conforming to primary framework norms.',
    },
  ];

  // Dynamic Sub-metrics for Scale
  const densityScore = avgLinesPerFile <= 0
    ? 80
    : Math.max(55, Math.min(99, Math.round(100 - (avgLinesPerFile / 24))));
  const partitioningScore = Math.max(60, Math.min(99, Math.round(100 - Math.abs(fileToDirRatio - 12) * 1.4)));
  const depsScore = Math.max(55, Math.min(99, Math.round(99 - (repo.dependencies.direct * 0.65))));
  const volumeScore = Math.max(60, Math.min(99, Math.round(99 - Math.log10(Math.max(10, totalLoc)) * 4.2)));

  const scaleSubMetrics: SubMetricScore[] = [
    {
      id: 'scale-density',
      name: 'Lines-per-File Density',
      weight: 25,
      score: densityScore,
      status: avgLinesPerFile <= 250 ? 'optimal' : avgLinesPerFile <= 500 ? 'moderate' : 'warning',
      observation: `Average file size of ${avgLinesPerFile} lines across ${repo.stats.totalFiles.toLocaleString()} files.`,
      benchmark: 'Target: Under 250 lines per file for modularity and testability.',
    },
    {
      id: 'scale-partitioning',
      name: 'Folder Partitioning Balance',
      weight: 25,
      score: partitioningScore,
      status: fileToDirRatio <= 25 ? 'optimal' : fileToDirRatio <= 40 ? 'moderate' : 'warning',
      observation: `Distribution of ${fileToDirRatio.toFixed(1)} files per directory.`,
      benchmark: 'Target: Under 25 files per folder to avoid flat folder dumping.',
    },
    {
      id: 'scale-deps',
      name: 'Dependency Footprint',
      weight: 25,
      score: depsScore,
      status: repo.dependencies.direct <= 25 ? 'optimal' : repo.dependencies.direct <= 50 ? 'moderate' : 'warning',
      observation: `${repo.dependencies.direct} direct dependencies (${repo.dependencies.dev} development packages).`,
      benchmark: 'Target: Under 25 direct dependencies to minimize supply-chain surface.',
    },
    {
      id: 'scale-volume',
      name: 'Codebase Volume Manageability',
      weight: 25,
      score: volumeScore,
      status: totalLoc <= 50000 ? 'optimal' : totalLoc <= 150000 ? 'moderate' : 'warning',
      observation: `Total code volume of ${totalLoc.toLocaleString()} lines of code across ${repo.stats.totalFiles} files.`,
      benchmark: 'Target: Structured module boundaries preventing uncontrolled LOC sprawl.',
    },
  ];

  // Dynamic Sub-metrics for Database
  const dbRelRatio = tables > 0 ? rels / tables : 0;
  const dbModelingScore = tables > 0 ? Math.min(98, 86 + Math.min(12, tables)) : 80;
  const dbRelationsScore = tables > 0 ? (rels > 0 ? Math.min(99, 88 + Math.min(10, rels * 2)) : 74) : 82;
  const dbEcosystemScore = repo.database.detectedTypes.length > 0 ? Math.min(98, 92 + repo.database.detectedTypes.length * 2) : 82;
  const dbNormScore = tables > 0 ? (dbRelRatio >= 0.8 && dbRelRatio <= 2.5 ? Math.min(98, Math.round(96 - Math.abs(dbRelRatio - 1.2) * 5)) : 78) : 84;
  const dbSubMetrics: SubMetricScore[] = [
    {
      id: 'db-modeling',
      name: 'Entity Schema Modeling',
      weight: 25,
      score: dbModelingScore,
      status: tables > 0 ? 'optimal' : 'moderate',
      observation: tables > 0
        ? `Mapped ${tables} distinct database tables and domain entities.`
        : 'Codebase operates without declared database models or persistent entities.',
      benchmark: 'Target: Declared data models with typed properties.',
    },
    {
      id: 'db-relations',
      name: 'Relational Integrity & Associations',
      weight: 25,
      score: dbRelationsScore,
      status: tables > 0 ? (rels > 0 ? 'optimal' : 'warning') : 'moderate',
      observation: rels > 0
        ? `Discovered ${rels} explicit foreign keys and relational mappings.`
        : tables > 0
        ? 'Entities lack explicit foreign key relationships or association definitions.'
        : 'Stateless architecture with no relational dependencies.',
      benchmark: 'Target: Explicit foreign key associations between dependent tables.',
    },
    {
      id: 'db-ecosystem',
      name: 'ORM & Type Safety Ecosystem',
      weight: 25,
      score: dbEcosystemScore,
      status: repo.database.detectedTypes.length > 0 ? 'optimal' : 'moderate',
      observation: repo.database.detectedTypes.length > 0
        ? `Engineered with ${repo.database.detectedTypes.join(', ')} schema tooling.`
        : 'Custom or inferred database models without dedicated ORM manifest.',
      benchmark: 'Target: Typed ORM (Prisma, TypeORM, SQL DDL, Mongoose) for safe persistence.',
    },
    {
      id: 'db-normalization',
      name: 'Relational Cardinality Ratio',
      weight: 25,
      score: dbNormScore,
      status: tables > 0 ? (dbRelRatio >= 0.5 ? 'optimal' : 'moderate') : 'moderate',
      observation: tables > 0
        ? `Cardinality ratio of ${dbRelRatio.toFixed(2)} relationships per declared table.`
        : 'N/A: Stateless service.',
      benchmark: 'Target: >= 0.50 relationship ratio in normalized relational schemas.',
    },
  ];

  // Dynamic Sub-metrics for API Surface
  const apiVolumeScore = routes > 0 ? Math.min(98, 84 + Math.min(14, Math.round(routes * 0.7))) : 80;
  const apiMethodsScore = methods > 0 ? Math.min(99, 80 + methods * 4) : 82;
  const apiCrudScore = methods >= 4 ? 98 : methods === 3 ? 94 : methods >= 1 ? 86 : 80;
  const apiSepScore = routes > 0 ? (routes > 5 ? 95 : 90) : 82;

  const apiSubMetrics: SubMetricScore[] = [
    {
      id: 'api-breadth',
      name: 'Endpoint Surface Breadth',
      weight: 25,
      score: apiVolumeScore,
      status: routes > 0 ? 'optimal' : 'moderate',
      observation: routes > 0
        ? `Exposes ${routes} distinct API endpoints and request handlers.`
        : 'Operates as a client interface or utility library without exposed REST handlers.',
      benchmark: 'Target: Structured endpoint routing matching application domain.',
    },
    {
      id: 'api-methods',
      name: 'HTTP Verb & CRUD Coverage',
      weight: 25,
      score: apiMethodsScore,
      status: routes > 0 ? (methods >= 3 ? 'optimal' : 'moderate') : 'moderate',
      observation: routes > 0
        ? `Implements ${methods} HTTP verbs: ${repo.apiRoutes.methods.join(', ') || 'GET'}.`
        : 'No HTTP routing declarations detected.',
      benchmark: 'Target: Full CRUD coverage (GET, POST, PUT, DELETE) where applicable.',
    },
    {
      id: 'api-modularity',
      name: 'Routing Paradigm Modularity',
      weight: 25,
      score: apiCrudScore,
      status: 'optimal',
      observation: routes > 0
        ? `Organized according to ${repo.primaryFramework || 'Standard'} router paradigms.`
        : 'Stateless client or library structure.',
      benchmark: 'Target: Isolated route handlers with decoupled controller logic.',
    },
    {
      id: 'api-separation',
      name: 'Client/Server Boundary Clarity',
      weight: 25,
      score: apiSepScore,
      status: 'optimal',
      observation: routes > 0
        ? 'Explicit boundary between public HTTP interface and backend business services.'
        : 'Single-tier architecture without exposed API server layer.',
      benchmark: 'Target: Clear delineation between transport layer and domain logic.',
    },
  ];

  // Dynamic Sub-metrics for Security
  const secSubMetrics: SubMetricScore[] = [
    {
      id: 'sec-critical',
      name: 'Critical Vulnerability Isolation',
      weight: 25,
      score: repo.security.criticalCount === 0 ? 100 : Math.max(20, 100 - repo.security.criticalCount * 30),
      status: repo.security.criticalCount === 0 ? 'optimal' : 'warning',
      observation: repo.security.criticalCount === 0
        ? 'Zero critical vulnerabilities discovered during static audit.'
        : `${repo.security.criticalCount} critical vulnerability finding${repo.security.criticalCount === 1 ? '' : 's'} requiring immediate remediation.`,
      benchmark: 'Target: 0 critical vulnerabilities in production codebase.',
    },
    {
      id: 'sec-secrets',
      name: 'Secret Leak & Token Entropy',
      weight: 25,
      score: repo.security.secretsCount === 0 ? 100 : Math.max(20, 100 - repo.security.secretsCount * 25),
      status: repo.security.secretsCount === 0 ? 'optimal' : 'warning',
      observation: repo.security.secretsCount === 0
        ? 'Zero committed private keys, OAuth tokens, or API secrets detected.'
        : `${repo.security.secretsCount} potential leaked credential${repo.security.secretsCount === 1 ? '' : 's'} detected in tracked source files.`,
      benchmark: 'Target: Zero plaintext credentials or high-entropy secrets in repository.',
    },
    {
      id: 'sec-high',
      name: 'High-Risk Security Hygiene',
      weight: 25,
      score: repo.security.highCount === 0 ? 100 : Math.max(30, 100 - repo.security.highCount * 20),
      status: repo.security.highCount === 0 ? 'optimal' : 'warning',
      observation: repo.security.highCount === 0
        ? 'Zero high-severity vulnerability flags identified.'
        : `${repo.security.highCount} high-risk security issue${repo.security.highCount === 1 ? '' : 's'} identified.`,
      benchmark: 'Target: 0 high-severity security issues.',
    },
    {
      id: 'sec-posture',
      name: 'Defensive Code Patterns',
      weight: 25,
      score: Math.max(40, 100 - (repo.security.findingsCount - repo.security.criticalCount - repo.security.highCount) * 5),
      status: repo.security.findingsCount <= 2 ? 'optimal' : repo.security.findingsCount <= 6 ? 'moderate' : 'warning',
      observation: `Total of ${repo.security.findingsCount} flagged security finding${repo.security.findingsCount === 1 ? '' : 's'} across audited files.`,
      benchmark: 'Target: Strict sanitization, path verification, and encrypted storage.',
    },
  ];

  // Specific Recommendations for each pillar
  const archRecommendations: string[] = [];
  if (entryCount === 0) archRecommendations.push('Declare explicit application entry points (e.g. index.ts or main.ts) in project root or src/.');
  if (archDensity > 5.0) archRecommendations.push('Refactor high-coupling module clusters to reduce circular dependency risks.');
  if (fileToDirRatio > 25) archRecommendations.push('Subdivide top-level directories to group related components into cohesive feature folders.');
  if (archRecommendations.length === 0) archRecommendations.push('Maintain clean folder modularity and enforce unidirectional data flow.');

  const scaleRecommendations: string[] = [];
  if (avgLinesPerFile > 350) scaleRecommendations.push(`Split oversized files (averaging ${avgLinesPerFile} LOC) into smaller, single-responsibility units.`);
  if (repo.dependencies.direct > 35) scaleRecommendations.push('Audit direct dependencies and eliminate unused or duplicate packages.');
  if (scaleRecommendations.length === 0) scaleRecommendations.push('Preserve balanced file sizing and keep dependencies up to date.');

  const dbRecommendations: string[] = [];
  if (tables > 0 && rels === 0) dbRecommendations.push('Add explicit foreign key constraints and relations to prevent orphaned data records.');
  if (tables > 0 && repo.database.detectedTypes.length === 0) dbRecommendations.push('Adopt a typed ORM (such as Prisma or TypeORM) for compile-time schema safety.');
  if (dbRecommendations.length === 0) dbRecommendations.push('Continue maintaining structured database migrations and index optimization.');

  const apiRecommendations: string[] = [];
  if (routes > 0 && methods < 3) apiRecommendations.push('Expand HTTP verb coverage to provide standard RESTful operations.');
  if (routes > 20) apiRecommendations.push('Implement automated OpenAPI/Swagger route schema generation for developer documentation.');
  if (apiRecommendations.length === 0) apiRecommendations.push('Keep endpoint definitions decoupled from underlying business logic.');

  const secRecommendations: string[] = [];
  if (repo.security.secretsCount > 0) secRecommendations.push('Immediately revoke leaked credentials and remove secrets from git history using environment variables.');
  if (repo.security.criticalCount > 0) secRecommendations.push(`Patch ${repo.security.criticalCount} critical security finding${repo.security.criticalCount === 1 ? '' : 's'} identified in the static audit.`);
  if (secRecommendations.length === 0) secRecommendations.push('Maintain automated dependency vulnerability scanning in your CI/CD pipeline.');

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
        subMetrics: archSubMetrics,
        telemetry: {
          nodes,
          edges,
          density: `${archDensity.toFixed(2)} edges/node`,
          entryPoints: entryCount,
          pattern: detectedStyle,
        },
        recommendations: archRecommendations,
      },
      scale: {
        score: scaleScore,
        label: 'Code Scale & Maintainability',
        grade: calculateLetterGrade(scaleScore),
        details: scaleDetails,
        subMetrics: scaleSubMetrics,
        telemetry: {
          avgLinesPerFile,
          fileToDirRatio: `${fileToDirRatio.toFixed(1)} files/dir`,
          totalFiles: repo.stats.totalFiles,
          totalLines: repo.stats.totalLines,
          dependencies: repo.dependencies.total,
        },
        recommendations: scaleRecommendations,
      },
      database: {
        score: dbScore,
        label: 'Database & Data Models',
        grade: calculateLetterGrade(dbScore),
        details: dbDetails,
        subMetrics: dbSubMetrics,
        telemetry: {
          tablesCount: tables,
          relationshipsCount: rels,
          relationalRatio: `${dbRelRatio.toFixed(2)} rels/table`,
          ecosystem: repo.database.detectedTypes.join(', ') || 'Domain Entities',
        },
        recommendations: dbRecommendations,
      },
      apiSurface: {
        score: apiScore,
        label: 'API Surface & Connectivity',
        grade: calculateLetterGrade(apiScore),
        details: apiDetails,
        subMetrics: apiSubMetrics,
        telemetry: {
          routesCount: routes,
          methodsCount: methods,
          httpMethods: repo.apiRoutes.methods.join(', ') || 'None',
          routingStyle: routes > 10 ? 'Extensive API Layer' : routes > 0 ? 'Targeted Handlers' : 'Client / Library',
        },
        recommendations: apiRecommendations,
      },
      security: {
        score: secScore,
        label: 'Security & Secret Hygiene',
        grade: calculateLetterGrade(secScore),
        details: secDetails,
        subMetrics: secSubMetrics,
        telemetry: {
          critical: repo.security.criticalCount,
          high: repo.security.highCount,
          secrets: repo.security.secretsCount,
          totalFindings: repo.security.findingsCount,
        },
        recommendations: secRecommendations,
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
 * Builds side-by-side Score Quality pillar comparisons across the 5 dimensions
 */
export function buildPillarComparisons(
  repoA: ComparableRepoInput,
  repoB: ComparableRepoInput,
  gradeA: RepoGrade,
  gradeB: RepoGrade
): PillarComparison[] {
  const configs: Array<{
    key: 'architecture' | 'scale' | 'database' | 'apiSurface' | 'security';
    title: string;
    weight: number;
  }> = [
    { key: 'architecture', title: 'Architecture & Modularity', weight: 25 },
    { key: 'scale', title: 'Code Scale & Maintainability', weight: 20 },
    { key: 'database', title: 'Database Architecture', weight: 20 },
    { key: 'apiSurface', title: 'API Connectivity & Routing', weight: 15 },
    { key: 'security', title: 'Security & Secret Hygiene', weight: 20 },
  ];

  return configs.map(({ key, title, weight }) => {
    const dimA = gradeA.breakdown[key];
    const dimB = gradeB.breakdown[key];
    const deltaScore = Math.abs(dimA.score - dimB.score);
    const winner: 'base' | 'compare' | 'tie' =
      dimA.score > dimB.score ? 'base' : dimB.score > dimA.score ? 'compare' : 'tie';

    let verdict = 'Both repositories are evenly matched in this dimension.';
    if (winner === 'base') {
      verdict = `${repoA.name} leads in ${title} by +${deltaScore} points (${dimA.grade} vs ${dimB.grade}).`;
    } else if (winner === 'compare') {
      verdict = `${repoB.name} leads in ${title} by +${deltaScore} points (${dimB.grade} vs ${dimA.grade}).`;
    }

    const comparativeObservations: string[] = [];
    if (key === 'architecture') {
      const nodesA = repoA.architecture?.nodesCount ?? repoA.stats.totalFiles;
      const nodesB = repoB.architecture?.nodesCount ?? repoB.stats.totalFiles;
      comparativeObservations.push(
        `${repoA.name} contains ${nodesA} graph nodes vs ${nodesB} in ${repoB.name}.`
      );
      comparativeObservations.push(
        `Architectural style: ${repoA.architecture?.detectedStyle || 'Modular'} vs ${repoB.architecture?.detectedStyle || 'Modular'}.`
      );
    } else if (key === 'scale') {
      const locA = repoA.stats.totalLines;
      const locB = repoB.stats.totalLines;
      const avgA = repoA.stats.totalFiles > 0 ? Math.round(locA / repoA.stats.totalFiles) : 0;
      const avgB = repoB.stats.totalFiles > 0 ? Math.round(locB / repoB.stats.totalFiles) : 0;
      comparativeObservations.push(
        `Average file size: ${avgA} LOC/file (${repoA.name}) vs ${avgB} LOC/file (${repoB.name}).`
      );
      comparativeObservations.push(
        `Total code volume: ${locA.toLocaleString()} lines vs ${locB.toLocaleString()} lines.`
      );
    } else if (key === 'database') {
      comparativeObservations.push(
        `${repoA.name} maps ${repoA.database.tablesCount} tables with ${repoA.database.relationshipsCount} relations (${repoA.database.detectedTypes.join(', ') || 'Custom'}).`
      );
      comparativeObservations.push(
        `${repoB.name} maps ${repoB.database.tablesCount} tables with ${repoB.database.relationshipsCount} relations (${repoB.database.detectedTypes.join(', ') || 'Custom'}).`
      );
    } else if (key === 'apiSurface') {
      comparativeObservations.push(
        `${repoA.name} implements ${repoA.apiRoutes.totalCount} routes (${repoA.apiRoutes.methods.join(', ') || 'None'}).`
      );
      comparativeObservations.push(
        `${repoB.name} implements ${repoB.apiRoutes.totalCount} routes (${repoB.apiRoutes.methods.join(', ') || 'None'}).`
      );
    } else if (key === 'security') {
      comparativeObservations.push(
        `${repoA.name}: ${repoA.security.criticalCount} critical, ${repoA.security.secretsCount} secrets, ${repoA.security.findingsCount} total flags.`
      );
      comparativeObservations.push(
        `${repoB.name}: ${repoB.security.criticalCount} critical, ${repoB.security.secretsCount} secrets, ${repoB.security.findingsCount} total flags.`
      );
    }

    return {
      key,
      title,
      weight,
      dimA,
      dimB,
      deltaScore,
      winner,
      verdict,
      comparativeObservations,
    };
  });
}

/**
 * Autonomous AI Score Quality & Architectural Synthesis
 */
export function generateAiQualityReview(
  repoA: ComparableRepoInput,
  repoB: ComparableRepoInput,
  gradeA: RepoGrade,
  gradeB: RepoGrade,
  metrics: Record<string, MetricComparison<number>>
): AiQualityReview {
  const fwA = repoA.primaryFramework || repoA.primaryLanguage || 'Generic Application';
  const fwB = repoB.primaryFramework || repoB.primaryLanguage || 'Generic Application';

  const leader = gradeA.overallScore >= gradeB.overallScore ? repoA.name : repoB.name;
  const runnerUp = gradeA.overallScore >= gradeB.overallScore ? repoB.name : repoA.name;
  const leadScore = Math.max(gradeA.overallScore, gradeB.overallScore);
  const trailScore = Math.min(gradeA.overallScore, gradeB.overallScore);

  const headline =
    leadScore === trailScore
      ? `Architectural parity: Both ${repoA.name} and ${repoB.name} demonstrate equivalent overall engineering quality (${leadScore}/100).`
      : `${leader} (${leadScore}/100) holds an architectural edge over ${runnerUp} (${trailScore}/100) with a +${leadScore - trailScore} score differential.`;

  const executiveSummary =
    `Comparative analysis indicates distinct design priorities. ${repoA.name} leverages ${fwA} with an emphasis on ${
      repoA.database.tablesCount > 0 ? 'relational schema modeling' : 'lean modularity'
    }, whereas ${repoB.name} utilizes ${fwB} with ${
      repoB.stats.totalLines > repoA.stats.totalLines ? 'broader codebase scope' : 'streamlined execution'
    }. Rebuilding or synchronizing these platforms requires accommodating their divergent state management and routing abstractions.`;

  const architecturalTradeoffs: AiQualityTradeoff[] = [
    {
      title: 'Framework & Runtime Paradigm',
      description: `${repoA.name} adopts ${fwA} patterns, while ${repoB.name} is built around ${fwB}. This directly impacts bundle size, cold start performance, and concurrency handling.`,
      recommendation: `Align on standard contracts or shared TypeScript interfaces if interoperability is desired between the two codebases.`,
    },
    {
      title: 'State & Persistence Strategy',
      description: `${repoA.name} defines ${repoA.database.tablesCount} data models with ${repoA.database.relationshipsCount} associations vs ${repoB.database.tablesCount} models in ${repoB.name}.`,
      recommendation: repoA.database.tablesCount > repoB.database.tablesCount
        ? `Adopt ${repoA.name}'s explicit relational model in ${repoB.name} to enforce foreign key integrity.`
        : `Consider migrating data models to a unified schema definition like Prisma or SQL DDL.`,
    },
    {
      title: 'API Breadth & Transport Layer',
      description: `${repoA.name} provides ${repoA.apiRoutes.totalCount} API endpoints compared to ${repoB.apiRoutes.totalCount} in ${repoB.name}.`,
      recommendation: `Ensure client-facing routes follow uniform RESTful conventions with centralized input validation schemas.`,
    },
  ];

  const avgA = repoA.stats.totalFiles > 0 ? Math.round(repoA.stats.totalLines / repoA.stats.totalFiles) : 0;
  const avgB = repoB.stats.totalFiles > 0 ? Math.round(repoB.stats.totalLines / repoB.stats.totalFiles) : 0;
  const maintainabilityDebtAssessment =
    `Maintainability audit shows ${repoA.name} averages ${avgA} lines/file across ${repoA.stats.totalFiles} files with ${repoA.dependencies.direct} direct dependencies, while ${repoB.name} averages ${avgB} lines/file across ${repoB.stats.totalFiles} files with ${repoB.dependencies.direct} direct dependencies. ${
      avgA < avgB ? repoA.name : repoB.name
    } exhibits superior granular decomposition with lower cognitive refactoring overhead.`;

  const databaseIntegrityComparison =
    repoA.database.tablesCount > 0 || repoB.database.tablesCount > 0
      ? `Data layer inspection: ${repoA.name} has ${repoA.database.tablesCount} tables (${repoA.database.relationshipsCount} relationships), and ${repoB.name} has ${repoB.database.tablesCount} tables (${repoB.database.relationshipsCount} relationships). Relational constraints are ${
          repoA.database.relationshipsCount > 0 && repoB.database.relationshipsCount > 0
            ? 'well-modeled across both repositories'
            : 'partially defined and would benefit from explicit foreign keys'
        }.`
      : 'Both repositories are designed as stateless service layers without local database definitions.';

  const apiSurfaceCritique =
    repoA.apiRoutes.totalCount > 0 || repoB.apiRoutes.totalCount > 0
      ? `API surface inspection: ${repoA.name} exposes ${repoA.apiRoutes.totalCount} endpoints using ${repoA.apiRoutes.methods.join(', ') || 'GET'}, whereas ${repoB.name} implements ${repoB.apiRoutes.totalCount} endpoints using ${repoB.apiRoutes.methods.join(', ') || 'GET'}.`
      : 'Neither repository declares public HTTP API routes.';

  const securityHygieneVerdict =
    repoA.security.findingsCount === 0 && repoB.security.findingsCount === 0
      ? 'Security audit confirms zero leaked credentials, tokens, or critical vulnerabilities across both codebases.'
      : `Security audit highlights disparities: ${repoA.name} has ${repoA.security.criticalCount} critical and ${repoA.security.secretsCount} secret flags, while ${repoB.name} has ${repoB.security.criticalCount} critical and ${repoB.security.secretsCount} secret flags. Prompt remediation of exposed keys is strongly advised.`;

  const fasterRebuildRepo = gradeA.rebuildReadiness.estimatedPhases <= gradeB.rebuildReadiness.estimatedPhases ? repoA.name : repoB.name;
  const agentPrompt =
    `Act as a Principal Software Architect. Given the architectural analysis of ${repoA.name} (${fwA}, ${repoA.stats.totalLines} LOC) and ${repoB.name} (${fwB}, ${repoB.stats.totalLines} LOC), develop an autonomous implementation plan to port the core capabilities of ${repoB.name} into ${repoA.name}, maintaining strict modularity, schema integrity (${repoA.database.tablesCount} tables), and zero security regressions.`;

  const keyActionItems: AiActionItem[] = [];
  if (repoA.security.criticalCount > 0 || repoA.security.secretsCount > 0) {
    keyActionItems.push({
      priority: 'high',
      targetRepo: repoA.name,
      action: `Remediate ${repoA.security.criticalCount} critical vulnerabilities and revoke ${repoA.security.secretsCount} exposed credentials.`,
      expectedImpact: 'Eliminates immediate exploit risks and elevates Security Score to 95+.',
    });
  }
  if (repoB.security.criticalCount > 0 || repoB.security.secretsCount > 0) {
    keyActionItems.push({
      priority: 'high',
      targetRepo: repoB.name,
      action: `Remediate ${repoB.security.criticalCount} critical vulnerabilities and revoke ${repoB.security.secretsCount} exposed credentials.`,
      expectedImpact: 'Hardens perimeter and elevates Security Score to 95+.',
    });
  }
  if (avgA > 350) {
    keyActionItems.push({
      priority: 'medium',
      targetRepo: repoA.name,
      action: `Decompose oversized files (averaging ${avgA} lines/file) into targeted sub-components.`,
      expectedImpact: 'Improves Code Scale score and speeds up unit testing.',
    });
  }
  if (avgB > 350) {
    keyActionItems.push({
      priority: 'medium',
      targetRepo: repoB.name,
      action: `Decompose oversized files (averaging ${avgB} lines/file) into targeted sub-components.`,
      expectedImpact: 'Improves Code Scale score and speeds up unit testing.',
    });
  }
  if (repoA.database.tablesCount > 0 && repoA.database.relationshipsCount === 0) {
    keyActionItems.push({
      priority: 'medium',
      targetRepo: repoA.name,
      action: 'Declare explicit foreign key relations between database tables.',
      expectedImpact: 'Enables deterministic ERD mapping and prevents orphaned data.',
    });
  }
  if (repoB.database.tablesCount > 0 && repoB.database.relationshipsCount === 0) {
    keyActionItems.push({
      priority: 'medium',
      targetRepo: repoB.name,
      action: 'Declare explicit foreign key relations between database tables.',
      expectedImpact: 'Enables deterministic ERD mapping and prevents orphaned data.',
    });
  }
  keyActionItems.push({
    priority: 'low',
    targetRepo: 'Both Projects',
    action: 'Standardize API route schemas and maintain automated regression tests.',
    expectedImpact: 'Ensures long-term architectural stability during agentic refactoring.',
  });

  return {
    headline,
    executiveSummary,
    architecturalTradeoffs,
    maintainabilityDebtAssessment,
    databaseIntegrityComparison,
    apiSurfaceCritique,
    securityHygieneVerdict,
    agentRebuildFeasibility: {
      recommendedStrategy: `Prioritize rebuilding ${fasterRebuildRepo} first due to lower dependency coupling and fewer implementation phases.`,
      complexityEstimate: `${gradeA.rebuildReadiness.complexity} vs ${gradeB.rebuildReadiness.complexity}`,
      estimatedPhasesCount: Math.max(gradeA.rebuildReadiness.estimatedPhases, gradeB.rebuildReadiness.estimatedPhases),
      agentTaskDelegationPrompt: agentPrompt,
    },
    keyActionItems,
    generatedAt: new Date().toISOString(),
  };
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

  const metrics = {
    linesOfCode: compareMetric(repoA.stats.totalLines, repoB.stats.totalLines, false), // less LOC often leaner
    filesCount: compareMetric(repoA.stats.totalFiles, repoB.stats.totalFiles, false),
    directoriesCount: compareMetric(repoA.stats.totalDirs, repoB.stats.totalDirs, false),
    dependenciesCount: compareMetric(repoA.dependencies.total, repoB.dependencies.total, false),
    databaseTablesCount: compareMetric(repoA.database.tablesCount, repoB.database.tablesCount, true),
    apiRoutesCount: compareMetric(repoA.apiRoutes.totalCount, repoB.apiRoutes.totalCount, true),
    securityRisksCount: compareMetric(repoA.security.findingsCount, repoB.security.findingsCount, false),
    healthScore: compareMetric(gradeA.overallScore, gradeB.overallScore, true),
  };

  const pillars = buildPillarComparisons(repoA, repoB, gradeA, gradeB);
  const aiReview = generateAiQualityReview(repoA, repoB, gradeA, gradeB, metrics);

  return {
    repoA: { summary: repoA, grade: gradeA },
    repoB: { summary: repoB, grade: gradeB },
    metrics,
    pillars,
    aiReview,
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
Platform: DomoScope (Created by Arron Kian Parejas / @DarkNecrocities)

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

---

## 5. Score Quality Diagnostic Rubric

${result.pillars.map((p) => `### ${p.title} (${p.weight}% Weight)
* **Verdict**: ${p.verdict}
* **${repoA.summary.name} Score**: ${p.dimA.score}/100 (${p.dimA.grade})
* **${repoB.summary.name} Score**: ${p.dimB.score}/100 (${p.dimB.grade})

| Sub-Metric Criterion | ${repoA.summary.name} | ${repoB.summary.name} | Benchmark Standard |
|---|---|---|---|
${p.dimA.subMetrics.map((smA, i) => {
  const smB = p.dimB.subMetrics[i] || smA;
  return `| ${smA.name} | ${smA.score}/100 (${smA.status.toUpperCase()}) | ${smB.score}/100 (${smB.status.toUpperCase()}) | ${smA.benchmark} |`;
}).join('\n')}

**Observations:**
${p.comparativeObservations.map((obs) => `- ${obs}`).join('\n')}
`).join('\n---\n\n')}

---

## 6. AI Score Quality & Architectural Synthesis

### Executive Assessment
${result.aiReview.headline}

${result.aiReview.executiveSummary}

### Architectural Tradeoffs
${result.aiReview.architecturalTradeoffs.map((t) => `* **${t.title}**: ${t.description}
  - _Recommendation_: ${t.recommendation}`).join('\n')}

### Maintainability & Tech Debt Critique
${result.aiReview.maintainabilityDebtAssessment}

### Security Hygiene Verdict
${result.aiReview.securityHygieneVerdict}

### Autonomous AI Agent Rebuild Feasibility
* **Rebuild Complexity**: ${result.aiReview.agentRebuildFeasibility.complexityEstimate}
* **Estimated Implementation Phases**: ${result.aiReview.agentRebuildFeasibility.estimatedPhasesCount}
* **Rebuild Strategy**: ${result.aiReview.agentRebuildFeasibility.recommendedStrategy}

\`\`\`
${result.aiReview.agentRebuildFeasibility.agentTaskDelegationPrompt}
\`\`\`

### Recommended Action Items
| Priority | Target Repository | Recommended Action | Expected Impact |
|---|---|---|---|
${result.aiReview.keyActionItems.map((item) => `| [${item.priority.toUpperCase()}] | ${item.targetRepo} | ${item.action} | ${item.expectedImpact} |`).join('\n')}
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
