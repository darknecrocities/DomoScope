import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play } from 'lucide-react';

export function VideoDemo() {
  const [hasVideoError, setHasVideoError] = useState(false);

  return (
    <section className="py-12 sm:py-16 px-4 max-w-5xl mx-auto">
      {/* Section Header: Simple, meaningful, no badge, no technical jargon */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.5 }}
        className="text-center mb-10"
      >
        <h2 className="text-2xl sm:text-3xl font-semibold text-zinc-900 tracking-tight">
          See DomoScope in action
        </h2>
        <p className="mt-2 text-sm sm:text-base text-zinc-500 max-w-xl mx-auto leading-relaxed">
          Watch a quick walkthrough of exploring a project, seeing how parts connect, and getting instant answers.
        </p>
      </motion.div>

      {/* Mac Window Frame */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
        className="w-full rounded-2xl border border-zinc-200/90 bg-white shadow-2xl shadow-zinc-900/10 overflow-hidden ring-1 ring-black/5"
      >
        {/* macOS Title Bar */}
        <div className="flex items-center px-4 py-3 border-b border-zinc-200/80 bg-zinc-100/90 backdrop-blur-md select-none">
          {/* macOS Traffic Light Buttons */}
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]/60 inline-block shadow-2xs"
              aria-hidden="true"
            />
            <span
              className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]/60 inline-block shadow-2xs"
              aria-hidden="true"
            />
            <span
              className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]/60 inline-block shadow-2xs"
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Video Player Display */}
        <div className="relative aspect-video w-full bg-zinc-950 flex items-center justify-center overflow-hidden">
          {!hasVideoError ? (
            <video
              src="./demo.mp4"
              poster="./demo-poster.webp"
              controls
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              onError={() => setHasVideoError(true)}
              className="w-full h-full object-cover block"
            >
              Your browser does not support the video tag.
            </video>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center bg-zinc-900 group">
              <img
                src="./demo-poster.webp"
                alt="DomoScope Interactive Walkthrough Preview"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-3">
                <div className="w-14 h-14 rounded-full bg-white/90 text-zinc-900 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                  <Play className="w-6 h-6 fill-current ml-0.5" />
                </div>
                <span className="text-xs font-medium text-white/90 tracking-wide font-sans">
                  Interactive Preview
                </span>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </section>
  );
}
