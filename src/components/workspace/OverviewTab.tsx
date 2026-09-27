import { useMemo } from 'react';
import {
  FileText,
  Folder,
  GitBranch,
  Package,
  Database,
  Shield,
  ExternalLink,
  ArrowRight,
  Code2,
  Cpu,
  Layers,
  Sparkles,
  CheckCircle2,
  Workflow,
  Globe,
  Terminal,
  Activity,
  Box,
  FileCode,
  Bot,
  Smartphone,
  Monitor,
  Server,
} from 'lucide-react';
import { RepoAnalysis, DatabaseSchema, RepoDependency, SecurityFinding, BranchInfo, RepoFile } from '../../types';
import { WorkspaceTab } from '../layout/Sidebar';
import { detectFrameworks } from '../../services/frameworkDetector';
import { detectAppType } from '../../services/appTypeDetector';

interface OverviewTabProps {
  analysis: RepoAnalysis;
  databaseSchema?: DatabaseSchema | null;
  dependencies: RepoDependency[];
  branches: BranchInfo[];
  securityFindings: SecurityFinding[];
  onNavigateTab: (tab: WorkspaceTab) => void;
  files?: RepoFile[];
  fileContents?: Map<string, string>;
  onOpenFile?: (path: string) => void;
}

export function OverviewTab({
  analysis,
  databaseSchema,
  dependencies,
  branches,
  securityFindings,
  onNavigateTab,
  files,
  fileContents = new Map(),
  onOpenFile,
}: OverviewTabProps) {
  const { metadata, totalFiles, totalDirs, languages, detectedTools, entryPoints } = analysis;
  const hasDatabase = databaseSchema && databaseSchema.tables.length > 0;

  // Detect frameworks with universal polyglot engine
  const frameworkResult = useMemo(() => {
    return detectFrameworks(files || analysis.files, fileContents, dependencies);
  }, [files, analysis.files, fileContents, dependencies]);

  const { primary: primaryFramework, secondary: secondaryFrameworks, ecosystem } = frameworkResult;

  // Detect app type / archetype (Web App, ML, Mobile, Desktop, CLI, etc.)
  const appTypeResult = useMemo(() => {
    return detectAppType(files || analysis.files, fileContents, dependencies);
  }, [files, analysis.files, fileContents, dependencies]);

  // Architectural Readiness Scorecard & Metrics
  const readinessMetrics = useMemo(() => {
    const sourceFiles = files || analysis.files;
    const componentCount = sourceFiles.filter((f) => f.category === 'component').length;
    const apiCount = sourceFiles.filter((f) => f.category === 'api').length;
    const serviceCount = sourceFiles.filter((f) => f.category === 'service').length;
    const tableCount = databaseSchema?.tables.length || 0;
    const testCount = sourceFiles.filter((f) => f.category === 'test').length;
    const securityCount = securityFindings.length;

    // Modularity score: 0-100
    const modularityScore = Math.min(100, Math.round(((componentCount + serviceCount + 3) / Math.max(1, totalFiles)) * 140));
    // API score
    const apiScore = apiCount > 0 ? Math.min(100, 65 + apiCount * 5) : 50;
    // Database score
    const dbScore = tableCount > 0 ? Math.min(100, 70 + tableCount * 6) : 60;
    // Security score: starts at 100, drops with findings
    const securityScore = Math.max(40, 100 - securityCount * 12);
    // Testing score
    const testScore = testCount > 0 ? Math.min(100, 50 + testCount * 10) : 40;

    const overallScore = Math.round(
      modularityScore * 0.25 + apiScore * 0.2 + dbScore * 0.2 + securityScore * 0.2 + testScore * 0.15
    );

    let readinessGrade = 'Production Grade';
    if (overallScore < 60) readinessGrade = 'Prototype / Early Stage';
    else if (overallScore < 75) readinessGrade = 'Active Development';
    else if (overallScore < 88) readinessGrade = 'Enterprise Ready';

    return {
      overallScore,
      readinessGrade,
      modularityScore,
      apiScore,
      dbScore,
      securityScore,
      testScore,
      componentCount,
      apiCount,
      serviceCount,
      tableCount,
      testCount,
    };
  }, [files, analysis.files, totalFiles, databaseSchema, securityFindings]);

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-150 select-none">
      {/* Top Header Card */}
      <div className="p-6 rounded-2xl border border-zinc-200 bg-white shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
                {metadata.fullName}
              </h1>
              {metadata.license && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded border border-zinc-200 bg-zinc-50 text-zinc-600">
                  {metadata.license}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed max-w-3xl">
              {metadata.description || 'No description provided by repository owner.'}
            </p>
          </div>

          <a
            href={metadata.htmlUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-900 transition-colors shrink-0 self-start shadow-2xs"
          >
            <span>GitHub</span>
            <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
          </a>
        </div>

        {/* Project Summary */}
        <div className="mt-5 pt-4 border-t border-zinc-100">
          <div className="flex items-center gap-1.5 mb-1.5 text-zinc-400">
            <Sparkles className="w-3.5 h-3.5 text-zinc-700" />
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 font-semibold">
              Project Summary
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-800 leading-relaxed font-sans">
            {analysis.summary}
          </p>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 1. FRAMEWORK CARD                                                     */}
      {/* ===================================================================== */}
      <div className="p-6 rounded-2xl border border-zinc-200 bg-white shadow-xs space-y-4">
        <div>
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-400 block mb-2">
            Framework
          </span>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 pb-4 border-b border-zinc-100">
            <div className="flex items-start sm:items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center shadow-xs shrink-0 mt-0.5 sm:mt-0">
                <Cpu className="w-5 h-5 stroke-[2]" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-zinc-950 tracking-tight">{primaryFramework.name}</h2>
                  <span className="px-2.5 py-0.5 text-[11px] font-mono font-bold bg-zinc-900 text-white rounded-md whitespace-nowrap shadow-2xs">
                    {primaryFramework.badge}
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-zinc-100 border border-zinc-200 text-zinc-700 rounded-md whitespace-nowrap">
                    {primaryFramework.category}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 font-mono mt-1 flex items-center gap-1.5 flex-wrap">
                  <Layers className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span>{primaryFramework.archetype}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-zinc-700 bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-xl whitespace-nowrap self-start lg:self-auto shrink-0 shadow-2xs">
              <Terminal className="w-3.5 h-3.5 text-zinc-700 shrink-0" />
              <span className="font-semibold text-zinc-900">{primaryFramework.runtime}</span>
            </div>
          </div>
        </div>

        {/* Framework Description & Narrative */}
        <p className="text-xs sm:text-sm text-zinc-700 leading-relaxed font-sans">
          {primaryFramework.description}
        </p>

        {/* Framework Capabilities Chips */}
        <div>
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-400 block mb-2">
            Key Features & Capabilities
          </span>
          <div className="flex flex-wrap gap-2">
            {primaryFramework.capabilities.map((cap) => (
              <span
                key={cap}
                className="px-2.5 py-1 rounded-lg border border-zinc-200 bg-zinc-50 text-xs font-medium text-zinc-800 flex items-center gap-1.5 whitespace-nowrap"
              >
                <CheckCircle2 className="w-3 h-3 text-zinc-900" />
                <span>{cap}</span>
              </span>
            ))}
            {primaryFramework.buildTool && (
              <span className="px-2.5 py-1 rounded-lg border border-zinc-200 bg-zinc-50 text-xs font-mono font-medium text-zinc-800 whitespace-nowrap">
                Bundler: {primaryFramework.buildTool}
              </span>
            )}
            <span className="px-2.5 py-1 rounded-lg border border-zinc-200 bg-zinc-50 text-xs font-mono font-medium text-zinc-800 whitespace-nowrap">
              Routing: {primaryFramework.routingType}
            </span>
          </div>
        </div>

        {/* Secondary Frameworks & Ecosystem */}
        {secondaryFrameworks.length > 0 && (
          <div className="pt-3 border-t border-zinc-100">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-400 block mb-2">
              Other Frameworks & Tools Used
            </span>
            <div className="flex flex-wrap gap-2">
              {secondaryFrameworks.map((sub) => (
                <div
                  key={sub.id}
                  className="px-3 py-1.5 rounded-xl border border-zinc-200 bg-zinc-50/80 flex items-center gap-2 whitespace-nowrap"
                >
                  <Box className="w-3.5 h-3.5 text-zinc-700" />
                  <span className="text-xs font-bold text-zinc-900">{sub.name}</span>
                  <span className="text-[10px] font-mono text-zinc-600 bg-white border border-zinc-200 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                    {sub.category}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* 1b. APP TYPE CARD                                                      */}
      {/* ===================================================================== */}
      {(() => {
        const { primary, secondary, isHybrid } = appTypeResult;
        // Pick an icon based on the primary category
        const AppIcon =
          primary.category === 'Model Training & AI / ML' ? Bot
          : primary.category === 'Mobile Application' ? Smartphone
          : primary.category === 'Desktop Software & GUI' ? Monitor
          : primary.category === 'Backend API & Microservice' ? Server
          : primary.category === 'CLI & Developer Tool' ? Terminal
          : primary.category === 'Web3 & Smart Contracts' ? Globe
          : primary.category === 'Game & Interactive Graphics' ? Layers
          : Globe;

        return (
          <div className="p-6 rounded-2xl border border-zinc-200 bg-white shadow-xs space-y-4">
            {/* Header row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100">
              <div className="flex items-start sm:items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center shadow-xs shrink-0 mt-0.5 sm:mt-0">
                  <AppIcon className="w-5 h-5 stroke-[2]" />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                    App Type
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold text-zinc-950 tracking-tight">{primary.name}</h2>
                    <span className="px-2.5 py-0.5 text-[11px] font-mono font-bold bg-zinc-900 text-white rounded-md whitespace-nowrap shadow-2xs">
                      {primary.badge}
                    </span>
                    <span className={`px-2 py-0.5 text-[10px] font-mono font-semibold rounded-md whitespace-nowrap border ${
                      primary.confidence === 'High'
                        ? 'bg-zinc-900 text-white border-zinc-900'
                        : primary.confidence === 'Medium'
                        ? 'bg-zinc-100 text-zinc-700 border-zinc-200'
                        : 'bg-zinc-50 text-zinc-500 border-zinc-200'
                    }`}>
                      {primary.confidence} Confidence
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-700 bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-xl whitespace-nowrap self-start sm:self-auto shrink-0 shadow-2xs">
                <Cpu className="w-3.5 h-3.5 text-zinc-700 shrink-0" />
                <span className="font-semibold text-zinc-900">{primary.executionPattern.split('&')[0].trim()}</span>
              </div>
            </div>

            {/* Description */}
            <p className="text-xs sm:text-sm text-zinc-700 leading-relaxed font-sans">
              {primary.description}
            </p>

            {/* Target Platforms */}
            <div>
              <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-400 block mb-2">
                Runs On
              </span>
              <div className="flex flex-wrap gap-2">
                {primary.targetPlatforms.map((platform) => (
                  <span
                    key={platform}
                    className="px-2.5 py-1 rounded-lg border border-zinc-200 bg-zinc-50 text-xs font-medium text-zinc-800 whitespace-nowrap"
                  >
                    {platform}
                  </span>
                ))}
              </div>
            </div>

            {/* Detected Indicators */}
            {primary.detectedIndicators.length > 0 && (
              <div>
                <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-400 block mb-2">
                  Detected Signals
                </span>
                <div className="flex flex-wrap gap-2">
                  {primary.detectedIndicators.map((indicator) => (
                    <span
                      key={indicator}
                      className="px-2.5 py-1 rounded-lg border border-zinc-200 bg-zinc-50 text-xs font-medium text-zinc-800 flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <CheckCircle2 className="w-3 h-3 text-zinc-900" />
                      <span>{indicator}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Secondary / Hybrid types */}
            {isHybrid && secondary.length > 0 && (
              <div className="pt-3 border-t border-zinc-100">
                <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-400 block mb-2">
                  Also Detected
                </span>
                <div className="flex flex-wrap gap-2">
                  {secondary.map((sec) => (
                    <div
                      key={sec.id}
                      className="px-3 py-1.5 rounded-xl border border-zinc-200 bg-zinc-50/80 flex items-center gap-2 whitespace-nowrap"
                    >
                      <Box className="w-3.5 h-3.5 text-zinc-700" />
                      <span className="text-xs font-bold text-zinc-900">{sec.name}</span>
                      <span className="text-[10px] font-mono text-zinc-600 bg-white border border-zinc-200 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                        {sec.badge}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ===================================================================== */}
      {/* 2. REPOSITORY HEALTH & QUALITY SCORE                                  */}
      {/* ===================================================================== */}
      <div className="p-6 rounded-2xl border border-zinc-200 bg-white shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-zinc-900" />
            <h3 className="text-sm font-bold text-zinc-900">Project Health & Quality Score</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold text-zinc-500">Overall Score:</span>
            <span className="px-2.5 py-1 bg-zinc-900 text-white rounded-lg font-mono text-xs font-extrabold shadow-2xs">
              {readinessMetrics.overallScore}/100 · {readinessMetrics.readinessGrade}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Code Structure */}
          <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-800">Code Structure</span>
              <span className="font-mono font-bold text-zinc-900">{readinessMetrics.modularityScore}%</span>
            </div>
            <div className="w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-zinc-900 rounded-full"
                style={{ width: `${readinessMetrics.modularityScore}%` }}
              />
            </div>
            <p className="text-[11px] text-zinc-500 font-mono">
              {readinessMetrics.componentCount} components, {readinessMetrics.serviceCount} services
            </p>
          </div>

          {/* API Endpoints */}
          <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-800">API Endpoints</span>
              <span className="font-mono font-bold text-zinc-900">{readinessMetrics.apiScore}%</span>
            </div>
            <div className="w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-zinc-900 rounded-full"
                style={{ width: `${readinessMetrics.apiScore}%` }}
              />
            </div>
            <p className="text-[11px] text-zinc-500 font-mono">
              {readinessMetrics.apiCount > 0 ? `${readinessMetrics.apiCount} route files` : 'No API endpoints'}
            </p>
          </div>

          {/* Database & Tables */}
          <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-800">Database & Tables</span>
              <span className="font-mono font-bold text-zinc-900">{readinessMetrics.dbScore}%</span>
            </div>
            <div className="w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-zinc-900 rounded-full"
                style={{ width: `${readinessMetrics.dbScore}%` }}
              />
            </div>
            <p className="text-[11px] text-zinc-500 font-mono">
              {readinessMetrics.tableCount > 0 ? `${readinessMetrics.tableCount} tables mapped` : 'No tables detected'}
            </p>
          </div>

          {/* Security Checks */}
          <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-800">Security Checks</span>
              <span className="font-mono font-bold text-zinc-900">{readinessMetrics.securityScore}%</span>
            </div>
            <div className="w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-zinc-900 rounded-full"
                style={{ width: `${readinessMetrics.securityScore}%` }}
              />
            </div>
            <p className="text-[11px] text-zinc-500 font-mono">
              {securityFindings.length === 0 ? 'Zero vulnerabilities' : `${securityFindings.length} flagged risks`}
            </p>
          </div>

          {/* Test Coverage */}
          <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-800">Test Coverage</span>
              <span className="font-mono font-bold text-zinc-900">{readinessMetrics.testScore}%</span>
            </div>
            <div className="w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-zinc-900 rounded-full"
                style={{ width: `${readinessMetrics.testScore}%` }}
              />
            </div>
            <p className="text-[11px] text-zinc-500 font-mono">
              {readinessMetrics.testCount > 0 ? `${readinessMetrics.testCount} test suites` : 'No test suites found'}
            </p>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3. QUICK ACTIONS STATION                                             */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => onNavigateTab('architecture')}
          className="p-4 rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <Workflow className="w-4 h-4 text-zinc-900" />
            <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div className="text-xs font-bold text-zinc-900">Architecture Graph</div>
          <p className="text-[11px] text-zinc-500 mt-0.5">Interactive module diagram</p>
        </div>

        <div
          onClick={() => onNavigateTab('api_catalog')}
          className="p-4 rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <Globe className="w-4 h-4 text-zinc-900" />
            <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div className="text-xs font-bold text-zinc-900">API Route Catalog</div>
          <p className="text-[11px] text-zinc-500 mt-0.5">Endpoints & controllers</p>
        </div>

        <div
          onClick={() => onNavigateTab('database')}
          className="p-4 rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <Database className="w-4 h-4 text-zinc-900" />
            <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div className="text-xs font-bold text-zinc-900">Database ERD</div>
          <p className="text-[11px] text-zinc-500 mt-0.5">Entity relationship models</p>
        </div>

        <div
          onClick={() => onNavigateTab('files')}
          className="p-4 rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <FileCode className="w-4 h-4 text-zinc-900" />
            <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div className="text-xs font-bold text-zinc-900">Code Explorer</div>
          <p className="text-[11px] text-zinc-500 mt-0.5">Explore {totalFiles} source files</p>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 4. SUBSYSTEMS & COMPONENT DISTRIBUTION                                */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          onClick={() => onNavigateTab('files')}
          className="p-4 rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-xs transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium text-zinc-500">Files</span>
            <FileText className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl font-bold font-mono text-zinc-900">{totalFiles}</div>
        </div>

        <div
          onClick={() => onNavigateTab('files')}
          className="p-4 rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-xs transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium text-zinc-500">Folders</span>
            <Folder className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl font-bold font-mono text-zinc-900">{totalDirs}</div>
        </div>

        <div
          onClick={() => onNavigateTab('dependencies')}
          className="p-4 rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-xs transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium text-zinc-500">Packages</span>
            <Package className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl font-bold font-mono text-zinc-900">{dependencies.length}</div>
        </div>

        <div
          onClick={() => onNavigateTab('branches')}
          className="p-4 rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-xs transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium text-zinc-500">Branches</span>
            <GitBranch className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl font-bold font-mono text-zinc-900">
            {branches.length > 0 ? branches.length : 1}
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('database')}
          className="p-4 rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-xs transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium text-zinc-500">Database</span>
            <Database className="w-3.5 h-3.5" />
          </div>
          <div className="text-sm font-semibold text-zinc-900 truncate">
            {hasDatabase ? `${databaseSchema!.tables.length} tables` : 'Synthesized'}
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('security')}
          className="p-4 rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-xs transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium text-zinc-500">Security</span>
            <Shield className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl font-bold font-mono text-zinc-900">
            {securityFindings.length}
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 5. TOOLS & ENTRY POINTS + LANGUAGE COMPOSITION                         */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Ecosystem & Key Entry Points */}
        <div className="p-6 rounded-2xl border border-zinc-200 bg-white shadow-xs space-y-5">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 mb-3 flex items-center gap-2">
              <Code2 className="w-4 h-4 text-zinc-900" />
              <span>Tech Stack & Tools</span>
            </h3>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-semibold">Language</span>
                <span className="font-bold text-zinc-900">{metadata.language || 'Multi-language'}</span>
              </div>
              <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-semibold">Package Mgr</span>
                <span className="font-bold text-zinc-900">{ecosystem.packageManager}</span>
              </div>
              <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-semibold">Styling</span>
                <span className="font-bold text-zinc-900">{ecosystem.styling}</span>
              </div>
              <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-semibold">Test Runner</span>
                <span className="font-bold text-zinc-900">{ecosystem.testing}</span>
              </div>
            </div>
          </div>

          {/* Primary Entry Points */}
          <div className="pt-4 border-t border-zinc-100">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block mb-2 font-semibold">
              Starting Files
            </span>
            {entryPoints.length > 0 ? (
              <div className="space-y-1.5">
                {entryPoints.map((entry) => (
                  <div
                    key={entry}
                    onClick={() => {
                      if (onOpenFile) onOpenFile(entry);
                      else onNavigateTab('files');
                    }}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 hover:border-zinc-300 cursor-pointer text-xs font-mono text-zinc-800 transition-all shadow-2xs group"
                    title="Click to view file source code"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileCode className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-900 shrink-0" />
                      <span className="font-semibold truncate">{entry}</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-900 shrink-0 transition-colors" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-500 font-mono">No default entry point detected.</p>
            )}
          </div>
        </div>

        {/* Languages Breakdown */}
        <div className="p-6 rounded-2xl border border-zinc-200 bg-white shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-zinc-900 mb-2 flex items-center gap-2">
            <Layers className="w-4 h-4 text-zinc-900" />
            <span>Codebase Language Distribution</span>
          </h3>

          <div className="space-y-3 pt-1">
            {Object.entries(languages)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 6)
              .map(([lang, count]) => {
                const pct = Math.round((count / Math.max(1, totalFiles)) * 100);
                return (
                  <div key={lang} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-zinc-900">{lang}</span>
                      <span className="text-zinc-500 font-mono">
                        {count} {count === 1 ? 'file' : 'files'} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200">
                      <div
                        className="h-full bg-zinc-900 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(3, pct))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>

          <div className="pt-4 border-t border-zinc-100 flex items-center justify-between text-xs font-mono text-zinc-500">
            <span>Total Inspected Files:</span>
            <span className="font-bold text-zinc-900">{totalFiles}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
