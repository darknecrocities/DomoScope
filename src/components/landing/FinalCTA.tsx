import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, AlertCircle } from 'lucide-react';
import { GitHubIcon } from '../common/Icons';
import { parseGitHubUrl } from '../../services/github';

export function FinalCTA() {
  const [url, setUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const parsed = parseGitHubUrl(url);
    if (!parsed) {
      setErrorMessage('Please enter a valid GitHub project link (e.g. owner/project).');
      return;
    }
    navigate(`/repository/${parsed.owner}/${parsed.repo}`);
  };

  return (
    <section className="py-24 px-4 max-w-3xl mx-auto text-center border-t border-zinc-200">
      <h2 className="text-3xl sm:text-4xl font-semibold text-zinc-900 tracking-tight">
        Start exploring today.
      </h2>
      <p className="mt-3 text-sm text-zinc-600 max-w-md mx-auto">
        Understand any open-source GitHub project in seconds — completely free with zero setup.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 max-w-md mx-auto">
        <div className="flex flex-col sm:flex-row items-center gap-2 p-1.5 bg-white border border-zinc-300 rounded-xl shadow-xs focus-within:border-zinc-900 focus-within:ring-1 focus-within:ring-zinc-900 transition-all">
          <div className="flex items-center gap-2.5 px-3 w-full sm:w-auto flex-1">
            <GitHubIcon className="w-4 h-4 text-zinc-400 shrink-0" />
            <input
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="Paste any public GitHub link (e.g. facebook/react)"
              className="w-full py-2 text-xs bg-transparent outline-none placeholder:text-zinc-400 text-zinc-900 font-mono"
            />
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
          >
            <span>Explore project</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mt-2.5 flex items-center justify-center gap-1.5 text-xs text-zinc-600">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{errorMessage}</span>
          </div>
        )}
      </form>
    </section>
  );
}
