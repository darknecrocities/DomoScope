import React, { useState, useEffect } from 'react';
import {
  X,
  Zap,
  LogOut,
  ShieldCheck,
  Key,
  ExternalLink,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Lock,
} from 'lucide-react';
import { GitHubIcon } from './Icons';
import { GitHubAuthService, GitHubUserProfile } from '../../services/githubAuth';
import { GitHubService } from '../../services/github';

import { StorageService } from '../../services/storage';
import { CryptoService } from '../../services/cryptoService';

interface GitHubAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess?: () => void;
}

export const GitHubAuthModal: React.FC<GitHubAuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
}) => {
  const [profile, setProfile] = useState<GitHubUserProfile | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      GitHubAuthService.getUserProfile().then((p) => {
        setProfile(p);
      });
      GitHubAuthService.getStoredToken().then((t) => {
        setTokenInput(t);
      });
    }
  }, [isOpen]);

  const handleSaveToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) {
      setError('Please enter a GitHub Personal Access Token.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const userProf = await GitHubAuthService.verifyAndStoreToken(tokenInput);
      setProfile(userProf);
      GitHubService.setAuthenticatedQuota(5000);
      await StorageService.clearAllRepoCaches();
      if (onAuthSuccess) onAuthSuccess();
    } catch (err: any) {
      setError(err?.message || 'Failed to authenticate token with GitHub.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await GitHubAuthService.logout();
    await StorageService.clearAllRepoCaches();
    setProfile(null);
    setTokenInput('');
    setError(null);
    if (onAuthSuccess) onAuthSuccess();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs font-sans select-none overflow-y-auto">
      <div className="w-full max-w-lg bg-white border border-zinc-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-zinc-50">
          <div className="flex items-center gap-2.5">
            <GitHubIcon className="w-5 h-5 text-zinc-900" />
            <h3 className="text-base font-bold text-zinc-900">GitHub Token & Permissions</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-900 rounded-lg hover:bg-zinc-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {profile ? (
            /* Signed In State - Monochrome Profile */
            <div className="space-y-4">
              <div className="p-4 bg-zinc-50 border border-zinc-300 rounded-2xl flex items-center gap-3">
                <img
                  src={profile.avatarUrl}
                  alt={profile.login}
                  className="w-12 h-12 rounded-full border border-zinc-400 bg-white"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-bold text-zinc-900 text-sm">{profile.name}</h4>
                    <span className="text-[10px] font-mono font-bold bg-zinc-900 text-white px-2 py-0.5 rounded-md">
                      Authenticated
                    </span>
                  </div>
                  <a
                    href={profile.htmlUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-mono text-zinc-700 hover:text-zinc-950 underline flex items-center gap-1 mt-0.5"
                  >
                    @{profile.login} <ExternalLink className="w-3 h-3 inline" />
                  </a>
                </div>
              </div>

              {/* Active 5,000 Quota Display */}
              <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-900">
                  <span className="flex items-center gap-1.5 text-zinc-900">
                    <Zap className="w-4 h-4 text-zinc-900" /> API Quota Active:
                  </span>
                  <span className="font-mono text-zinc-900 bg-zinc-200 px-2.5 py-0.5 rounded-md border border-zinc-300 font-extrabold">
                    5,000 req/hour
                  </span>
                </div>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Your GitHub account is connected. Rate limit is active for all public & private repositories.
                </p>

                {/* Encrypted Vault Token Display */}
                {tokenInput && (
                  <div className="flex items-center justify-between text-[11px] font-mono bg-zinc-100/80 border border-zinc-200 px-3 py-1.5 rounded-lg pt-1">
                    <span className="text-zinc-500 flex items-center gap-1.5">
                      <Lock className="w-3 h-3 text-zinc-700" /> Encrypted Vault:
                    </span>
                    <span className="text-zinc-900 font-semibold">{CryptoService.maskToken(tokenInput)}</span>
                  </div>
                )}
              </div>

              {/* Scope Minimization Advisory (If excess write/admin scopes detected) */}
              {profile.hasExcessiveScopes && (
                <div className="p-3.5 bg-zinc-50 border border-zinc-300 rounded-xl space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-zinc-900">
                    <ShieldCheck className="w-4 h-4 text-zinc-900" />
                    <span>Least-Privilege Security Notice</span>
                  </div>
                  <p className="text-zinc-600 leading-relaxed text-[11px]">
                    This token has elevated write or admin scopes ({profile.scopes?.join(', ')}). DomoScope operates strictly in read-only mode and never modifies repositories. For best security, we recommend using a Fine-Grained token with read-only access.
                  </p>
                </div>
              )}

              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-zinc-900" />
                  <span>Sign Out</span>
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Signed Out State - Monochrome Input & Permission Guide Card */
            <div className="space-y-5">
              <form onSubmit={handleSaveToken} className="space-y-4">
                <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-2">
                  <h4 className="text-sm font-bold text-zinc-900 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-zinc-900" /> Connect Token (+5,000 req/hr)
                  </h4>
                  <p className="text-xs text-zinc-600 leading-relaxed">
                    Paste your Personal Access Token (PAT) below to unlock <strong>5,000 requests/hour</strong> and view real-time commit data.
                  </p>
                </div>

                {error && (
                  <div className="p-3 bg-zinc-100 border border-zinc-300 rounded-xl flex items-start gap-2 text-xs text-zinc-900 font-sans font-semibold">
                    <AlertCircle className="w-4 h-4 text-zinc-900 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-zinc-700" />
                    <span>Personal Access Token (PAT)</span>
                  </label>
                  <input
                    type="password"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-300 rounded-xl font-mono text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white transition-all"
                  />
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <a
                    href="https://github.com/settings/tokens/new?scopes=repo&description=DomoScope"
                    target="_blank"
                    rel="noreferrer"
                    className="text-zinc-900 hover:text-black underline flex items-center gap-1 font-bold"
                  >
                    <span>🔑 Create token on GitHub</span>
                    <ExternalLink className="w-3 h-3 inline" />
                  </a>

                  <div className="flex items-center gap-1 text-zinc-600 font-mono font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5 text-zinc-900" />
                    <span>100% Local & Encrypted</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01] disabled:opacity-50"
                >
                  <GitHubIcon className="w-4 h-4" />
                  <span>{loading ? 'Authenticating...' : 'Connect Token (+5,000 req/hr)'}</span>
                </button>
              </form>

              {/* Collapsible Token Permission & Setup Guide Card */}
              <div className="border border-zinc-200 rounded-2xl bg-zinc-50 overflow-hidden text-xs">
                <button
                  onClick={() => setShowGuide((prev) => !prev)}
                  className="w-full px-4 py-3 flex items-center justify-between bg-zinc-100 hover:bg-zinc-200 transition-colors text-left font-bold text-zinc-900 cursor-pointer border-b border-zinc-200"
                >
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-zinc-900" />
                    <span>Token Permissions & Setup Guide</span>
                  </div>
                  {showGuide ? (
                    <ChevronUp className="w-4 h-4 text-zinc-600" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-zinc-600" />
                  )}
                </button>

                {showGuide && (
                  <div className="p-4 space-y-4 bg-white">
                    {/* Permission Table / Card Grid */}
                    <div className="space-y-2">
                      <h5 className="font-bold text-zinc-900 text-[11px] uppercase tracking-wider">
                        Required Scopes / Permissions to Check:
                      </h5>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-sans">
                        {/* Scope 1: Public Repositories */}
                        <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-zinc-900 text-xs">Public Repos</span>
                            <span className="text-[10px] bg-zinc-200 text-zinc-900 px-1.5 py-0.5 rounded font-mono font-bold border border-zinc-300">
                              No Scopes Needed
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-600 leading-snug">
                            No checkbox scopes required! Unlocks 5,000 req/hr for all public GitHub repositories.
                          </p>
                        </div>

                        {/* Scope 2: Private Repositories */}
                        <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-zinc-900 text-xs">repo</span>
                            <span className="text-[10px] bg-zinc-900 text-white px-1.5 py-0.5 rounded font-mono font-bold">
                              Private Repos
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-600 leading-snug">
                            Check <code>repo</code> scope <strong>ONLY</strong> if you want DomoScope to inspect your private repos.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Step-by-Step Generation Steps */}
                    <div className="space-y-2 pt-1">
                      <h5 className="font-bold text-zinc-900 text-[11px] uppercase tracking-wider">
                        How to Generate Token on GitHub:
                      </h5>
                      <ol className="space-y-1.5 text-[11px] text-zinc-700 list-decimal list-inside font-sans">
                        <li>
                          Open <a href="https://github.com/settings/tokens/new?scopes=repo&description=DomoScope" target="_blank" rel="noreferrer" className="text-zinc-950 font-bold underline">GitHub Token Generator</a>.
                        </li>
                        <li>Give your token a description e.g. <code className="bg-zinc-100 border border-zinc-300 px-1 rounded text-zinc-900 font-mono font-bold">DomoScope</code>.</li>
                        <li>Select expiration (e.g. 90 days or No Expiration).</li>
                        <li>Check <code className="bg-zinc-100 border border-zinc-300 px-1 rounded text-zinc-900 font-mono font-bold">repo</code> scope for private repos (or leave blank for public repos).</li>
                        <li>Click <strong>Generate Token</strong> and copy the string starting with <code className="bg-zinc-100 border border-zinc-300 px-1 rounded text-zinc-900 font-mono font-bold">ghp_...</code>.</li>
                      </ol>
                    </div>

                    {/* Security Assurance */}
                    <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center gap-2 text-[11px] text-zinc-700 font-semibold">
                      <Lock className="w-3.5 h-3.5 text-zinc-900 shrink-0" />
                      <span>Tokens are stored exclusively in your local browser's IndexedDB and never shared.</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
