import { RepoIdentifier, RepoMetadata, RepoFile, BranchInfo, BranchComparison } from '../types';
import { StorageService } from './storage';

export class GitHubError extends Error {
  public status?: number;
  public isRateLimit: boolean;
  public resetTime?: Date;

  constructor(
    message: string,
    status?: number,
    isRateLimit: boolean = false,
    resetTime?: Date
  ) {
    super(message);
    this.name = 'GitHubError';
    this.status = status;
    this.isRateLimit = isRateLimit;
    this.resetTime = resetTime;
  }
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

export function parseGitHubUrl(input: string): RepoIdentifier | null {
  if (!input) return null;
  let cleaned = input.trim().replace(/^git@github\.com:/, 'https://github.com/').replace(/\/+$/, '');
  cleaned = cleaned.replace(/\.git$/, '');
  
  // Match full url: https://github.com/owner/repo or github.com/owner/repo
  const urlMatch = cleaned.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)(?:\/tree\/([a-zA-Z0-9_./-]+))?/);
  if (urlMatch) {
    return {
      owner: urlMatch[1],
      repo: urlMatch[2],
      branch: urlMatch[3],
    };
  }

  // Match owner/repo
  const shortMatch = cleaned.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
  if (shortMatch) {
    return {
      owner: shortMatch[1],
      repo: shortMatch[2],
    };
  }

  return null;
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await StorageService.getSetting<string>('github_token', '');
  const headers: HeadersInit = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (token && token.trim().length > 0) {
    headers['Authorization'] = `token ${token.trim()}`;
  }
  return headers;
}

export const GitHubService = {
  async fetchRepoMetadata(owner: string, repo: string): Promise<RepoMetadata> {
    const headers = await getAuthHeaders();
    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;

    const res = await fetch(url, { headers });

    if (!res.ok) {
      if (res.status === 403 || res.status === 429) {
        const resetHeader = res.headers.get('x-ratelimit-reset');
        const resetTime = resetHeader ? new Date(parseInt(resetHeader, 10) * 1000) : undefined;
        throw new GitHubError(
          'GitHub API rate limit reached. Add a GitHub token in Settings or try again later.',
          res.status,
          true,
          resetTime
        );
      }
      if (res.status === 404) {
        throw new GitHubError(
          `We couldn't open ${owner}/${repo}. The repository may be private, misspelled, or does not exist.`,
          404
        );
      }
      throw new GitHubError(`GitHub API error: ${res.statusText}`, res.status);
    }

    const data = await res.json();
    return {
      owner: data.owner.login,
      repo: data.name,
      fullName: data.full_name,
      description: data.description || 'No description provided.',
      defaultBranch: data.default_branch || 'main',
      stars: data.stargazers_count,
      forks: data.forks_count,
      watchers: data.watchers_count,
      openIssues: data.open_issues_count,
      language: data.language || 'Unknown',
      license: data.license?.spdx_id || data.license?.name || null,
      updatedAt: data.updated_at,
      createdAt: data.created_at,
      size: data.size,
      isPrivate: data.private,
      htmlUrl: data.html_url,
    };
  },

  async fetchRepoTree(owner: string, repo: string, branch: string): Promise<RepoFile[]> {
    const headers = await getAuthHeaders();
    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(branch)}?recursive=1`;

    const res = await fetch(url, { headers });

    if (!res.ok) {
      if (res.status === 403 || res.status === 429) {
        throw new GitHubError('GitHub rate limit reached while fetching repository files.', res.status, true);
      }
      throw new GitHubError(`Failed to fetch file tree for ${owner}/${repo} at ${branch}.`, res.status);
    }

    const data = await res.json();
    const rawItems: { path: string; mode: string; type: 'blob' | 'tree'; sha: string; size?: number }[] = data.tree || [];

    const filteredFiles: RepoFile[] = [];

    for (const item of rawItems) {
      const parts = item.path.split('/');
      // Filter out ignored directories
      const isIgnored = parts.some((part) => IGNORED_DIRECTORIES.has(part.toLowerCase()));
      if (isIgnored) continue;

      const filename = parts[parts.length - 1];
      const extMatch = filename.match(/\.([a-zA-Z0-9]+)$/);
      const ext = extMatch ? extMatch[1].toLowerCase() : '';

      // Skip large binary files
      if (item.type === 'blob' && BINARY_EXTENSIONS.has(ext)) {
        continue;
      }

      // Determine category
      const category = categorizeFile(item.path, ext, item.type);

      filteredFiles.push({
        path: item.path,
        name: filename,
        type: item.type,
        size: item.size,
        sha: item.sha,
        extension: ext,
        category,
      });
    }

    return filteredFiles;
  },

  async fetchFileContent(owner: string, repo: string, branch: string, path: string): Promise<string> {
    // Check IndexedDB cache first
    const cached = await StorageService.getFileContent(owner, repo, branch, path);
    if (cached !== null) {
      return cached;
    }

    // Try raw.githubusercontent.com first (faster, doesn't hit API rate limits)
    try {
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
      const res = await fetch(rawUrl);
      if (res.ok) {
        const text = await res.text();
        await StorageService.saveFileContent(owner, repo, branch, path, text);
        return text;
      }
    } catch {
      // Fallback to GitHub REST API below
    }

    // Fallback: GitHub Contents API
    const headers = await getAuthHeaders();
    const apiUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}?ref=${encodeURIComponent(branch)}`;
    const res = await fetch(apiUrl, { headers });

    if (!res.ok) {
      throw new GitHubError(`Failed to load content for ${path}`, res.status);
    }

    const data = await res.json();
    if (data.encoding === 'base64' && data.content) {
      const cleanContent = data.content.replace(/\n/g, '');
      const decoded = decodeURIComponent(
        atob(cleanContent)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      await StorageService.saveFileContent(owner, repo, branch, path, decoded);
      return decoded;
    }

    throw new GitHubError(`Unsupported content encoding for ${path}`);
  },

  async fetchBranches(owner: string, repo: string): Promise<BranchInfo[]> {
    const headers = await getAuthHeaders();
    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches?per_page=30`;

    const res = await fetch(url, { headers });
    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    return data.map((b: any) => ({
      name: b.name,
      sha: b.commit?.sha || '',
      isDefault: false,
    }));
  },

  async compareBranches(owner: string, repo: string, base: string, head: string): Promise<BranchComparison> {
    const headers = await getAuthHeaders();
    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}`;

    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new GitHubError(`Failed to compare branches ${base} and ${head}`, res.status);
    }

    const data = await res.json();
    const files: { filename: string; status: string }[] = data.files || [];

    const filesAdded: string[] = [];
    const filesRemoved: string[] = [];
    const filesModified: string[] = [];
    const databaseChanges: string[] = [];

    for (const f of files) {
      if (f.status === 'added') filesAdded.push(f.filename);
      else if (f.status === 'removed') filesRemoved.push(f.filename);
      else filesModified.push(f.filename);

      if (
        f.filename.includes('schema.prisma') ||
        f.filename.endsWith('.sql') ||
        f.filename.includes('migration') ||
        f.filename.includes('models')
      ) {
        databaseChanges.push(f.filename);
      }
    }

    return {
      baseBranch: base,
      compareBranch: head,
      aheadBy: data.ahead_by || 0,
      behindBy: data.behind_by || 0,
      status: data.status || 'identical',
      filesAdded,
      filesRemoved,
      filesModified,
      dependencyChanges: [],
      databaseChanges,
    };
  },
};

function categorizeFile(path: string, ext: string, type: 'blob' | 'tree'): RepoFile['category'] {
  if (type === 'tree') return 'folder';

  const lower = path.toLowerCase();

  // Test
  if (lower.includes('.test.') || lower.includes('.spec.') || lower.includes('__tests__') || lower.startsWith('tests/')) {
    return 'test';
  }

  // Database
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

  // API
  if (
    lower.includes('/api/') ||
    lower.includes('/routes/') ||
    lower.includes('/controllers/') ||
    lower.includes('/endpoints/')
  ) {
    return 'api';
  }

  // Component
  if (
    lower.includes('/components/') ||
    lower.includes('/views/') ||
    lower.includes('/pages/') ||
    lower.includes('/layouts/') ||
    ext === 'tsx' ||
    ext === 'jsx' ||
    ext === 'vue' ||
    ext === 'svelte'
  ) {
    return 'component';
  }

  // Service
  if (
    lower.includes('/services/') ||
    lower.includes('/utils/') ||
    lower.includes('/lib/') ||
    lower.includes('/helpers/')
  ) {
    return 'service';
  }

  // Config
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

  // Documentation
  if (ext === 'md' || ext === 'mdx' || ext === 'txt' || lower.includes('license')) {
    return 'doc';
  }

  // Styles
  if (ext === 'css' || ext === 'scss' || ext === 'sass' || ext === 'less') {
    return 'style';
  }

  return 'file';
}
