import { useState, useMemo } from 'react';
import {
  Layers,
  Bot,
  Palette,
  Layout,
  Server,
  Database,
  Download,
  Copy,
  Check,
  Printer,
  Sparkles,
  FileCode,
  Maximize2,
  Minimize2,
  WrapText,
  AlignLeft,
} from 'lucide-react';
import {
  RepoAnalysis,
  RepoFile,
  DatabaseSchema,
  RepoDependency,
} from '../../types';
import {
  ReverseEngineerCategory,
  REVERSE_CATEGORIES,
  generateReverseEngineerSpec,
  generateAgentSkillPack,
} from '../../services/reverseEngineerGenerator';

interface ReverseEngineerTabProps {
  repoName: string;
  analysis: RepoAnalysis | null;
  files: RepoFile[];
  fileContents: Map<string, string> | Record<string, string>;
  databaseSchema: DatabaseSchema | null;
  dependencies: RepoDependency[];
}

export function ReverseEngineerTab({
  repoName,
  analysis,
  files,
  fileContents,
  databaseSchema,
  dependencies,
}: ReverseEngineerTabProps) {
  const [activeCategory, setActiveCategory] =
    useState<ReverseEngineerCategory>('fullstack');
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [wordWrap, setWordWrap] = useState(true);

  // Generate specification markdown for the current selection
  const specMarkdown = useMemo(() => {
    return generateReverseEngineerSpec(
      activeCategory,
      repoName,
      analysis,
      files,
      fileContents,
      databaseSchema,
      dependencies
    );
  }, [activeCategory, repoName, analysis, files, fileContents, databaseSchema, dependencies]);

  const lineCount = useMemo(() => {
    return specMarkdown.split('\n').length;
  }, [specMarkdown]);

  const handleCopy = () => {
    navigator.clipboard.writeText(specMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMd = () => {
    const filename =
      activeCategory === 'agent_skill'
        ? 'SKILL.md'
        : `${repoName.replace(/[^a-zA-Z0-9-_]/g, '-')}-${activeCategory}-reverse-engineer-spec.md`;
    const blob = new Blob([specMarkdown], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadSkillPack = () => {
    const skillContent = generateAgentSkillPack(
      repoName,
      analysis,
      files,
      fileContents,
      databaseSchema,
      dependencies
    );
    const blob = new Blob([skillContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SKILL.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Reverse Engineer Specification - ${repoName}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; padding: 40px; color: #09090b; }
            h1, h2, h3, h4 { color: #09090b; border-bottom: 1px solid #e4e4e7; padding-bottom: 6px; }
            code { background: #f4f4f5; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 13px; }
            pre { background: #18181b; color: #f4f4f5; padding: 16px; border-radius: 8px; overflow-x: auto; }
            table { width: 100%; border-collapse: collapse; margin: 16px 0; }
            th, td { border: 1px solid #e4e4e7; padding: 8px 12px; text-align: left; }
            th { background: #f4f4f5; }
          </style>
        </head>
        <body>
          <div style="white-space: pre-wrap; font-family: monospace;">${specMarkdown.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Layers':
        return <Layers className="w-4 h-4" />;
      case 'Bot':
        return <Bot className="w-4 h-4" />;
      case 'Palette':
        return <Palette className="w-4 h-4" />;
      case 'Layout':
        return <Layout className="w-4 h-4" />;
      case 'Server':
        return <Server className="w-4 h-4" />;
      case 'Database':
        return <Database className="w-4 h-4" />;
      default:
        return <FileCode className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-full flex flex-col bg-zinc-50 p-4 md:p-6 space-y-6 font-sans">
      {/* Top Banner Header */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-zinc-900 text-white rounded-xl">
              <Sparkles className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-extrabold text-zinc-900 tracking-tight">
              Reverse Engineering Suite & Agent Skill Generator
            </h1>
          </div>
          <p className="text-xs text-zinc-600 max-w-2xl pl-1">
            Extract structural blueprints, UI/UX specs, data models, or generate a standalone{' '}
            <code className="bg-zinc-100 text-zinc-900 px-1.5 py-0.5 rounded text-xs font-mono font-bold">
              SKILL.md
            </code>{' '}
            agent instruction file to clone this app's architecture into your own projects.
          </p>
        </div>

        {/* Global Export Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleDownloadSkillPack}
            className="flex items-center gap-2 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
            title="Download SKILL.md for AI agents"
          >
            <Bot className="w-4 h-4" />
            <span>Download SKILL.md</span>
          </button>

          <button
            onClick={handleDownloadMd}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-zinc-300 hover:border-zinc-900 text-zinc-900 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
            title="Download selected spec as .md"
          >
            <Download className="w-4 h-4" />
            <span>Export Spec (.md)</span>
          </button>
        </div>
      </div>

      {/* Subsystem Category Selector Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {REVERSE_CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                isActive
                  ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm scale-[1.02]'
                  : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400 hover:bg-zinc-100/60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`p-2 rounded-xl transition-colors ${
                    isActive ? 'bg-zinc-800 text-white' : 'bg-zinc-100 text-zinc-800'
                  }`}
                >
                  {getCategoryIcon(cat.iconName)}
                </span>
                {isActive && (
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                )}
              </div>
              <div>
                <h3
                  className={`text-xs font-extrabold truncate ${
                    isActive ? 'text-white' : 'text-zinc-900'
                  }`}
                >
                  {cat.title}
                </h3>
                <p
                  className={`text-[10px] line-clamp-2 mt-1 ${
                    isActive ? 'text-zinc-300' : 'text-zinc-500'
                  }`}
                >
                  {cat.subtitle}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Markdown Document Viewer & Controls */}
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden flex flex-col">
        {/* Toolbar Bar */}
        <div className="px-5 py-3.5 border-b border-zinc-200 bg-zinc-50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <FileCode className="w-4 h-4 text-zinc-700" />
            <span className="text-xs font-bold text-zinc-900">
              {REVERSE_CATEGORIES.find((c) => c.id === activeCategory)?.title}
            </span>
            <span className="text-[11px] font-mono text-zinc-600 bg-zinc-200 px-2 py-0.5 rounded-md font-semibold">
              {activeCategory === 'agent_skill' ? 'SKILL.md' : `${activeCategory}_spec.md`}
            </span>
            <span className="text-[11px] font-mono text-zinc-500 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-md">
              {lineCount.toLocaleString()} lines · Ultra-Detailed
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Word wrap toggle */}
            <button
              onClick={() => setWordWrap(!wordWrap)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                wordWrap
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400'
              }`}
              title={wordWrap ? 'Disable Word Wrap' : 'Enable Word Wrap'}
            >
              {wordWrap ? <WrapText className="w-3.5 h-3.5" /> : <AlignLeft className="w-3.5 h-3.5" />}
              <span>{wordWrap ? 'Wrap On' : 'Wrap Off'}</span>
            </button>

            {/* Expand / Minimize toggle */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-zinc-300 hover:border-zinc-900 text-zinc-800 text-xs font-bold rounded-lg shadow-2xs transition-all cursor-pointer"
              title={isExpanded ? 'Normal View' : 'Expand Height'}
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span>{isExpanded ? 'Collapse' : 'Expand'}</span>
            </button>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-300 hover:border-zinc-900 text-zinc-800 text-xs font-bold rounded-lg shadow-2xs transition-all cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-zinc-950" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Markdown</span>
                </>
              )}
            </button>

            <button
              onClick={handlePrintPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-300 hover:border-zinc-900 text-zinc-800 text-xs font-bold rounded-lg shadow-2xs transition-all cursor-pointer"
              title="Print or Save as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>

            <button
              onClick={handleDownloadMd}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold rounded-lg shadow-2xs transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .md</span>
            </button>
          </div>
        </div>

        {/* Scrollable Spec Code Container */}
        <div
          className={`p-6 overflow-y-auto overflow-x-auto bg-zinc-950 text-zinc-100 font-mono text-xs leading-relaxed selection:bg-zinc-700 selection:text-white transition-all duration-200 scrollbar-thin ${
            isExpanded ? 'h-[85vh]' : 'h-[680px] lg:h-[780px]'
          }`}
        >
          <pre className={wordWrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'}>
            {specMarkdown}
          </pre>
        </div>
      </div>
    </div>
  );
}
