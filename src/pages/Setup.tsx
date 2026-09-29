import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Terminal,
  Cpu,
  Sparkles,
  Layers,
  Key,
  Check,
  Copy,
  CheckCheck,
  ShieldCheck,
  Zap,
  Globe,
  Laptop,
  FolderOpen,
  Activity,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Server,
  Play,
  FileCode,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  BookOpen,
  GitBranch,
} from 'lucide-react';
import { GitHubIcon } from '../components/common/Icons';
import { GitHubService } from '../services/github';
import { GitHubAuthService, GitHubUserProfile } from '../services/githubAuth';
import { StorageService } from '../services/storage';
import { CryptoService } from '../services/cryptoService';
import { DOMOSCOPE_MCP_TOOLS } from '../services/mcpCore';
import { isFileSystemAccessSupported, openLocalDirectoryInBrowser } from '../services/browserLocalScanner';
import { BackgroundCanvas } from '../components/common/BackgroundCanvas';
import { SettingsModal } from '../components/common/SettingsModal';

type SetupTab = 'cli' | 'mcp' | 'local' | 'auth' | 'diagnostics' | 'cicd';

interface DiagnosticResult {
  id: string;
  name: string;
  status: 'passed' | 'warning' | 'failed' | 'running' | 'idle';
  detail: string;
  remedy?: string;
  latencyMs?: number;
}

export function SetupPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SetupTab>('cli');
  const [packageManager, setPackageManager] = useState<'npx' | 'npm' | 'pnpm' | 'yarn' | 'bun'>('npx');
  const [mcpClient, setMcpClient] = useState<'claude' | 'cursor' | 'antigravity' | 'windsurf' | 'remote'>('claude');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<GitHubUserProfile | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // In-page Token State
  const [tokenInput, setTokenInput] = useState('');
  const [isTokenSaved, setIsTokenSaved] = useState(false);
  const [rateLimit, setRateLimit] = useState(GitHubService.getRateLimit());

  // MCP Tool Filter
  const [mcpSearchQuery, setMcpSearchQuery] = useState('');

  // Local Directory Loading state
  const [isScanningLocal, setIsScanningLocal] = useState(false);
  const [localScanError, setLocalScanError] = useState<string | null>(null);

  // Live Diagnostics State
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([
    {
      id: 'fs-access',
      name: 'Web File System Access API',
      status: 'idle',
      detail: 'Checks window.showDirectoryPicker for direct in-browser local folder inspection.',
    },
    {
      id: 'web-crypto',
      name: 'Web Cryptography Engine (SubtleCrypto)',
      status: 'idle',
      detail: 'Validates AES-GCM 256-bit hardware encryption for credentials in local vault.',
    },
    {
      id: 'indexeddb',
      name: 'Persistent IndexedDB & Local Vault',
      status: 'idle',
      detail: 'Tests browser storage quota and AST repository cache latency.',
    },
    {
      id: 'github-gateway',
      name: 'GitHub REST API Gateway Connectivity',
      status: 'idle',
      detail: 'Pings GitHub API to measure network latency and check unauthenticated/authenticated quota.',
    },
    {
      id: 'local-daemon',
      name: 'Local Studio Daemon (localhost:4004)',
      status: 'idle',
      detail: 'Probes local HTTP & SSE background visualizer server.',
    },
  ]);
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);

  useEffect(() => {
    GitHubAuthService.getUserProfile().then(setUserProfile);
    StorageService.getSetting<string>('github_token', '').then((saved) => {
      if (saved) setTokenInput(saved);
    });
    setRateLimit(GitHubService.getRateLimit());
  }, []);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSaveToken = async (e: React.FormEvent) => {
    e.preventDefault();
    await StorageService.setSetting('github_token', tokenInput.trim());
    setIsTokenSaved(true);
    setRateLimit(GitHubService.getRateLimit());
    const profile = await GitHubAuthService.getUserProfile();
    setUserProfile(profile);
    setTimeout(() => setIsTokenSaved(false), 2200);
  };

  const handleOpenLocalFolder = async () => {
    setIsScanningLocal(true);
    setLocalScanError(null);
    try {
      const result = await openLocalDirectoryInBrowser();
      // Navigate into repository workspace with local metadata
      navigate(`/repository/local/${result.projectName}`);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setLocalScanError(err.message || 'Failed to open local directory');
      }
    } finally {
      setIsScanningLocal(false);
    }
  };

  const runAllDiagnostics = async () => {
    setIsRunningDiagnostics(true);

    // 1. File System Access Check
    const hasFSA = isFileSystemAccessSupported();
    setDiagnostics((prev) =>
      prev.map((d) =>
        d.id === 'fs-access'
          ? {
              ...d,
              status: hasFSA ? 'passed' : 'warning',
              detail: hasFSA
                ? 'Supported. Native directory picker is ready for zero-install local scanning.'
                : 'Not available in this browser. Use Chrome, Edge, or run "npx domoscope serve" for local repos.',
              remedy: hasFSA ? undefined : 'Recommended: Use a Chromium browser or the npm CLI studio.',
            }
          : d
      )
    );

    // 2. Web Crypto AES-GCM Check
    let hasCrypto = false;
    try {
      const testEnc = await CryptoService.encrypt('domoscope_diag_test');
      const testDec = await CryptoService.decrypt(testEnc);
      hasCrypto = testDec === 'domoscope_diag_test';
    } catch {
      hasCrypto = false;
    }
    setDiagnostics((prev) =>
      prev.map((d) =>
        d.id === 'web-crypto'
          ? {
              ...d,
              status: hasCrypto ? 'passed' : 'failed',
              detail: hasCrypto
                ? 'Operational. AES-GCM 256-bit PBKDF2 encryption hardware-accelerated.'
                : 'Web Cryptography Subtle API failed.',
            }
          : d
      )
    );

    // 3. Persistent IndexedDB Check
    let idbPassed = false;
    let idbLatency = 0;
    try {
      const start = performance.now();
      await StorageService.setSetting('domoscope_health_check', Date.now());
      const val = await StorageService.getSetting('domoscope_health_check', 0);
      idbLatency = Math.round(performance.now() - start);
      idbPassed = Boolean(val);
    } catch {
      idbPassed = false;
    }
    setDiagnostics((prev) =>
      prev.map((d) =>
        d.id === 'indexeddb'
          ? {
              ...d,
              status: idbPassed ? 'passed' : 'failed',
              detail: idbPassed
                ? `Persistent storage is healthy. Read/write latency: ${idbLatency}ms.`
                : 'IndexedDB is inaccessible (check browser privacy/incognito restrictions).',
              latencyMs: idbLatency,
            }
          : d
      )
    );

    // 4. GitHub API Gateway Ping
    let ghPassed = false;
    let ghDetail = '';
    let ghLatency = 0;
    try {
      const start = performance.now();
      const res = await fetch('https://api.github.com/rate_limit', {
        headers: tokenInput ? { Authorization: `Bearer ${tokenInput}` } : {},
      });
      ghLatency = Math.round(performance.now() - start);
      if (res.ok) {
        const data = await res.json();
        const rem = data.rate?.remaining ?? 0;
        const lim = data.rate?.limit ?? 60;
        ghPassed = true;
        ghDetail = `Connected in ${ghLatency}ms. Active Quota: ${rem}/${lim} requests/hr.`;
        setRateLimit({
          remaining: rem,
          limit: lim,
          isAuthenticated: Boolean(tokenInput),
          resetTime: data.rate?.reset ? new Date(data.rate.reset * 1000) : undefined,
        });
      } else {
        ghDetail = `HTTP ${res.status}: Rate limited or network blockage.`;
      }
    } catch {
      ghDetail = 'Could not reach api.github.com (offline or network firewall).';
    }
    setDiagnostics((prev) =>
      prev.map((d) =>
        d.id === 'github-gateway'
          ? {
              ...d,
              status: ghPassed ? 'passed' : 'warning',
              detail: ghDetail,
              latencyMs: ghLatency,
              remedy: ghPassed ? undefined : 'Connect a Personal Access Token in the Auth tab.',
            }
          : d
      )
    );

    // 5. Local Daemon Check
    let daemonPassed = false;
    let daemonLatency = 0;
    try {
      const start = performance.now();
      const res = await fetch('http://localhost:4004/api/health', {
        signal: AbortSignal.timeout(1500),
      });
      daemonLatency = Math.round(performance.now() - start);
      daemonPassed = res.ok;
    } catch {
      daemonPassed = false;
    }
    setDiagnostics((prev) =>
      prev.map((d) =>
        d.id === 'local-daemon'
          ? {
              ...d,
              status: daemonPassed ? 'passed' : 'warning',
              detail: daemonPassed
                ? `Active at http://localhost:4004 (response ${daemonLatency}ms).`
                : 'Local daemon not detected on port 4004. Run "npx domoscope serve" in your project.',
              latencyMs: daemonLatency || undefined,
              remedy: daemonPassed ? undefined : 'Run "npx domoscope serve" in any local directory to enable.',
            }
          : d
      )
    );

    setIsRunningDiagnostics(false);
  };

  const filteredMcpTools = useMemo(() => {
    if (!mcpSearchQuery.trim()) return DOMOSCOPE_MCP_TOOLS;
    const q = mcpSearchQuery.toLowerCase();
    return DOMOSCOPE_MCP_TOOLS.filter(
      (t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
    );
  }, [mcpSearchQuery]);

  return (
    <div className="min-h-screen bg-white text-zinc-900 flex flex-col selection:bg-zinc-900 selection:text-white font-sans relative">
      <BackgroundCanvas />

      {/* Top Sticky App Navigation */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200 bg-white/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-13 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 group">
              <img
                src="/domoscope.png"
                alt="DomoScope"
                className="w-8 h-8 rounded-xl object-contain bg-zinc-950 p-0.5 border border-zinc-200 group-hover:scale-105 transition-transform shadow-xs"
              />
              <span className="font-extrabold text-base tracking-tight text-zinc-900">DomoScope</span>
            </Link>
            <span className="text-zinc-300">/</span>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-zinc-100 border border-zinc-200 rounded-lg text-xs font-mono text-zinc-700">
              <Terminal className="w-3.5 h-3.5 text-zinc-900" />
              <span className="font-semibold">Setup & Developer Experience</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {userProfile ? (
              <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-mono">
                <img
                  src={userProfile.avatarUrl}
                  alt={userProfile.login}
                  className="w-4 h-4 rounded-full border border-zinc-300"
                />
                <span className="text-zinc-900 font-bold">@{userProfile.login}</span>
                <span className="bg-zinc-900 text-white text-[10px] px-1.5 py-0.2 rounded font-bold">5k</span>
              </div>
            ) : (
              <button
                onClick={() => setActiveTab('auth')}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-zinc-900 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-zinc-900" />
                <span>Connect Token (+5k Limit)</span>
              </button>
            )}

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer"
              title="Settings"
              aria-label="Settings"
            >
              <Sliders className="w-4 h-4" />
            </button>

            <a
              href="https://github.com/darknecrocities/DomoScope"
              target="_blank"
              rel="noreferrer"
              className="p-1.5 text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 rounded-xl transition-colors"
              title="GitHub Repository"
              aria-label="GitHub Repository"
            >
              <GitHubIcon className="w-4 h-4" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Page Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-8">
        {/* Editorial Hero Header */}
        <section className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-100 border border-zinc-200 rounded-full text-xs font-mono text-zinc-800">
            <Sparkles className="w-3.5 h-3.5 text-zinc-900" />
            <span>Developer Experience, Local CLI & AI Agent Architecture</span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-950">
                Setup, CLI & Model Context Protocol (MCP)
              </h1>
              <p className="text-sm text-zinc-600 leading-relaxed">
                Connect external AI coding agents (Claude, Cursor, Antigravity, Windsurf) directly to DomoScope, run deep AST codebase reverse-engineering on your local machine with zero-cloud leakage, and unlock 5,000 req/hr GitHub quotas.
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={handleOpenLocalFolder}
                disabled={isScanningLocal}
                className="px-4 py-2 bg-zinc-900 hover:bg-black text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                <FolderOpen className="w-4 h-4" />
                <span>{isScanningLocal ? 'Analyzing Local Folder...' : 'Open Local Directory'}</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('diagnostics');
                  runAllDiagnostics();
                }}
                className="px-4 py-2 bg-white hover:bg-zinc-50 border border-zinc-300 text-zinc-900 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                <Activity className="w-4 h-4 text-zinc-900" />
                <span>Run Browser Diagnostics</span>
              </button>
            </div>
          </div>

          {localScanError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{localScanError}</span>
            </div>
          )}

          {/* Core Capabilities Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {[
              { label: '16 MCP Agent Tools', desc: 'Architecture, AST, ERD & Blast Radius', icon: Cpu },
              { label: 'npm / npx CLI Suite', desc: '8 subcommands + incremental watcher', icon: Terminal },
              { label: 'Zero Cloud Leakage', desc: '100% Client-side & local processing', icon: ShieldCheck },
              { label: '5,000 req/hr Quota', desc: 'Client-side AES-GCM 256 encryption', icon: Zap },
            ].map((card, i) => {
              const Icon = card.icon;
              return (
                <div
                  key={i}
                  className="p-3.5 bg-zinc-50/70 border border-zinc-200 rounded-xl space-y-1 hover:border-zinc-300 transition-colors"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 font-mono">
                    <Icon className="w-3.5 h-3.5 text-zinc-900" />
                    <span>{card.label}</span>
                  </div>
                  <div className="text-[11px] text-zinc-500">{card.desc}</div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Interactive Tab Navigation */}
        <section className="space-y-6">
          <div className="flex border-b border-zinc-200 overflow-x-auto text-xs font-mono">
            {[
              { id: 'cli', label: '1. CLI & Subcommands', icon: Terminal },
              { id: 'mcp', label: '2. AI Agent MCP Protocol', icon: Cpu },
              { id: 'local', label: '3. Local Studio & DX', icon: Laptop },
              { id: 'auth', label: '4. GitHub Token & Quota', icon: Key },
              { id: 'diagnostics', label: '5. Browser Diagnostics', icon: Activity },
              { id: 'cicd', label: '6. CI/CD GitHub Actions', icon: GitBranch },
            ].map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as SetupTab)}
                  className={`py-3 px-4 border-b-2 font-medium transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                    isSelected
                      ? 'border-zinc-950 text-zinc-950 font-bold bg-zinc-50/50'
                      : 'border-transparent text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50/30'
                  }`}
                >
                  <Icon className="w-4 h-4 text-zinc-900" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: CLI QUICKSTART */}
          {activeTab === 'cli' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Package Manager Quick Selector */}
              <div className="p-5 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-zinc-900 font-mono flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-zinc-900" />
                      Zero-Install Quickstart
                    </h3>
                    <p className="text-xs text-zinc-600">
                      Run DomoScope immediately without installing, or install globally on your machine.
                    </p>
                  </div>

                  {/* Package manager toggle buttons */}
                  <div className="flex bg-white border border-zinc-200 p-1 rounded-xl gap-1">
                    {(['npx', 'npm', 'pnpm', 'yarn', 'bun'] as const).map((pm) => (
                      <button
                        key={pm}
                        onClick={() => setPackageManager(pm)}
                        className={`px-2.5 py-1 text-xs font-mono rounded-lg transition-all cursor-pointer ${
                          packageManager === pm
                            ? 'bg-zinc-900 text-white font-bold'
                            : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                        }`}
                      >
                        {pm}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Command Preview */}
                <div className="relative group">
                  <pre className="p-3.5 bg-zinc-950 text-zinc-100 rounded-xl font-mono text-xs overflow-x-auto border border-zinc-800">
                    {packageManager === 'npx' && '# Run instant diagnostic check\nnpx domoscope doctor\n\n# Analyze local repository & launch visual studio\nnpx domoscope serve'}
                    {packageManager === 'npm' && '# Install globally\nnpm install -g domoscope\n\n# Analyze current project\ndomoscope analyze .'}
                    {packageManager === 'pnpm' && '# Install globally\npnpm add -g domoscope\n\n# Analyze current project\ndomoscope analyze .'}
                    {packageManager === 'yarn' && '# Install globally\nyarn global add domoscope\n\n# Analyze current project\ndomoscope analyze .'}
                    {packageManager === 'bun' && '# Install globally\nbun add -g domoscope\n\n# Analyze current project\ndomoscope analyze .'}
                  </pre>
                  <button
                    onClick={() =>
                      handleCopy(
                        'pm-command',
                        packageManager === 'npx'
                          ? 'npx domoscope doctor && npx domoscope serve'
                          : `${packageManager === 'yarn' ? 'yarn global add' : packageManager === 'bun' ? 'bun add -g' : packageManager === 'pnpm' ? 'pnpm add -g' : 'npm i -g'} domoscope`
                      )
                    }
                    className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-[11px] font-mono flex items-center gap-1.5 transition-colors cursor-pointer border border-zinc-700"
                  >
                    {copiedKey === 'pm-command' ? (
                      <>
                        <CheckCheck className="w-3.5 h-3.5 text-white" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-zinc-300" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Subcommands Explorer */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider font-mono">
                    Complete CLI Subcommand Suite
                  </h3>
                  <span className="text-xs text-zinc-500 font-mono">8 Subcommands</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    {
                      cmd: 'domoscope doctor',
                      desc: 'Verifies Node.js (>=18), Git installation, repository root, disk cache directory, and optional GitHub authentication.',
                      flags: ['--verbose'],
                      example: 'npx domoscope doctor',
                    },
                    {
                      cmd: 'domoscope analyze [path]',
                      desc: 'Runs full local static analysis on AST, framework detection, database ERD, API routes, dependencies, and security findings.',
                      flags: ['--json', '--branch <name>'],
                      example: 'npx domoscope analyze . --json',
                    },
                    {
                      cmd: 'domoscope serve',
                      desc: 'Starts the local visualizer studio daemon and live SSE background server at http://localhost:4004.',
                      flags: ['--port <num>', '--no-open'],
                      example: 'npx domoscope serve --port 4004',
                    },
                    {
                      cmd: 'domoscope mcp',
                      desc: 'Launches the stdio Model Context Protocol server exposing 16 reverse-engineering tools to external AI coding agents.',
                      flags: ['--watch'],
                      example: 'npx domoscope mcp',
                    },
                    {
                      cmd: 'domoscope graph',
                      desc: 'Exports architecture and module dependency relationships into structured formats (Mermaid, GraphViz DOT, or JSON).',
                      flags: ['--format <mermaid|dot|json>', '--output <file>'],
                      example: 'npx domoscope graph --format mermaid',
                    },
                    {
                      cmd: 'domoscope docs',
                      desc: 'Generates a complete 6-file reverse-engineering markdown documentation suite in the target directory.',
                      flags: ['--output <dir>'],
                      example: 'npx domoscope docs --output ./domoscope-docs',
                    },
                    {
                      cmd: 'domoscope watch',
                      desc: 'Incremental filesystem watcher daemon with instantaneous AST re-indexing and hot cache invalidation.',
                      flags: ['--debounce <ms>'],
                      example: 'npx domoscope watch',
                    },
                    {
                      cmd: 'domoscope init',
                      desc: 'Scaffolds a local .domoscope.json configuration file with custom ignore rules, entrypoints, and architecture layers.',
                      flags: ['--force'],
                      example: 'npx domoscope init',
                    },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-white border border-zinc-200 rounded-xl space-y-2 hover:border-zinc-400 transition-all shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <code className="text-xs font-bold text-zinc-950 font-mono bg-zinc-100 px-2 py-0.5 rounded-md border border-zinc-200">
                          {item.cmd}
                        </code>
                        <button
                          onClick={() => handleCopy(`cmd-${idx}`, item.example)}
                          className="p-1 text-zinc-500 hover:text-zinc-900 rounded transition-colors cursor-pointer"
                          title="Copy command"
                        >
                          {copiedKey === `cmd-${idx}` ? (
                            <CheckCheck className="w-3.5 h-3.5 text-zinc-950" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-zinc-600 leading-relaxed font-sans">{item.desc}</p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {item.flags.map((f, fi) => (
                          <span
                            key={fi}
                            className="text-[10px] font-mono bg-zinc-50 text-zinc-600 px-1.5 py-0.5 rounded border border-zinc-200"
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AI AGENT MCP PROTOCOL */}
          {activeTab === 'mcp' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="p-5 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-950 animate-pulse" />
                    <h3 className="text-sm font-bold text-zinc-900 font-mono uppercase tracking-wider">
                      Model Context Protocol (MCP) Server Active
                    </h3>
                  </div>
                  <p className="text-xs text-zinc-600 leading-relaxed">
                    External AI coding assistants (Claude Desktop, Cursor, Antigravity, Windsurf) connect to DomoScope's MCP server to inspect codebases, execute reverse-engineering queries, extract ERDs, and calculate blast radius without manual prompt stuffing.
                  </p>
                </div>

                {/* Client Selector */}
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-bold text-zinc-900 font-mono uppercase">
                    Select Your AI Coding Agent Client
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      { id: 'claude', label: 'Claude Desktop' },
                      { id: 'cursor', label: 'Cursor IDE' },
                      { id: 'antigravity', label: 'Google Antigravity' },
                      { id: 'windsurf', label: 'Windsurf / Cline' },
                      { id: 'remote', label: 'Remote Vercel SSE' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setMcpClient(item.id as any)}
                        className={`py-2 px-3 rounded-xl border text-xs font-mono transition-all text-center cursor-pointer ${
                          mcpClient === item.id
                            ? 'border-zinc-950 bg-zinc-950 text-white font-bold shadow-xs'
                            : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Configuration Snippet Generator */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-zinc-500 font-mono">
                    <span>
                      {mcpClient === 'claude' && 'File: ~/Library/Application Support/Claude/claude_desktop_config.json (macOS)'}
                      {mcpClient === 'cursor' && 'File: .cursor/mcp.json in workspace or Cursor Settings -> Features -> MCP'}
                      {mcpClient === 'antigravity' && 'File: antigravity.json in AGY workspace or global config'}
                      {mcpClient === 'windsurf' && 'File: ~/.codeium/windsurf/mcp_config.json'}
                      {mcpClient === 'remote' && 'Transport: Server-Sent Events (SSE) / JSON-RPC over HTTP'}
                    </span>
                  </div>

                  <div className="relative group">
                    <pre className="p-4 bg-zinc-950 text-zinc-100 rounded-xl font-mono text-xs overflow-x-auto border border-zinc-800 leading-relaxed">
                      {(() => {
                        const origin =
                          typeof window !== 'undefined' && window.location.origin
                            ? window.location.origin
                            : 'https://domoscope.vercel.app';
                        const tokenStr = tokenInput ? tokenInput : 'OPTIONAL_GITHUB_PAT';

                        if (mcpClient === 'claude') {
                          return JSON.stringify(
                            {
                              mcpServers: {
                                domoscope: {
                                  command: 'node',
                                  args: ['/path/to/domoscope/bin/domoscope-mcp.js'],
                                  env: {
                                    GITHUB_TOKEN: tokenStr,
                                  },
                                },
                              },
                            },
                            null,
                            2
                          );
                        }

                        if (mcpClient === 'cursor') {
                          return JSON.stringify(
                            {
                              mcpServers: {
                                domoscope: {
                                  command: 'npx',
                                  args: ['-y', 'domoscope', 'mcp'],
                                  env: {
                                    GITHUB_TOKEN: tokenStr,
                                  },
                                },
                              },
                            },
                            null,
                            2
                          );
                        }

                        if (mcpClient === 'antigravity') {
                          return JSON.stringify(
                            {
                              mcpServers: {
                                domoscope: {
                                  command: 'node',
                                  args: ['/path/to/domoscope/bin/domoscope-mcp.js'],
                                },
                              },
                            },
                            null,
                            2
                          );
                        }

                        if (mcpClient === 'windsurf') {
                          return JSON.stringify(
                            {
                              mcpServers: {
                                domoscope: {
                                  command: 'npx',
                                  args: ['-y', 'domoscope', 'mcp'],
                                },
                              },
                            },
                            null,
                            2
                          );
                        }

                        return JSON.stringify(
                          {
                            mcpServers: {
                              domoscope: {
                                url: `${origin}/api/mcp`,
                                headers: tokenInput ? { Authorization: `Bearer ${tokenInput}` } : {},
                              },
                            },
                          },
                          null,
                          2
                        );
                      })()}
                    </pre>

                    <button
                      onClick={() => {
                        const origin =
                          typeof window !== 'undefined' && window.location.origin
                            ? window.location.origin
                            : 'https://domoscope.vercel.app';
                        const tokenStr = tokenInput ? tokenInput : '';
                        let text = '';
                        if (mcpClient === 'remote') {
                          text = JSON.stringify(
                            {
                              mcpServers: {
                                domoscope: {
                                  url: `${origin}/api/mcp`,
                                  headers: tokenStr ? { Authorization: `Bearer ${tokenStr}` } : {},
                                },
                              },
                            },
                            null,
                            2
                          );
                        } else {
                          text = JSON.stringify(
                            {
                              mcpServers: {
                                domoscope: {
                                  command: 'node',
                                  args: ['/path/to/domoscope/bin/domoscope-mcp.js'],
                                  env: tokenStr ? { GITHUB_TOKEN: tokenStr } : {},
                                },
                              },
                            },
                            null,
                            2
                          );
                        }
                        handleCopy('mcp-config-json', text);
                      }}
                      className="absolute top-3 right-3 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer border border-zinc-700"
                    >
                      {copiedKey === 'mcp-config-json' ? (
                        <>
                          <CheckCheck className="w-3.5 h-3.5 text-white" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-zinc-300" />
                          <span>Copy Config JSON</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* 16 MCP Tools Catalog */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider font-mono">
                      16 Registered MCP Tools Catalog
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Standardized tools automatically exposed to your AI agents for tool calling.
                    </p>
                  </div>

                  <input
                    type="text"
                    placeholder="Search MCP tools..."
                    value={mcpSearchQuery}
                    onChange={(e) => setMcpSearchQuery(e.target.value)}
                    className="px-3 py-1.5 text-xs font-mono bg-white border border-zinc-300 rounded-xl focus:outline-none focus:border-zinc-900 w-full sm:w-64 text-zinc-900"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[480px] overflow-y-auto pr-1">
                  {filteredMcpTools.map((tool) => (
                    <div
                      key={tool.name}
                      className="p-3.5 bg-white border border-zinc-200 rounded-xl space-y-1.5 hover:border-zinc-400 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <code className="text-xs font-bold text-zinc-900 font-mono bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                          {tool.name}
                        </code>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {Object.keys(tool.inputSchema.properties || {}).length} args
                        </span>
                      </div>
                      <p className="text-xs text-zinc-600 leading-relaxed font-sans">{tool.description}</p>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {Object.entries(tool.inputSchema.properties || {}).map(([propName, propDef]: [string, any]) => (
                          <span
                            key={propName}
                            className="text-[10px] font-mono text-zinc-500 bg-zinc-50 border border-zinc-200 px-1.5 py-0.5 rounded"
                            title={propDef.description}
                          >
                            {propName}
                            {tool.inputSchema.required?.includes(propName) ? '*' : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sample AI Agent Prompts */}
              <div className="p-5 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-3">
                <h4 className="text-xs font-bold text-zinc-900 font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-zinc-900" />
                  Sample Prompts to Give Your AI Agent
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                  {[
                    'Using the DomoScope MCP server, analyze this local repository and generate a complete architecture blueprint.',
                    'Call get_database_erd on this project and produce the SQL schema along with foreign key relations.',
                    'Audit our API endpoints and security posture using DomoScope get_api_catalog and get_security_audit.',
                    'Calculate the blast radius of refactoring src/services/auth.ts using calculate_blast_radius.',
                  ].map((promptText, pi) => (
                    <div
                      key={pi}
                      onClick={() => handleCopy(`prompt-${pi}`, promptText)}
                      className="p-3 bg-white border border-zinc-200 rounded-xl hover:border-zinc-400 transition-colors cursor-pointer group flex items-start justify-between gap-2"
                    >
                      <span className="text-zinc-700 leading-relaxed text-[11px] font-sans">
                        &ldquo;{promptText}&rdquo;
                      </span>
                      <span className="shrink-0 text-zinc-400 group-hover:text-zinc-900 transition-colors">
                        {copiedKey === `prompt-${pi}` ? (
                          <CheckCheck className="w-3.5 h-3.5 text-zinc-950" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LOCAL STUDIO & BROWSER ACCESS */}
          {activeTab === 'local' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Method 1: In-Browser File System Access */}
                <div className="p-6 bg-white border border-zinc-200 rounded-2xl space-y-4 flex flex-col justify-between shadow-xs">
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-zinc-100 border border-zinc-200 rounded-lg text-xs font-mono text-zinc-800">
                      <Globe className="w-3.5 h-3.5 text-zinc-900" />
                      <span>Zero-Install In-Browser</span>
                    </div>
                    <h3 className="text-base font-bold text-zinc-900">
                      Direct Folder Explorer (File System Access API)
                    </h3>
                    <p className="text-xs text-zinc-600 leading-relaxed">
                      Select any project folder directly from your hard drive using Chromium's native File System Access API. DomoScope parses ASTs, dependencies, schemas, and routes entirely in client-side memory without uploading a single line of code.
                    </p>
                    <ul className="text-xs text-zinc-600 space-y-1.5 list-disc pl-4 font-sans">
                      <li>Zero CLI or package installation needed</li>
                      <li>100% private: no code sent to servers</li>
                      <li>Instant interactive workspace with full tabs</li>
                    </ul>
                  </div>

                  <button
                    onClick={handleOpenLocalFolder}
                    disabled={isScanningLocal}
                    className="w-full py-2.5 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs disabled:opacity-50"
                  >
                    <FolderOpen className="w-4 h-4" />
                    <span>{isScanningLocal ? 'Scanning local directory...' : 'Select Local Project Folder'}</span>
                  </button>
                </div>

                {/* Method 2: Local Studio Server */}
                <div className="p-6 bg-white border border-zinc-200 rounded-2xl space-y-4 flex flex-col justify-between shadow-xs">
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-zinc-100 border border-zinc-200 rounded-lg text-xs font-mono text-zinc-800">
                      <Laptop className="w-3.5 h-3.5 text-zinc-900" />
                      <span>CLI Background Studio</span>
                    </div>
                    <h3 className="text-base font-bold text-zinc-900">
                      Local Studio Daemon (`domoscope serve`)
                    </h3>
                    <p className="text-xs text-zinc-600 leading-relaxed">
                      Launch a fast Node.js background server running at <code>http://localhost:4004</code>. Features live incremental file watching, hot AST cache updates, and bidirectional SSE sync for external IDE tools.
                    </p>
                    <div className="p-3 bg-zinc-950 text-zinc-100 font-mono text-xs rounded-xl border border-zinc-800">
                      npx domoscope serve --port 4004
                    </div>
                  </div>

                  <button
                    onClick={() => handleCopy('serve-cmd', 'npx domoscope serve')}
                    className="w-full py-2.5 bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-zinc-900 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    {copiedKey === 'serve-cmd' ? (
                      <>
                        <CheckCheck className="w-4 h-4 text-zinc-950" />
                        <span>Copied Command!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-zinc-700" />
                        <span>Copy `domoscope serve`</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Privacy Architecture Guarantee Card */}
              <div className="p-5 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 font-mono">
                  <ShieldCheck className="w-4 h-4 text-zinc-900" />
                  <span>Privacy Guarantee: Zero Cloud Leakage</span>
                </div>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  DomoScope was engineered from day one as a local-first platform. All TypeScript/JavaScript AST parsing, regex route extractors, SQL table detectors, and dependency graph builders execute in your browser thread or local Node runtime. Your intellectual property never touches any third-party AI proxy unless you explicitly configure an AI provider key.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: GITHUB AUTHENTICATION & QUOTA */}
          {activeTab === 'auth' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Rate Limit Comparison Card */}
              <div className="p-5 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider font-mono flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-zinc-900" />
                      Live GitHub API Quota
                    </span>
                    <p className="text-xs text-zinc-600">
                      GitHub imposes a strict 60 req/hr rate limit on unauthenticated clients. Adding a Personal Access Token upgrades your quota to 5,000 req/hr.
                    </p>
                  </div>

                  <div className="px-3.5 py-1.5 bg-white border border-zinc-300 rounded-xl font-mono text-xs font-bold text-zinc-950 shadow-xs">
                    {rateLimit.remaining} / {rateLimit.limit} req/hr
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs font-sans">
                  <div className="p-4 bg-white border border-zinc-200 rounded-xl space-y-1.5">
                    <div className="font-bold text-zinc-900 font-mono">Unauthenticated Mode</div>
                    <div className="text-zinc-500 text-xs">60 requests/hour IP-based limit. Sufficient for occasional quick inspection.</div>
                  </div>
                  <div className="p-4 bg-white border border-zinc-900 rounded-xl space-y-1.5 shadow-xs">
                    <div className="font-bold text-zinc-950 font-mono flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-zinc-950" />
                      <span>Authenticated Mode (Recommended)</span>
                    </div>
                    <div className="text-zinc-600 text-xs">
                      5,000 requests/hour. Seamless multi-repository switching and complete file tree recursion.
                    </div>
                  </div>
                </div>
              </div>

              {/* In-Page Token Input Form */}
              <form onSubmit={handleSaveToken} className="p-6 bg-white border border-zinc-200 rounded-2xl space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold text-zinc-900 font-mono">
                    <Key className="w-4 h-4 text-zinc-900" />
                    <span>Personal Access Token (PAT)</span>
                  </div>
                  {tokenInput && (
                    <span className="text-[10px] font-mono text-zinc-500">
                      AES-GCM Encrypted: {CryptoService.maskToken(tokenInput)}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <input
                    type="password"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx or github_pat_xxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-3.5 py-2.5 text-xs font-mono bg-zinc-50 border border-zinc-300 rounded-xl focus:outline-none focus:border-zinc-900 focus:bg-white text-zinc-900 transition-colors"
                  />
                  <p className="text-[11px] text-zinc-500 leading-relaxed font-sans">
                    Tokens are saved exclusively in your browser's IndexedDB encrypted with AES-GCM 256-bit PBKDF2 keys. They are never sent to DomoScope servers.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <a
                    href="https://github.com/settings/tokens/new?description=DomoScope%20Token&scopes=public_repo"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-zinc-700 hover:text-zinc-950 flex items-center gap-1 font-semibold underline"
                  >
                    <span>Generate token on GitHub (public_repo scope)</span>
                    <ExternalLink className="w-3 h-3 text-zinc-400" />
                  </a>

                  <button
                    type="submit"
                    className="px-5 py-2 bg-zinc-900 hover:bg-black text-white text-xs font-semibold rounded-xl flex items-center gap-2 cursor-pointer shadow-xs transition-colors"
                  >
                    {isTokenSaved ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-white" />
                        <span>Saved & Active!</span>
                      </>
                    ) : (
                      <span>Save & Encrypt Token</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 5: LIVE BROWSER SYSTEM DIAGNOSTICS */}
          {activeTab === 'diagnostics' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="p-5 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-zinc-900 font-mono uppercase tracking-wider flex items-center gap-2">
                      <Activity className="w-4 h-4 text-zinc-900" />
                      Browser Environment Diagnostics (&ldquo;Browser Doctor&rdquo;)
                    </h3>
                    <p className="text-xs text-zinc-600">
                      Live automated health check verifying your browser's native capabilities, cryptographic vault, network latency, and daemon connectivity.
                    </p>
                  </div>

                  <button
                    onClick={runAllDiagnostics}
                    disabled={isRunningDiagnostics}
                    className="px-4 py-2 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs transition-colors shrink-0 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRunningDiagnostics ? 'animate-spin' : ''}`} />
                    <span>{isRunningDiagnostics ? 'Testing APIs...' : 'Run All Health Checks'}</span>
                  </button>
                </div>

                {/* Diagnostic Cards */}
                <div className="space-y-3 pt-2">
                  {diagnostics.map((diag) => {
                    return (
                      <div
                        key={diag.id}
                        className="p-4 bg-white border border-zinc-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {diag.status === 'passed' && <CheckCircle2 className="w-4 h-4 text-zinc-900" />}
                            {diag.status === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600" />}
                            {diag.status === 'failed' && <XCircle className="w-4 h-4 text-red-600" />}
                            {diag.status === 'idle' && <Activity className="w-4 h-4 text-zinc-400" />}
                            <span className="text-xs font-bold text-zinc-900 font-mono">{diag.name}</span>
                          </div>
                          <p className="text-xs text-zinc-600 font-sans">{diag.detail}</p>
                          {diag.remedy && (
                            <p className="text-[11px] text-zinc-500 italic font-sans">{diag.remedy}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {diag.latencyMs !== undefined && (
                            <span className="text-[11px] font-mono text-zinc-500">{diag.latencyMs}ms</span>
                          )}
                          <span
                            className={`px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold capitalize ${
                              diag.status === 'passed'
                                ? 'bg-zinc-900 text-white'
                                : diag.status === 'warning'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : diag.status === 'failed'
                                ? 'bg-red-100 text-red-900 border border-red-300'
                                : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                            }`}
                          >
                            {diag.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: CI/CD GITHUB ACTIONS AUTOMATION */}
          {activeTab === 'cicd' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="p-5 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-zinc-900 font-mono uppercase tracking-wider flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-zinc-900" />
                    Autonomous Reverse-Engineering CI/CD Action
                  </h3>
                  <p className="text-xs text-zinc-600 leading-relaxed">
                    Automatically generate up-to-date architecture diagrams, markdown specs, and database ERD schemas on every Git push with GitHub Actions.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-zinc-500 font-mono">
                    <span>File: .github/workflows/domoscope-analysis.yml</span>
                  </div>

                  <div className="relative group">
                    <pre className="p-4 bg-zinc-950 text-zinc-100 rounded-xl font-mono text-xs overflow-x-auto border border-zinc-800 leading-relaxed">
{`name: DomoScope Architecture & Spec Generator

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  analyze-codebase:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Run DomoScope Diagnostics
        run: npx domoscope doctor

      - name: Generate Reverse-Engineering Specs & Graphs
        run: |
          npx domoscope graph --format mermaid > ARCHITECTURE.mermaid
          npx domoscope docs --output ./docs/domoscope

      - name: Upload Architecture Artifacts
        uses: actions/upload-artifact@v4
        with:
          name: domoscope-specs
          path: |
            ARCHITECTURE.mermaid
            docs/domoscope/`}
                    </pre>

                    <button
                      onClick={() =>
                        handleCopy(
                          'cicd-yaml',
                          `name: DomoScope Architecture & Spec Generator\n\non:\n  push:\n    branches: [main, master]\n  pull_request:\n    branches: [main, master]\n\njobs:\n  analyze-codebase:\n    runs-on: ubuntu-latest\n    steps:\n      - name: Checkout Repository\n        uses: actions/checkout@v4\n      - name: Setup Node.js\n        uses: actions/setup-node@v4\n        with:\n          node-version: 20\n      - name: Run DomoScope Diagnostics\n        run: npx domoscope doctor\n      - name: Generate Reverse-Engineering Specs & Graphs\n        run: |\n          npx domoscope graph --format mermaid > ARCHITECTURE.mermaid\n          npx domoscope docs --output ./docs/domoscope\n      - name: Upload Architecture Artifacts\n        uses: actions/upload-artifact@v4\n        with:\n          name: domoscope-specs\n          path: |\n            ARCHITECTURE.mermaid\n            docs/domoscope/`
                        )
                      }
                      className="absolute top-3 right-3 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer border border-zinc-700"
                    >
                      {copiedKey === 'cicd-yaml' ? (
                        <>
                          <CheckCheck className="w-3.5 h-3.5 text-white" />
                          <span>Copied YAML!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-zinc-300" />
                          <span>Copy Workflow YAML</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 py-8 px-4 bg-white mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-900 tracking-tight">DomoScope</span>
            <span className="text-zinc-300">&bull;</span>
            <span>Developer Experience Platform & MCP Protocol</span>
          </div>

          <div className="flex items-center gap-6 font-mono">
            <Link to="/" className="hover:text-zinc-900 transition-colors">
              Home
            </Link>
            <a
              href="https://github.com/darknecrocities/DomoScope#readme"
              target="_blank"
              rel="noreferrer"
              className="hover:text-zinc-900 transition-colors"
            >
              Docs
            </a>
            <a
              href="https://github.com/darknecrocities/DomoScope"
              target="_blank"
              rel="noreferrer"
              className="hover:text-zinc-900 flex items-center gap-1.5 transition-colors"
            >
              <GitHubIcon className="w-3.5 h-3.5" />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </footer>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}
