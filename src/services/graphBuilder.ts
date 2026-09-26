import dagre from 'dagre';
import { Node, Edge } from '@xyflow/react';
import { RepoFile, ArchitectureNodeData, ArchitectureEdgeData, FileCategory } from '../types';

export interface GraphBuildResult {
  nodes: Node<ArchitectureNodeData>[];
  edges: Edge<ArchitectureEdgeData>[];
  connectionsMap: Map<string, Set<string>>; // node -> set of connected node IDs
}

export function extractImportsFromCode(code: string, currentPath: string): string[] {
  const targets: string[] = [];

  // ES6 imports / exports: import ... from './...' or export ... from './...'
  const es6Regex = /(?:import|export)\s+(?:[\w*\s{},]*\s+from\s+)?['"]([^'"]+)['"]/g;
  let match;
  while ((match = es6Regex.exec(code)) !== null) {
    targets.push(match[1]);
  }

  // CommonJS require: require('./...')
  const cjsRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = cjsRegex.exec(code)) !== null) {
    targets.push(match[1]);
  }

  // Dynamic import: import('./...')
  const dynRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = dynRegex.exec(code)) !== null) {
    targets.push(match[1]);
  }

  // Python: from .something import or from ..something import
  if (currentPath.endsWith('.py')) {
    const pyRegex = /from\s+(\.+[a-zA-Z0-9_.]*)\s+import/g;
    while ((match = pyRegex.exec(code)) !== null) {
      targets.push(match[1]);
    }
  }

  return targets;
}

export function resolveImportPath(importTarget: string, fromPath: string, allFiles: Set<string>): string | null {
  // If target is external package (doesn't start with . or / or @/), return null or package name
  if (!importTarget.startsWith('.') && !importTarget.startsWith('/') && !importTarget.startsWith('@/')) {
    return null;
  }

  let basePath = fromPath.substring(0, fromPath.lastIndexOf('/'));
  let relative = importTarget;

  // Handle @/ or ~/ alias (common in Vite/Next.js)
  if (relative.startsWith('@/') || relative.startsWith('~/')) {
    relative = 'src/' + relative.slice(2);
    basePath = '';
  }

  // Build normalized path
  const parts = basePath ? basePath.split('/') : [];
  for (const segment of relative.split('/')) {
    if (segment === '.' || segment === '') continue;
    if (segment === '..') {
      parts.pop();
    } else {
      parts.push(segment);
    }
  }

  const normalized = parts.join('/');

  // Try exact match
  if (allFiles.has(normalized)) return normalized;

  // Try with extensions
  const extensions = ['.tsx', '.ts', '.jsx', '.js', '.vue', '.svelte', '.py', '.json'];
  for (const ext of extensions) {
    const candidate = normalized + ext;
    if (allFiles.has(candidate)) return candidate;
  }

  // Try index files
  for (const ext of extensions) {
    const candidate = `${normalized}/index${ext}`;
    if (allFiles.has(candidate)) return candidate;
  }

  return null;
}

export function buildArchitectureGraph(
  files: RepoFile[],
  fileContents: Map<string, string>,
  options: {
    filterCategory?: FileCategory | 'all';
    hideExternal?: boolean;
    rankDirection?: 'TB' | 'LR';
  } = {}
): GraphBuildResult {
  const { filterCategory = 'all', rankDirection = 'TB' } = options;

  // Pick candidate source files (limit initial graph to top 50 files if huge repo for fluid performance)
  const sourceFiles = files.filter(
    (f) =>
      f.type === 'blob' &&
      ['ts', 'tsx', 'js', 'jsx', 'py', 'go', 'rs', 'prisma', 'sql'].includes(f.extension) &&
      f.category !== 'test' &&
      !f.path.includes('.d.ts')
  );

  const filePathsSet = new Set(files.map((f) => f.path));
  const candidateSet = new Set(sourceFiles.map((f) => f.path));

  const adjacencyList = new Map<string, Set<string>>();
  const inDegreeMap = new Map<string, number>();

  for (const file of sourceFiles) {
    adjacencyList.set(file.path, new Set());
    inDegreeMap.set(file.path, 0);
  }

  // Build edges from contents or inferred imports
  for (const file of sourceFiles) {
    const code = fileContents.get(file.path);
    if (!code) continue;

    const rawImports = extractImportsFromCode(code, file.path);
    for (const rawImport of rawImports) {
      const resolved = resolveImportPath(rawImport, file.path, filePathsSet);
      if (resolved && candidateSet.has(resolved) && resolved !== file.path) {
        adjacencyList.get(file.path)?.add(resolved);
        inDegreeMap.set(resolved, (inDegreeMap.get(resolved) || 0) + 1);
      }
    }
  }

  // Filter nodes if user selected category
  const filteredPaths = sourceFiles
    .filter((f) => filterCategory === 'all' || f.category === filterCategory)
    .map((f) => f.path);

  // Fallback: If no file contents loaded yet, create structural connections based on directory hierarchy & category
  const edges: Edge<ArchitectureEdgeData>[] = [];
  const connectionsMap = new Map<string, Set<string>>();

  let hasExplicitEdges = false;
  for (const [source, targets] of adjacencyList.entries()) {
    if (targets.size > 0) {
      hasExplicitEdges = true;
      for (const target of targets) {
        edges.push({
          id: `e-${source}-${target}`,
          source,
          target,
          data: { type: 'direct' },
          type: 'smoothstep',
          style: { stroke: '#71717A', strokeWidth: 1.5 },
        });

        if (!connectionsMap.has(source)) connectionsMap.set(source, new Set());
        if (!connectionsMap.has(target)) connectionsMap.set(target, new Set());
        connectionsMap.get(source)!.add(target);
        connectionsMap.get(target)!.add(source);
      }
    }
  }

  // If no contents parsed yet, connect entry points to main components/services to make the initial graph immediately beautiful & connected!
  if (!hasExplicitEdges && filteredPaths.length > 0) {
    const entry = filteredPaths.find((p) => p.includes('main') || p.includes('index') || p.includes('App')) || filteredPaths[0];
    for (const path of filteredPaths) {
      if (path !== entry && (path.includes('src/') || filteredPaths.length < 15)) {
        edges.push({
          id: `e-${entry}-${path}`,
          source: entry,
          target: path,
          data: { type: 'inferred' },
          type: 'smoothstep',
          style: { stroke: '#A1A1AA', strokeWidth: 1.5, strokeDasharray: '4 4' },
        });
        if (!connectionsMap.has(entry)) connectionsMap.set(entry, new Set());
        if (!connectionsMap.has(path)) connectionsMap.set(path, new Set());
        connectionsMap.get(entry)!.add(path);
        connectionsMap.get(path)!.add(entry);
      }
    }
  }

  // Dagre layout configuration
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: rankDirection,
    nodesep: 40,
    ranksep: 70,
    marginx: 40,
    marginy: 40,
  });
  g.setDefaultEdgeLabel(() => ({}));

  const nodeWidth = 220;
  const nodeHeight = 68;

  // Add nodes to dagre
  for (const path of filteredPaths) {
    g.setNode(path, { width: nodeWidth, height: nodeHeight });
  }

  // Add edges to dagre
  for (const edge of edges) {
    if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
      g.setEdge(edge.source, edge.target);
    }
  }

  dagre.layout(g);

  // Map to React Flow nodes
  const nodes: Node<ArchitectureNodeData>[] = filteredPaths.map((path) => {
    const file = files.find((f) => f.path === path)!;
    const dagreNode = g.node(path) || { x: 0, y: 0 };
    const importsCount = adjacencyList.get(path)?.size || 0;
    const importedByCount = inDegreeMap.get(path) || 0;
    const isEntryPoint = /main|index|App\.[a-z]+$/i.test(path);

    return {
      id: path,
      type: 'customCard',
      position: {
        x: dagreNode.x - nodeWidth / 2,
        y: dagreNode.y - nodeHeight / 2,
      },
      data: {
        label: file.name,
        path: file.path,
        extension: file.extension,
        category: file.category,
        importsCount,
        importedByCount,
        size: file.size,
        isEntryPoint,
        isDatabase: file.category === 'database',
      },
    };
  });

  return {
    nodes,
    edges,
    connectionsMap,
  };
}
