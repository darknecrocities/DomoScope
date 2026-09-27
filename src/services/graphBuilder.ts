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
export function findPrimaryEntryPoint(paths: string[]): string {
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

  return paths[0] || '';
}

/**
 * Group files into Directory Subsystems / Modules
 */
export function getDirectoryModule(path: string): string {
  const parts = path.split('/');
  if (parts.length <= 2) return parts[0] || 'root';
  return `${parts[0]}/${parts[1]}`;
}

/**
 * Architectural Tier Classification for Balanced Vertical Hierarchy
 */
export function getArchitecturalTier(path: string, category: FileCategory, isEntry: boolean): number {
  if (isEntry) return 0;

  const lower = path.toLowerCase();

  // Tier 0: Only primary entry file
  if (/^(src\/)?(main|index)\.[a-z]+$/i.test(path) || lower === 'lib/main.dart') {
    return 0;
  }

  // Tier 1: Root Layout, Pages, Screens & Routing
  if (
    /^(src\/)?app\.[a-z]+$/i.test(path) ||
    lower.includes('/pages/') ||
    lower.includes('/screens/') ||
    lower.includes('/views/') ||
    lower.includes('/routes/') ||
    lower.includes('page.') ||
    lower.includes('route.')
  ) {
    return 1;
  }

  // Tier 2: UI Components & Subviews
  if (
    category === 'component' ||
    lower.includes('/components/') ||
    lower.includes('/widgets/') ||
    lower.includes('/ui/') ||
    lower.includes('/elements/') ||
    lower.includes('/layouts/') ||
    lower.includes('/modals/') ||
    lower.includes('/cards/')
  ) {
    return 2;
  }

  // Tier 3: State Management & Logic
  if (
    lower.includes('/hooks/') ||
    lower.includes('/store/') ||
    lower.includes('/context/') ||
    lower.includes('/controllers/') ||
    lower.includes('/state/') ||
    lower.includes('/bloc/') ||
    lower.includes('/provider/')
  ) {
    return 3;
  }

  // Tier 4: Core Services & Helpers
  if (
    category === 'service' ||
    lower.includes('/services/') ||
    lower.includes('/utils/') ||
    lower.includes('/helpers/') ||
    lower.includes('/lib/') ||
    lower.includes('/core/')
  ) {
    return 4;
  }

  // Tier 5: API & Network Integration
  if (
    category === 'api' ||
    lower.includes('/api/') ||
    lower.includes('/endpoints/') ||
    lower.includes('/clients/') ||
    lower.includes('/network/')
  ) {
    return 5;
  }

  // Tier 6: Database & Persistence
  if (
    category === 'database' ||
    lower.includes('/db/') ||
    lower.includes('/models/') ||
    lower.includes('/schema/') ||
    lower.includes('/repositories/') ||
    lower.includes('.prisma') ||
    lower.endsWith('.sql')
  ) {
    return 6;
  }

  // Tier 7: Config, Types & Constants
  return 7;
}

interface NodeLayoutCoord {
  x: number;
  y: number;
}

/**
 * Computes a balanced, vertical multi-column layout for architecture nodes.
 * Prevents horizontal pancake spreading by grouping files into architectural tiers
 * and wrapping nodes into clean, centered columns (maximum 3-4 per row).
 */
function computeBalancedArchitectureLayout(
  filteredPaths: string[],
  filesMap: Map<string, RepoFile>,
  primaryEntry: string,
  rankDirection: 'TB' | 'LR' | 'BT' | 'RL'
): Map<string, NodeLayoutCoord> {
  const coords = new Map<string, NodeLayoutCoord>();
  const isLR = rankDirection === 'LR';

  const NODE_WIDTH = 220;
  const NODE_HEIGHT = 72;
  const COL_GAP = 48;
  const ROW_GAP = 36;
  const TIER_GAP = 64;

  // Group paths into 8 Architectural Tiers
  const tierBuckets = new Map<number, string[]>();
  for (let t = 0; t <= 7; t++) {
    tierBuckets.set(t, []);
  }

  for (const path of filteredPaths) {
    const file = filesMap.get(path);
    const category = file?.category || 'file';
    const isEntry = path === primaryEntry;
    const tier = getArchitecturalTier(path, category, isEntry);
    tierBuckets.get(tier)!.push(path);
  }

  // Within each tier, keep related directory subsystems clustered together
  for (let t = 0; t <= 7; t++) {
    const list = tierBuckets.get(t)!;
    list.sort((a, b) => {
      const modA = getDirectoryModule(a);
      const modB = getDirectoryModule(b);
      if (modA !== modB) return modA.localeCompare(modB);
      return a.localeCompare(b);
    });
  }

  if (isLR) {
    // Horizontal (Left-to-Right) Layout: Tiers advance along X, columns advance along X, rows advance along Y
    let currentX = 40;

    for (let t = 0; t <= 7; t++) {
      const pathsInTier = tierBuckets.get(t)!;
      if (pathsInTier.length === 0) continue;

      const maxRowsPerCol = 3;
      const numCols = Math.ceil(pathsInTier.length / maxRowsPerCol);

      for (let colIdx = 0; colIdx < numCols; colIdx++) {
        const start = colIdx * maxRowsPerCol;
        const colPaths = pathsInTier.slice(start, start + maxRowsPerCol);
        const colHeight = colPaths.length * NODE_HEIGHT + (colPaths.length - 1) * ROW_GAP;
        const startY = -colHeight / 2;

        for (let rowIdx = 0; rowIdx < colPaths.length; rowIdx++) {
          const path = colPaths[rowIdx];
          const x = currentX + colIdx * (NODE_WIDTH + COL_GAP);
          const y = startY + rowIdx * (NODE_HEIGHT + ROW_GAP);
          coords.set(path, { x, y });
        }
      }

      currentX += numCols * (NODE_WIDTH + COL_GAP) + TIER_GAP;
    }
  } else {
    // Vertical (Top-to-Bottom) Layout: Tiers advance along Y, rows advance along Y, columns advance along X
    let currentY = 40;

    for (let t = 0; t <= 7; t++) {
      const pathsInTier = tierBuckets.get(t)!;
      if (pathsInTier.length === 0) continue;

      // Wrap into rows of max 3 (or 4 for larger sets, 2 for 4 items)
      let maxColsPerRow = 3;
      if (pathsInTier.length >= 8) {
        maxColsPerRow = 4;
      } else if (pathsInTier.length === 4) {
        maxColsPerRow = 2; // 2 rows of 2 is clean and balanced
      }

      const numRows = Math.ceil(pathsInTier.length / maxColsPerRow);

      for (let rowIdx = 0; rowIdx < numRows; rowIdx++) {
        const start = rowIdx * maxColsPerRow;
        const rowPaths = pathsInTier.slice(start, start + maxColsPerRow);
        const rowWidth = rowPaths.length * NODE_WIDTH + (rowPaths.length - 1) * COL_GAP;
        const startX = -rowWidth / 2;

        for (let colIdx = 0; colIdx < rowPaths.length; colIdx++) {
          const path = rowPaths[colIdx];
          const x = startX + colIdx * (NODE_WIDTH + COL_GAP);
          const y = currentY;
          coords.set(path, { x, y });
        }

        currentY += NODE_HEIGHT + ROW_GAP;
      }

      currentY += TIER_GAP - ROW_GAP; // Add distinct tier separation
    }
  }

  return coords;
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
  const filesMap = new Map<string, RepoFile>(files.map((f) => [f.path, f]));

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

  // Fallback: If 'component' filter was selected but repo is a backend/API without visual UI components
  if (filterCategory === 'component' && filteredPaths.length === 0) {
    filteredPaths = sourceFiles
      .filter((f) => f.category === 'api' || f.category === 'service' || f.category === 'database')
      .map((f) => f.path);
    if (filteredPaths.length === 0) {
      filteredPaths = sourceFiles.map((f) => f.path);
    }
  } else if (filteredPaths.length === 0 && sourceFiles.length > 0) {
    filteredPaths = sourceFiles.map((f) => f.path);
  }

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

  // Create explicit dependency edges
  for (const [source, targets] of adjacencyList.entries()) {
    if (filteredSet.has(source)) {
      for (const target of targets) {
        if (filteredSet.has(target)) {
          edges.push({
            id: `e-${source}-${target}`,
            source,
            target,
            data: { type: 'direct' },
            type: 'smoothstep',
            style: { stroke: '#94a3b8', strokeWidth: 1.5 },
          });

          if (!connectionsMap.has(source)) connectionsMap.set(source, new Set());
          if (!connectionsMap.has(target)) connectionsMap.set(target, new Set());
          connectionsMap.get(source)!.add(target);
          connectionsMap.get(target)!.add(source);
        }
      }
    }
  }

  // 2. Structured Inferred Connections for Unconnected Subsystems
  const primaryEntry = findPrimaryEntryPoint(filteredPaths);
  const connectedNodeIds = new Set<string>();
  for (const e of edges) {
    connectedNodeIds.add(e.source);
    connectedNodeIds.add(e.target);
  }

  // Group files by directory subsystem
  const modulesMap = new Map<string, string[]>();
  for (const p of filteredPaths) {
    const mod = getDirectoryModule(p);
    if (!modulesMap.has(mod)) modulesMap.set(mod, []);
    modulesMap.get(mod)!.push(p);
  }

  // Connect orphan files within their module
  for (const [, modFiles] of modulesMap.entries()) {
    const leader = modFiles.find((f) => connectedNodeIds.has(f)) || modFiles[0];

    for (const file of modFiles) {
      if (file !== leader && !connectedNodeIds.has(file)) {
        edges.push({
          id: `e-mod-${leader}-${file}`,
          source: leader,
          target: file,
          data: { type: 'inferred' },
          type: 'smoothstep',
          style: { stroke: '#a1a1aa', strokeWidth: 1.2, strokeDasharray: '3 3' },
        });
        connectedNodeIds.add(file);
        connectedNodeIds.add(leader);
        if (!connectionsMap.has(leader)) connectionsMap.set(leader, new Set());
        if (!connectionsMap.has(file)) connectionsMap.set(file, new Set());
        connectionsMap.get(leader)!.add(file);
        connectionsMap.get(file)!.add(leader);
      }
    }
  }

  // 3. Compute Balanced Vertical Architecture Layout Coordinates
  const layoutCoords = computeBalancedArchitectureLayout(
    filteredPaths,
    filesMap,
    primaryEntry,
    rankDirection
  );

  // Map to React Flow nodes with Complexity & Health metrics
  const nodes: Node<ArchitectureNodeData>[] = filteredPaths.map((path) => {
    const file = filesMap.get(path) || {
      path,
      name: path.split('/').pop() || path,
      type: 'blob' as const,
      sha: path,
      extension: path.split('.').pop() || '',
      category: 'file' as const,
    };

    const coord = layoutCoords.get(path) || { x: 0, y: 0 };
    const importsCount = adjacencyList.get(path)?.size || 0;
    const importedByCount = inDegreeMap.get(path) || 0;
    const isEntryPoint = path === primaryEntry;

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
        x: coord.x,
        y: coord.y,
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
        heatmapMode: options.heatmapMode,
        rankDirection,
      },
    };
  });

  return {
    nodes,
    edges,
    connectionsMap,
  };
}
