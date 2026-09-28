import { useState, useMemo } from 'react';
import { X, Database, Key, Link2, FileCode, Copy, Check, ArrowRight, CornerDownRight } from 'lucide-react';
import { DatabaseTable, TableRelationship } from '../../types';

interface DatabaseInspectorDrawerProps {
  table: DatabaseTable | null;
  relationships: TableRelationship[];
  onClose: () => void;
  onOpenFile: (path: string) => void;
  onSelectTable: (tableName: string) => void;
}

export function DatabaseInspectorDrawer({
  table,
  relationships,
  onClose,
  onOpenFile,
  onSelectTable,
}: DatabaseInspectorDrawerProps) {
  const [copiedSql, setCopiedSql] = useState(false);

  // Incoming relationships: other tables referencing this table
  const incomingRelations = useMemo(() => {
    if (!table) return [];
    return relationships.filter((r) => r.toTable.toLowerCase() === table.name.toLowerCase());
  }, [table, relationships]);

  // Outgoing relationships: this table referencing other tables
  const outgoingRelations = useMemo(() => {
    if (!table) return [];
    return relationships.filter((r) => r.fromTable.toLowerCase() === table.name.toLowerCase());
  }, [table, relationships]);

  // Generate clean SQL DDL for this specific table
  const generatedSql = useMemo(() => {
    if (!table) return '';
    const cols = table.columns.map((c) => {
      let line = `  ${c.name} ${c.type.toUpperCase()}`;
      if (c.isPrimary) line += ' PRIMARY KEY';
      if (!c.isNullable && !c.isPrimary) line += ' NOT NULL';
      if (c.references) line += ` REFERENCES ${c.references.table}(${c.references.column})`;
      return line;
    });
    return `CREATE TABLE ${table.name.toLowerCase()} (\n${cols.join(',\n')}\n);`;
  }, [table]);

  const handleCopySql = () => {
    if (!generatedSql) return;
    navigator.clipboard.writeText(generatedSql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  if (!table) return null;

  const pkColumns = table.columns.filter((c) => c.isPrimary);
  const fkColumns = table.columns.filter((c) => c.isForeignKey);

  return (
    <div className="w-80 sm:w-96 border-l border-zinc-200 bg-white h-full flex flex-col shadow-xl z-20 shrink-0 font-sans">
      {/* Drawer Header */}
      <div className="px-5 py-3.5 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-zinc-900 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Database className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-mono font-bold text-zinc-900 truncate" title={table.name}>
              {table.name}
            </h3>
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
              {table.schemaType || 'Database Table'}
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200 rounded-lg transition-colors cursor-pointer"
          title="Close Table Inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Drawer Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
        {/* Source File Location */}
        {table.sourceFile && (
          <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <FileCode className="w-4 h-4 text-zinc-500 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] font-mono uppercase text-zinc-400 block font-semibold">
                  Defined in
                </span>
                <span className="font-mono text-xs text-zinc-800 truncate block" title={table.sourceFile}>
                  {table.sourceFile.split('/').pop()}
                </span>
              </div>
            </div>
            <button
              onClick={() => onOpenFile(table.sourceFile)}
              className="px-2.5 py-1 text-xs font-mono bg-white hover:bg-zinc-100 text-zinc-800 border border-zinc-200 rounded-lg shadow-2xs transition-colors shrink-0 cursor-pointer"
            >
              Open File
            </button>
          </div>
        )}

        {/* Quick Metrics */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-center">
            <span className="text-[10px] font-mono text-zinc-500 block">Columns</span>
            <span className="text-sm font-bold font-mono text-zinc-900">{table.columns.length}</span>
          </div>
          <div className="p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-center">
            <span className="text-[10px] font-mono text-zinc-500 block">Primary (PK)</span>
            <span className="text-sm font-bold font-mono text-zinc-900">{pkCountSummary(pkColumns)}</span>
          </div>
          <div className="p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-center">
            <span className="text-[10px] font-mono text-zinc-500 block">Foreign (FK)</span>
            <span className="text-sm font-bold font-mono text-zinc-900">{fkColumns.length}</span>
          </div>
        </div>

        {/* Outgoing Relationships (This table references others) */}
        {outgoingRelations.length > 0 && (
          <div className="space-y-2">
            <span className="text-[11px] font-mono font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-zinc-500" />
              References ({outgoingRelations.length})
            </span>
            <div className="space-y-1.5">
              {outgoingRelations.map((rel) => (
                <div
                  key={rel.id}
                  onClick={() => onSelectTable(rel.toTable)}
                  className="p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-white hover:border-zinc-400 transition-all cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-1.5 font-mono text-xs min-w-0">
                    <span className="text-zinc-500">{rel.fromColumn}</span>
                    <ArrowRight className="w-3 h-3 text-zinc-400 shrink-0" />
                    <span className="font-bold text-zinc-900 truncate">
                      {rel.toTable}.{rel.toColumn}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-700 font-semibold shrink-0">
                    {rel.isInferred ? 'Inferred' : 'FK'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Incoming Relationships (Other tables reference this table) */}
        {incomingRelations.length > 0 && (
          <div className="space-y-2">
            <span className="text-[11px] font-mono font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
              <CornerDownRight className="w-3.5 h-3.5 text-zinc-500" />
              Referenced By ({incomingRelations.length})
            </span>
            <div className="space-y-1.5">
              {incomingRelations.map((rel) => (
                <div
                  key={rel.id}
                  onClick={() => onSelectTable(rel.fromTable)}
                  className="p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-white hover:border-zinc-400 transition-all cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-1.5 font-mono text-xs min-w-0">
                    <span className="font-bold text-zinc-900 truncate">{rel.fromTable}</span>
                    <span className="text-zinc-500">.{rel.fromColumn}</span>
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-white font-semibold shrink-0">
                    Points to {rel.toColumn}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Column Catalog */}
        <div className="space-y-2">
          <span className="text-[11px] font-mono font-bold text-zinc-700 uppercase tracking-wider block">
            All Fields & Data Types ({table.columns.length})
          </span>
          <div className="divide-y divide-zinc-200 border border-zinc-200 rounded-xl overflow-hidden bg-white">
            {table.columns.map((c) => (
              <div key={c.name} className="px-3 py-2 flex items-center justify-between font-mono text-xs hover:bg-zinc-50">
                <div className="flex items-center gap-2 min-w-0 mr-2">
                  {c.isPrimary ? (
                    <span className="px-1.5 py-0.2 rounded bg-zinc-900 text-white text-[9px] font-bold">
                      PK
                    </span>
                  ) : c.isForeignKey ? (
                    <span className="px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-800 border border-zinc-300 text-[9px] font-bold">
                      FK
                    </span>
                  ) : (
                    <span className="w-3 text-center text-zinc-300">•</span>
                  )}
                  <span className={c.isPrimary ? 'font-bold text-zinc-900' : 'text-zinc-800 truncate'}>
                    {c.name}
                  </span>
                </div>
                <span className="text-[11px] text-zinc-400 shrink-0">
                  {c.type}
                  {c.isNullable ? '?' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Generated SQL DDL */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-zinc-700 uppercase tracking-wider">
              SQL DDL Definition
            </span>
            <button
              onClick={handleCopySql}
              className="flex items-center gap-1 text-[11px] font-mono text-zinc-600 hover:text-zinc-900 cursor-pointer"
            >
              {copiedSql ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copiedSql ? 'Copied' : 'Copy SQL'}</span>
            </button>
          </div>
          <pre className="p-3 rounded-xl border border-zinc-200 bg-zinc-900 text-zinc-100 font-mono text-[11px] overflow-x-auto leading-relaxed max-h-48">
            {generatedSql}
          </pre>
        </div>
      </div>
    </div>
  );
}

function pkCountSummary(pkCols: { name: string }[]) {
  if (pkCols.length === 0) return 'None';
  if (pkCols.length === 1) return pkCols[0].name;
  return `${pkCols.length} composite`;
}
