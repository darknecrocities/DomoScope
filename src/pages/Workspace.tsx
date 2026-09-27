import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  RefreshCw,
  GitBranch,
  Layers,
  FileCode,
  CheckCircle,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { useRepository } from '../hooks/useRepository';
import { Navbar } from '../components/layout/Navbar';
import { Sidebar, WorkspaceTab } from '../components/layout/Sidebar';
import { AppBar } from '../components/layout/AppBar';
import { OverviewTab } from '../components/workspace/OverviewTab';
import { ArchitectureGraph } from '../components/workspace/ArchitectureGraph';
import { FileExplorer } from '../components/workspace/FileExplorer';
import { SourceViewer } from '../components/workspace/SourceViewer';
import { DatabaseERD } from '../components/workspace/DatabaseERD';
import { DependenciesTab } from '../components/workspace/DependenciesTab';
import { BranchesTab } from '../components/workspace/BranchesTab';
import { SecurityTab } from '../components/workspace/SecurityTab';
import { SuggestionsTab } from '../components/workspace/SuggestionsTab';
import { AskPanel } from '../components/workspace/AskPanel';
import { ApiCatalogTab } from '../components/workspace/ApiCatalogTab';
import { AuditReportTab } from '../components/workspace/AuditReportTab';
import { ReverseEngineerTab } from '../components/workspace/ReverseEngineerTab';
import { generateAuditReportHtml } from '../services/auditReportGenerator';
import { ResizableDivider } from '../components/common/ResizableDivider';
import { SearchModal } from '../components/common/SearchModal';
import { SettingsModal } from '../components/common/SettingsModal';
import { TechStackModal } from '../components/common/TechStackModal';
import { SpecGeneratorModal } from '../components/workspace/SpecGeneratorModal';
import { useOpenRepositories } from '../hooks/useOpenRepositories';
import { RepoTabsBar } from '../components/workspace/RepoTabsBar';
import { AddRepoModal } from '../components/workspace/AddRepoModal';

export function WorkspacePage() {
  const { owner = '', repo = '', tab = 'overview' } = useParams<{
    owner: string;
    repo: string;
    tab?: string;
  }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlBranch = searchParams.get('branch') || undefined;

  const [activeTab, setActiveTab] = useState<WorkspaceTab>(
    (tab as WorkspaceTab) || 'overview'
  );
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAskPanelOpen, setIsAskPanelOpen] = useState(true);
  const [askPanelWidth, setAskPanelWidth] = useState(360);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [graphDirection, setGraphDirection] = useState<'TB' | 'LR'>('TB');

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTechStackOpen, setIsTechStackOpen] = useState(false);
  const [isSpecGeneratorOpen, setIsSpecGeneratorOpen] = useState(false);
  const [isAddRepoOpen, setIsAddRepoOpen] = useState(false);
  const [explainPrompt, setExplainPrompt] = useState<string | null>(null);

  const { openRepos, addRepository, switchRepository, closeRepository } =
    useOpenRepositories(owner, repo, activeTab);

  const {
    status,
    loadingStep,
    errorMessage,
    isRateLimited,
    isFallbackMode,
    metadata,
    currentBranch,
    files,
    analysis,
    fileContents,
    databaseSchema,
    dependencies,
    branches,
    securityFindings,
    selectedFile,
    selectedNode,
    setSelectedFile,
    setSelectedNode,
    loadFileContent,
    refresh,
    loadRepository,
  } = useRepository(owner, repo, urlBranch);

  // Smooth branch switching with URL persistence
  const handleSelectBranch = useCallback(
    (newBranch: string) => {
      if (!newBranch || newBranch === currentBranch) return;
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (newBranch && newBranch !== metadata?.defaultBranch) {
          next.set('branch', newBranch);
        } else {
          next.delete('branch');
        }
        return next;
      });
      loadRepository(owner, repo, newBranch);
    },
    [currentBranch, metadata?.defaultBranch, setSearchParams, loadRepository, owner, repo]
  );

  // Sync tab with URL if needed
  const handleTabChange = (newTab: WorkspaceTab) => {
    setActiveTab(newTab);
    if (newTab === 'ask') {
      setIsAskPanelOpen(true);
    }
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when typing in inputs/textareas
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      } else if (e.key === '/') {
        e.preventDefault();
        setIsSearchOpen(true);
      } else if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsSettingsOpen(false);
        if (isFullscreen) setIsFullscreen(false);
      } else if (e.key.toLowerCase() === 'f' && activeTab === 'architecture') {
        setIsFullscreen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, activeTab]);

  // Handle panel resizing
  const handleResizeAsk = useCallback((deltaX: number) => {
    setAskPanelWidth((prev) => Math.min(600, Math.max(280, prev - deltaX)));
  }, []);

  // Handle "Explain this file"
  const handleAskExplain = (filePath: string) => {
    setSelectedFile(filePath);
    setIsAskPanelOpen(true);
    setExplainPrompt(`Explain the role and architecture of ${filePath} within this project.`);
  };

  // Active file content in source viewer
  const activeFileContent = useMemo(() => {
    if (!selectedFile) return '';
    return fileContents.get(selectedFile) || '';
  }, [selectedFile, fileContents]);

  // Meaningful Loading Experience (initial load only)
  if (status === 'loading' && files.length === 0) {
    const steps = [
      'Checking repository',
      'Reading files',
      'Understanding structure',
      'Building project map',
      'Preparing workspace',
    ];
    const currentStepIndex = steps.indexOf(loadingStep);

    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 select-none">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-bold text-sm mx-auto shadow-md">
            D
          </div>

          <div>
            <h2 className="text-base font-semibold text-zinc-900">
              Exploring {owner}/{repo}
            </h2>
            <p className="text-xs text-zinc-500 mt-1 font-mono">
              Retrieving repository data from GitHub...
            </p>
          </div>

          <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2.5 text-left text-xs font-mono">
            {steps.map((step, idx) => {
              const isPast = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              return (
                <div key={step} className="flex items-center justify-between">
                  <span
                    className={
                      isCurrent
                        ? 'text-zinc-900 font-semibold'
                        : isPast
                        ? 'text-zinc-500 line-through'
                        : 'text-zinc-300'
                    }
                  >
                    {step}
                  </span>
                  {isPast ? (
                    <span className="text-zinc-800 font-bold">✓</span>
                  ) : isCurrent ? (
                    <span className="w-2 h-2 rounded-full bg-zinc-900 animate-ping" />
                  ) : (
                    <span className="text-zinc-300">○</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Error State Experience
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-800 mb-4 border border-zinc-200">
          <AlertCircle className="w-6 h-6 stroke-[1.5]" />
        </div>
        <h2 className="text-base font-semibold text-zinc-900 mb-1">
          We couldn't open this repository
        </h2>
        <p className="text-xs text-zinc-600 max-w-md mb-6 leading-relaxed">
          {errorMessage || 'An error occurred while fetching the repository.'}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => refresh()}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
          <button
            onClick={() => setIsAddRepoOpen(true)}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            Open Another Repo
          </button>
          {isRateLimited && (
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="px-4 py-2 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-800 transition-colors cursor-pointer"
            >
              Add GitHub Token
            </button>
          )}
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-600 transition-colors cursor-pointer"
          >
            Return Home
          </button>
        </div>

        <AddRepoModal
          isOpen={isAddRepoOpen}
          onClose={() => setIsAddRepoOpen(false)}
          onAddRepo={addRepository}
          existingRepos={openRepos}
        />
        <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      </div>
    );
  }

  return (
    <div
      className={`h-screen overflow-hidden bg-white text-zinc-900 flex flex-col ${
        isFullscreen ? 'fixed inset-0 z-50 bg-white' : ''
      }`}
    >
      {/* Sticky Navbar */}
      <Navbar
        metadata={metadata}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenTechStack={() => setIsTechStackOpen(true)}
        onOpenSpecGenerator={() => setIsSpecGeneratorOpen(true)}
      />

      {/* Multi-Repository Tabs Bar */}
      <RepoTabsBar
        openRepos={openRepos}
        activeOwner={owner}
        activeRepo={repo}
        onSelectRepo={switchRepository}
        onCloseRepo={closeRepository}
        onOpenAddModal={() => setIsAddRepoOpen(true)}
      />

      {/* Contextual App Bar */}
      <AppBar
        owner={owner}
        repo={repo}
        branch={currentBranch}
        activeTab={activeTab}
        branches={branches}
        metadata={metadata}
        isFallbackMode={isFallbackMode}
        onSelectBranch={handleSelectBranch}
        onRefresh={refresh}
        isFullscreen={isFullscreen}
        onToggleFullscreen={() => setIsFullscreen((prev) => !prev)}
        onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
        graphDirection={graphDirection}
        onToggleGraphDirection={() => setGraphDirection((prev) => (prev === 'TB' ? 'LR' : 'TB'))}
        onOpenAddRepo={() => setIsAddRepoOpen(true)}
      />

      {/* Seamless loading bar when switching branches */}
      {status === 'loading' && files.length > 0 && (
        <div className="w-full h-0.5 bg-zinc-100 overflow-hidden shrink-0 z-30">
          <div className="h-full bg-zinc-950 animate-pulse w-full" />
        </div>
      )}

      {/* Main Workspace Frame */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Collapsible Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          badgeCounts={{
            files: files.length,
            database: databaseSchema?.tables.length,
            security: securityFindings.length,
          }}
        />

        {/* Center Workspace Body (Independent vertical scroll for main area) */}
        <main className="flex-1 flex flex-col overflow-y-auto relative min-w-0 bg-white">
          {activeTab === 'overview' && analysis && (
            <OverviewTab
              analysis={analysis}
              databaseSchema={databaseSchema}
              dependencies={dependencies}
              branches={branches}
              securityFindings={securityFindings}
              onNavigateTab={handleTabChange}
              files={files}
              fileContents={fileContents}
              onOpenFile={(path) => {
                setSelectedFile(path);
                setActiveTab('files');
              }}
            />
          )}

          {activeTab === 'architecture' && (
            <ArchitectureGraph
              files={files}
              fileContents={fileContents}
              selectedNodeId={selectedNode}
              onSelectNode={setSelectedNode}
              onOpenFile={(path) => {
                setSelectedFile(path);
                setActiveTab('files');
              }}
              onAskExplain={handleAskExplain}
              rankDirection={graphDirection}
            />
          )}

          {activeTab === 'files' && (
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden p-4 gap-4 bg-zinc-50">
              <div className="w-full md:w-72 h-64 md:h-full shrink-0">
                <FileExplorer
                  files={files}
                  selectedFile={selectedFile}
                  onSelectFile={(path) => {
                    setSelectedFile(path);
                    loadFileContent(path);
                  }}
                />
              </div>
              <div className="flex-1 h-full min-w-0">
                <SourceViewer
                  filePath={selectedFile || ''}
                  content={activeFileContent}
                  onAskExplain={handleAskExplain}
                />
              </div>
            </div>
          )}

          {activeTab === 'database' && (
            <DatabaseERD
              schema={databaseSchema}
              onOpenFile={(path) => {
                setSelectedFile(path);
                setActiveTab('files');
              }}
            />
          )}

          {activeTab === 'dependencies' && (
            <DependenciesTab
              dependencies={dependencies}
              onOpenFile={(path) => {
                setSelectedFile(path);
                setActiveTab('files');
              }}
            />
          )}

          {activeTab === 'branches' && (
            <BranchesTab
              owner={owner}
              repo={repo}
              currentBranch={currentBranch}
              branches={branches}
              onSelectBranch={handleSelectBranch}
            />
          )}

          {activeTab === 'security' && (
            <SecurityTab
              findings={securityFindings}
              onOpenFile={(path) => {
                setSelectedFile(path);
                setActiveTab('files');
              }}
            />
          )}

          {activeTab === 'api_catalog' && (
            <ApiCatalogTab
              fileContents={fileContents}
              files={files}
              onOpenFile={(path) => {
                setSelectedFile(path);
                setActiveTab('files');
              }}
            />
          )}

          {activeTab === 'audit_report' && (
            <AuditReportTab
              owner={owner}
              repo={repo}
              analysis={analysis}
              files={files}
              databaseSchema={databaseSchema}
              securityFindings={securityFindings}
            />
          )}

          {activeTab === 'reverse_engineer' && (
            <ReverseEngineerTab
              repoName={`${owner}/${repo}`}
              analysis={analysis}
              files={files}
              fileContents={fileContents}
              databaseSchema={databaseSchema}
              dependencies={dependencies}
            />
          )}

          {activeTab === 'suggestions' && analysis && (
            <SuggestionsTab
              analysis={analysis}
              onOpenFile={(path) => {
                setSelectedFile(path);
                setActiveTab('files');
              }}
            />
          )}

          {activeTab === 'ask' && analysis && (
            <div className="flex-1 p-4 bg-zinc-50 flex items-center justify-center">
              <div className="w-full max-w-2xl h-full bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
                <AskPanel
                  analysis={analysis}
                  files={files}
                  fileContents={fileContents}
                  selectedFile={selectedFile}
                  onOpenFile={(path) => {
                    setSelectedFile(path);
                    setActiveTab('files');
                  }}
                  onClose={() => setActiveTab('overview')}
                  onOpenSettings={() => setIsSettingsOpen(true)}
                  initialPrompt={explainPrompt}
                  onClearInitialPrompt={() => setExplainPrompt(null)}
                  dependencies={dependencies}
                  databaseSchema={databaseSchema}
                  securityFindings={securityFindings}
                />
              </div>
            </div>
          )}
        </main>

        {/* Resizable Divider & Ask Panel (when active tab is not already fullscreen ask) */}
        {activeTab !== 'ask' && isAskPanelOpen && analysis && (
          <>
            <ResizableDivider onResize={handleResizeAsk} />
            <div
              style={{ width: `${askPanelWidth}px` }}
              className="hidden lg:flex h-full shrink-0"
            >
              <AskPanel
                analysis={analysis}
                files={files}
                fileContents={fileContents}
                selectedFile={selectedFile}
                onOpenFile={(path) => {
                  setSelectedFile(path);
                  setActiveTab('files');
                }}
                onClose={() => setIsAskPanelOpen(false)}
                onOpenSettings={() => setIsSettingsOpen(true)}
                initialPrompt={explainPrompt}
                onClearInitialPrompt={() => setExplainPrompt(null)}
                dependencies={dependencies}
                databaseSchema={databaseSchema}
                securityFindings={securityFindings}
              />
            </div>
          </>
        )}
      </div>

      {/* Global Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        files={files}
        databaseSchema={databaseSchema}
        dependencies={dependencies}
        onSelectFile={(path) => {
          setSelectedFile(path);
          setActiveTab('files');
        }}
        onNavigateTab={(t) => handleTabChange(t as WorkspaceTab)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onClearCache={() => refresh()}
      />

      {/* Tech Stack Inspector Modal */}
      <TechStackModal
        isOpen={isTechStackOpen}
        onClose={() => setIsTechStackOpen(false)}
        files={files}
        fileContents={fileContents}
      />

      {/* Reverse Engineering Spec Generator (.md) Modal */}
      {analysis && (
        <SpecGeneratorModal
          isOpen={isSpecGeneratorOpen}
          onClose={() => setIsSpecGeneratorOpen(false)}
          analysis={analysis}
          files={files}
          fileContents={fileContents}
          databaseSchema={databaseSchema}
          dependencies={dependencies}
          securityFindings={securityFindings}
        />
      )}

      {/* Add Repository Modal */}
      <AddRepoModal
        isOpen={isAddRepoOpen}
        onClose={() => setIsAddRepoOpen(false)}
        onAddRepo={addRepository}
        existingRepos={openRepos}
      />
    </div>
  );
}
