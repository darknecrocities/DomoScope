import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { RepoFile, FileCategory } from '../../types';
import { categorizeFile } from '../github';

export interface LocalScanOptions {
  rootDir?: string;
  maxFileSize?: number; // default: 2MB (2 * 1024 * 1024)
  respectGitIgnore?: boolean; // default: true
  excludePatterns?: string[];
  includePatterns?: string[];
  includeSensitiveFiles?: boolean; // default: false
  maxTotalFiles?: number; // default: 10000
}

export interface FileFingerprint {
  relativePath: string;
  mtimeMs: number;
  size: number;
  sha256: string;
}

export interface LocalScanResult {
  rootDir: string;
  projectName: string;
  files: RepoFile[];
  fileContents: Map<string, string>;
  fingerprints: Map<string, FileFingerprint>;
  stats: {
    totalFiles: number;
    totalDirs: number;
    totalBytes: number;
    totalLines: number;
    skippedLargeFiles: number;
    skippedBinaryFiles: number;
    skippedSensitiveFiles: number;
    scanDurationMs: number;
  };
}

export const DEFAULT_IGNORED_DIRS = new Set([
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
  '.output',
  '.vercel',
  '.netlify',
]);

export const DEFAULT_BINARY_EXTS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'svg',
  'mp4', 'webm', 'mov', 'mp3', 'wav', 'ogg',
  'zip', 'tar', 'gz', 'bz2', '7z', 'rar',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'exe', 'dll', 'so', 'dylib', 'bin',
  'woff', 'woff2', 'ttf', 'eot', 'otf',
  'wasm', 'pyc', 'class', 'o', 'a', 'lib', 'db', 'sqlite', 'sqlite3',
]);

export const SENSITIVE_FILE_PATTERNS = [
  /^\.env(?:\.local|\.production|\.development|\.test|\.secret|\.prod)?$/i,
  /^id_rsa(?:|\.pub)$/i,
  /^.*\.(?:pem|key|pkcs12|pfx|p12|kdbx)$/i,
  /^credentials\.json$/i,
  /^secrets?\.(?:json|ya?ml)$/i,
];

/**
 * Checks if a relative path matches simple gitignore wildcard patterns
 */
export function matchesPattern(relPath: string, pattern: string): boolean {
  const cleanPattern = pattern.trim();
  if (!cleanPattern || cleanPattern.startsWith('#')) return false;

  let pat = cleanPattern.replace(/^\/+/, '');
  const isDirOnly = pat.endsWith('/');
  if (isDirOnly) {
    pat = pat.slice(0, -1);
  }

  // Exact match or folder match
  if (relPath === pat || relPath.startsWith(pat + '/')) return true;

  // Filename wildcard match e.g. *.log or temp-*
  const regexStr = pat
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '.*')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]');

  const regex = new RegExp(`(^|/)${regexStr}(/|$)`, 'i');
  return regex.test(relPath);
}

/**
 * Parses a .gitignore file into an array of active rule patterns
 */
export function parseGitIgnore(content: string): string[] {
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
}

/**
 * Computes sha256 hash of a buffer or string
 */
export function computeHash(data: Buffer | string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Checks if a buffer contains binary NUL bytes
 */
export function isBinaryBuffer(buffer: Buffer): boolean {
  const checkLen = Math.min(buffer.length, 1024);
  for (let i = 0; i < checkLen; i++) {
    if (buffer[i] === 0) return true;
  }
  return false;
}

/**
 * Safely verifies that a target absolute path resides within rootDir (preventing symlink traversal escape)
 */
export async function isPathWithinRoot(targetPath: string, rootDir: string): Promise<boolean> {
  try {
    const realRoot = await fsp.realpath(rootDir);
    const realTarget = await fsp.realpath(targetPath);
    const relative = path.relative(realRoot, realTarget);
    return !relative.startsWith('..') && !path.isAbsolute(relative);
  } catch {
    // If path does not exist or cannot be resolved, check standard path resolution
    const relative = path.relative(path.resolve(rootDir), path.resolve(targetPath));
    return !relative.startsWith('..') && !path.isAbsolute(relative);
  }
}

/**
 * Traverses a local project directory and extracts structured RepoFile records and file contents.
 */
export async function scanLocalDirectory(
  rootDir: string,
  options: LocalScanOptions = { rootDir }
): Promise<LocalScanResult> {
  const startTime = Date.now();
  const maxFileSize = options.maxFileSize ?? 2 * 1024 * 1024; // 2MB default
  const maxTotalFiles = options.maxTotalFiles ?? 10000;
  const resolvedRoot = path.resolve(rootDir);

  const stats = {
    totalFiles: 0,
    totalDirs: 0,
    totalBytes: 0,
    totalLines: 0,
    skippedLargeFiles: 0,
    skippedBinaryFiles: 0,
    skippedSensitiveFiles: 0,
    scanDurationMs: 0,
  };

  const files: RepoFile[] = [];
  const fileContents = new Map<string, string>();
  const fingerprints = new Map<string, FileFingerprint>();

  // Check if directory exists
  try {
    const rootStat = await fsp.stat(resolvedRoot);
    if (!rootStat.isDirectory()) {
      throw new Error(`Path is not a directory: ${resolvedRoot}`);
    }
  } catch (err: any) {
    throw new Error(`Cannot access project directory ${resolvedRoot}: ${err.message}`);
  }

  // Load root .gitignore if present
  const gitIgnoreRules: string[] = [];
  if (options.respectGitIgnore !== false) {
    try {
      const gitIgnorePath = path.join(resolvedRoot, '.gitignore');
      if (fs.existsSync(gitIgnorePath)) {
        const content = await fsp.readFile(gitIgnorePath, 'utf8');
        gitIgnoreRules.push(...parseGitIgnore(content));
      }
    } catch {
      // Ignore if .gitignore cannot be read
    }
  }

  // Custom user excludes
  if (options.excludePatterns && options.excludePatterns.length > 0) {
    gitIgnoreRules.push(...options.excludePatterns);
  }

  const visitedInodes = new Set<string>();

  async function walk(currentDir: string, relBase: string) {
    if (files.length >= maxTotalFiles) return;

    let entries: fs.Dirent[] = [];
    try {
      entries = await fsp.readdir(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (files.length >= maxTotalFiles) break;

      const name = entry.name;
      const fullPath = path.join(currentDir, name);
      const relPath = relBase ? `${relBase}/${name}` : name;

      // Filter out default ignored directories
      if (entry.isDirectory()) {
        if (DEFAULT_IGNORED_DIRS.has(name) || name.startsWith('.')) {
          continue;
        }

        // Check gitignore rules
        const isIgnored = gitIgnoreRules.some((rule) => matchesPattern(relPath, rule) || matchesPattern(relPath + '/', rule));
        if (isIgnored) continue;

        // Verify symlink containment and avoid cyclic loops
        try {
          const stat = await fsp.stat(fullPath);
          const inodeKey = `${stat.dev}:${stat.ino}`;
          if (visitedInodes.has(inodeKey)) continue;
          visitedInodes.add(inodeKey);

          const isSafe = await isPathWithinRoot(fullPath, resolvedRoot);
          if (!isSafe) continue;
        } catch {
          continue;
        }

        stats.totalDirs++;
        files.push({
          path: relPath,
          name,
          type: 'tree',
          extension: '',
          category: 'folder',
        });

        await walk(fullPath, relPath);
      } else if (entry.isFile() || entry.isSymbolicLink()) {
        // Check gitignore rules for file
        const isIgnored = gitIgnoreRules.some((rule) => matchesPattern(relPath, rule));
        if (isIgnored) continue;

        // Check symlink containment
        try {
          const isSafe = await isPathWithinRoot(fullPath, resolvedRoot);
          if (!isSafe) continue;
        } catch {
          continue;
        }

        let fileStat: fs.Stats;
        try {
          fileStat = await fsp.stat(fullPath);
        } catch {
          continue;
        }

        stats.totalFiles++;
        stats.totalBytes += fileStat.size;

        const extMatch = name.match(/\.([a-zA-Z0-9]+)$/);
        const ext = extMatch ? extMatch[1].toLowerCase() : '';
        const category = categorizeFile(relPath);

        // Check sensitive file protection
        const isSensitive = SENSITIVE_FILE_PATTERNS.some((pat) => pat.test(name));
        if (isSensitive && !options.includeSensitiveFiles) {
          stats.skippedSensitiveFiles++;
          files.push({
            path: relPath,
            name,
            type: 'blob',
            size: fileStat.size,
            extension: ext,
            category,
          });
          continue;
        }

        // Check binary extension
        const isKnownBinary = DEFAULT_BINARY_EXTS.has(ext);
        if (isKnownBinary) {
          stats.skippedBinaryFiles++;
          files.push({
            path: relPath,
            name,
            type: 'blob',
            size: fileStat.size,
            extension: ext,
            category,
          });
          continue;
        }

        // Check large file size limit
        if (fileStat.size > maxFileSize) {
          stats.skippedLargeFiles++;
          files.push({
            path: relPath,
            name,
            type: 'blob',
            size: fileStat.size,
            extension: ext,
            category,
          });
          continue;
        }

        // Read text content
        try {
          const buffer = await fsp.readFile(fullPath);
          if (isBinaryBuffer(buffer)) {
            stats.skippedBinaryFiles++;
            files.push({
              path: relPath,
              name,
              type: 'blob',
              size: fileStat.size,
              extension: ext,
              category,
            });
            continue;
          }

          const content = buffer.toString('utf8');
          const sha256 = computeHash(buffer);

          const lineCount = content.split('\n').length;
          stats.totalLines += lineCount;

          fingerprints.set(relPath, {
            relativePath: relPath,
            mtimeMs: fileStat.mtimeMs,
            size: fileStat.size,
            sha256,
          });

          fileContents.set(relPath, content);

          files.push({
            path: relPath,
            name,
            type: 'blob',
            size: fileStat.size,
            sha: sha256.substring(0, 12),
            extension: ext,
            category,
            content,
          });
        } catch {
          // If reading fails, still record file metadata
          files.push({
            path: relPath,
            name,
            type: 'blob',
            size: fileStat.size,
            extension: ext,
            category,
          });
        }
      }
    }
  }

  await walk(resolvedRoot, '');

  stats.scanDurationMs = Date.now() - startTime;
  let projectName = path.basename(resolvedRoot) || 'local-project';

  // Extract manifest name if package.json is available
  const pkgContent = fileContents.get('package.json');
  if (pkgContent) {
    try {
      const parsed = JSON.parse(pkgContent);
      if (parsed.name && typeof parsed.name === 'string') {
        projectName = parsed.name;
      }
    } catch {
      // Ignore
    }
  }

  return {
    rootDir: resolvedRoot,
    projectName,
    files,
    fileContents,
    fingerprints,
    stats,
  };
}

export const scanLocalRepository = (options: LocalScanOptions = {}) =>
  scanLocalDirectory(options.rootDir || '.', options);

export function computeFileHash(content: string | Buffer): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}
