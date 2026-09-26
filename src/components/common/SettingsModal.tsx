import React, { useState, useEffect } from 'react';
import { X, Key, Cpu, Trash2, Check } from 'lucide-react';
import { StorageService } from '../../services/storage';
import { WebLLMService } from '../../services/webLLMService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClearCache?: () => void;
}

export function SettingsModal({ isOpen, onClose, onClearCache }: SettingsModalProps) {
  const [token, setToken] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [hasWebGPU, setHasWebGPU] = useState(false);

  useEffect(() => {
    if (isOpen) {
      StorageService.getSetting<string>('github_token', '').then(setToken);
      setHasWebGPU(WebLLMService.isWebGPUSupported());
      setIsSaved(false);
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
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleClearCache = async () => {
    if (confirm('Clear all local repository cache? You will need to reload open repositories.')) {
      indexedDB.deleteDatabase('domoscope_cache_v1');
      if (onClearCache) onClearCache();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white border border-zinc-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-zinc-900">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
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
                className="px-3 py-1.5 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
              >
                {isSaved ? (
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
              <span>Local Assistant Engine</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-zinc-50 border border-zinc-200 rounded-lg text-xs">
              <span className="text-zinc-600">Hardware WebGPU Acceleration</span>
              <span className="font-mono text-zinc-900 font-medium">
                {hasWebGPU ? 'Available' : 'Unavailable (Deterministic mode)'}
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              DomoScope runs entirely on your device without sending private repository code to third-party APIs.
            </p>
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
              className="px-3 py-2 text-xs font-medium text-zinc-700 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors w-full flex items-center justify-center gap-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Local Cache</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-zinc-50 border-t border-zinc-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-zinc-700 hover:text-zinc-900 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
