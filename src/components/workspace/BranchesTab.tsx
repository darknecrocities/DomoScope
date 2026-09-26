import { useState } from 'react';
import { GitBranch, GitCompare, Check, ArrowRight, Database } from 'lucide-react';
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
    <div className="h-full flex flex-col bg-zinc-50 overflow-auto p-6 md:p-8">
      <div className="max-w-5xl mx-auto w-full space-y-8">
        {/* Branch List Section */}
        <div className="bg-white border border-zinc-200 rounded-xl shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-zinc-700" />
              <h2 className="text-sm font-semibold text-zinc-900">Branches ({branches.length})</h2>
            </div>
            <span className="text-xs text-zinc-500 font-mono">Current: {currentBranch}</span>
          </div>

          <div className="divide-y divide-zinc-100">
            {branches.map((b) => {
              const isCurrent = b.name === currentBranch;
              return (
                <div
                  key={b.name}
                  className="px-6 py-3 flex items-center justify-between hover:bg-zinc-50 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <GitBranch className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span className="text-xs font-mono font-medium text-zinc-900 truncate">
                      {b.name}
                    </span>
                    {b.isDefault && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-600">
                        default
                      </span>
                    )}
                    {isCurrent && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-900 text-white flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" /> active
                      </span>
                    )}
                  </div>

                  {!isCurrent && (
                    <button
                      onClick={() => onSelectBranch(b.name)}
                      className="px-2.5 py-1 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-md text-xs font-medium text-zinc-700 transition-colors cursor-pointer"
                    >
                      Switch & Inspect
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Branch Comparison Section */}
        <div className="bg-white border border-zinc-200 rounded-xl shadow-xs p-6 space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
            <GitCompare className="w-4 h-4 text-zinc-700" />
            <h3 className="text-sm font-semibold text-zinc-900">Branch Comparison</h3>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 w-full">
              <label className="block text-[11px] font-mono text-zinc-500 uppercase mb-1">
                Base Branch
              </label>
              <select
                value={baseBranch}
                onChange={(e) => setBaseBranch(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 outline-none"
              >
                {branches.map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.name} {b.isDefault ? '(default)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <ArrowRight className="w-4 h-4 text-zinc-400 mt-5 hidden sm:block shrink-0" />

            <div className="flex-1 w-full">
              <label className="block text-[11px] font-mono text-zinc-500 uppercase mb-1">
                Compare Branch
              </label>
              <select
                value={headBranch}
                onChange={(e) => setHeadBranch(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 outline-none"
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
                className="w-full sm:w-auto px-4 py-2 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0"
              >
                {isComparing ? 'Comparing...' : 'Compare Branches'}
              </button>
            </div>
          </div>

          {compareError && (
            <p className="text-xs text-zinc-600 bg-zinc-100 p-3 rounded-lg">{compareError}</p>
          )}

          {/* Comparison Output */}
          {comparison && (
            <div className="space-y-4 pt-4 border-t border-zinc-100 animate-in fade-in">
              <div className="flex items-center gap-4 text-xs font-mono">
                <span className="px-2 py-1 bg-zinc-100 rounded text-zinc-700">
                  Ahead by: <strong>{comparison.aheadBy}</strong> commits
                </span>
                <span className="px-2 py-1 bg-zinc-100 rounded text-zinc-700">
                  Behind by: <strong>{comparison.behindBy}</strong> commits
                </span>
              </div>

              {comparison.databaseChanges.length > 0 && (
                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg flex items-center gap-2 text-xs font-mono text-zinc-800">
                  <Database className="w-4 h-4 text-zinc-600 shrink-0" />
                  <span>
                    Database changes detected in {comparison.databaseChanges.join(', ')}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                {/* Added */}
                <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200">
                  <div className="font-semibold text-zinc-800 mb-2">
                    Files Added ({comparison.filesAdded.length})
                  </div>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {comparison.filesAdded.length === 0 ? (
                      <span className="text-zinc-400 italic">None</span>
                    ) : (
                      comparison.filesAdded.map((f) => (
                        <div key={f} className="truncate text-zinc-700" title={f}>
                          + {f}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Modified */}
                <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200">
                  <div className="font-semibold text-zinc-800 mb-2">
                    Files Modified ({comparison.filesModified.length})
                  </div>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {comparison.filesModified.length === 0 ? (
                      <span className="text-zinc-400 italic">None</span>
                    ) : (
                      comparison.filesModified.map((f) => (
                        <div key={f} className="truncate text-zinc-700" title={f}>
                          ~ {f}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Removed */}
                <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200">
                  <div className="font-semibold text-zinc-800 mb-2">
                    Files Removed ({comparison.filesRemoved.length})
                  </div>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {comparison.filesRemoved.length === 0 ? (
                      <span className="text-zinc-400 italic">None</span>
                    ) : (
                      comparison.filesRemoved.map((f) => (
                        <div key={f} className="truncate text-zinc-700" title={f}>
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
