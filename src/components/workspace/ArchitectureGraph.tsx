import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Search, Filter, RotateCcw } from 'lucide-react';
import { RepoFile, FileCategory, ArchitectureNodeData } from '../../types';
import { buildArchitectureGraph } from '../../services/graphBuilder';
import { CustomNode } from './CustomNode';
import { NodeDetailsPanel } from './NodeDetailsPanel';

interface ArchitectureGraphProps {
  files: RepoFile[];
  fileContents: Map<string, string>;
  selectedNodeId?: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onOpenFile: (path: string) => void;
  onAskExplain: (path: string) => void;
  rankDirection?: 'TB' | 'LR';
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
  rankDirection = 'TB',
}: ArchitectureGraphProps) {
  const [filterCategory, setFilterCategory] = useState<FileCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDetailsNode, setActiveDetailsNode] = useState<Node<ArchitectureNodeData> | null>(null);

  // Compute graph data using buildArchitectureGraph service
  const { initialNodes, initialEdges, connectionsMap } = useMemo(() => {
    const result = buildArchitectureGraph(files, fileContents, {
      filterCategory,
      rankDirection,
    });
    return {
      initialNodes: result.nodes,
      initialEdges: result.edges,
      connectionsMap: result.connectionsMap,
    };
  }, [files, fileContents, filterCategory, rankDirection]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes and edges whenever initial graph changes
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Handle node selection and edge highlighting/dimming
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
            stroke: isRelated ? '#111111' : '#D4D4D8',
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

  // Search filtering highlight
  useEffect(() => {
    if (!searchQuery.trim()) return;
    const q = searchQuery.toLowerCase().trim();
    setNodes((nds) =>
      nds.map((n) => {
        const matches = n.data.label.toLowerCase().includes(q) || n.data.path.toLowerCase().includes(q);
        return {
          ...n,
          style: {
            opacity: matches ? 1 : 0.2,
          },
        };
      })
    );
  }, [searchQuery, setNodes]);

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

  // Outgoing / incoming connections for active details panel
  const outgoingConnections = useMemo(() => {
    if (!activeDetailsNode) return [];
    return edges.filter((e) => e.source === activeDetailsNode.id).map((e) => e.target);
  }, [activeDetailsNode, edges]);

  const incomingConnections = useMemo(() => {
    if (!activeDetailsNode) return [];
    return edges.filter((e) => e.target === activeDetailsNode.id).map((e) => e.source);
  }, [activeDetailsNode, edges]);

  return (
    <div className="relative w-full h-full flex flex-col bg-zinc-50 overflow-hidden">
      {/* Graph Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-white border-b border-zinc-200 z-10 shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto pr-2">
          <Filter className="w-3.5 h-3.5 text-zinc-400 shrink-0 mr-1" />
          {CATEGORY_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterCategory(f.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors shrink-0 cursor-pointer ${
                filterCategory === f.id
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-50 border border-zinc-200 rounded-lg text-xs w-44">
            <Search className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter nodes..."
              className="bg-transparent outline-none w-full text-zinc-800 placeholder:text-zinc-400 font-mono text-xs"
            />
          </div>

          <button
            onClick={() => {
              setFilterCategory('all');
              setSearchQuery('');
              onSelectNode(null);
            }}
            className="p-1.5 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded-md transition-colors"
            title="Reset Graph Filters"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* React Flow Graph Surface */}
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
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.2}
          maxZoom={2}
          defaultEdgeOptions={{
            markerEnd: { type: MarkerType.ArrowClosed, color: '#71717A' },
          }}
        >
          <Background color="#E4E4E7" gap={16} size={1} />
          <Controls className="!border-zinc-200" />
        </ReactFlow>

        {/* Node Details Inspector Sidebar */}
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
    </div>
  );
}
