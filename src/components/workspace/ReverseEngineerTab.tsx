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
  CheckCircle2,
  Circle,
  ArrowRight,
  ExternalLink,
  Search,
  Code2,
  Terminal,
  Cpu,
  Globe,
  SlidersHorizontal,
  ChevronRight,
} from 'lucide-react';
import {
  RepoAnalysis,
  RepoFile,
  DatabaseSchema,
  RepoDependency,
} from '../../types';
import { StreamingText } from '../common/StreamingText';
import { AnimatedCounter } from '../common/AnimatedCounter';
import {
  ReverseEngineerCategory,
  REVERSE_CATEGORIES,
  generateReverseEngineerSpec,
  generateAgentSkillPack,
} from '../../services/reverseEngineerGenerator';
import { detectFrameworks } from '../../services/frameworkDetector';
import { detectCloudServices } from '../../services/cloudServicesDetector';
import { parseApiEndpoints } from '../../services/apiRouteCatalog';
import { parseDatabaseFiles } from '../../services/databaseParser';

interface ReverseEngineerTabProps {
  repoName: string;
  analysis: RepoAnalysis | null;
  files: RepoFile[];
  fileContents: Map<string, string> | Record<string, string>;
  databaseSchema: DatabaseSchema | null;
  dependencies: RepoDependency[];
  onOpenFile?: (path: string) => void;
}

type ReverseViewMode = 'blueprint' | 'prompts' | 'spec';

export function ReverseEngineerTab({
  repoName,
  analysis,
  files,
  fileContents,
  databaseSchema,
  dependencies,
  onOpenFile,
}: ReverseEngineerTabProps) {
  const [viewMode, setViewMode] = useState<ReverseViewMode>('blueprint');
  const [activeCategory, setActiveCategory] = useState<ReverseEngineerCategory>('fullstack');
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [wordWrap, setWordWrap] = useState(true);
  const [subsystemFilter, setSubsystemFilter] = useState<string>('all');
  const [fileSearchQuery, setFileSearchQuery] = useState('');
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});

  const contentsMap: Map<string, string> = useMemo(() => {
    return fileContents instanceof Map ? fileContents : new Map(Object.entries(fileContents || {}));
  }, [fileContents]);

  const filesWithContent = useMemo(() => {
    return files.map((f) => ({
      path: f.path,
      content: contentsMap.get(f.path) || '',
    }));
  }, [files, contentsMap]);

  // Dynamic analysis extraction for this specific repository
  const frameworkResult = useMemo(() => {
    return detectFrameworks(files, contentsMap, dependencies);
  }, [files, contentsMap, dependencies]);

  const cloudResult = useMemo(() => {
    return detectCloudServices(files, contentsMap, dependencies);
  }, [files, contentsMap, dependencies]);

  const apiRoutes = useMemo(() => {
    return parseApiEndpoints(filesWithContent);
  }, [filesWithContent]);

  const dbSchema = useMemo(() => {
    return databaseSchema || parseDatabaseFiles(filesWithContent.filter((f) => Boolean(f.content)));
  }, [databaseSchema, filesWithContent]);

  // Categorized file buckets
  const componentFiles = useMemo(() => files.filter((f) => f.category === 'component'), [files]);
  const serviceFiles = useMemo(() => files.filter((f) => f.category === 'service'), [files]);
  const apiFiles = useMemo(() => files.filter((f) => f.category === 'api'), [files]);
  const databaseFiles = useMemo(() => files.filter((f) => f.category === 'database'), [files]);
  const configFiles = useMemo(() => files.filter((f) => f.category === 'config'), [files]);

  // Filtered file directory in blueprint explorer
  const displayedFiles = useMemo(() => {
    let list = files;
    if (subsystemFilter === 'component') list = componentFiles;
    else if (subsystemFilter === 'service') list = serviceFiles;
    else if (subsystemFilter === 'api') list = apiFiles;
    else if (subsystemFilter === 'database') list = databaseFiles;
    else if (subsystemFilter === 'config') list = configFiles;

    const q = fileSearchQuery.toLowerCase().trim();
    if (!q) return list.slice(0, 48);

    return list
      .filter((f) => f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q))
      .slice(0, 48);
  }, [files, subsystemFilter, componentFiles, serviceFiles, apiFiles, databaseFiles, configFiles, fileSearchQuery]);

  // Dynamic 5-Phase Rebuild Roadmap customized to this repo
  const rebuildRoadmap = useMemo(() => {
    const primary = frameworkResult.primary;
    const topDeps = dependencies.slice(0, 6).map((d) => d.name);
    const installCmd =
      primary.runtime.toLowerCase().includes('flutter') || primary.runtime.toLowerCase().includes('dart')
        ? `flutter pub add ${topDeps.slice(0, 4).join(' ')}`
        : primary.runtime.toLowerCase().includes('python')
        ? `pip install ${topDeps.slice(0, 4).join(' ')}`
        : `npm install ${topDeps.slice(0, 4).join(' ')}`;

    return [
      {
        id: 'phase_1',
        phase: 'Phase 01',
        title: 'Project Scaffolding & Core Dependencies',
        description: `Initialize a fresh ${primary.name} workspace with the identified package ecosystem and build tools.`,
        tasks: [
          { id: 'p1_t1', text: `Create ${primary.name} project matching target runtime (${primary.runtime})` },
          { id: 'p1_t2', text: `Install core libraries: ${installCmd}` },
          { id: 'p1_t3', text: `Configure TypeScript / linter & build scripts (${configFiles.map((c) => c.name).slice(0, 3).join(', ') || 'tsconfig.json'})` },
        ],
      },
      {
        id: 'phase_2',
        phase: 'Phase 02',
        title: 'Data Architecture & Storage Schemas',
        description: `Define persistent entities, data models, and local or cloud database clients.`,
        tasks: [
          { id: 'p2_t1', text: `Declare database tables / models: ${dbSchema.tables.map((t) => t.name).slice(0, 5).join(', ') || 'Domain Entities'}` },
          { id: 'p2_t2', text: `Setup primary storage engine: ${cloudResult.storageSystems[0]?.name || 'Local Sandbox / IndexedDB'}` },
          { id: 'p2_t3', text: `Configure data migrations and relationship foreign keys` },
        ],
      },
      {
        id: 'phase_3',
        phase: 'Phase 03',
        title: 'Network Services & API Route Adapters',
        description: `Implement external services, REST/GraphQL endpoints, and error handling layers.`,
        tasks: [
          { id: 'p3_t1', text: `Scaffold API routes: ${apiRoutes.map((r) => `${r.method} ${r.path}`).slice(0, 4).join(', ') || 'Internal Service Contracts'}` },
          { id: 'p3_t2', text: `Connect cloud platforms: ${cloudResult.providers.join(', ').toUpperCase() || 'Client-Side Services'}` },
          { id: 'p3_t3', text: `Wrap network calls with offline caching and retry backoff` },
        ],
      },
      {
        id: 'phase_4',
        phase: 'Phase 04',
        title: 'UI Component Tree & Page Routing',
        description: `Assemble interactive visual screens, navigation routes, and design system tokens.`,
        tasks: [
          { id: 'p4_t1', text: `Configure application router from entry point (${analysis?.entryPoints[0] || 'src/main.tsx'})` },
          { id: 'p4_t2', text: `Recreate primary component tree: ${componentFiles.map((c) => c.name).slice(0, 4).join(', ') || 'UI Views'}` },
          { id: 'p4_t3', text: `Apply styling discipline (${frameworkResult.primary.stylingEcosystem || 'Tailwind CSS'})` },
        ],
      },
      {
        id: 'phase_5',
        phase: 'Phase 05',
        title: 'State Synchronization & Production Polish',
        description: `Wire reactive state management, offline caches, and verify complete test suite.`,
        tasks: [
          { id: 'p5_t1', text: `Wire reactive state stores and user session management` },
          { id: 'p5_t2', text: `Verify end-to-end user flows and responsive breakpoints` },
          { id: 'p5_t3', text: `Audit security posture and secrets isolation before production release` },
        ],
      },
    ];
  }, [frameworkResult, dependencies, configFiles, dbSchema, cloudResult, apiRoutes, analysis, componentFiles]);

  const totalTasks = useMemo(() => {
    return rebuildRoadmap.reduce((acc, p) => acc + p.tasks.length, 0);
  }, [rebuildRoadmap]);

  const completedCount = useMemo(() => {
    return Object.values(completedSteps).filter(Boolean).length;
  }, [completedSteps]);

  const toggleTask = (taskId: string) => {
    setCompletedSteps((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

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

  const copyToClipboard = async (text: string, typeKey: string) => {
    let success = false;
    if (navigator?.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        success = true;
      } catch {
        success = false;
      }
    }

    if (!success) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        success = true;
      } catch (err) {
        console.error('Failed to copy text:', err);
      }
    }

    if (success) {
      setCopiedType(typeKey);
      setTimeout(() => setCopiedType(null), 2200);
    }
  };

  const handleDownloadMd = () => {
    const filename =
      activeCategory === 'agent_skill'
        ? 'SKILL.md'
        : `${repoName.replace(/[^a-zA-Z0-9-_]/g, '-')}-${activeCategory}-blueprint.md`;
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
            @page { size: A4; margin: 15mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.5; color: #09090b; padding: 20px; background: #ffffff; }
            .header { border-bottom: 2px solid #09090b; padding-bottom: 12px; margin-bottom: 20px; }
            h1 { font-size: 20px; margin: 0 0 4px 0; font-weight: 800; }
            .meta { font-size: 12px; color: #52525b; font-family: monospace; }
            pre { background: #f4f4f5; color: #09090b; padding: 16px; border-radius: 8px; border: 1px solid #e4e4e7; font-family: monospace; font-size: 11px; line-height: 1.5; white-space: pre-wrap; word-break: break-word; }
            @media print { body { padding: 0; } pre { border: none; padding: 0; background: transparent; } }
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

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      try {
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 250);
        return;
      } catch {
        // Fallback below
      }
    }
    window.print();
  };

  // Pre-constructed specialized AI prompts
  const aiPrompts = useMemo(() => {
    const primary = frameworkResult.primary;
    const topDeps = dependencies.slice(0, 8).map((d) => d.name).join(', ');
    const entry = analysis?.entryPoints[0] || 'src/main.tsx';

    return [
      {
        id: 'fullstack_prompt',
        title: 'Master Full-Stack Re-Architecture Prompt',
        targetAgents: 'Cursor, Claude 3.7 / 3.5 Sonnet, ChatGPT, Copilot',
        description: 'Complete prompt directing an AI coding assistant to reconstruct the entire project step by step with zero architectural drift.',
        prompt: `You are an expert autonomous software architect. Your task is to reproduce the application architecture of "${repoName}" from scratch.

Target Architecture Context:
- Primary Framework: ${primary.name} (${primary.category})
- Runtime & Language: ${primary.runtime} (${analysis?.metadata.language || 'TypeScript'})
- Entry Point: ${entry}
- Key Dependencies: ${topDeps || 'Standard Ecosystem Packages'}
- Cloud Infrastructure: ${cloudResult.architectureTitle} (${cloudResult.providers.join(', ').toUpperCase() || 'Local Client'})
- Database & Models: ${dbSchema.tables.map((t) => t.name).join(', ') || 'Domain Entities'}

Execution Instructions:
1. Initialize the project with the exact runtime and directory structure.
2. Scaffold data models and storage providers first.
3. Implement the service layer and API routes.
4. Construct UI components following a strict, clean, high-contrast monochrome design system.
5. Guide me step by step through each phase starting with Phase 1 scaffolding.`,
      },
      {
        id: 'ui_prompt',
        title: 'Design System & Component Cloner Prompt',
        targetAgents: 'Cursor, Claude Sonnet, v0, Bolt',
        description: 'Instructs AI to extract and rebuild the component hierarchy, tokens, responsive layouts, and typography.',
        prompt: `Please help me recreate the design system and UI components of "${repoName}":

Design Specifications:
- Styling Framework: ${primary.stylingEcosystem || 'Tailwind CSS'}
- Palette: High-contrast monochrome zinc (#ffffff, #fafafa, #f4f4f5, #e4e4e7, #71717a, #18181b, #09090b)
- Detected UI Components (${componentFiles.length}):
${componentFiles.slice(0, 15).map((c) => `  - ${c.name} (${c.path})`).join('\n')}

Please generate:
1. The global CSS / styling configuration.
2. The root layout shell with navigation bar and responsive viewport container.
3. Component prop interfaces and accessible JSX markup for the top components.`,
      },
      {
        id: 'api_prompt',
        title: 'Backend API & Network Service Prompt',
        targetAgents: 'Cursor, Claude, Copilot, ChatGPT',
        description: 'Generates API endpoints, DTO contracts, controllers, and cloud service adapters.',
        prompt: `Help me implement the backend API and service layer for "${repoName}":

Discovered Endpoints & Services (${apiRoutes.length} Routes, ${serviceFiles.length} Services):
${apiRoutes.slice(0, 10).map((r) => `  - [${r.method}] ${r.path} -> defined in ${r.file}`).join('\n') || '  - Direct Client Services and BaaS adapters'}

Services to scaffold:
${serviceFiles.slice(0, 8).map((s) => `  - ${s.name} (${s.path})`).join('\n')}

Please generate the TypeScript service classes, request/response interfaces, and error handling wrappers.`,
      },
      {
        id: 'db_prompt',
        title: 'Database Schema & Migration Prompt',
        targetAgents: 'Cursor, Claude, Copilot, ChatGPT',
        description: 'Generates database DDL migrations, Prisma/SQL models, and foreign key relations.',
        prompt: `Generate the complete database schema and relational migration for "${repoName}":

Detected Tables & Entities (${dbSchema.tables.length} Tables):
${dbSchema.tables.map((t) => `  - ${t.name}: ${t.columns.map((c) => `${c.name} (${c.type}${c.isPrimary ? ', PK' : c.isForeignKey ? ', FK' : ''})`).join(', ')}`).join('\n')}

Detected Relationships (${dbSchema.relationships.length}):
${dbSchema.relationships.map((r) => `  - ${r.fromTable}.${r.fromColumn} -> ${r.toTable}.${r.toColumn}`).join('\n') || '  - None'}

Please generate:
1. The complete SQL DDL \`CREATE TABLE\` script with primary and foreign keys.
2. The corresponding TypeScript interfaces / ORM models.`,
      },
    ];
  }, [frameworkResult, dependencies, analysis, cloudResult, dbSchema, componentFiles, apiRoutes, serviceFiles, repoName]);

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
    <div className="min-h-full flex flex-col bg-zinc-50 p-4 md:p-6 space-y-5 font-sans select-none">
      {/* Top Banner Header */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-zinc-900 text-white rounded-xl shadow-2xs">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold text-zinc-900 tracking-tight">
                Reverse Engineering Suite
              </h1>
              <p className="text-xs text-zinc-500 font-mono">
                Architectural blueprint, interactive layer explorer & AI agent skills for {repoName}
              </p>
            </div>
          </div>
        </div>

        {/* Global Export Actions */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleDownloadSkillPack}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-black text-white text-xs font-mono font-bold rounded-xl shadow-xs transition-all cursor-pointer"
            title="Download SKILL.md for AI agents"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Download SKILL.md</span>
          </button>

          <button
            onClick={handleDownloadMd}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-300 hover:border-zinc-900 text-zinc-900 text-xs font-mono font-bold rounded-xl shadow-xs transition-all cursor-pointer"
            title="Download selected blueprint as Markdown (.md)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Blueprint (.md)</span>
          </button>

          <button
            onClick={handlePrintPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-300 hover:border-zinc-900 text-zinc-900 text-xs font-mono font-bold rounded-xl shadow-xs transition-all cursor-pointer"
            title="Print or Save as PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* Main Mode Navigation Bar: Blueprint vs AI Prompts vs Markdown Spec */}
      <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-2 rounded-xl shadow-2xs">
        <div className="flex items-center gap-1 font-mono text-xs">
          <button
            onClick={() => setViewMode('blueprint')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-2 font-bold transition-all cursor-pointer ${
              viewMode === 'blueprint'
                ? 'bg-zinc-900 text-white shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Interactive Blueprint</span>
          </button>

          <button
            onClick={() => setViewMode('prompts')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-2 font-bold transition-all cursor-pointer ${
              viewMode === 'prompts'
                ? 'bg-zinc-900 text-white shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Prompts & Skills</span>
          </button>

          <button
            onClick={() => setViewMode('spec')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-2 font-bold transition-all cursor-pointer ${
              viewMode === 'spec'
                ? 'bg-zinc-900 text-white shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Markdown Specification</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: INTERACTIVE BLUEPRINT EXPLORER & ROADMAP                          */}
      {/* ========================================================================= */}
      {viewMode === 'blueprint' && (
        <div className="space-y-6">
          {/* Architecture Summary Hero Card */}
          <div className="p-5 rounded-2xl border border-zinc-200 bg-white shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block mb-1">
                  Architectural Foundation
                </span>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-zinc-900 font-mono">
                    {frameworkResult.primary.name} Architecture
                  </h2>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-white font-semibold">
                    {frameworkResult.primary.category}
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded border border-zinc-200 bg-zinc-50 text-zinc-700">
                    {cloudResult.architectureTitle}
                  </span>
                </div>
              </div>

              {analysis?.entryPoints && analysis.entryPoints.length > 0 && (
                <div className="flex items-center gap-1.5 font-mono text-xs">
                  <span className="text-zinc-400">Entry:</span>
                  <button
                    onClick={() => onOpenFile?.(analysis.entryPoints[0])}
                    className="flex items-center gap-1 px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 rounded-lg font-bold transition-colors cursor-pointer border border-zinc-200 shadow-2xs"
                    title="Jump to entry point file"
                  >
                    <span>{analysis.entryPoints[0]}</span>
                    <ExternalLink className="w-3 h-3 text-zinc-500" />
                  </button>
                </div>
              )}
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div
                onClick={() => setSubsystemFilter('component')}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  subsystemFilter === 'component'
                    ? 'border-zinc-900 bg-zinc-50 shadow-xs'
                    : 'border-zinc-200 bg-white hover:border-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between text-zinc-500 mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">
                    Components
                  </span>
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <div className="text-xl font-black font-mono text-zinc-900">
                  <AnimatedCounter value={componentFiles.length} />
                </div>
                <span className="text-[10px] font-mono text-zinc-400">UI view elements</span>
              </div>

              <div
                onClick={() => setSubsystemFilter('service')}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  subsystemFilter === 'service'
                    ? 'border-zinc-900 bg-zinc-50 shadow-xs'
                    : 'border-zinc-200 bg-white hover:border-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between text-zinc-500 mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">
                    Services
                  </span>
                  <Server className="w-3.5 h-3.5" />
                </div>
                <div className="text-xl font-black font-mono text-zinc-900">
                  <AnimatedCounter value={serviceFiles.length} />
                </div>
                <span className="text-[10px] font-mono text-zinc-400">Business logic clients</span>
              </div>

              <div
                onClick={() => setSubsystemFilter('api')}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  subsystemFilter === 'api'
                    ? 'border-zinc-900 bg-zinc-50 shadow-xs'
                    : 'border-zinc-200 bg-white hover:border-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between text-zinc-500 mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">
                    API Routes
                  </span>
                  <Globe className="w-3.5 h-3.5" />
                </div>
                <div className="text-xl font-black font-mono text-zinc-900">
                  <AnimatedCounter value={apiRoutes.length} />
                </div>
                <span className="text-[10px] font-mono text-zinc-400">Discovered endpoints</span>
              </div>

              <div
                onClick={() => setSubsystemFilter('database')}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  subsystemFilter === 'database'
                    ? 'border-zinc-900 bg-zinc-50 shadow-xs'
                    : 'border-zinc-200 bg-white hover:border-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between text-zinc-500 mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">
                    Database
                  </span>
                  <Database className="w-3.5 h-3.5" />
                </div>
                <div className="text-xl font-black font-mono text-zinc-900">
                  <AnimatedCounter value={dbSchema.tables.length} />
                </div>
                <span className="text-[10px] font-mono text-zinc-400">Tables & entity models</span>
              </div>
            </div>
          </div>

          {/* Subsystems & Key Files Decomposition */}
          <div className="p-5 rounded-2xl border border-zinc-200 bg-white shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 font-mono">
                  Subsystem & File Decomposition
                </h3>
                <p className="text-xs text-zinc-500">
                  Inspect the physical structure of each module and jump directly to files in the repository.
                </p>
              </div>

              {/* Subsystem Category Filter Pills & Search */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center bg-zinc-100 p-0.5 rounded-lg border border-zinc-200 text-xs font-mono">
                  {(['all', 'component', 'service', 'api', 'database', 'config'] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSubsystemFilter(cat)}
                      className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer capitalize ${
                        subsystemFilter === cat
                          ? 'bg-white text-zinc-900 shadow-2xs font-bold'
                          : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-50 border border-zinc-200 rounded-lg text-xs w-44">
                  <Search className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <input
                    type="text"
                    value={fileSearchQuery}
                    onChange={(e) => setFileSearchQuery(e.target.value)}
                    placeholder="Search files..."
                    className="w-full bg-transparent outline-none text-zinc-800 placeholder:text-zinc-400 font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Files Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-80 overflow-y-auto pr-1">
              {displayedFiles.map((file) => (
                <div
                  key={file.path}
                  onClick={() => onOpenFile?.(file.path)}
                  className="p-2.5 rounded-xl border border-zinc-200 bg-zinc-50/70 hover:bg-white hover:border-zinc-400 transition-all cursor-pointer flex items-center justify-between gap-2 shadow-2xs"
                  title={`Open ${file.path}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileCode className="w-4 h-4 text-zinc-600 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-xs font-mono font-bold text-zinc-900 block truncate">
                        {file.name}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500 block truncate">
                        {file.path}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-700 font-semibold">
                      {file.category}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Rebuild Roadmap with Checkboxes */}
          <div className="p-5 rounded-2xl border border-zinc-200 bg-white shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 font-mono">
                  Interactive Step-by-Step Rebuild Roadmap
                </h3>
                <p className="text-xs text-zinc-500">
                  Track your progress as you reverse-engineer, recreate, or audit this application.
                </p>
              </div>

              {/* Progress Indicator */}
              <div className="flex items-center gap-3 bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-xl font-mono text-xs">
                <span className="text-zinc-600">
                  Progress: <strong className="text-zinc-900">{completedCount}</strong> of{' '}
                  <strong className="text-zinc-900">{totalTasks}</strong> Tasks
                </span>
                <div className="w-24 h-2 bg-zinc-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-zinc-900 rounded-full transition-all duration-300"
                    style={{
                      width: `${totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Phases List */}
            <div className="space-y-4">
              {rebuildRoadmap.map((phase, pIdx) => (
                <div key={phase.id} className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/50 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-900 text-white">
                        {phase.phase}
                      </span>
                      <h4 className="text-xs font-mono font-bold text-zinc-900">{phase.title}</h4>
                    </div>
                  </div>
                  <StreamingText
                    text={phase.description}
                    delay={pIdx * 100}
                    speed="fast"
                    sessionKey={`roadmap-desc-${phase.id}`}
                    className="text-xs text-zinc-600 leading-relaxed"
                    as="p"
                  />

                  <div className="space-y-1.5 pt-1">
                    {phase.tasks.map((task) => {
                      const isDone = Boolean(completedSteps[task.id]);
                      return (
                        <div
                          key={task.id}
                          onClick={() => toggleTask(task.id)}
                          className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center gap-2.5 text-xs font-mono ${
                            isDone
                              ? 'bg-zinc-100/80 border-zinc-300 text-zinc-400 line-through'
                              : 'bg-white border-zinc-200 text-zinc-800 hover:border-zinc-400 shadow-2xs'
                          }`}
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-zinc-400 shrink-0" />
                          )}
                          <span className="truncate">{task.text}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: SPECIALIZED AI AGENT PROMPTS STUDIO                               */}
      {/* ========================================================================= */}
      {viewMode === 'prompts' && (
        <div className="space-y-4">
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs space-y-1">
            <h3 className="text-sm font-bold text-zinc-900 font-mono">
              AI Coding Assistant & Autonomous Agent Prompts
            </h3>
            <StreamingText
              text="Copy pre-engineered system prompts populated with real repository context, dependencies, and file contracts for Claude, Cursor, Copilot, or ChatGPT."
              speed="normal"
              sessionKey="prompts-banner"
              className="text-xs text-zinc-500"
              as="p"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {aiPrompts.map((p, pIdx) => {
              const isCopied = copiedType === p.id;
              return (
                <div
                  key={p.id}
                  className="rounded-2xl border border-zinc-200 bg-white shadow-xs p-5 flex flex-col justify-between space-y-4 hover:border-zinc-300 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 font-semibold border border-zinc-200">
                        {p.targetAgents}
                      </span>
                      <button
                        onClick={() => copyToClipboard(p.prompt, p.id)}
                        className="flex items-center gap-1 text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-black text-white transition-colors cursor-pointer shadow-2xs"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{isCopied ? 'Copied' : 'Copy Prompt'}</span>
                      </button>
                    </div>

                    <h4 className="text-sm font-bold text-zinc-900 font-mono">{p.title}</h4>
                    <StreamingText
                      text={p.description}
                      delay={pIdx * 120}
                      speed="fast"
                      sessionKey={`prompt-desc-${p.id}`}
                      className="text-xs text-zinc-500 leading-relaxed"
                      as="p"
                    />
                  </div>

                  <div className="p-3 bg-zinc-950 text-zinc-200 font-mono text-[11px] rounded-xl overflow-x-auto max-h-40 leading-relaxed whitespace-pre-wrap selection:bg-zinc-800">
                    <StreamingText
                      text={p.prompt}
                      speed="fast"
                      delay={pIdx * 80}
                      as="pre"
                      cursorClassName="w-1.5 h-3 bg-zinc-200"
                      className="whitespace-pre-wrap font-mono text-[11px] text-zinc-200"
                      sessionKey={`prompt-code-${p.id}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: MARKDOWN SPECIFICATION DOCUMENT                                   */}
      {/* ========================================================================= */}
      {viewMode === 'spec' && (
        <div className="space-y-4">
          {/* Subsystem Category Selector Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {REVERSE_CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                    isActive
                      ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm'
                      : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`p-1.5 rounded-lg transition-colors ${
                        isActive ? 'bg-zinc-800 text-white' : 'bg-zinc-100 text-zinc-800'
                      }`}
                    >
                      {getCategoryIcon(cat.iconName)}
                    </span>
                    {isActive && <span className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <div>
                    <h3 className={`text-xs font-bold truncate ${isActive ? 'text-white' : 'text-zinc-900'}`}>
                      {cat.title}
                    </h3>
                    <p className={`text-[10px] line-clamp-2 mt-0.5 ${isActive ? 'text-zinc-300' : 'text-zinc-500'}`}>
                      {cat.subtitle}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Fullscreen Overlay */}
          {isExpanded && (
            <div
              className="fixed inset-0 bg-black/60 z-40 backdrop-blur-xs transition-opacity"
              onClick={() => setIsExpanded(false)}
            />
          )}

          {/* Document Container */}
          <div
            className={`bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden flex flex-col transition-all ${
              isExpanded
                ? 'fixed inset-2 sm:inset-4 md:inset-6 z-50 shadow-2xl border-zinc-400'
                : 'relative'
            }`}
          >
            {/* Document Toolbar */}
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
                    {activeCategory === 'agent_skill' ? 'SKILL.md' : `${activeCategory}_blueprint.md`}
                  </span>
                  <span className="text-[11px] font-mono text-zinc-500 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-md">
                    Comprehensive Specification
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
                >
                  {isExpanded ? <Minimize2 className="w-3.5 h-3.5 shrink-0" /> : <Maximize2 className="w-3.5 h-3.5 shrink-0" />}
                  <span>{isExpanded ? 'Collapse' : 'Expand'}</span>
                </button>

                {/* Copy Markdown */}
                <button
                  onClick={() => copyToClipboard(specMarkdown, 'markdown_spec')}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-white border border-zinc-300 hover:border-zinc-900 text-zinc-800 text-xs font-bold rounded-lg shadow-2xs transition-all cursor-pointer"
                  title="Copy Markdown specification"
                >
                  {copiedType === 'markdown_spec' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-zinc-950 shrink-0" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 shrink-0" />
                      <span>Copy Markdown</span>
                    </>
                  )}
                </button>

                {/* Download .md */}
                <button
                  onClick={handleDownloadMd}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold rounded-lg shadow-2xs transition-all cursor-pointer"
                  title="Download specification file"
                >
                  <Download className="w-3.5 h-3.5 shrink-0" />
                  <span>Download .md</span>
                </button>
              </div>
            </div>

            {/* Scrollable Spec Code Container */}
            <div
              className={`p-4 sm:p-6 overflow-y-auto overflow-x-auto bg-zinc-950 text-zinc-100 font-mono text-xs leading-relaxed selection:bg-zinc-700 selection:text-white transition-all duration-200 scrollbar-thin ${
                isExpanded ? 'flex-1 h-full min-h-0' : 'h-[580px] lg:h-[720px]'
              }`}
            >
              <StreamingText
                key={`${repoName}-${activeCategory}`}
                text={specMarkdown}
                speed="fast"
                as="pre"
                cursorClassName="w-1.5 h-3.5 bg-zinc-200"
                className={`min-w-0 max-w-full font-mono text-zinc-100 text-xs leading-relaxed ${
                  wordWrap ? 'whitespace-pre-wrap break-words break-all sm:break-normal' : 'whitespace-pre'
                }`}
                sessionKey={`spec-${repoName}-${activeCategory}`}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
