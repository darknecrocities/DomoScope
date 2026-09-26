import { motion } from 'framer-motion';
import { Network, Database, GitBranch, Shield, MessageSquare, Search } from 'lucide-react';

const FEATURES = [
  {
    icon: Network,
    title: 'Project map',
    description: 'See how the files connect through parsed imports and hierarchical layouts.',
  },
  {
    icon: Database,
    title: 'Database',
    description: 'See tables, column definitions, and foreign key relationships across Prisma, SQL, and Drizzle.',
  },
  {
    icon: GitBranch,
    title: 'Branches',
    description: 'Explore different versions of the project and compare changes between branches.',
  },
  {
    icon: Shield,
    title: 'Security',
    description: 'Find areas that may need attention, including exposed secrets, unsafe eval, and SQL patterns.',
  },
  {
    icon: MessageSquare,
    title: 'Ask',
    description: 'Ask questions about the project using your browser’s local assistant without sending code to paid APIs.',
  },
  {
    icon: Search,
    title: 'Search',
    description: 'Find files, symbols, dependencies, and database schemas instantly with quick keyboard shortcuts.',
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
          Built for engineers exploring new repositories, reading unfamiliar codebases, and auditing architecture.
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

