import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Database, Key, Link2, FileCode, Check } from 'lucide-react';
import { DatabaseTable } from '../../types';

export interface DatabaseTableNodeData {
  table: DatabaseTable;
  isSelected?: boolean;
  isDimmed?: boolean;
  rankDirection?: 'LR' | 'TB';
  highlightedColumns?: Set<string>;
  onOpenFile?: (path: string) => void;
  onSelectTable?: (tableName: string) => void;
  [key: string]: unknown;
}

interface DatabaseTableNodeProps {
  data: DatabaseTableNodeData;
  selected?: boolean;
}

export const DatabaseTableNode = memo(function DatabaseTableNode({
  data,
  selected: isNodeSelected,
}: DatabaseTableNodeProps) {
  const { table, isSelected, isDimmed, rankDirection = 'LR', highlightedColumns, onOpenFile, onSelectTable } = data;

  const active = Boolean(isSelected || isNodeSelected);
  const isLR = rankDirection === 'LR';

  const pkCount = table.columns.filter((c) => c.isPrimary).length;
  const fkCount = table.columns.filter((c) => c.isForeignKey).length;

  return (
    <div
      onClick={() => onSelectTable?.(table.name)}
      className={`w-72 rounded-2xl border bg-white text-zinc-900 select-none transition-all duration-200 overflow-hidden ${
        active
          ? 'border-zinc-900 ring-2 ring-zinc-900/15 shadow-xl scale-[1.01]'
          : isDimmed
          ? 'border-zinc-200 opacity-25 hover:opacity-80 shadow-xs'
          : 'border-zinc-200 hover:border-zinc-400 hover:shadow-md shadow-xs'
      }`}
    >
      {/* Node-level Fallback and Directional Handles */}
      <Handle
        type="target"
        position={Position.Top}
        id="table-target-top"
        className="!w-2.5 !h-2.5 !bg-zinc-400 !border-2 !border-white hover:!bg-zinc-900 transition-colors"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="table-target-left"
        className="!w-2.5 !h-2.5 !bg-zinc-400 !border-2 !border-white hover:!bg-zinc-900 transition-colors"
      />
      <Handle
        type="target"
        position={isLR ? Position.Left : Position.Top}
        id="table-target-main"
        className="!w-2.5 !h-2.5 !bg-zinc-400 !border-2 !border-white hover:!bg-zinc-900 transition-colors"
      />

      {/* Table Header */}
      <div className="px-3.5 py-2.5 bg-zinc-100/90 border-b border-zinc-200 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-white border border-zinc-200 flex items-center justify-center text-zinc-800 shrink-0 shadow-2xs">
            <Database className="w-3.5 h-3.5" />
          </div>
          <span className="font-mono text-xs font-bold text-zinc-900 truncate" title={table.name}>
            {table.name}
          </span>
          <span className="text-[10px] font-mono text-zinc-500 bg-white border border-zinc-200 px-1.5 py-0.2 rounded font-medium shrink-0">
            {table.columns.length}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {table.schemaType && (
            <span className="text-[9px] font-mono uppercase tracking-tight px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-700 font-semibold">
              {table.schemaType}
            </span>
          )}
          {onOpenFile && table.sourceFile && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenFile(table.sourceFile);
              }}
              className="p-1 text-zinc-400 hover:text-zinc-900 rounded-md hover:bg-zinc-200/80 transition-colors cursor-pointer"
              title={`View definition in ${table.sourceFile}`}
            >
              <FileCode className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Columns List */}
      <div className="divide-y divide-zinc-100 max-h-72 overflow-y-auto">
        {table.columns.map((col) => {
          const isColHighlighted = highlightedColumns?.has(col.name);

          return (
            <div
              key={col.name}
              className={`relative px-3.5 py-2 flex items-center justify-between text-xs font-mono transition-colors ${
                isColHighlighted
                  ? 'bg-amber-50/60 font-semibold text-zinc-900'
                  : 'hover:bg-zinc-50/80'
              }`}
            >
              {/* Left Column Target Handle (Direct line connection to this field) */}
              <Handle
                type="target"
                position={Position.Left}
                id={`${col.name}-target`}
                className={`!w-2 !h-2 !border !border-white transition-colors ${
                  col.isPrimary
                    ? '!bg-zinc-900'
                    : isColHighlighted
                    ? '!bg-amber-500'
                    : '!bg-zinc-300'
                }`}
              />

              {/* Column Name & Key Badges */}
              <div className="flex items-center gap-2 min-w-0 mr-2">
                {col.isPrimary ? (
                  <span
                    className="px-1.5 py-0.5 rounded bg-zinc-900 text-white flex items-center gap-1 text-[9px] font-bold font-mono shadow-2xs shrink-0"
                    title="Primary Key (PK)"
                  >
                    <Key className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                    PK
                  </span>
                ) : col.isForeignKey ? (
                  <span
                    className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-800 border border-zinc-300 flex items-center gap-1 text-[9px] font-bold font-mono shrink-0"
                    title={`Foreign Key: references ${col.references?.table || 'Inferred Table'}`}
                  >
                    <Link2 className="w-2.5 h-2.5 text-zinc-600 shrink-0" />
                    FK
                  </span>
                ) : (
                  <span className="w-3.5 text-center text-zinc-300 text-xs shrink-0 select-none">•</span>
                )}

                <span
                  className={`truncate ${
                    col.isPrimary
                      ? 'font-bold text-zinc-900'
                      : col.isForeignKey
                      ? 'font-semibold text-zinc-800'
                      : 'text-zinc-700'
                  }`}
                  title={col.name}
                >
                  {col.name}
                </span>
              </div>

              {/* Column Data Type */}
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[11px] font-mono text-zinc-400">
                  {col.type}
                  {col.isNullable ? '?' : ''}
                </span>
              </div>

              {/* Right Column Source Handle (Direct line connection from this field) */}
              <Handle
                type="source"
                position={Position.Right}
                id={`${col.name}-source`}
                className={`!w-2 !h-2 !border !border-white transition-colors ${
                  col.isForeignKey
                    ? '!bg-zinc-900'
                    : isColHighlighted
                    ? '!bg-amber-500'
                    : '!bg-zinc-300'
                }`}
              />
            </div>
          );
        })}
      </div>

      {/* Table Footer: Key summary */}
      {(pkCount > 0 || fkCount > 0) && (
        <div className="px-3.5 py-1.5 bg-zinc-50 border-t border-zinc-200 text-[10px] font-mono text-zinc-500 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {pkCount > 0 && (
              <span className="flex items-center gap-1 text-zinc-700 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-900" />
                {pkCount} PK
              </span>
            )}
            {fkCount > 0 && (
              <span className="flex items-center gap-1 text-zinc-700 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                {fkCount} FK
              </span>
            )}
          </div>
          <span className="text-[9px] text-zinc-400 font-medium">Click to inspect</span>
        </div>
      )}

      {/* Node-level Fallback and Directional Source Handles */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="table-source-bottom"
        className="!w-2.5 !h-2.5 !bg-zinc-400 !border-2 !border-white hover:!bg-zinc-900 transition-colors"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="table-source-right"
        className="!w-2.5 !h-2.5 !bg-zinc-400 !border-2 !border-white hover:!bg-zinc-900 transition-colors"
      />
      <Handle
        type="source"
        position={isLR ? Position.Right : Position.Bottom}
        id="table-source-main"
        className="!w-2.5 !h-2.5 !bg-zinc-400 !border-2 !border-white hover:!bg-zinc-900 transition-colors"
      />
    </div>
  );
});
