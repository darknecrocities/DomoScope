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
  Settings,
  Sparkles,
} from 'lucide-react';
import { RepoAnalysis, RepoFile, ChatMessage, AIProviderConfig } from '../../types';
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
}

const SUGGESTED_QUESTIONS = [
  'What does this project do?',
  'Where does the app start?',
  'How does authentication work?',
  'Where is the database used?',
  'Which files should I read first?',
];

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
}: AskPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Welcome to DomoScope Assistant. I inspect ${analysis.metadata.fullName} directly from your repository files. What would you like to explore?`,
      timestamp: Date.now(),
      referencedFiles: analysis.entryPoints.slice(0, 2),
      modelName: 'Local Grounded Engine',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [initProgress, setInitProgress] = useState<LLMProgress | null>(null);

  // Model selection state
  const [aiConfig, setAiConfig] = useState<AIProviderConfig>({
    provider: 'local',
    selectedModel: 'local-grounded',
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

  // Try optional WebLLM preload in background if WebGPU available
  useEffect(() => {
    if (WebLLMService.isWebGPUSupported()) {
      WebLLMService.initModel((p) => setInitProgress(p)).catch(() => {});
    }
  }, []);

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

    try {
      const result = await AIService.askQuestion(
        trimmed,
        analysis,
        files,
        fileContents,
        selectedFile || undefined
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

  return (
    <div
      className={`h-full flex flex-col bg-white border-l border-zinc-200 transition-all select-none ${
        isMaximized ? 'fixed inset-y-0 right-0 z-50 w-full sm:w-[560px] shadow-2xl' : 'w-full'
      }`}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-200 bg-zinc-50/80 relative">
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
                  {/* Group by provider */}
                  {(['local', 'anthropic', 'gemini', 'openai'] as const).map((prov) => {
                    const groupModels = AI_MODELS.filter((m) => m.provider === prov);
                    const providerLabel =
                      prov === 'local'
                        ? 'Local Engine (Free)'
                        : prov === 'anthropic'
                        ? 'Anthropic Claude'
                        : prov === 'gemini'
                        ? 'Google Gemini'
                        : 'OpenAI GPT';

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
          <button
            onClick={() => setIsMaximized((prev) => !prev)}
            className="p-1 text-zinc-400 hover:text-zinc-700 rounded transition-colors"
            title={isMaximized ? 'Restore size' : 'Maximize panel'}
          >
            {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
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
        <div className="px-4 py-2 bg-zinc-100/70 border-b border-zinc-200 text-[11px] font-mono text-zinc-600 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-zinc-500 animate-spin" />
            <span>Preparing local model: {initProgress.text}</span>
          </div>
          <span>{initProgress.progress}%</span>
        </div>
      )}

      {/* Suggested Questions Carousel */}
      <div className="px-4 py-2 border-b border-zinc-100 bg-white flex items-center gap-1.5 overflow-x-auto">
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
                className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                  isUser
                    ? 'bg-zinc-900 text-white font-sans shadow-xs'
                    : 'bg-zinc-100 text-zinc-800 border border-zinc-200/80 font-sans'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>

              {/* Model Tag & Timestamp */}
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
      <div className="p-3 border-t border-zinc-200 bg-white">
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
