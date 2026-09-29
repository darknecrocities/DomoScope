import { useState, useMemo } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  FileText,
  ArrowRight,
  Code2,
  Copy,
  Check,
  Search,
  Download,
  Terminal,
  ChevronDown,
  ChevronUp,
  Layers,
} from 'lucide-react';
import {
  RepoAnalysis,
  RepoFile,
  DatabaseSchema,
  SecurityFinding,
  RepoDependency,
  ApiEndpoint,
} from '../../types';
import { StreamingText } from '../common/StreamingText';
import { AnimatedCounter } from '../common/AnimatedCounter';
import {
  generateSetupChecklist,
  filterChecklist,
  generateChecklistMarkdown,
  ChecklistStatus,
} from '../../services/suggestionsGenerator';

export interface SuggestionsTabProps {
  analysis: RepoAnalysis;
  files?: RepoFile[];
  fileContents?: Map<string, string>;
  databaseSchema?: DatabaseSchema | null;
  securityFindings?: SecurityFinding[];
  dependencies?: RepoDependency[];
  apiRoutes?: ApiEndpoint[];
  onOpenFile: (path: string) => void;
  onSelectTab?: (tab: string) => void;
}

export function SuggestionsTab({
  analysis,
  files = analysis.files || [],
  fileContents = new Map(),
  databaseSchema = null,
  securityFindings = [],
  dependencies = [],
  apiRoutes = [],
  onOpenFile,
}: SuggestionsTabProps) {
  const [activeStatus, setActiveStatus] = useState<ChecklistStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCardIds, setExpandedCardIds] = useState<Set<string>>(new Set());
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null);
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);

  // Generate standard repository setup checklist
  const { items, stats } = useMemo(() => {
    return generateSetupChecklist({
      analysis,
      files,
      fileContents,
      databaseSchema,
      securityFindings,
      dependencies,
      apiRoutes,
    });
  }, [analysis, files, fileContents, databaseSchema, securityFindings, dependencies, apiRoutes]);

  // Filter items by status and text search query
  const filteredItems = useMemo(() => {
    return filterChecklist(items, {
      status: activeStatus,
      searchQuery,
    });
  }, [items, activeStatus, searchQuery]);

  const toggleExpand = (id: string) => {
    setExpandedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedCardIds(new Set(filteredItems.map((i) => i.id)));
  };

  const collapseAll = () => {
    setExpandedCardIds(new Set());
  };

  const handleCopySnippet = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSnippetId(id);
    setTimeout(() => setCopiedSnippetId(null), 2000);
  };

  const handleCopyPrompt = (id: string, prompt: string) => {
    navigator.clipboard.writeText(prompt);
    setCopiedPromptId(id);
    setTimeout(() => setCopiedPromptId(null), 2000);
  };

  const handleExportMarkdown = () => {
    const md = generateChecklistMarkdown(analysis.metadata?.fullName || 'Project', items, stats);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${analysis.metadata?.repo || 'repository'}-setup-checklist.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyMarkdown = () => {
    const md = generateChecklistMarkdown(analysis.metadata?.fullName || 'Project', items, stats);
    navigator.clipboard.writeText(md);
    setCopiedMarkdown(true);
    setTimeout(() => setCopiedMarkdown(false), 2000);
  };

  return (
    <div className="h-full flex flex-col bg-zinc-50 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full p-4 sm:p-6 md:p-8 space-y-6">
        {/* HEADER SECTION */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-zinc-900 text-white rounded-lg">
                <Layers className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-950 font-sans">
                Repository Setup & Standards Checklist
              </h1>
            </div>
            <p className="text-xs text-zinc-600 font-sans max-w-xl leading-relaxed">
              Standard repository configuration, essential documentation, security hygiene, and tooling verification.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              onClick={handleCopyMarkdown}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-mono text-zinc-800 transition-colors shadow-2xs cursor-pointer"
            >
              {copiedMarkdown ? <Check className="w-3.5 h-3.5 text-zinc-950" /> : <Copy className="w-3.5 h-3.5 text-zinc-500" />}
              <span>{copiedMarkdown ? 'Copied Checklist' : 'Copy Checklist'}</span>
            </button>

            <button
              onClick={handleExportMarkdown}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-mono transition-colors shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export (.md)</span>
            </button>
          </div>
        </div>

        {/* PROGRESS SUMMARY BAR */}
        <div className="p-5 bg-white border border-zinc-200 rounded-xl shadow-2xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-zinc-950 font-sans">Setup Completion</span>
              <span className="text-xs font-mono text-zinc-500">
                (<AnimatedCounter value={stats.completedCount} /> of {stats.total} checks verified)
              </span>
            </div>

            <span className="text-xs font-mono font-bold text-zinc-950 px-2.5 py-0.5 bg-zinc-100 border border-zinc-200 rounded-full">
              <AnimatedCounter value={stats.completionPercentage} />% Completed
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2.5 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200">
            <div
              className="h-full bg-zinc-900 transition-all duration-500 rounded-full"
              style={{ width: `${stats.completionPercentage}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-1">
            <span>{stats.needsSetupCount === 0 ? 'All standard setup checks satisfied' : `${stats.needsSetupCount} check(s) need attention`}</span>
            <span>{stats.completedCount} satisfied</span>
          </div>
        </div>

        {/* CONTROLS: FILTER PILLS & SEARCH */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <button
              onClick={() => setActiveStatus('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                activeStatus === 'all'
                  ? 'bg-zinc-900 text-white font-bold'
                  : 'bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50'
              }`}
            >
              All ({stats.total})
            </button>

            <button
              onClick={() => setActiveStatus('needs_setup')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                activeStatus === 'needs_setup'
                  ? 'bg-zinc-900 text-white font-bold'
                  : 'bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50'
              }`}
            >
              Needs Setup ({stats.needsSetupCount})
            </button>

            <button
              onClick={() => setActiveStatus('completed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                activeStatus === 'completed'
                  ? 'bg-zinc-900 text-white font-bold'
                  : 'bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50'
              }`}
            >
              Completed ({stats.completedCount})
            </button>
          </div>

          {/* Search Bar & Expand/Collapse */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search checklist..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-sans text-zinc-900 focus:outline-hidden focus:ring-1 focus:ring-zinc-950"
              />
            </div>

            <div className="flex items-center gap-1 border-l border-zinc-200 pl-2">
              <button
                onClick={expandAll}
                className="p-1.5 hover:bg-zinc-200 rounded text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer"
                title="Expand All"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
              <button
                onClick={collapseAll}
                className="p-1.5 hover:bg-zinc-200 rounded text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer"
                title="Collapse All"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* CHECKLIST ITEMS */}
        <div className="space-y-3">
          {filteredItems.length === 0 ? (
            <div className="p-12 text-center bg-white border border-zinc-200 rounded-xl space-y-2">
              <CheckCircle2 className="w-8 h-8 text-zinc-700 mx-auto" />
              <h3 className="text-sm font-bold text-zinc-900 font-sans">No matching checklist items</h3>
              <p className="text-xs text-zinc-500 font-sans">Try clearing your search query or switching filters.</p>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isExpanded = expandedCardIds.has(item.id);
              const isCompleted = item.status === 'completed';

              return (
                <div
                  key={item.id}
                  className="bg-white border border-zinc-200 rounded-xl shadow-2xs overflow-hidden transition-all duration-150 hover:border-zinc-300"
                >
                  {/* MAIN CARD ROW */}
                  <div className="p-4 sm:p-5 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-zinc-950 shrink-0" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-zinc-500 shrink-0" />
                        )}

                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-bold tracking-wider ${
                            isCompleted
                              ? 'bg-zinc-100 text-zinc-900 border-zinc-200'
                              : 'bg-zinc-900 text-white border-zinc-950'
                          }`}
                        >
                          {isCompleted ? 'Completed' : 'Action Required'}
                        </span>

                        <h3
                          onClick={() => (item.codeSnippet || item.agentPrompt ? toggleExpand(item.id) : null)}
                          className={`text-sm font-bold text-zinc-950 font-sans ${
                            item.codeSnippet || item.agentPrompt ? 'cursor-pointer hover:text-zinc-700' : ''
                          }`}
                        >
                          {item.title}
                        </h3>
                      </div>

                      {/* Right Action Buttons */}
                      <div className="flex items-center gap-2">
                        {item.actionText && item.actionFile ? (
                          <button
                            onClick={() => onOpenFile(item.actionFile!)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-700 transition-colors cursor-pointer"
                          >
                            <span>{item.actionText}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
                          </button>
                        ) : item.codeSnippet || item.agentPrompt ? (
                          <button
                            onClick={() => toggleExpand(item.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-700 transition-colors cursor-pointer"
                          >
                            <span>{isExpanded ? 'Hide Setup' : item.actionText || 'View Recipe'}</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {/* SUMMARY WITH STREAMING TEXT */}
                    <div className="pl-7.5">
                      <StreamingText
                        text={item.summary}
                        delay={idx * 60}
                        speed="fast"
                        sessionKey={`checklist-${analysis.metadata?.fullName || 'repo'}-${item.id}`}
                        className="text-xs text-zinc-600 font-sans leading-relaxed"
                        as="p"
                      />

                      {/* TARGET FILES PILLS */}
                      {item.targetFiles && item.targetFiles.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-2">
                          <span className="text-[11px] font-mono text-zinc-400 flex items-center gap-1 mr-1">
                            <FileText className="w-3 h-3" /> Target:
                          </span>
                          {item.targetFiles.map((file, fIdx) => (
                            <button
                              key={fIdx}
                              onClick={() => onOpenFile(file)}
                              className="text-[11px] font-mono text-zinc-700 hover:text-zinc-950 bg-zinc-100 hover:bg-zinc-200 px-2 py-0.5 rounded border border-zinc-200 transition-colors cursor-pointer"
                            >
                              {file}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* EXPANDABLE SETUP RECIPE & PROMPT */}
                  {isExpanded && (item.codeSnippet || item.agentPrompt) && (
                    <div className="p-4 sm:p-5 bg-zinc-50 border-t border-zinc-200 space-y-4">
                      <div className="space-y-1">
                        <h4 className="text-xs font-mono font-bold text-zinc-900 uppercase tracking-wider">
                          Why this is crucial
                        </h4>
                        <p className="text-xs text-zinc-700 font-sans leading-relaxed bg-white p-3 rounded-lg border border-zinc-200">
                          {item.explanation}
                        </p>
                      </div>

                      {/* Code Recipe Snippet */}
                      {item.codeSnippet && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-zinc-900 uppercase tracking-wider">
                              <Code2 className="w-3.5 h-3.5 text-zinc-600" />
                              <span>Recommended Configuration ({item.codeSnippet.filename || 'Template'})</span>
                            </div>

                            <button
                              onClick={() => handleCopySnippet(item.id, item.codeSnippet!.code)}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-zinc-100 border border-zinc-200 rounded text-[11px] font-mono text-zinc-700 transition-colors cursor-pointer"
                            >
                              {copiedSnippetId === item.id ? (
                                <>
                                  <Check className="w-3 h-3 text-zinc-950" />
                                  <span>Copied Recipe</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3 text-zinc-500" />
                                  <span>Copy Recipe</span>
                                </>
                              )}
                            </button>
                          </div>

                          <div className="bg-zinc-900 text-zinc-100 p-3.5 rounded-lg font-mono text-xs overflow-x-auto border border-zinc-800">
                            <pre>{item.codeSnippet.code}</pre>
                          </div>
                        </div>
                      )}

                      {/* AI Agent Execution Prompt */}
                      {item.agentPrompt && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-zinc-900 uppercase tracking-wider">
                              <Terminal className="w-3.5 h-3.5 text-zinc-600" />
                              <span>AI Coding Agent Execution Prompt</span>
                            </div>

                            <button
                              onClick={() => handleCopyPrompt(item.id, item.agentPrompt!)}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-zinc-100 border border-zinc-200 rounded text-[11px] font-mono text-zinc-700 transition-colors cursor-pointer"
                            >
                              {copiedPromptId === item.id ? (
                                <>
                                  <Check className="w-3 h-3 text-zinc-950" />
                                  <span>Copied Prompt</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3 text-zinc-500" />
                                  <span>Copy Prompt</span>
                                </>
                              )}
                            </button>
                          </div>

                          <div className="p-3 bg-white border border-zinc-200 rounded-lg text-xs font-mono text-zinc-800 whitespace-pre-line leading-relaxed">
                            {item.agentPrompt}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
