import { useState, useMemo } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  FileText,
  Sparkles,
  Layers,
  Layout,
  Server,
  Cpu,
  Activity,
  Database,
  BookOpen,
  Bot,
  ShieldCheck,
  CheckSquare,
  Square,
} from 'lucide-react';
import { RepoAnalysis, RepoFile, DatabaseSchema, RepoDependency, SecurityFinding } from '../../types';
import { MarkdownSpecGenerator, SpecGeneratorOptions } from '../../services/markdownSpecGenerator';
import { StreamingText } from '../common/StreamingText';
import { AnimatedCounter } from '../common/AnimatedCounter';

interface SpecGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: RepoAnalysis;
  files: RepoFile[];
  fileContents: Map<string, string> | Record<string, string>;
  databaseSchema?: DatabaseSchema | null;
  dependencies?: RepoDependency[] | null;
  securityFindings?: SecurityFinding[];
}

interface FeatureModuleConfig {
  id: keyof SpecGeneratorOptions;
  title: string;
  description: string;
  icon: typeof FileText;
  badge: string;
}

const FEATURE_MODULES: FeatureModuleConfig[] = [
  {
    id: 'includeOverview',
    title: '1. Executive Summary & Tech Stack',
    description: 'High-level purpose, primary language, runtime framework, and entry point files.',
    icon: FileText,
    badge: 'Overview',
  },
  {
    id: 'includeArchitecture',
    title: '2. Directory Topology & Module Map',
    description: 'Complete recursive file tree, subsystem boundaries, and folder responsibilities.',
    icon: Layers,
    badge: 'Topology',
  },
  {
    id: 'includeFrontend',
    title: '3. Frontend & UI/UX Design System',
    description: 'Component hierarchy, client routing, view state, design tokens, and interactions.',
    icon: Layout,
    badge: 'Frontend',
  },
  {
    id: 'includeBackend',
    title: '4. Backend API Engine & Route Contracts',
    description: 'HTTP endpoints catalog, request/response JSON schemas, controllers, and middleware.',
    icon: Server,
    badge: 'Backend',
  },
  {
    id: 'includeFunctions',
    title: '5. Core Functions, Hooks & Data Flow',
    description: 'Business logic pipelines, custom reactive hooks, and algorithmic transformations.',
    icon: Cpu,
    badge: 'Logic',
  },
  {
    id: 'includeAppBehavior',
    title: '6. End-to-End Application Behavior',
    description: 'Detailed runtime lifecycle, cold boot sequence, user workflows, and state sync.',
    icon: Activity,
    badge: 'Behavior',
  },
  {
    id: 'includeDatabase',
    title: '7. Database Schemas & Data Models',
    description: 'Synthesized ERD tables, column types, primary keys, relationships, and schema DDL.',
    icon: Database,
    badge: 'Database',
  },
  {
    id: 'includeInstructions',
    title: '8. Step-by-Step Reconstruction Blueprint',
    description: 'Exhaustive 10-phase engineering roadmap with full file scaffolding & boilerplate code.',
    icon: BookOpen,
    badge: '10-Phase Guide',
  },
  {
    id: 'includePrompts',
    title: '9. Specialized LLM Reverse Prompts',
    description: 'Engineered prompts for Claude 3.7, GPT-4o, and Gemini 2.5 to recreate each subsystem.',
    icon: Bot,
    badge: 'AI Prompts',
  },
  {
    id: 'includeDependencies',
    title: '10. Dependencies & Security Audit',
    description: 'External package ecosystem catalog, version pins, and vulnerability scan report.',
    icon: ShieldCheck,
    badge: 'Security',
  },
];

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
    includeFrontend: true,
    includeBackend: true,
    includeFunctions: true,
    includeAppBehavior: true,
    includeDatabase: true,
    includeInstructions: true,
    includePrompts: true,
    includeDependencies: true,
    includeSecurity: true,
  });

  const [copied, setCopied] = useState(false);
  const [showConfig, setShowConfig] = useState(true);

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

  const lineCount = useMemo(() => {
    return markdownContent.split('\n').length;
  }, [markdownContent]);

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

  const handleToggleAll = (val: boolean) => {
    const updated: SpecGeneratorOptions = {
      includeOverview: val,
      includeArchitecture: val,
      includeFrontend: val,
      includeBackend: val,
      includeFunctions: val,
      includeAppBehavior: val,
      includeDatabase: val,
      includeInstructions: val,
      includePrompts: val,
      includeDependencies: val,
      includeSecurity: val,
    };
    setOptions(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-5xl bg-white border border-zinc-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header - Strictly Monochrome / Black Icons Only */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-white text-zinc-900">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-zinc-100 rounded-xl border border-zinc-200">
              <FileText className="w-5 h-5 text-black stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-zinc-900">
                  Reverse Engineering Spec & Prompt Generator (.md)
                </h2>
                <span className="px-2 py-0.5 bg-zinc-100 border border-zinc-300 text-black text-[11px] font-mono font-bold rounded-md">
                  <AnimatedCounter value={lineCount} /> Lines
                </span>
              </div>
              <p className="text-xs text-zinc-500 font-mono mt-0.5">
                Construct reverse engineering system prompts & architecture specs for{' '}
                <span className="font-semibold text-zinc-900">{analysis.metadata.fullName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-black hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-zinc-200"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-black stroke-[2]" />
          </button>
        </div>

        {/* Feature Modules Selector with Detailed Descriptions */}
        <div className="bg-zinc-50/80 border-b border-zinc-200 p-4 shrink-0">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-black">
                Specification Features & Modules
              </span>
              <span className="text-[11px] font-mono text-zinc-500">
                (Configure modules to include in your reverse engineering markdown)
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <button
                onClick={() => handleToggleAll(true)}
                className="px-2.5 py-1 text-black bg-white hover:bg-zinc-100 border border-zinc-300 rounded-lg font-semibold transition-colors cursor-pointer"
              >
                Select All
              </button>
              <button
                onClick={() => handleToggleAll(false)}
                className="px-2.5 py-1 text-zinc-600 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-lg transition-colors cursor-pointer"
              >
                Clear All
              </button>
              <button
                onClick={() => setShowConfig((prev) => !prev)}
                className="px-2.5 py-1 text-zinc-800 bg-white hover:bg-zinc-100 border border-zinc-300 rounded-lg font-semibold transition-colors cursor-pointer ml-1"
              >
                {showConfig ? 'Collapse Features' : 'Expand Features'}
              </button>
            </div>
          </div>

          {showConfig && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 max-h-48 overflow-y-auto pr-1">
              {FEATURE_MODULES.map((mod) => {
                const isChecked = Boolean(options[mod.id]);
                const IconComponent = mod.icon;

                return (
                  <label
                    key={mod.id}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between select-none ${
                      isChecked
                        ? 'bg-white border-zinc-900 shadow-2xs'
                        : 'bg-zinc-100/70 border-zinc-200 text-zinc-400 opacity-60 hover:opacity-90'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <IconComponent className="w-3.5 h-3.5 text-black shrink-0" />
                          <span className="text-[11px] font-bold text-black truncate">
                            {mod.title.split('. ')[1] || mod.title}
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) =>
                            setOptions((prev) => ({ ...prev, [mod.id]: e.target.checked }))
                          }
                          className="w-3.5 h-3.5 rounded border-zinc-300 text-black focus:ring-black accent-black cursor-pointer"
                        />
                      </div>
                      <p className="text-[10px] text-zinc-600 leading-tight line-clamp-2">
                        {mod.description}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Markdown Content Preview */}
        <div className="flex-1 overflow-y-auto p-6 bg-zinc-950 text-zinc-100 font-mono text-xs leading-relaxed selection:bg-zinc-700 selection:text-white">
          <StreamingText
            key={`${analysis.metadata.repo}-${Object.values(options).join('-')}`}
            text={markdownContent}
            speed="fast"
            as="pre"
            cursorClassName="w-1.5 h-3.5 bg-zinc-200"
            className="whitespace-pre-wrap font-mono break-words text-xs text-zinc-100"
            sessionKey={`spec-modal-${analysis.metadata.repo}-${Object.values(options).join('-')}`}
          />
        </div>

        {/* Footer Actions - Pure Black Icons Only */}
        <div className="px-6 py-3.5 bg-white border-t border-zinc-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-700">
            <Sparkles className="w-4 h-4 text-black stroke-[2]" />
            <span>
              Ready to copy into <strong className="text-black">Claude 3.7</strong>,{' '}
              <strong className="text-black">GPT-4o</strong>, or{' '}
              <strong className="text-black">Gemini 2.5 Pro</strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCopy}
              className="px-4 py-2 bg-white hover:bg-zinc-100 border border-zinc-300 text-black rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-black stroke-[2.5]" />
                  <span>Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-black stroke-[2]" />
                  <span>Copy Markdown</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-black hover:bg-zinc-800 text-white rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4 text-white stroke-[2]" />
              <span>Download .md File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
