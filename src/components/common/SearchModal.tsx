import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, FileCode, Folder, Database, Package, X } from 'lucide-react';
import { RepoFile, DatabaseSchema, RepoDependency, SearchItem } from '../../types';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: RepoFile[];
  databaseSchema?: DatabaseSchema | null;
  dependencies?: RepoDependency[];
  onSelectFile?: (path: string) => void;
  onNavigateTab?: (tab: string) => void;
}

export function SearchModal({
  isOpen,
  onClose,
  files,
  databaseSchema,
  dependencies,
  onSelectFile,
  onNavigateTab,
}: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const allItems: SearchItem[] = useMemo(() => {
    const items: SearchItem[] = [];

    // Files
    for (const f of files) {
      items.push({
        id: `file-${f.path}`,
        title: f.name,
        subtitle: f.path,
        type: f.type === 'tree' ? 'folder' : 'file',
        path: f.path,
        category: f.category,
      });
    }

    // Database tables
    if (databaseSchema?.tables) {
      for (const t of databaseSchema.tables) {
        items.push({
          id: `db-${t.name}`,
          title: t.name,
          subtitle: `${t.columns.length} columns in ${t.sourceFile}`,
          type: 'database',
          path: t.sourceFile,
        });
      }
    }

    // Dependencies
    if (dependencies) {
      for (const d of dependencies) {
        items.push({
          id: `dep-${d.name}`,
          title: d.name,
          subtitle: `v${d.version} (${d.ecosystem})`,
          type: 'dependency',
        });
      }
    }

    return items;
  }, [files, databaseSchema, dependencies]);

  const filteredItems = useMemo(() => {
    if (!query.trim()) {
      return allItems.slice(0, 20);
    }
    const q = query.toLowerCase().trim();
    return allItems
      .filter((item) => item.title.toLowerCase().includes(q) || item.subtitle.toLowerCase().includes(q))
      .slice(0, 25);
  }, [allItems, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems]);

  const handleSelect = (item: SearchItem) => {
    if (item.type === 'file' && item.path) {
      if (onSelectFile) onSelectFile(item.path);
      if (onNavigateTab) onNavigateTab('files');
    } else if (item.type === 'database') {
      if (onNavigateTab) onNavigateTab('database');
    } else if (item.type === 'dependency') {
      if (onNavigateTab) onNavigateTab('dependencies');
    }
    onClose();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          handleSelect(filteredItems[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/40 backdrop-blur-xs">
      <div className="w-full max-w-xl bg-white border border-zinc-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in duration-150">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-zinc-200 gap-3">
          <Search className="w-4 h-4 text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files, tables, dependencies..."
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-zinc-400 text-zinc-900"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-zinc-400 hover:text-zinc-600 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 bg-zinc-100 border border-zinc-200 rounded">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-transparent">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-500">
              No results found matching "{query}"
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    isSelected ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {item.type === 'file' && <FileCode className="w-4 h-4 text-zinc-400 shrink-0" />}
                    {item.type === 'folder' && <Folder className="w-4 h-4 text-zinc-400 shrink-0" />}
                    {item.type === 'database' && <Database className="w-4 h-4 text-zinc-400 shrink-0" />}
                    {item.type === 'dependency' && <Package className="w-4 h-4 text-zinc-400 shrink-0" />}

                    <div className="truncate">
                      <div className="text-xs font-medium text-zinc-900 truncate">{item.title}</div>
                      <div className="text-[11px] text-zinc-500 truncate font-mono">{item.subtitle}</div>
                    </div>
                  </div>

                  <span className="text-[10px] text-zinc-400 font-mono capitalize shrink-0 ml-2">
                    {item.type}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="font-mono bg-white px-1 py-0.5 border border-zinc-200 rounded">↑</kbd>{' '}
              <kbd className="font-mono bg-white px-1 py-0.5 border border-zinc-200 rounded">↓</kbd> navigate
            </span>
            <span>
              <kbd className="font-mono bg-white px-1 py-0.5 border border-zinc-200 rounded">↵</kbd> select
            </span>
          </div>
          <span>{filteredItems.length} items</span>
        </div>
      </div>
    </div>
  );
}
