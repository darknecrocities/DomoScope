import { useState } from 'react';
import { Check, X, ChevronDown, ChevronUp, HelpCircle, Sparkles } from 'lucide-react';

const COMPARISON_ROWS = [
  {
    capability: 'Visual Architecture Graph',
    traditional: 'Manual file browsing & mental tracking',
    domoscope: 'Automated interactive DAG from parsed imports',
  },
  {
    capability: 'Database Schema & ERD',
    traditional: 'Digging through folders of raw migration files',
    domoscope: 'Auto-detected ERD with columns & foreign keys',
  },
  {
    capability: 'Security & Secret Checks',
    traditional: 'Must clone repo & run third-party scanners',
    domoscope: 'In-browser static audit before running code',
  },
  {
    capability: 'Code Assistant & Chat',
    traditional: 'Paid tokens, copy-pasting into external tools',
    domoscope: 'Free on-device local WebLLM assistant',
  },
  {
    capability: 'Setup & Installation Time',
    traditional: 'Clone, configure environment, install dependencies',
    domoscope: 'Instant: paste public URL and explore',
  },
];

const FAQS = [
  {
    question: 'Does DomoScope require a GitHub account or paid API keys?',
    answer:
      'No. DomoScope is 100% free and open source. You can paste any public GitHub repository URL and inspect it immediately without signing in or providing an API key.',
  },
  {
    question: 'How does the local assistant run without external servers?',
    answer:
      'DomoScope utilizes MLC WebLLM to run language models directly in your browser using WebGPU hardware acceleration. If WebGPU is not supported by your browser, DomoScope falls back to a deterministic grounded assistant that parses repository structures locally.',
  },
  {
    question: 'Does DomoScope ever execute code from inspected repositories?',
    answer:
      'Never. DomoScope treats all repository files strictly as untrusted text data. It never runs npm install, executes lifecycle scripts, or spawns binaries, ensuring safe inspection of unfamiliar open-source projects.',
  },
  {
    question: 'Which database schema formats are automatically detected?',
    answer:
      'DomoScope automatically detects and extracts schemas from Prisma (schema.prisma), SQL DDL files (CREATE TABLE statements in migrations), and Drizzle ORM definitions (pgTable, mysqlTable, sqliteTable).',
  },
  {
    question: 'What happens if I reach GitHub’s public API rate limit?',
    answer:
      'Unauthenticated public requests to GitHub are limited to 60 requests/hour per IP address. You can optionally add a personal access token in the Settings modal (stored strictly in your browser’s IndexedDB) to raise your limit to 5,000 requests/hour.',
  },
];

export function ComparisonAndFAQ() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex((prev) => (prev === index ? null : index));
  };

  return (
    <section className="py-20 px-4 max-w-5xl mx-auto border-t border-zinc-200">
      {/* Comparison Table Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 mb-3 rounded-full border border-zinc-200 bg-zinc-50 text-[11px] font-mono text-zinc-600">
          <Sparkles className="w-3.5 h-3.5 text-zinc-700" />
          <span>Workflow Comparison</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-semibold text-zinc-900 tracking-tight">
          Traditional GitHub vs DomoScope Workspace
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-zinc-500 max-w-lg mx-auto">
          See how visual mapping transforms how developers read, review, and evaluate unfamiliar codebases.
        </p>
      </div>

      {/* Comparison Table */}
      <div className="bg-white border border-zinc-200 rounded-xl shadow-xs overflow-hidden mb-20">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
              <th className="py-3 px-5">Capability</th>
              <th className="py-3 px-5 text-zinc-400">Traditional GitHub</th>
              <th className="py-3 px-5 text-zinc-900 font-bold bg-zinc-100/70">
                DomoScope Workspace
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 text-xs">
            {COMPARISON_ROWS.map((row) => (
              <tr key={row.capability} className="hover:bg-zinc-50/50 transition-colors">
                <td className="py-3.5 px-5 font-semibold text-zinc-900">{row.capability}</td>
                <td className="py-3.5 px-5 text-zinc-500">{row.traditional}</td>
                <td className="py-3.5 px-5 font-medium text-zinc-900 bg-zinc-50/40 flex items-center gap-2">
                  <Check className="w-4 h-4 text-zinc-900 shrink-0" />
                  <span>{row.domoscope}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Frequently Asked Questions */}
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-3 rounded-full border border-zinc-200 bg-zinc-50 text-[11px] font-mono text-zinc-600">
            <HelpCircle className="w-3.5 h-3.5 text-zinc-700" />
            <span>Common Questions</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-semibold text-zinc-900 tracking-tight">
            Frequently Asked Questions
          </h3>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-xs transition-colors"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left text-xs sm:text-sm font-semibold text-zinc-900 hover:bg-zinc-50 transition-colors cursor-pointer"
                >
                  <span>{faq.question}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-zinc-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
                  )}
                </button>

                {isOpen && (
                  <div className="px-5 pb-4 pt-1 text-xs text-zinc-600 leading-relaxed border-t border-zinc-100 bg-zinc-50/50">
                    <p>{faq.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
