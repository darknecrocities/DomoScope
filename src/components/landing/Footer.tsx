import { GitHubIcon } from '../common/Icons';

export function Footer() {
  return (
    <footer className="border-t border-zinc-200 py-10 px-4 bg-white">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-zinc-900 tracking-tight">DomoScope</span>
          <span className="text-zinc-300">&bull;</span>
          <span>Open source.</span>
        </div>

        <div className="flex items-center gap-6">
          <a
            href="https://github.com/darknecrocities/DomoScope"
            target="_blank"
            rel="noreferrer"
            className="hover:text-zinc-900 flex items-center gap-1.5 transition-colors"
          >
            <GitHubIcon className="w-3.5 h-3.5" />
            <span>GitHub</span>
          </a>
          <a
            href="https://github.com/darknecrocities/DomoScope#readme"
            target="_blank"
            rel="noreferrer"
            className="hover:text-zinc-900 transition-colors"
          >
            Documentation
          </a>
          <a
            href="https://github.com/darknecrocities/DomoScope/blob/main/LICENSE"
            target="_blank"
            rel="noreferrer"
            className="hover:text-zinc-900 transition-colors"
          >
            License
          </a>
        </div>
      </div>
    </footer>
  );
}
