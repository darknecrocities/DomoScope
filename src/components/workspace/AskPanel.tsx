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
} from 'lucide-react';
import { RepoAnalysis, RepoFile, ChatMessage, AIProviderConfig, RepoDependency, DatabaseSchema, SecurityFinding } from '../../types';
import { AIService, AI_MODELS } from '../../services/aiService';
import { WebLLMService, LLMProgress } from '../../services/webLLMService';

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
// Proper markdown-to-JSX renderer (no raw **** in output)
// ─────────────────────────────────────────────────────────────────────────────
function renderMessageText(text: string): React.ReactNode {
  // Split into lines for block-level processing
  const rawLines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < rawLines.length) {
    const line = rawLines[i];

    // Skip blank lines (add spacing via margin on previous element instead)
    if (line.trim() === '') {
      i++;
      continue;
    }

    // ── Numbered list item: "1. " or "1) "
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

    // ── Bullet list item: "- ", "• ", "* " at start
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
              <span className="mt-1 w-1 h-1 rounded-full bg-zinc-400 shrink-0 block" />
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // ── Section header: "## " or "### " or "**Title:**"
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

    // ── Code block: ``` ... ```
    if (line.trim().startsWith('```')) {
      const codeLines: string[] = [];
      i++; // skip opening ```
      while (i < rawLines.length && !rawLines[i].trim().startsWith('```')) {
        codeLines.push(rawLines[i]);
        i++;
      }
      i++; // skip closing ```
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

    // ── Regular paragraph line
    elements.push(
      <p key={`p-${i}`} className="text-zinc-800 leading-relaxed mb-1.5">
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return <>{elements}</>;
}

// Inline markdown: **bold**, *italic*, `code`, plain text
function renderInline(text: string): React.ReactNode {
  // tokenize by **bold**, *italic*, `code`
  const parts: React.ReactNode[] = [];
  // Pattern captures: **bold** | *italic* | `code` | plain
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Plain text before match
    if (match.index > lastIndex) {
      parts.push(<span key={lastIndex}>{text.slice(lastIndex, match.index)}</span>);
    }

    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={match.index} className="font-semibold text-zinc-900">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={match.index} className="italic text-zinc-700">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code key={match.index} className="bg-zinc-200 text-zinc-900 font-mono text-[10px] px-1 py-0.5 rounded">
          {token.slice(1, -1)}
        </code>
      );
    }

    lastIndex = match.index + token.length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    parts.push(<span key={lastIndex}>{text.slice(lastIndex)}</span>);
  }

  return parts.length > 0 ? <>{parts}</> : <>{text}</>;
}

// ─────────────────────────────────────────────────────────────────────────────
// AskPanel component
// ─────────────────────────────────────────────────────────────────────────────
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
      text: `Welcome to DomoScope Assistant. I inspect **${analysis.metadata.fullName}** directly in your browser with zero model installation required. Ask me anything about architecture, APIs, database schemas, or security!`,
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

  // Model selection state
  const [aiConfig, setAiConfig] = useState<AIProviderConfig>({
    provider: 'local',
    selectedModel: 'local-grounded',
    reasoningEffort: 'medium',
  });
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    AIService.getConfig().then(setAiConfig);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsModelDropdownOpen(false);
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

  // Automatically install/load the local WebLLM model right away on mount for supported devices
  useEffect(() => {
    let isMounted = true;
    if (WebLLMService.isWebGPUSupported()) {
      WebLLMService.initModel((p) => {
        if (isMounted) setInitProgress(p);
      })
        .then((success) => {
          if (isMounted && success) {
            setInitProgress({ text: 'Local neural model installed & ready', progress: 100 });
            setTimeout(() => {
              if (isMounted) setInitProgress(null);
            }, 3500);
          }
        })
        .catch(() => {
          if (isMounted) setInitProgress(null);
        });
    }
    return () => {
      isMounted = false;
    };
  }, []);

  // Also trigger if user explicitly switches to an MLC neural model
  useEffect(() => {
    if (aiConfig.selectedModel.includes('MLC') && WebLLMService.isWebGPUSupported()) {
      WebLLMService.initModel((p) => setInitProgress(p)).catch(() => {});
    }
  }, [aiConfig.selectedModel]);

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

    // Auto-expand if minimized when a message is sent
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
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          sender: 'assistant',
          text: `An error occurred: ${err.message || 'Could not process query'}. You can switch to the Local Engine in the model selector.`,
          timestamp: Date.now(),
          modelName: 'Error',
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const activeModel = AI_MODELS.find((m) => m.id === aiConfig.selectedModel) || AI_MODELS[0];

  // ── Minimized state: slim vertical tab strip ────────────────────────────────
  if (isMinimized) {
    return (
      <div
        className="h-full flex flex-col bg-white border-l border-zinc-200 select-none"
        style={{ width: '44px' }}
      >
        {/* Expand button */}
        <button
          onClick={() => setIsMinimized(false)}
          className="flex flex-col items-center gap-2 px-2 pt-4 pb-3 hover:bg-zinc-50 transition-colors group w-full"
          title="Expand AI Chat"
        >
          <PanelRightOpen className="w-4 h-4 text-zinc-500 group-hover:text-zinc-900 transition-colors" />
          <span
            className="text-[10px] font-mono font-semibold text-zinc-400 group-hover:text-zinc-700 transition-colors"
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)', letterSpacing: '0.08em' }}
          >
            AI Chat
          </span>
        </button>

        {/* New message indicator when minimized and has unread */}
        {messages.length > 1 && (
          <div className="mx-auto mt-1 w-1.5 h-1.5 rounded-full bg-zinc-900" />
        )}
      </div>
    );
  }

  // ── Full panel ──────────────────────────────────────────────────────────────
  return (
    <div
      className={`h-full flex flex-col bg-white border-l border-zinc-200 transition-all select-none ${
        isMaximized ? 'fixed inset-y-0 right-0 z-50 w-full sm:w-[560px] shadow-2xl' : 'w-full'
      }`}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-200 bg-zinc-50/80 relative shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <MessageSquare className="w-4 h-4 text-zinc-700 shrink-0" />
          <h3 className="text-xs font-semibold text-zinc-900 hidden sm:inline">Ask</h3>

          {/* Model Switcher Dropdown Button */}
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setIsModelDropdownOpen((prev) => !prev)}
              className="flex items-center gap-1 px-2 py-1 rounded-md border border-zinc-200 bg-white hover:bg-zinc-100 text-[11px] font-mono text-zinc-800 transition-colors shadow-2xs cursor-pointer"
              title="Change AI Model (Claude, Gemini, GPT, Local)"
            >
              <Sparkles className="w-3 h-3 text-zinc-600" />
              <span className="font-medium truncate max-w-[130px]">{activeModel.name}</span>
              <ChevronDown className="w-3 h-3 text-zinc-400" />
            </button>

            {/* Model Dropdown Menu */}
            {isModelDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-64 bg-white border border-zinc-200 rounded-xl shadow-xl z-50 py-1.5 animate-in fade-in duration-100">
                <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-zinc-400 border-b border-zinc-100">
                  Select AI Provider & Model
                </div>

                <div className="max-h-64 overflow-y-auto divide-y divide-zinc-50">
                  {(['local', 'anthropic', 'gemini', 'openai'] as const).map((prov) => {
                    const groupModels = AI_MODELS.filter((m) => m.provider === prov);
                    const providerLabel =
                      prov === 'local'
                        ? 'Local & Vercel Cloud (Zero-Install)'
                        : prov === 'gemini'
                        ? 'Google Gemini (Gemini 3.5 / 2.5)'
                        : prov === 'anthropic'
                        ? 'Anthropic Claude'
                        : 'OpenAI GPT & Reasoning';

                    return (
                      <div key={prov} className="py-1">
                        <div className="px-3 py-0.5 text-[9px] font-mono uppercase text-zinc-400">
                          {providerLabel}
                        </div>
                        {groupModels.map((m) => {
                          const isCurrent = aiConfig.selectedModel === m.id;
                          return (
                            <button
                              key={m.id}
                              onClick={() => handleSelectModel(m.id)}
                              className={`w-full px-3 py-1.5 text-left text-xs font-mono flex items-center justify-between transition-colors cursor-pointer ${
                                isCurrent
                                  ? 'bg-zinc-900 text-white font-medium'
                                  : 'text-zinc-700 hover:bg-zinc-100'
                              }`}
                            >
                              <span className="truncate">{m.name}</span>
                              {isCurrent && <span className="text-[10px] ml-1.5">✓</span>}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>

                {onOpenSettings && (
                  <div className="p-1.5 border-t border-zinc-100 bg-zinc-50/80">
                    <button
                      onClick={() => {
                        setIsModelDropdownOpen(false);
                        onOpenSettings();
                      }}
                      className="w-full py-1 px-2 rounded-md bg-white hover:bg-zinc-100 border border-zinc-200 text-[11px] font-mono text-zinc-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Settings className="w-3 h-3 text-zinc-500" />
                      <span>Configure API Keys</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-1">
          {/* Minimize button */}
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1 text-zinc-400 hover:text-zinc-700 rounded transition-colors"
            title="Minimize chat panel"
          >
            <PanelRightClose className="w-3.5 h-3.5" />
          </button>

          {/* Maximize / restore */}
          <button
            onClick={() => setIsMaximized((prev) => !prev)}
            className="p-1 text-zinc-400 hover:text-zinc-700 rounded transition-colors"
            title={isMaximized ? 'Restore size' : 'Maximize panel'}
          >
            {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-700 rounded transition-colors"
            title="Close Ask Panel"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* WebLLM Engine Progress Bar */}
      {initProgress && initProgress.progress < 100 && (
        <div className="px-4 py-2 bg-zinc-100/70 border-b border-zinc-200 text-[11px] font-mono text-zinc-600 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-zinc-500 animate-spin" />
            <span>Preparing local model: {initProgress.text}</span>
          </div>
          <span>{initProgress.progress}%</span>
        </div>
      )}

      {/* Suggested Questions Carousel */}
      <div className="px-4 py-2 border-b border-zinc-100 bg-white flex items-center gap-1.5 overflow-x-auto shrink-0">
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
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
            >
              <div
                className={`max-w-[88%] rounded-xl px-3.5 py-2.5 text-xs ${
                  isUser
                    ? 'bg-zinc-900 text-white font-sans shadow-xs leading-relaxed'
                    : 'bg-zinc-50 text-zinc-800 border border-zinc-200 font-sans'
                }`}
              >
                {isUser ? (
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                ) : (
                  <div className="space-y-0.5">{renderMessageText(msg.text)}</div>
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

        {isProcessing && (
          <div className="flex items-center gap-2 p-2 text-xs text-zinc-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 animate-ping" />
            <span>Consulting {activeModel.name}...</span>
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
