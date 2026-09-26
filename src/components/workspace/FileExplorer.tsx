import { useState, useMemo } from 'react';
import {
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  Search,
  ChevronRight,
  ChevronDown,
  Database,
  Layers,
  Server,
  Globe,
  Shield,
  FileCheck,
} from 'lucide-react';
import { RepoFile, FileCategory } from '../../types';

interface FileExplorerProps {
  files: RepoFile[];
  selectedFile: string | null;
  onSelectFile: (path: string) => void;
}

interface TreeNode {
  name: string;
  path: string;
  type: 'blob' | 'tree';
  category: FileCategory;
  size?: number;
  children: TreeNode[];
}

export function FileExplorer({ files, selectedFile, onSelectFile }: FileExplorerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['src', 'app', 'pages']));
  const [categoryFilter, setCategoryFilter] = useState<FileCategory | 'all'>('all');

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  // Build tree from flat files list
  const tree = useMemo(() => {
    const root: TreeNode = {
      name: '',
      path: '',
      type: 'tree',
      category: 'folder',
      children: [],
    };

    const q = searchQuery.toLowerCase().trim();

    // Filter candidate files
    const filteredFiles = files.filter((f) => {
      if (categoryFilter !== 'all' && f.category !== categoryFilter) return false;
      if (q && !f.path.toLowerCase().includes(q)) return false;
      return true;
    });

    for (const file of filteredFiles) {
      const parts = file.path.split('/');
      let current = root;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLeaf = i === parts.length - 1;
        const currentPath = parts.slice(0, i + 1).join('/');

        let child = current.children.find((c) => c.name === part);

        if (!child) {
          child = {
            name: part,
            path: currentPath,
            type: isLeaf ? file.type : 'tree',
            category: isLeaf ? file.category : 'folder',
            size: isLeaf ? file.size : undefined,
            children: [],
          };
          current.children.push(child);
        }

        current = child;
      }
    }

    // Sort folders first, then files alphabetically
    const sortTree = (node: TreeNode) => {
      node.children.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'tree' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      node.children.forEach(sortTree);
    };

    sortTree(root);
    return root.children;
  }, [files, searchQuery, categoryFilter]);

  const getFileIcon = (category: FileCategory, ext?: string) => {
    switch (category) {
      case 'database':
        return <Database className="w-3.5 h-3.5 text-zinc-500 shrink-0" />;
      case 'component':
        return <Layers className="w-3.5 h-3.5 text-zinc-500 shrink-0" />;
      case 'service':
        return <Server className="w-3.5 h-3.5 text-zinc-500 shrink-0" />;
      case 'api':
        return <Globe className="w-3.5 h-3.5 text-zinc-500 shrink-0" />;
      case 'test':
        return <FileCheck className="w-3.5 h-3.5 text-zinc-400 shrink-0" />;
      case 'doc':
        return <FileText className="w-3.5 h-3.5 text-zinc-400 shrink-0" />;
      default:
        return <FileCode className="w-3.5 h-3.5 text-zinc-400 shrink-0" />;
    }
  };

  const renderNode = (node: TreeNode, depth: number = 0) => {
    const isFolder = node.type === 'tree';
    const isExpanded = expandedFolders.has(node.path) || Boolean(searchQuery.trim());
    const isSelected = selectedFile === node.path;

    return (
      <div key={node.path} className="select-none">
        <div
          onClick={() => {
            if (isFolder) {
              toggleFolder(node.path);
            } else {
              onSelectFile(node.path);
            }
          }}
          style={{ paddingLeft: `${depth * 14 + 10}px` }}
          className={`flex items-center gap-1.5 py-1.5 pr-2 rounded-md cursor-pointer transition-colors text-xs font-mono group ${
            isSelected
              ? 'bg-zinc-900 text-white font-medium shadow-2xs'
              : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900'
          }`}
        >
          {isFolder ? (
            <>
              {isExpanded ? (
                <ChevronDown className="w-3 h-3 text-zinc-400 shrink-0" />
              ) : (
                <ChevronRight className="w-3 h-3 text-zinc-400 shrink-0" />
              )}
              {isExpanded ? (
                <FolderOpen className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              ) : (
                <Folder className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              )}
            </>
          ) : (
            <>
              <span className="w-3 shrink-0" />
              {getFileIcon(node.category)}
            </>
          )}

          <span className="truncate">{node.name}</span>
        </div>

        {isFolder && isExpanded && (
          <div>{node.children.map((child) => renderNode(child, depth + 1))}</div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
      {/* Top Filter and Search Bar */}
      <div className="p-3 border-b border-zinc-200 bg-zinc-50 space-y-2">
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs">
          <Search className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files..."
            className="w-full bg-transparent outline-none text-zinc-800 placeholder:text-zinc-400 font-mono text-xs"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
          {(['all', 'component', 'service', 'database', 'api'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono capitalize transition-colors shrink-0 cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-zinc-800 text-white'
                  : 'bg-white hover:bg-zinc-100 text-zinc-600 border border-zinc-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-y-auto p-2">
        {tree.length === 0 ? (
          <div className="p-6 text-center text-xs text-zinc-400 font-mono">No files match filter</div>
        ) : (
          tree.map((node) => renderNode(node, 0))
        )}
      </div>
    </div>
  );
}
