import { useState, useMemo } from 'react';
import { Database, Key, ArrowRight, FileCode, Search, Copy, Check, TableProperties, Network } from 'lucide-react';
import { DatabaseSchema } from '../../types';
import { EmptyState } from '../common/EmptyState';

interface DatabaseERDProps {
  schema?: DatabaseSchema | null;
  onOpenFile: (path: string) => void;
}

export function DatabaseERD({ schema, onOpenFile }: DatabaseERDProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'relationships'>('grid');
  const [copied, setCopied] = useState(false);

  const tables = useMemo(() => schema?.tables || [], [schema]);
  const relationships = useMemo(() => schema?.relationships || [], [schema]);

  const filteredTables = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return tables;
    return tables.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.columns.some((c) => c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q))
    );
  }, [tables, searchQuery]);

  const handleCopyMermaidERD = () => {
    let mermaid = 'erDiagram\n';
    for (const table of tables) {
      mermaid += `  ${table.name} {\n`;
      for (const col of table.columns) {
        const typeStr = col.type.replace(/[^a-zA-Z0-9_]/g, '') || 'string';
        const keyIndicator = col.isPrimary ? 'PK' : col.isForeignKey ? 'FK' : '';
        mermaid += `    ${typeStr} ${col.name} ${keyIndicator}\n`;
      }
      mermaid += '  }\n';
    }

    for (const rel of relationships) {
      mermaid += `  ${rel.fromTable} }|..|{ ${rel.toTable} : "${rel.fromColumn} -> ${rel.toColumn}"\n`;
    }

    navigator.clipboard.writeText(mermaid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!schema || tables.length === 0) {
    return (
      <EmptyState
        icon={Database}
        title="No database detected"
        description="No database structure was found in this project. DomoScope automatically detects Prisma, SQL DDL migrations, Drizzle, Django models, and TypeScript entity schemas."
      />
    );
  }

  return (
    <div className="h-full flex flex-col bg-zinc-50 overflow-hidden font-sans">
      {/* Top Database Sub-header */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-3 bg-white border-b border-zinc-200 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-zinc-900" />
            <h2 className="text-sm font-bold text-zinc-900">Entity Relationship Diagram</h2>
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded border border-zinc-200 bg-zinc-50 text-zinc-700 font-semibold">
            {tables.length} tables
          </span>
          <span className="text-xs font-mono px-2 py-0.5 rounded border border-zinc-200 bg-zinc-50 text-zinc-700 font-semibold">
            {relationships.length} connections
          </span>
          {schema.detectedTypes.map((t) => (
            <span
              key={t}
              className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-white font-bold"
            >
              {t}
            </span>
          ))}
        </div>

        {/* Right Tools: View Toggle, Search, Export */}
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-zinc-100 p-0.5 rounded-xl border border-zinc-200 text-xs font-mono">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-zinc-900 font-bold shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <TableProperties className="w-3.5 h-3.5" />
              <span>Tables</span>
            </button>
            <button
              onClick={() => setViewMode('relationships')}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'relationships'
                  ? 'bg-white text-zinc-900 font-bold shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Relations ({relationships.length})</span>
            </button>
          </div>

          {/* Copy Mermaid ERD */}
          <button
            onClick={handleCopyMermaidERD}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            title="Copy Mermaid.js ERD schema definition"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Export ERD'}</span>
          </button>

          {/* Search Tables */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs w-44">
            <Search className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter tables & fields..."
              className="w-full bg-transparent outline-none text-zinc-800 placeholder:text-zinc-400 font-mono text-xs"
            />
          </div>
        </div>
      </div>

      {/* Main ERD Surface */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
              {filteredTables.map((table) => {
                const isSelected = selectedTable === table.name;
                const relatedRels = relationships.filter(
                  (r) => r.fromTable === table.name || r.toTable === table.name
                );

                return (
                  <div
                    key={table.name}
                    onClick={() => setSelectedTable(isSelected ? null : table.name)}
                    className={`rounded-2xl border bg-white shadow-xs overflow-hidden transition-all cursor-pointer ${
                      isSelected
                        ? 'border-zinc-900 ring-2 ring-zinc-900/10 shadow-md scale-[1.01]'
                        : 'border-zinc-200 hover:border-zinc-400'
                    }`}
                  >
                    {/* Table Header */}
                    <div className="px-4 py-3 bg-zinc-100/80 border-b border-zinc-200 flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <Database className="w-4 h-4 text-zinc-700 shrink-0" />
                        <span className="text-xs font-mono font-bold text-zinc-900 truncate">
                          {table.name}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500 bg-zinc-200/60 px-1.5 py-0.2 rounded">
                          {table.columns.length}
                        </span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenFile(table.sourceFile);
                        }}
                        className="p-1 text-zinc-400 hover:text-zinc-900 rounded-lg hover:bg-zinc-200 transition-colors"
                        title={`View definition in ${table.sourceFile}`}
                      >
                        <FileCode className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Columns List */}
                    <div className="divide-y divide-zinc-100 max-h-72 overflow-y-auto">
                      {table.columns.map((col) => (
                        <div
                          key={col.name}
                          className="px-4 py-2 flex items-center justify-between text-xs font-mono hover:bg-zinc-50 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {col.isPrimary ? (
                              <span
                                className="w-4 h-4 rounded bg-zinc-900 text-white flex items-center justify-center text-[9px] font-bold shrink-0"
                                title="Primary Key"
                              >
                                PK
                              </span>
                            ) : col.isForeignKey ? (
                              <span
                                className="w-4 h-4 rounded bg-zinc-200 text-zinc-800 flex items-center justify-center text-[9px] font-bold shrink-0 border border-zinc-300"
                                title={`Foreign Key: ${col.references?.table || 'Inferred'}`}
                              >
                                FK
                              </span>
                            ) : (
                              <span className="w-4 shrink-0 text-zinc-300 text-center">•</span>
                            )}
                            <span
                              className={`truncate ${
                                col.isPrimary
                                  ? 'font-bold text-zinc-900'
                                  : col.isForeignKey
                                  ? 'font-semibold text-zinc-800'
                                  : 'text-zinc-700'
                              }`}
                            >
                              {col.name}
                            </span>
                          </div>

                          <span className="text-[11px] text-zinc-400 font-mono shrink-0 ml-2">
                            {col.type}
                            {col.isNullable ? '?' : ''}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Table Footer: Connections */}
                    {relatedRels.length > 0 && (
                      <div className="px-4 py-2 bg-zinc-50 border-t border-zinc-200 text-[11px] font-mono text-zinc-600 flex items-center justify-between">
                        <span>Connected to:</span>
                        <div className="flex items-center gap-1">
                          {Array.from(
                            new Set(
                              relatedRels.map((r) =>
                                r.fromTable === table.name ? r.toTable : r.fromTable
                              )
                            )
                          ).slice(0, 3).map((target) => (
                            <span
                              key={target}
                              className="px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-800 font-medium"
                            >
                              {target}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Relationships View Section */}
          {viewMode === 'relationships' && (
            <div className="p-6 bg-white border border-zinc-200 rounded-2xl shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-600">
                  Detected Table Relationships ({relationships.length})
                </h3>
                <span className="text-xs font-mono text-zinc-500">
                  Foreign key connections between domain models
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {relationships.map((rel) => (
                  <div
                    key={rel.id}
                    className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between text-xs font-mono"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-bold text-zinc-900 truncate">
                        {rel.fromTable}.{rel.fromColumn}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span className="font-bold text-zinc-900 truncate">
                        {rel.toTable}.{rel.toColumn}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-mono shrink-0 ml-2 font-bold ${
                        rel.isInferred
                          ? 'border border-dashed border-zinc-400 text-zinc-600'
                          : 'bg-zinc-900 text-white'
                      }`}
                    >
                      {rel.isInferred ? 'Inferred' : 'Explicit'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
