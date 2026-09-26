import { useEffect } from 'react';
import {
  LayoutDashboard,
  Network,
  FolderTree,
  Database,
  Package,
  GitBranch,
  Shield,
  Lightbulb,
  MessageSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';

export type WorkspaceTab =
  | 'overview'
  | 'architecture'
  | 'files'
  | 'database'
  | 'dependencies'
  | 'branches'
  | 'security'
  | 'suggestions'
  | 'ask';

interface SidebarProps {
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenSettings: () => void;
  badgeCounts?: {
    files?: number;
    database?: number;
    security?: number;
  };
}

const NAV_ITEMS = [
  { id: 'overview' as WorkspaceTab, label: 'Overview', icon: LayoutDashboard },
  { id: 'architecture' as WorkspaceTab, label: 'Architecture', icon: Network },
  { id: 'files' as WorkspaceTab, label: 'Files', icon: FolderTree },
  { id: 'database' as WorkspaceTab, label: 'Database', icon: Database },
  { id: 'dependencies' as WorkspaceTab, label: 'Dependencies', icon: Package },
  { id: 'branches' as WorkspaceTab, label: 'Branches', icon: GitBranch },
  { id: 'security' as WorkspaceTab, label: 'Security', icon: Shield },
  { id: 'suggestions' as WorkspaceTab, label: 'Suggestions', icon: Lightbulb },
  { id: 'ask' as WorkspaceTab, label: 'Ask', icon: MessageSquare },
];

export function Sidebar({
  activeTab,
  onTabChange,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  onOpenSettings,
  badgeCounts,
}: SidebarProps) {
  // Close mobile drawer on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileOpen) onCloseMobile();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen, onCloseMobile]);

  const handleItemClick = (tab: WorkspaceTab) => {
    onTabChange(tab);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-0 md:top-13 h-[100dvh] md:h-[calc(100vh-3.25rem)] z-40 md:z-20 bg-white border-r border-zinc-200 transition-all duration-200 flex flex-col justify-between shrink-0 select-none ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${isCollapsed ? 'md:w-16' : 'w-64 md:w-60'}`}
      >
        {/* Navigation Items */}
        <div className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
          {/* Mobile Close Bar */}
          <div className="flex md:hidden items-center justify-between px-3 py-2 mb-2 border-b border-zinc-100">
            <span className="text-xs font-semibold text-zinc-900">Menu</span>
            <button
              onClick={onCloseMobile}
              className="p-1 text-zinc-400 hover:text-zinc-700 rounded-md"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const count =
              item.id === 'files'
                ? badgeCounts?.files
                : item.id === 'database'
                ? badgeCounts?.database
                : item.id === 'security'
                ? badgeCounts?.security
                : undefined;

            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors group relative cursor-pointer ${
                  isActive
                    ? 'bg-zinc-900 text-white shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                } ${isCollapsed ? 'justify-center' : 'justify-between'}`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 stroke-[1.75] ${isActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-900'}`} />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </div>

                {!isCollapsed && typeof count === 'number' && count > 0 && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                      isActive ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-500'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom Actions */}
        <div className="p-2 border-t border-zinc-100 space-y-1">
          <button
            onClick={() => {
              onOpenSettings();
              onCloseMobile();
            }}
            title={isCollapsed ? 'Settings' : undefined}
            className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer ${
              isCollapsed ? 'justify-center' : ''
            }`}
          >
            <Settings className="w-4 h-4 shrink-0 text-zinc-500" />
            {!isCollapsed && <span>Settings</span>}
          </button>

          {/* Desktop Collapse Toggle */}
          <div className="hidden md:block pt-1">
            <button
              onClick={onToggleCollapse}
              className="w-full flex items-center justify-center p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
