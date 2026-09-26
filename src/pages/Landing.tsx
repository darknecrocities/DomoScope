import { useState } from 'react';
import { Settings } from 'lucide-react';
import { GitHubIcon } from '../components/common/Icons';
import { Hero } from '../components/landing/Hero';
import { TechBelt } from '../components/landing/TechBelt';
import { InteractiveDemo } from '../components/landing/InteractiveDemo';
import { HowItWorks } from '../components/landing/HowItWorks';
import { FeaturesGrid } from '../components/landing/FeaturesGrid';
import { FinalCTA } from '../components/landing/FinalCTA';
import { Footer } from '../components/landing/Footer';
import { Spotlight } from '../components/common/Spotlight';
import { SettingsModal } from '../components/common/SettingsModal';

export function LandingPage() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-zinc-900 flex flex-col selection:bg-zinc-800 selection:text-white">
      <Spotlight />

      {/* Top Landing Header */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200/80 bg-white/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-zinc-900 flex items-center justify-center text-white font-bold text-xs">
              D
            </div>
            <span className="font-semibold text-sm tracking-tight text-zinc-900">DomoScope</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
              title="Settings"
              aria-label="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            <a
              href="https://github.com/darknecrocities/DomoScope"
              target="_blank"
              rel="noreferrer"
              className="p-1.5 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
              title="GitHub Repository"
              aria-label="GitHub Repository"
            >
              <GitHubIcon className="w-4 h-4" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Sections */}
      <main className="flex-1">
        <Hero />

        <div className="px-4 pb-20 max-w-6xl mx-auto">
          <InteractiveDemo />
        </div>

        <TechBelt />
        <HowItWorks />
        <FeaturesGrid />
        <FinalCTA />
      </main>

      <Footer />

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}
