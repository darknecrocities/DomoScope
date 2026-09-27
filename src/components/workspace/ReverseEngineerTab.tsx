import { useState, useMemo, useEffect } from 'react';
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

  // Close expanded view on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  const handleCopy = async () => {
    let success = false;
    if (navigator?.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(specMarkdown);
        success = true;
      } catch {
        success = false;
      }
    }

    if (!success) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = specMarkdown;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        success = true;
      } catch (err) {
        console.error('Failed to copy markdown:', err);
      }
    }

    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
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
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
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
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  };

  const handlePrintPdf = () => {
    const categoryTitle =
      REVERSE_CATEGORIES.find((c) => c.id === activeCategory)?.title || 'Reverse Engineer';
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${repoName} - ${categoryTitle} Specification</title>
          <style>
            @page {
              size: A4;
              margin: 15mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              line-height: 1.5;
              color: #09090b;
              padding: 20px;
              background: #ffffff;
            }
            .header {
              border-bottom: 2px solid #09090b;
              padding-bottom: 12px;
              margin-bottom: 20px;
            }
            h1 {
              font-size: 20px;
              margin: 0 0 4px 0;
              font-weight: 800;
            }
            .meta {
              font-size: 12px;
              color: #52525b;
              font-family: monospace;
            }
            pre {
              background: #f4f4f5;
              color: #09090b;
              padding: 16px;
              border-radius: 8px;
              border: 1px solid #e4e4e7;
              font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
              font-size: 11px;
              line-height: 1.5;
              white-space: pre-wrap;
              word-break: break-word;
            }
            @media print {
              body { padding: 0; }
              pre { border: none; padding: 0; background: transparent; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${repoName} - Reverse Engineer Blueprint</h1>
            <div class="meta">Subsystem: ${categoryTitle} | Generated by DomoScope</div>
          </div>
          <pre>${specMarkdown.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
        </body>
      </html>
    `;

    // Try popup window first
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      try {
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 250);
        return;
      } catch {
        // Fallback to hidden iframe below
      }
    }

    // Fallback: Invisible iframe to bypass popup blockers on mobile / Safari
    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(printContent);
        doc.close();
        iframe.contentWindow?.focus();
        setTimeout(() => {
          iframe.contentWindow?.print();
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 2000);
        }, 250);
      }
    } catch {
      window.print();
    }
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
      <div className="bg-white border border-zinc-200 rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
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
        <div className="flex flex-wrap items-center gap-2 shrink-0">
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
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/60 z-40 backdrop-blur-xs transition-opacity"
          onClick={() => setIsExpanded(false)}
        />
      )}

      <div
        className={`bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden flex flex-col transition-all ${
          isExpanded
            ? 'fixed inset-2 sm:inset-4 md:inset-6 z-50 shadow-2xl border-zinc-400'
            : 'relative'
        }`}
      >
        {/* Toolbar Bar */}
        <div className="px-4 sm:px-5 py-3 border-b border-zinc-200 bg-zinc-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-zinc-700 shrink-0" />
              <span className="text-xs font-bold text-zinc-900 truncate">
                {REVERSE_CATEGORIES.find((c) => c.id === activeCategory)?.title}
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-mono text-zinc-600 bg-zinc-200 px-2 py-0.5 rounded-md font-semibold">
                {activeCategory === 'agent_skill' ? 'SKILL.md' : `${activeCategory}_spec.md`}
              </span>
              <span className="text-[11px] font-mono text-zinc-500 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-md">
                {lineCount.toLocaleString()} lines · Ultra-Detailed
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Word wrap toggle */}
            <button
              onClick={() => setWordWrap(!wordWrap)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                wordWrap
                  ? 'bg-zinc-900 text-white border-zinc-900 shadow-2xs'
                  : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400'
              }`}
              title={wordWrap ? 'Disable Word Wrap' : 'Enable Word Wrap'}
              aria-label={wordWrap ? 'Disable Word Wrap' : 'Enable Word Wrap'}
            >
              {wordWrap ? <WrapText className="w-3.5 h-3.5 shrink-0" /> : <AlignLeft className="w-3.5 h-3.5 shrink-0" />}
              <span>{wordWrap ? 'Wrap On' : 'Wrap Off'}</span>
            </button>

            {/* Expand / Minimize toggle */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 border text-xs font-bold rounded-lg shadow-2xs transition-all cursor-pointer ${
                isExpanded
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'bg-white border-zinc-300 hover:border-zinc-900 text-zinc-800'
              }`}
              title={isExpanded ? 'Collapse View (Esc)' : 'Expand to Fullscreen'}
              aria-label={isExpanded ? 'Collapse View' : 'Expand to Fullscreen'}
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5 shrink-0" /> : <Maximize2 className="w-3.5 h-3.5 shrink-0" />}
              <span>{isExpanded ? 'Collapse' : 'Expand'}</span>
            </button>

            {/* Copy Markdown */}
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-white border border-zinc-300 hover:border-zinc-900 text-zinc-800 text-xs font-bold rounded-lg shadow-2xs transition-all cursor-pointer active:scale-95"
              title="Copy Markdown specification"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-zinc-950 shrink-0" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">Copy Markdown</span>
                  <span className="sm:hidden">Copy</span>
                </>
              )}
            </button>

            {/* Print / PDF */}
            <button
              onClick={handlePrintPdf}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-white border border-zinc-300 hover:border-zinc-900 text-zinc-800 text-xs font-bold rounded-lg shadow-2xs transition-all cursor-pointer active:scale-95"
              title="Print or Save as PDF"
            >
              <Printer className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Print / PDF</span>
              <span className="sm:hidden">Print</span>
            </button>

            {/* Download .md */}
            <button
              onClick={handleDownloadMd}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold rounded-lg shadow-2xs transition-all cursor-pointer active:scale-95"
              title="Download specification file"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Download .md</span>
              <span className="sm:hidden">Download</span>
            </button>
          </div>
        </div>

        {/* Scrollable Spec Code Container */}
        <div
          className={`p-4 sm:p-6 overflow-y-auto overflow-x-auto bg-zinc-950 text-zinc-100 font-mono text-xs leading-relaxed selection:bg-zinc-700 selection:text-white transition-all duration-200 scrollbar-thin ${
            isExpanded ? 'flex-1 h-full min-h-0' : 'h-[600px] lg:h-[750px]'
          }`}
        >
          <pre
            className={`min-w-0 max-w-full ${
              wordWrap ? 'whitespace-pre-wrap break-words break-all sm:break-normal' : 'whitespace-pre'
            }`}
          >
            {specMarkdown}
          </pre>
        </div>
      </div>
    </div>
  );
}
