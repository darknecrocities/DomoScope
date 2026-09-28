import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  MarkerType,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import {
  Database,
  Search,
  Copy,
  Check,
  TableProperties,
  Network,
  Maximize2,
  Minimize2,
  FileCode,
  Download,
  RotateCcw,
  SlidersHorizontal,
  Zap,
  ArrowRight,
  ArrowDown,
  Workflow,
  Eye,
  Key,
} from 'lucide-react';
import { DatabaseSchema, DatabaseTable, TableRelationship } from '../../types';
import { EmptyState } from '../common/EmptyState';
import { DatabaseTableNode, DatabaseTableNodeData } from './DatabaseTableNode';
import { DatabaseInspectorDrawer } from './DatabaseInspectorDrawer';
import { AnimatedCounter } from '../common/AnimatedCounter';

interface DatabaseERDProps {
  schema?: DatabaseSchema | null;
  onOpenFile: (path: string) => void;
}

const NODE_TYPES = {
  databaseTable: DatabaseTableNode,
};

type ViewMode = 'flow' | 'grid' | 'relationships';
type LayoutDirection = 'LR' | 'TB';

/**
 * Calculates automated Dagre coordinates for Database ERD tables and edges
 */
function layoutDatabaseERD(
  tables: DatabaseTable[],
  relationships: TableRelationship[],
  direction: LayoutDirection = 'LR'
): { nodes: Node<DatabaseTableNodeData>[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: direction,
    nodesep: 70,
    ranksep: direction === 'LR' ? 140 : 100,
    marginx: 40,
    marginy: 40,
  });

  const nodeWidth = 288; // 18rem (w-72)
  for (const table of tables) {
    const nodeHeight = Math.min(420, 52 + table.columns.length * 34 + 32);
    g.setNode(table.name, { width: nodeWidth, height: nodeHeight });
  }

  // Connect edges where both source and target table exist
  const tableNamesSet = new Set(tables.map((t) => t.name.toLowerCase()));
  const validRels = relationships.filter(
    (r) =>
      tableNamesSet.has(r.fromTable.toLowerCase()) &&
      tableNamesSet.has(r.toTable.toLowerCase())
  );

  for (const rel of validRels) {
    g.setEdge(rel.fromTable, rel.toTable);
  }

  dagre.layout(g);

  const nodes: Node<DatabaseTableNodeData>[] = tables.map((table) => {
    const nodeWithPos = g.node(table.name) || { x: 0, y: 0 };
    const nodeHeight = Math.min(420, 52 + table.columns.length * 34 + 32);

    return {
      id: table.name,
      type: 'databaseTable',
      position: {
        x: nodeWithPos.x - nodeWidth / 2,
        y: nodeWithPos.y - nodeHeight / 2,
      },
      data: {
        table,
        rankDirection: direction,
      },
    };
  });

  const edges: Edge[] = validRels.map((rel) => {
    return {
      id: rel.id,
      source: rel.fromTable,
      sourceHandle: `${rel.fromColumn}-source`,
      target: rel.toTable,
      targetHandle: `${rel.toColumn}-target`,
      type: 'smoothstep',
      animated: true,
      data: { relationship: rel },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 14,
        height: 14,
        color: '#71717A',
      },
      style: {
        stroke: '#71717A',
        strokeWidth: 1.8,
        strokeDasharray: rel.isInferred ? '5 5' : undefined,
      },
      label: `${rel.fromColumn} ➔ ${rel.toColumn}`,
      labelStyle: {
        fill: '#18181B',
        fontWeight: 600,
        fontSize: 10,
        fontFamily: 'monospace',
      },
      labelBgStyle: {
        fill: '#FFFFFF',
        fillOpacity: 0.95,
        stroke: '#E4E4E7',
        strokeWidth: 1,
        rx: 6,
        ry: 6,
      },
      labelBgPadding: [6, 3] as [number, number],
    };
  });

  return { nodes, edges };
}

function DatabaseERDInner({ schema, onOpenFile }: DatabaseERDProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('flow');
  const [direction, setDirection] = useState<LayoutDirection>('LR');
  const [isFlowAnimated, setIsFlowAnimated] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTableName, setSelectedTableName] = useState<string | null>(null);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  const reactFlowInstance = useReactFlow();

  const tables = useMemo(() => schema?.tables || [], [schema]);
  const relationships = useMemo(() => schema?.relationships || [], [schema]);

  // Compute Layout Elements
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    if (!schema || tables.length === 0) return { nodes: [], edges: [] };
    return layoutDatabaseERD(tables, relationships, direction);
  }, [schema, tables, relationships, direction]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<DatabaseTableNodeData>>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync nodes and edges whenever initial elements change
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Filter tables for grid view or search
  const filteredTables = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return tables;
    return tables.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.columns.some((c) => c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q))
    );
  }, [tables, searchQuery]);

  // Filter relationships for search
  const filteredRelationships = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return relationships;
    return relationships.filter(
      (r) =>
        r.fromTable.toLowerCase().includes(q) ||
        r.toTable.toLowerCase().includes(q) ||
        r.fromColumn.toLowerCase().includes(q) ||
        r.toColumn.toLowerCase().includes(q)
    );
  }, [relationships, searchQuery]);

  // Map of connected tables for highlighting
  const connectionsMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const rel of relationships) {
      if (!map.has(rel.fromTable)) map.set(rel.fromTable, new Set());
      if (!map.has(rel.toTable)) map.set(rel.toTable, new Set());
      map.get(rel.fromTable)!.add(rel.toTable);
      map.get(rel.toTable)!.add(rel.fromTable);
    }
    return map;
  }, [relationships]);

  // Handle table selection and line flow highlighting
  useEffect(() => {
    const defaultStroke = '#71717A';
    const selectedStroke = '#18181B';

    if (!selectedTableName) {
      const q = searchQuery.toLowerCase().trim();
      setNodes((nds) =>
        nds.map((n) => {
          const isMatchingSearch =
            !q ||
            n.id.toLowerCase().includes(q) ||
            n.data.table.columns.some(
              (c) => c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q)
            );

          return {
            ...n,
            data: {
              ...n.data,
              isSelected: false,
              isDimmed: q ? !isMatchingSearch : false,
              onOpenFile,
              onSelectTable: (name: string) => setSelectedTableName(name),
            },
          };
        })
      );

      setEdges((eds) =>
        eds.map((e) => {
          const rel = e.data?.relationship as TableRelationship | undefined;
          return {
            ...e,
            animated: isFlowAnimated,
            style: {
              ...e.style,
              stroke: defaultStroke,
              strokeWidth: 1.8,
              opacity: 1,
              strokeDasharray: rel?.isInferred ? '5 5' : undefined,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 14,
              height: 14,
              color: defaultStroke,
            },
          };
        })
      );
      return;
    }

    const connectedTables = connectionsMap.get(selectedTableName) || new Set();

    setNodes((nds) =>
      nds.map((n) => {
        const isSelf = n.id.toLowerCase() === selectedTableName.toLowerCase();
        const isConnected = connectedTables.has(n.id);

        return {
          ...n,
          data: {
            ...n.data,
            isSelected: isSelf,
            isDimmed: !isSelf && !isConnected,
            onOpenFile,
            onSelectTable: (name: string) => setSelectedTableName(name),
          },
        };
      })
    );

    setEdges((eds) =>
      eds.map((e) => {
        const isRelated =
          e.source.toLowerCase() === selectedTableName.toLowerCase() ||
          e.target.toLowerCase() === selectedTableName.toLowerCase();

        return {
          ...e,
          animated: isRelated ? true : isFlowAnimated,
          style: {
            ...e.style,
            stroke: isRelated ? selectedStroke : defaultStroke,
            strokeWidth: isRelated ? 2.8 : 1,
            opacity: isRelated ? 1 : 0.15,
            transition: 'all 0.2s ease',
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: isRelated ? 16 : 12,
            height: isRelated ? 16 : 12,
            color: isRelated ? selectedStroke : '#A1A1AA',
          },
        };
      })
    );
  }, [selectedTableName, connectionsMap, isFlowAnimated, searchQuery, onOpenFile, setNodes, setEdges]);

  // Selected table object for inspector drawer
  const selectedTableObj = useMemo(() => {
    if (!selectedTableName) return null;
    return tables.find((t) => t.name.toLowerCase() === selectedTableName.toLowerCase()) || null;
  }, [selectedTableName, tables]);

  // Fit view helper
  const handleFitView = useCallback(() => {
    setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.2, duration: 400 });
    }, 50);
  }, [reactFlowInstance]);

  // Copy Mermaid ERD
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
    setCopiedType('mermaid');
    setTimeout(() => setCopiedType(null), 2000);
  };

  // Copy SQL DDL
  const handleCopySqlDDL = () => {
    const sqlStatements = tables
      .map((table) => {
        const cols = table.columns.map((c) => {
          let line = `  ${c.name} ${c.type.toUpperCase()}`;
          if (c.isPrimary) line += ' PRIMARY KEY';
          if (!c.isNullable && !c.isPrimary) line += ' NOT NULL';
          if (c.references) line += ` REFERENCES ${c.references.table}(${c.references.column})`;
          return line;
        });
        return `CREATE TABLE ${table.name.toLowerCase()} (\n${cols.join(',\n')}\n);`;
      })
      .join('\n\n');

    navigator.clipboard.writeText(sqlStatements);
    setCopiedType('sql');
    setTimeout(() => setCopiedType(null), 2000);
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
    <div className="h-full flex flex-col bg-zinc-50 overflow-hidden font-sans select-none">
      {/* Top Database Sub-header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-2.5 bg-white border-b border-zinc-200 shrink-0 z-10 shadow-2xs">
        {/* Left: Title, Stats & Schema Badges */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-zinc-900 text-white flex items-center justify-center shadow-2xs">
              <Database className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-sm font-bold text-zinc-900">Database ERD</h2>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-xs">
            <span className="px-2 py-0.5 rounded border border-zinc-200 bg-zinc-50 text-zinc-800 font-semibold">
              <AnimatedCounter value={tables.length} /> tables
            </span>
            <span className="px-2 py-0.5 rounded border border-zinc-200 bg-zinc-50 text-zinc-800 font-semibold">
              <AnimatedCounter value={relationships.length} /> connections
            </span>
            {schema.detectedTypes.map((t) => (
              <span
                key={t}
                className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 text-white font-bold"
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Right Tools: View Toggle, Layout, Animation, Search, Export */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-zinc-100 p-0.5 rounded-xl border border-zinc-200 text-xs font-mono">
            <button
              onClick={() => setViewMode('flow')}
              className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'flow'
                  ? 'bg-white text-zinc-950 font-bold shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
              title="Interactive ERD diagram canvas"
            >
              <Workflow className="w-3.5 h-3.5" />
              <span>Diagram</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-zinc-950 font-bold shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
              title="Table cards grid"
            >
              <TableProperties className="w-3.5 h-3.5" />
              <span>Tables</span>
            </button>
            <button
              onClick={() => setViewMode('relationships')}
              className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'relationships'
                  ? 'bg-white text-zinc-950 font-bold shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
              title="Foreign key connections catalog"
            >
              <Network className="w-3.5 h-3.5" />
              <span>Relations ({relationships.length})</span>
            </button>
          </div>

          {/* Canvas Controls (Visible in Diagram Mode) */}
          {viewMode === 'flow' && (
            <div className="flex items-center gap-1 bg-zinc-100 p-0.5 rounded-xl border border-zinc-200 text-xs font-mono">
              {/* Direction Switcher (LR vs TB) */}
              <button
                onClick={() => setDirection((d) => (d === 'LR' ? 'TB' : 'LR'))}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-200/80 shadow-2xs transition-all cursor-pointer text-[11px] font-semibold"
                title={direction === 'LR' ? 'Orientation: Left-to-Right (Click for Top-to-Bottom)' : 'Orientation: Top-to-Bottom (Click for Left-to-Right)'}
              >
                {direction === 'LR' ? (
                  <>
                    <ArrowRight className="w-3 h-3 text-zinc-500" />
                    <span>LR Layout</span>
                  </>
                ) : (
                  <>
                    <ArrowDown className="w-3 h-3 text-zinc-500" />
                    <span>TB Layout</span>
                  </>
                )}
              </button>

              {/* Line Flow Animation Toggle (Shown if relationships exist) */}
              {relationships.length > 0 && (
                <button
                  onClick={() => setIsFlowAnimated((v) => !v)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                    isFlowAnimated
                      ? 'bg-white text-zinc-950 border border-zinc-300 shadow-2xs font-bold'
                      : 'text-zinc-600 hover:text-zinc-950 hover:bg-white/60'
                  }`}
                  title="Toggle animated pulse on relationship lines"
                >
                  <Zap className={`w-3 h-3 ${isFlowAnimated ? 'text-zinc-950 fill-zinc-950' : 'text-zinc-400'}`} />
                  <span>Line Pulse</span>
                </button>
              )}

              {/* Fit View Button */}
              <button
                onClick={handleFitView}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200/80 shadow-2xs transition-all cursor-pointer text-[11px] font-semibold"
                title="Recenter and fit all tables to view"
              >
                <RotateCcw className="w-3 h-3 text-zinc-500" />
                <span>Fit</span>
              </button>
            </div>
          )}

          {/* Export Actions (Segmented Group) */}
          <div className="flex items-center bg-zinc-100 p-0.5 rounded-xl border border-zinc-200 text-xs font-mono">
            <button
              onClick={handleCopySqlDDL}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-zinc-700 hover:text-zinc-950 hover:bg-white text-[11px] font-semibold transition-all cursor-pointer"
              title="Copy complete SQL CREATE TABLE statements"
            >
              {copiedType === 'sql' ? (
                <>
                  <Check className="w-3 h-3 text-zinc-950" />
                  <span className="text-zinc-950 font-bold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-zinc-500" />
                  <span>SQL DDL</span>
                </>
              )}
            </button>

            <button
              onClick={handleCopyMermaidERD}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-zinc-700 hover:text-zinc-950 hover:bg-white text-[11px] font-semibold transition-all cursor-pointer"
              title="Copy Mermaid.js ERD schema definition"
            >
              {copiedType === 'mermaid' ? (
                <>
                  <Check className="w-3 h-3 text-zinc-950" />
                  <span className="text-zinc-950 font-bold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-zinc-500" />
                  <span>Mermaid ERD</span>
                </>
              )}
            </button>
          </div>

          {/* Search Filter Input */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-50 border border-zinc-200 rounded-xl text-xs w-36 sm:w-44 focus-within:bg-white focus-within:border-zinc-400 transition-all">
            <Search className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter tables..."
              className="w-full bg-transparent outline-none text-zinc-800 placeholder:text-zinc-400 font-mono text-[11px]"
            />
          </div>
        </div>
      </div>

      {/* Main Workspace Viewport */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* VIEW 1: Interactive React Flow ERD Canvas with Line Flows */}
        {viewMode === 'flow' && (
          <div className="flex-1 h-full w-full relative bg-zinc-50/60">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={NODE_TYPES}
              onNodeClick={(_, node) => setSelectedTableName(node.id)}
              onPaneClick={() => setSelectedTableName(null)}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              minZoom={0.15}
              maxZoom={1.8}
              proOptions={{ hideAttribution: true }}
              className="bg-zinc-50"
            >
              {/* Dot Grid Background */}
              <Background
                variant={BackgroundVariant.Dots}
                gap={20}
                size={1.5}
                color="#D4D4D8"
              />

              {/* Styled Minimal Controls */}
              <Controls
                showInteractive={false}
                className="!bg-white !border !border-zinc-200 !rounded-xl !shadow-xs !overflow-hidden"
              />

              {/* Clean Minimap */}
              <MiniMap
                nodeColor="#E4E4E7"
                maskColor="rgba(244, 244, 245, 0.75)"
                className="!border !border-zinc-200 !bg-white !rounded-xl !shadow-xs !overflow-hidden"
              />
            </ReactFlow>

            {/* Canvas Bottom Floating Helper */}
            <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 text-[11px] font-mono bg-white/90 backdrop-blur-xs border border-zinc-200 px-3 py-1.5 rounded-xl shadow-xs text-zinc-600">
              <span className="flex items-center gap-1 font-semibold text-zinc-900">
                <span className="w-2 h-2 rounded-full bg-zinc-900" /> PK
              </span>
              <span>➔</span>
              <span className="flex items-center gap-1 font-semibold text-zinc-700">
                <span className="w-2 h-2 rounded-full bg-zinc-400" /> FK
              </span>
              <span className="text-zinc-300">|</span>
              <span>Click any table to trace relationships</span>
            </div>
          </div>
        )}

        {/* VIEW 2: Traditional Table Cards Grid */}
        {viewMode === 'grid' && (
          <div className="flex-1 overflow-auto p-6 bg-zinc-50">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
              {filteredTables.map((table) => {
                const isSelected = selectedTableName === table.name;
                const relatedRels = relationships.filter(
                  (r) => r.fromTable === table.name || r.toTable === table.name
                );

                return (
                  <div
                    key={table.name}
                    onClick={() => setSelectedTableName(isSelected ? null : table.name)}
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
                                className="px-1.5 py-0.5 rounded bg-zinc-900 text-white flex items-center gap-1 text-[9px] font-bold shrink-0 shadow-2xs"
                                title="Primary Key (PK)"
                              >
                                <Key className="w-2.5 h-2.5 text-amber-400" /> PK
                              </span>
                            ) : col.isForeignKey ? (
                              <span
                                className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-800 border border-zinc-300 flex items-center justify-center text-[9px] font-bold shrink-0"
                                title={`Foreign Key: references ${col.references?.table || 'Inferred'}`}
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
          </div>
        )}

        {/* VIEW 3: Relationships Catalog */}
        {viewMode === 'relationships' && (
          <div className="flex-1 overflow-auto p-6 bg-zinc-50">
            <div className="max-w-5xl mx-auto p-6 bg-white border border-zinc-200 rounded-2xl shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-700">
                  Detected Foreign Key Relationships ({relationships.length})
                </h3>
                <span className="text-xs font-mono text-zinc-500">
                  Line flows between primary keys (PK) and foreign keys (FK)
                </span>
              </div>

              {filteredRelationships.length === 0 ? (
                <div className="py-12 text-center text-xs font-mono text-zinc-400">
                  {searchQuery ? `No relationships match "${searchQuery}"` : 'No relationships detected'}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredRelationships.map((rel) => (
                    <div
                      key={rel.id}
                      onClick={() => {
                        setSelectedTableName(rel.fromTable);
                        setViewMode('flow');
                      }}
                      className="p-3.5 bg-zinc-50 hover:bg-white border border-zinc-200 hover:border-zinc-400 rounded-xl flex items-center justify-between text-xs font-mono transition-all cursor-pointer shadow-2xs"
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
              )}
            </div>
          </div>
        )}

        {/* Right Slide-Over Inspector Drawer */}
        {selectedTableObj && (
          <DatabaseInspectorDrawer
            table={selectedTableObj}
            relationships={relationships}
            onClose={() => setSelectedTableName(null)}
            onOpenFile={onOpenFile}
            onSelectTable={(name) => setSelectedTableName(name)}
          />
        )}
      </div>
    </div>
  );
}

export function DatabaseERD(props: DatabaseERDProps) {
  return (
    <ReactFlowProvider>
      <DatabaseERDInner {...props} />
    </ReactFlowProvider>
  );
}
