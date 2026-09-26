import { useState, useMemo } from 'react';
import { X, Download, Copy, Check, FileText, Sparkles } from 'lucide-react';
import { RepoAnalysis, RepoFile, DatabaseSchema, RepoDependency, SecurityFinding } from '../../types';
import { MarkdownSpecGenerator, SpecGeneratorOptions } from '../../services/markdownSpecGenerator';

interface SpecGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: RepoAnalysis;
  files: RepoFile[];
  fileContents: Map<string, string>;
  databaseSchema?: DatabaseSchema | null;
  dependencies?: RepoDependency[] | null;
  securityFindings?: SecurityFinding[];
}

export function SpecGeneratorModal({
  isOpen,
  onClose,
  analysis,
  files,
  fileContents,
  databaseSchema,
  dependencies,
  securityFindings,
}: SpecGeneratorModalProps) {
  const [options, setOptions] = useState<SpecGeneratorOptions>({
    includeOverview: true,
    includeArchitecture: true,
    includePrompts: true,
    includeDatabase: true,
    includeDependencies: true,
    includeSecurity: true,
  });

  const [copied, setCopied] = useState(false);

  const markdownContent = useMemo(() => {
    return MarkdownSpecGenerator.generateSpec(
      analysis,
      files,
      fileContents,
      databaseSchema,
      dependencies,
      securityFindings,
      options
    );
  }, [analysis, files, fileContents, databaseSchema, dependencies, securityFindings, options]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(markdownContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const filename = `${analysis.metadata.repo || 'repository'}-reverse-engineering-spec.md`;
    MarkdownSpecGenerator.downloadMarkdownFile(filename, markdownContent);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="w-full max-w-4xl bg-white border border-zinc-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-zinc-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-zinc-800 rounded-lg border border-zinc-700">
              <FileText className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight">
                Reverse Engineering Spec & Prompt Generator (.md)
              </h2>
              <p className="text-xs text-zinc-400 font-mono">
                Construct reverse engineering system prompts & architecture specs for {analysis.metadata.fullName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Customization Checkbox Toggles */}
        <div className="p-3.5 bg-zinc-50 border-b border-zinc-200 flex flex-wrap gap-4 items-center justify-between text-xs font-mono text-zinc-700">
          <span className="font-semibold text-zinc-900">Include Sections:</span>
          <div className="flex flex-wrap gap-4 items-center">
            {(
              [
                { id: 'includeOverview', label: 'Summary' },
                { id: 'includeArchitecture', label: 'Architecture Layer' },
                { id: 'includePrompts', label: 'LLM Reverse Prompts' },
                { id: 'includeDatabase', label: 'Database Schema' },
                { id: 'includeDependencies', label: 'Dependencies & Audit' },
              ] as const
            ).map((sec) => (
              <label key={sec.id} className="flex items-center gap-1.5 cursor-pointer hover:text-zinc-900">
                <input
                  type="checkbox"
                  checked={!!options[sec.id]}
                  onChange={(e) =>
                    setOptions((prev) => ({ ...prev, [sec.id]: e.target.checked }))
                  }
                  className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                />
                <span>{sec.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Markdown Content Preview */}
        <div className="flex-1 overflow-y-auto p-6 bg-zinc-900 text-zinc-100 font-mono text-xs leading-relaxed selection:bg-zinc-700">
          <pre className="whitespace-pre-wrap font-mono">{markdownContent}</pre>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-white border-t border-zinc-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span>Ready to copy into Claude, GPT-4o, or Gemini</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCopy}
              className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg text-xs font-mono font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied Markdown' : 'Copy Spec'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-mono font-medium transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Download .md File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
