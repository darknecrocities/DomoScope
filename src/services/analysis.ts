import { RepoMetadata, RepoFile, RepoAnalysis, FileCategory } from '../types';

const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  ts: 'TypeScript',
  tsx: 'TypeScript',
  js: 'JavaScript',
  jsx: 'JavaScript',
  py: 'Python',
  go: 'Go',
  rs: 'Rust',
  java: 'Java',
  c: 'C',
  cpp: 'C++',
  cs: 'C#',
  rb: 'Ruby',
  php: 'PHP',
  swift: 'Swift',
  kt: 'Kotlin',
  html: 'HTML',
  css: 'CSS',
  scss: 'SCSS',
  sql: 'SQL',
  prisma: 'Prisma',
  json: 'JSON',
  yaml: 'YAML',
  yml: 'YAML',
  md: 'Markdown',
};

export function analyzeRepository(metadata: RepoMetadata, files: RepoFile[]): RepoAnalysis {
  const categoriesCount: Record<FileCategory, number> = {
    component: 0,
    service: 0,
    api: 0,
    database: 0,
    config: 0,
    test: 0,
    style: 0,
    doc: 0,
    file: 0,
    folder: 0,
  };

  const languages: Record<string, number> = {};
  let totalFiles = 0;
  let totalDirs = 0;

  for (const f of files) {
    if (f.type === 'tree') {
      totalDirs++;
      categoriesCount.folder++;
    } else {
      totalFiles++;
      categoriesCount[f.category] = (categoriesCount[f.category] || 0) + 1;

      if (f.extension) {
        const lang = EXTENSION_LANGUAGE_MAP[f.extension] || f.extension.toUpperCase();
        languages[lang] = (languages[lang] || 0) + 1;
      }
    }
  }

  const detectedTools = detectTools(files);
  const entryPoints = detectEntryPoints(files);
  const summary = generateProjectSummary(metadata, totalFiles, categoriesCount, detectedTools, entryPoints);

  return {
    metadata,
    files,
    summary,
    categoriesCount,
    languages,
    totalFiles,
    totalDirs,
    detectedTools,
    entryPoints,
  };
}

function detectTools(files: RepoFile[]): string[] {
  const tools = new Set<string>();
  const paths = files.map((f) => f.path.toLowerCase());

  // Package & build
  if (paths.some((p) => p.endsWith('package.json'))) tools.add('Node.js');
  if (paths.some((p) => p.includes('vite.config'))) tools.add('Vite');
  if (paths.some((p) => p.includes('next.config') || p.includes('app/layout.'))) tools.add('Next.js');
  if (paths.some((p) => p.includes('tailwind.config'))) tools.add('Tailwind CSS');
  if (paths.some((p) => p.includes('tsconfig.json') || p.endsWith('.ts') || p.endsWith('.tsx'))) tools.add('TypeScript');

  // Frontend frameworks
  if (paths.some((p) => p.endsWith('.tsx') || p.endsWith('.jsx'))) tools.add('React');
  if (paths.some((p) => p.endsWith('.vue'))) tools.add('Vue');
  if (paths.some((p) => p.endsWith('.svelte'))) tools.add('Svelte');

  // Backend / Python / Go / Rust
  if (paths.some((p) => p.endsWith('requirements.txt') || p.endsWith('pyproject.toml') || p.endsWith('.py'))) tools.add('Python');
  if (paths.some((p) => p.endsWith('go.mod') || p.endsWith('.go'))) tools.add('Go');
  if (paths.some((p) => p.endsWith('cargo.toml') || p.endsWith('.rs'))) tools.add('Rust');

  // Database
  if (paths.some((p) => p.includes('schema.prisma'))) tools.add('Prisma');
  if (paths.some((p) => p.includes('drizzle.config') || p.includes('drizzle/'))) tools.add('Drizzle');
  if (paths.some((p) => p.endsWith('.sql'))) tools.add('SQL');

  // Testing
  if (paths.some((p) => p.includes('vitest.config'))) tools.add('Vitest');
  if (paths.some((p) => p.includes('jest.config'))) tools.add('Jest');
  if (paths.some((p) => p.includes('playwright.config'))) tools.add('Playwright');

  // DevOps
  if (paths.some((p) => p.includes('dockerfile') || p.includes('docker-compose'))) tools.add('Docker');
  if (paths.some((p) => p.includes('.github/workflows'))) tools.add('GitHub Actions');

  return Array.from(tools);
}

function detectEntryPoints(files: RepoFile[]): string[] {
  const filePaths = new Set(files.map((f) => f.path));

  // Determine repository ecosystem to prioritize idiomatic entry points
  const isFlutter = files.some((f) => /\.dart$/i.test(f.path)) || filePaths.has('pubspec.yaml');
  const isPython = files.some((f) => /\.py$/i.test(f.path)) || filePaths.has('requirements.txt') || filePaths.has('pyproject.toml');
  const isGo = files.some((f) => /\.go$/i.test(f.path)) || filePaths.has('go.mod');
  const isRust = files.some((f) => /\.rs$/i.test(f.path)) || filePaths.has('Cargo.toml');
  const isPhp = files.some((f) => /\.php$/i.test(f.path)) || filePaths.has('composer.json');
  const isNext = files.some((f) => /next\.config/i.test(f.path)) || Array.from(filePaths).some((p) => /^app\/(page|layout)\.[jt]sx?$/i.test(p));
  const isVue = files.some((f) => /\.vue$/i.test(f.path));
  const isSvelte = files.some((f) => /\.svelte$/i.test(f.path));

  let prioritizedCandidates: string[] = [];

  if (isFlutter) {
    prioritizedCandidates = ['lib/main.dart', 'lib/app.dart'];
  } else if (isPython) {
    prioritizedCandidates = ['main.py', 'app.py', 'manage.py', 'src/main.py', 'src/app.py', 'wsgi.py'];
  } else if (isGo) {
    prioritizedCandidates = ['cmd/main.go', 'main.go', 'cmd/server/main.go', 'cmd/app/main.go'];
  } else if (isRust) {
    prioritizedCandidates = ['src/main.rs', 'src/lib.rs'];
  } else if (isPhp) {
    prioritizedCandidates = ['public/index.php', 'index.php', 'artisan'];
  } else if (isNext) {
    prioritizedCandidates = ['app/page.tsx', 'pages/index.tsx', 'app/page.jsx', 'pages/index.jsx', 'app/layout.tsx'];
  } else if (isVue) {
    prioritizedCandidates = ['src/main.ts', 'src/main.js', 'src/App.vue'];
  } else if (isSvelte) {
    prioritizedCandidates = ['src/routes/+page.svelte', 'src/app.html', 'src/main.ts', 'src/main.js'];
  } else {
    prioritizedCandidates = [
      'src/main.tsx',
      'src/main.ts',
      'src/index.tsx',
      'src/index.ts',
      'src/App.tsx',
      'src/index.js',
      'src/server.ts',
      'src/server.js',
      'src/app.ts',
      'index.js',
      'server.js',
    ];
  }

  const commonEntries = [
    ...prioritizedCandidates,
    'src/main.tsx',
    'src/main.ts',
    'src/index.tsx',
    'src/index.ts',
    'src/App.tsx',
    'src/App.vue',
    'src/routes/+page.svelte',
    'src/index.js',
    'src/server.ts',
    'src/server.js',
    'src/app.ts',
    'app/page.tsx',
    'pages/index.tsx',
    'main.py',
    'app.py',
    'manage.py',
    'cmd/main.go',
    'main.go',
    'src/main.rs',
    'src/lib.rs',
    'lib/main.dart',
    'public/index.php',
  ];

  const uniqueCandidates = Array.from(new Set(commonEntries));
  const found = uniqueCandidates.filter((e) => filePaths.has(e));

  // If no common entries matched, look for files named main or index at root or src
  if (found.length === 0) {
    const backup = files
      .filter((f) => f.type === 'blob' && /^(src\/)?(main|index|app)\.[a-z]+$/i.test(f.path))
      .map((f) => f.path);
    return backup.slice(0, 3);
  }

  return found.slice(0, 3);
}

function generateProjectSummary(
  metadata: RepoMetadata,
  totalFiles: number,
  categories: Record<FileCategory, number>,
  tools: string[],
  entryPoints: string[]
): string {
  const toolList = tools.length > 0 ? tools.slice(0, 5).join(', ') : metadata.language;
  const parts: string[] = [];

  parts.push(
    `${metadata.fullName} is ${
      tools.includes('React') || tools.includes('Next.js') || tools.includes('Vue')
        ? 'a frontend application'
        : tools.includes('Go') || tools.includes('Python') || tools.includes('Rust')
        ? 'a backend project'
        : 'a software project'
    } primarily written in ${metadata.language}.`
  );

  if (toolList) {
    parts.push(`It is built with ${toolList}.`);
  }

  const structureParts: string[] = [];
  if (categories.component > 0) structureParts.push(`${categories.component} UI components`);
  if (categories.api > 0) structureParts.push(`${categories.api} API routes`);
  if (categories.service > 0) structureParts.push(`${categories.service} services`);
  if (categories.database > 0) structureParts.push(`${categories.database} database schemas`);
  if (categories.test > 0) structureParts.push(`${categories.test} test suites`);

  if (structureParts.length > 0) {
    parts.push(`The codebase includes ${structureParts.join(', ')} across ${totalFiles} inspectable files.`);
  } else {
    parts.push(`The codebase comprises ${totalFiles} inspectable files.`);
  }

  if (entryPoints.length > 0) {
    parts.push(`Execution typically begins in ${entryPoints[0]}.`);
  }

  return parts.join(' ');
}
