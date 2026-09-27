import { useState, useEffect } from 'react';
import { Settings, Zap, UserCheck } from 'lucide-react';
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
import { BackgroundCanvas } from '../components/common/BackgroundCanvas';
import { GitHubAuthService, GitHubUserProfile } from '../services/githubAuth';
import { GitHubAuthModal } from '../components/common/GitHubAuthModal';

export function LandingPage() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<GitHubUserProfile | null>(null);

  useEffect(() => {
    GitHubAuthService.getUserProfile().then(setUserProfile);
  }, []);

  return (
    <div className="min-h-screen bg-white text-zinc-900 flex flex-col selection:bg-zinc-800 selection:text-white relative overflow-hidden font-sans">
      <BackgroundCanvas />
      <Spotlight />

      {/* Top Landing Header */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="/domoscope.png"
              alt="DomoScope"
              className="w-8 h-8 rounded-xl object-contain bg-slate-950 p-0.5 border border-slate-200 shadow-xs"
            />
            <span className="font-extrabold text-base tracking-tight text-slate-900">DomoScope</span>
          </div>

          <div className="flex items-center gap-3">
            {/* GitHub Sign In / User Profile Badge (White & Black Glassmorphism) */}
            {userProfile ? (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/80 hover:bg-white border border-black/10 backdrop-blur-md rounded-xl transition-all cursor-pointer shadow-xs"
                title="GitHub Authenticated (5,000 req/hr Active)"
              >
                <img
                  src={userProfile.avatarUrl}
                  alt={userProfile.login}
                  className="w-5 h-5 rounded-full border border-black/10 shadow-2xs"
                />
                <span className="text-xs font-mono font-bold text-zinc-900">
                  @{userProfile.login}
                </span>
                <span className="text-[10px] font-mono font-bold text-white bg-black/90 backdrop-blur-md border border-white/20 px-2 py-0.5 rounded-lg shadow-xs">
                  5k Limit
                </span>
              </button>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-2 px-3.5 py-1.5 bg-white/80 hover:bg-white text-zinc-900 border border-black/10 backdrop-blur-md rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs"
                title="Sign in with GitHub to increase rate limit to 5,000 requests/hour"
              >
                <GitHubIcon className="w-4 h-4 text-zinc-900" />
                <span>Sign in with GitHub</span>
                <span className="text-[10px] font-mono bg-black/90 text-white backdrop-blur-md border border-white/20 px-2 py-0.5 rounded-lg font-bold shadow-xs">
                  5k Limit
                </span>
              </button>
            )}

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Settings"
              aria-label="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            <a
              href="https://github.com/darknecrocities/DomoScope"
              target="_blank"
              rel="noreferrer"
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
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

      <GitHubAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={() => {
          GitHubAuthService.getUserProfile().then(setUserProfile);
        }}
      />
    </div>
  );
}
