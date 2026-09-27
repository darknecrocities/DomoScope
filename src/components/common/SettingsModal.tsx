import React, { useState, useEffect } from 'react';
import { X, Key, Cpu, Trash2, Check, Sparkles, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';
import { StorageService } from '../../services/storage';
import { WebLLMService } from '../../services/webLLMService';
import { AIService, AI_MODELS } from '../../services/aiService';
import { GitHubService } from '../../services/github';
import { AIProviderConfig, AIModelOption } from '../../types';
import { CryptoService } from '../../services/cryptoService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClearCache?: () => void;
}

export function SettingsModal({ isOpen, onClose, onClearCache }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'ai' | 'general'>('general');

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
      <div className="w-full max-w-lg bg-white border border-zinc-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-zinc-50">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-zinc-900">Settings & API Quota Management</h2>
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
        <div className="flex border-b border-zinc-200 px-6 bg-zinc-50/70 text-xs font-mono">
          <button
            onClick={() => setActiveTab('general')}
            className={`py-2.5 px-3 border-b-2 font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
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
            className={`py-2.5 px-3 border-b-2 font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'ai'
                ? 'border-zinc-900 text-zinc-900 font-bold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-zinc-900" />
            <span>AI Models & API Keys</span>
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

            {aiConfig.provider === 'local' && (
              <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-zinc-900 font-bold">
                  <ShieldCheck className="w-4 h-4 text-zinc-900" />
                  <span>Local Grounded Model Active</span>
                </div>
                <p className="text-zinc-500 text-xs leading-relaxed">
                  Processes repository files directly inside your browser sandbox without network requests.
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
