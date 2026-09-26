import { useState } from 'react';
import {
  Shield,
  AlertTriangle,
  FileCode,
  ArrowRight,
  Wand2,
  Check,
  Copy,
  Download,
  Lock,
  CheckCircle2,
} from 'lucide-react';
import { SecurityFinding } from '../../types';
import { EmptyState } from '../common/EmptyState';

interface SecurityTabProps {
  findings: SecurityFinding[];
  onOpenFile: (path: string) => void;
}

export function SecurityTab({ findings, onOpenFile }: SecurityTabProps) {
  const [selectedSeverity, setSelectedSeverity] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const [generatedPatches, setGeneratedPatches] = useState<Record<string, { original: string; patched: string }>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (findings.length === 0) {
    return (
      <EmptyState
        icon={Shield}
        title="No Security Vulnerabilities Detected"
        description="All inspected source files passed static security analysis checks clean."
      />
    );
  }

  const filtered = findings.filter(
    (f) => selectedSeverity === 'all' || f.severity === selectedSeverity
  );

  const criticalCount = findings.filter((f) => f.severity === 'critical').length;
  const highCount = findings.filter((f) => f.severity === 'high').length;
  const mediumCount = findings.filter((f) => f.severity === 'medium').length;

  const handleGeneratePatch = (item: SecurityFinding) => {
    let patched = item.evidence;

    // Intelligent security fix synthesizer based on vulnerability signature
    if (item.evidence.includes('eval(')) {
      patched = `// SAFE FIX: Avoid eval and parse JSON safely\nconst result = JSON.parse(${item.evidence.replace(/eval\((.*)\)/, '$1')});`;
    } else if (item.evidence.includes('dangerouslySetInnerHTML')) {
      patched = `// SAFE FIX: Sanitize HTML content with DOMPurify\n<div>{DOMPurify.sanitize(${item.evidence.match(/__html:\s*([^}]+)/)?.[1] || 'content'})}</div>`;
    } else if (item.evidence.includes('exec(') || item.evidence.includes('spawn(')) {
      patched = `// SAFE FIX: Parameterize command line arguments to prevent command injection\nexecFile('command', ['arg1', 'arg2'], (error, stdout) => { ... });`;
    } else if (item.evidence.includes('http://')) {
      patched = item.evidence.replace('http://', 'https://');
    } else {
      patched = `// SAFE FIX: Validate input parameters before execution\nif (!isValidInput(input)) throw new Error('Invalid input');\n${item.evidence}`;
    }

    setGeneratedPatches((prev) => ({
      ...prev,
      [item.id]: {
        original: item.evidence,
        patched,
      },
    }));
  };

  const handleCopyPatch = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadAllPatches = () => {
    const patchContent = findings
      .map((f, idx) => {
        const patch = generatedPatches[f.id]?.patched || f.suggestedAction;
        return `--- a/${f.file}\n+++ b/${f.file}\n@@ -${f.line},1 +${f.line},1 @@\n# Fix for: ${f.title} (${f.severity.toUpperCase()})\n- ${f.evidence}\n+ ${patch}\n`;
      })
      .join('\n');

    const blob = new Blob([patchContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-audit-patches.patch`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden font-sans select-none">
      {/* Monochrome Security Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 bg-white border-b border-zinc-200">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-zinc-900" />
            <h2 className="text-base font-bold text-zinc-900">Security Audit & AI Auto-Patches</h2>
          </div>
          <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-md bg-zinc-900 text-white">
            {findings.length} findings
          </span>
        </div>

        {/* Severity Filter & Download Patches Button */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <button
              onClick={() => setSelectedSeverity('all')}
              className={`px-3 py-1 rounded-xl transition-all cursor-pointer font-bold ${
                selectedSeverity === 'all'
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'text-zinc-700 hover:bg-zinc-100 bg-white border border-zinc-300'
              }`}
            >
              All ({findings.length})
            </button>
            {criticalCount > 0 && (
              <button
                onClick={() => setSelectedSeverity('critical')}
                className={`px-3 py-1 rounded-xl transition-all cursor-pointer font-bold ${
                  selectedSeverity === 'critical'
                    ? 'bg-zinc-900 text-white shadow-xs'
                    : 'text-zinc-900 hover:bg-zinc-100 bg-white border border-zinc-400'
                }`}
              >
                Critical ({criticalCount})
              </button>
            )}
            {highCount > 0 && (
              <button
                onClick={() => setSelectedSeverity('high')}
                className={`px-3 py-1 rounded-xl transition-all cursor-pointer font-bold ${
                  selectedSeverity === 'high'
                    ? 'bg-zinc-900 text-white shadow-xs'
                    : 'text-zinc-900 hover:bg-zinc-100 bg-white border border-zinc-300'
                }`}
              >
                High ({highCount})
              </button>
            )}
            {mediumCount > 0 && (
              <button
                onClick={() => setSelectedSeverity('medium')}
                className={`px-3 py-1 rounded-xl transition-all cursor-pointer font-bold ${
                  selectedSeverity === 'medium'
                    ? 'bg-zinc-900 text-white shadow-xs'
                    : 'text-zinc-700 hover:bg-zinc-100 bg-white border border-zinc-300'
                }`}
              >
                Medium ({mediumCount})
              </button>
            )}
          </div>

          <button
            onClick={handleDownloadAllPatches}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
            title="Download Security Patch File (.patch)"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Download .patch</span>
          </button>
        </div>
      </div>

      {/* Findings List */}
      <div className="flex-1 overflow-auto p-6 bg-zinc-50/50">
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="p-4 bg-zinc-100 border border-zinc-300 rounded-2xl text-xs text-zinc-800 font-semibold flex items-center gap-2">
            <Lock className="w-4 h-4 text-zinc-900 shrink-0" />
            <span>Static analysis checks detect insecure calls & patterns. Click "Generate AI Patch" to synthesize safe code fixes.</span>
          </div>

          {filtered.map((item) => {
            const patch = generatedPatches[item.id];
            return (
              <div
                key={item.id}
                className="p-6 bg-white border border-zinc-300 rounded-2xl shadow-xs space-y-4 hover:border-zinc-400 transition-all"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertTriangle className="w-5 h-5 text-zinc-900 shrink-0" />
                    <span className="text-base font-bold text-zinc-900 truncate">
                      {item.title}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md border uppercase font-bold bg-zinc-900 text-white border-zinc-900">
                      {item.severity}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleGeneratePatch(item)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                    >
                      <Wand2 className="w-3.5 h-3.5 text-white" />
                      <span>Generate AI Patch</span>
                    </button>

                    <button
                      onClick={() => onOpenFile(item.file)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 rounded-xl text-xs font-mono text-zinc-900 font-bold transition-colors shrink-0 cursor-pointer"
                    >
                      <FileCode className="w-3.5 h-3.5 text-zinc-700" />
                      <span>
                        {item.file}:{item.line}
                      </span>
                      <ArrowRight className="w-3 h-3 text-zinc-900" />
                    </button>
                  </div>
                </div>

                {/* Evidence Code */}
                <div className="p-3.5 bg-zinc-50 border border-zinc-300 rounded-xl font-mono text-xs text-zinc-900 overflow-x-auto font-semibold">
                  <span className="text-zinc-500 select-none mr-3">{item.line} |</span>
                  <code>{item.evidence}</code>
                </div>

                {/* AI Patch Preview Box */}
                {patch && (
                  <div className="p-4 bg-zinc-100 border border-zinc-300 rounded-xl space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-zinc-900" /> Suggested Security Fix:
                      </span>
                      <button
                        onClick={() => handleCopyPatch(item.id, patch.patched)}
                        className="flex items-center gap-1 px-3 py-1 bg-zinc-900 hover:bg-black text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                      >
                        {copiedId === item.id ? (
                          <>
                            <Check className="w-3 h-3" /> Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" /> Copy Fix
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="p-3 bg-white border border-zinc-300 rounded-lg font-mono text-xs text-zinc-900 overflow-x-auto whitespace-pre-wrap font-semibold">
                      {patch.patched}
                    </pre>
                  </div>
                )}

                {/* Explanation */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 text-xs">
                  <div>
                    <span className="font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                      Explanation
                    </span>
                    <p className="text-zinc-700 leading-relaxed font-medium">{item.explanation}</p>
                  </div>
                  <div>
                    <span className="font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                      Suggested Action
                    </span>
                    <p className="text-zinc-900 font-bold leading-relaxed">
                      {item.suggestedAction}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
