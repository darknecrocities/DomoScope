import { motion } from 'framer-motion';
import { Network, Database, GitBranch, Shield, MessageSquare, Search } from 'lucide-react';

const FEATURES = [
  {
    icon: Network,
    title: 'Project map',
    description: 'See how files connect to one another in a clear, easy-to-follow visual layout.',
  },
  {
    icon: Database,
    title: 'Database & data',
    description: 'View your data layout, tables, and connections at a single glance.',
  },
  {
    icon: GitBranch,
    title: 'Versions & branches',
    description: 'Compare different versions and see what changed between branches.',
  },
  {
    icon: Shield,
    title: 'Safety check',
    description: 'Spot potential safety issues and weaknesses automatically before they become problems.',
  },
  {
    icon: MessageSquare,
    title: 'Ask AI',
    description: 'Chat with a private built-in assistant to get quick, helpful answers about the codebase.',
  },
  {
    icon: Search,
    title: 'Instant search',
    description: 'Jump to any file, setting, or part of the project instantly with simple search.',
  },
];

export function FeaturesGrid() {
  return (
    <section className="py-20 px-4 max-w-5xl mx-auto border-t border-zinc-200">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.5 }}
        className="text-center mb-16"
      >
        <h2 className="text-2xl sm:text-3xl font-semibold text-zinc-900 tracking-tight">
          Everything in one workspace
        </h2>
        <p className="mt-2 text-sm text-zinc-500">
          Designed for anyone wanting to quickly explore, learn, or review any project.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {FEATURES.map((feature, idx) => {
          const Icon = feature.icon;
          return (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.4, delay: idx * 0.08 }}
              whileHover={{ y: -4 }}
              className="p-6 rounded-2xl border border-zinc-200 bg-white/90 backdrop-blur-xs shadow-xs hover:border-zinc-400 hover:shadow-md transition-all cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-800 mb-4 border border-zinc-200 shadow-2xs">
                <Icon className="w-5 h-5 stroke-[1.75]" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-900 mb-1.5">{feature.title}</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">{feature.description}</p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

