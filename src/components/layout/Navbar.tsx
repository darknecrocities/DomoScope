import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Settings, Search, ExternalLink, Cpu, FileText, Terminal } from 'lucide-react';
import { GitHubIcon } from '../common/Icons';
import { RepoMetadata } from '../../types';
import { GitHubService } from '../../services/github';
import { GitHubAuthService, GitHubUserProfile } from '../../services/githubAuth';
import { GitHubAuthModal } from '../common/GitHubAuthModal';

interface NavbarProps {
  metadata?: RepoMetadata | null;
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  onOpenTechStack?: () => void;
  onOpenSpecGenerator?: () => void;
}

export function Navbar({
  metadata,
  onOpenSearch,
  onOpenSettings,
  onOpenTechStack,
  onOpenSpecGenerator,
}: NavbarProps) {
  const [userProfile, setUserProfile] = useState<GitHubUserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    GitHubAuthService.getUserProfile().then(setUserProfile);
  }, []);

  return (
    <header className="sticky top-0 z-30 w-full h-13 border-b border-zinc-200 bg-white flex items-center justify-between px-4 select-none shadow-xs font-sans">
      {/* Left Logo */}
      <div className="flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2.5 group">
          <img
            src="/domoscope.png"
            alt="DomoScope"
            className="w-8 h-8 rounded-xl object-contain bg-zinc-900 p-0.5 border border-zinc-300 group-hover:scale-105 transition-transform shadow-xs"
          />
          <span className="font-extrabold text-base tracking-tight text-zinc-900">DomoScope</span>
        </Link>
      </div>

      {/* Center Breadcrumb */}
      {metadata && (
        <div className="hidden sm:flex items-center gap-2 px-3.5 py-1 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-mono">
          <span className="text-zinc-500">{metadata.owner}</span>
          <span className="text-zinc-300">/</span>
          <span className="font-bold text-zinc-900">{metadata.repo}</span>
        </div>
      )}

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        {/* GitHub Sign In / User Profile Button (White & Black Glassmorphism) */}
        {userProfile ? (
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="flex items-center gap-2 px-2.5 py-1 bg-white/80 hover:bg-white border border-black/10 backdrop-blur-md rounded-xl transition-all cursor-pointer shadow-xs"
            title="Authenticated GitHub Account (5,000 req/hr)"
          >
            <img
              src={userProfile.avatarUrl}
              alt={userProfile.login}
              className="w-5 h-5 rounded-full border border-black/10 bg-white shadow-2xs"
            />
            <span className="text-xs font-mono font-bold text-zinc-900 hidden md:inline">
              @{userProfile.login}
            </span>
            <span className="text-[10px] font-mono font-bold text-white bg-black/90 backdrop-blur-md border border-white/20 px-2 py-0.5 rounded-lg shadow-xs">
              5k Limit
            </span>
          </button>
        ) : (
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/80 hover:bg-white border border-black/10 backdrop-blur-md rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer text-zinc-900"
            title="Sign in with GitHub to unlock 5,000 requests/hour limit"
          >
            <GitHubIcon className="w-3.5 h-3.5 text-zinc-900" />
            <span className="hidden sm:inline">Connect Token</span>
            <span className="text-[10px] font-mono bg-black/90 backdrop-blur-md border border-white/20 text-white px-2 py-0.5 rounded-lg font-bold shadow-xs">
              +5k Limit
            </span>
          </button>
        )}

        {onOpenTechStack && (
          <button
            onClick={onOpenTechStack}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-zinc-800 hover:text-black bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl transition-colors cursor-pointer font-mono font-semibold"
            title="Inspect Tech Stack & Frameworks"
          >
            <Cpu className="w-3.5 h-3.5 text-zinc-900" />
            <span className="hidden md:inline">Tech Stack</span>
          </button>
        )}

        {onOpenSpecGenerator && (
          <button
            onClick={onOpenSpecGenerator}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-zinc-800 hover:text-black bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl transition-colors cursor-pointer font-mono font-semibold"
            title="Generate & Download Reverse Engineering Spec (.md)"
          >
            <FileText className="w-3.5 h-3.5 text-zinc-900" />
            <span className="hidden md:inline">Generate .md</span>
          </button>
        )}

        <Link
          to="/setup"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-zinc-800 hover:text-black bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl transition-colors cursor-pointer font-mono font-semibold"
          title="CLI, MCP Protocol & Agent Setup Guide"
        >
          <Terminal className="w-3.5 h-3.5 text-zinc-900" />
          <span className="hidden md:inline">Setup</span>
        </Link>

        {/* Global Search Shortcut */}
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-zinc-600 hover:text-zinc-900 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl transition-colors cursor-pointer"
          title="Search (Cmd+K)"
        >
          <Search className="w-3.5 h-3.5 text-zinc-900" />
          <span className="hidden md:inline font-sans font-medium">Search...</span>
          <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[10px] font-mono text-zinc-500 bg-white border border-zinc-200 rounded">
            ⌘K
          </kbd>
        </button>

        {metadata && (
          <a
            href={metadata.htmlUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-zinc-700 hover:text-black hover:bg-zinc-100 rounded-xl border border-transparent hover:border-zinc-200 transition-colors font-bold"
            title="Open on GitHub"
          >
            <GitHubIcon className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">GitHub</span>
            <ExternalLink className="w-3 h-3 text-zinc-400" />
          </a>
        )}

        <button
          onClick={onOpenSettings}
          className="p-1.5 text-zinc-700 hover:text-black hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer"
          title="Settings"
          aria-label="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      <GitHubAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={() => {
          GitHubAuthService.getUserProfile().then(setUserProfile);
        }}
      />
    </header>
  );
}
