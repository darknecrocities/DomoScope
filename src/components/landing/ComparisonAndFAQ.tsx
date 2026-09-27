import { useState } from 'react';
import { Check, ChevronDown, ChevronUp, HelpCircle, Sparkles } from 'lucide-react';

const COMPARISON_ROWS = [
  {
    capability: 'Visual Project Map',
    traditional: 'Clicking through endless files and guessing connections',
    domoscope: 'Automatic interactive map showing how everything connects',
  },
  {
    capability: 'Database & Data Layout',
    traditional: 'Digging through folders of complex setup files',
    domoscope: 'Clear visual view of all your tables and links',
  },
  {
    capability: 'Safety & Vulnerability Checks',
    traditional: 'Requires complex tools and local installation',
    domoscope: 'Automatic instant safety check right in your browser',
  },
  {
    capability: 'Built-in AI Assistant',
    traditional: 'Copy-pasting files into paid external chatbots',
    domoscope: 'Free, private AI helper built directly into the page',
  },
  {
    capability: 'Setup Time',
    traditional: 'Minutes or hours configuring tools locally',
    domoscope: 'Zero setup: paste any public link and explore immediately',
  },
];

const FAQS = [
  {
    question: 'Do I need an account or credit card to use DomoScope?',
    answer:
      'No. DomoScope is completely free to use. Just paste any public GitHub link and start exploring immediately — no sign-up, payment, or credit card required.',
  },
  {
    question: 'How does the built-in AI assistant work privately?',
    answer:
      'The AI helper runs directly inside your web browser on your own device. Your files and questions are never sent to external servers or used for training, keeping your browsing completely private.',
  },
  {
    question: 'Is it safe to explore projects I don’t know?',
    answer:
      'Yes, 100% safe. DomoScope only reads files as text and never runs any programs or commands from the project on your computer. You can safely look through any project without risk.',
  },
  {
    question: 'What kinds of database and data setups can it show?',
    answer:
      'DomoScope automatically recognizes popular database setups like Prisma, SQL tables, and modern web data structures, turning them into clean, visual diagrams.',
  },
  {
    question: 'What if I want to explore lots of projects in a row?',
    answer:
      'Anyone can browse right away with normal access. If you want to explore many large projects in a short time, you can easily connect your free GitHub account to get higher hourly limits.',
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
          Traditional GitHub vs DomoScope
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-zinc-500 max-w-lg mx-auto">
          See how visual mapping makes understanding unfamiliar projects effortless.
        </p>
      </div>

      {/* Comparison Table (Scrollable on small mobile devices) */}
      <div className="bg-white border border-zinc-200 rounded-xl shadow-xs overflow-x-auto mb-20">
        <table className="w-full min-w-[540px] text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
              <th className="py-3 px-5">Capability</th>
              <th className="py-3 px-5 text-zinc-400">Traditional GitHub</th>
              <th className="py-3 px-5 text-zinc-900 font-bold bg-zinc-100/70">
                DomoScope
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
