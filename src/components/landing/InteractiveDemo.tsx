import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  MarkerType,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Layers, FileCode, Database, ArrowRight, Sparkles, Play, Pause, RotateCcw } from 'lucide-react';

interface MiniNodeData {
  label: string;
  category: string;
  type: string;
  path: string;
  imports: string[];
  description: string;
  [key: string]: unknown;
}

function MiniCustomNode({ data, selected }: { data: MiniNodeData; selected?: boolean }) {
  const getIcon = () => {
    if (data.category === 'database') return <Database className="w-4 h-4 text-zinc-800" />;
    if (data.category === 'entry') return <FileCode className="w-4 h-4 text-zinc-900" />;
    return <FileCode className="w-4 h-4 text-zinc-700" />;
  };

  return (
    <div
      className={`px-3.5 py-2.5 rounded-xl bg-white border text-left shadow-xs transition-all w-48 cursor-pointer relative ${
        selected
          ? 'border-zinc-900 ring-2 ring-zinc-900/10 shadow-md scale-102 bg-zinc-50/50'
          : 'border-zinc-200/90 hover:border-zinc-300'
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-zinc-400 !w-2 !h-2" />
      <div className="flex items-center gap-2 mb-1">
        {getIcon()}
        <span className="text-xs font-bold text-zinc-900 truncate font-mono">{data.label}</span>
      </div>
      <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono font-medium">{data.type}</div>
      <Handle type="source" position={Position.Bottom} className="!bg-zinc-400 !w-2 !h-2" />

      {selected && (
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zinc-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-zinc-900"></span>
        </span>
      )}
    </div>
  );
}

const DEMO_NODES: Node<MiniNodeData>[] = [
  {
    id: 'main',
    type: 'miniNode',
    position: { x: 220, y: 30 },
    data: {
      label: 'main.tsx',
      category: 'entry',
      type: 'Starting Point',
      path: 'src/main.tsx',
      imports: ['src/App.tsx'],
      description: 'The starting point that opens the application and loads the first screen.',
    },
  },
  {
    id: 'app',
    type: 'miniNode',
    position: { x: 220, y: 130 },
    data: {
      label: 'App.tsx',
      category: 'component',
      type: 'Main Layout',
      path: 'src/App.tsx',
      imports: ['src/components/Navbar.tsx', 'src/views/Dashboard.tsx'],
      description: 'The main layout that brings pages, navigation, and shared settings together.',
    },
  },
  {
    id: 'navbar',
    type: 'miniNode',
    position: { x: 80, y: 240 },
    data: {
      label: 'Navbar.tsx',
      category: 'component',
      type: 'Navigation Bar',
      path: 'src/components/Navbar.tsx',
      imports: [],
      description: 'The top menu bar with search, helpful shortcuts, and account controls.',
    },
  },
  {
    id: 'dashboard',
    type: 'miniNode',
    position: { x: 360, y: 240 },
    data: {
      label: 'Dashboard.tsx',
      category: 'component',
      type: 'Home Screen',
      path: 'src/views/Dashboard.tsx',
      imports: ['src/services/api.ts'],
      description: 'The central overview screen showing charts, statistics, and project summaries.',
    },
  },
  {
    id: 'api',
    type: 'miniNode',
    position: { x: 360, y: 350 },
    data: {
      label: 'api.ts',
      category: 'service',
      type: 'Data Service',
      path: 'src/services/api.ts',
      imports: ['prisma/schema.prisma'],
      description: 'Fetches live data from servers smoothly and keeps information up to date.',
    },
  },
  {
    id: 'db',
    type: 'miniNode',
    position: { x: 360, y: 460 },
    data: {
      label: 'schema.prisma',
      category: 'database',
      type: 'Data Blueprint',
      path: 'prisma/schema.prisma',
      imports: [],
      description: 'Defines how information like users and accounts are stored and connected.',
    },
  },
];

const DEMO_EDGES: Edge[] = [
  { id: 'e-main-app', source: 'main', target: 'app', style: { stroke: '#71717A', strokeWidth: 1.5 } },
  { id: 'e-app-navbar', source: 'app', target: 'navbar', style: { stroke: '#71717A', strokeWidth: 1.5 } },
  { id: 'e-app-dashboard', source: 'app', target: 'dashboard', style: { stroke: '#71717A', strokeWidth: 1.5 } },
  { id: 'e-dashboard-api', source: 'dashboard', target: 'api', style: { stroke: '#71717A', strokeWidth: 1.5 } },
  { id: 'e-api-db', source: 'api', target: 'db', style: { stroke: '#71717A', strokeWidth: 1.5 } },
];

export function InteractiveDemo() {
  const [nodes, setNodes, onNodesChange] = useNodesState(DEMO_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(DEMO_EDGES);
  const [activeNodeId, setActiveNodeId] = useState<string>('dashboard');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  const nodeTypes = useMemo(
    () => ({
      miniNode: MiniCustomNode,
    }),
    []
  );

  // Auto-shift selected node every 3.5 seconds
  useEffect(() => {
    if (!isPlaying) return;

    const sequence = ['main', 'app', 'dashboard', 'api', 'db', 'navbar'];
    const interval = setInterval(() => {
      setActiveNodeId((prevId) => {
        const nextIndex = (sequence.indexOf(prevId) + 1) % sequence.length;
        return sequence[nextIndex];
      });
    }, 3500);

    return () => clearInterval(interval);
  }, [isPlaying]);

  // Highlight active node and edges in React Flow graph
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        selected: n.id === activeNodeId,
      }))
    );

    setEdges((eds) =>
      eds.map((e) => {
        const isRelated = e.source === activeNodeId || e.target === activeNodeId;
        return {
          ...e,
          style: {
            stroke: isRelated ? '#111111' : '#D4D4D8',
            strokeWidth: isRelated ? 2.5 : 1.5,
            opacity: isRelated ? 1 : 0.4,
          },
        };
      })
    );
  }, [activeNodeId, setNodes, setEdges]);

  const onNodeClick = useCallback((_: any, node: Node) => {
    setActiveNodeId(node.id);
  }, []);

  const activeNodeData = useMemo(() => {
    return DEMO_NODES.find((n) => n.id === activeNodeId)?.data || DEMO_NODES[0].data;
  }, [activeNodeId]);

  return (
    <div className="w-full max-w-5xl mx-auto rounded-2xl border border-zinc-200/90 bg-white shadow-xl overflow-hidden z-10 relative">
      {/* Top Bar (White Theme) */}
      <div className="flex flex-wrap items-center justify-between px-5 py-3 border-b border-zinc-200 bg-white text-zinc-900 gap-3">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-300" />
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-300" />
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-300" />
          </div>
          <span className="text-xs font-mono font-semibold text-zinc-700 ml-2">
            domoscope-interactive-map
          </span>
        </div>

        {/* Video Animation Controls */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/80 border border-black/10 backdrop-blur-md rounded-full text-[11px] font-mono text-zinc-700 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-zinc-900 animate-pulse" />
            <span>Interactive Preview</span>
          </div>

          <button
            onClick={() => setIsPlaying((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-1 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-mono transition-colors cursor-pointer shadow-2xs"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'Pause' : 'Auto Play'}</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Frame */}
      <div className="relative h-[480px] w-full flex bg-white">
        {/* React Flow Canvas Area */}
        <div className="flex-1 h-full relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.5}
            maxZoom={1.5}
            defaultEdgeOptions={{
              markerEnd: { type: MarkerType.ArrowClosed, color: '#71717A' },
            }}
          >
            <Background color="#E4E4E7" gap={18} size={1} />
            <Controls showInteractive={false} className="!left-4 !bottom-4 !border-zinc-200 shadow-sm" />
          </ReactFlow>
        </div>

        {/* Selected Node Inspector Sidebar (White Glassmorphic Theme) */}
        <div className="w-80 border-l border-zinc-200 bg-zinc-50/70 p-5 flex flex-col justify-between hidden md:flex">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeNodeId}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-zinc-800" />
                <span>File Details</span>
              </div>

              <div>
                <h4 className="text-base font-bold text-zinc-900 font-mono">{activeNodeData.label}</h4>
                <p className="text-xs text-zinc-500 font-mono mt-0.5">{activeNodeData.path}</p>
              </div>

              <div className="p-3 bg-white border border-zinc-200 rounded-xl text-xs space-y-1 shadow-2xs">
                <span className="text-[10px] font-mono text-zinc-400 uppercase font-semibold">
                  What this file does
                </span>
                <p className="text-xs font-semibold text-zinc-900">{activeNodeData.type}</p>
                <p className="text-xs text-zinc-600 leading-relaxed pt-1 font-sans">
                  {activeNodeData.description}
                </p>
              </div>

              {activeNodeData.imports.length > 0 && (
                <div className="pt-2">
                  <span className="text-[11px] font-mono text-zinc-500 uppercase font-semibold block mb-2">
                    Connected to ({activeNodeData.imports.length} files)
                  </span>
                  <div className="space-y-1.5">
                    {activeNodeData.imports.map((imp) => (
                      <div
                        key={imp}
                        className="flex items-center gap-2 px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs text-zinc-800 font-mono shadow-2xs"
                      >
                        <ArrowRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="truncate font-semibold">{imp.split('/').pop()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="pt-4 border-t border-zinc-200/80 text-[11px] text-zinc-500 font-mono leading-relaxed">
            Click any card above to see what it does and how it connects.
          </div>
        </div>
      </div>
    </div>
  );
}
