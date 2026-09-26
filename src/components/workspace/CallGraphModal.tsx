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
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <FunctionSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Interactive Function Call Tracer</h3>
              <p className="text-xs text-slate-500">Visualizing execution flows and caller-callee dependencies</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input Symbol Search */}
        <div className="p-6 border-b border-slate-100 bg-white flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Target Function:</span>
          <input
            type="text"
            placeholder="e.g. buildArchitectureGraph, fetchUserData, calculateTotal..."
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {callNodes.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <GitCommit className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">No call graph relationships found for "{selectedSymbol}"</p>
              <p className="text-xs mt-1">Try entering a different function or method name in the search box.</p>
            </div>
          ) : (
            callNodes.map((node) => (
              <div key={node.id} className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-mono font-bold rounded">
                      fn
                    </span>
                    <h4 className="font-mono font-bold text-slate-900 text-sm">{node.name}</h4>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    {node.file}:{node.line}
                  </span>
                </div>

                {/* Called By Section */}
                {node.calledBy.length > 0 && (
                  <div className="pl-4 border-l-2 border-emerald-300 space-y-1">
                    <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                      <CornerDownRight className="w-3 h-3" /> Called By ({node.calledBy.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {node.calledBy.map((caller) => (
                        <button
                          key={caller}
                          onClick={() => setSelectedSymbol(caller)}
                          className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-mono rounded hover:bg-emerald-100 transition-colors"
                        >
                          {caller}()
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Calls Section */}
                {node.calls.length > 0 && (
                  <div className="pl-4 border-l-2 border-blue-300 space-y-1">
                    <span className="text-xs font-semibold text-blue-700 flex items-center gap-1">
                      <ArrowRight className="w-3 h-3" /> Invokes ({node.calls.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {node.calls.map((callee) => (
                        <button
                          key={callee}
                          onClick={() => setSelectedSymbol(callee)}
                          className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 text-xs font-mono rounded hover:bg-blue-100 transition-colors"
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
