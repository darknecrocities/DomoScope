import { motion } from 'framer-motion';

const STEPS = [
  {
    step: '01',
    title: 'Paste a link',
    description: 'Enter any public GitHub link or project name. No sign-up, payment, or configuration required.',
  },
  {
    step: '02',
    title: 'DomoScope organizes it',
    description: 'DomoScope scans the project, connects the pieces, and lays everything out in a clean, intuitive map.',
  },
  {
    step: '03',
    title: 'Explore & understand',
    description: 'Click through clear visual diagrams, browse files easily, and chat with AI to learn how any feature works.',
  },
];

export function HowItWorks() {
  return (
    <section className="py-20 px-4 max-w-5xl mx-auto border-t border-zinc-200">
      <div className="text-center mb-16">
        <h2 className="text-2xl sm:text-3xl font-semibold text-zinc-900 tracking-tight">
          How it works
        </h2>
        <p className="mt-2 text-sm text-zinc-500">
          Go from a GitHub link to an easy-to-read visual map in seconds.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {STEPS.map((item, idx) => (
          <motion.div
            key={item.step}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: idx * 0.15 }}
            className="p-6 rounded-xl border border-zinc-200 bg-white shadow-xs hover:border-zinc-300 transition-colors"
          >
            <span className="font-mono text-xs font-semibold text-zinc-400 block mb-4">
              {item.step}
            </span>
            <h3 className="text-base font-semibold text-zinc-900 mb-2">
              {item.title}
            </h3>
            <p className="text-xs text-zinc-600 leading-relaxed">
              {item.description}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
