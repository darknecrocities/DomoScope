import { Handle, Position } from '@xyflow/react';
import { FileCode, Database, Layers, Server, Globe } from 'lucide-react';
import { ArchitectureNodeData } from '../../types';

interface CustomNodeProps {
  data: ArchitectureNodeData;
  selected?: boolean;
}

export function CustomNode({ data, selected }: CustomNodeProps) {
  const getIcon = () => {
    switch (data.category) {
      case 'database':
        return <Database className="w-3.5 h-3.5 text-zinc-600 shrink-0" />;
      case 'api':
        return <Globe className="w-3.5 h-3.5 text-zinc-600 shrink-0" />;
      case 'service':
        return <Server className="w-3.5 h-3.5 text-zinc-600 shrink-0" />;
      case 'component':
        return <Layers className="w-3.5 h-3.5 text-zinc-600 shrink-0" />;
      default:
        return <FileCode className="w-3.5 h-3.5 text-zinc-600 shrink-0" />;
    }
  };

  return (
    <div
      className={`px-3 py-2 rounded-lg bg-white border text-left transition-all w-52 select-none shadow-xs ${
        selected
          ? 'border-zinc-900 ring-2 ring-zinc-900/10 shadow-md'
          : 'border-zinc-200 hover:border-zinc-400'
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-zinc-400 !w-2 !h-2" />
      <div className="flex items-center gap-2 mb-0.5">
        {getIcon()}
        <span className="text-xs font-semibold text-zinc-900 truncate font-mono">
          {data.label}
        </span>
      </div>
      <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
        <span className="capitalize">{data.category}</span>
        {data.importsCount > 0 && <span>{data.importsCount} deps</span>}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-zinc-400 !w-2 !h-2" />
    </div>
  );
}
