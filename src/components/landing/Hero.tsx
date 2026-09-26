import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, AlertCircle } from 'lucide-react';
import { GitHubIcon } from '../common/Icons';
import { parseGitHubUrl } from '../../services/github';

const HEADLINES = [
  'Understand any GitHub project.',
  'See how it fits together.',
  'Explore it visually.',
];

const SUGGESTED_REPOS = [
  'facebook/react',
  'fastapi/fastapi',
  'prisma/prisma',
  'expressjs/express',
];

export function Hero() {
  const [headlineIndex, setHeadlineIndex] = useState(0);
  const [inputUrl, setInputUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const interval = setInterval(() => {
      setHeadlineIndex((prev) => (prev + 1) % HEADLINES.length);
    }, 3800);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const parsed = parseGitHubUrl(inputUrl);
    if (!parsed) {
      setErrorMessage('Please enter a valid GitHub repository URL or owner/repo format.');
      return;
    }

    navigate(`/repository/${parsed.owner}/${parsed.repo}`);
  };

  const handleSelectSample = (sample: string) => {
    const parsed = parseGitHubUrl(sample);
    if (parsed) {
      navigate(`/repository/${parsed.owner}/${parsed.repo}`);
    }
  };

  return (
    <div className="relative pt-24 pb-16 px-4 max-w-4xl mx-auto text-center">
      {/* Brand Header */}
      <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 mb-8 rounded-full border border-zinc-200 bg-zinc-50/90 text-xs font-mono text-zinc-700 shadow-2xs">
        <img
          src="/domoscope.png"
          alt="DomoScope Detective Mascot"
          className="w-5 h-5 rounded-full object-cover border border-zinc-300 shadow-xs"
        />
        <span>Free and open source repository visualizer</span>
      </div>

      {/* Controlled Animated Headline */}
      <div className="min-h-[4.5rem] flex items-center justify-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-zinc-900 transition-all duration-500">
          {HEADLINES[headlineIndex]}
        </h1>
      </div>

      {/* Supporting Text */}
      <p className="mt-6 text-base sm:text-lg text-zinc-600 max-w-2xl mx-auto leading-relaxed">
        Paste a public GitHub repository and explore its files, connections, branches, database, and security in one place.
      </p>

      {/* Main Exploration Input Form */}
      <form onSubmit={handleSubmit} className="mt-8 max-w-xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center gap-2 p-1.5 bg-white border border-zinc-300 rounded-xl shadow-xs focus-within:border-zinc-900 focus-within:ring-1 focus-within:ring-zinc-900 transition-all">
          <div className="flex items-center gap-2.5 px-3 w-full sm:w-auto flex-1">
            <GitHubIcon className="w-5 h-5 text-zinc-400 shrink-0" />
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => {
                setInputUrl(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="https://github.com/owner/repository"
              className="w-full py-2 text-sm bg-transparent outline-none placeholder:text-zinc-400 text-zinc-900 font-mono"
            />
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 shrink-0 shadow-xs cursor-pointer active:scale-98"
          >
            <span>Explore repository</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {errorMessage && (
          <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-zinc-600 animate-in fade-in">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{errorMessage}</span>
          </div>
        )}
      </form>

      {/* Quick Explore Examples */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-zinc-500 font-mono">
        <span className="text-zinc-400">Try an example:</span>
        {SUGGESTED_REPOS.map((repo) => (
          <button
            key={repo}
            type="button"
            onClick={() => handleSelectSample(repo)}
            className="px-2.5 py-1 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 hover:border-zinc-300 text-zinc-700 transition-colors cursor-pointer"
          >
            {repo}
          </button>
        ))}
      </div>
    </div>
  );
}
