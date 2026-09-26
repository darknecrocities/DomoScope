import { useState } from 'react';
import { Settings } from 'lucide-react';
import { GitHubIcon } from '../components/common/Icons';
import { Hero } from '../components/landing/Hero';
import { TechBelt } from '../components/landing/TechBelt';
import { InteractiveDemo } from '../components/landing/InteractiveDemo';
import { ScrapingSimulator } from '../components/landing/ScrapingSimulator';
import { VerticalCarousel } from '../components/landing/VerticalCarousel';
import { ArchitectureLens } from '../components/landing/ArchitectureLens';
import { HowItWorks } from '../components/landing/HowItWorks';
import { FeaturesGrid } from '../components/landing/FeaturesGrid';
import { ComparisonAndFAQ } from '../components/landing/ComparisonAndFAQ';
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
            <img
              src="/domoscope.png"
              alt="DomoScope"
              className="w-7 h-7 rounded-lg object-contain bg-zinc-950 p-0.5 border border-zinc-200 shadow-2xs"
            />
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
        {/* 1. Hero */}
        <Hero />

        {/* 2. Interactive Workspace Demo */}
        <div className="px-4 pb-20 max-w-6xl mx-auto">
          <InteractiveDemo />
        </div>

        {/* 3. Real-Time Scraping & Ingestion Simulator with Progress Bar */}
        <ScrapingSimulator />

        {/* 4. Continuous Technology Belt */}
        <TechBelt />

        {/* 5. Dual-Direction Vertical Alternating Carousel */}
        <VerticalCarousel />

        {/* 6. Interactive Code vs Visual Architecture Split Lens */}
        <ArchitectureLens />

        {/* 7. How It Works Pipeline */}
        <HowItWorks />

        {/* 8. Core Features Grid */}
        <FeaturesGrid />

        {/* 9. Comparison Matrix & Developer FAQ */}
        <ComparisonAndFAQ />

        {/* 10. Final Call to Action */}
        <FinalCTA />
      </main>

      <Footer />

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}
