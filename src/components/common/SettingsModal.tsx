import React, { useState, useEffect } from 'react';
import { X, Key, Cpu, Trash2, Check, Sparkles, ShieldCheck } from 'lucide-react';
import { StorageService } from '../../services/storage';
import { WebLLMService } from '../../services/webLLMService';
import { AIService, AI_MODELS } from '../../services/aiService';
import { AIProvider, AIProviderConfig } from '../../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClearCache?: () => void;
}

export function SettingsModal({ isOpen, onClose, onClearCache }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'ai' | 'general'>('ai');

  // GitHub token state
  const [token, setToken] = useState('');
  const [isTokenSaved, setIsTokenSaved] = useState(false);
  const [hasWebGPU, setHasWebGPU] = useState(false);

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
      setIsTokenSaved(false);
      setIsAiSaved(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSaveToken = async (e: React.FormEvent) => {
    e.preventDefault();
    await StorageService.setSetting('github_token', token.trim());
    setIsTokenSaved(true);
    setTimeout(() => setIsTokenSaved(false), 2000);
  };

  const handleSaveAiConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    await AIService.saveConfig(aiConfig);
    setIsAiSaved(true);
    setTimeout(() => setIsAiSaved(false), 2000);
  };

  const handleClearCache = async () => {
    if (confirm('Clear all local repository cache? You will need to reload open repositories.')) {
      indexedDB.deleteDatabase('domoscope_cache_v1');
      if (onClearCache) onClearCache();
      onClose();
    }
  };

  const currentProviderModels = AI_MODELS.filter((m) => m.provider === aiConfig.provider);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white border border-zinc-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-zinc-900">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-zinc-200 px-6 bg-zinc-50/70 text-xs font-mono">
          <button
            onClick={() => setActiveTab('ai')}
            className={`py-2.5 px-3 border-b-2 font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'ai'
                ? 'border-zinc-900 text-zinc-900 font-semibold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Provider & Models</span>
          </button>

          <button
            onClick={() => setActiveTab('general')}
            className={`py-2.5 px-3 border-b-2 font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'general'
                ? 'border-zinc-900 text-zinc-900 font-semibold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>GitHub & Storage</span>
          </button>
        </div>

        {/* Tab 1: AI Provider & Models */}
        {activeTab === 'ai' && (
          <form onSubmit={handleSaveAiConfig} className="p-6 space-y-5 max-h-[460px] overflow-y-auto">
            {/* Provider Radios */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-zinc-900 uppercase font-mono">
                AI Provider
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(
                  [
                    { id: 'local', label: 'Local (Free)' },
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
                      className={`py-2 px-2.5 rounded-lg border text-xs font-mono transition-all text-center cursor-pointer ${
                        isSelected
                          ? 'border-zinc-900 bg-zinc-900 text-white font-semibold shadow-2xs'
                          : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300 hover:bg-white'
                      }`}
                    >
                      {prov.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Model Selector Dropdown */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-900 uppercase font-mono">
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
                className="w-full px-3 py-2 text-xs font-mono bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 outline-none focus:border-zinc-800 focus:bg-white transition-colors"
              >
                {currentProviderModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              {/* Selected Model Description */}
              {AI_MODELS.find((m) => m.id === aiConfig.selectedModel) && (
                <p className="text-[11px] text-zinc-500 leading-relaxed pt-0.5">
                  {AI_MODELS.find((m) => m.id === aiConfig.selectedModel)?.description}
                </p>
              )}
            </div>

            {/* API Key Input based on provider */}
            {aiConfig.provider === 'anthropic' && (
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-semibold text-zinc-900 uppercase font-mono">
                  Anthropic API Key
                </label>
                <input
                  type="password"
                  value={aiConfig.anthropicKey || ''}
                  onChange={(e) =>
                    setAiConfig((prev) => ({ ...prev, anthropicKey: e.target.value }))
                  }
                  placeholder="sk-ant-api03-..."
                  className="w-full px-3 py-2 text-xs font-mono bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 outline-none focus:border-zinc-800 focus:bg-white transition-colors"
                />
                <p className="text-[11px] text-zinc-500">
                  Stored securely in your local browser storage. Sent only directly to Anthropic's API.
                </p>
              </div>
            )}

            {aiConfig.provider === 'gemini' && (
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-semibold text-zinc-900 uppercase font-mono">
                  Google Gemini API Key
                </label>
                <input
                  type="password"
                  value={aiConfig.geminiKey || ''}
                  onChange={(e) =>
                    setAiConfig((prev) => ({ ...prev, geminiKey: e.target.value }))
                  }
                  placeholder="AIzaSy..."
                  className="w-full px-3 py-2 text-xs font-mono bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 outline-none focus:border-zinc-800 focus:bg-white transition-colors"
                />
                <p className="text-[11px] text-zinc-500">
                  Stored securely in your local browser storage. Sent only directly to Google AI Studio.
                </p>
              </div>
            )}

            {aiConfig.provider === 'openai' && (
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-semibold text-zinc-900 uppercase font-mono">
                  OpenAI API Key
                </label>
                <input
                  type="password"
                  value={aiConfig.openaiKey || ''}
                  onChange={(e) =>
                    setAiConfig((prev) => ({ ...prev, openaiKey: e.target.value }))
                  }
                  placeholder="sk-proj-..."
                  className="w-full px-3 py-2 text-xs font-mono bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 outline-none focus:border-zinc-800 focus:bg-white transition-colors"
                />
                <p className="text-[11px] text-zinc-500">
                  Stored securely in your local browser storage. Sent only directly to OpenAI API.
                </p>
              </div>
            )}

            {aiConfig.provider === 'local' && (
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-zinc-900 font-semibold font-mono">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>No API Key Required</span>
                </div>
                <p className="text-zinc-500 text-[11px] leading-relaxed">
                  Local assistant processes code directly on your machine without external network requests or token fees.
                </p>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {isAiSaved ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Saved</span>
                  </>
                ) : (
                  <span>Save AI Configuration</span>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: GitHub & Storage */}
        {activeTab === 'general' && (
          <div className="p-6 space-y-6 max-h-[460px] overflow-y-auto">
            {/* GitHub Token */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-900">
                <Key className="w-4 h-4 text-zinc-500" />
                <span>GitHub Personal Access Token</span>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Optional. Public unauthenticated requests are limited to 60 requests/hour by GitHub. Adding a token raises your limit to 5,000 requests/hour.
              </p>
              <form onSubmit={handleSaveToken} className="flex gap-2 pt-1">
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="flex-1 px-3 py-1.5 text-xs font-mono bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-800 focus:bg-white transition-colors"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  {isTokenSaved ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Saved</span>
                    </>
                  ) : (
                    <span>Save</span>
                  )}
                </button>
              </form>
            </div>

            <div className="h-px bg-zinc-100" />

            {/* Local Assistant Engine Status */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-900">
                <Cpu className="w-4 h-4 text-zinc-500" />
                <span>Local WebGPU Engine</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-zinc-50 border border-zinc-200 rounded-lg text-xs">
                <span className="text-zinc-600">Hardware WebGPU Acceleration</span>
                <span className="font-mono text-zinc-900 font-medium">
                  {hasWebGPU ? 'Available' : 'Unavailable (Deterministic mode)'}
                </span>
              </div>
            </div>

            <div className="h-px bg-zinc-100" />

            {/* Local Storage & Cache */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-900">
                <Trash2 className="w-4 h-4 text-zinc-500" />
                <span>Storage & Cache</span>
              </div>
              <p className="text-xs text-zinc-500">
                All repository trees, parsed graphs, schemas, and security scans are stored locally in your browser’s IndexedDB.
              </p>
              <button
                onClick={handleClearCache}
                className="px-3 py-2 text-xs font-medium text-zinc-700 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors w-full flex items-center justify-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Local Cache</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 bg-zinc-50 border-t border-zinc-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-zinc-700 hover:text-zinc-900 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
