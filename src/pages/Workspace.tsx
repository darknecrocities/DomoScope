import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  ChevronLeft,
  MessageSquare,
  PanelRightOpen,
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
import { CompareTab } from '../components/workspace/CompareTab';
import { parseApiEndpoints } from '../services/apiRouteCatalog';
import { generateAuditReportHtml } from '../services/auditReportGenerator';
import { ResizableDivider } from '../components/common/ResizableDivider';
import { SearchModal } from '../components/common/SearchModal';
import { SettingsModal } from '../components/common/SettingsModal';
import { TechStackModal } from '../components/common/TechStackModal';
import { SpecGeneratorModal } from '../components/workspace/SpecGeneratorModal';
import { useOpenRepositories } from '../hooks/useOpenRepositories';
import { RepoTabsBar } from '../components/workspace/RepoTabsBar';
import { AddRepoModal } from '../components/workspace/AddRepoModal';
import { RepoLoadingProgress } from '../components/workspace/RepoLoadingProgress';
import { sanitizeRepoSlug } from '../services/github';
import { useSeoMeta } from '../hooks/useSeoMeta';
import { ErrorBoundary } from '../components/common/ErrorBoundary';

export function WorkspacePage() {
  const { owner: rawOwner = '', repo: rawRepo = '', tab = 'overview' } = useParams<{
    owner: string;
    repo: string;
    tab?: string;
  }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlBranch = searchParams.get('branch') || undefined;

  const owner = useMemo(() => sanitizeRepoSlug(rawOwner), [rawOwner]);
  const repo = useMemo(() => sanitizeRepoSlug(rawRepo), [rawRepo]);

  // Self-healing redirect: If URL parameters were corrupted (e.g. /repository/Thes-IS-IT/Easylenshttps),
  // automatically redirect to cleanly sanitized repository route
  useEffect(() => {
    if ((owner && owner !== rawOwner) || (repo && repo !== rawRepo)) {
      const search = searchParams.toString();
      const query = search ? `?${search}` : '';
      const tabSegment = tab ? `/${tab}` : '';
      navigate(`/repository/${owner}/${repo}${tabSegment}${query}`, { replace: true });
    }
  }, [owner, repo, rawOwner, rawRepo, tab, searchParams, navigate]);

  const [activeTab, setActiveTab] = useState<WorkspaceTab>(
    (tab as WorkspaceTab) || 'overview'
  );

  const currentTabName = useMemo(() => {
    const tabDisplayNames: Record<string, string> = {
      overview: 'Overview',
      architecture: 'Architecture Graph',
      files: 'File Explorer',
      database: 'Database ERD',
      api_catalog: 'API Route Catalog',
      dependencies: 'Dependencies',
      branches: 'Branches & Diff',
      security: 'Security & Patches',
      audit_report: 'Audit Report',
      reverse_engineer: 'Reverse Engineering Spec',
      compare: 'Compare Repositories',
      suggestions: 'AI Suggestions',
      ask: 'AI Assistant',
    };
    return tabDisplayNames[activeTab] || 'Overview';
  }, [activeTab]);

  const repoTitle = owner && repo ? `${owner}/${repo} (${currentTabName}) — DomoScope GitHub Visualizer` : 'Workspace — DomoScope';
  const repoDesc = owner && repo
    ? `Explore ${owner}/${repo} ${currentTabName} in DomoScope. Interactive architecture graph, polyglot database ERD, API routes, and code intelligence.`
    : 'Explore GitHub repositories with DomoScope.';
  const canonicalUrl = owner && repo
    ? `https://domoscope.vercel.app/repository/${owner}/${repo}${activeTab !== 'overview' ? `/${activeTab}` : ''}`
    : 'https://domoscope.vercel.app/';

  useSeoMeta({
    title: repoTitle,
    description: repoDesc,
    canonical: canonicalUrl,
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('domoscope_sidebar_collapsed');
      if (saved !== null) return saved === 'true';
      return typeof window !== 'undefined' && window.innerWidth < 1100;
    } catch {
      return false;
    }
  });
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
  const [isProceedReady, setIsProceedReady] = useState(false);

  // Reset proceed readiness when active repository or branch changes
  useEffect(() => {
    setIsProceedReady(false);
  }, [owner, repo, urlBranch]);

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
    loadLocalDirectory,
    connectLocalServer,
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

  // Keep activeTab in sync with route param tab
  useEffect(() => {
    if (tab && tab !== activeTab) {
      setActiveTab(tab as WorkspaceTab);
    }
  }, [tab]);

  // Sync tab with URL when changed
  const handleTabChange = useCallback(
    (newTab: WorkspaceTab) => {
      setActiveTab(newTab);
      if (newTab === 'ask') {
        setIsAskPanelOpen(true);
      }
      const tabSegment = newTab === 'overview' ? '' : `/${newTab}`;
      const branchParam = urlBranch ? `?branch=${encodeURIComponent(urlBranch)}` : '';
      navigate(`/repository/${owner}/${repo}${tabSegment}${branchParam}`, { replace: true });
    },
    [navigate, owner, repo, urlBranch]
  );

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
    setAskPanelWidth((prev) => {
      const next = prev - deltaX;
      if (next < 160) {
        setIsAskPanelOpen(false);
        return 360;
      }
      const maxW = Math.min(800, Math.round(window.innerWidth * 0.75));
      return Math.min(maxW, Math.max(260, next));
    });
  }, []);

  // Drag to open / pull out chat sidebar from right edge when closed
  const isDraggingChatEdge = useRef(false);

  const startDragChatEdge = useCallback((clientX: number) => {
    isDraggingChatEdge.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!isDraggingChatEdge.current) return;
      const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const widthFromRight = window.innerWidth - x;

      if (widthFromRight > 30) {
        setIsAskPanelOpen(true);
        const maxW = Math.min(800, Math.round(window.innerWidth * 0.75));
        const clamped = Math.min(maxW, Math.max(260, widthFromRight));
        setAskPanelWidth(clamped);
      }
    };

    const handlePointerUp = (e: MouseEvent | TouchEvent) => {
      if (!isDraggingChatEdge.current) return;
      isDraggingChatEdge.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);

      const x = 'changedTouches' in e ? e.changedTouches[0].clientX : (e as MouseEvent).clientX;
      const widthFromRight = window.innerWidth - x;
      if (widthFromRight < 160) {
        setIsAskPanelOpen(false);
      } else {
        setIsAskPanelOpen(true);
      }
    };

    window.addEventListener('mousemove', handlePointerMove, { passive: false });
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove, { passive: false });
    window.addEventListener('touchend', handlePointerUp);
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

  // Full-page Meaningful Loading Experience (initial landing or single-repo view)
  if (openRepos.length <= 1 && !isProceedReady && status !== 'error') {
    return (
      <RepoLoadingProgress
        owner={owner}
        repo={repo}
        loadingStep={loadingStep}
        isDataReady={status === 'success' && files.length > 0 && Boolean(analysis)}
        onProceed={() => setIsProceedReady(true)}
        isFullScreen={true}
      />
    );
  }

  // Full-page Error State Experience (initial landing or single-repo view)
  if (openRepos.length <= 1 && status === 'error') {
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
          onToggleCollapse={() => {
            setIsSidebarCollapsed((prev) => {
              const next = !prev;
              try {
                localStorage.setItem('domoscope_sidebar_collapsed', String(next));
              } catch {}
              return next;
            });
          }}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          badgeCounts={{
            files: files.length,
            database: databaseSchema?.tables.length,
            security: securityFindings.length,
          }}
        />

        {/* Center Workspace Body (Independent vertical scroll for main area, keyed by active repo) */}
        <main
          key={`${owner}/${repo}`}
          className="flex-1 flex flex-col overflow-y-auto relative min-w-0 bg-white"
        >
          {!isProceedReady && status !== 'error' && (
            <RepoLoadingProgress
              owner={owner}
              repo={repo}
              loadingStep={loadingStep}
              isDataReady={status === 'success' && files.length > 0 && Boolean(analysis)}
              onProceed={() => setIsProceedReady(true)}
              isFullScreen={false}
            />
          )}

          {status === 'error' && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white">
              <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-800 mb-4 border border-zinc-200">
                <AlertCircle className="w-6 h-6 stroke-[1.5]" />
              </div>
              <h2 className="text-base font-semibold text-zinc-900 mb-1">
                We couldn't open {owner}/{repo}
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
              </div>
            </div>
          )}

          {isProceedReady && status === 'success' && (
            <ErrorBoundary fallbackTitle="Workspace Content Error" fallbackMessage="An error occurred while loading this workspace view.">
              {activeTab === 'overview' && analysis && (
                <ErrorBoundary fallbackTitle="Overview Error">
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
                      handleTabChange('files');
                    }}
                  />
                </ErrorBoundary>
              )}

              {activeTab === 'architecture' && (
                <ErrorBoundary fallbackTitle="Architecture Graph Render Error" fallbackMessage="An unexpected error occurred while constructing the AST dependency graph.">
                  <ArchitectureGraph
                    files={files}
                    fileContents={fileContents}
                    selectedNodeId={selectedNode}
                    onSelectNode={setSelectedNode}
                    onOpenFile={(path) => {
                      setSelectedFile(path);
                      handleTabChange('files');
                    }}
                    onAskExplain={handleAskExplain}
                    rankDirection={graphDirection}
                    databaseSchema={databaseSchema}
                  />
                </ErrorBoundary>
              )}

              {activeTab === 'files' && (
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden p-4 gap-4 bg-zinc-50">
                  <div className="w-full md:w-72 h-64 md:h-full shrink-0">
                    <ErrorBoundary fallbackTitle="File Explorer Error">
                      <FileExplorer
                        files={files}
                        selectedFile={selectedFile}
                        onSelectFile={(path) => {
                          setSelectedFile(path);
                          loadFileContent(path);
                        }}
                      />
                    </ErrorBoundary>
                  </div>
                  <div className="flex-1 h-full min-w-0">
                    <ErrorBoundary fallbackTitle="Monaco Editor Viewer Error" fallbackMessage="An error occurred while loading Monaco Editor for this file.">
                      <SourceViewer
                        filePath={selectedFile || ''}
                        content={activeFileContent}
                        onAskExplain={handleAskExplain}
                      />
                    </ErrorBoundary>
                  </div>
                </div>
              )}

              {activeTab === 'database' && (
                <ErrorBoundary fallbackTitle="Database ERD Error" fallbackMessage="An error occurred while generating the database ERD diagram.">
                  <DatabaseERD
                    schema={databaseSchema}
                    onOpenFile={(path) => {
                      setSelectedFile(path);
                      handleTabChange('files');
                    }}
                  />
                </ErrorBoundary>
              )}

              {activeTab === 'dependencies' && (
                <ErrorBoundary fallbackTitle="Dependencies Error">
                  <DependenciesTab
                    dependencies={dependencies}
                    onOpenFile={(path) => {
                      setSelectedFile(path);
                      handleTabChange('files');
                    }}
                  />
                </ErrorBoundary>
              )}

              {activeTab === 'branches' && (
                <ErrorBoundary fallbackTitle="Branches & Diff Error">
                  <BranchesTab
                    owner={owner}
                    repo={repo}
                    currentBranch={currentBranch}
                    branches={branches}
                    onSelectBranch={handleSelectBranch}
                  />
                </ErrorBoundary>
              )}

              {activeTab === 'security' && (
                <ErrorBoundary fallbackTitle="Security Tab Error">
                  <SecurityTab
                    findings={securityFindings}
                    onOpenFile={(path) => {
                      setSelectedFile(path);
                      handleTabChange('files');
                    }}
                  />
                </ErrorBoundary>
              )}

              {activeTab === 'api_catalog' && (
                <ErrorBoundary fallbackTitle="API Catalog Error">
                  <ApiCatalogTab
                    fileContents={fileContents}
                    files={files}
                    onOpenFile={(path) => {
                      setSelectedFile(path);
                      handleTabChange('files');
                    }}
                  />
                </ErrorBoundary>
              )}

              {activeTab === 'audit_report' && (
                <ErrorBoundary fallbackTitle="Audit Report Error">
                  <AuditReportTab
                    owner={owner}
                    repo={repo}
                    analysis={analysis}
                    files={files}
                    databaseSchema={databaseSchema}
                    securityFindings={securityFindings}
                  />
                </ErrorBoundary>
              )}

              {activeTab === 'reverse_engineer' && (
                <ErrorBoundary fallbackTitle="Reverse Engineer Spec Error">
                  <ReverseEngineerTab
                    repoName={`${owner}/${repo}`}
                    analysis={analysis}
                    files={files}
                    fileContents={fileContents}
                    databaseSchema={databaseSchema}
                    dependencies={dependencies}
                    onOpenFile={(path) => {
                      setSelectedFile(path);
                      handleTabChange('files');
                    }}
                  />
                </ErrorBoundary>
              )}

              {activeTab === 'compare' && (
                <ErrorBoundary fallbackTitle="Compare Error">
                  <CompareTab
                    currentOwner={owner || ''}
                    currentRepo={repo || ''}
                    currentAnalysis={analysis}
                    currentDatabaseSchema={databaseSchema}
                    currentDependencies={dependencies}
                    currentSecurityFindings={securityFindings}
                    currentApiRoutes={analysis ? parseApiEndpoints(files.map((f) => ({ path: f.path, content: fileContents.get(f.path) }))) : []}
                    openRepositories={openRepos}
                    onSelectRepo={(o, r) => switchRepository(o, r)}
                    onAskAi={(prompt) => {
                      setExplainPrompt(prompt);
                      setIsAskPanelOpen(true);
                    }}
                  />
                </ErrorBoundary>
              )}

              {activeTab === 'suggestions' && analysis && (
                <ErrorBoundary fallbackTitle="AI Suggestions Error">
                  <SuggestionsTab
                    analysis={analysis}
                    files={files}
                    fileContents={fileContents}
                    databaseSchema={databaseSchema}
                    securityFindings={securityFindings}
                    dependencies={dependencies}
                    onOpenFile={(path) => {
                      setSelectedFile(path);
                      handleTabChange('files');
                    }}
                    onSelectTab={(t) => handleTabChange(t as WorkspaceTab)}
                  />
                </ErrorBoundary>
              )}

              {activeTab === 'ask' && analysis && (
                <ErrorBoundary fallbackTitle="Ask AI Panel Error">
                  <div className="flex-1 p-3 sm:p-5 bg-zinc-50 flex items-center justify-center overflow-hidden">
                    <div className="w-full max-w-5xl h-full bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xs flex flex-col">
                      <AskPanel
                        key={analysis.metadata.fullName}
                        analysis={analysis}
                        files={files}
                        fileContents={fileContents}
                        selectedFile={selectedFile}
                        onSelectFile={(path) => setSelectedFile(path)}
                        onOpenFile={(path) => {
                          setSelectedFile(path);
                          handleTabChange('files');
                        }}
                        onClose={() => handleTabChange('overview')}
                        onOpenSettings={() => setIsSettingsOpen(true)}
                        initialPrompt={explainPrompt}
                        onClearInitialPrompt={() => setExplainPrompt(null)}
                        dependencies={dependencies}
                        databaseSchema={databaseSchema}
                        securityFindings={securityFindings}
                      />
                    </div>
                  </div>
                </ErrorBoundary>
              )}
            </ErrorBoundary>
          )}
        </main>

        {/* Resizable Divider & Ask Panel (when active tab is not already fullscreen ask) */}
        {activeTab !== 'ask' && analysis && (
          isAskPanelOpen ? (
            <>
              <ResizableDivider onResize={handleResizeAsk} />
              <div
                style={{ width: `${askPanelWidth}px`, minWidth: '44px' }}
                className="hidden lg:flex h-full shrink-0 overflow-hidden transition-all duration-75"
              >
                <AskPanel
                  key={analysis.metadata.fullName}
                  analysis={analysis}
                  files={files}
                  fileContents={fileContents}
                  selectedFile={selectedFile}
                  onSelectFile={(path) => setSelectedFile(path)}
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
          ) : (
            /* Closed State: Sleek, draggable vertical rail to pull chat open from the right */
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                startDragChatEdge(e.clientX);
              }}
              onTouchStart={(e) => {
                if (e.touches[0]) startDragChatEdge(e.touches[0].clientX);
              }}
              className="group relative h-full w-4 hover:w-6 bg-white hover:bg-zinc-50 border-l border-zinc-200 cursor-col-resize select-none shrink-0 transition-all flex flex-col items-center justify-center z-20"
              title="Drag left or click to open Ask DomoScope Chat"
            >
              {/* Grab Bar Indicator */}
              <div className="w-1 h-14 rounded-full bg-zinc-300 group-hover:bg-zinc-900 group-hover:h-20 transition-all" />

              {/* Floating Tab Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAskPanelOpen(true);
                }}
                className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center py-2.5 px-1.5 rounded-l-xl bg-zinc-900 text-white shadow-md border border-r-0 border-zinc-800 transition-transform group-hover:-translate-x-1 cursor-pointer"
                title="Click or drag left to open Chat"
              >
                <div className="flex flex-col items-center gap-1.5">
                  <ChevronLeft className="w-3.5 h-3.5 text-zinc-300 group-hover:text-white animate-pulse" />
                  <MessageSquare className="w-3.5 h-3.5 text-zinc-300" />
                  <span
                    className="text-[9.5px] font-mono tracking-wider text-zinc-300 uppercase select-none mt-1"
                    style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                  >
                    Chat
                  </span>
                </div>
              </button>
            </div>
          )
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
        onOpenLocalFolder={loadLocalDirectory}
        onConnectLocalServer={connectLocalServer}
        existingRepos={openRepos}
      />
    </div>
  );
}
