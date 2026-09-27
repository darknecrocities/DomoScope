import { X, FileCode, ExternalLink, MessageSquare, ArrowRight, ArrowLeft } from 'lucide-react';
import { ArchitectureNodeData } from '../../types';

interface NodeDetailsPanelProps {
  nodeData: ArchitectureNodeData;
  onClose: () => void;
  onOpenFile: (path: string) => void;
  onAskExplain: (path: string) => void;
  incomingConnections: string[];
  outgoingConnections: string[];
  theme?: 'light' | 'dark' | 'monokai';
}

export function NodeDetailsPanel({
  nodeData,
  onClose,
  onOpenFile,
  onAskExplain,
  incomingConnections,
  outgoingConnections,
  theme = 'light',
}: NodeDetailsPanelProps) {
  const isDark = theme === 'dark';
  const isMonokai = theme === 'monokai';

  const panelBg = isMonokai
    ? 'bg-[#221f22]/95 border-[#403e41] text-[#fcfcfa]'
    : isDark
    ? 'bg-slate-900/95 border-slate-700 text-slate-100'
    : 'bg-white border-zinc-200 text-zinc-900';

  const borderLine = isMonokai
    ? 'border-[#363537]'
    : isDark
    ? 'border-slate-800'
    : 'border-zinc-100';

  const metaLabel = isMonokai
    ? 'text-[#939293]'
    : isDark
    ? 'text-slate-400'
    : 'text-zinc-400';

  const itemBg = isMonokai
    ? 'bg-[#2d2a2e] hover:bg-[#363537] text-[#fcfcfa]'
    : isDark
    ? 'bg-slate-800/80 hover:bg-slate-800 text-slate-200'
    : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700';

  return (
    <div className={`absolute right-4 top-4 z-20 w-80 border rounded-2xl shadow-xl p-5 flex flex-col justify-between max-h-[calc(100%-2rem)] overflow-y-auto backdrop-blur-md animate-in fade-in duration-150 ${panelBg}`}>
      <div>
        {/* Header */}
        <div className={`flex items-start justify-between gap-2 pb-3 border-b ${borderLine}`}>
          <div className="min-w-0">
            <div className={`flex items-center gap-1.5 text-[11px] font-mono uppercase ${metaLabel}`}>
              <FileCode className="w-3.5 h-3.5" />
              <span>{nodeData.category}</span>
            </div>
            <h3 className="text-sm font-bold font-mono truncate mt-0.5" title={nodeData.label}>
              {nodeData.label}
            </h3>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded-md transition-colors cursor-pointer ${
              isMonokai
                ? 'text-[#939293] hover:text-[#fcfcfa] hover:bg-[#363537]'
                : isDark
                ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100'
            }`}
            aria-label="Close details"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Location Path */}
        <div className={`py-3 border-b ${borderLine}`}>
          <span className={`text-[10px] font-mono uppercase ${metaLabel}`}>Location</span>
          <p className="text-xs font-mono break-all mt-0.5 opacity-90">{nodeData.path}</p>
        </div>

        {/* Outgoing Connections (Imports) */}
        <div className={`py-3 border-b ${borderLine}`}>
          <div className={`flex items-center justify-between text-[10px] font-mono uppercase mb-1.5 ${metaLabel}`}>
            <div className="flex items-center gap-1">
              <ArrowRight className="w-3 h-3" />
              <span>Imports ({outgoingConnections.length})</span>
            </div>
          </div>
          {outgoingConnections.length === 0 ? (
            <p className={`text-xs italic ${metaLabel}`}>No local imports detected.</p>
          ) : (
            <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
              {outgoingConnections.map((target) => (
                <div
                  key={target}
                  onClick={() => onOpenFile(target)}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono cursor-pointer transition-colors ${itemBg}`}
                >
                  <span className="truncate">{target.split('/').pop()}</span>
                  <ArrowRight className="w-3 h-3 opacity-50 shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Incoming Connections (Used By) */}
        <div className={`py-3 border-b ${borderLine}`}>
          <div className={`flex items-center justify-between text-[10px] font-mono uppercase mb-1.5 ${metaLabel}`}>
            <div className="flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" />
              <span>Used By ({incomingConnections.length})</span>
            </div>
          </div>
          {incomingConnections.length === 0 ? (
            <p className={`text-xs italic ${metaLabel}`}>No incoming connections detected.</p>
          ) : (
            <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
              {incomingConnections.map((source) => (
                <div
                  key={source}
                  onClick={() => onOpenFile(source)}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono cursor-pointer transition-colors ${itemBg}`}
                >
                  <span className="truncate">{source.split('/').pop()}</span>
                  <ExternalLink className="w-3 h-3 opacity-50 shrink-0" />
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
          className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs ${
            isMonokai
              ? 'bg-[#a6e22e] hover:bg-[#b8f03c] text-[#221f22]'
              : isDark
              ? 'bg-slate-100 hover:bg-white text-slate-900'
              : 'bg-zinc-900 hover:bg-black text-white'
          }`}
        >
          <FileCode className="w-3.5 h-3.5" />
          <span>Open in File Viewer</span>
        </button>

        <button
          onClick={() => onAskExplain(nodeData.path)}
          className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            isMonokai
              ? 'bg-[#2d2a2e] hover:bg-[#363537] text-[#fcfcfa] border border-[#403e41]'
              : isDark
              ? 'bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700'
              : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Explain this File</span>
        </button>
      </div>
    </div>
  );
}
