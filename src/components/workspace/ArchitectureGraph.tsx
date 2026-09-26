import { useState, useMemo, useCallback, useEffect } from 'react';
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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Search, Filter, RotateCcw, Eye, Lock, Unlock, Flame, Download, Palette, FileText } from 'lucide-react';
import { RepoFile, FileCategory, ArchitectureNodeData } from '../../types';
import { buildArchitectureGraph } from '../../services/graphBuilder';
import { exportToMermaid, exportToPlantUML } from '../../services/diagramExporter';
import { CustomNode } from './CustomNode';
import { NodeDetailsPanel } from './NodeDetailsPanel';

interface ArchitectureGraphProps {
  files: RepoFile[];
  fileContents: Map<string, string>;
  selectedNodeId?: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onOpenFile: (path: string) => void;
  onAskExplain: (path: string) => void;
  rankDirection?: 'TB' | 'LR' | 'BT' | 'RL';
}

const CATEGORY_FILTERS: { id: FileCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'component', label: 'Components' },
  { id: 'service', label: 'Services' },
  { id: 'api', label: 'API Routes' },
  { id: 'database', label: 'Database' },
];

export function ArchitectureGraph({
  files,
  fileContents,
  selectedNodeId,
  onSelectNode,
  onOpenFile,
  onAskExplain,
  rankDirection: initialRankDirection = 'TB',
}: ArchitectureGraphProps) {
  const [filterCategory, setFilterCategory] = useState<FileCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [rankDirection, setRankDirection] = useState<'TB' | 'LR' | 'BT' | 'RL'>(initialRankDirection);
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [heatmapMode, setHeatmapMode] = useState(false);
  const [canvasTheme, setCanvasTheme] = useState<'light' | 'dark' | 'monokai'>('light');
  const [exportModalContent, setExportModalContent] = useState<{ title: string; content: string } | null>(null);
  const [activeDetailsNode, setActiveDetailsNode] = useState<Node<ArchitectureNodeData> | null>(null);

  // Compute graph data using buildArchitectureGraph service
  const { initialNodes, initialEdges, connectionsMap } = useMemo(() => {
    const result = buildArchitectureGraph(files, fileContents, {
      filterCategory,
      rankDirection,
      heatmapMode,
    });
    return {
      initialNodes: result.nodes,
      initialEdges: result.edges,
      connectionsMap: result.connectionsMap,
    };
  }, [files, fileContents, filterCategory, rankDirection, heatmapMode]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(
      initialNodes.map((n) => {
        if (heatmapMode) {
          let bgColor = '#f0fdf4'; // green
          let borderColor = '#86efac';
          if (n.data.healthColor === 'red') {
            bgColor = '#fef2f2';
            borderColor = '#fca5a5';
          } else if (n.data.healthColor === 'yellow') {
            bgColor = '#fffbeb';
            borderColor = '#fde68a';
          }
          return {
            ...n,
            style: { ...n.style, backgroundColor: bgColor, borderColor, borderWidth: '2px' },
          };
        }
        return n;
      })
    );
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, heatmapMode, setNodes, setEdges]);

  // Handle node selection
  useEffect(() => {
    if (!selectedNodeId) {
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          selected: false,
          style: { opacity: 1 },
        }))
      );
      setEdges((eds) =>
        eds.map((e) => ({
          ...e,
          selected: false,
          style: { stroke: '#71717A', strokeWidth: 1.5, opacity: 1 },
        }))
      );
      setActiveDetailsNode(null);
      return;
    }

    const connectedNodes = connectionsMap.get(selectedNodeId) || new Set();

    setNodes((nds) =>
      nds.map((n) => {
        const isSelf = n.id === selectedNodeId;
        const isConnected = connectedNodes.has(n.id);
        return {
          ...n,
          selected: isSelf,
          style: {
            opacity: isSelf || isConnected ? 1 : 0.25,
            transition: 'opacity 0.2s ease',
          },
        };
      })
    );

    setEdges((eds) =>
      eds.map((e) => {
        const isRelated = e.source === selectedNodeId || e.target === selectedNodeId;
        return {
          ...e,
          selected: isRelated,
          style: {
            stroke: isRelated ? '#2563eb' : '#D4D4D8',
            strokeWidth: isRelated ? 2.5 : 1,
            opacity: isRelated ? 1 : 0.15,
            transition: 'opacity 0.2s ease',
          },
        };
      })
    );

    const found = initialNodes.find((n) => n.id === selectedNodeId);
    if (found) setActiveDetailsNode(found);
  }, [selectedNodeId, connectionsMap, initialNodes, setNodes, setEdges]);

  const nodeTypes = useMemo(() => ({ customCard: CustomNode }), []);

  const onNodeClick = useCallback(
    (_: any, node: Node) => {
      onSelectNode(node.id);
      setActiveDetailsNode(node as Node<ArchitectureNodeData>);
    },
    [onSelectNode]
  );

  const onPaneClick = useCallback(() => {
    onSelectNode(null);
    setActiveDetailsNode(null);
  }, [onSelectNode]);

  const handleExportMermaid = () => {
    const content = exportToMermaid(nodes as Node<ArchitectureNodeData>[], edges);
    setExportModalContent({ title: 'Mermaid.js Diagram Markdown', content });
  };

  const handleExportPlantUML = () => {
    const content = exportToPlantUML(nodes as Node<ArchitectureNodeData>[], edges);
    setExportModalContent({ title: 'PlantUML Diagram Text', content });
  };

  const outgoingConnections = useMemo(() => {
    if (!activeDetailsNode) return [];
    return edges.filter((e) => e.source === activeDetailsNode.id).map((e) => e.target);
  }, [activeDetailsNode, edges]);

  const incomingConnections = useMemo(() => {
    if (!activeDetailsNode) return [];
    return edges.filter((e) => e.target === activeDetailsNode.id).map((e) => e.source);
  }, [activeDetailsNode, edges]);

  const canvasBgColor = canvasTheme === 'dark' ? '#0f172a' : canvasTheme === 'monokai' ? '#272822' : '#f8fafc';
  const gridColor = canvasTheme === 'dark' ? '#1e293b' : canvasTheme === 'monokai' ? '#3e3d32' : '#e2e8f0';

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden font-sans" style={{ backgroundColor: canvasBgColor }}>
      {/* Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-white border-b border-slate-200 z-10 shrink-0 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pr-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0 mr-1" />
          {CATEGORY_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterCategory(f.id)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                filterCategory === f.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Heatmap Toggle */}
          <button
            onClick={() => setHeatmapMode((prev) => !prev)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
              heatmapMode
                ? 'bg-rose-50 text-rose-700 border-rose-200 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
            title="Toggle Complexity & Heatmap Overlay"
          >
            <Flame className="w-3.5 h-3.5 text-rose-500" />
            <span>Heatmap</span>
          </button>

          {/* Theme Selector */}
          <select
            value={canvasTheme}
            onChange={(e) => setCanvasTheme(e.target.value as any)}
            className="px-2.5 py-1 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="light">Light Glass</option>
            <option value="dark">Dark Theme</option>
            <option value="monokai">Monokai</option>
          </select>

          {/* Export Menu */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={handleExportMermaid}
              className="px-2 py-1 rounded-lg font-semibold text-slate-700 hover:bg-white transition-colors cursor-pointer"
            >
              Mermaid
            </button>
            <button
              onClick={handleExportPlantUML}
              className="px-2 py-1 rounded-lg font-semibold text-slate-700 hover:bg-white transition-colors cursor-pointer"
            >
              PlantUML
            </button>
          </div>

          <button
            onClick={() => setShowMiniMap((prev) => !prev)}
            className={`p-1.5 rounded-xl border text-xs transition-colors cursor-pointer ${
              showMiniMap ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsLocked((prev) => !prev)}
            className={`p-1.5 rounded-xl border text-xs transition-colors cursor-pointer ${
              isLocked ? 'bg-amber-50 text-amber-700 border-amber-300' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          </button>

          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs w-36 sm:w-44">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search diagram..."
              className="bg-transparent outline-none w-full text-slate-800 placeholder:text-slate-400 font-mono text-xs"
            />
          </div>
        </div>
      </div>

      {/* React Flow Canvas */}
      <div className="flex-1 w-full h-full relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          minZoom={0.15}
          maxZoom={2.5}
          panOnDrag={!isLocked}
          zoomOnScroll={!isLocked}
          zoomOnPinch={!isLocked}
          defaultEdgeOptions={{
            markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
          }}
        >
          <Background color={gridColor} gap={20} size={1} />
          <Controls className="!border-slate-200 shadow-md" />
          {showMiniMap && (
            <MiniMap
              style={{ height: 100, width: 140 }}
              className="!border-slate-200 !rounded-xl overflow-hidden shadow-md"
              zoomable
              pannable
            />
          )}
        </ReactFlow>

        {activeDetailsNode && (
          <NodeDetailsPanel
            nodeData={activeDetailsNode.data}
            onClose={() => {
              setActiveDetailsNode(null);
              onSelectNode(null);
            }}
            onOpenFile={onOpenFile}
            onAskExplain={onAskExplain}
            incomingConnections={incomingConnections}
            outgoingConnections={outgoingConnections}
          />
        )}
      </div>

      {/* Export Modal */}
      {exportModalContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">{exportModalContent.title}</h3>
              <button
                onClick={() => setExportModalContent(null)}
                className="text-xs font-semibold text-slate-400 hover:text-slate-600"
              >
                Close
              </button>
            </div>
            <textarea
              readOnly
              value={exportModalContent.content}
              className="w-full h-64 p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-800 outline-none"
            />
            <div className="flex justify-end">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(exportModalContent.content);
                  alert('Diagram syntax copied to clipboard!');
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                Copy Markdown
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
