import { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Copy, Check, MessageSquare, Maximize2, Minimize2, FileCode, WrapText } from 'lucide-react';

interface SourceViewerProps {
  filePath: string;
  content: string;
  isLoading?: boolean;
  onAskExplain: (path: string) => void;
  targetLine?: number;
}

export function SourceViewer({ filePath, content, isLoading, onAskExplain }: SourceViewerProps) {
  const [copied, setCopied] = useState(false);
  const [isWrapEnabled, setIsWrapEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const getLanguage = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'js':
      case 'jsx':
        return 'javascript';
      case 'py':
        return 'python';
      case 'go':
        return 'go';
      case 'rs':
        return 'rust';
      case 'json':
        return 'json';
      case 'md':
      case 'mdx':
        return 'markdown';
      case 'css':
      case 'scss':
        return 'css';
      case 'html':
        return 'html';
      case 'sql':
      case 'prisma':
        return 'sql';
      case 'yml':
      case 'yaml':
        return 'yaml';
      default:
        return 'plaintext';
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const linesCount = content ? content.split('\n').length : 0;
  const filename = filePath ? filePath.split('/').pop() : 'No file selected';

  return (
    <div
      className={`h-full flex flex-col bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs ${
        isFullscreen ? 'fixed inset-4 z-50 shadow-2xl' : ''
      }`}
    >
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-50 border-b border-zinc-200 select-none">
        <div className="flex items-center gap-2 min-w-0">
          <FileCode className="w-4 h-4 text-zinc-500 shrink-0" />
          <span className="text-xs font-mono font-medium text-zinc-800 truncate">{filename}</span>
          <span className="text-[11px] font-mono text-zinc-400 hidden sm:inline truncate">
            ({filePath})
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-600 hidden sm:inline">
            {linesCount} lines
          </span>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => onAskExplain(filePath)}
            className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-md text-xs font-medium text-zinc-700 transition-colors cursor-pointer"
            title="Explain this file with Local Assistant"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Explain</span>
          </button>

          <button
            onClick={() => setIsWrapEnabled((prev) => !prev)}
            className={`p-1.5 rounded-md border transition-colors cursor-pointer ${
              isWrapEnabled
                ? 'bg-zinc-200 border-zinc-300 text-zinc-900'
                : 'bg-white hover:bg-zinc-100 border-zinc-200 text-zinc-600'
            }`}
            title="Toggle Word Wrap"
            aria-label="Toggle Word Wrap"
          >
            <WrapText className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleCopy}
            className="p-1.5 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-md text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer"
            title="Copy Code"
            aria-label="Copy Code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-zinc-900" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => setIsFullscreen((prev) => !prev)}
            className="p-1.5 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-md text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 w-full h-full relative">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-xs font-mono text-zinc-400">
            Loading file content...
          </div>
        ) : (
          <Editor
            height="100%"
            language={getLanguage(filePath)}
            value={content}
            theme="vs"
            options={{
              readOnly: true,
              domReadOnly: true,
              minimap: { enabled: true, maxColumn: 80 },
              wordWrap: isWrapEnabled ? 'on' : 'off',
              fontSize: 13,
              fontFamily: "'JetBrains Mono', monospace",
              lineNumbers: 'on',
              renderLineHighlight: 'all',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
            }}
          />
        )}
      </div>
    </div>
  );
}
