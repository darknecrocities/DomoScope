import { Lightbulb, CheckCircle2, AlertCircle, FileText, ArrowRight } from 'lucide-react';
import { RepoAnalysis } from '../../types';

interface SuggestionsTabProps {
  analysis: RepoAnalysis;
  onOpenFile: (path: string) => void;
}

export function SuggestionsTab({ analysis, onOpenFile }: SuggestionsTabProps) {
  const suggestions: {
    title: string;
    description: string;
    type: 'improvement' | 'positive' | 'note';
    actionText?: string;
    actionFile?: string;
  }[] = [];

  // 1. License Check
  if (!analysis.metadata.license) {
    suggestions.push({
      title: 'Missing Open-Source License',
      description: 'This repository does not specify an SPDX open-source license. Adding a LICENSE file clarifies usage terms for contributors and users.',
      type: 'note',
    });
  } else {
    suggestions.push({
      title: `Licensed under ${analysis.metadata.license}`,
      description: 'The repository provides an explicit open-source license.',
      type: 'positive',
    });
  }

  // 2. Test Coverage Check
  if (analysis.categoriesCount.test === 0) {
    suggestions.push({
      title: 'No Dedicated Test Suites Identified',
      description: 'No .test. or .spec. files were found in the inspectable file tree. Introducing Vitest, Jest, or Pytest can guard against regressions.',
      type: 'improvement',
    });
  } else {
    suggestions.push({
      title: `Automated Test Suites Present (${analysis.categoriesCount.test} files)`,
      description: 'Unit or integration test files are organized across the project.',
      type: 'positive',
    });
  }

  // 3. Documentation
  const hasReadme = analysis.files.some((f) => /readme\.md/i.test(f.path));
  if (!hasReadme) {
    suggestions.push({
      title: 'Missing Root README.md',
      description: 'A root README.md helps developers understand how to clone, install dependencies, and run the project locally.',
      type: 'improvement',
    });
  } else {
    suggestions.push({
      title: 'Root Documentation Available',
      description: 'A README.md file is available at the repository root.',
      type: 'positive',
      actionText: 'Open README',
      actionFile: analysis.files.find((f) => /readme\.md/i.test(f.path))?.path,
    });
  }

  // 4. Entry point
  if (analysis.entryPoints.length > 0) {
    suggestions.push({
      title: `Main Entry Point: ${analysis.entryPoints[0]}`,
      description: 'Standard application lifecycle bootstrap file detected.',
      type: 'positive',
      actionText: 'Open Entry Point',
      actionFile: analysis.entryPoints[0],
    });
  }

  return (
    <div className="h-full flex flex-col bg-zinc-50 overflow-auto p-6 md:p-8">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        <div className="flex items-center gap-2 pb-2">
          <Lightbulb className="w-5 h-5 text-zinc-700" />
          <h2 className="text-base font-semibold text-zinc-900">Codebase Insights & Suggestions</h2>
        </div>

        <div className="space-y-4">
          {suggestions.map((item, idx) => (
            <div
              key={idx}
              className="p-5 bg-white border border-zinc-200 rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3.5">
                {item.type === 'positive' ? (
                  <CheckCircle2 className="w-5 h-5 text-zinc-800 shrink-0 mt-0.5" />
                ) : item.type === 'improvement' ? (
                  <AlertCircle className="w-5 h-5 text-zinc-600 shrink-0 mt-0.5" />
                ) : (
                  <FileText className="w-5 h-5 text-zinc-500 shrink-0 mt-0.5" />
                )}

                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 mb-1">{item.title}</h3>
                  <p className="text-xs text-zinc-600 leading-relaxed max-w-xl">{item.description}</p>
                </div>
              </div>

              {item.actionText && item.actionFile && (
                <button
                  onClick={() => onOpenFile(item.actionFile!)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-700 transition-colors shrink-0 self-start sm:self-center cursor-pointer"
                >
                  <span>{item.actionText}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
