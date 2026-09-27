import { useState, useEffect, useRef } from 'react';
import { RotateCcw, Check, Terminal, Cpu, Network, Shield, FileCode } from 'lucide-react';

interface RepoPreset {
  name: string;
  totalFiles: number;
  language: string;
  entry: string;
  tables: number;
}

const PRESETS: RepoPreset[] = [
  { name: 'facebook/react', totalFiles: 7193, language: 'TypeScript', entry: 'packages/react/index.js', tables: 0 },
  { name: 'fastapi/fastapi', totalFiles: 1420, language: 'Python', entry: 'fastapi/main.py', tables: 0 },
  { name: 'prisma/prisma', totalFiles: 3890, language: 'TypeScript', entry: 'packages/client/src/index.ts', tables: 16 },
  { name: 'tailwindlabs/tailwindcss', totalFiles: 2140, language: 'JavaScript', entry: 'src/index.js', tables: 0 },
];

export function ScrapingSimulator() {
  const [selectedRepo, setSelectedRepo] = useState<RepoPreset>(PRESETS[0]);
  const [progress, setProgress] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const STAGES = [
    { name: '1. Loading Files', icon: Network, threshold: 25 },
    { name: '2. Sorting Parts', icon: FileCode, threshold: 50 },
    { name: '3. Linking Connections', icon: Cpu, threshold: 75 },
    { name: '4. Ready to Explore', icon: Shield, threshold: 100 },
  ];

  const startSimulation = (repo: RepoPreset) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setProgress(0);
    setIsRunning(true);
    setLogs([`[0.00s] Starting scan for ${repo.name}...`]);

    const startTime = Date.now();

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (timerRef.current) clearInterval(timerRef.current);
          setIsRunning(false);
          return 100;
        }

        const next = Math.min(100, prev + Math.floor(Math.random() * 5) + 3);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

        // Append log events based on milestones
        if (prev < 25 && next >= 25) {
          setLogs((l) => [
            ...l,
            `[${elapsed}s] Found and cataloged all ${repo.totalFiles.toLocaleString()} files in the project`,
          ]);
        } else if (prev < 50 && next >= 50) {
          setLogs((l) => [
            ...l,
            `[${elapsed}s] Sorted screens, data services, and settings. Main starting file: ${repo.entry}`,
          ]);
        } else if (prev < 75 && next >= 75) {
          setLogs((l) => [
            ...l,
            `[${elapsed}s] Discovered how files connect to each other and drew the visual layout`,
          ]);
        } else if (prev < 98 && next >= 98) {
          setLogs((l) => [
            ...l,
            repo.tables > 0
              ? `[${elapsed}s] Mapped ${repo.tables} database tables and their relationships`
              : `[${elapsed}s] Checked for potential security risks: all clear`,
            `[${elapsed}s] Workspace ready for interactive exploration & search`,
          ]);
        }

        return next;
      });
    }, 120);
  };

  useEffect(() => {
    startSimulation(selectedRepo);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [selectedRepo]);

  const currentScrapedFiles = Math.floor((progress / 100) * selectedRepo.totalFiles);

  return (
    <section className="py-20 px-4 max-w-5xl mx-auto border-t border-zinc-200">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 mb-3 rounded-full border border-zinc-200 bg-zinc-50 text-[11px] font-mono text-zinc-600">
          <Cpu className="w-3.5 h-3.5 text-zinc-700" />
          <span>Live Project Scanner</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-semibold text-zinc-900 tracking-tight">
          How DomoScope reads and organizes any project in seconds
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-zinc-500 max-w-xl mx-auto">
          No need to download massive files to your computer. DomoScope reads the project directly and builds your visual map right in your browser.
        </p>
      </div>

      {/* Main Interactive Simulation Card */}
      <div className="bg-white border border-zinc-200 rounded-xl shadow-lg overflow-hidden">
        {/* Top Control Bar & Repo Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-zinc-50 border-b border-zinc-200">
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-xs font-mono text-zinc-400 uppercase mr-1">Select Sample:</span>
            {PRESETS.map((p) => (
              <button
                key={p.name}
                onClick={() => {
                  setSelectedRepo(p);
                  startSimulation(p);
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors shrink-0 cursor-pointer ${
                  selectedRepo.name === p.name
                    ? 'bg-zinc-900 text-white shadow-2xs'
                    : 'bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => startSimulation(selectedRepo)}
              className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-800 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-zinc-500" />
              <span>Run Scan Again</span>
            </button>
          </div>
        </div>

        {/* Progress Bar & Metric Counters */}
        <div className="p-6 space-y-6">
          <div>
            <div className="flex items-center justify-between text-xs font-mono mb-2">
              <div className="flex items-center gap-2 text-zinc-900 font-semibold">
                <span className="w-2 h-2 rounded-full bg-zinc-900 animate-pulse" />
                <span>
                  {progress < 100
                    ? `Scanning & Organizing: ${selectedRepo.name}...`
                    : `Project Map Ready: ${selectedRepo.name}`}
                </span>
              </div>
              <span className="text-zinc-600 font-bold">{progress}%</span>
            </div>

            {/* Main Animated Progress Bar */}
            <div className="w-full h-3 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200">
              <div
                className="h-full bg-zinc-900 rounded-full transition-all duration-150 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* 4 Pipeline Stages */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {STAGES.map((stg, idx) => {
              const Icon = stg.icon;
              const isDone = progress >= stg.threshold;
              const isActive = progress < stg.threshold && (idx === 0 || progress >= STAGES[idx - 1].threshold);

              return (
                <div
                  key={stg.name}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    isDone
                      ? 'bg-zinc-50 border-zinc-300'
                      : isActive
                      ? 'bg-white border-zinc-900 shadow-xs ring-1 ring-zinc-900/10'
                      : 'bg-white border-zinc-100 text-zinc-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <Icon
                      className={`w-4 h-4 ${
                        isDone ? 'text-zinc-900' : isActive ? 'text-zinc-900' : 'text-zinc-300'
                      }`}
                    />
                    {isDone ? (
                      <Check className="w-3.5 h-3.5 text-zinc-900 font-bold" />
                    ) : isActive ? (
                      <span className="w-2 h-2 rounded-full bg-zinc-900 animate-ping" />
                    ) : (
                      <span className="text-[10px] font-mono text-zinc-300">○</span>
                    )}
                  </div>
                  <div
                    className={`text-xs font-semibold ${
                      isDone || isActive ? 'text-zinc-900' : 'text-zinc-400'
                    }`}
                  >
                    {stg.name}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Metrics summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-mono">
            <div>
              <span className="text-zinc-400 block text-[10px] uppercase">Files Scanned</span>
              <span className="text-sm font-bold text-zinc-900">
                {currentScrapedFiles.toLocaleString()} / {selectedRepo.totalFiles.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-zinc-400 block text-[10px] uppercase">Main Language</span>
              <span className="text-sm font-bold text-zinc-900">{selectedRepo.language}</span>
            </div>
            <div>
              <span className="text-zinc-400 block text-[10px] uppercase">Storage Mode</span>
              <span className="text-sm font-bold text-zinc-900">Fast Local Browser Memory</span>
            </div>
            <div>
              <span className="text-zinc-400 block text-[10px] uppercase">Safety Guarantee</span>
              <span className="text-sm font-bold text-zinc-900">100% Safe (Read-only)</span>
            </div>
          </div>

          {/* Streaming Monospace Terminal Window */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-xs font-mono text-zinc-300 shadow-inner">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800/80 text-[11px] text-zinc-400 select-none">
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-zinc-400" />
                <span>domoscope-scanner</span>
              </div>
              <span>Status: {progress === 100 ? 'READY' : 'SCANNING'}</span>
            </div>

            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {logs.map((log, i) => (
                <div key={i} className="leading-relaxed">
                  <span className="text-zinc-500 mr-1.5">&gt;</span>
                  <span>{log}</span>
                </div>
              ))}
              {isRunning && (
                <div className="flex items-center gap-1.5 text-zinc-500">
                  <span className="w-1.5 h-3.5 bg-zinc-400 animate-pulse" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
