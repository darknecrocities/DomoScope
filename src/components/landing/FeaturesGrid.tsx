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
      <div className="text-center mb-16">
        <h2 className="text-2xl sm:text-3xl font-semibold text-zinc-900 tracking-tight">
          Everything in one workspace
        </h2>
        <p className="mt-2 text-sm text-zinc-500">
          Built for engineers exploring new repositories, reading unfamiliar codebases, and auditing architecture.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {FEATURES.map((feature) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.title}
              className="p-6 rounded-xl border border-zinc-200 bg-white shadow-xs hover:border-zinc-300 hover:shadow-sm transition-all"
            >
              <div className="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-800 mb-4 border border-zinc-200">
                <Icon className="w-4 h-4 stroke-[1.75]" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-900 mb-1.5">{feature.title}</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">{feature.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
