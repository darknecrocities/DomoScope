import { useState } from 'react';
import { GitBranch, GitCompare, Check, ArrowRight, Database, Network, RefreshCw } from 'lucide-react';
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
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);

  if (branches.length === 0) {
    return (
      <EmptyState
        icon={GitBranch}
        title="No additional branches"
        description="Only the default branch was found or branches could not be retrieved from GitHub."
      />
    );
  }

  const handleSwitch = (branchName: string) => {
    setSwitchingTo(branchName);
    onSelectBranch(branchName);
    // Reset switching feedback after animation settles
    setTimeout(() => {
      setSwitchingTo(null);
    }, 1500);
  };

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
    <div className="h-full flex flex-col bg-zinc-50/50 overflow-auto p-6 md:p-8 font-sans select-none">
      <div className="max-w-5xl mx-auto w-full space-y-6">
        {/* Branch List Section */}
        <div className="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-zinc-900 text-white flex items-center justify-center shadow-xs">
                <GitBranch className="w-4 h-4 stroke-[2]" />
              </div>
              <div>
                <h2 className="text-base font-bold text-zinc-950">Branches ({branches.length})</h2>
                <p className="text-xs text-zinc-500 font-mono">Inspect and shift between git branches</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-100 border border-zinc-200 rounded-xl text-xs font-mono text-zinc-700">
              <span className="text-zinc-400">Active:</span>
              <strong className="text-zinc-950">{currentBranch}</strong>
            </div>
          </div>

          <div className="divide-y divide-zinc-100">
            {branches.map((b) => {
              const isCurrent = b.name === currentBranch;
              const isPending = switchingTo === b.name;

              return (
                <div
                  key={b.name}
                  className={`px-6 py-3.5 flex items-center justify-between transition-colors ${
                    isCurrent ? 'bg-zinc-50/70' : 'hover:bg-zinc-50/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <GitBranch className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-zinc-900 stroke-[2.5]' : 'text-zinc-400'}`} />
                    <span className={`text-sm font-mono truncate ${isCurrent ? 'font-bold text-zinc-950' : 'font-medium text-zinc-700'}`}>
                      {b.name}
                    </span>
                    {b.isDefault && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-100 border border-zinc-200 text-zinc-600 font-semibold">
                        default
                      </span>
                    )}
                    {isCurrent && (
                      <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-lg bg-zinc-900 text-white flex items-center gap-1 font-bold shadow-2xs">
                        <Check className="w-3 h-3 stroke-[2.5]" /> active
                      </span>
                    )}
                  </div>

                  {!isCurrent && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleSwitch(b.name)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-zinc-100 border border-zinc-300 rounded-xl text-xs font-semibold text-zinc-900 transition-all cursor-pointer shadow-2xs hover:shadow-xs disabled:opacity-50"
                    >
                      {isPending ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin text-zinc-900" />
                          <span>Switching...</span>
                        </>
                      ) : (
                        <span>Switch & Inspect</span>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Branch Comparison & Impact Section */}
        <div className="bg-white border border-zinc-200 rounded-2xl shadow-xs p-6 space-y-6">
          <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-100">
            <div className="w-8 h-8 rounded-xl bg-zinc-100 text-zinc-900 flex items-center justify-center border border-zinc-200">
              <GitCompare className="w-4 h-4 stroke-[2]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-950">Branch Diff & Architectural Impact</h3>
              <p className="text-xs text-zinc-500 font-mono">Analyze code changes and downstream impacts between branches</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 w-full">
              <label className="block text-[11px] font-mono font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                Base Branch
              </label>
              <select
                value={baseBranch}
                onChange={(e) => setBaseBranch(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-mono bg-zinc-50 border border-zinc-300 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 cursor-pointer"
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
              <label className="block text-[11px] font-mono font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                Compare Branch
              </label>
              <select
                value={headBranch}
                onChange={(e) => setHeadBranch(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-mono bg-zinc-50 border border-zinc-300 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 cursor-pointer"
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
                type="button"
                onClick={handleCompare}
                disabled={isComparing || baseBranch === headBranch}
                className="w-full sm:w-auto px-5 py-2 bg-zinc-900 hover:bg-black disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs shrink-0 flex items-center justify-center gap-2"
              >
                {isComparing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Comparing...</span>
                  </>
                ) : (
                  <span>Compare & Impact Analysis</span>
                )}
              </button>
            </div>
          </div>

          {compareError && (
            <p className="text-xs text-rose-700 bg-rose-50/80 p-3.5 rounded-xl border border-rose-200 font-medium font-mono">
              {compareError}
            </p>
          )}

          {/* Comparison Output */}
          {comparison && (
            <div className="space-y-6 pt-4 border-t border-zinc-100 animate-in fade-in">
              <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
                <span className="px-3 py-1.5 bg-zinc-100 text-zinc-900 border border-zinc-300 rounded-xl font-medium">
                  Ahead: <strong className="font-bold">{comparison.aheadBy}</strong> commits
                </span>
                <span className="px-3 py-1.5 bg-zinc-50 text-zinc-700 border border-zinc-200 rounded-xl font-medium">
                  Behind: <strong className="font-bold">{comparison.behindBy}</strong> commits
                </span>
              </div>

              {/* Change Impact Analysis Box */}
              <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-950">
                  <Network className="w-4 h-4 text-zinc-900" />
                  <span>Downstream Architectural Change Impact:</span>
                </div>
                <p className="text-xs text-zinc-700 font-sans leading-relaxed">
                  Modifying {comparison.filesModified.length} file(s) potentially affects downstream architecture components dependent on these modules.
                </p>
              </div>

              {comparison.databaseChanges.length > 0 && (
                <div className="p-3.5 bg-zinc-50 border border-zinc-300 rounded-xl flex items-center gap-2 text-xs font-mono text-zinc-900 font-medium">
                  <Database className="w-4 h-4 text-zinc-900 shrink-0" />
                  <span>
                    Database schema changes detected in: {comparison.databaseChanges.join(', ')}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                {/* Added */}
                <div className="p-4 bg-zinc-50/60 rounded-xl border border-zinc-200">
                  <div className="font-bold text-zinc-900 mb-2 flex items-center justify-between">
                    <span>Files Added</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-zinc-200 rounded font-bold">
                      {comparison.filesAdded.length}
                    </span>
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
                <div className="p-4 bg-zinc-50/60 rounded-xl border border-zinc-200">
                  <div className="font-bold text-zinc-900 mb-2 flex items-center justify-between">
                    <span>Files Modified</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-zinc-200 rounded font-bold">
                      {comparison.filesModified.length}
                    </span>
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
                <div className="p-4 bg-zinc-50/60 rounded-xl border border-zinc-200">
                  <div className="font-bold text-zinc-900 mb-2 flex items-center justify-between">
                    <span>Files Removed</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-zinc-200 rounded font-bold">
                      {comparison.filesRemoved.length}
                    </span>
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
