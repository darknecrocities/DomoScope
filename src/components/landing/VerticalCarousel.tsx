import { useState } from 'react';
import {
  Layers,
  Database,
  Shield,
  Package,
  GitBranch,
  ArrowRight,
  FileCode,
  CheckCircle2,
  Key,
} from 'lucide-react';

const COLUMN_ONE_CARDS = [
  {
    icon: Layers,
    title: 'App.tsx → Dashboard.tsx',
    subtitle: 'Direct component import & lifecycle render',
    tag: 'Component Edge',
    detail: 'Imported via: import Dashboard from "./views/Dashboard"',
  },
  {
    icon: Database,
    title: 'User ──< Session',
    subtitle: 'One-to-Many Prisma Relation',
    tag: 'Database ERD',
    detail: 'Explicit foreign key: Session.userId → User.id',
  },
  {
    icon: FileCode,
    title: 'api/v1/projects.ts',
    subtitle: 'API Controller & Route Mapping',
    tag: 'Service Layer',
    detail: 'Exports: listProjects, createProject, deleteProject',
  },
  {
    icon: Shield,
    title: 'Static Security Audit',
    subtitle: 'Zero Exposed Secrets or eval() sinks',
    tag: 'Security Audit',
    detail: 'Audited 312 files: 0 critical vulnerabilities detected',
  },
  {
    icon: Package,
    title: '@tanstack/react-query',
    subtitle: 'Runtime Dependency v5.24.1',
    tag: 'Dependency',
    detail: 'Detected in 8 files across /src/services and /src/views',
  },
];

const COLUMN_TWO_CARDS = [
  {
    icon: FileCode,
    title: 'src/main.tsx',
    subtitle: 'Application Bootstrap Entry Point',
    tag: 'Entry Point',
    detail: 'Initializes React 18 createRoot & router provider',
  },
  {
    icon: GitBranch,
    title: 'main ↔ feature/auth',
    subtitle: 'Branch Comparison Diff',
    tag: 'Git Diff',
    detail: '+14 files added, 2 modified, 0 conflicts detected',
  },
  {
    icon: Database,
    title: 'CREATE TABLE accounts',
    subtitle: 'PostgreSQL DDL Migration',
    tag: 'SQL Schema',
    detail: 'Primary key: id (uuid), Unique index on email',
  },
  {
    icon: Layers,
    title: 'auth.service.ts → jwt.ts',
    subtitle: 'Authentication Middleware Flow',
    tag: 'Architecture',
    detail: 'Validates Bearer tokens & parses session permissions',
  },
  {
    icon: CheckCircle2,
    title: 'Strict TypeScript Engine',
    subtitle: 'Codebase Quality Health',
    tag: 'Suggestions',
    detail: 'Zero implicit any types across 4,200 lines of code',
  },
];

export function VerticalCarousel() {
  const [activeCard, setActiveCard] = useState<string | null>(null);

  const col1 = [...COLUMN_ONE_CARDS, ...COLUMN_ONE_CARDS];
  const col2 = [...COLUMN_TWO_CARDS, ...COLUMN_TWO_CARDS];

  return (
    <section className="py-20 px-4 max-w-5xl mx-auto border-t border-zinc-200 overflow-hidden">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 mb-3 rounded-full border border-zinc-200 bg-zinc-50 text-[11px] font-mono text-zinc-600">
          <Layers className="w-3.5 h-3.5 text-zinc-700" />
          <span>Architecture In Motion</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-semibold text-zinc-900 tracking-tight">
          Every layer of your codebase, continuously mapped
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-zinc-500 max-w-lg mx-auto">
          From high-level component hierarchies to granular database keys and branch diffs, DomoScope synchronizes your entire project.
        </p>
      </div>

      {/* Dual Vertical Marquee Stage */}
      <div className="relative h-[480px] w-full overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_12%,black_88%,transparent)]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 h-full">
          {/* Column 1 - Scrolling UP */}
          <div className="flex flex-col gap-4 animate-marquee-up hover:[animation-play-state:paused]">
            {col1.map((card, idx) => {
              const Icon = card.icon;
              const isSelected = activeCard === `col1-${idx}`;
              return (
                <div
                  key={`col1-${idx}`}
                  onClick={() => setActiveCard(isSelected ? null : `col1-${idx}`)}
                  className={`p-4 rounded-xl border bg-white shadow-xs transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'border-zinc-900 ring-2 ring-zinc-900/10 shadow-md scale-[1.01]'
                      : 'border-zinc-200 hover:border-zinc-400 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-700 border border-zinc-200">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-mono font-semibold text-zinc-900">
                        {card.title}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 text-zinc-600">
                      {card.tag}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-600 font-medium mb-1.5">{card.subtitle}</p>
                  <p className="text-[11px] text-zinc-400 font-mono">{card.detail}</p>
                </div>
              );
            })}
          </div>

          {/* Column 2 - Scrolling DOWN (Hidden on small mobile, visible on tablet & desktop) */}
          <div className="hidden md:flex flex-col gap-4 animate-marquee-down hover:[animation-play-state:paused]">
            {col2.map((card, idx) => {
              const Icon = card.icon;
              const isSelected = activeCard === `col2-${idx}`;
              return (
                <div
                  key={`col2-${idx}`}
                  onClick={() => setActiveCard(isSelected ? null : `col2-${idx}`)}
                  className={`p-4 rounded-xl border bg-white shadow-xs transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'border-zinc-900 ring-2 ring-zinc-900/10 shadow-md scale-[1.01]'
                      : 'border-zinc-200 hover:border-zinc-400 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-700 border border-zinc-200">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-mono font-semibold text-zinc-900">
                        {card.title}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 text-zinc-600">
                      {card.tag}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-600 font-medium mb-1.5">{card.subtitle}</p>
                  <p className="text-[11px] text-zinc-400 font-mono">{card.detail}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
