import JSZip from 'jszip';
import { RepoMetadata, RepoFile } from '../types';

export interface FallbackResult {
  metadata: RepoMetadata;
  files: RepoFile[];
  fileContents: Map<string, string>;
  isFallback: boolean;
  branch: string;
}

const IGNORED_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.nuxt',
  'coverage',
  'venv',
  '.venv',
  'env',
  '.env',
  'vendor',
  'target',
  '__pycache__',
  '.turbo',
  '.cache',
  '.idea',
  '.vscode',
  '.yarn',
  'out',
  'bin',
  'obj',
]);

const BINARY_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'svg',
  'mp4', 'webm', 'mov', 'mp3', 'wav',
  'zip', 'tar', 'gz', 'bz2', '7z', 'rar',
  'pdf', 'doc', 'docx', 'xls', 'xlsx',
  'exe', 'dll', 'so', 'dylib', 'bin',
  'woff', 'woff2', 'ttf', 'eot', 'otf',
  'wasm', 'pyc', 'class', 'o',
]);

function categorizeFile(path: string, ext: string, type: 'blob' | 'tree'): RepoFile['category'] {
  if (type === 'tree') return 'folder';

  const lower = path.toLowerCase();

  if (lower.includes('.test.') || lower.includes('.spec.') || lower.includes('__tests__') || lower.startsWith('tests/')) {
    return 'test';
  }

  if (
    lower.includes('schema.prisma') ||
    lower.includes('migrations/') ||
    lower.endsWith('.sql') ||
    lower.includes('/models/') ||
    lower.includes('drizzle.config') ||
    lower.includes('ormconfig')
  ) {
    return 'database';
  }

  if (
    lower.includes('/api/') ||
    lower.includes('/routes/') ||
    lower.includes('/controllers/') ||
    lower.includes('/endpoints/')
  ) {
    return 'api';
  }

  if (
    ext === 'tsx' ||
    ext === 'jsx' ||
    ext === 'vue' ||
    ext === 'svelte' ||
    ext === 'astro' ||
    lower.includes('/components/') ||
    lower.includes('/widgets/') ||
    lower.includes('/screens/') ||
    lower.includes('/views/') ||
    lower.includes('/pages/') ||
    lower.includes('/layouts/') ||
    lower.includes('/ui/') ||
    lower.includes('/containers/') ||
    lower.includes('/modals/') ||
    lower.includes('/dialogs/') ||
    lower.includes('/elements/') ||
    lower.includes('/cards/') ||
    lower.includes('/navigation/') ||
    lower.includes('/templates/') ||
    lower.includes('/forms/') ||
    lower.includes('/partials/') ||
    lower.includes('/atoms/') ||
    lower.includes('/molecules/') ||
    lower.includes('/organisms/') ||
    lower.includes('/features/') ||
    lower.includes('/compose/') ||
    lower.includes('/fragments/') ||
    lower.endsWith('.component.ts') ||
    lower.endsWith('.component.js') ||
    lower.endsWith('.blade.php') ||
    lower.endsWith('.jinja') ||
    lower.endsWith('.jinja2') ||
    lower.endsWith('.ejs') ||
    lower.endsWith('.hbs') ||
    lower.endsWith('.njk') ||
    lower.endsWith('.twig') ||
    (lower.endsWith('.swift') && (lower.includes('/view') || lower.endsWith('view.swift'))) ||
    (lower.endsWith('.dart') && (lower.includes('/widget') || lower.includes('/screen') || lower.includes('/page'))) ||
    (lower.endsWith('.kt') && (lower.includes('/ui') || lower.includes('/screen') || lower.includes('/compose')))
  ) {
    return 'component';
  }

  if (
    lower.includes('/services/') ||
    lower.includes('/utils/') ||
    lower.includes('/lib/') ||
    lower.includes('/helpers/')
  ) {
    return 'service';
  }

  if (
    lower.endsWith('.json') ||
    lower.endsWith('.yaml') ||
    lower.endsWith('.yml') ||
    lower.endsWith('.toml') ||
    lower.includes('config') ||
    lower.includes('.rc')
  ) {
    return 'config';
  }

  if (ext === 'md' || ext === 'mdx' || ext === 'txt' || lower.includes('license')) {
    return 'doc';
  }

  if (ext === 'css' || ext === 'scss' || ext === 'sass' || ext === 'less') {
    return 'style';
  }

  return 'file';
}

/**
 * High-Availability Zipball Extractor
 * Downloads repository archive via codeload.github.com or raw zip endpoints
 * which bypass GitHub API rate limits completely.
 */
export async function fetchViaZipball(
  owner: string,
  repo: string,
  targetBranch: string = 'main'
): Promise<FallbackResult | null> {
  const cacheBuster = Date.now();
  const branchesToTry = Array.from(new Set([targetBranch, 'HEAD', 'main', 'master', 'dev', 'trunk'])).filter(Boolean);

  for (const branch of branchesToTry) {
    try {
      const zipUrl = `https://codeload.github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/zip/refs/heads/${encodeURIComponent(branch)}?_t=${cacheBuster}`;
      const res = await fetch(zipUrl);

      if (!res.ok) {
        const archiveUrl = `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/archive/refs/heads/${encodeURIComponent(branch)}.zip?_t=${cacheBuster}`;
        const res2 = await fetch(archiveUrl);
        if (!res2.ok) continue;
        return await processZipResponse(res2, owner, repo, branch);
      }

      return await processZipResponse(res, owner, repo, branch);
    } catch (err) {
      console.warn(`[DomoScope Fallback] Zipball failed for ${owner}/${repo} at ${branch}:`, err);
    }
  }

  return null;
}

async function processZipResponse(
  res: Response,
  owner: string,
  repo: string,
  branch: string
): Promise<FallbackResult> {
  const blob = await res.blob();
  const zip = await JSZip.loadAsync(blob);

  const files: RepoFile[] = [];
  const fileContents = new Map<string, string>();

  const zipEntries = Object.keys(zip.files);
  if (zipEntries.length === 0) {
    throw new Error('Zip archive is empty');
  }

  // Find root directory prefix e.g. "DomoSkills-main/"
  const rootPrefix = zipEntries[0].split('/')[0] + '/';

  for (const zipPath of zipEntries) {
    if (!zipPath.startsWith(rootPrefix)) continue;
    const relativePath = zipPath.slice(rootPrefix.length);
    if (!relativePath) continue;

    const zipObj = zip.files[zipPath];
    const parts = relativePath.split('/');
    const filename = parts[parts.length - 1];

    const isIgnored = parts.some((part) => IGNORED_DIRECTORIES.has(part.toLowerCase()));
    if (isIgnored) continue;

    const extMatch = filename.match(/\.([a-zA-Z0-9]+)$/);
    const ext = extMatch ? extMatch[1].toLowerCase() : '';

    if (zipObj.dir) {
      files.push({
        path: relativePath.replace(/\/$/, ''),
        name: filename || parts[parts.length - 2],
        type: 'tree',
        extension: '',
        category: 'folder',
      });
    } else {
      if (BINARY_EXTENSIONS.has(ext)) continue;

      files.push({
        path: relativePath,
        name: filename,
        type: 'blob',
        size: (zipObj as any)._data?.uncompressedSize || 1024,
        extension: ext,
        category: categorizeFile(relativePath, ext, 'blob'),
      });

      // Extract text file content into memory cache
      try {
        const text = await zipObj.async('string');
        fileContents.set(relativePath, text);
      } catch {
        // Ignore unreadable binary text
      }
    }
  }

  // Dynamically extract real project description & language from manifest
  let description = 'Loaded dynamically via High-Availability Live Stream (Rate Limit Bypassed).';
  let language = 'Polyglot';

  if (fileContents.has('package.json')) {
    try {
      const pkg = JSON.parse(fileContents.get('package.json')!);
      if (pkg.description) description = pkg.description;
      language = 'TypeScript / JavaScript';
    } catch {}
  } else if (fileContents.has('pubspec.yaml')) {
    language = 'Dart / Flutter';
    const pub = fileContents.get('pubspec.yaml')!;
    const descMatch = pub.match(/description:\s*["']?([^"'\r\n]+)/);
    if (descMatch) description = descMatch[1].trim();
  } else if (fileContents.has('Cargo.toml')) {
    language = 'Rust';
  } else if (fileContents.has('go.mod')) {
    language = 'Go';
  } else if (fileContents.has('pyproject.toml') || fileContents.has('requirements.txt')) {
    language = 'Python';
  }

  const metadata: RepoMetadata = {
    owner,
    repo,
    fullName: `${owner}/${repo}`,
    description,
    defaultBranch: branch,
    stars: 0,
    forks: 0,
    watchers: 0,
    openIssues: 0,
    language,
    license: null,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    size: Math.round(blob.size / 1024),
    isPrivate: false,
    htmlUrl: `https://github.com/${owner}/${repo}`,
  };

  return {
    metadata,
    files,
    fileContents,
    isFallback: true,
    branch,
  };
}

/**
 * Raw Content Probe Fallback
 * Probes raw.githubusercontent.com for common architecture files when zipball is blocked
 */
export async function fetchViaRawProbe(
  owner: string,
  repo: string,
  targetBranch: string = 'main'
): Promise<FallbackResult> {
  const branches = Array.from(new Set([targetBranch, 'main', 'master'])).filter(Boolean);
  let activeBranch = 'main';

  const candidatePaths = [
    'package.json',
    'pubspec.yaml',
    'Cargo.toml',
    'go.mod',
    'pyproject.toml',
    'requirements.txt',
    'README.md',
    'src/App.tsx',
    'src/index.ts',
    'src/main.tsx',
    'lib/main.dart',
    'main.py',
    'app.py',
    'index.html',
  ];

  const fileContents = new Map<string, string>();
  const files: RepoFile[] = [];

  for (const b of branches) {
    const probePromises = candidatePaths.map(async (path) => {
      try {
        const url = `https://raw.githubusercontent.com/${owner}/${repo}/${b}/${path}`;
        const res = await fetch(url);
        if (res.ok) {
          const text = await res.text();
          fileContents.set(path, text);
          activeBranch = b;
        }
      } catch {
        // ignore
      }
    });

    await Promise.all(probePromises);
    if (fileContents.size > 0) break;
  }

  // Synthesize tree from discovered files or create standard structure
  if (fileContents.size === 0) {
    fileContents.set(
      'README.md',
      `# ${owner}/${repo}\n\nRepository structure loaded via High-Availability Direct Stream.`
    );
  }

  for (const path of fileContents.keys()) {
    const parts = path.split('/');
    const filename = parts[parts.length - 1];
    const extMatch = filename.match(/\.([a-zA-Z0-9]+)$/);
    const ext = extMatch ? extMatch[1].toLowerCase() : '';

    files.push({
      path,
      name: filename,
      type: 'blob',
      size: (fileContents.get(path) || '').length,
      extension: ext,
      category: categorizeFile(path, ext, 'blob'),
    });
  }

  const metadata: RepoMetadata = {
    owner,
    repo,
    fullName: `${owner}/${repo}`,
    description: 'Repository information retrieved via Direct Raw Stream.',
    defaultBranch: activeBranch,
    stars: 0,
    forks: 0,
    watchers: 0,
    openIssues: 0,
    language: fileContents.has('pubspec.yaml') ? 'Dart' : fileContents.has('package.json') ? 'TypeScript' : 'Polyglot',
    license: null,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    size: 1000,
    isPrivate: false,
    htmlUrl: `https://github.com/${owner}/${repo}`,
  };

  return {
    metadata,
    files,
    fileContents,
    isFallback: true,
    branch: activeBranch,
  };
}
