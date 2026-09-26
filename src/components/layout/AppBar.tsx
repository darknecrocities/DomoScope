import { useState, useEffect } from 'react';
import { RefreshCw, Maximize2, Minimize2, GitBranch, Menu, ArrowUpDown, Star, Zap, UserCheck } from 'lucide-react';
import { WorkspaceTab } from './Sidebar';
import { RepoMetadata } from '../../types';
import { GitHubService } from '../../services/github';
import { GitHubAuthService, GitHubUserProfile } from '../../services/githubAuth';
import { GitHubAuthModal } from '../common/GitHubAuthModal';

interface AppBarProps {
  owner: string;
  repo: string;
  branch: string;
  activeTab: WorkspaceTab;
  branches: { name: string }[];
  metadata?: RepoMetadata | null;
  isFallbackMode?: boolean;
  onSelectBranch: (branch: string) => void;
  onRefresh: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onToggleMobileMenu: () => void;
  graphDirection?: 'TB' | 'LR';
  onToggleGraphDirection?: () => void;
}

export function AppBar({
  owner,
  repo,
  branch,
  activeTab,
  branches,
  metadata,
  isFallbackMode,
  onSelectBranch,
  onRefresh,
  isFullscreen,
  onToggleFullscreen,
  onToggleMobileMenu,
  graphDirection,
  onToggleGraphDirection,
}: AppBarProps) {
  const [rateLimit, setRateLimit] = useState(GitHubService.getRateLimit());
  const [userProfile, setUserProfile] = useState<GitHubUserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    setRateLimit(GitHubService.getRateLimit());
    GitHubAuthService.getUserProfile().then(setUserProfile);

    // Refresh rate limit state periodically
    const interval = setInterval(() => {
      setRateLimit(GitHubService.getRateLimit());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const formatStars = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return count.toString();
  };

  const percentageRemaining = Math.max(0, Math.min(100, Math.round((rateLimit.remaining / rateLimit.limit) * 100)));

  return (
    <div className="sticky top-13 z-20 w-full h-12 border-b border-zinc-200 bg-white/95 backdrop-blur-md px-4 flex items-center justify-between text-xs font-sans select-none">
      {/* Left Breadcrumb & Mobile Menu */}
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          onClick={onToggleMobileMenu}
          className="p-1.5 md:hidden text-zinc-700 hover:text-zinc-950 rounded-xl hover:bg-zinc-200 transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5 stroke-[2]" />
        </button>

        <div className="flex items-center gap-2 font-mono text-zinc-500 truncate">
          <span className="hidden sm:inline text-zinc-500">{owner}</span>
          <span className="hidden sm:inline text-zinc-300">/</span>
          <span className="font-bold text-zinc-900 truncate">{repo}</span>

          {/* GitHub Stars Badge (Monochrome) */}
          {metadata && typeof metadata.stars === 'number' && (
            <div
              className="hidden md:inline-flex items-center gap-1 bg-zinc-100 border border-zinc-300 px-2 py-0.5 rounded-lg text-zinc-900 font-mono text-[11px]"
              title={`${metadata.stars.toLocaleString()} GitHub Stars`}
            >
              <Star className="w-3 h-3 text-zinc-900 fill-zinc-900 stroke-[2]" />
              <span className="font-bold">{formatStars(metadata.stars)}</span>
            </div>
          )}

          <span className="text-zinc-300">/</span>

          {/* Branch Dropdown */}
          <div className="relative inline-flex items-center gap-1.5 bg-white border border-zinc-300 px-2.5 py-1 rounded-xl text-zinc-900 hover:border-zinc-400 transition-colors shadow-xs">
            <GitBranch className="w-4 h-4 text-zinc-900 shrink-0 stroke-[2]" />
            <select
              value={branch}
              onChange={(e) => onSelectBranch(e.target.value)}
              className="bg-transparent outline-none cursor-pointer text-zinc-900 pr-1 text-xs font-mono font-bold"
            >
              {branches.length > 0 ? (
                branches.map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.name}
                  </option>
                ))
              ) : (
                <option value={branch}>{branch || 'main'}</option>
              )}
            </select>
          </div>

          <span className="text-zinc-300">/</span>
          <span className="font-bold text-zinc-900 capitalize font-sans">{activeTab}</span>
        </div>
      </div>

      {/* Right Controls: Monochrome Rate Limit Bar & Login Button */}
      <div className="flex items-center gap-2 shrink-0">
        {/* High-Availability Direct Stream Badge (Monochrome) */}
        {isFallbackMode && (
          <div
            onClick={() => setIsAuthModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1 bg-zinc-900 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer hover:bg-black"
            title="Operating via High-Availability Direct Stream (GitHub REST API Rate Limit Bypassed)"
          >
            <Zap className="w-3.5 h-3.5 fill-white text-white" />
            <span className="hidden sm:inline">HA Direct Stream (Limit Bypassed)</span>
            <span className="sm:hidden">Limit Bypassed</span>
          </div>
        )}

        {/* Workspace GitHub API Quota Progress Bar Widget (Monochrome) */}
        <div
          onClick={() => setIsAuthModalOpen(true)}
          className="hidden lg:flex items-center gap-2.5 px-3 py-1 bg-white border border-zinc-300 rounded-xl shadow-xs cursor-pointer hover:border-zinc-400 transition-all"
          title="Click to manage GitHub API Rate Limit & Login"
        >
          <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-zinc-900">
            <Zap className="w-3.5 h-3.5 text-zinc-900" />
            <span>Quota:</span>
            <span className="text-zinc-950 font-extrabold">{rateLimit.remaining}</span>
            <span className="text-zinc-300">/</span>
            <span className="text-zinc-600">{rateLimit.limit}</span>
          </div>

          {/* Visual Progress Bar Track (Monochrome) */}
          <div className="w-20 h-2 bg-zinc-100 rounded-full overflow-hidden border border-zinc-300 relative">
            <div
              className="h-full bg-zinc-900 transition-all duration-500"
              style={{ width: `${percentageRemaining}%` }}
            />
          </div>
        </div>

        {/* Login Button / Profile Badge (Monochrome) */}
        {userProfile ? (
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 rounded-xl font-mono text-xs font-bold text-zinc-900 transition-all cursor-pointer"
            title="Logged In (5,000 req/hr Limit)"
          >
            <UserCheck className="w-3.5 h-3.5 text-zinc-900" />
            <span className="hidden sm:inline">@{userProfile.login}</span>
            <span className="text-[10px] bg-zinc-900 text-white px-1.5 py-0.2 rounded font-mono font-bold">
              5k Limit
            </span>
          </button>
        ) : (
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
            title="Login to increase GitHub API limit to 5,000 req/hr"
          >
            <Zap className="w-3.5 h-3.5 fill-white text-white" />
            <span>Connect Token</span>
            <span className="text-[10px] bg-zinc-700 text-white px-1.5 py-0.2 rounded font-mono font-bold">
              +5k
            </span>
          </button>
        )}

        {/* Graph Direction toggle when on architecture tab */}
        {activeTab === 'architecture' && onToggleGraphDirection && (
          <button
            onClick={onToggleGraphDirection}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-zinc-100 border border-zinc-300 rounded-xl text-xs font-mono text-zinc-900 transition-colors cursor-pointer shadow-xs font-semibold"
            title="Toggle Layout Direction (Top-Bottom / Left-Right)"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-zinc-900 stroke-[2]" />
            <span className="hidden md:inline">
              {graphDirection === 'TB' ? 'Vertical Layout' : 'Horizontal Layout'}
            </span>
          </button>
        )}

        {/* Refresh Repository Analysis */}
        <button
          onClick={onRefresh}
          className="p-1.5 text-zinc-700 hover:text-zinc-950 hover:bg-zinc-200 rounded-xl transition-colors cursor-pointer"
          title="Refresh repository analysis"
          aria-label="Refresh repository analysis"
        >
          <RefreshCw className="w-4 h-4 stroke-[2]" />
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={onToggleFullscreen}
          className="p-1.5 text-zinc-700 hover:text-zinc-950 hover:bg-zinc-200 rounded-xl transition-colors cursor-pointer"
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? (
            <Minimize2 className="w-4 h-4 stroke-[2]" />
          ) : (
            <Maximize2 className="w-4 h-4 stroke-[2]" />
          )}
        </button>
      </div>

      <GitHubAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={() => {
          setRateLimit(GitHubService.getRateLimit());
          GitHubAuthService.getUserProfile().then(setUserProfile);
        }}
      />
    </div>
  );
}
