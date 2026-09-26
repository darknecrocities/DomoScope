import { useState } from 'react';
import { Package, Search, ExternalLink, FileCode } from 'lucide-react';
import { RepoDependency } from '../../types';
import { EmptyState } from '../common/EmptyState';

interface DependenciesTabProps {
  dependencies: RepoDependency[];
  onOpenFile: (path: string) => void;
}

export function DependenciesTab({ dependencies, onOpenFile }: DependenciesTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'prod' | 'dev'>('all');

  if (dependencies.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="No dependencies detected"
        description="No dependency manifest files (package.json, requirements.txt, go.mod, Cargo.toml) were found in this repository."
      />
    );
  }

  const prodCount = dependencies.filter((d) => !d.isDev).length;
  const devCount = dependencies.filter((d) => d.isDev).length;

  const filtered = dependencies.filter((dep) => {
    if (filterType === 'prod' && dep.isDev) return false;
    if (filterType === 'dev' && !dep.isDev) return false;
    if (searchQuery.trim() && !dep.name.toLowerCase().includes(searchQuery.toLowerCase().trim())) {
      return false;
    }
    return true;
  });

  return (
    <div className="h-full flex flex-col bg-zinc-50 overflow-hidden">
      {/* Top Header & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-3 bg-white border-b border-zinc-200">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-zinc-700" />
            <h2 className="text-sm font-semibold text-zinc-900">Dependencies</h2>
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded border border-zinc-200 bg-zinc-50 text-zinc-600">
            {dependencies.length} total
          </span>

          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2 py-0.5 rounded text-xs font-mono transition-colors cursor-pointer ${
                filterType === 'all' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              All ({dependencies.length})
            </button>
            <button
              onClick={() => setFilterType('prod')}
              className={`px-2 py-0.5 rounded text-xs font-mono transition-colors cursor-pointer ${
                filterType === 'prod' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              Runtime ({prodCount})
            </button>
            <button
              onClick={() => setFilterType('dev')}
              className={`px-2 py-0.5 rounded text-xs font-mono transition-colors cursor-pointer ${
                filterType === 'dev' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              Dev ({devCount})
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-50 border border-zinc-200 rounded-lg text-xs w-48">
          <Search className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search packages..."
            className="w-full bg-transparent outline-none text-zinc-800 placeholder:text-zinc-400 font-mono text-xs"
          />
        </div>
      </div>

      {/* Dependencies Table List */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto bg-white border border-zinc-200 rounded-xl shadow-xs overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/70 text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
                <th className="py-2.5 px-4">Package</th>
                <th className="py-2.5 px-4">Version</th>
                <th className="py-2.5 px-4">Scope</th>
                <th className="py-2.5 px-4">Code Usages</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-xs">
              {filtered.map((dep) => (
                <tr key={`${dep.name}-${dep.manifestPath}`} className="hover:bg-zinc-50/50 transition-colors">
                  <td className="py-3 px-4 font-mono font-medium text-zinc-900">
                    <div className="flex items-center gap-2">
                      <span>{dep.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded border border-zinc-200 bg-zinc-50 text-zinc-500 uppercase">
                        {dep.ecosystem}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-zinc-600">
                    {dep.version}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                        dep.isDev ? 'bg-zinc-100 text-zinc-600' : 'bg-zinc-200 text-zinc-900 font-medium'
                      }`}
                    >
                      {dep.isDev ? 'Dev' : 'Runtime'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {dep.usedInFiles.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {dep.usedInFiles.slice(0, 3).map((filePath) => (
                          <button
                            key={filePath}
                            onClick={() => onOpenFile(filePath)}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded text-[11px] font-mono text-zinc-700 transition-colors cursor-pointer"
                            title={filePath}
                          >
                            <FileCode className="w-3 h-3 text-zinc-400" />
                            <span>{filePath.split('/').pop()}</span>
                          </button>
                        ))}
                        {dep.usedInFiles.length > 3 && (
                          <span className="text-[10px] font-mono text-zinc-400 self-center">
                            +{dep.usedInFiles.length - 3} more
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[11px] text-zinc-400 italic">No direct import found</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
