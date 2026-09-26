import { RefreshCw, Maximize2, Minimize2, GitBranch, Menu } from 'lucide-react';
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
    <div className="w-full h-11 border-b border-zinc-200 bg-zinc-50/70 px-4 flex items-center justify-between text-xs select-none">
      {/* Left Breadcrumb & Mobile Menu */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={onToggleMobileMenu}
          className="p-1 md:hidden text-zinc-600 hover:text-zinc-900 rounded-md hover:bg-zinc-200"
          aria-label="Open navigation menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1.5 font-mono text-zinc-500 truncate">
          <span className="hidden sm:inline text-zinc-400">{owner}</span>
          <span className="hidden sm:inline text-zinc-300">/</span>
          <span className="font-medium text-zinc-800 truncate">{repo}</span>
          <span className="text-zinc-300">/</span>

          {/* Branch Dropdown */}
          <div className="relative inline-flex items-center gap-1 bg-white border border-zinc-200 px-2 py-0.5 rounded text-zinc-700 hover:border-zinc-300 transition-colors">
            <GitBranch className="w-3 h-3 text-zinc-400" />
            <select
              value={branch}
              onChange={(e) => onSelectBranch(e.target.value)}
              className="bg-transparent outline-none cursor-pointer text-zinc-900 pr-1 text-xs font-mono"
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
            className="px-2 py-1 bg-white hover:bg-zinc-100 border border-zinc-200 rounded text-[11px] font-mono text-zinc-700 transition-colors cursor-pointer"
            title="Toggle Layout Direction (Top-Bottom / Left-Right)"
          >
            {graphDirection === 'TB' ? 'Vertical Layout' : 'Horizontal Layout'}
          </button>
        )}

        {/* Refresh Repository Analysis */}
        <button
          onClick={onRefresh}
          className="p-1.5 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200 rounded-md transition-colors cursor-pointer"
          title="Refresh repository analysis"
          aria-label="Refresh repository analysis"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={onToggleFullscreen}
          className="p-1.5 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200 rounded-md transition-colors cursor-pointer"
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}
