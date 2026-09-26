import { useState } from 'react';
import { Database, Key, ArrowRight, FileCode, Search } from 'lucide-react';
import { DatabaseSchema, DatabaseTable } from '../../types';
import { EmptyState } from '../common/EmptyState';

interface DatabaseERDProps {
  schema?: DatabaseSchema | null;
  onOpenFile: (path: string) => void;
}

export function DatabaseERD({ schema, onOpenFile }: DatabaseERDProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  if (!schema || schema.tables.length === 0) {
    return (
      <EmptyState
        icon={Database}
        title="No database detected"
        description="No database structure was found in this project. DomoScope automatically detects Prisma, SQL DDL migrations, and Drizzle schemas."
      />
    );
  }

  const filteredTables = schema.tables.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <div className="h-full flex flex-col bg-zinc-50 overflow-hidden">
      {/* Top Database Sub-header */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-3 bg-white border-b border-zinc-200">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-zinc-700" />
            <h2 className="text-sm font-semibold text-zinc-900">Entity Relationship Diagram</h2>
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded border border-zinc-200 bg-zinc-50 text-zinc-600">
            {schema.tables.length} tables
          </span>
          {schema.detectedTypes.map((t) => (
            <span
              key={t}
              className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-white"
            >
              {t}
            </span>
          ))}
        </div>

        {/* Search Tables */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-50 border border-zinc-200 rounded-lg text-xs w-48">
          <Search className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tables..."
            className="w-full bg-transparent outline-none text-zinc-800 placeholder:text-zinc-400 font-mono text-xs"
          />
        </div>
      </div>

      {/* Main ERD Surface */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Tables Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
            {filteredTables.map((table) => {
              const isSelected = selectedTable === table.name;
              return (
                <div
                  key={table.name}
                  onClick={() => setSelectedTable(isSelected ? null : table.name)}
                  className={`rounded-xl border bg-white shadow-xs overflow-hidden transition-all cursor-pointer ${
                    isSelected
                      ? 'border-zinc-900 ring-2 ring-zinc-900/10 shadow-md'
                      : 'border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  {/* Table Header */}
                  <div className="px-4 py-2.5 bg-zinc-100/70 border-b border-zinc-200 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <Database className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                      <span className="text-xs font-mono font-bold text-zinc-900 truncate">
                        {table.name}
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenFile(table.sourceFile);
                      }}
                      className="p-1 text-zinc-400 hover:text-zinc-800 rounded transition-colors"
                      title={`View in ${table.sourceFile}`}
                    >
                      <FileCode className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Columns List */}
                  <div className="divide-y divide-zinc-100">
                    {table.columns.map((col) => (
                      <div
                        key={col.name}
                        className="px-4 py-1.5 flex items-center justify-between text-xs font-mono hover:bg-zinc-50 transition-colors"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          {col.isPrimary ? (
                            <span title="Primary Key">
                              <Key className="w-3 h-3 text-zinc-800 shrink-0" />
                            </span>
                          ) : col.isForeignKey ? (
                            <span
                              className="text-[9px] font-bold px-1 rounded bg-zinc-200 text-zinc-700"
                              title="Foreign Key"
                            >
                              FK
                            </span>
                          ) : (
                            <span className="w-3 shrink-0" />
                          )}
                          <span
                            className={`truncate ${
                              col.isPrimary ? 'font-semibold text-zinc-900' : 'text-zinc-700'
                            }`}
                          >
                            {col.name}
                          </span>
                        </div>

                        <span className="text-[11px] text-zinc-400 shrink-0 ml-2">
                          {col.type}
                          {col.isNullable ? '?' : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Relationships Table Section */}
          {schema.relationships.length > 0 && (
            <div className="p-6 bg-white border border-zinc-200 rounded-xl shadow-xs">
              <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-4">
                Detected Table Relationships ({schema.relationships.length})
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {schema.relationships.map((rel) => (
                  <div
                    key={rel.id}
                    className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg flex items-center justify-between text-xs font-mono"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-semibold text-zinc-800 truncate">
                        {rel.fromTable}.{rel.fromColumn}
                      </span>
                      <ArrowRight className="w-3 h-3 text-zinc-400 shrink-0" />
                      <span className="font-semibold text-zinc-800 truncate">
                        {rel.toTable}.{rel.toColumn}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0 ml-2 ${
                        rel.isInferred
                          ? 'border border-dashed border-zinc-300 text-zinc-500'
                          : 'bg-zinc-200 text-zinc-800'
                      }`}
                      title={
                        rel.isInferred
                          ? 'Relationship inferred from naming convention'
                          : 'Explicit foreign key reference in schema'
                      }
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
