import { useState, useMemo } from 'react';
import {
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  FileText,
  ArrowRight,
  Code2,
  Copy,
  Check,
  Search,
  Download,
  Terminal,
  Shield,
  Layers,
  Database,
  Gauge,
  Sparkles,
  ChevronDown,
  ChevronUp,
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
  generateCodebaseSuggestions,
  filterSuggestions,
  generateSuggestionsMarkdown,
  CodebaseSuggestion,
  SuggestionCategory,
  SuggestionImpact,
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
  const [activeCategory, setActiveCategory] = useState<SuggestionCategory | 'all'>('all');
  const [activeImpact, setActiveImpact] = useState<SuggestionImpact | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCardIds, setExpandedCardIds] = useState<Set<string>>(new Set());
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null);
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);

  // Generate full deterministic suggestions from static codebase data
  const { suggestions, stats } = useMemo(() => {
    return generateCodebaseSuggestions({
      analysis,
      files,
      fileContents,
      databaseSchema,
      securityFindings,
      dependencies,
      apiRoutes,
    });
  }, [analysis, files, fileContents, databaseSchema, securityFindings, dependencies, apiRoutes]);

  // Filtered list based on category, priority impact, and text query
  const filteredSuggestions = useMemo(() => {
    return filterSuggestions(suggestions, {
      category: activeCategory,
      impact: activeImpact,
      searchQuery,
    });
  }, [suggestions, activeCategory, activeImpact, searchQuery]);

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
    setExpandedCardIds(new Set(filteredSuggestions.map((s) => s.id)));
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
    const md = generateSuggestionsMarkdown(analysis.metadata?.fullName || 'Project', suggestions, stats);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${analysis.metadata?.repo || 'codebase'}-insights-and-suggestions.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyMarkdown = () => {
    const md = generateSuggestionsMarkdown(analysis.metadata?.fullName || 'Project', suggestions, stats);
    navigator.clipboard.writeText(md);
    setCopiedMarkdown(true);
    setTimeout(() => setCopiedMarkdown(false), 2000);
  };

  const getImpactBadgeClass = (impact: SuggestionImpact) => {
    switch (impact) {
      case 'critical':
        return 'bg-zinc-950 text-white border-zinc-950';
      case 'high':
        return 'bg-zinc-900 text-zinc-100 border-zinc-900';
      case 'medium':
        return 'bg-zinc-200 text-zinc-900 border-zinc-300';
      case 'low':
        return 'bg-zinc-100 text-zinc-700 border-zinc-200';
      case 'positive':
        return 'bg-zinc-50 text-zinc-900 border-zinc-300 font-semibold';
    }
  };

  const getCategoryIcon = (category: SuggestionCategory) => {
    switch (category) {
      case 'architecture':
        return <Layers className="w-4 h-4 text-zinc-800" />;
      case 'security':
        return <Shield className="w-4 h-4 text-zinc-800" />;
      case 'performance':
        return <Gauge className="w-4 h-4 text-zinc-800" />;
      case 'database':
        return <Database className="w-4 h-4 text-zinc-800" />;
      case 'testing':
        return <CheckCircle2 className="w-4 h-4 text-zinc-800" />;
      case 'dx':
        return <Terminal className="w-4 h-4 text-zinc-800" />;
      case 'positive':
        return <Sparkles className="w-4 h-4 text-zinc-800" />;
    }
  };

  const getTypeIcon = (type: CodebaseSuggestion['type']) => {
    switch (type) {
      case 'positive':
        return <CheckCircle2 className="w-5 h-5 text-zinc-900 shrink-0 mt-0.5" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-zinc-800 shrink-0 mt-0.5" />;
      case 'improvement':
        return <AlertCircle className="w-5 h-5 text-zinc-600 shrink-0 mt-0.5" />;
      case 'info':
        return <Info className="w-5 h-5 text-zinc-500 shrink-0 mt-0.5" />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-zinc-50 overflow-y-auto">
      <div className="max-w-6xl mx-auto w-full p-4 sm:p-6 md:p-8 space-y-6">
        {/* TOP HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-zinc-900 text-white rounded-lg">
                <Lightbulb className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-950 font-sans">
                Codebase Insights & Suggestions
              </h1>
            </div>
            <p className="text-xs text-zinc-600 font-sans max-w-2xl leading-relaxed">
              Automated architectural audit, performance optimizations, and AI-assisted refactoring recommendations grounded in static codebase analysis.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center">
            <button
              onClick={handleCopyMarkdown}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-mono text-zinc-800 transition-colors shadow-2xs cursor-pointer"
            >
              {copiedMarkdown ? <Check className="w-3.5 h-3.5 text-zinc-950" /> : <Copy className="w-3.5 h-3.5 text-zinc-500" />}
              <span>{copiedMarkdown ? 'Copied Summary' : 'Copy Summary'}</span>
            </button>

            <button
              onClick={handleExportMarkdown}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-mono transition-colors shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Action Plan (.md)</span>
            </button>
          </div>
        </div>

        {/* METRICS OVERVIEW CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-2xs space-y-1">
            <span className="text-[11px] font-mono font-semibold text-zinc-500 uppercase tracking-wider">
              Health Score
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-zinc-950 font-mono tracking-tight">
                <AnimatedCounter value={stats.overallScore} />
              </span>
              <span className="text-xs text-zinc-500 font-mono">/ 100</span>
              <span className="ml-auto text-[10px] font-mono px-2 py-0.5 bg-zinc-100 text-zinc-800 rounded border border-zinc-200 font-bold">
                {stats.overallScore >= 90 ? 'Grade A+' : stats.overallScore >= 80 ? 'Grade A' : stats.overallScore >= 70 ? 'Grade B' : 'Grade C'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 font-sans">Calculated from issue severity and strengths.</p>
          </div>

          <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-2xs space-y-1">
            <span className="text-[11px] font-mono font-semibold text-zinc-500 uppercase tracking-wider">
              High & Critical Items
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-zinc-950 font-mono tracking-tight">
                <AnimatedCounter value={stats.highPriorityCount} />
              </span>
              <span className="text-xs text-zinc-500 font-mono">items</span>
            </div>
            <p className="text-[11px] text-zinc-500 font-sans">Priority architectural & security actions.</p>
          </div>

          <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-2xs space-y-1">
            <span className="text-[11px] font-mono font-semibold text-zinc-500 uppercase tracking-wider">
              Quick Wins (&lt;15m)
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-zinc-950 font-mono tracking-tight">
                <AnimatedCounter value={stats.quickWinsCount} />
              </span>
              <span className="text-xs text-zinc-500 font-mono">tasks</span>
            </div>
            <p className="text-[11px] text-zinc-500 font-sans">Fast improvements with immediate DX impact.</p>
          </div>

          <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-2xs space-y-1">
            <span className="text-[11px] font-mono font-semibold text-zinc-500 uppercase tracking-wider">
              Architectural Strengths
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-zinc-950 font-mono tracking-tight">
                <AnimatedCounter value={stats.positiveCount} />
              </span>
              <span className="text-xs text-zinc-500 font-mono">patterns</span>
            </div>
            <p className="text-[11px] text-zinc-500 font-sans">Exemplary design choices identified.</p>
          </div>
        </div>

        {/* CONTROLS: CATEGORIES, PRIORITY FILTER, SEARCH */}
        <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-2xs space-y-4">
          {/* Category Navigation Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-zinc-100 scrollbar-thin">
            {[
              { id: 'all', label: 'All', count: stats.total },
              { id: 'architecture', label: 'Architecture', count: stats.byCategory.architecture },
              { id: 'security', label: 'Security & Secrets', count: stats.byCategory.security },
              { id: 'performance', label: 'Performance', count: stats.byCategory.performance },
              { id: 'database', label: 'Database', count: stats.byCategory.database },
              { id: 'testing', label: 'Testing & QA', count: stats.byCategory.testing },
              { id: 'dx', label: 'DX & Standards', count: stats.byCategory.dx },
              { id: 'positive', label: 'Positive Patterns', count: stats.positiveCount },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id as SuggestionCategory | 'all')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors whitespace-nowrap cursor-pointer ${
                  activeCategory === tab.id
                    ? 'bg-zinc-900 text-white font-bold'
                    : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    activeCategory === tab.id ? 'bg-zinc-700 text-white' : 'bg-zinc-100 text-zinc-600'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Secondary Controls: Search, Priority Filter, Expand/Collapse */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search suggestions, files, tags..."
                className="w-full pl-9 pr-4 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-sans text-zinc-900 focus:outline-hidden focus:ring-1 focus:ring-zinc-950 focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              <div className="flex items-center gap-1.5 text-xs font-mono">
                <span className="text-zinc-500">Priority:</span>
                <select
                  value={activeImpact}
                  onChange={(e) => setActiveImpact(e.target.value as SuggestionImpact | 'all')}
                  className="px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-mono text-zinc-800 focus:outline-hidden focus:ring-1 focus:ring-zinc-950"
                >
                  <option value="all">All Priorities</option>
                  <option value="critical">Critical Impact</option>
                  <option value="high">High Impact</option>
                  <option value="medium">Medium Impact</option>
                  <option value="low">Low Impact</option>
                  <option value="positive">Positive Pattern</option>
                </select>
              </div>

              <div className="flex items-center gap-1 border-l border-zinc-200 pl-2">
                <button
                  onClick={expandAll}
                  className="p-1.5 hover:bg-zinc-100 rounded text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer"
                  title="Expand All"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button
                  onClick={collapseAll}
                  className="p-1.5 hover:bg-zinc-100 rounded text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer"
                  title="Collapse All"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* SUGGESTIONS LIST */}
        <div className="space-y-4">
          {filteredSuggestions.length === 0 ? (
            <div className="p-12 text-center bg-white border border-zinc-200 rounded-xl space-y-3">
              <CheckCircle2 className="w-8 h-8 text-zinc-700 mx-auto" />
              <h3 className="text-sm font-bold text-zinc-900 font-sans">No matching suggestions found</h3>
              <p className="text-xs text-zinc-500 font-sans max-w-sm mx-auto">
                Try adjusting your search query, priority filter, or selecting a different category.
              </p>
            </div>
          ) : (
            filteredSuggestions.map((item, idx) => {
              const isExpanded = expandedCardIds.has(item.id);

              return (
                <div
                  key={item.id}
                  className="bg-white border border-zinc-200 rounded-xl shadow-2xs overflow-hidden transition-all duration-200 hover:border-zinc-300"
                >
                  {/* CARD HEADER / MAIN ROW */}
                  <div className="p-5 flex flex-col gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Category badge */}
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-zinc-100 border border-zinc-200 rounded text-[11px] font-mono text-zinc-800 font-medium">
                          {getCategoryIcon(item.category)}
                          <span className="capitalize">{item.category}</span>
                        </div>

                        {/* Impact badge */}
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-bold tracking-wider ${getImpactBadgeClass(
                            item.impact
                          )}`}
                        >
                          {item.impact === 'positive' ? 'Positive Pattern' : `${item.impact} Impact`}
                        </span>

                        {/* Effort badge */}
                        {item.effort !== 'none' && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-50 text-zinc-600 border border-zinc-200">
                            {item.effort === 'quick-win'
                              ? 'Quick Win (<15m)'
                              : item.effort === 'medium'
                              ? 'Medium Effort'
                              : 'Major Refactor'}
                          </span>
                        )}
                      </div>

                      {/* Right Action / Toggle */}
                      <div className="flex items-center gap-2">
                        {item.actionText && item.actionFile && (
                          <button
                            onClick={() => onOpenFile(item.actionFile!)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-700 transition-colors cursor-pointer"
                          >
                            <span>{item.actionText}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
                          </button>
                        )}

                        <button
                          onClick={() => toggleExpand(item.id)}
                          className="p-1 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-950 rounded transition-colors cursor-pointer"
                          title={isExpanded ? 'Collapse details' : 'Expand details'}
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* TITLE & STREAMING SUMMARY */}
                    <div className="flex items-start gap-3">
                      {getTypeIcon(item.type)}
                      <div className="space-y-1 flex-1">
                        <h3
                          onClick={() => toggleExpand(item.id)}
                          className="text-sm font-bold text-zinc-950 font-sans cursor-pointer hover:text-zinc-700 transition-colors"
                        >
                          {item.title}
                        </h3>

                        <StreamingText
                          text={item.summary}
                          delay={idx * 80}
                          speed="fast"
                          sessionKey={`suggestion-${analysis.metadata?.fullName || 'repo'}-${item.id}`}
                          className="text-xs text-zinc-600 font-sans leading-relaxed"
                          as="p"
                        />
                      </div>
                    </div>

                    {/* METRICS CHIPS (if available) */}
                    {item.metrics && item.metrics.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-zinc-100">
                        {item.metrics.map((m, mIdx) => (
                          <div
                            key={mIdx}
                            className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-50 border border-zinc-200 rounded-lg text-[11px] font-mono"
                          >
                            <span className="text-zinc-500">{m.label}:</span>
                            <span className="font-bold text-zinc-900">{m.value}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* AFFECTED FILES CHIPS */}
                    {item.affectedFiles.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[11px] font-mono text-zinc-400 flex items-center gap-1 mr-1">
                          <FileText className="w-3 h-3" /> Target Files:
                        </span>
                        {item.affectedFiles.map((file, fIdx) => (
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

                  {/* EXPANDED DETAILS ACCORDION */}
                  {isExpanded && (
                    <div className="p-5 bg-zinc-50 border-t border-zinc-200 space-y-4">
                      {/* Deep explanation */}
                      <div className="space-y-1.5">
                        <h4 className="text-xs font-mono font-bold text-zinc-900 uppercase tracking-wider">
                          Architectural Context & Impact
                        </h4>
                        <p className="text-xs text-zinc-700 font-sans leading-relaxed bg-white p-3.5 rounded-lg border border-zinc-200">
                          {item.detailedExplanation}
                        </p>
                      </div>

                      {/* Code Recipe Snippet */}
                      {item.codeSnippet && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-zinc-900 uppercase tracking-wider">
                              <Code2 className="w-3.5 h-3.5 text-zinc-600" />
                              <span>Recommended Code Recipe ({item.codeSnippet.filename || 'Example'})</span>
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

                          <div className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto border border-zinc-800">
                            <pre>{item.codeSnippet.code}</pre>
                          </div>
                        </div>
                      )}

                      {/* AI Agent Prompt for Antigravity / Codex / Claude */}
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
                                  <span>Copy AI Prompt</span>
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
