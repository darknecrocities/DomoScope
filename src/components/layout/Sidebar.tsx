import { useEffect } from 'react';
import {
  LayoutDashboard,
  Network,
  FolderTree,
  Database,
  Globe,
  FileCheck,
  Package,
  GitBranch,
  Shield,
  Lightbulb,
  MessageSquare,
  Cpu,
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
  | 'api_catalog'
  | 'dependencies'
  | 'branches'
  | 'security'
  | 'audit_report'
  | 'reverse_engineer'
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
  { id: 'database' as WorkspaceTab, label: 'Database ERD', icon: Database },
  { id: 'api_catalog' as WorkspaceTab, label: 'API Catalog', icon: Globe },
  { id: 'dependencies' as WorkspaceTab, label: 'Dependencies', icon: Package },
  { id: 'branches' as WorkspaceTab, label: 'Branches & Diff', icon: GitBranch },
  { id: 'security' as WorkspaceTab, label: 'Security & Patches', icon: Shield },
  { id: 'audit_report' as WorkspaceTab, label: 'Audit Report', icon: FileCheck },
  { id: 'reverse_engineer' as WorkspaceTab, label: 'Reverse Engineer', icon: Cpu },
  { id: 'suggestions' as WorkspaceTab, label: 'Suggestions', icon: Lightbulb },
  { id: 'ask' as WorkspaceTab, label: 'Ask AI', icon: MessageSquare },
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
  // Close mobile drawer on escape key
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
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Collapsible Sidebar Frame */}
      <aside
        className={`h-full bg-white border-r border-zinc-200 flex flex-col justify-between shrink-0 select-none transition-all duration-300 ease-in-out ${
          isMobileOpen
            ? 'fixed inset-y-0 left-0 z-50 w-64 translate-x-0 shadow-2xl'
            : 'fixed inset-y-0 left-0 z-50 w-64 -translate-x-full md:static md:translate-x-0 md:shadow-none md:z-20'
        } ${isCollapsed ? 'md:w-16' : 'md:w-56'}`}
      >
        {/* Navigation Header & Items */}
        <div className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
          {/* Mobile Close Bar */}
          <div className="flex md:hidden items-center justify-between px-3 py-2 mb-2 border-b border-zinc-200">
            <span className="text-xs font-bold text-zinc-900">Workspace Menu</span>
            <button
              onClick={onCloseMobile}
              className="p-1 text-zinc-500 hover:text-zinc-950 rounded-md"
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
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all group relative cursor-pointer ${
                  isActive
                    ? 'bg-zinc-900 text-white shadow-xs scale-[1.01]'
                    : 'text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100'
                } ${isCollapsed ? 'justify-center px-2' : 'justify-between'}`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 stroke-[2] transition-transform duration-200 group-hover:scale-110 ${
                      isActive ? 'text-white' : 'text-zinc-700 group-hover:text-zinc-950'
                    }`}
                  />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </div>

                {!isCollapsed && typeof count === 'number' && count > 0 && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md font-bold ${
                      isActive
                        ? 'bg-zinc-800 text-white border border-zinc-700'
                        : 'bg-zinc-100 text-zinc-900 border border-zinc-300'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom Actions & Minimize Toggle Button */}
        <div className="p-2 border-t border-zinc-200 space-y-1 bg-zinc-50/50">
          <button
            onClick={() => {
              onOpenSettings();
              onCloseMobile();
            }}
            title={isCollapsed ? 'Settings' : undefined}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-zinc-700 hover:text-zinc-950 hover:bg-zinc-200 transition-colors cursor-pointer ${
              isCollapsed ? 'justify-center px-2' : ''
            }`}
          >
            <Settings className="w-4 h-4 shrink-0 text-zinc-800" />
            {!isCollapsed && <span>Settings</span>}
          </button>

          {/* Desktop Minimize / Expand Toggle Button */}
          <div className="hidden md:block pt-1">
            <button
              onClick={onToggleCollapse}
              className="w-full flex items-center justify-center p-2 text-zinc-700 hover:text-zinc-950 hover:bg-zinc-200 border border-zinc-200 rounded-xl transition-all cursor-pointer shadow-xs font-bold"
              title={isCollapsed ? 'Expand sidebar' : 'Minimize sidebar'}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Minimize sidebar'}
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4 text-zinc-900" />
              ) : (
                <div className="flex items-center gap-1.5 text-xs">
                  <ChevronLeft className="w-4 h-4 text-zinc-900" />
                  <span>Minimize Sidebar</span>
                </div>
              )}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
