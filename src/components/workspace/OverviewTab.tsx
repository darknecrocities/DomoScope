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
} from 'lucide-react';
import { RepoAnalysis, DatabaseSchema, RepoDependency, SecurityFinding, BranchInfo } from '../../types';
import { WorkspaceTab } from '../layout/Sidebar';

interface OverviewTabProps {
  analysis: RepoAnalysis;
  databaseSchema?: DatabaseSchema | null;
  dependencies: RepoDependency[];
  branches: BranchInfo[];
  securityFindings: SecurityFinding[];
  onNavigateTab: (tab: WorkspaceTab) => void;
}

export function OverviewTab({
  analysis,
  databaseSchema,
  dependencies,
  branches,
  securityFindings,
  onNavigateTab,
}: OverviewTabProps) {
  const { metadata, totalFiles, totalDirs, languages, detectedTools, entryPoints } = analysis;
  const hasDatabase = databaseSchema && databaseSchema.tables.length > 0;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-150">
      {/* Top Header Card */}
      <div className="p-6 rounded-xl border border-zinc-200 bg-white shadow-xs">
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
              {metadata.description}
            </p>
          </div>

          <a
            href={metadata.htmlUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-xs font-medium text-zinc-700 transition-colors shrink-0 self-start"
          >
            <span>GitHub</span>
            <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
          </a>
        </div>

        {/* Project Summary */}
        <div className="mt-6 pt-5 border-t border-zinc-100">
          <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 block mb-1.5">
            Project Summary
          </span>
          <p className="text-xs sm:text-sm text-zinc-800 leading-relaxed font-sans">
            {analysis.summary}
          </p>
        </div>
      </div>

      {/* Quick Metrics Grid */}
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
            {hasDatabase ? `${databaseSchema!.tables.length} tables` : 'None'}
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

      {/* Two Column Section: Tools & Entry Points + Languages */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Detected Tools & Technologies */}
        <div className="p-6 rounded-xl border border-zinc-200 bg-white shadow-xs">
          <h3 className="text-sm font-semibold text-zinc-900 mb-4 flex items-center gap-2">
            <Code2 className="w-4 h-4 text-zinc-600" />
            <span>Detected Technologies & Tools</span>
          </h3>

          {detectedTools.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {detectedTools.map((tool) => (
                <span
                  key={tool}
                  className="px-2.5 py-1 rounded-md border border-zinc-200 bg-zinc-50 text-xs font-medium text-zinc-800"
                >
                  {tool}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-500">Primary language: {metadata.language}</p>
          )}

          {/* Primary Entry Points */}
          <div className="mt-6 pt-5 border-t border-zinc-100">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 block mb-2">
              Primary Entry Points
            </span>
            {entryPoints.length > 0 ? (
              <div className="space-y-1.5">
                {entryPoints.map((entry) => (
                  <div
                    key={entry}
                    onClick={() => onNavigateTab('files')}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-zinc-50 hover:bg-zinc-100 cursor-pointer text-xs font-mono text-zinc-800 transition-colors"
                  >
                    <span>{entry}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-500 font-mono">No default entry point detected.</p>
            )}
          </div>
        </div>

        {/* Languages Breakdown */}
        <div className="p-6 rounded-xl border border-zinc-200 bg-white shadow-xs">
          <h3 className="text-sm font-semibold text-zinc-900 mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-zinc-600" />
            <span>Language Composition</span>
          </h3>

          <div className="space-y-3">
            {Object.entries(languages)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 6)
              .map(([lang, count]) => {
                const pct = Math.round((count / Math.max(1, totalFiles)) * 100);
                return (
                  <div key={lang} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-zinc-800">{lang}</span>
                      <span className="text-zinc-500 font-mono">
                        {count} files ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-zinc-800 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(4, pct))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
