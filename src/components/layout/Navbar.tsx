import { Link } from 'react-router-dom';
import { Settings, Search, ExternalLink } from 'lucide-react';
import { GitHubIcon } from '../common/Icons';
import { RepoMetadata } from '../../types';

interface NavbarProps {
  metadata?: RepoMetadata | null;
  onOpenSearch: () => void;
  onOpenSettings: () => void;
}

export function Navbar({ metadata, onOpenSearch, onOpenSettings }: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 w-full h-13 border-b border-zinc-200 bg-white flex items-center justify-between px-4 select-none">
      {/* Left Logo */}
      <div className="flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-6 h-6 rounded-md bg-zinc-900 flex items-center justify-center text-white font-bold text-xs group-hover:bg-zinc-800 transition-colors">
            D
          </div>
          <span className="font-semibold text-sm tracking-tight text-zinc-900">DomoScope</span>
        </Link>
      </div>

      {/* Center Breadcrumb */}
      {metadata && (
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-mono">
          <span className="text-zinc-500">{metadata.owner}</span>
          <span className="text-zinc-300">/</span>
          <span className="font-semibold text-zinc-900">{metadata.repo}</span>
        </div>
      )}

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        {/* Global Search Shortcut */}
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-zinc-500 hover:text-zinc-800 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-lg transition-colors cursor-pointer"
          title="Search (Cmd+K)"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden md:inline font-sans">Search...</span>
          <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 bg-white border border-zinc-200 rounded">
            ⌘K
          </kbd>
        </button>

        {metadata && (
          <a
            href={metadata.htmlUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 rounded-lg border border-transparent hover:border-zinc-200 transition-colors"
            title="Open on GitHub"
          >
            <GitHubIcon className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">GitHub</span>
            <ExternalLink className="w-3 h-3 text-zinc-400" />
          </a>
        )}

        <button
          onClick={onOpenSettings}
          className="p-1.5 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
          title="Settings"
          aria-label="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
