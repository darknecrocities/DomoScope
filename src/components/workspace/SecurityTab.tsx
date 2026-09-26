import { useState } from 'react';
import { Shield, AlertTriangle, FileCode, ArrowRight, CheckCircle2 } from 'lucide-react';
import { SecurityFinding } from '../../types';
import { EmptyState } from '../common/EmptyState';

interface SecurityTabProps {
  findings: SecurityFinding[];
  onOpenFile: (path: string) => void;
}

export function SecurityTab({ findings, onOpenFile }: SecurityTabProps) {
  const [selectedSeverity, setSelectedSeverity] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');

  if (findings.length === 0) {
    return (
      <EmptyState
        icon={Shield}
        title="No potential security issues detected"
        description="No potential issues were detected by the current checks in the inspectable source files."
      />
    );
  }

  const filtered = findings.filter(
    (f) => selectedSeverity === 'all' || f.severity === selectedSeverity
  );

  const criticalCount = findings.filter((f) => f.severity === 'critical').length;
  const highCount = findings.filter((f) => f.severity === 'high').length;
  const mediumCount = findings.filter((f) => f.severity === 'medium').length;

  return (
    <div className="h-full flex flex-col bg-zinc-50 overflow-hidden">
      {/* Top Header & Severity Filter */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-3.5 bg-white border-b border-zinc-200">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-zinc-700" />
            <h2 className="text-sm font-semibold text-zinc-900">Security Audit</h2>
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded border border-zinc-200 bg-zinc-50 text-zinc-700">
            {findings.length} findings
          </span>
        </div>

        {/* Severity Filter Pills */}
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <button
            onClick={() => setSelectedSeverity('all')}
            className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
              selectedSeverity === 'all' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            All ({findings.length})
          </button>
          {criticalCount > 0 && (
            <button
              onClick={() => setSelectedSeverity('critical')}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                selectedSeverity === 'critical'
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              Critical ({criticalCount})
            </button>
          )}
          {highCount > 0 && (
            <button
              onClick={() => setSelectedSeverity('high')}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                selectedSeverity === 'high' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              High ({highCount})
            </button>
          )}
          {mediumCount > 0 && (
            <button
              onClick={() => setSelectedSeverity('medium')}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                selectedSeverity === 'medium'
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              Medium ({mediumCount})
            </button>
          )}
        </div>
      </div>

      {/* Findings List */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="p-3.5 bg-zinc-100/70 border border-zinc-200 rounded-lg text-xs text-zinc-600">
            Static security checks inspect source patterns for potential exposure. Findings are flagged for developer review and do not guarantee exploitability.
          </div>

          {filtered.map((item) => (
            <div
              key={item.id}
              className="p-5 bg-white border border-zinc-200 rounded-xl shadow-xs space-y-3 hover:border-zinc-300 transition-colors"
            >
              {/* Finding Title & File Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <AlertTriangle className="w-4 h-4 text-zinc-700 shrink-0" />
                  <span className="text-sm font-semibold text-zinc-900 truncate">
                    {item.title}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded border border-zinc-200 bg-zinc-50 uppercase text-zinc-600">
                    {item.severity}
                  </span>
                </div>

                <button
                  onClick={() => onOpenFile(item.file)}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-md text-xs font-mono text-zinc-700 transition-colors shrink-0 self-start cursor-pointer"
                >
                  <FileCode className="w-3.5 h-3.5 text-zinc-400" />
                  <span>
                    {item.file}:{item.line}
                  </span>
                  <ArrowRight className="w-3 h-3 text-zinc-400" />
                </button>
              </div>

              {/* Evidence Code Snippet */}
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg font-mono text-xs text-zinc-800 overflow-x-auto">
                <span className="text-zinc-400 select-none mr-3">{item.line} |</span>
                <code>{item.evidence}</code>
              </div>

              {/* Explanation & Suggested Action */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs">
                <div>
                  <span className="font-mono text-[10px] text-zinc-400 uppercase block mb-1">
                    Explanation
                  </span>
                  <p className="text-zinc-600 leading-relaxed">{item.explanation}</p>
                </div>
                <div>
                  <span className="font-mono text-[10px] text-zinc-400 uppercase block mb-1">
                    Suggested Action
                  </span>
                  <p className="text-zinc-700 font-medium leading-relaxed">
                    {item.suggestedAction}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
