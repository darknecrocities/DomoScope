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
import { Search, Filter, Eye, Lock, Unlock, Flame, Download, Palette, FileText } from 'lucide-react';
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

const NODE_TYPES = { customCard: CustomNode };

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

  useEffect(() => {
    setRankDirection(initialRankDirection);
  }, [initialRankDirection]);

  const [showMiniMap, setShowMiniMap] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [heatmapMode, setHeatmapMode] = useState(false);
  const [canvasTheme, setCanvasTheme] = useState<'light' | 'dark' | 'monokai'>('light');
  const [exportModalContent, setExportModalContent] = useState<{ title: string; content: string } | null>(null);
  const [activeDetailsNode, setActiveDetailsNode] = useState<Node<ArchitectureNodeData> | null>(null);

  // Compute graph data using balanced vertical layout engine
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

  // Synchronize theme & heatmap state across all node data and edge styles
  useEffect(() => {
    const isDark = canvasTheme === 'dark';
    const isMonokai = canvasTheme === 'monokai';
    const defaultEdgeStroke = isMonokai ? '#727072' : isDark ? '#64748b' : '#94a3b8';

    setNodes(
      initialNodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          heatmapMode,
          theme: canvasTheme,
          rankDirection,
        },
      }))
    );

    setEdges(
      initialEdges.map((e) => ({
        ...e,
        style: {
          ...e.style,
          stroke: defaultEdgeStroke,
        },
      }))
    );
  }, [initialNodes, initialEdges, heatmapMode, canvasTheme, rankDirection, setNodes, setEdges]);

  // Handle node selection & highlighting
  useEffect(() => {
    const isDark = canvasTheme === 'dark';
    const isMonokai = canvasTheme === 'monokai';
    const defaultEdgeStroke = isMonokai ? '#727072' : isDark ? '#64748b' : '#94a3b8';
    const selectedEdgeStroke = isMonokai ? '#a6e22e' : isDark ? '#38bdf8' : '#18181b';

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
          style: {
            ...e.style,
            stroke: defaultEdgeStroke,
            strokeWidth: 1.5,
            opacity: 1,
          },
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
            opacity: isSelf || isConnected ? 1 : 0.22,
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
            ...e.style,
            stroke: isRelated ? selectedEdgeStroke : defaultEdgeStroke,
            strokeWidth: isRelated ? 2.5 : 1,
            opacity: isRelated ? 1 : 0.15,
            transition: 'opacity 0.2s ease',
          },
        };
      })
    );

    const found = initialNodes.find((n) => n.id === selectedNodeId);
    if (found) setActiveDetailsNode(found);
  }, [selectedNodeId, connectionsMap, initialNodes, canvasTheme, setNodes, setEdges]);

  // Handle Search Filtering
  useEffect(() => {
    if (!searchQuery.trim()) {
      if (!selectedNodeId) {
        setNodes((nds) =>
          nds.map((n) => ({
            ...n,
            style: { ...n.style, opacity: 1 },
          }))
        );
      }
      return;
    }

    const q = searchQuery.toLowerCase();
    setNodes((nds) =>
      nds.map((n) => {
        const match =
          n.data.label.toLowerCase().includes(q) ||
          n.data.path.toLowerCase().includes(q) ||
          n.data.category.toLowerCase().includes(q);
        return {
          ...n,
          style: {
            ...n.style,
            opacity: match ? 1 : 0.15,
            transition: 'opacity 0.2s ease',
          },
        };
      })
    );
  }, [searchQuery, selectedNodeId, setNodes]);

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

  const isDark = canvasTheme === 'dark';
  const isMonokai = canvasTheme === 'monokai';

  const canvasBgColor = isDark ? '#0b1120' : isMonokai ? '#272822' : '#f8fafc';
  const gridColor = isDark ? '#1e293b' : isMonokai ? '#3e3d32' : '#e2e8f0';

  const barBg = isMonokai
    ? 'bg-[#221f22]/95 border-b border-[#363537] text-[#fcfcfa]'
    : isDark
    ? 'bg-slate-900/95 border-b border-slate-800 text-slate-100'
    : 'bg-white/95 border-b border-zinc-200 text-zinc-900';

  return (
    <div
      className="relative w-full h-full flex flex-col overflow-hidden font-sans transition-colors duration-200"
      style={{ backgroundColor: canvasBgColor }}
    >
      {/* Control Bar */}
      <div className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 z-10 shrink-0 shadow-xs backdrop-blur-md ${barBg}`}>
        <div className="flex items-center gap-1.5 overflow-x-auto pr-2">
          <Filter className={`w-4 h-4 shrink-0 mr-1 ${isMonokai ? 'text-[#727072]' : isDark ? 'text-slate-500' : 'text-zinc-400'}`} />
          {CATEGORY_FILTERS.map((f) => {
            const active = filterCategory === f.id;
            let btnClass = '';
            if (active) {
              btnClass = isMonokai
                ? 'bg-[#a6e22e] text-[#221f22] font-bold shadow-xs'
                : isDark
                ? 'bg-slate-100 text-slate-900 font-semibold shadow-xs'
                : 'bg-zinc-900 text-white font-semibold shadow-xs';
            } else {
              btnClass = isMonokai
                ? 'text-[#939293] hover:text-[#fcfcfa] hover:bg-[#363537]'
                : isDark
                ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100';
            }

            return (
              <button
                key={f.id}
                onClick={() => setFilterCategory(f.id)}
                className={`px-3 py-1 rounded-xl text-xs transition-all shrink-0 cursor-pointer ${btnClass}`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {/* Heatmap Toggle Button */}
          <button
            onClick={() => setHeatmapMode((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
              heatmapMode
                ? isMonokai
                  ? 'bg-[#fd971f]/20 text-[#fd971f] border-[#fd971f] shadow-xs'
                  : isDark
                  ? 'bg-orange-500/20 text-orange-400 border-orange-500 shadow-xs'
                  : 'bg-amber-100 text-amber-950 border-amber-300 shadow-xs'
                : isMonokai
                ? 'bg-[#2d2a2e] text-[#fcfcfa] border-[#403e41] hover:bg-[#363537]'
                : isDark
                ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
            }`}
            title="Toggle Complexity & Heatmap Health Overlay"
          >
            <Flame
              className={`w-3.5 h-3.5 transition-colors ${
                heatmapMode
                  ? 'text-amber-500 fill-amber-500'
                  : isMonokai
                  ? 'text-[#727072]'
                  : isDark
                  ? 'text-slate-400'
                  : 'text-zinc-400'
              }`}
            />
            <span>Heatmap</span>
          </button>

          {/* Canvas Theme Selector */}
          <select
            value={canvasTheme}
            onChange={(e) => setCanvasTheme(e.target.value as any)}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold border focus:outline-none cursor-pointer ${
              isMonokai
                ? 'bg-[#2d2a2e] border-[#403e41] text-[#fcfcfa]'
                : isDark
                ? 'bg-slate-800 border-slate-700 text-slate-200'
                : 'bg-white border-zinc-200 text-zinc-800'
            }`}
          >
            <option value="light">Light Glass</option>
            <option value="dark">Dark Theme</option>
            <option value="monokai">Monokai</option>
          </select>

          {/* Export Diagrams Menu */}
          <div
            className={`flex items-center gap-1 p-0.5 rounded-xl border text-xs ${
              isMonokai
                ? 'bg-[#2d2a2e] border-[#403e41]'
                : isDark
                ? 'bg-slate-800 border-slate-700'
                : 'bg-zinc-100 border-zinc-200'
            }`}
          >
            <button
              onClick={handleExportMermaid}
              className={`px-2 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                isMonokai
                  ? 'text-[#fcfcfa] hover:bg-[#363537]'
                  : isDark
                  ? 'text-slate-300 hover:bg-slate-700'
                  : 'text-zinc-700 hover:bg-white'
              }`}
            >
              Mermaid
            </button>
            <button
              onClick={handleExportPlantUML}
              className={`px-2 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                isMonokai
                  ? 'text-[#fcfcfa] hover:bg-[#363537]'
                  : isDark
                  ? 'text-slate-300 hover:bg-slate-700'
                  : 'text-zinc-700 hover:bg-white'
              }`}
            >
              PlantUML
            </button>
          </div>

          {/* MiniMap Toggle */}
          <button
            onClick={() => setShowMiniMap((prev) => !prev)}
            className={`p-1.5 rounded-xl border text-xs transition-colors cursor-pointer ${
              showMiniMap
                ? isMonokai
                  ? 'bg-[#a6e22e] text-[#221f22] border-[#a6e22e]'
                  : isDark
                  ? 'bg-slate-100 text-slate-900 border-slate-100'
                  : 'bg-zinc-900 text-white border-zinc-900'
                : isMonokai
                ? 'bg-[#2d2a2e] text-[#fcfcfa] border-[#403e41] hover:bg-[#363537]'
                : isDark
                ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
            }`}
            title="Toggle MiniMap"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          {/* Lock Pan/Zoom */}
          <button
            onClick={() => setIsLocked((prev) => !prev)}
            className={`p-1.5 rounded-xl border text-xs transition-colors cursor-pointer ${
              isLocked
                ? isMonokai
                  ? 'bg-[#a6e22e] text-[#221f22] border-[#a6e22e]'
                  : isDark
                  ? 'bg-slate-100 text-slate-900 border-slate-100'
                  : 'bg-zinc-900 text-white border-zinc-900'
                : isMonokai
                ? 'bg-[#2d2a2e] text-[#fcfcfa] border-[#403e41] hover:bg-[#363537]'
                : isDark
                ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
            }`}
            title="Toggle Lock Pan/Zoom"
          >
            {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          </button>

          {/* Search Box */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs w-36 sm:w-44 ${
              isMonokai
                ? 'bg-[#2d2a2e] border-[#403e41]'
                : isDark
                ? 'bg-slate-800 border-slate-700'
                : 'bg-zinc-50 border-zinc-200'
            }`}
          >
            <Search
              className={`w-3.5 h-3.5 shrink-0 ${
                isMonokai ? 'text-[#727072]' : isDark ? 'text-slate-500' : 'text-zinc-400'
              }`}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search diagram..."
              className={`bg-transparent outline-none w-full font-mono text-xs ${
                isMonokai
                  ? 'text-[#fcfcfa] placeholder:text-[#727072]'
                  : isDark
                  ? 'text-slate-200 placeholder:text-slate-500'
                  : 'text-zinc-800 placeholder:text-zinc-400'
              }`}
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
          nodeTypes={NODE_TYPES}
          fitView
          fitViewOptions={{ padding: 0.2, minZoom: 0.35, maxZoom: 1.15 }}
          minZoom={0.15}
          maxZoom={2.5}
          panOnDrag={!isLocked}
          zoomOnScroll={!isLocked}
          zoomOnPinch={!isLocked}
          defaultEdgeOptions={{
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: isMonokai ? '#ffd866' : isDark ? '#64748b' : '#94a3b8',
            },
          }}
        >
          <Background color={gridColor} gap={22} size={1} />
          <Controls
            className={
              isMonokai
                ? '!border-[#403e41] !bg-[#2d2a2e] !text-[#fcfcfa] shadow-lg'
                : isDark
                ? '!border-slate-700 !bg-slate-800 !text-slate-200 shadow-lg'
                : '!border-zinc-200 !bg-white shadow-md'
            }
          />
          {showMiniMap && (
            <MiniMap
              style={{ height: 110, width: 150 }}
              className={`!rounded-xl overflow-hidden shadow-md ${
                isMonokai
                  ? '!border-[#403e41] !bg-[#221f22]'
                  : isDark
                  ? '!border-slate-700 !bg-slate-900'
                  : '!border-zinc-200 !bg-white'
              }`}
              nodeColor={(n) => {
                if (heatmapMode) {
                  const health = (n.data as any)?.healthColor;
                  if (health === 'red') return '#f87171';
                  if (health === 'yellow') return '#fbbf24';
                  return '#34d399';
                }
                return isMonokai ? '#ffd866' : isDark ? '#38bdf8' : '#71717a';
              }}
              zoomable
              pannable
            />
          )}
        </ReactFlow>

        {nodes.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-4">
            <div
              className={`pointer-events-auto border p-6 rounded-2xl shadow-lg max-w-sm text-center ${
                isMonokai
                  ? 'bg-[#221f22] border-[#403e41] text-[#fcfcfa]'
                  : isDark
                  ? 'bg-slate-900 border-slate-700 text-slate-100'
                  : 'bg-white border-zinc-200 text-zinc-900'
              }`}
            >
              <p className="text-xs font-semibold mb-1">No architecture nodes found for this filter</p>
              <p
                className={`text-[11px] mb-4 font-mono ${
                  isMonokai ? 'text-[#939293]' : isDark ? 'text-slate-400' : 'text-zinc-500'
                }`}
              >
                Try switching categories or reset to view all project nodes.
              </p>
              <button
                onClick={() => setFilterCategory('all')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer shadow-xs ${
                  isMonokai
                    ? 'bg-[#a6e22e] text-[#221f22] hover:bg-[#b8f03c]'
                    : isDark
                    ? 'bg-slate-100 text-slate-900 hover:bg-white'
                    : 'bg-zinc-900 hover:bg-black text-white'
                }`}
              >
                Show All Nodes
              </button>
            </div>
          </div>
        )}

        {activeDetailsNode && (
          <NodeDetailsPanel
            nodeData={activeDetailsNode.data}
            theme={canvasTheme}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            className={`border rounded-2xl shadow-2xl w-full max-w-2xl p-6 space-y-4 ${
              isMonokai
                ? 'bg-[#221f22] border-[#403e41] text-[#fcfcfa]'
                : isDark
                ? 'bg-slate-900 border-slate-700 text-slate-100'
                : 'bg-white border-zinc-200 text-zinc-900'
            }`}
          >
            <div
              className={`flex items-center justify-between border-b pb-3 ${
                isMonokai ? 'border-[#363537]' : isDark ? 'border-slate-800' : 'border-zinc-100'
              }`}
            >
              <h3 className="text-base font-bold">{exportModalContent.title}</h3>
              <button
                onClick={() => setExportModalContent(null)}
                className={`text-xs font-semibold cursor-pointer ${
                  isMonokai ? 'text-[#939293] hover:text-[#fcfcfa]' : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-zinc-400 hover:text-zinc-600'
                }`}
              >
                Close
              </button>
            </div>
            <textarea
              readOnly
              value={exportModalContent.content}
              className={`w-full h-64 p-3 border rounded-xl font-mono text-xs outline-none ${
                isMonokai
                  ? 'bg-[#2d2a2e] border-[#403e41] text-[#fcfcfa]'
                  : isDark
                  ? 'bg-slate-800 border-slate-700 text-slate-200'
                  : 'bg-zinc-50 border-zinc-200 text-zinc-800'
              }`}
            />
            <div className="flex justify-end">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(exportModalContent.content);
                  alert('Diagram syntax copied to clipboard!');
                }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold shadow-xs cursor-pointer ${
                  isMonokai
                    ? 'bg-[#a6e22e] text-[#221f22] hover:bg-[#b8f03c]'
                    : isDark
                    ? 'bg-slate-100 text-slate-900 hover:bg-white'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-white'
                }`}
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
