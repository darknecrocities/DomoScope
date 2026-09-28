import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Palette,
  MousePointerClick,
  Database,
  Sparkles,
  Copy,
  Check,
  CheckCircle2,
  Layers,
  ArrowRight,
  BookOpen,
  Cpu,
} from 'lucide-react';

interface BlueprintTab {
  id: string;
  title: string;
  tag: string;
  icon: typeof FileText;
  shortDesc: string;
  fileName: string;
  previewHeader: string;
  previewSummary: string;
  details: {
    label: string;
    points: string[];
  }[];
  aiPromptSnippet?: string;
}

const BLUEPRINT_TABS: BlueprintTab[] = [
  {
    id: 'rebuild',
    title: 'Step-by-Step Rebuild Guide',
    tag: 'Full Recipe',
    icon: FileText,
    shortDesc: 'A complete, easy-to-read recipe explaining how the whole app fits together.',
    fileName: 'app-rebuild-blueprint.md',
    previewHeader: 'How This App Works (Simple Rebuild Guide)',
    previewSummary:
      'A plain-English breakdown of what this application does, the 4 core pieces that make it run, and how you can recreate it from scratch without feeling overwhelmed.',
    details: [
      {
        label: '1. What the user sees on screen',
        points: [
          'A clean top bar with search, quick settings, and brand logo.',
          'Interactive cards showing projects with status badges and categories.',
          'Friendly popup modals for detailed views without leaving the page.',
        ],
      },
      {
        label: '2. The behind-the-scenes brain',
        points: [
          'Takes your input, checks if it is valid, and finds the right information.',
          'Connects files together so clicking a card shows the matching details.',
          'Runs smoothly in your browser with zero lag or confusing error screens.',
        ],
      },
      {
        label: '3. Suggested order to recreate it',
        points: [
          'Step 1: Sketch the screen layout and draw where buttons belong.',
          'Step 2: Add clickable buttons that show sample data.',
          'Step 3: Connect your saved information and test on your phone or laptop.',
        ],
      },
    ],
  },
  {
    id: 'design',
    title: 'Screens & Visual Design',
    tag: 'Look & Feel',
    icon: Palette,
    shortDesc: 'The exact colors, fonts, buttons, and layout styles used across the app.',
    fileName: 'design-and-style-guide.md',
    previewHeader: 'Design System & Visual Appearance',
    previewSummary:
      'All the styling secrets that make this app look polished, clean, and modern—ready to reuse in your own projects.',
    details: [
      {
        label: 'Color Palette & Atmosphere',
        points: [
          'Base Background: Crisp white and soft warm gray for high readability.',
          'Text & Headings: Deep charcoal for comfortable, eye-friendly reading.',
          'Accent Highlights: Subtle blue and emerald accents for badges and active buttons.',
        ],
      },
      {
        label: 'Typography & Layout Rules',
        points: [
          'Modern sans-serif font with clear sizes (large titles, readable body text).',
          'Smooth rounded corners on all cards and popups (12px to 16px).',
          'Responsive grid that automatically fits phones, tablets, and wide laptop screens.',
        ],
      },
      {
        label: 'Interactive Feedback',
        points: [
          'Gentle color shifts when your mouse hovers over buttons.',
          'Clear confirmation messages when an action finishes successfully.',
        ],
      },
    ],
  },
  {
    id: 'flow',
    title: 'Buttons & User Actions',
    tag: 'How It Works',
    icon: MousePointerClick,
    shortDesc: 'What happens behind the scenes every time a user taps a button or link.',
    fileName: 'user-journey-actions.md',
    previewHeader: 'User Actions & Page Flows',
    previewSummary:
      'Traces each user tap from start to finish in simple words, so you always know what triggers what.',
    details: [
      {
        label: 'Action: Searching for an item',
        points: [
          'User types a name into the search bar.',
          'App immediately filters cards that match the text in real time.',
          'If nothing matches, a friendly "No results found" card appears with tips.',
        ],
      },
      {
        label: 'Action: Opening project details',
        points: [
          'User clicks on a project card.',
          'App smoothly opens the detailed view with full info and history.',
          'Previous screen position is remembered so you never lose your place.',
        ],
      },
      {
        label: 'Action: Saving your choices',
        points: [
          'User toggles dark mode or changes a filter setting.',
          'App remembers your preference automatically so it stays saved on your next visit.',
        ],
      },
    ],
  },
  {
    id: 'data',
    title: 'Saved Information',
    tag: 'Data Storage',
    icon: Database,
    shortDesc: 'A clear list of what information the app remembers and where it keeps it.',
    fileName: 'saved-data-overview.md',
    previewHeader: 'What The App Remembers (Data Layout)',
    previewSummary:
      'No complicated database formulas. Just an easy-to-understand list of what pieces of information get saved.',
    details: [
      {
        label: 'User Profile Information',
        points: [
          'Display Name: What the user is called inside the app.',
          'Profile Photo: Link to the avatar image.',
          'Last Active Date: When the user last visited the workspace.',
        ],
      },
      {
        label: 'Project & Workspace Records',
        points: [
          'Project Title & Summary: Short sentence explaining the project.',
          'Tags & Categories: E.g., Frontend, Mobile, Backend, Database.',
          'Star Count & Activity: Popularity indicator and last update timestamp.',
        ],
      },
      {
        label: 'Personal Preferences',
        points: [
          'Dark / Light theme selection.',
          'Recently viewed projects and favorite bookmarks.',
        ],
      },
    ],
  },
  {
    id: 'ai_guide',
    title: 'AI Helper Prompt',
    tag: 'Copy for AI',
    icon: Sparkles,
    shortDesc: 'Copy-paste instructions formatted for ChatGPT, Claude, Cursor, or Copilot.',
    fileName: 'ai-rebuild-instructions.md',
    previewHeader: 'Ready-Made Instructions for AI Coding Assistants',
    previewSummary:
      'Copy this prompt into your favorite AI assistant to have it help you rebuild or customize this project step by step.',
    details: [
      {
        label: 'How to use this with AI',
        points: [
          'Copy the instructions below with one click.',
          'Paste it into ChatGPT, Claude, Cursor, or GitHub Copilot.',
          'Ask the AI to start with step 1 and guide you through each piece at your own pace.',
        ],
      },
    ],
    aiPromptSnippet: `You are an expert, patient coding tutor. I want to build a clean web app inspired by this project.

Please guide me step by step using simple, everyday words without unnecessary technical jargon:

1. First, help me build the screen layout (top bar, search input, and responsive project cards).
2. Second, help me add the interactive clicks (clicking a card opens its details).
3. Third, help me save user preferences like light/dark mode so choices stay remembered.

Let's begin with Step 1. What simple starter file should we create first?`,
  },
];

export function ReverseEngineerSection() {
  const [activeTabId, setActiveTabId] = useState<string>('rebuild');
  const [copied, setCopied] = useState<boolean>(false);

  const activeTab = BLUEPRINT_TABS.find((t) => t.id === activeTabId) || BLUEPRINT_TABS[0];

  const handleCopy = () => {
    const textToCopy = activeTab.aiPromptSnippet
      ? activeTab.aiPromptSnippet
      : `${activeTab.previewHeader}\n\n${activeTab.previewSummary}\n\n` +
        activeTab.details
          .map((d) => `### ${d.label}\n` + d.points.map((p) => `- ${p}`).join('\n'))
          .join('\n\n');

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <section className="py-20 px-4 max-w-5xl mx-auto border-t border-zinc-200">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 mb-3 rounded-full border border-zinc-200 bg-zinc-50 text-[11px] font-mono text-zinc-600">
          <BookOpen className="w-3.5 h-3.5 text-zinc-700" />
          <span>Reverse Engineering</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-semibold text-zinc-900 tracking-tight">
          Turn any project into a simple rebuild guide
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-zinc-500 max-w-xl mx-auto leading-relaxed">
          Ever wondered how an open-source app was created? DomoScope reads the codebase and writes a clear, plain-language blueprint so you can easily understand, learn from, or recreate it.
        </p>
      </div>

      {/* Main Interactive Showcase Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Blueprint Category Selectors (5 columns on large screen) */}
        <div className="lg:col-span-5 flex flex-col gap-2.5">
          <div className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1 px-1">
            Choose what you want to understand:
          </div>

          {BLUEPRINT_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab.id === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTabId(tab.id);
                  setCopied(false);
                }}
                className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                  isActive
                    ? 'bg-zinc-900 text-white border-zinc-900 shadow-md ring-2 ring-zinc-900/10'
                    : 'bg-white hover:bg-zinc-50 text-zinc-800 border-zinc-200 shadow-2xs hover:border-zinc-300'
                }`}
              >
                <div
                  className={`p-2 rounded-lg shrink-0 transition-colors ${
                    isActive
                      ? 'bg-zinc-800 text-white border border-zinc-700'
                      : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                  }`}
                >
                  <Icon className="w-4 h-4 stroke-[2]" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-semibold tracking-tight truncate">
                      {tab.title}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full shrink-0 font-medium ${
                        isActive
                          ? 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                          : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                      }`}
                    >
                      {tab.tag}
                    </span>
                  </div>
                  <p
                    className={`text-[11px] leading-relaxed line-clamp-2 ${
                      isActive ? 'text-zinc-300' : 'text-zinc-500'
                    }`}
                  >
                    {tab.shortDesc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Column: Live Blueprint Document Preview (7 columns on large screen) */}
        <div className="lg:col-span-7">
          <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden flex flex-col">
            {/* Document Window Header */}
            <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between gap-3">
              {/* Traffic light dots & File Name */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-300" />
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-300" />
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-300" />
                </div>
                <span className="text-xs font-mono font-medium text-zinc-600 bg-white border border-zinc-200 px-2.5 py-0.5 rounded-md">
                  {activeTab.fileName}
                </span>
              </div>

              {/* Copy Blueprint Button */}
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-zinc-100 text-zinc-800 border border-zinc-200 rounded-lg text-xs font-mono transition-all cursor-pointer shadow-2xs"
                title="Copy blueprint content"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-semibold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Copy Guide</span>
                  </>
                )}
              </button>
            </div>

            {/* Document Content */}
            <div className="p-6 bg-white min-h-[380px] max-h-[460px] overflow-y-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-5"
                >
                  {/* Blueprint Title & Summary */}
                  <div className="border-b border-zinc-100 pb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md border border-zinc-200/80">
                        Plain English Blueprint
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-zinc-900 tracking-tight mb-1.5">
                      {activeTab.previewHeader}
                    </h3>
                    <p className="text-xs text-zinc-600 leading-relaxed">
                      {activeTab.previewSummary}
                    </p>
                  </div>

                  {/* AI Prompt Snippet Callout (if active) */}
                  {activeTab.aiPromptSnippet && (
                    <div className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50/80">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[11px] font-mono font-semibold text-zinc-800 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-zinc-700" />
                          Ready-to-use Prompt:
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500">
                          Paste into ChatGPT / Cursor
                        </span>
                      </div>
                      <pre className="text-[11px] font-mono text-zinc-700 whitespace-pre-wrap leading-relaxed bg-white p-3 rounded-lg border border-zinc-200">
                        {activeTab.aiPromptSnippet}
                      </pre>
                    </div>
                  )}

                  {/* Blueprint Detail Sections */}
                  <div className="space-y-4">
                    {activeTab.details.map((section, sIdx) => (
                      <div
                        key={sIdx}
                        className="p-3.5 rounded-xl border border-zinc-150 bg-zinc-50/50"
                      >
                        <h4 className="text-xs font-semibold text-zinc-900 mb-2.5 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
                          {section.label}
                        </h4>
                        <ul className="space-y-1.5">
                          {section.points.map((pt, pIdx) => (
                            <li
                              key={pIdx}
                              className="text-xs text-zinc-600 flex items-start gap-2 leading-relaxed"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                              <span>{pt}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Simple Highlight Benefits */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
        <div className="p-4 rounded-xl border border-zinc-200 bg-white shadow-2xs hover:border-zinc-300 transition-colors">
          <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-800 mb-3 border border-zinc-200 shadow-2xs">
            <BookOpen className="w-4 h-4 stroke-[1.75]" />
          </div>
          <h4 className="text-xs font-semibold text-zinc-900 mb-1">Plain Language First</h4>
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            No confusing tech jargon. Everything is explained in everyday words so anyone can learn.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 bg-white shadow-2xs hover:border-zinc-300 transition-colors">
          <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-800 mb-3 border border-zinc-200 shadow-2xs">
            <Sparkles className="w-4 h-4 stroke-[1.75]" />
          </div>
          <h4 className="text-xs font-semibold text-zinc-900 mb-1">One-Click AI Ready</h4>
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            Copy clean instructions directly to ChatGPT, Cursor, or Claude to start building immediately.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 bg-white shadow-2xs hover:border-zinc-300 transition-colors">
          <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-800 mb-3 border border-zinc-200 shadow-2xs">
            <Layers className="w-4 h-4 stroke-[1.75]" />
          </div>
          <h4 className="text-xs font-semibold text-zinc-900 mb-1">Instant Blueprints</h4>
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            Paste any public GitHub link and receive your complete blueprint in seconds—no setup needed.
          </p>
        </div>
      </div>
    </section>
  );
}
