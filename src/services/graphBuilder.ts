import dagre from 'dagre';
import { Node, Edge } from '@xyflow/react';
import { RepoFile, ArchitectureNodeData, ArchitectureEdgeData, FileCategory } from '../types';

export interface GraphBuildResult {
  nodes: Node<ArchitectureNodeData>[];
  edges: Edge<ArchitectureEdgeData>[];
  connectionsMap: Map<string, Set<string>>;
}

/**
 * Universal Polyglot Import Extractor
 */
export function extractImportsFromCode(code: string, currentPath: string): string[] {
  const targets: string[] = [];
  const ext = currentPath.split('.').pop()?.toLowerCase() || '';

  // 1. ES6 / TypeScript / React / Vue / Svelte
  const es6Regex = /(?:import|export)\s+(?:[\w*\s{},]*\s+from\s+)?['"]([^'"]+)['"]/g;
  let match;
  while ((match = es6Regex.exec(code)) !== null) {
    targets.push(match[1]);
  }

  // CommonJS require & Dynamic import
  const cjsRegex = /(?:require|import)\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = cjsRegex.exec(code)) !== null) {
    targets.push(match[1]);
  }

  // 2. Dart / Flutter
  if (ext === 'dart') {
    const dartRegex = /(?:import|export)\s+['"]([^'"]+)['"]/g;
    while ((match = dartRegex.exec(code)) !== null) {
      targets.push(match[1]);
    }
  }

  // 3. Python
  if (ext === 'py') {
    const pyRegex = /(?:from\s+([\w.]+)\s+import|import\s+([\w.]+))/g;
    while ((match = pyRegex.exec(code)) !== null) {
      const imp = match[1] || match[2];
      if (imp) targets.push(imp);
    }
  }

  // 4. Java / Kotlin
  if (ext === 'java' || ext === 'kt') {
    const javaRegex = /import\s+(?:static\s+)?([\w.]+);?/g;
    while ((match = javaRegex.exec(code)) !== null) {
      targets.push(match[1]);
    }
  }

  // 5. C / C++
  if (['c', 'cpp', 'cc', 'cxx', 'h', 'hpp'].includes(ext)) {
    const cppRegex = /#include\s+["<]([^">]+)[">]/g;
    while ((match = cppRegex.exec(code)) !== null) {
      targets.push(match[1]);
    }
  }

  // 6. Rust
  if (ext === 'rs') {
    const rustRegex = /(?:use\s+([\w:]+)|mod\s+([\w]+));/g;
    while ((match = rustRegex.exec(code)) !== null) {
      targets.push(match[1] || match[2]);
    }
  }

  // 7. Go
  if (ext === 'go') {
    const goRegex = /import\s+(?:\(\s*([\s\S]*?)\s*\)|"([^"]+)")/g;
    while ((match = goRegex.exec(code)) !== null) {
      if (match[2]) {
        targets.push(match[2]);
      } else if (match[1]) {
        const innerRegex = /"([^"]+)"/g;
        let innerMatch;
        while ((innerMatch = innerRegex.exec(match[1])) !== null) {
          targets.push(innerMatch[1]);
        }
      }
    }
  }

  // 8. C#
  if (ext === 'cs') {
    const csRegex = /using\s+([\w.]+);/g;
    while ((match = csRegex.exec(code)) !== null) {
      targets.push(match[1]);
    }
  }

  // 9. PHP / Ruby / Swift
  if (ext === 'php' || ext === 'rb' || ext === 'swift') {
    const genericRegex = /(?:use|require|require_relative|import)\s+['"]?([^'";\s]+)['"]?/g;
    while ((match = genericRegex.exec(code)) !== null) {
      targets.push(match[1]);
    }
  }

  return Array.from(new Set(targets));
}

/**
 * Universal Polyglot Path Resolver
 */
export function resolveImportPath(importTarget: string, fromPath: string, allFiles: Set<string>): string | null {
  if (!importTarget) return null;

  // Flutter / Dart package imports (e.g. package:easylens/screens/home.dart -> lib/screens/home.dart)
  if (importTarget.startsWith('package:')) {
    const parts = importTarget.replace('package:', '').split('/');
    if (parts.length > 1) {
      const relativeInLib = 'lib/' + parts.slice(1).join('/');
      if (allFiles.has(relativeInLib)) return relativeInLib;
      for (const ext of ['.dart', '.ts', '.js']) {
        if (allFiles.has(relativeInLib + ext)) return relativeInLib + ext;
      }
    }
  }

  let relative = importTarget;
  let basePath = fromPath.substring(0, fromPath.lastIndexOf('/'));

  if (relative.startsWith('@/') || relative.startsWith('~/')) {
    relative = 'src/' + relative.slice(2);
    basePath = '';
  } else if (relative.startsWith('$lib/')) {
    relative = 'src/lib/' + relative.slice(5);
    basePath = '';
  }

  if (relative.startsWith('.') || relative.startsWith('/') || relative.includes('/')) {
    const segments = basePath ? basePath.split('/') : [];
    for (const segment of relative.split('/')) {
      if (segment === '.' || segment === '') continue;
      if (segment === '..') {
        segments.pop();
      } else {
        segments.push(segment);
      }
    }
    const normalized = segments.join('/');

    if (allFiles.has(normalized)) return normalized;

    const extensions = [
      '.dart', '.tsx', '.ts', '.jsx', '.js', '.vue', '.svelte', '.py',
      '.java', '.kt', '.c', '.cpp', '.h', '.hpp', '.cs', '.go', '.rs',
      '.php', '.rb', '.swift', '.json'
    ];
    for (const ext of extensions) {
      if (allFiles.has(normalized + ext)) return normalized + ext;
      if (allFiles.has(`${normalized}/index${ext}`)) return `${normalized}/index${ext}`;
      if (allFiles.has(`${normalized}/main${ext}`)) return `${normalized}/main${ext}`;
    }
  }

  // Fallback: Fuzzy symbol / filename match
  const lastSegment = importTarget.split('.').pop() || importTarget.split('/').pop();
  if (lastSegment) {
    const cleanSegment = lastSegment.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const file of allFiles) {
      const fileNameNoExt = file.split('/').pop()?.split('.')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      if (fileNameNoExt && fileNameNoExt === cleanSegment) {
        return file;
      }
    }
  }

  return null;
}

/**
 * Finds primary project entry point (prioritizing lib/main.dart for Flutter, src/main.tsx for web, etc.)
 */
function findPrimaryEntryPoint(paths: string[]): string {
  // 1. Priority Flutter entry
  const flutterMain = paths.find((p) => p === 'lib/main.dart' || p.endsWith('/lib/main.dart'));
  if (flutterMain) return flutterMain;

  // 2. Priority Web/TS entry
  const webMain = paths.find((p) => /src\/(main|index|App)\.(tsx|ts|jsx|js)$/i.test(p));
  if (webMain) return webMain;

  // 3. Priority Python/Backend entry
  const backendMain = paths.find((p) => /(main|app|server|index|wsgi)\.(py|go|rs|java|kt|cs)$/i.test(p));
  if (backendMain) return backendMain;

  // 4. Any main or index
  const anyMain = paths.find((p) => /main|index|App/i.test(p));
  if (anyMain) return anyMain;

  return paths[0];
}

/**
 * Group files into Directory Subsystems / Modules
 */
function getDirectoryModule(path: string): string {
  const parts = path.split('/');
  if (parts.length <= 2) return parts[0] || 'root';
  // e.g., lib/screens/onboarding/step.dart -> lib/screens
  return `${parts[0]}/${parts[1]}`;
}

export function buildArchitectureGraph(
  files: RepoFile[],
  fileContents: Map<string, string>,
  options: {
    filterCategory?: FileCategory | 'all';
    hideExternal?: boolean;
    rankDirection?: 'TB' | 'LR' | 'BT' | 'RL';
    heatmapMode?: boolean;
    clusterMode?: boolean;
  } = {}
): GraphBuildResult {
  const { filterCategory = 'all', rankDirection = 'TB', clusterMode = false } = options;

  const validExtensions = [
    'ts', 'tsx', 'js', 'jsx', 'dart', 'java', 'kt', 'c', 'cpp', 'cc', 'cxx',
    'h', 'hpp', 'cs', 'php', 'rb', 'swift', 'vue', 'svelte', 'ex', 'exs',
    'py', 'go', 'rs', 'prisma', 'sql'
  ];

  const sourceFiles = files.filter(
    (f) =>
      f.type === 'blob' &&
      validExtensions.includes(f.extension) &&
      f.category !== 'test' &&
      !f.path.includes('.d.ts') &&
      !f.path.includes('.g.dart') &&
      !f.path.includes('.freezed.dart')
  );

  const filePathsSet = new Set(files.map((f) => f.path));
  const candidateSet = new Set(sourceFiles.map((f) => f.path));

  const adjacencyList = new Map<string, Set<string>>();
  const inDegreeMap = new Map<string, number>();

  for (const file of sourceFiles) {
    adjacencyList.set(file.path, new Set());
    inDegreeMap.set(file.path, 0);
  }

  // 1. Explicit import resolution
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

  // Filter paths by category
  let filteredPaths = sourceFiles
    .filter((f) => filterCategory === 'all' || f.category === filterCategory)
    .map((f) => f.path);

  // If too many nodes, cap detailed view to top 45 files sorted by entry priority & coupling
  if (!clusterMode && filteredPaths.length > 50) {
    const primaryEntry = findPrimaryEntryPoint(filteredPaths);
    filteredPaths = filteredPaths.sort((a, b) => {
      if (a === primaryEntry) return -1;
      if (b === primaryEntry) return 1;
      const degA = (adjacencyList.get(a)?.size || 0) + (inDegreeMap.get(a) || 0);
      const degB = (adjacencyList.get(b)?.size || 0) + (inDegreeMap.get(b) || 0);
      return degB - degA;
    }).slice(0, 45);
  }

  const filteredSet = new Set(filteredPaths);
  const edges: Edge<ArchitectureEdgeData>[] = [];
  const connectionsMap = new Map<string, Set<string>>();

  let explicitEdgeCount = 0;
  for (const [source, targets] of adjacencyList.entries()) {
    if (filteredSet.has(source)) {
      for (const target of targets) {
        if (filteredSet.has(target)) {
          explicitEdgeCount++;
          edges.push({
            id: `e-${source}-${target}`,
            source,
            target,
            data: { type: 'direct' },
            type: 'smoothstep',
            style: { stroke: '#64748b', strokeWidth: 1.5 },
          });

          if (!connectionsMap.has(source)) connectionsMap.set(source, new Set());
          if (!connectionsMap.has(target)) connectionsMap.set(target, new Set());
          connectionsMap.get(source)!.add(target);
          connectionsMap.get(target)!.add(source);
        }
      }
    }
  }

  // 2. Hierarchical Directory Subsystem Fallback (PREVENTS SINGLE FLAT HORIZONTAL LINE)
  if (explicitEdgeCount === 0 && filteredPaths.length > 0) {
    const primaryEntry = findPrimaryEntryPoint(filteredPaths);

    // Group files by directory subsystem
    const modulesMap = new Map<string, string[]>();
    for (const p of filteredPaths) {
      const mod = getDirectoryModule(p);
      if (!modulesMap.has(mod)) modulesMap.set(mod, []);
      modulesMap.get(mod)!.push(p);
    }

    // Connect Entry -> Directory Subsystem Leader -> Subsystem Files (hierarchical multi-rank layout!)
    for (const [mod, modFiles] of modulesMap.entries()) {
      const leader = modFiles.find((f) => f === primaryEntry) || modFiles[0];

      if (leader !== primaryEntry) {
        edges.push({
          id: `e-${primaryEntry}-${leader}`,
          source: primaryEntry,
          target: leader,
          data: { type: 'hierarchy' },
          type: 'smoothstep',
          style: { stroke: '#3b82f6', strokeWidth: 2, strokeDasharray: '4 4' },
        });
        if (!connectionsMap.has(primaryEntry)) connectionsMap.set(primaryEntry, new Set());
        if (!connectionsMap.has(leader)) connectionsMap.set(leader, new Set());
        connectionsMap.get(primaryEntry)!.add(leader);
        connectionsMap.get(leader)!.add(primaryEntry);
      }

      // Connect leader to other files within the SAME directory module (max 4 per sub-branch to prevent horizontal spillage)
      for (let i = 1; i < Math.min(modFiles.length, 6); i++) {
        const file = modFiles[i];
        const parentNode = modFiles[Math.floor((i - 1) / 2)] || leader;
        if (file !== parentNode) {
          edges.push({
            id: `e-${parentNode}-${file}`,
            source: parentNode,
            target: file,
            data: { type: 'inferred' },
            type: 'smoothstep',
            style: { stroke: '#94a3b8', strokeWidth: 1.5, strokeDasharray: '2 2' },
          });
          if (!connectionsMap.has(parentNode)) connectionsMap.set(parentNode, new Set());
          if (!connectionsMap.has(file)) connectionsMap.set(file, new Set());
          connectionsMap.get(parentNode)!.add(file);
          connectionsMap.get(file)!.add(parentNode);
        }
      }
    }
  }

  // 3. Multi-Column Grid Dagre Layout
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: rankDirection,
    nodesep: 40,
    ranksep: 80,
    marginx: 40,
    marginy: 40,
  });
  g.setDefaultEdgeLabel(() => ({}));

  const nodeWidth = 220;
  const nodeHeight = 68;

  for (const path of filteredPaths) {
    g.setNode(path, { width: nodeWidth, height: nodeHeight });
  }

  for (const edge of edges) {
    if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
      g.setEdge(edge.source, edge.target);
    }
  }

  dagre.layout(g);

  // Map to React Flow nodes with Complexity & Health metrics
  const nodes: Node<ArchitectureNodeData>[] = filteredPaths.map((path) => {
    const file = files.find((f) => f.path === path)!;
    const dagreNode = g.node(path) || { x: 0, y: 0 };
    const importsCount = adjacencyList.get(path)?.size || 0;
    const importedByCount = inDegreeMap.get(path) || 0;
    const isEntryPoint = path === findPrimaryEntryPoint(filteredPaths);

    const fileSize = file.size || 500;
    const couplingScore = importsCount + importedByCount;
    const complexityScore = Math.min(100, Math.round((fileSize / 100) + couplingScore * 8));

    let healthColor: 'green' | 'yellow' | 'red' = 'green';
    if (complexityScore > 65) {
      healthColor = 'red';
    } else if (complexityScore > 35) {
      healthColor = 'yellow';
    }

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
        complexityScore,
        couplingScore,
        healthColor,
      },
    };
  });

  return {
    nodes,
    edges,
    connectionsMap,
  };
}
