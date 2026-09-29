import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  Cpu,
  Trash2,
  Check,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Server,
  Terminal,
  Copy,
  CheckCheck,
  Play,
  Globe,
  Laptop,
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { WebLLMService } from '../../services/webLLMService';
import { AIService, AI_MODELS } from '../../services/aiService';
import { GitHubService } from '../../services/github';
import { AIProviderConfig, AIModelOption } from '../../types';
import { CryptoService } from '../../services/cryptoService';
import {
  handleMcpRequest,
  DOMOSCOPE_MCP_TOOLS,
  JSONRPCRequest,
} from '../../services/mcpCore';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClearCache?: () => void;
}

export function SettingsModal({ isOpen, onClose, onClearCache }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'ai' | 'mcp'>('general');

  // GitHub token state
  const [token, setToken] = useState('');
  const [isTokenSaved, setIsTokenSaved] = useState(false);
  const [hasWebGPU, setHasWebGPU] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState(GitHubService.getRateLimit());

  // AI Configuration state
  const [aiConfig, setAiConfig] = useState<AIProviderConfig>({
    provider: 'local',
    selectedModel: 'local-grounded',
    openaiKey: '',
    anthropicKey: '',
    geminiKey: '',
  });
  const [isAiSaved, setIsAiSaved] = useState(false);

  // MCP Configuration & Playground state
  const [mcpClientType, setMcpClientType] = useState<'codex' | 'claude' | 'cursor' | 'antigravity' | 'windsurf' | 'cline' | 'remote'>('codex');
  const [isMcpCopied, setIsMcpCopied] = useState(false);
  const [mcpTestRepo, setMcpTestRepo] = useState('Thes-IS-IT/Easylens');
  const [mcpTestTool, setMcpTestTool] = useState('get_repository_architecture');
  const [mcpFilePath, setMcpFilePath] = useState('pubspec.yaml');
  const [mcpErdFormat, setMcpErdFormat] = useState<'json' | 'sql' | 'mermaid'>('json');
  const [mcpQueryText, setMcpQueryText] = useState('What are the main architectural components and entry points?');
  const [isMcpTesting, setIsMcpTesting] = useState(false);
  const [mcpTestOutput, setMcpTestOutput] = useState<string | null>(null);
  const [mcpTestStatus, setMcpTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [mcpDuration, setMcpDuration] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      StorageService.getSetting<string>('github_token', '').then(setToken);
      setHasWebGPU(WebLLMService.isWebGPUSupported());
      AIService.getConfig().then(setAiConfig);
      setRateLimitInfo(GitHubService.getRateLimit());
      setIsTokenSaved(false);
      setIsAiSaved(false);
    }
  }, [isOpen]);

  const [currentProviderModels, setCurrentProviderModels] = useState<AIModelOption[]>(AI_MODELS);

  useEffect(() => {
    if (isOpen) {
      AIService.getModelsForProvider(aiConfig.provider).then(setCurrentProviderModels);
    }
  }, [isOpen, aiConfig.provider, aiConfig.openaiKey, aiConfig.geminiKey]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSaveToken = async (e: React.FormEvent) => {
    e.preventDefault();
    await StorageService.setSetting('github_token', token.trim());
    setIsTokenSaved(true);
    setRateLimitInfo(GitHubService.getRateLimit());
    setTimeout(() => setIsTokenSaved(false), 2000);
  };

  const handleSaveAiConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    await AIService.saveConfig(aiConfig);
    setIsAiSaved(true);
    setTimeout(() => setIsAiSaved(false), 2000);
  };

  const handleClearCache = async () => {
    if (confirm('Clear all local repository cache? Repositories will be re-fetched from GitHub on next visit.')) {
      indexedDB.deleteDatabase('domoscope_cache_v1');
      if (onClearCache) onClearCache();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs font-sans">
      <div className="w-full max-w-2xl bg-white border border-zinc-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-zinc-50">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-zinc-900">Settings, Quota & MCP Protocol</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200 rounded-xl transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-zinc-200 px-6 bg-zinc-50/70 text-xs font-mono overflow-x-auto">
          <button
            onClick={() => setActiveTab('general')}
            className={`py-2.5 px-3 border-b-2 font-medium transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'general'
                ? 'border-zinc-900 text-zinc-900 font-bold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Key className="w-3.5 h-3.5 text-zinc-900" />
            <span>GitHub Quota & Tokens</span>
          </button>

          <button
            onClick={() => setActiveTab('ai')}
            className={`py-2.5 px-3 border-b-2 font-medium transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'ai'
                ? 'border-zinc-900 text-zinc-900 font-bold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-zinc-900" />
            <span>AI Models & Keys</span>
          </button>

          <button
            onClick={() => setActiveTab('mcp')}
            className={`py-2.5 px-3 border-b-2 font-medium transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'mcp'
                ? 'border-zinc-900 text-zinc-900 font-bold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-zinc-900" />
            <span>MCP Server & Agents</span>
          </button>
        </div>

        {/* Tab 1: GitHub & Storage */}
        {activeTab === 'general' && (
          <div className="p-6 space-y-6 max-h-[460px] overflow-y-auto">
            {/* Live Rate Limit Status */}
            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-900" />
                  GitHub API Rate Limit Status
                </span>
                <span className="text-xs font-mono font-bold text-zinc-900 bg-zinc-200/80 px-2.5 py-0.5 rounded-md border border-zinc-300">
                  {rateLimitInfo.remaining} / {rateLimitInfo.limit} remaining
                </span>
              </div>
              <p className="text-xs text-zinc-600 leading-relaxed font-sans">
                {rateLimitInfo.limit > 60
                  ? 'Authenticated Mode Active (5,000 requests/hour limit).'
                  : 'Unauthenticated Mode (60 requests/hour limit). Add your Personal Access Token below to upgrade to 5,000 requests/hour.'}
              </p>
            </div>

            {/* Security Best Practice Notice (Black & White) */}
            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-900">
                <ShieldCheck className="w-4 h-4 text-zinc-900 shrink-0" />
                <span>Open Source Security & Token Safety</span>
              </div>
              <p className="text-xs text-zinc-700 leading-relaxed">
                <strong>Never hardcode personal GitHub tokens into open-source repositories!</strong> Doing so allows unauthorized parties to steal your API quota and triggers automatic GitHub secret revoking.
              </p>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Instead, DomoScope securely saves your Personal Access Token <strong>ONLY in your browser's local storage (IndexedDB)</strong> and uses zero-quota direct raw content downloads (`raw.githubusercontent.com`) + 24-hour persistent caching.
              </p>
            </div>

            {/* Personal Token Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm font-bold text-zinc-900">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-zinc-900" />
                  <span>Your Personal Access Token (PAT)</span>
                </div>
                {token && (
                  <span className="text-[10px] font-mono text-zinc-500 font-normal">
                    AES-GCM Encrypted: {CryptoService.maskToken(token)}
                  </span>
                )}
              </div>
              <form onSubmit={handleSaveToken} className="flex gap-2 pt-1">
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="flex-1 px-3.5 py-2 text-xs font-mono bg-zinc-50 border border-zinc-300 rounded-xl focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 focus:bg-white transition-colors text-zinc-900"
                />
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-black rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
                >
                  {isTokenSaved ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" />
                      <span>Saved</span>
                    </>
                  ) : (
                    <span>Save Token</span>
                  )}
                </button>
              </form>
            </div>

            <div className="h-px bg-zinc-200" />

            {/* Local Storage & Cache */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-zinc-900">
                <Trash2 className="w-4 h-4 text-zinc-700" />
                <span>Persistent IndexedDB Caching</span>
              </div>
              <p className="text-xs text-zinc-500">
                All parsed file trees, architecture graphs, database schemas, and security reports are cached in your browser. Re-visiting repositories consumes <strong>0 GitHub API calls</strong>.
              </p>
              <button
                onClick={handleClearCache}
                className="px-4 py-2 text-xs font-semibold text-zinc-800 hover:text-black bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 rounded-xl transition-colors w-full flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-zinc-700" />
                <span>Clear IndexedDB Cache</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: AI Provider & Models */}
        {activeTab === 'ai' && (
          <form onSubmit={handleSaveAiConfig} className="p-6 space-y-5 max-h-[460px] overflow-y-auto">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-zinc-900 uppercase tracking-wider font-mono">
                AI Provider
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(
                  [
                    { id: 'local', label: 'Local AI (WebLLM)' },
                    { id: 'anthropic', label: 'Claude' },
                    { id: 'gemini', label: 'Gemini' },
                    { id: 'openai', label: 'OpenAI' },
                  ] as const
                ).map((prov) => {
                  const isSelected = aiConfig.provider === prov.id;
                  return (
                    <button
                      key={prov.id}
                      type="button"
                      onClick={() => {
                        const defaultModel = AI_MODELS.find((m) => m.provider === prov.id)?.id || '';
                        setAiConfig((prev) => ({
                          ...prev,
                          provider: prov.id,
                          selectedModel: defaultModel,
                        }));
                      }}
                      className={`py-2 px-2.5 rounded-xl border text-xs font-mono transition-all text-center cursor-pointer ${
                        isSelected
                          ? 'border-zinc-900 bg-zinc-900 text-white font-bold shadow-xs'
                          : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300 hover:bg-white'
                      }`}
                    >
                      {prov.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-900 uppercase tracking-wider font-mono">
                Select Model
              </label>
              <select
                value={aiConfig.selectedModel}
                onChange={(e) =>
                  setAiConfig((prev) => ({
                    ...prev,
                    selectedModel: e.target.value,
                  }))
                }
                className="w-full px-3.5 py-2 text-xs font-mono bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 focus:bg-white transition-colors"
              >
                {currentProviderModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Gemini API Key */}
            {aiConfig.provider === 'gemini' && (
              <div className="space-y-1.5 animate-in fade-in">
                <label className="text-xs font-bold text-zinc-900 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-mono">
                    <Key className="w-3.5 h-3.5 text-zinc-900" />
                    <span>Google Gemini API Key</span>
                  </span>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-zinc-900 font-semibold underline hover:text-black flex items-center gap-1"
                  >
                    <span>Get Free Key</span>
                  </a>
                </label>
                <input
                  type="password"
                  value={aiConfig.geminiKey || ''}
                  onChange={(e) => setAiConfig((prev) => ({ ...prev, geminiKey: e.target.value }))}
                  placeholder="AIzaSy..."
                  className="w-full px-3.5 py-2 text-xs font-mono bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 focus:bg-white transition-colors"
                />
                <p className="text-[11px] text-zinc-500 font-sans">
                  Leave blank if you deployed DomoScope on Vercel with <code>GEMINI_API_KEY</code> set in Environment Variables.
                </p>
              </div>
            )}

            {/* OpenAI API Key */}
            {aiConfig.provider === 'openai' && (
              <div className="space-y-1.5 animate-in fade-in">
                <label className="text-xs font-bold text-zinc-900 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-mono">
                    <Key className="w-3.5 h-3.5 text-zinc-900" />
                    <span>OpenAI API Key</span>
                  </span>
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-zinc-900 font-semibold underline hover:text-black"
                  >
                    Get API Key
                  </a>
                </label>
                <input
                  type="password"
                  value={aiConfig.openaiKey || ''}
                  onChange={(e) => setAiConfig((prev) => ({ ...prev, openaiKey: e.target.value }))}
                  placeholder="sk-proj-..."
                  className="w-full px-3.5 py-2 text-xs font-mono bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 focus:bg-white transition-colors"
                />
              </div>
            )}

            {/* Anthropic Claude API Key */}
            {aiConfig.provider === 'anthropic' && (
              <div className="space-y-1.5 animate-in fade-in">
                <label className="text-xs font-bold text-zinc-900 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-mono">
                    <Key className="w-3.5 h-3.5 text-zinc-900" />
                    <span>Anthropic API Key</span>
                  </span>
                  <a
                    href="https://console.anthropic.com/settings/keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-zinc-900 font-semibold underline hover:text-black"
                  >
                    Get API Key
                  </a>
                </label>
                <input
                  type="password"
                  value={aiConfig.anthropicKey || ''}
                  onChange={(e) => setAiConfig((prev) => ({ ...prev, anthropicKey: e.target.value }))}
                  placeholder="sk-ant-..."
                  className="w-full px-3.5 py-2 text-xs font-mono bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 focus:bg-white transition-colors"
                />
              </div>
            )}

            {/* Reasoning Effort / Thinking Level */}
            {(aiConfig.provider === 'gemini' || aiConfig.provider === 'openai') && (
              <div className="space-y-1.5 pt-1 animate-in fade-in">
                <label className="block text-xs font-bold text-zinc-900 uppercase tracking-wider font-mono">
                  Reasoning Effort / Thinking Budget
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'low', label: 'Low', desc: 'Fastest' },
                    { id: 'medium', label: 'Medium', desc: 'Balanced' },
                    { id: 'high', label: 'High', desc: 'Deep' },
                  ].map((eff) => (
                    <button
                      key={eff.id}
                      type="button"
                      onClick={() => setAiConfig((prev) => ({ ...prev, reasoningEffort: eff.id as any }))}
                      className={`p-2 rounded-xl border text-xs font-mono text-center transition-all cursor-pointer ${
                        (aiConfig.reasoningEffort || 'medium') === eff.id
                          ? 'border-zinc-900 bg-zinc-900 text-white font-bold shadow-xs'
                          : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-white hover:border-zinc-300'
                      }`}
                    >
                      <div>{eff.label}</div>
                      <div className="text-[10px] opacity-75">{eff.desc}</div>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-zinc-500 font-sans">
                  Sets reasoning tokens and thinking depth for Gemini 3.5 / 2.5 and OpenAI o3-mini / o1.
                </p>
              </div>
            )}

            {/* Local AI zero-install card */}
            {aiConfig.provider === 'local' && (
              <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-xs space-y-2 font-sans">
                <div className="flex items-center gap-1.5 text-zinc-900 font-bold">
                  <ShieldCheck className="w-4 h-4 text-zinc-900" />
                  <span>Zero-Install & Mobile-Ready</span>
                </div>
                <p className="text-zinc-600 leading-relaxed text-xs">
                  Runs directly in your browser on both mobile and desktop. <strong>No download or model installation required.</strong> Instant analysis for repository architecture, files, and schemas.
                </p>
                <p className="text-zinc-500 text-[11px] pt-1 border-t border-zinc-200">
                  ☁️ <strong>Vercel Serverless:</strong> If your Vercel deployment has <code>GEMINI_API_KEY</code>, select <em>Vercel Serverless AI</em> to use cloud reasoning without entering a personal key on mobile.
                </p>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {isAiSaved ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span>Saved</span>
                  </>
                ) : (
                  <span>Save AI Settings</span>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: Model Context Protocol (MCP) */}
        {activeTab === 'mcp' && (
          <div className="p-6 space-y-6 max-h-[500px] overflow-y-auto">
            {/* Status & Architecture Header */}
            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-900 animate-pulse" />
                  <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider font-mono">
                    DomoScope MCP Server Active
                  </span>
                </div>
                <span className="text-[11px] font-mono font-bold text-zinc-900 bg-zinc-200/80 px-2 py-0.5 rounded-md border border-zinc-300">
                  Protocol 2024-11-05
                </span>
              </div>
              <p className="text-xs text-zinc-600 leading-relaxed font-sans">
                Connect external AI agents (Claude Desktop, Cursor, Antigravity, VS Code/Cline) directly to DomoScope. Agents can inspect repository architecture, generate reverse-engineering blueprints, extract database ERDs, audit security, and query codebases.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] font-mono">
                <div className="p-2 bg-white border border-zinc-200 rounded-lg">
                  <div className="font-bold text-zinc-900 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-zinc-800" />
                    <span>Online Transport</span>
                  </div>
                  <div className="text-zinc-500 text-[10px] mt-0.5">Vercel Serverless /api/mcp</div>
                </div>
                <div className="p-2 bg-white border border-zinc-200 rounded-lg">
                  <div className="font-bold text-zinc-900 flex items-center gap-1.5">
                    <Laptop className="w-3.5 h-3.5 text-zinc-800" />
                    <span>Local Transport</span>
                  </div>
                  <div className="text-zinc-500 text-[10px] mt-0.5">node bin/domoscope-mcp.js</div>
                </div>
              </div>
            </div>

            {/* Client Configuration Generator */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-zinc-900" />
                  Agent Connection Snippet
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">1-Click JSON Config</span>
              </div>

              {/* Client Selector Buttons */}
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                {[
                  { id: 'codex', label: 'Codex' },
                  { id: 'claude', label: 'Claude' },
                  { id: 'cursor', label: 'Cursor' },
                  { id: 'antigravity', label: 'Antigravity' },
                  { id: 'windsurf', label: 'Windsurf' },
                  { id: 'cline', label: 'Cline' },
                  { id: 'remote', label: 'Remote / URL' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMcpClientType(item.id as any)}
                    className={`py-1.5 px-2 rounded-lg border text-xs font-mono transition-all cursor-pointer text-center ${
                      mcpClientType === item.id
                        ? 'border-zinc-900 bg-zinc-900 text-white font-bold'
                        : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-white hover:border-zinc-300'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Config Code View with Copy Button */}
              <div className="relative group">
                <pre className="p-3.5 bg-zinc-950 text-zinc-100 rounded-xl text-[11px] font-mono overflow-x-auto border border-zinc-800 leading-relaxed max-h-36">
                  {(() => {
                    const origin =
                      typeof window !== 'undefined' && window.location.origin
                        ? window.location.origin
                        : 'https://domoscope.vercel.app';
                    const tokenNotice = token ? token : 'OPTIONAL_GITHUB_TOKEN';

                    if (mcpClientType === 'codex' || mcpClientType === 'cursor' || mcpClientType === 'windsurf' || mcpClientType === 'cline') {
                      return JSON.stringify(
                        {
                          mcpServers: {
                            domoscope: {
                              command: 'npx',
                              args: ['-y', 'domoscope', 'mcp'],
                              env: {
                                GITHUB_TOKEN: tokenNotice,
                              },
                            },
                          },
                        },
                        null,
                        2
                      );
                    }

                    if (mcpClientType === 'claude' || mcpClientType === 'antigravity') {
                      return JSON.stringify(
                        {
                          mcpServers: {
                            domoscope: {
                              command: 'node',
                              args: ['/path/to/domoscope/bin/domoscope-mcp.js'],
                              env: {
                                GITHUB_TOKEN: tokenNotice,
                              },
                            },
                          },
                        },
                        null,
                        2
                      );
                    }

                    return JSON.stringify(
                      {
                        mcpServers: {
                          domoscope: {
                            url: `${origin}/api/mcp`,
                            headers: {
                              Authorization: `Bearer ${tokenNotice}`,
                            },
                          },
                        },
                      },
                      null,
                      2
                    );
                  })()}
                </pre>
                <button
                  type="button"
                  onClick={() => {
                    const origin =
                      typeof window !== 'undefined' && window.location.origin
                        ? window.location.origin
                        : 'https://domoscope.vercel.app';
                    const tokenNotice = token ? token : '';
                    let text = '';
                    if (mcpClientType === 'remote') {
                      text = JSON.stringify(
                        {
                          mcpServers: {
                            domoscope: {
                              url: `${origin}/api/mcp`,
                              headers: tokenNotice ? { Authorization: `Bearer ${tokenNotice}` } : {},
                            },
                          },
                        },
                        null,
                        2
                      );
                    } else {
                      text = JSON.stringify(
                        {
                          mcpServers: {
                            domoscope: {
                              command: 'node',
                              args: ['/path/to/domoscope/bin/domoscope-mcp.js'],
                              env: tokenNotice ? { GITHUB_TOKEN: tokenNotice } : {},
                            },
                          },
                        },
                        null,
                        2
                      );
                    }
                    navigator.clipboard.writeText(text);
                    setIsMcpCopied(true);
                    setTimeout(() => setIsMcpCopied(false), 2000);
                  }}
                  className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 rounded-md text-[10px] font-mono flex items-center gap-1 transition-all cursor-pointer"
                >
                  {isMcpCopied ? (
                    <>
                      <CheckCheck className="w-3 h-3 text-white" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-zinc-300" />
                      <span>Copy Config</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="h-px bg-zinc-200" />

            {/* Interactive Live MCP Test Playground */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 text-zinc-900" />
                  Live MCP Tool Playground
                </span>
                <span className="text-[10px] font-mono text-zinc-500">Test Live Calls</span>
              </div>

              <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-3">
                {/* Repo input & Tool selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono font-bold text-zinc-700 block">
                      Target Repository
                    </label>
                    <input
                      type="text"
                      value={mcpTestRepo}
                      onChange={(e) => setMcpTestRepo(e.target.value)}
                      placeholder="owner/repo (e.g. Thes-IS-IT/Easylens)"
                      className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-zinc-300 rounded-lg text-zinc-900 focus:outline-none focus:border-zinc-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-mono font-bold text-zinc-700 block">
                      MCP Tool
                    </label>
                    <select
                      value={mcpTestTool}
                      onChange={(e) => setMcpTestTool(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-zinc-300 rounded-lg text-zinc-900 focus:outline-none focus:border-zinc-900"
                    >
                      {DOMOSCOPE_MCP_TOOLS.map((t) => (
                        <option key={t.name} value={t.name}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Conditional Parameter Inputs */}
                {mcpTestTool === 'read_repository_file' && (
                  <div className="space-y-1 animate-in fade-in">
                    <label className="text-[11px] font-mono font-bold text-zinc-700 block">
                      File Path to Inspect
                    </label>
                    <input
                      type="text"
                      value={mcpFilePath}
                      onChange={(e) => setMcpFilePath(e.target.value)}
                      placeholder="e.g. pubspec.yaml, package.json, or lib/main.dart"
                      className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-zinc-300 rounded-lg text-zinc-900 focus:outline-none focus:border-zinc-900"
                    />
                  </div>
                )}

                {mcpTestTool === 'get_database_erd' && (
                  <div className="space-y-1 animate-in fade-in">
                    <label className="text-[11px] font-mono font-bold text-zinc-700 block">
                      ERD Output Format
                    </label>
                    <div className="flex gap-2">
                      {(['json', 'sql', 'mermaid'] as const).map((fmt) => (
                        <button
                          key={fmt}
                          type="button"
                          onClick={() => setMcpErdFormat(fmt)}
                          className={`px-3 py-1 rounded-md text-xs font-mono uppercase transition-all cursor-pointer ${
                            mcpErdFormat === fmt
                              ? 'bg-zinc-900 text-white font-bold'
                              : 'bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-100'
                          }`}
                        >
                          {fmt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {mcpTestTool === 'query_domoscope' && (
                  <div className="space-y-1 animate-in fade-in">
                    <label className="text-[11px] font-mono font-bold text-zinc-700 block">
                      Question to Ask MCP Engine
                    </label>
                    <input
                      type="text"
                      value={mcpQueryText}
                      onChange={(e) => setMcpQueryText(e.target.value)}
                      placeholder="e.g. What are the main components and entry points?"
                      className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-zinc-300 rounded-lg text-zinc-900 focus:outline-none focus:border-zinc-900"
                    />
                  </div>
                )}

                {/* Execute Button */}
                <div className="pt-1 flex items-center justify-between">
                  <div className="text-[11px] text-zinc-500 font-mono">
                    Calls JSON-RPC 2.0 tool handler
                  </div>
                  <button
                    type="button"
                    disabled={isMcpTesting}
                    onClick={async () => {
                      setIsMcpTesting(true);
                      setMcpTestOutput(null);
                      setMcpTestStatus('idle');
                      const start = performance.now();

                      try {
                        const parts = mcpTestRepo.trim().split('/');
                        const owner = parts[0] || 'Thes-IS-IT';
                        const repo = parts[1] || 'Easylens';

                        const toolArgs: Record<string, any> = { owner, repo };
                        if (mcpTestTool === 'read_repository_file') {
                          toolArgs.path = mcpFilePath || 'package.json';
                        } else if (mcpTestTool === 'get_database_erd') {
                          toolArgs.format = mcpErdFormat;
                        } else if (mcpTestTool === 'query_domoscope') {
                          toolArgs.query = mcpQueryText;
                        }

                        const rpcRequest: JSONRPCRequest = {
                          jsonrpc: '2.0',
                          id: Date.now(),
                          method: 'tools/call',
                          params: {
                            name: mcpTestTool,
                            arguments: toolArgs,
                          },
                        };

                        let responseData: any;
                        try {
                          const res = await fetch('/api/mcp', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              ...(token ? { Authorization: `Bearer ${token}` } : {}),
                            },
                            body: JSON.stringify(rpcRequest),
                          });
                          if (res.ok) {
                            responseData = await res.json();
                          } else {
                            responseData = await handleMcpRequest(rpcRequest, { githubToken: token });
                          }
                        } catch {
                          responseData = await handleMcpRequest(rpcRequest, { githubToken: token });
                        }

                        const elapsed = Math.round(performance.now() - start);
                        setMcpDuration(elapsed);
                        setMcpTestStatus(responseData?.error ? 'error' : 'success');
                        setMcpTestOutput(JSON.stringify(responseData, null, 2));
                      } catch (err: any) {
                        const elapsed = Math.round(performance.now() - start);
                        setMcpDuration(elapsed);
                        setMcpTestStatus('error');
                        setMcpTestOutput(
                          JSON.stringify(
                            {
                              jsonrpc: '2.0',
                              id: null,
                              error: { code: -32603, message: err?.message || 'Execution error' },
                            },
                            null,
                            2
                          )
                        );
                      } finally {
                        setIsMcpTesting(false);
                      }
                    }}
                    className="px-4 py-2 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {isMcpTesting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 text-white animate-spin" />
                        <span>Analyzing & Executing...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 text-white fill-white" />
                        <span>Run MCP Tool Call</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Output Display */}
              {mcpTestOutput && (
                <div className="space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          mcpTestStatus === 'success' ? 'bg-zinc-900' : 'bg-zinc-500'
                        }`}
                      />
                      <span className="font-bold text-zinc-900">
                        {mcpTestStatus === 'success' ? '200 OK • JSON-RPC 2.0 Response' : 'Execution Returned Error'}
                      </span>
                    </div>
                    {mcpDuration !== null && (
                      <span className="text-zinc-500 font-bold bg-zinc-200/80 px-2 py-0.5 rounded border border-zinc-300">
                        {mcpDuration}ms
                      </span>
                    )}
                  </div>
                  <pre className="p-3.5 bg-zinc-950 text-zinc-100 rounded-xl text-[11px] font-mono overflow-x-auto border border-zinc-800 leading-relaxed max-h-56">
                    {mcpTestOutput}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 bg-zinc-50 border-t border-zinc-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-zinc-800 hover:text-black bg-white border border-zinc-300 rounded-xl hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
