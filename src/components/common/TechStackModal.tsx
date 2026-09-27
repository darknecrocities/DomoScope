import { useState, useMemo } from 'react';
import { X, Cpu, Layers, Database, Sparkles, Wrench, Globe, Search } from 'lucide-react';
import { RepoFile } from '../../types';
import { TechStackInspector, TechItem } from '../../services/techStackInspector';

interface TechStackModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: RepoFile[];
  fileContents: Map<string, string>;
}

export function TechStackModal({ isOpen, onClose, files, fileContents }: TechStackModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const report = useMemo(() => {
    return TechStackInspector.inspectRepository(files, fileContents);
  }, [files, fileContents]);

  const filteredItems = useMemo(() => {
    return report.items.filter((item) => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [report, selectedCategory, searchQuery]);

  if (!isOpen) return null;

  const categories = [
    { id: 'all', label: 'All Technologies', icon: Layers },
    { id: 'ai', label: 'AI & WebLLM', icon: Sparkles },
    { id: 'framework', label: 'Frameworks & Core', icon: Cpu },
    { id: 'database', label: 'Database & Storage', icon: Database },
    { id: 'ui', label: 'UI & Motion', icon: Layers },
    { id: 'tooling', label: 'Build & Tooling', icon: Wrench },
    { id: 'cloud_api', label: 'APIs & Services', icon: Globe },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white border border-zinc-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-zinc-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-zinc-800 rounded-lg border border-zinc-700">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight">Tech Stack & Architecture Services</h2>
              <p className="text-xs text-zinc-400 font-mono">
                Dynamically parsed from {report.projectName} ({report.totalDependencies} detected dependencies)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar & Search */}
        <div className="p-4 border-b border-zinc-200 bg-zinc-50 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium font-mono transition-colors shrink-0 cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-zinc-900 text-white shadow-2xs'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs w-full sm:w-56 shadow-2xs">
            <Search className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tech stack..."
              className="bg-transparent outline-none w-full text-zinc-800 placeholder:text-zinc-400 font-mono text-xs"
            />
          </div>
        </div>

        {/* Tech Items List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-zinc-50/50">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 font-mono text-xs">
              No matching technologies or packages found.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredItems.map((item) => (
                <div
                  key={item.name}
                  className="p-3.5 bg-white border border-zinc-200/80 rounded-xl shadow-2xs hover:border-zinc-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-mono font-semibold text-xs text-zinc-900 truncate">
                        {item.name}
                      </span>
                      {item.version && (
                        <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-[10px] font-mono font-medium text-zinc-600 border border-zinc-200 shrink-0">
                          v{item.version}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-600 leading-relaxed mb-3">
                      {item.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 pt-2 border-t border-zinc-100">
                    <span className="capitalize px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 font-medium">
                      {item.category.replace('_', ' ')}
                    </span>
                    <span>Source: {item.sourceFile}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-white border-t border-zinc-200 flex items-center justify-between text-xs font-mono text-zinc-500">
          <span>{filteredItems.length} technologies displayed</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
