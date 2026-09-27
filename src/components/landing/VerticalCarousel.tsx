import { useState } from 'react';
import {
  Layers,
  Database,
  Shield,
  Package,
  GitBranch,
  FileCode,
  CheckCircle2,
  Globe,
  MessageSquare,
  FileCheck,
  Zap,
  Cpu,
} from 'lucide-react';

const COLUMN_ONE_CARDS = [
  {
    icon: Layers,
    title: 'App.tsx → Dashboard.tsx',
    subtitle: 'Connects main layout to the dashboard',
    tag: 'Page Flow',
    detail: 'Main navigation displays the primary dashboard view',
  },
  {
    icon: Database,
    title: 'User ──< Session',
    subtitle: 'Links users with their login sessions',
    tag: 'Database Link',
    detail: 'Each user can have multiple active sessions',
  },
  {
    icon: FileCode,
    title: 'api/v1/projects.ts',
    subtitle: 'Handles project data requests',
    tag: 'Project API',
    detail: 'Fetches, creates, and updates project records',
  },
  {
    icon: Shield,
    title: 'Safety scan',
    subtitle: 'No security risks or leaked keys detected',
    tag: 'Safety Check',
    detail: 'Checked 312 files: 0 critical vulnerabilities found',
  },
  {
    icon: Package,
    title: '@tanstack/react-query',
    subtitle: 'Helper library used across 8 files',
    tag: 'Helper Library',
    detail: 'Powers fast background data caching',
  },
];

const COLUMN_TWO_CARDS = [
  {
    icon: FileCode,
    title: 'src/main.tsx',
    subtitle: 'Where the application starts running',
    tag: 'Starting Point',
    detail: 'Sets up the user interface and main router',
  },
  {
    icon: GitBranch,
    title: 'main ↔ feature/auth',
    subtitle: 'Compares updates between versions',
    tag: 'Version Review',
    detail: '+14 files added, 2 updated, 0 conflicts',
  },
  {
    icon: Database,
    title: 'CREATE TABLE accounts',
    subtitle: 'Sets up user account tables',
    tag: 'Database Table',
    detail: 'Stores unique emails and user account details',
  },
  {
    icon: Layers,
    title: 'auth.service.ts → jwt.ts',
    subtitle: 'Safely verifies user sign-in status',
    tag: 'Sign-in Flow',
    detail: 'Confirms valid user permissions on each page',
  },
  {
    icon: CheckCircle2,
    title: 'Clean Code Quality',
    subtitle: 'Healthy codebase check with zero errors',
    tag: 'Code Health',
    detail: '100% verified across 4,200 lines of code',
  },
];

const COLUMN_THREE_CARDS = [
  {
    icon: Globe,
    title: 'GET /api/v1/users',
    subtitle: 'Organized API route directory',
    tag: 'API Route',
    detail: 'Lists all available endpoints and live parameters',
  },
  {
    icon: MessageSquare,
    title: 'Ask AI Assistant',
    subtitle: 'Instant answers about this codebase',
    tag: 'AI Helper',
    detail: 'Explains complex functions and folder structures',
  },
  {
    icon: FileCheck,
    title: 'Audit Health Report',
    subtitle: '94/100 Maintainability Score',
    tag: 'Health Score',
    detail: 'Highlights clean architecture and low complexity',
  },
  {
    icon: Database,
    title: 'Order ──< OrderItem',
    subtitle: 'Relational data connection',
    tag: 'Database Link',
    detail: 'Maps customer purchases to product inventories',
  },
  {
    icon: Zap,
    title: 'Instant Symbol Search',
    subtitle: 'Fast file lookup with ⌘K',
    tag: 'Quick Search',
    detail: 'Locates components and functions in milliseconds',
  },
];

const COLUMN_FOUR_CARDS = [
  {
    icon: Cpu,
    title: 'Auto Spec Generator',
    subtitle: 'Exports clean documentation (.md)',
    tag: 'Docs Export',
    detail: 'Creates ready-to-share project architecture specs',
  },
  {
    icon: Package,
    title: 'tailwindcss & lucide',
    subtitle: 'Design system & icon assets',
    tag: 'UI Library',
    detail: 'Consistent visual styling across all views',
  },
  {
    icon: Shield,
    title: 'Secret Leak Protection',
    subtitle: 'Scans for exposed API keys',
    tag: 'Safety Check',
    detail: 'Ensures no sensitive credentials are saved in code',
  },
  {
    icon: GitBranch,
    title: 'Recent Commit History',
    subtitle: 'Track recent author activity',
    tag: 'Git History',
    detail: 'Chronological timeline of features and bug fixes',
  },
  {
    icon: Layers,
    title: 'Interactive Diagrams',
    subtitle: 'Visual diagrams ready to export',
    tag: 'Diagram Flow',
    detail: 'Exportable SVG and Markdown charts for team wikis',
  },
];

export function VerticalCarousel() {
  const [activeCard, setActiveCard] = useState<string | null>(null);

  const col1 = [...COLUMN_ONE_CARDS, ...COLUMN_ONE_CARDS];
  const col2 = [...COLUMN_TWO_CARDS, ...COLUMN_TWO_CARDS];
  const col3 = [...COLUMN_THREE_CARDS, ...COLUMN_THREE_CARDS];
  const col4 = [...COLUMN_FOUR_CARDS, ...COLUMN_FOUR_CARDS];

  return (
    <section className="py-20 px-4 sm:px-6 max-w-7xl mx-auto border-t border-zinc-200 overflow-hidden">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 mb-3 rounded-full border border-zinc-200 bg-zinc-50 text-[11px] font-mono text-zinc-600">
          <Layers className="w-3.5 h-3.5 text-zinc-700" />
          <span>Interactive Layers</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-semibold text-zinc-900 tracking-tight">
          Every part of your project, beautifully organized
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-zinc-500 max-w-lg mx-auto">
          From the big picture down to individual files and database tables, DomoScope gives you complete clarity.
        </p>
      </div>

      {/* 4-Column Alternating Vertical Marquee Stage (Responsive: 2 on mobile, 3 on sm, 4 on md+) */}
      <div className="relative h-[480px] sm:h-[540px] w-full overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_10%,black_90%,transparent)]">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 xl:gap-4 h-full">
          {/* Column 1 - Scrolling UP */}
          <div className="flex flex-col gap-2.5 sm:gap-3.5 animate-marquee-up hover:[animation-play-state:paused]">
            {col1.map((card, idx) => {
              const Icon = card.icon;
              const isSelected = activeCard === `col1-${idx}`;
              return (
                <div
                  key={`col1-${idx}`}
                  onClick={() => setActiveCard(isSelected ? null : `col1-${idx}`)}
                  className={`p-2.5 sm:p-3.5 xl:p-4 rounded-xl border bg-white shadow-xs transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'border-zinc-900 ring-2 ring-zinc-900/10 shadow-md scale-[1.01]'
                      : 'border-zinc-200 hover:border-zinc-400 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1 sm:mb-1.5 gap-1">
                    <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                      <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-700 border border-zinc-200 shrink-0">
                        <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </div>
                      <span className="text-[11px] sm:text-xs font-mono font-semibold text-zinc-900 truncate">
                        {card.title}
                      </span>
                    </div>
                    <span className="text-[8px] sm:text-[10px] font-mono px-1 sm:px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 shrink-0 font-medium truncate max-w-[50px] sm:max-w-none">
                      {card.tag}
                    </span>
                  </div>

                  <p className="text-[10px] sm:text-xs text-zinc-700 font-medium mb-0.5 sm:mb-1 leading-snug truncate">{card.subtitle}</p>
                  <p className="text-[9px] sm:text-[11px] text-zinc-400 font-mono leading-relaxed line-clamp-2">{card.detail}</p>
                </div>
              );
            })}
          </div>

          {/* Column 2 - Scrolling DOWN (Alternating) */}
          <div className="flex flex-col gap-2.5 sm:gap-3.5 animate-marquee-down hover:[animation-play-state:paused]">
            {col2.map((card, idx) => {
              const Icon = card.icon;
              const isSelected = activeCard === `col2-${idx}`;
              return (
                <div
                  key={`col2-${idx}`}
                  onClick={() => setActiveCard(isSelected ? null : `col2-${idx}`)}
                  className={`p-2.5 sm:p-3.5 xl:p-4 rounded-xl border bg-white shadow-xs transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'border-zinc-900 ring-2 ring-zinc-900/10 shadow-md scale-[1.01]'
                      : 'border-zinc-200 hover:border-zinc-400 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1 sm:mb-1.5 gap-1">
                    <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                      <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-700 border border-zinc-200 shrink-0">
                        <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </div>
                      <span className="text-[11px] sm:text-xs font-mono font-semibold text-zinc-900 truncate">
                        {card.title}
                      </span>
                    </div>
                    <span className="text-[8px] sm:text-[10px] font-mono px-1 sm:px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 shrink-0 font-medium truncate max-w-[50px] sm:max-w-none">
                      {card.tag}
                    </span>
                  </div>

                  <p className="text-[10px] sm:text-xs text-zinc-700 font-medium mb-0.5 sm:mb-1 leading-snug truncate">{card.subtitle}</p>
                  <p className="text-[9px] sm:text-[11px] text-zinc-400 font-mono leading-relaxed line-clamp-2">{card.detail}</p>
                </div>
              );
            })}
          </div>

          {/* Column 3 - Scrolling UP (Alternating, hidden on xs) */}
          <div className="hidden sm:flex flex-col gap-2.5 sm:gap-3.5 animate-marquee-up hover:[animation-play-state:paused]">
            {col3.map((card, idx) => {
              const Icon = card.icon;
              const isSelected = activeCard === `col3-${idx}`;
              return (
                <div
                  key={`col3-${idx}`}
                  onClick={() => setActiveCard(isSelected ? null : `col3-${idx}`)}
                  className={`p-2.5 sm:p-3.5 xl:p-4 rounded-xl border bg-white shadow-xs transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'border-zinc-900 ring-2 ring-zinc-900/10 shadow-md scale-[1.01]'
                      : 'border-zinc-200 hover:border-zinc-400 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1 sm:mb-1.5 gap-1">
                    <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                      <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-700 border border-zinc-200 shrink-0">
                        <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </div>
                      <span className="text-[11px] sm:text-xs font-mono font-semibold text-zinc-900 truncate">
                        {card.title}
                      </span>
                    </div>
                    <span className="text-[8px] sm:text-[10px] font-mono px-1 sm:px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 shrink-0 font-medium truncate max-w-[50px] sm:max-w-none">
                      {card.tag}
                    </span>
                  </div>

                  <p className="text-[10px] sm:text-xs text-zinc-700 font-medium mb-0.5 sm:mb-1 leading-snug truncate">{card.subtitle}</p>
                  <p className="text-[9px] sm:text-[11px] text-zinc-400 font-mono leading-relaxed line-clamp-2">{card.detail}</p>
                </div>
              );
            })}
          </div>

          {/* Column 4 - Scrolling DOWN (Alternating, hidden on xs and sm) */}
          <div className="hidden md:flex flex-col gap-2.5 sm:gap-3.5 animate-marquee-down hover:[animation-play-state:paused]">
            {col4.map((card, idx) => {
              const Icon = card.icon;
              const isSelected = activeCard === `col4-${idx}`;
              return (
                <div
                  key={`col4-${idx}`}
                  onClick={() => setActiveCard(isSelected ? null : `col4-${idx}`)}
                  className={`p-2.5 sm:p-3.5 xl:p-4 rounded-xl border bg-white shadow-xs transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'border-zinc-900 ring-2 ring-zinc-900/10 shadow-md scale-[1.01]'
                      : 'border-zinc-200 hover:border-zinc-400 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1 sm:mb-1.5 gap-1">
                    <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                      <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-700 border border-zinc-200 shrink-0">
                        <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </div>
                      <span className="text-[11px] sm:text-xs font-mono font-semibold text-zinc-900 truncate">
                        {card.title}
                      </span>
                    </div>
                    <span className="text-[8px] sm:text-[10px] font-mono px-1 sm:px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 shrink-0 font-medium truncate max-w-[50px] sm:max-w-none">
                      {card.tag}
                    </span>
                  </div>

                  <p className="text-[10px] sm:text-xs text-zinc-700 font-medium mb-0.5 sm:mb-1 leading-snug truncate">{card.subtitle}</p>
                  <p className="text-[9px] sm:text-[11px] text-zinc-400 font-mono leading-relaxed line-clamp-2">{card.detail}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
