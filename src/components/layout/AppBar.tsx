import { RefreshCw, Maximize2, Minimize2, GitBranch, Menu, ArrowUpDown } from 'lucide-react';
import { WorkspaceTab } from './Sidebar';

interface AppBarProps {
  owner: string;
  repo: string;
  branch: string;
  activeTab: WorkspaceTab;
  branches: { name: string }[];
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
  onSelectBranch,
  onRefresh,
  isFullscreen,
  onToggleFullscreen,
  onToggleMobileMenu,
  graphDirection,
  onToggleGraphDirection,
}: AppBarProps) {
  return (
    <div className="w-full h-12 border-b border-zinc-200 bg-zinc-50/80 px-4 flex items-center justify-between text-xs select-none">
      {/* Left Breadcrumb & Mobile Menu */}
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          onClick={onToggleMobileMenu}
          className="p-1.5 md:hidden text-zinc-700 hover:text-zinc-950 rounded-lg hover:bg-zinc-200 transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5 stroke-[2]" />
        </button>

        <div className="flex items-center gap-2 font-mono text-zinc-500 truncate">
          <span className="hidden sm:inline text-zinc-400">{owner}</span>
          <span className="hidden sm:inline text-zinc-300">/</span>
          <span className="font-semibold text-zinc-900 truncate">{repo}</span>
          <span className="text-zinc-300">/</span>

          {/* Branch Dropdown */}
          <div className="relative inline-flex items-center gap-1.5 bg-white border border-zinc-200 px-2.5 py-1 rounded-lg text-zinc-700 hover:border-zinc-300 transition-colors shadow-2xs">
            <GitBranch className="w-4 h-4 text-zinc-600 shrink-0 stroke-[2]" />
            <select
              value={branch}
              onChange={(e) => onSelectBranch(e.target.value)}
              className="bg-transparent outline-none cursor-pointer text-zinc-900 pr-1 text-xs font-mono font-medium"
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
          <span className="font-semibold text-zinc-900 capitalize font-sans">{activeTab}</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Graph Direction toggle when on architecture tab */}
        {activeTab === 'architecture' && onToggleGraphDirection && (
          <button
            onClick={onToggleGraphDirection}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-lg text-xs font-mono text-zinc-700 transition-colors cursor-pointer shadow-2xs"
            title="Toggle Layout Direction (Top-Bottom / Left-Right)"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500 stroke-[2]" />
            <span className="hidden md:inline">
              {graphDirection === 'TB' ? 'Vertical Layout' : 'Horizontal Layout'}
            </span>
          </button>
        )}

        {/* Refresh Repository Analysis */}
        <button
          onClick={onRefresh}
          className="p-2 text-zinc-700 hover:text-zinc-950 hover:bg-zinc-200/80 rounded-lg transition-colors cursor-pointer"
          title="Refresh repository analysis"
          aria-label="Refresh repository analysis"
        >
          <RefreshCw className="w-4.5 h-4.5 stroke-[2]" />
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={onToggleFullscreen}
          className="p-2 text-zinc-700 hover:text-zinc-950 hover:bg-zinc-200/80 rounded-lg transition-colors cursor-pointer"
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? (
            <Minimize2 className="w-4.5 h-4.5 stroke-[2]" />
          ) : (
            <Maximize2 className="w-4.5 h-4.5 stroke-[2]" />
          )}
        </button>
      </div>
    </div>
  );
}
