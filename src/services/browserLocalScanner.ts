import { RepoFile, RepoMetadata, RepoAnalysis, DatabaseSchema, RepoDependency, ApiEndpoint, SecurityFinding } from '../types';
import { categorizeFile } from './github';
import { analyzeRepository } from './analysis';
import { buildArchitectureGraph, GraphBuildResult } from './graphBuilder';
import { parseDatabaseFiles } from './databaseParser';
import { parseApiEndpoints } from './apiRouteCatalog';
import { runSecurityChecks } from './securityScanner';
import { parseDependencies } from './dependencyParser';
import { detectFrameworks, FrameworkDetectionResult } from './frameworkDetector';
import { detectCloudServices, CloudDetectionResult } from './cloudServicesDetector';
import { generateReverseEngineerSpec } from './reverseEngineerGenerator';

export const BROWSER_IGNORED_DIRS = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  '.next',
  '.nuxt',
  'coverage',
  '.turbo',
  '.cache',
  '.idea',
  '.vscode',
  '.yarn',
  'out',
  'bin',
  'obj',
  'target',
  'vendor',
  'venv',
  '.venv',
  'env',
  '__pycache__',
  '.domoscope',
]);

export const BROWSER_BINARY_EXTS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'svg',
  'mp4', 'webm', 'mov', 'mp3', 'wav',
  'zip', 'tar', 'gz', 'bz2', '7z', 'rar',
  'pdf', 'doc', 'docx', 'xls', 'xlsx',
  'exe', 'dll', 'so', 'dylib', 'bin',
  'woff', 'woff2', 'ttf', 'eot', 'otf',
  'wasm', 'pyc', 'class', 'o', 'db', 'sqlite', 'sqlite3',
]);

export interface BrowserScanResult {
  projectName: string;
  metadata: RepoMetadata;
  files: RepoFile[];
  fileContents: Map<string, string>;
  analysis: RepoAnalysis;
  graph: GraphBuildResult;
  databaseSchema: DatabaseSchema;
  apiEndpoints: ApiEndpoint[];
  securityFindings: SecurityFinding[];
  dependencies: RepoDependency[];
  frameworks: FrameworkDetectionResult;
  cloudServices: CloudDetectionResult;
}

/**
 * Checks if the current browser environment supports the native File System Access API
 */
export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/**
 * Interactively prompts the user to select a local directory using the browser's File System Access API,
 * scans its files client-side, and runs the complete DomoScope static analysis engine.
 */
export async function openLocalDirectoryInBrowser(): Promise<BrowserScanResult> {
  if (!isFileSystemAccessSupported()) {
    throw new Error(
      'Your browser does not support the File System Access API. Please use Google Chrome, Microsoft Edge, or run "npx domoscope serve" in your terminal.'
    );
  }

  const dirHandle = await (window as any).showDirectoryPicker({
    mode: 'read',
  });

  const projectName = dirHandle.name || 'local-project';
  const files: RepoFile[] = [];
  const fileContents = new Map<string, string>();

  async function walk(handle: any, relBase = '') {
    for await (const entry of handle.values()) {
      const relPath = relBase ? `${relBase}/${entry.name}` : entry.name;

      if (entry.kind === 'directory') {
        if (BROWSER_IGNORED_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;

        files.push({
          path: relPath,
          name: entry.name,
          type: 'tree',
          extension: '',
          category: 'folder',
        });

        await walk(entry, relPath);
      } else if (entry.kind === 'file') {
        const extMatch = entry.name.match(/\.([a-zA-Z0-9]+)$/);
        const ext = extMatch ? extMatch[1].toLowerCase() : '';
        const category = categorizeFile(relPath, ext, 'blob');

        if (BROWSER_BINARY_EXTS.has(ext)) {
          files.push({
            path: relPath,
            name: entry.name,
            type: 'blob',
            extension: ext,
            category,
          });
          continue;
        }

        try {
          const file = await entry.getFile();
          if (file.size > 2 * 1024 * 1024) {
            files.push({
              path: relPath,
              name: entry.name,
              type: 'blob',
              size: file.size,
              extension: ext,
              category,
            });
            continue;
          }

          const text = await file.text();
          fileContents.set(relPath, text);

          files.push({
            path: relPath,
            name: entry.name,
            type: 'blob',
            size: file.size,
            extension: ext,
            category,
            content: text,
          });
        } catch {
          // If reading fails, record metadata
          files.push({
            path: relPath,
            name: entry.name,
            type: 'blob',
            extension: ext,
            category,
          });
        }
      }
    }
  }

  await walk(dirHandle, '');

  const metadata: RepoMetadata = {
    owner: 'local',
    repo: projectName,
    fullName: `local/${projectName}`,
    description: `Local project loaded via browser File System Access API`,
    defaultBranch: 'main',
    stars: 0,
    forks: 0,
    watchers: 0,
    openIssues: 0,
    language: 'Polyglot',
    license: null,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    size: Math.round(files.reduce((acc, f) => acc + (f.size || 0), 0) / 1024),
    isPrivate: true,
    htmlUrl: `file://${projectName}`,
  };

  const sourceCandidates = Array.from(fileContents.entries()).map(([path, content]) => ({ path, content }));
  const manifestCandidates = sourceCandidates.filter(({ path }) =>
    /package\.json|pubspec\.ya?ml|requirements\.txt|pyproject\.toml|go\.mod|cargo\.toml|composer\.json|gemfile/i.test(path)
  );

  const analysis = analyzeRepository(metadata, files);
  const dependencies = parseDependencies(manifestCandidates, sourceCandidates);
  const rawSecurity = runSecurityChecks(sourceCandidates);
  const securityFindings = rawSecurity.map((finding) => {
    if (finding.category.toLowerCase().includes('secret') || finding.category.toLowerCase().includes('key')) {
      return {
        ...finding,
        evidence: finding.evidence ? finding.evidence.replace(/(=|:|\s+)["']?([a-zA-Z0-9_-]{8,})["']?/g, '$1"***REDACTED***"') : '',
      };
    }
    return finding;
  });

  const frameworks = detectFrameworks(files, fileContents, dependencies);
  const cloudServices = detectCloudServices(files, fileContents, dependencies);
  const databaseSchema = parseDatabaseFiles(sourceCandidates);
  const apiEndpoints = parseApiEndpoints(sourceCandidates);
  const graph = buildArchitectureGraph(files, fileContents, { databaseSchema });

  return {
    projectName,
    metadata,
    files,
    fileContents,
    analysis,
    graph,
    databaseSchema,
    apiEndpoints,
    securityFindings,
    dependencies,
    frameworks,
    cloudServices,
  };
}
