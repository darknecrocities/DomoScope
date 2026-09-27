import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  X,
  Maximize2,
  Minimize2,
  FileCode,
  ArrowRight,
  Cpu,
  ChevronDown,
  ChevronRight,
  Settings,
  Sparkles,
  PanelRightClose,
  PanelRightOpen,
  Brain,
  Download,
  Trash2,
  Check,
  HardDrive,
  RefreshCw,
} from 'lucide-react';
import { RepoAnalysis, RepoFile, ChatMessage, AIProviderConfig, RepoDependency, DatabaseSchema, SecurityFinding } from '../../types';
import { AIService, AI_MODELS } from '../../services/aiService';
import { WebLLMService, LLMProgress, AVAILABLE_WEBLLM_MODELS, WebLLMModelInfo } from '../../services/webLLMService';

interface AskPanelProps {
  analysis: RepoAnalysis;
  files: RepoFile[];
  fileContents: Map<string, string>;
  selectedFile?: string | null;
  onOpenFile: (path: string) => void;
  onClose: () => void;
  onOpenSettings?: () => void;
  initialPrompt?: string | null;
  onClearInitialPrompt?: () => void;
  dependencies?: RepoDependency[];
  databaseSchema?: DatabaseSchema | null;
  securityFindings?: SecurityFinding[];
}

const SUGGESTED_QUESTIONS = [
  'What does this project do?',
  'Where does the app start?',
  'How does authentication work?',
  'Where is the database used?',
  'Which files should I read first?',
];

// ─────────────────────────────────────────────────────────────────────────────
// Proper markdown-to-JSX renderer
// ─────────────────────────────────────────────────────────────────────────────
function renderMessageText(text: string): React.ReactNode {
  const rawLines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < rawLines.length) {
    const line = rawLines[i];

    if (line.trim() === '') {
      i++;
      continue;
    }

    // Numbered list item
    if (/^\d+[.)]\s/.test(line.trim())) {
      const listItems: string[] = [];
      while (i < rawLines.length && /^\d+[.)]\s/.test(rawLines[i].trim())) {
        listItems.push(rawLines[i].trim().replace(/^\d+[.)]\s+/, ''));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="list-decimal list-inside space-y-1 mb-2 ml-1">
          {listItems.map((item, idx) => (
            <li key={idx} className="text-zinc-800 leading-relaxed">
              {renderInline(item)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Bullet list item
    if (/^[-•*]\s/.test(line.trim())) {
      const listItems: string[] = [];
      while (i < rawLines.length && /^[-•*]\s/.test(rawLines[i].trim())) {
        listItems.push(rawLines[i].trim().replace(/^[-•*]\s+/, ''));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="list-none space-y-1 mb-2 ml-1">
          {listItems.map((item, idx) => (
            <li key={idx} className="flex gap-1.5 text-zinc-800 leading-relaxed">
              <span className="mt-1.5 w-1 h-1 rounded-full bg-zinc-400 shrink-0 block" />
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Section header
    if (/^#{1,3}\s/.test(line.trim())) {
      const heading = line.trim().replace(/^#{1,3}\s+/, '');
      elements.push(
        <p key={`h-${i}`} className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-500 mt-3 mb-1">
          {renderInline(heading)}
        </p>
      );
      i++;
      continue;
    }

    // Code block
    if (line.trim().startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < rawLines.length && !rawLines[i].trim().startsWith('```')) {
        codeLines.push(rawLines[i]);
        i++;
      }
      i++;
      elements.push(
        <pre
          key={`code-${i}`}
          className="bg-zinc-900 text-zinc-100 text-[11px] font-mono rounded-lg px-3 py-2.5 overflow-x-auto mb-2 leading-relaxed"
        >
          {codeLines.join('\n')}
        </pre>
      );
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={`p-${i}`} className="text-zinc-800 leading-relaxed mb-1.5">
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return <>{elements}</>;
}

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={lastIndex}>{text.slice(lastIndex, match.index)}</span>);
    }

    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={match.index} className="font-semibold text-zinc-950">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={match.index} className="italic text-zinc-800">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code key={match.index} className="px-1 py-0.5 rounded bg-zinc-200/70 text-zinc-900 text-[10.5px] font-mono">
          {token.slice(1, -1)}
        </code>
      );
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(<span key={lastIndex}>{text.slice(lastIndex)}</span>);
  }

  return parts;
}

// ─────────────────────────────────────────────────────────────────────────────
// Thought Process Disclosure Component
// ─────────────────────────────────────────────────────────────────────────────
function ThoughtProcessDisclosure({ thoughtProcess }: { thoughtProcess: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const steps = thoughtProcess.split('\n').filter((l) => l.trim().length > 0);

  return (
    <div className="mb-2 w-full">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200/80 border border-zinc-200 text-[11px] font-mono text-zinc-700 transition-colors cursor-pointer select-none"
        title="View Thought Process"
      >
        <Brain className="w-3.5 h-3.5 text-zinc-800 shrink-0" />
        <span className="font-semibold text-zinc-900">Thought Process</span>
        <span className="text-zinc-500 text-[10px]">({steps.length} reasoning steps)</span>
        {isOpen ? (
          <ChevronDown className="w-3 h-3 text-zinc-400 ml-1" />
        ) : (
          <ChevronRight className="w-3 h-3 text-zinc-400 ml-1" />
        )}
      </button>

      {isOpen && (
        <div className="mt-1.5 p-3 rounded-xl bg-zinc-950 text-zinc-300 font-mono text-[11px] leading-relaxed border border-zinc-800 space-y-1.5 shadow-inner animate-in fade-in duration-100">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider pb-1 border-b border-zinc-800 flex items-center justify-between">
            <span>Cognitive Reasoning Trace</span>
            <span>Verified Analysis</span>
          </div>
          {steps.map((step, idx) => (
            <div key={idx} className="flex gap-2">
              <span className="text-zinc-500 select-none shrink-0">{idx + 1}.</span>
              <span className="text-zinc-300 leading-normal">{step.replace(/^\d+[\.\)]\s*/, '')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AskPanel({
  analysis,
  files,
  fileContents,
  selectedFile,
  onOpenFile,
  onClose,
  onOpenSettings,
  initialPrompt,
  onClearInitialPrompt,
  dependencies = [],
  databaseSchema,
  securityFindings = [],
}: AskPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Welcome to DomoScope Assistant. I inspect **${analysis.metadata.fullName}** directly in your browser with dynamic architectural reasoning. Ask me anything about components, routes, database schemas, or security!`,
      timestamp: Date.now(),
      referencedFiles: analysis.entryPoints.slice(0, 2),
      modelName: 'Direct Intelligent Engine',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [initProgress, setInitProgress] = useState<LLMProgress | null>(null);
  const [cachedModelIds, setCachedModelIds] = useState<string[]>([]);
  const [downloadingModelId, setDownloadingModelId] = useState<string | null>(null);
  const [isDownloadPopoverOpen, setIsDownloadPopoverOpen] = useState(false);

  // Model selection state
  const [aiConfig, setAiConfig] = useState<AIProviderConfig>({
    provider: 'local',
    selectedModel: 'local-grounded',
    reasoningEffort: 'medium',
  });
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [modelFilterTab, setModelFilterTab] = useState<'all' | 'local' | 'cloud'>('all');

  // Animated processing phase
  const [processingPhase, setProcessingPhase] = useState(0);
  const processingPhases = [
    'Scanning repository structure & dependencies...',
    'Tracing control flow & symbol references...',
    'Synthesizing architectural reasoning & response...',
  ];

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    AIService.getConfig().then(setAiConfig);
    WebLLMService.getCachedModels().then(setCachedModelIds);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  useEffect(() => {
    if (!isProcessing) {
      setProcessingPhase(0);
      return;
    }
    const interval = setInterval(() => {
      setProcessingPhase((prev) => (prev + 1) % processingPhases.length);
    }, 1400);
    return () => clearInterval(interval);
  }, [isProcessing]);

  // Close menus on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setIsModelDropdownOpen(false);
        setIsDownloadPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Handle external explain prompt
  useEffect(() => {
    if (initialPrompt) {
      handleSend(initialPrompt);
      if (onClearInitialPrompt) onClearInitialPrompt();
    }
  }, [initialPrompt]);

  const handleDownloadAndLoadModel = async (modelId: string) => {
    if (!WebLLMService.isWebGPUSupported()) {
      alert('WebGPU is not supported on this browser or device. Using Direct Intelligent Engine instead.');
      return;
    }
    setDownloadingModelId(modelId);
    setIsDownloadPopoverOpen(true);
    setInitProgress({ text: 'Connecting to model weights repository...', progress: 4 });

    try {
      const success = await WebLLMService.initModel(modelId, (p) => {
        setInitProgress(p);
      });

      if (success) {
        setInitProgress({ text: 'Model weights compiled & ready', progress: 100 });
        const updatedCache = await WebLLMService.getCachedModels();
        setCachedModelIds(updatedCache);

        const newConfig: AIProviderConfig = {
          ...aiConfig,
          provider: 'local',
          selectedModel: modelId,
        };
        setAiConfig(newConfig);
        await AIService.saveConfig(newConfig);

        setTimeout(() => {
          setInitProgress(null);
          setDownloadingModelId(null);
        }, 2200);
      } else {
        setInitProgress(null);
        setDownloadingModelId(null);
      }
    } catch {
      setInitProgress(null);
      setDownloadingModelId(null);
    }
  };

  const handleDeleteModelCache = async (modelId: string) => {
    await WebLLMService.deleteModelFromCache(modelId);
    const updatedCache = await WebLLMService.getCachedModels();
    setCachedModelIds(updatedCache);
    if (aiConfig.selectedModel === modelId) {
      const newConfig: AIProviderConfig = {
        ...aiConfig,
        selectedModel: 'local-grounded',
      };
      setAiConfig(newConfig);
      await AIService.saveConfig(newConfig);
    }
  };

  const handleSelectModel = async (modelId: string) => {
    const model = AI_MODELS.find((m) => m.id === modelId);
    if (!model) return;

    const newConfig: AIProviderConfig = {
      ...aiConfig,
      provider: model.provider,
      selectedModel: model.id,
    };
    setAiConfig(newConfig);
    await AIService.saveConfig(newConfig);
    setIsModelDropdownOpen(false);

    // If it's a downloadable WebLLM model and not cached/loaded, start download
    if (model.isDownloadable && WebLLMService.isWebGPUSupported()) {
      handleDownloadAndLoadModel(model.id);
    }
  };

  const handleSend = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || isProcessing) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: trimmed,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsProcessing(true);

    if (isMinimized) setIsMinimized(false);

    try {
      const result = await AIService.askQuestion(
        trimmed,
        analysis,
        files,
        fileContents,
        selectedFile || undefined,
        dependencies,
        databaseSchema,
        securityFindings
      );

      const activeModelObj = AI_MODELS.find((m) => m.id === result.modelUsed);
      const displayModelName = activeModelObj ? activeModelObj.name : result.modelUsed;

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: result.text,
        referencedFiles: result.referencedFiles,
        timestamp: Date.now(),
        modelName: displayModelName,
        thoughtProcess: result.thoughtProcess,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          sender: 'assistant',
          text: `An error occurred: ${err.message || 'Could not process query'}. You can switch to the Direct Intelligent Engine in the model selector.`,
          timestamp: Date.now(),
          modelName: 'Error',
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const activeModel = AI_MODELS.find((m) => m.id === aiConfig.selectedModel) || AI_MODELS[0];
  const activeDlModel = AVAILABLE_WEBLLM_MODELS.find((m) => m.id === downloadingModelId);
  const totalMB = activeDlModel ? parseFloat(activeDlModel.size) : 340;
  const percentDone = initProgress ? initProgress.progress : 0;
  const downloadedMB = ((percentDone / 100) * totalMB).toFixed(1);

  // Minimized state
  if (isMinimized) {
    return (
      <div
        className="h-full flex flex-col bg-white border-l border-zinc-200 select-none"
        style={{ width: '44px' }}
      >
        <div className="flex flex-col items-center py-3 border-b border-zinc-200 gap-2">
          <button
            onClick={() => setIsMinimized(false)}
            className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition-colors cursor-pointer"
            title="Expand Ask Panel"
          >
            <PanelRightOpen className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={() => setIsMinimized(false)}
          className="flex-1 flex flex-col items-center justify-center gap-2 py-4 text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer group"
          title="Click to open Ask Panel"
        >
          <MessageSquare className="w-4 h-4 text-zinc-600 group-hover:text-zinc-900" />
          <span
            className="text-[11px] font-medium tracking-wider text-zinc-600 group-hover:text-zinc-900 select-none"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            Ask DomoScope
          </span>
          {messages.length > 1 && (
            <span className="w-2 h-2 rounded-full bg-zinc-900" />
          )}
        </button>

        <div className="p-2 border-t border-zinc-200 flex justify-center">
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-700 rounded transition-colors cursor-pointer"
            title="Close Ask Panel"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // Filtered models for switcher
  const filteredModels = AI_MODELS.filter((m) => {
    if (modelFilterTab === 'local') return m.provider === 'local';
    if (modelFilterTab === 'cloud') return m.provider !== 'local';
    return true;
  });

  return (
    <div className="h-full w-full flex flex-col bg-white transition-all duration-200 relative">
      {/* Header Bar */}
      <div
        ref={headerRef}
        className="flex items-center justify-between px-3.5 py-2.5 border-b border-zinc-200 bg-zinc-50/90 relative shrink-0"
      >
        <div className="flex items-center gap-2 min-w-0">
          <MessageSquare className="w-4 h-4 text-zinc-700 shrink-0" />
          <h3 className="text-xs font-semibold text-zinc-900 hidden sm:inline">Ask</h3>

          {/* Model Switcher Button */}
          <button
            onClick={() => {
              setIsDownloadPopoverOpen(false);
              setIsModelDropdownOpen((prev) => !prev);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-100 text-[11px] font-mono text-zinc-800 transition-all shadow-2xs cursor-pointer max-w-[190px]"
            title="Change AI Model"
          >
            <Sparkles className="w-3 h-3 text-zinc-700 shrink-0" />
            <span className="font-medium truncate">{activeModel.name}</span>
            <ChevronDown className="w-3 h-3 text-zinc-400 shrink-0" />
          </button>

          {/* Dedicated Download Models Button with Download Icon */}
          <button
            onClick={() => {
              setIsModelDropdownOpen(false);
              setIsDownloadPopoverOpen((prev) => !prev);
            }}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-mono transition-all cursor-pointer ${
              downloadingModelId
                ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
                : isDownloadPopoverOpen
                ? 'bg-zinc-200 border-zinc-300 text-zinc-900 font-semibold'
                : 'bg-white hover:bg-zinc-100 border-zinc-200 text-zinc-700 shadow-2xs'
            }`}
            title="Download & Manage Local Models"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden md:inline font-medium">
              {downloadingModelId ? `${percentDone}%` : 'Models'}
            </span>
            {downloadingModelId && (
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping ml-0.5" />
            )}
          </button>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1 text-zinc-400 hover:text-zinc-700 rounded transition-colors cursor-pointer"
            title="Minimize chat panel"
          >
            <PanelRightClose className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsMaximized((prev) => !prev)}
            className="p-1 text-zinc-400 hover:text-zinc-700 rounded transition-colors cursor-pointer"
            title={isMaximized ? 'Restore size' : 'Maximize panel'}
          >
            {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-700 rounded transition-colors cursor-pointer"
            title="Close Ask Panel"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ── Model Selection Dropdown (Aligned cleanly to prevent left or right overflow) ── */}
        {isModelDropdownOpen && (
          <div className="absolute left-2 right-2 top-full mt-1.5 sm:left-auto sm:right-2 sm:w-[380px] max-w-[calc(100%-16px)] bg-white border border-zinc-200 rounded-2xl shadow-2xl z-50 p-2.5 animate-in fade-in duration-150 max-h-[80vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 px-1 shrink-0">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                Select AI Engine & Model
              </span>
              <button
                onClick={() => {
                  setIsModelDropdownOpen(false);
                  setIsDownloadPopoverOpen(true);
                }}
                className="text-[10px] font-mono text-zinc-800 hover:text-zinc-950 font-bold flex items-center gap-1 underline underline-offset-2 cursor-pointer"
              >
                <Download className="w-3 h-3 text-zinc-700" />
                <span>Download Manager</span>
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 my-2 bg-zinc-100 p-1 rounded-lg shrink-0">
              {(['all', 'local', 'cloud'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setModelFilterTab(tab)}
                  className={`flex-1 py-1 text-[10px] font-mono rounded-md uppercase tracking-wider transition-colors cursor-pointer ${
                    modelFilterTab === tab
                      ? 'bg-white text-zinc-900 font-bold shadow-2xs'
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  {tab === 'all' ? 'All' : tab === 'local' ? 'Local / WebGPU' : 'Cloud API'}
                </button>
              ))}
            </div>

            {/* Model Cards List */}
            <div className="overflow-y-auto max-h-[50vh] space-y-1.5 pr-1">
              {filteredModels.map((m) => {
                const isCurrent = aiConfig.selectedModel === m.id;
                const isCached = cachedModelIds.includes(m.id);

                return (
                  <button
                    key={m.id}
                    onClick={() => handleSelectModel(m.id)}
                    className={`w-full p-2.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col gap-1 ${
                      isCurrent
                        ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm'
                        : 'bg-white hover:bg-zinc-50 border-zinc-200 text-zinc-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs font-semibold truncate">{m.name}</span>
                        {m.badge && (
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider ${
                              isCurrent ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-600'
                            }`}
                          >
                            {m.badge}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {m.size && (
                          <span
                            className={`text-[10px] font-mono ${
                              isCurrent ? 'text-zinc-400' : 'text-zinc-500'
                            }`}
                          >
                            {m.size}
                          </span>
                        )}
                        {isCurrent && <Check className="w-3.5 h-3.5 text-white ml-0.5" />}
                      </div>
                    </div>

                    <p
                      className={`text-[11px] leading-relaxed line-clamp-2 ${
                        isCurrent ? 'text-zinc-300' : 'text-zinc-500'
                      }`}
                    >
                      {m.description}
                    </p>

                    {m.isDownloadable && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <span
                          className={`text-[9.5px] font-mono px-1.5 py-0.2 rounded ${
                            isCached
                              ? isCurrent
                                ? 'bg-zinc-800 text-zinc-300'
                                : 'bg-zinc-100 text-zinc-700'
                              : isCurrent
                              ? 'bg-zinc-800 text-zinc-400'
                              : 'bg-zinc-50 border border-zinc-200 text-zinc-500'
                          }`}
                        >
                          {isCached ? '✓ Downloaded & Ready' : '📦 Click to Download & Run'}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Footer Configuration */}
            {onOpenSettings && (
              <div className="pt-2 mt-2 border-t border-zinc-100 bg-white shrink-0">
                <button
                  onClick={() => {
                    setIsModelDropdownOpen(false);
                    onOpenSettings();
                  }}
                  className="w-full py-1.5 px-2 rounded-lg bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-[11px] font-mono text-zinc-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Configure Cloud API Keys</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Download Models & Progress Popover ── */}
        {isDownloadPopoverOpen && (
          <div className="absolute left-2 right-2 top-full mt-1.5 sm:left-auto sm:right-2 sm:w-[400px] max-w-[calc(100%-16px)] bg-white border border-zinc-200 rounded-2xl shadow-2xl z-50 p-3.5 animate-in fade-in duration-150 max-h-[82vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 shrink-0">
              <div className="flex items-center gap-1.5">
                <Download className="w-4 h-4 text-zinc-900" />
                <h4 className="text-xs font-bold text-zinc-900">Local Neural Models</h4>
              </div>
              <button
                onClick={() => setIsDownloadPopoverOpen(false)}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Active Download Progress Card (Shows exact MB done) */}
            {downloadingModelId && (
              <div className="mt-2.5 p-3 rounded-xl bg-zinc-950 text-white space-y-2 shrink-0 border border-zinc-800">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold truncate">{activeDlModel?.name || downloadingModelId}</span>
                  <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-bold">
                    Downloading
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-zinc-700">
                  <div
                    className="bg-white h-full rounded-full transition-all duration-300 shadow-xs"
                    style={{ width: `${percentDone}%` }}
                  />
                </div>

                {/* Downloaded vs Total MB Display */}
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-zinc-400">
                    Done: <strong className="text-white font-bold">{downloadedMB} MB</strong> / {totalMB} MB
                  </span>
                  <span className="font-bold text-white">{percentDone}%</span>
                </div>

                <div className="text-[10px] font-mono text-zinc-400 truncate">
                  Status: {initProgress?.text || 'Fetching parameters...'}
                </div>
              </div>
            )}

            {/* Models Catalog */}
            <div className="mt-2 text-[10px] font-mono uppercase text-zinc-400 font-bold tracking-wider px-1 shrink-0">
              Available WebGPU Models
            </div>

            <div className="overflow-y-auto max-h-[46vh] space-y-2 mt-1 pr-1">
              {AVAILABLE_WEBLLM_MODELS.map((model) => {
                const isCached = cachedModelIds.includes(model.id);
                const isActive = aiConfig.selectedModel === model.id;
                const isThisDownloading = downloadingModelId === model.id;

                return (
                  <div
                    key={model.id}
                    className={`p-3 rounded-xl border transition-all ${
                      isActive
                        ? 'border-zinc-900 bg-zinc-50'
                        : 'border-zinc-200 bg-white hover:border-zinc-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-zinc-900 truncate">{model.name}</span>
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-700 font-medium">
                            {model.badge}
                          </span>
                          {isActive && (
                            <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-zinc-900 text-white font-bold">
                              Active
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">{model.description}</p>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400 mt-1.5">
                          <span>Size: <strong className="text-zinc-700">{model.size}</strong></span>
                          <span>·</span>
                          <span>VRAM: <strong className="text-zinc-700">{model.vramRequired}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 ml-1">
                        {isCached ? (
                          <>
                            <button
                              onClick={() => {
                                handleSelectModel(model.id);
                                setIsDownloadPopoverOpen(false);
                              }}
                              className="px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-[10px] font-mono font-bold transition-colors cursor-pointer"
                            >
                              {isActive ? 'Active' : 'Load'}
                            </button>
                            <button
                              onClick={() => handleDeleteModelCache(model.id)}
                              className="p-1 rounded-md text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
                              title="Delete model from browser cache"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleDownloadAndLoadModel(model.id)}
                            disabled={isThisDownloading}
                            className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white text-[10.5px] font-mono font-medium flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Download className="w-3 h-3 text-white" />
                            <span>{isThisDownloading ? `${percentDone}%` : 'Download'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Suggested Questions Carousel */}
      <div className="px-3.5 py-1.5 border-b border-zinc-100 bg-white flex items-center gap-1.5 overflow-x-auto shrink-0">
        <span className="text-[10px] font-mono uppercase text-zinc-400 shrink-0">Ask:</span>
        {SUGGESTED_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => handleSend(q)}
            disabled={isProcessing}
            className="px-2.5 py-0.5 rounded-full border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 hover:border-zinc-300 text-[11px] text-zinc-700 whitespace-nowrap transition-colors shrink-0 cursor-pointer disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Chat Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1 w-full`}
            >
              <div
                className={`max-w-[92%] rounded-xl px-3.5 py-2.5 text-xs ${
                  isUser
                    ? 'bg-zinc-900 text-white font-sans shadow-xs leading-relaxed'
                    : 'bg-zinc-50 text-zinc-800 border border-zinc-200 font-sans w-full'
                }`}
              >
                {isUser ? (
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                ) : (
                  <div>
                    {msg.thoughtProcess && (
                      <ThoughtProcessDisclosure thoughtProcess={msg.thoughtProcess} />
                    )}
                    <div className="space-y-0.5">{renderMessageText(msg.text)}</div>
                  </div>
                )}
              </div>

              {/* Model Tag */}
              {!isUser && msg.modelName && (
                <div className="text-[10px] font-mono text-zinc-400 pl-1 flex items-center gap-1">
                  <span>{msg.modelName}</span>
                </div>
              )}

              {/* Clickable Referenced Files */}
              {!isUser && msg.referencedFiles && msg.referencedFiles.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1 pl-1">
                  {msg.referencedFiles.map((path) => (
                    <button
                      key={path}
                      onClick={() => onOpenFile(path)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-zinc-200 hover:border-zinc-400 text-[11px] font-mono text-zinc-700 transition-colors cursor-pointer"
                      title={`Open ${path} in viewer`}
                    >
                      <FileCode className="w-3 h-3 text-zinc-400" />
                      <span>{path.split('/').pop()}</span>
                      <ArrowRight className="w-2.5 h-2.5 text-zinc-400" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Real-time Thinking & Analyzing State */}
        {isProcessing && (
          <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-mono text-zinc-700 animate-in fade-in">
            <div className="flex items-center gap-2">
              <Brain className="w-3.5 h-3.5 text-zinc-900 animate-pulse shrink-0" />
              <span className="font-semibold text-zinc-900">DomoScope Assistant is analyzing repository...</span>
            </div>
            <div className="flex items-center gap-2 pl-5 text-[11px] text-zinc-500">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-800 animate-ping" />
              <span>{processingPhases[processingPhase]}</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form Bar */}
      <div className="p-3 border-t border-zinc-200 bg-white shrink-0">
        {selectedFile && (
          <div className="flex items-center gap-1.5 mb-2 text-[11px] font-mono text-zinc-500">
            <span className="text-zinc-400">Context:</span>
            <span className="px-1.5 py-0.5 bg-zinc-100 rounded text-zinc-700 truncate max-w-xs">
              {selectedFile}
            </span>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(inputValue);
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={`Ask ${activeModel.name} about this repo...`}
            disabled={isProcessing}
            className="flex-1 px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg outline-none focus:border-zinc-800 focus:bg-white text-zinc-900 transition-colors placeholder:text-zinc-400 font-sans"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isProcessing}
            className="p-2 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-white rounded-lg transition-colors cursor-pointer shrink-0 shadow-xs"
            title="Send Message"
            aria-label="Send Message"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
