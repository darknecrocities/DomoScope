import React, { useState, useEffect, useRef } from 'react';
import { X, GitFork, ArrowRight, Clipboard, Sparkles, FolderGit2 } from 'lucide-react';
import { parseGitHubUrl } from '../../services/github';

interface AddRepoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddRepo: (owner: string, repo: string) => void;
  onOpenLocalFolder?: () => void;
  onConnectLocalServer?: () => void;
  existingRepos?: { owner: string; repo: string }[];
}

const POPULAR_SUGGESTIONS = [
  { owner: 'facebook', repo: 'react', label: 'React UI Library', category: 'Frontend' },
  { owner: 'expressjs', repo: 'express', label: 'Express.js Framework', category: 'Backend' },
  { owner: 'fastapi', repo: 'fastapi', label: 'FastAPI Python Service', category: 'Python API' },
  { owner: 'vercel', repo: 'next.js', label: 'Next.js App Framework', category: 'Full Stack' },
  { owner: 'shadcn-ui', repo: 'ui', label: 'Shadcn UI Components', category: 'Design System' },
  { owner: 'tailwindlabs', repo: 'tailwindcss', label: 'Tailwind CSS Engine', category: 'Styling' },
];

export function AddRepoModal({
  isOpen,
  onClose,
  onAddRepo,
  onOpenLocalFolder,
  onConnectLocalServer,
  existingRepos = [],
}: AddRepoModalProps) {
  const [mode, setMode] = useState<'remote' | 'local'>('remote');
  const [inputUrl, setInputUrl] = useState('');
  const [localPort, setLocalPort] = useState('4004');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setInputUrl('');
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const trimmed = inputUrl.trim();
    if (!trimmed) {
      setError('Please enter a repository URL or owner/repo.');
      return;
    }

    const parsed = parseGitHubUrl(trimmed);
    if (!parsed) {
      setError('Invalid format. Use "owner/repo" or "https://github.com/owner/repo".');
      return;
    }

    onAddRepo(parsed.owner, parsed.repo);
    onClose();
  };

  const handleConnect = async () => {
    setError(null);
    setIsConnecting(true);
    try {
      const res = await fetch(`http://localhost:${localPort}/api/local/status`);
      if (res.ok) {
        const data = await res.json();
        onAddRepo('local', data.projectName || 'domoscope');
        onClose();
      } else {
        setError(`Local studio at port ${localPort} returned HTTP ${res.status}`);
      }
    } catch {
      setError(`Cannot connect to http://localhost:${localPort}. Make sure "npx domoscope serve" is running.`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        const trimmed = text.trim();
        const parsed = parseGitHubUrl(trimmed);
        if (parsed) {
          setInputUrl(`https://github.com/${parsed.owner}/${parsed.repo}`);
        } else {
          setInputUrl(trimmed);
        }
        setError(null);
      }
    } catch {
      // Clipboard access denied or unsupported
    }
  };

  const handleSelectSuggestion = (owner: string, repo: string) => {
    onAddRepo(owner, repo);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
      <div
        className="w-full max-w-lg bg-white border border-zinc-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-zinc-900 text-white flex items-center justify-center shadow-xs">
              <FolderGit2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900">Add Project to Workspace</h2>
              <p className="text-xs text-zinc-500 font-mono">Open remote GitHub repos or local codebase projects</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="px-5 pt-3 flex gap-2 border-b border-zinc-100 bg-zinc-50/30">
          <button
            type="button"
            onClick={() => setMode('remote')}
            className={`pb-2.5 text-xs font-semibold px-2 border-b-2 transition-all cursor-pointer ${
              mode === 'remote'
                ? 'border-zinc-900 text-zinc-950 font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-700'
            }`}
          >
            GitHub Repository
          </button>
          <button
            type="button"
            onClick={() => setMode('local')}
            className={`pb-2.5 text-xs font-semibold px-2 border-b-2 transition-all cursor-pointer ${
              mode === 'local'
                ? 'border-zinc-900 text-zinc-950 font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-700'
            }`}
          >
            Local Project
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {mode === 'remote' ? (
            <>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                    GitHub Repository Link or <code className="bg-zinc-100 px-1 py-0.5 rounded text-[11px]">owner/repo</code>
                  </label>
                  <div className="relative flex items-center">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputUrl}
                      onChange={(e) => {
                        setInputUrl(e.target.value);
                        if (error) setError(null);
                      }}
                      onPaste={(e) => {
                        e.preventDefault();
                        const pasted = e.clipboardData.getData('text');
                        if (pasted) {
                          const trimmed = pasted.trim();
                          const parsed = parseGitHubUrl(trimmed);
                          if (parsed) {
                            setInputUrl(`https://github.com/${parsed.owner}/${parsed.repo}`);
                          } else {
                            setInputUrl(trimmed);
                          }
                          if (error) setError(null);
                        }
                      }}
                      placeholder="https://github.com/facebook/react or expressjs/express"
                      className={`w-full px-3.5 py-2.5 pr-20 bg-zinc-50/70 border rounded-xl text-xs font-mono text-zinc-900 placeholder:text-zinc-400 outline-none transition-all ${
                        error
                          ? 'border-zinc-900 ring-1 ring-zinc-900'
                          : 'border-zinc-300 focus:border-zinc-900 focus:bg-white focus:ring-1 focus:ring-zinc-900'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={handlePaste}
                      className="absolute right-2 px-2 py-1 text-[11px] font-mono font-medium text-zinc-600 hover:text-zinc-950 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                      title="Paste from clipboard"
                    >
                      <Clipboard className="w-3 h-3" />
                      <span>Paste</span>
                    </button>
                  </div>

                  {error && (
                    <p className="mt-1.5 text-xs font-medium text-zinc-900 flex items-center gap-1">
                      <span>⚠</span> {error}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3.5 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-zinc-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>Open in Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>

              {/* Quick suggestions */}
              <div className="pt-2 border-t border-zinc-100">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <Sparkles className="w-3.5 h-3.5 text-zinc-700" />
                  <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-500">
                    Popular Repositories to Explore
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {POPULAR_SUGGESTIONS.map((item) => {
                    const isAlreadyOpen = existingRepos.some(
                      (r) =>
                        r.owner.toLowerCase() === item.owner.toLowerCase() &&
                        r.repo.toLowerCase() === item.repo.toLowerCase()
                    );

                    return (
                      <button
                        key={`${item.owner}/${item.repo}`}
                        type="button"
                        onClick={() => handleSelectSuggestion(item.owner, item.repo)}
                        className="flex items-center justify-between p-2.5 text-left bg-zinc-50/80 hover:bg-zinc-100 border border-zinc-200 hover:border-zinc-300 rounded-xl transition-all cursor-pointer group"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-1.5">
                            <GitFork className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-900 shrink-0" />
                            <span className="text-xs font-mono font-bold text-zinc-900 truncate">
                              {item.owner}/{item.repo}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-500 truncate mt-0.5">{item.label}</p>
                        </div>
                        {isAlreadyOpen ? (
                          <span className="shrink-0 text-[10px] font-mono text-zinc-400 bg-zinc-200/60 px-1.5 py-0.5 rounded">
                            Open
                          </span>
                        ) : (
                          <span className="shrink-0 text-[10px] font-mono text-zinc-600 bg-white border border-zinc-200 px-1.5 py-0.5 rounded shadow-2xs group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                            Add
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4 py-1">
              {/* Browser File System Access Option */}
              <div className="p-4 border border-zinc-200 bg-zinc-50/50 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-zinc-900">Direct In-Browser Folder Analysis</h3>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      Open and analyze any local project folder directly using the Web File System Access API.
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={async () => {
                      if (onOpenLocalFolder) {
                        onOpenLocalFolder();
                        onClose();
                      }
                    }}
                    className="w-full py-2.5 bg-zinc-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <span>Choose Local Folder...</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Local CLI Studio Option */}
              <div className="p-4 border border-zinc-200 bg-zinc-50/50 rounded-xl space-y-3">
                <div>
                  <h3 className="text-xs font-bold text-zinc-900">Connect to Local CLI Studio</h3>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Connect to a live background watcher started with <code className="bg-zinc-200/60 px-1 py-0.5 rounded font-mono text-[10px] text-zinc-800">npx domoscope serve</code>.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2.5 text-xs font-mono text-zinc-400">http://localhost:</span>
                    <input
                      type="text"
                      value={localPort}
                      onChange={(e) => setLocalPort(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="4004"
                      className="w-full pl-31 pr-3 py-2 bg-white border border-zinc-300 focus:border-zinc-900 rounded-xl text-xs font-mono text-zinc-900 outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={isConnecting}
                    onClick={handleConnect}
                    className="px-4 py-2 bg-zinc-900 hover:bg-black disabled:bg-zinc-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0 shadow-xs"
                  >
                    {isConnecting ? 'Connecting...' : 'Connect'}
                  </button>
                </div>

                {error && (
                  <p className="text-xs font-medium text-zinc-900 flex items-center gap-1">
                    <span>⚠</span> {error}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
