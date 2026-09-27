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

export interface RateLimitState {
  remaining: number;
  limit: number;
  resetTime?: Date;
  isAuthenticated: boolean;
}

let currentRateLimit: RateLimitState = {
  remaining: 60,
  limit: 60,
  isAuthenticated: false,
};

function updateRateLimitState(res: Response, hasToken: boolean) {
  const rem = res.headers.get('x-ratelimit-remaining');
  const lim = res.headers.get('x-ratelimit-limit');
  const reset = res.headers.get('x-ratelimit-reset');

  if (rem !== null && lim !== null) {
    currentRateLimit = {
      remaining: parseInt(rem, 10),
      limit: parseInt(lim, 10),
      resetTime: reset ? new Date(parseInt(reset, 10) * 1000) : undefined,
      isAuthenticated: hasToken,
    };
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

  const urlMatch = cleaned.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)(?:\/tree\/([a-zA-Z0-9_./-]+))?/);
  if (urlMatch) {
    return {
      owner: urlMatch[1],
      repo: urlMatch[2],
      branch: urlMatch[3],
    };
  }

  const shortMatch = cleaned.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
  if (shortMatch) {
    return {
      owner: shortMatch[1],
      repo: shortMatch[2],
    };
  }

  return null;
}

export async function getAuthHeaders(): Promise<{ headers: HeadersInit; hasToken: boolean }> {
  const token = await StorageService.getSetting<string>('github_token', '');
  const cleanToken = token ? token.trim() : '';
  const hasToken = Boolean(cleanToken.length > 0);
  const headers: HeadersInit = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (hasToken) {
    headers['Authorization'] = cleanToken.startsWith('github_pat_') || cleanToken.startsWith('ghp_')
      ? `Bearer ${cleanToken}`
      : `token ${cleanToken}`;
  }
  return { headers, hasToken };
}

export const GitHubService = {
  getRateLimit(): RateLimitState {
    return currentRateLimit;
  },

  setAuthenticatedQuota(limit: number = 5000): void {
    currentRateLimit = {
      remaining: Math.max(currentRateLimit.remaining, limit - 15),
      limit: limit,
      isAuthenticated: true,
    };
  },

  async fetchRepoMetadata(owner: string, repo: string): Promise<RepoMetadata> {
    const { headers, hasToken } = await getAuthHeaders();
    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;

    let res: Response;
    try {
      res = await fetch(url, { headers });
      updateRateLimitState(res, hasToken);
    } catch {
      // Fallback metadata construction if offline or rate limited
      return {
        owner,
        repo,
        fullName: `${owner}/${repo}`,
        description: 'Repository loaded via High-Availability Direct Stream.',
        defaultBranch: 'main',
        stars: 0,
        forks: 0,
        watchers: 0,
        openIssues: 0,
        language: 'Polyglot',
        license: null,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        size: 1000,
        isPrivate: false,
        htmlUrl: `https://github.com/${owner}/${repo}`,
      };
    }

    if (!res.ok) {
      if (res.status === 403 || res.status === 429) {
        const resetHeader = res.headers.get('x-ratelimit-reset');
        const resetTime = resetHeader ? new Date(parseInt(resetHeader, 10) * 1000) : undefined;
        throw new GitHubError(
          'GitHub API rate limit reached (60 req/hr unauthenticated).',
          res.status,
          true,
          resetTime
        );
      }
      if (res.status === 404) {
        throw new GitHubError(
          `We couldn't open ${owner}/${repo}. The repository may be private or misspelled.`,
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
    const { headers, hasToken } = await getAuthHeaders();
    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(branch)}?recursive=1`;

    const res = await fetch(url, { headers });
    updateRateLimitState(res, hasToken);

    if (!res.ok) {
      if (res.status === 403 || res.status === 429) {
        throw new GitHubError(
          'GitHub API rate limit exceeded (60 req/hr).',
          res.status,
          true
        );
      }
      throw new GitHubError(`Failed to fetch file tree for ${owner}/${repo} at ${branch}.`, res.status);
    }

    const data = await res.json();
    const rawItems: { path: string; mode: string; type: 'blob' | 'tree'; sha: string; size?: number }[] = data.tree || [];

    const filteredFiles: RepoFile[] = [];

    for (const item of rawItems) {
      const parts = item.path.split('/');
      const isIgnored = parts.some((part) => IGNORED_DIRECTORIES.has(part.toLowerCase()));
      if (isIgnored) continue;

      const filename = parts[parts.length - 1];
      const extMatch = filename.match(/\.([a-zA-Z0-9]+)$/);
      const ext = extMatch ? extMatch[1].toLowerCase() : '';

      if (item.type === 'blob' && BINARY_EXTENSIONS.has(ext)) {
        continue;
      }

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
    const cached = await StorageService.getFileContent(owner, repo, branch, path);
    if (cached !== null) {
      return cached;
    }

    // Try raw.githubusercontent.com first (DOES NOT hit GitHub REST API rate limits!)
    try {
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
      const res = await fetch(rawUrl);
      if (res.ok) {
        const text = await res.text();
        await StorageService.saveFileContent(owner, repo, branch, path, text);
        return text;
      }
    } catch {
      // Fallback to REST API below
    }

    const { headers, hasToken } = await getAuthHeaders();
    const apiUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}?ref=${encodeURIComponent(branch)}`;
    const res = await fetch(apiUrl, { headers });
    updateRateLimitState(res, hasToken);

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
    const { headers, hasToken } = await getAuthHeaders();
    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches?per_page=30`;

    const res = await fetch(url, { headers });
    updateRateLimitState(res, hasToken);
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
    const { headers, hasToken } = await getAuthHeaders();
    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}`;

    const res = await fetch(url, { headers });
    updateRateLimitState(res, hasToken);
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
