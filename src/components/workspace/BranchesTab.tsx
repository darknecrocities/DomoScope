import { useState } from 'react';
import { GitBranch, GitCompare, Check, ArrowRight, Database, Network } from 'lucide-react';
import { BranchInfo, BranchComparison } from '../../types';
import { GitHubService } from '../../services/github';
import { EmptyState } from '../common/EmptyState';

interface BranchesTabProps {
  owner: string;
  repo: string;
  currentBranch: string;
  branches: BranchInfo[];
  onSelectBranch: (branch: string) => void;
}

export function BranchesTab({
  owner,
  repo,
  currentBranch,
  branches,
  onSelectBranch,
}: BranchesTabProps) {
  const [baseBranch, setBaseBranch] = useState(currentBranch || (branches[0]?.name ?? 'main'));
  const [headBranch, setHeadBranch] = useState(
    branches.find((b) => b.name !== currentBranch)?.name || currentBranch
  );
  const [comparison, setComparison] = useState<BranchComparison | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);

  if (branches.length === 0) {
    return (
      <EmptyState
        icon={GitBranch}
        title="No additional branches"
        description="Only the default branch was found or branches could not be retrieved from GitHub."
      />
    );
  }

  const handleCompare = async () => {
    if (!baseBranch || !headBranch) return;
    setIsComparing(true);
    setCompareError(null);
    try {
      const result = await GitHubService.compareBranches(owner, repo, baseBranch, headBranch);
      setComparison(result);
    } catch (err: any) {
      setCompareError(err?.message || 'Failed to compare branches.');
    } finally {
      setIsComparing(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50/50 overflow-auto p-6 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto w-full space-y-8">
        {/* Branch List Section */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900">Branches ({branches.length})</h2>
            </div>
            <span className="text-xs text-slate-500 font-mono">Active: {currentBranch}</span>
          </div>

          <div className="divide-y divide-slate-100">
            {branches.map((b) => {
              const isCurrent = b.name === currentBranch;
              return (
                <div
                  key={b.name}
                  className="px-6 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <GitBranch className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-sm font-mono font-semibold text-slate-800 truncate">
                      {b.name}
                    </span>
                    {b.isDefault && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                        default
                      </span>
                    )}
                    {isCurrent && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-600 text-white flex items-center gap-1 font-semibold">
                        <Check className="w-3 h-3" /> active
                      </span>
                    )}
                  </div>

                  {!isCurrent && (
                    <button
                      onClick={() => onSelectBranch(b.name)}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-colors cursor-pointer shadow-xs"
                    >
                      Switch & Inspect
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Branch Comparison & Impact Section */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <GitCompare className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900">Branch Diff & Change Impact Visualizer</h3>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 w-full">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Base Branch
              </label>
              <select
                value={baseBranch}
                onChange={(e) => setBaseBranch(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {branches.map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.name} {b.isDefault ? '(default)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <ArrowRight className="w-4 h-4 text-slate-400 mt-5 hidden sm:block shrink-0" />

            <div className="flex-1 w-full">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Compare Branch
              </label>
              <select
                value={headBranch}
                onChange={(e) => setHeadBranch(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {branches.map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full sm:w-auto mt-0 sm:mt-5">
              <button
                onClick={handleCompare}
                disabled={isComparing || baseBranch === headBranch}
                className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-sm shrink-0"
              >
                {isComparing ? 'Comparing Diff...' : 'Compare & Impact Analysis'}
              </button>
            </div>
          </div>

          {compareError && (
            <p className="text-xs text-rose-600 bg-rose-50 p-3.5 rounded-xl border border-rose-200 font-medium">
              {compareError}
            </p>
          )}

          {/* Comparison Output */}
          {comparison && (
            <div className="space-y-6 pt-4 border-t border-slate-100 animate-in fade-in">
              <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
                <span className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl font-medium">
                  Ahead: <strong>{comparison.aheadBy}</strong> commits
                </span>
                <span className="px-3 py-1.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-medium">
                  Behind: <strong>{comparison.behindBy}</strong> commits
                </span>
              </div>

              {/* Change Impact Analysis Box */}
              <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                  <Network className="w-4 h-4 text-blue-600" />
                  <span>Downstream Architectural Change Impact:</span>
                </div>
                <p className="text-xs text-slate-600">
                  Modifying {comparison.filesModified.length} file(s) potentially affects downstream architecture components dependent on these modules.
                </p>
              </div>

              {comparison.databaseChanges.length > 0 && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs font-mono text-amber-900 font-medium">
                  <Database className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Database schema changes detected in: {comparison.databaseChanges.join(', ')}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                {/* Added */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="font-bold text-emerald-700 mb-2">
                    Files Added ({comparison.filesAdded.length})
                  </div>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {comparison.filesAdded.length === 0 ? (
                      <span className="text-slate-400 italic">None</span>
                    ) : (
                      comparison.filesAdded.map((f) => (
                        <div key={f} className="truncate text-slate-700" title={f}>
                          + {f}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Modified */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="font-bold text-blue-700 mb-2">
                    Files Modified ({comparison.filesModified.length})
                  </div>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {comparison.filesModified.length === 0 ? (
                      <span className="text-slate-400 italic">None</span>
                    ) : (
                      comparison.filesModified.map((f) => (
                        <div key={f} className="truncate text-slate-700" title={f}>
                          ~ {f}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Removed */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="font-bold text-rose-700 mb-2">
                    Files Removed ({comparison.filesRemoved.length})
                  </div>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {comparison.filesRemoved.length === 0 ? (
                      <span className="text-slate-400 italic">None</span>
                    ) : (
                      comparison.filesRemoved.map((f) => (
                        <div key={f} className="truncate text-slate-700" title={f}>
                          - {f}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
