import { X, FileCode, ExternalLink, MessageSquare, ArrowRight, ArrowLeft } from 'lucide-react';
import { ArchitectureNodeData } from '../../types';

interface NodeDetailsPanelProps {
  nodeData: ArchitectureNodeData;
  onClose: () => void;
  onOpenFile: (path: string) => void;
  onAskExplain: (path: string) => void;
  incomingConnections: string[];
  outgoingConnections: string[];
}

export function NodeDetailsPanel({
  nodeData,
  onClose,
  onOpenFile,
  onAskExplain,
  incomingConnections,
  outgoingConnections,
}: NodeDetailsPanelProps) {
  return (
    <div className="absolute right-4 top-4 z-20 w-80 bg-white border border-zinc-200 rounded-xl shadow-lg p-5 flex flex-col justify-between max-h-[calc(100%-2rem)] overflow-y-auto animate-in fade-in duration-150">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-2 pb-3 border-b border-zinc-100">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 uppercase">
              <FileCode className="w-3.5 h-3.5" />
              <span>{nodeData.category}</span>
            </div>
            <h3 className="text-sm font-bold text-zinc-900 font-mono truncate mt-0.5">
              {nodeData.label}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-700 rounded-md hover:bg-zinc-100 transition-colors"
            aria-label="Close details"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Location Path */}
        <div className="py-3 border-b border-zinc-100">
          <span className="text-[10px] font-mono text-zinc-400 uppercase">Location</span>
          <p className="text-xs font-mono text-zinc-700 break-all mt-0.5">{nodeData.path}</p>
        </div>

        {/* Outgoing Connections (Imports) */}
        <div className="py-3 border-b border-zinc-100">
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 uppercase mb-1.5">
            <div className="flex items-center gap-1">
              <ArrowRight className="w-3 h-3" />
              <span>Imports ({outgoingConnections.length})</span>
            </div>
          </div>
          {outgoingConnections.length === 0 ? (
            <p className="text-xs text-zinc-400 italic">No local imports detected.</p>
          ) : (
            <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
              {outgoingConnections.map((target) => (
                <div
                  key={target}
                  onClick={() => onOpenFile(target)}
                  className="flex items-center justify-between px-2 py-1 bg-zinc-50 hover:bg-zinc-100 rounded text-xs font-mono text-zinc-700 cursor-pointer transition-colors"
                >
                  <span className="truncate">{target.split('/').pop()}</span>
                  <ArrowRight className="w-3 h-3 text-zinc-400 shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Incoming Connections (Used By) */}
        <div className="py-3 border-b border-zinc-100">
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 uppercase mb-1.5">
            <div className="flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" />
              <span>Used By ({incomingConnections.length})</span>
            </div>
          </div>
          {incomingConnections.length === 0 ? (
            <p className="text-xs text-zinc-400 italic">No incoming connections detected.</p>
          ) : (
            <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
              {incomingConnections.map((source) => (
                <div
                  key={source}
                  onClick={() => onOpenFile(source)}
                  className="flex items-center justify-between px-2 py-1 bg-zinc-50 hover:bg-zinc-100 rounded text-xs font-mono text-zinc-700 cursor-pointer transition-colors"
                >
                  <span className="truncate">{source.split('/').pop()}</span>
                  <ExternalLink className="w-3 h-3 text-zinc-400 shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="pt-4 flex flex-col gap-2">
        <button
          onClick={() => onOpenFile(nodeData.path)}
          className="w-full py-1.5 px-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <FileCode className="w-3.5 h-3.5" />
          <span>Open in File Viewer</span>
        </button>

        <button
          onClick={() => onAskExplain(nodeData.path)}
          className="w-full py-1.5 px-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Explain this File</span>
        </button>
      </div>
    </div>
  );
}
