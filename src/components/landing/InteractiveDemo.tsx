import { useState, useCallback, useMemo } from 'react';
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
import { Layers, FileCode, Database, ArrowRight, Sparkles } from 'lucide-react';

interface MiniNodeData {
  label: string;
  category: string;
  type: string;
  path: string;
  imports: string[];
  [key: string]: unknown;
}

function MiniCustomNode({ data, selected }: { data: MiniNodeData; selected?: boolean }) {
  const getIcon = () => {
    if (data.category === 'database') return <Database className="w-3.5 h-3.5 text-zinc-600" />;
    return <FileCode className="w-3.5 h-3.5 text-zinc-600" />;
  };

  return (
    <div
      className={`px-3 py-2 rounded-lg bg-white border text-left shadow-xs transition-all w-44 cursor-pointer ${
        selected ? 'border-zinc-900 ring-1 ring-zinc-900 shadow-md' : 'border-zinc-200 hover:border-zinc-400'
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-zinc-400 !w-2 !h-2" />
      <div className="flex items-center gap-2 mb-1">
        {getIcon()}
        <span className="text-xs font-semibold text-zinc-900 truncate font-mono">{data.label}</span>
      </div>
      <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">{data.type}</div>
      <Handle type="source" position={Position.Bottom} className="!bg-zinc-400 !w-2 !h-2" />
    </div>
  );
}

const INITIAL_NODES: Node<MiniNodeData>[] = [
  {
    id: 'main',
    type: 'miniNode',
    position: { x: 220, y: 30 },
    data: {
      label: 'main.tsx',
      category: 'entry',
      type: 'Entry Point',
      path: 'src/main.tsx',
      imports: ['src/App.tsx'],
    },
  },
  {
    id: 'app',
    type: 'miniNode',
    position: { x: 220, y: 130 },
    data: {
      label: 'App.tsx',
      category: 'component',
      type: 'Root Component',
      path: 'src/App.tsx',
      imports: ['src/components/Navbar.tsx', 'src/views/Dashboard.tsx'],
    },
  },
  {
    id: 'navbar',
    type: 'miniNode',
    position: { x: 90, y: 240 },
    data: {
      label: 'Navbar.tsx',
      category: 'component',
      type: 'UI Component',
      path: 'src/components/Navbar.tsx',
      imports: [],
    },
  },
  {
    id: 'dashboard',
    type: 'miniNode',
    position: { x: 350, y: 240 },
    data: {
      label: 'Dashboard.tsx',
      category: 'component',
      type: 'Page Component',
      path: 'src/views/Dashboard.tsx',
      imports: ['src/services/api.ts'],
    },
  },
  {
    id: 'api',
    type: 'miniNode',
    position: { x: 350, y: 350 },
    data: {
      label: 'api.ts',
      category: 'service',
      type: 'API Client',
      path: 'src/services/api.ts',
      imports: ['prisma/schema.prisma'],
    },
  },
  {
    id: 'db',
    type: 'miniNode',
    position: { x: 350, y: 460 },
    data: {
      label: 'schema.prisma',
      category: 'database',
      type: 'Database Schema',
      path: 'prisma/schema.prisma',
      imports: [],
    },
  },
];

const INITIAL_EDGES: Edge[] = [
  { id: 'e-main-app', source: 'main', target: 'app', style: { stroke: '#71717A', strokeWidth: 1.5 } },
  { id: 'e-app-navbar', source: 'app', target: 'navbar', style: { stroke: '#71717A', strokeWidth: 1.5 } },
  { id: 'e-app-dashboard', source: 'app', target: 'dashboard', style: { stroke: '#71717A', strokeWidth: 1.5 } },
  { id: 'e-dashboard-api', source: 'dashboard', target: 'api', style: { stroke: '#71717A', strokeWidth: 1.5 } },
  { id: 'e-api-db', source: 'api', target: 'db', style: { stroke: '#71717A', strokeWidth: 1.5 } },
];

export function InteractiveDemo() {
  const [nodes, , onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, , onEdgesChange] = useEdgesState(INITIAL_EDGES);
  const [selectedNode, setSelectedNode] = useState<MiniNodeData | null>(INITIAL_NODES[3].data);

  const nodeTypes = useMemo(
    () => ({
      miniNode: MiniCustomNode,
    }),
    []
  );

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNode(node.data as MiniNodeData);
  }, []);

  return (
    <div className="w-full max-w-5xl mx-auto rounded-xl border border-zinc-200 bg-white shadow-xl overflow-hidden">
      {/* Top Demo Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 bg-zinc-50">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-300" />
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-300" />
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-300" />
          </div>
          <span className="text-xs font-mono text-zinc-500 ml-2">domoscope-demo-workspace</span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-mono">
          <Layers className="w-3.5 h-3.5" />
          <span>Interactive Canvas &bull; Drag & zoom</span>
        </div>
      </div>

      {/* Main Workspace Frame */}
      <div className="relative h-[480px] w-full flex">
        {/* Canvas Area */}
        <div className="flex-1 h-full relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-left"
            minZoom={0.5}
            maxZoom={1.5}
            defaultEdgeOptions={{
              markerEnd: { type: MarkerType.ArrowClosed, color: '#71717A' },
            }}
          >
            <Background color="#E4E4E7" gap={16} size={1} />
            <Controls showInteractive={false} className="!left-4 !bottom-4 !border-zinc-200" />
          </ReactFlow>
        </div>

        {/* Selected Node Mini Inspector Panel */}
        {selectedNode && (
          <div className="w-72 border-l border-zinc-200 bg-white p-4 flex flex-col justify-between hidden sm:flex animate-in fade-in duration-150">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 uppercase tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Node Inspector</span>
              </div>
              <h4 className="text-sm font-semibold text-zinc-900 font-mono">{selectedNode.label}</h4>
              <p className="text-xs text-zinc-500 font-mono mt-0.5">{selectedNode.path}</p>

              <div className="mt-4 pt-3 border-t border-zinc-100">
                <span className="text-[11px] font-mono text-zinc-400 uppercase">Subsystem Type</span>
                <p className="text-xs font-medium text-zinc-800 mt-1">{selectedNode.type}</p>
              </div>

              {selectedNode.imports.length > 0 && (
                <div className="mt-4 pt-3 border-t border-zinc-100">
                  <span className="text-[11px] font-mono text-zinc-400 uppercase">Outgoing Connections</span>
                  <div className="mt-1 space-y-1">
                    {selectedNode.imports.map((imp) => (
                      <div key={imp} className="flex items-center gap-1.5 text-xs text-zinc-700 font-mono">
                        <ArrowRight className="w-3 h-3 text-zinc-400" />
                        <span className="truncate">{imp.split('/').pop()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-zinc-100 text-[11px] text-zinc-400">
              In DomoScope, this graph is dynamically computed from parsed import statements in real GitHub repositories.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
