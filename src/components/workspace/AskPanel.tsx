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
  Sparkles,
} from 'lucide-react';
import { RepoAnalysis, RepoFile, ChatMessage } from '../../types';
import { WebLLMService, LLMProgress } from '../../services/webLLMService';

interface AskPanelProps {
  analysis: RepoAnalysis;
  files: RepoFile[];
  fileContents: Map<string, string>;
  selectedFile?: string | null;
  onOpenFile: (path: string) => void;
  onClose: () => void;
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
  initialPrompt,
  onClearInitialPrompt,
}: AskPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Welcome to DomoScope Assistant. I inspect ${analysis.metadata.fullName} locally on your device. What would you like to know?`,
      timestamp: Date.now(),
      referencedFiles: analysis.entryPoints.slice(0, 2),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [initProgress, setInitProgress] = useState<LLMProgress | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
      const result = await WebLLMService.askQuestion(
        trimmed,
        analysis,
        files,
        fileContents,
        selectedFile || undefined
      );

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: result.text,
        referencedFiles: result.referencedFiles,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          sender: 'assistant',
          text: 'I could not process this request right now. Try selecting a specific file or asking an overview question.',
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className={`h-full flex flex-col bg-white border-l border-zinc-200 transition-all select-none ${
        isMaximized ? 'fixed inset-y-0 right-0 z-50 w-full sm:w-[540px] shadow-2xl' : 'w-full'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 bg-zinc-50/70">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-zinc-700" />
          <h3 className="text-xs font-semibold text-zinc-900">Ask about this project</h3>
        </div>

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

      {/* Hardware / Engine Status Notice */}
      {initProgress && initProgress.progress < 100 && (
        <div className="px-4 py-2 bg-zinc-100/70 border-b border-zinc-200 text-[11px] font-mono text-zinc-600 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-zinc-500 animate-spin" />
            <span>Preparing local assistant: {initProgress.text}</span>
          </div>
          <span>{initProgress.progress}%</span>
        </div>
      )}

      {/* Suggested Questions Pills */}
      <div className="px-4 py-2 border-b border-zinc-100 bg-white flex items-center gap-1.5 overflow-x-auto">
        <span className="text-[10px] font-mono uppercase text-zinc-400 shrink-0">Suggestions:</span>
        {SUGGESTED_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => handleSend(q)}
            disabled={isProcessing}
            className="px-2 py-0.5 rounded-full border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 hover:border-zinc-300 text-[11px] text-zinc-700 whitespace-nowrap transition-colors shrink-0 cursor-pointer disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Chat Messages Log */}
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
                    ? 'bg-zinc-900 text-white font-sans'
                    : 'bg-zinc-100 text-zinc-800 border border-zinc-200/80 font-sans'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>

              {/* Referenced Files links */}
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
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-ping" />
            <span>Analyzing repository files...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Footer */}
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
            placeholder="Ask a question about this repository..."
            disabled={isProcessing}
            className="flex-1 px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg outline-none focus:border-zinc-800 focus:bg-white text-zinc-900 transition-colors placeholder:text-zinc-400"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isProcessing}
            className="p-2 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-white rounded-lg transition-colors cursor-pointer shrink-0"
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
