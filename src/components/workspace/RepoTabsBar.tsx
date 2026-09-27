import React from 'react';
import { Plus, X, FolderGit2, GitFork } from 'lucide-react';
import { OpenRepoItem } from '../../hooks/useOpenRepositories';

interface RepoTabsBarProps {
  openRepos: OpenRepoItem[];
  activeOwner: string;
  activeRepo: string;
  onSelectRepo: (owner: string, repo: string) => void;
  onCloseRepo: (owner: string, repo: string, e: React.MouseEvent) => void;
  onOpenAddModal: () => void;
}

export function RepoTabsBar({
  openRepos,
  activeOwner,
  activeRepo,
  onSelectRepo,
  onCloseRepo,
  onOpenAddModal,
}: RepoTabsBarProps) {
  return (
    <div className="w-full h-10 bg-zinc-100/90 border-b border-zinc-200 px-3 flex items-center justify-between text-xs select-none font-sans overflow-x-auto no-scrollbar">
      {/* Scrollable Tabs Container */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-x-auto no-scrollbar py-1">
        {openRepos.map((item) => {
          const isActive =
            item.owner.toLowerCase() === activeOwner.toLowerCase() &&
            item.repo.toLowerCase() === activeRepo.toLowerCase();

          return (
            <div
              key={`${item.owner}/${item.repo}`}
              onClick={() => onSelectRepo(item.owner, item.repo)}
              className={`group flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer shrink-0 min-w-[140px] max-w-[380px] ${
                isActive
                  ? 'bg-white text-zinc-950 font-bold border border-zinc-200/90 shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/70 border border-transparent'
              }`}
              title={`${item.owner}/${item.repo}`}
            >
              <GitFork className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-zinc-900' : 'text-zinc-400 group-hover:text-zinc-700'}`} />
              <div className="flex items-center min-w-0 truncate">
                <span className={`truncate ${isActive ? 'text-zinc-400 font-normal' : 'text-zinc-400 font-normal'}`}>
                  {item.owner}/
                </span>
                <span className={`truncate ${isActive ? 'text-zinc-950 font-extrabold' : 'text-zinc-700 font-bold'}`}>
                  {item.repo}
                </span>
              </div>

              {/* Close Tab Button */}
              <button
                type="button"
                onClick={(e) => onCloseRepo(item.owner, item.repo, e)}
                className={`p-1 rounded-md transition-all cursor-pointer ml-auto shrink-0 ${
                  isActive
                    ? 'text-zinc-400 hover:text-zinc-950 hover:bg-zinc-100'
                    : 'text-zinc-400 hover:text-zinc-900 hover:bg-zinc-300/80 opacity-60 group-hover:opacity-100'
                }`}
                title={`Close ${item.owner}/${item.repo}`}
                aria-label={`Close ${item.owner}/${item.repo}`}
              >
                <X className="w-3 h-3 stroke-[2.5]" />
              </button>
            </div>
          );
        })}

        {/* Add Repository Tab Button */}
        <button
          type="button"
          onClick={onOpenAddModal}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:text-zinc-950 bg-white hover:bg-zinc-50 border border-zinc-300 rounded-xl shadow-2xs transition-all cursor-pointer shrink-0 ml-1"
          title="Open another repository in a new tab"
        >
          <Plus className="w-3.5 h-3.5 text-zinc-900 stroke-[2.5]" />
          <span className="font-mono text-[11px] font-bold">Add Repo</span>
        </button>
      </div>

      {/* Right Indicator */}
      <div className="hidden md:flex items-center gap-2 pl-3 text-[11px] font-mono text-zinc-400 shrink-0">
        <span>{openRepos.length} {openRepos.length === 1 ? 'repo' : 'repos'} open</span>
      </div>
    </div>
  );
}
