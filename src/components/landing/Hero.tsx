import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, AlertCircle } from 'lucide-react';
import { GitHubIcon } from '../common/Icons';
import { parseGitHubUrl } from '../../services/github';

const HEADLINES = [
  'Understand any GitHub project in seconds.',
  'Explore clear, interactive visual maps.',
  'Get instant answers with built-in AI.',
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
    }, 4000);
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
    <div className="relative pt-20 pb-16 px-4 max-w-4xl mx-auto text-center z-10">
      {/* Brand Logo & Name Header (App Logo and Text Only - Card Removed) */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="inline-flex items-center gap-3 mb-8"
      >
        <img
          src="/domoscope.png"
          alt="DomoScope Logo"
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl object-contain bg-zinc-950 p-1 border border-zinc-200/80 shadow-xs"
        />
        <span className="font-extrabold text-xl sm:text-2xl tracking-tight text-zinc-900 font-sans">
          DomoScope
        </span>
      </motion.div>

      {/* Controlled Animated Headline with Expanded Bounds */}
      <div className="min-h-[5.5rem] flex items-center justify-center py-2 overflow-visible">
        <AnimatePresence mode="wait">
          <motion.h1
            key={headlineIndex}
            initial={{ opacity: 0, y: 15, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -15, filter: 'blur(4px)' }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-zinc-900 leading-normal pb-2"
          >
            {HEADLINES[headlineIndex]}
          </motion.h1>
        </AnimatePresence>
      </div>

      {/* Supporting Description (Simplified Non-Technical Copy with Generous Bottom Space) */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="mt-6 text-base sm:text-lg text-zinc-600 max-w-2xl mx-auto leading-relaxed pb-3"
      >
        Turn complex code into clear interactive diagrams, instant project summaries, and easy explanations — right in your browser with zero setup.
      </motion.p>

      {/* Main Exploration Input Form */}
      <motion.form
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        onSubmit={handleSubmit}
        className="mt-8 max-w-xl mx-auto"
      >
        <div className="flex flex-col sm:flex-row items-center gap-2 p-2 bg-white/90 backdrop-blur-md border border-zinc-300 rounded-2xl shadow-lg hover:border-zinc-400 focus-within:border-zinc-900 focus-within:ring-2 focus-within:ring-zinc-900/10 transition-all">
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
              className="w-full py-2.5 text-sm bg-transparent outline-none placeholder:text-zinc-400 text-zinc-900 font-mono"
            />
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-3 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shrink-0 shadow-md cursor-pointer active:scale-98"
          >
            <span>Explore project</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {errorMessage && (
          <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-rose-600 font-mono animate-in fade-in">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{errorMessage}</span>
          </div>
        )}
      </motion.form>

      {/* Quick Explore Examples */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-zinc-500 font-mono"
      >
        <span className="text-zinc-400">Try a sample project:</span>
        {SUGGESTED_REPOS.map((repo) => (
          <button
            key={repo}
            type="button"
            onClick={() => handleSelectSample(repo)}
            className="px-3 py-1 rounded-lg border border-zinc-200 bg-white/80 hover:bg-zinc-100 hover:border-zinc-300 text-zinc-800 font-medium transition-all shadow-2xs cursor-pointer"
          >
            {repo}
          </button>
        ))}
      </motion.div>
    </div>
  );
}

