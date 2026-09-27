import React, { useState, useMemo } from 'react';
import { CallGraphNode } from '../../types';
import { buildCallGraph } from '../../services/callGraphTracer';
import { X, GitCommit, ArrowRight, CornerDownRight, FunctionSquare } from 'lucide-react';

interface CallGraphModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileContents: Map<string, string>;
  initialSymbol?: string;
}

export const CallGraphModal: React.FC<CallGraphModalProps> = ({
  isOpen,
  onClose,
  fileContents,
  initialSymbol,
}) => {
  const [selectedSymbol, setSelectedSymbol] = useState(initialSymbol || '');

  const callNodes = useMemo(() => {
    return buildCallGraph(fileContents, selectedSymbol);
  }, [fileContents, selectedSymbol]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200 font-sans">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-zinc-100 text-black rounded-xl border border-zinc-200">
              <FunctionSquare className="w-5 h-5 text-black stroke-[2]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900">Interactive Function Call Tracer</h3>
              <p className="text-xs text-zinc-500 font-mono">Visualizing execution flows and caller-callee dependencies</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-black rounded-lg hover:bg-zinc-100 transition-colors"
          >
            <X className="w-5 h-5 text-black stroke-[2]" />
          </button>
        </div>

        {/* Input Symbol Search */}
        <div className="p-6 border-b border-zinc-200 bg-white flex items-center gap-3">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider font-mono">Target Function:</span>
          <input
            type="text"
            placeholder="e.g. buildArchitectureGraph, fetchUserData, calculateTotal..."
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            className="flex-1 px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-mono text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black"
          />
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {callNodes.length === 0 ? (
            <div className="text-center py-12 text-zinc-400 font-mono text-xs">
              <GitCommit className="w-10 h-10 mx-auto mb-2 opacity-50 text-black" />
              <p className="text-sm font-medium text-zinc-800">No call graph relationships found for "{selectedSymbol}"</p>
              <p className="text-xs mt-1 text-zinc-500">Try entering a different function or method name in the search box.</p>
            </div>
          ) : (
            callNodes.map((node) => (
              <div key={node.id} className="border border-zinc-200 rounded-xl p-4 bg-white shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-zinc-900 text-white text-xs font-mono font-bold rounded">
                      fn
                    </span>
                    <h4 className="font-mono font-bold text-zinc-900 text-sm">{node.name}</h4>
                  </div>
                  <span className="text-xs text-zinc-400 font-mono">
                    {node.file}:{node.line}
                  </span>
                </div>

                {/* Called By Section */}
                {node.calledBy.length > 0 && (
                  <div className="pl-4 border-l-2 border-zinc-300 space-y-1">
                    <span className="text-xs font-semibold text-zinc-800 flex items-center gap-1 font-mono">
                      <CornerDownRight className="w-3 h-3 text-black" /> Called By ({node.calledBy.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {node.calledBy.map((caller) => (
                        <button
                          key={caller}
                          onClick={() => setSelectedSymbol(caller)}
                          className="px-2 py-0.5 bg-zinc-100 text-zinc-900 border border-zinc-200 text-xs font-mono rounded hover:bg-zinc-200 transition-colors"
                        >
                          {caller}()
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Calls Section */}
                {node.calls.length > 0 && (
                  <div className="pl-4 border-l-2 border-zinc-300 space-y-1">
                    <span className="text-xs font-semibold text-zinc-800 flex items-center gap-1 font-mono">
                      <ArrowRight className="w-3 h-3 text-black" /> Invokes ({node.calls.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {node.calls.map((callee) => (
                        <button
                          key={callee}
                          onClick={() => setSelectedSymbol(callee)}
                          className="px-2 py-0.5 bg-zinc-100 text-zinc-900 border border-zinc-200 text-xs font-mono rounded hover:bg-zinc-200 transition-colors"
                        >
                          {callee}()
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
