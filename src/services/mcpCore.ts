import { sanitizeRepoSlug, categorizeFile } from './github';
import { buildArchitectureGraph, GraphBuildResult } from './graphBuilder';
import { detectFrameworks, FrameworkDetectionResult } from './frameworkDetector';
import { detectCloudServices, CloudDetectionResult } from './cloudServicesDetector';
import { parseDatabaseFiles } from './databaseParser';
import { parseApiEndpoints } from './apiRouteCatalog';
import { runSecurityChecks } from './securityScanner';
import { parseDependencies } from './dependencyParser';
import { generateReverseEngineerSpec, ReverseEngineerCategory } from './reverseEngineerGenerator';
import { MarkdownSpecGenerator } from './markdownSpecGenerator';
import { RepoMetadata, RepoFile, RepoAnalysis, FileCategory, RepoDependency } from '../types';

export interface JSONRPCRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: Record<string, any>;
}

export interface JSONRPCResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export const DOMOSCOPE_MCP_TOOLS: MCPToolDefinition[] = [
  {
    name: 'get_repository_architecture',
    description:
      'Inspect the comprehensive software architecture of a GitHub repository, including primary and secondary frameworks, entry points, detected components, services, and structural dependency graph.',
    inputSchema: {
      type: 'object',
      properties: {
        owner: {
          type: 'string',
          description: 'GitHub repository owner (e.g. facebook, vercel, Thes-IS-IT)',
        },
        repo: {
          type: 'string',
          description: 'GitHub repository name (e.g. react, next.js, Easylens)',
        },
        branch: {
          type: 'string',
          description: 'Optional Git branch name (defaults to repository default branch)',
        },
      },
      required: ['owner', 'repo'],
    },
  },
  {
    name: 'get_reverse_engineer_blueprint',
    description:
      'Generate a comprehensive reverse engineering blueprint including architectural foundations, subsystem decomposition, AI agent skills, and prompt specifications for rebuilding the codebase.',
    inputSchema: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: 'GitHub repository owner' },
        repo: { type: 'string', description: 'GitHub repository name' },
        branch: { type: 'string', description: 'Optional Git branch name' },
        category: {
          type: 'string',
          enum: ['fullstack', 'ui_ux', 'frontend', 'backend', 'database', 'agent_skill'],
          description: 'Optional subsystem focus category. If omitted, returns all subsystems.',
        },
      },
      required: ['owner', 'repo'],
    },
  },
  {
    name: 'get_database_erd',
    description:
      'Extract all database tables, columns, primary keys (PK), foreign keys (FK), relationships, and generate production-ready SQL DDL statements or Mermaid ERD diagrams.',
    inputSchema: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: 'GitHub repository owner' },
        repo: { type: 'string', description: 'GitHub repository name' },
        branch: { type: 'string', description: 'Optional Git branch name' },
        format: {
          type: 'string',
          enum: ['json', 'sql', 'mermaid'],
          description: 'Output format: json (schema objects), sql (CREATE TABLE DDL), or mermaid (ERD diagram)',
        },
      },
      required: ['owner', 'repo'],
    },
  },
  {
    name: 'get_api_catalog',
    description:
      'Discover all API endpoints, HTTP routes (GET, POST, PUT, DELETE, PATCH), controller handlers, and parameter signatures across 20+ backend and client frameworks.',
    inputSchema: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: 'GitHub repository owner' },
        repo: { type: 'string', description: 'GitHub repository name' },
        branch: { type: 'string', description: 'Optional Git branch name' },
      },
      required: ['owner', 'repo'],
    },
  },
  {
    name: 'get_security_audit',
    description:
      'Audit the repository for security vulnerabilities, hardcoded secrets, JWT leaks, unsafe query constructs, CWE classifications, and remediation steps.',
    inputSchema: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: 'GitHub repository owner' },
        repo: { type: 'string', description: 'GitHub repository name' },
        branch: { type: 'string', description: 'Optional Git branch name' },
      },
      required: ['owner', 'repo'],
    },
  },
  {
    name: 'get_dependencies',
    description:
      'Retrieve all declared production and developer dependencies, ecosystem manifests (npm, pip, pub, cargo, go, packagist, rubygems), and versions.',
    inputSchema: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: 'GitHub repository owner' },
        repo: { type: 'string', description: 'GitHub repository name' },
        branch: { type: 'string', description: 'Optional Git branch name' },
      },
      required: ['owner', 'repo'],
    },
  },
  {
    name: 'get_file_tree',
    description:
      'Retrieve the full indexed file tree, directory structure, categories, and file counts for the repository.',
    inputSchema: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: 'GitHub repository owner' },
        repo: { type: 'string', description: 'GitHub repository name' },
        branch: { type: 'string', description: 'Optional Git branch name' },
        limit: {
          type: 'number',
          description: 'Maximum number of file entries to return (default 200, max 1000)',
        },
      },
      required: ['owner', 'repo'],
    },
  },
  {
    name: 'read_repository_file',
    description:
      'Fetch the source code content of any specific file in the repository.',
    inputSchema: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: 'GitHub repository owner' },
        repo: { type: 'string', description: 'GitHub repository name' },
        path: {
          type: 'string',
          description: 'Relative path of the file to read (e.g. lib/main.dart or src/App.tsx)',
        },
        branch: { type: 'string', description: 'Optional Git branch name' },
      },
      required: ['owner', 'repo', 'path'],
    },
  },
  {
    name: 'generate_markdown_spec',
    description:
      'Generate a comprehensive, production-grade 1,000+ line technical specification in Markdown format for the codebase.',
    inputSchema: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: 'GitHub repository owner' },
        repo: { type: 'string', description: 'GitHub repository name' },
        branch: { type: 'string', description: 'Optional Git branch name' },
      },
      required: ['owner', 'repo'],
    },
  },
  {
    name: 'query_domoscope',
    description:
      'Ask architectural questions about the codebase grounded in DomoScope analysis (components, routes, database schemas, security, and setup).',
    inputSchema: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: 'GitHub repository owner or "local"' },
        repo: { type: 'string', description: 'GitHub repository name or path' },
        query: { type: 'string', description: 'Question to ask about the codebase' },
        branch: { type: 'string', description: 'Optional Git branch name' },
      },
      required: ['owner', 'repo', 'query'],
    },
  },
  {
    name: 'get_project_overview',
    description:
      'Get a comprehensive project overview of a repository (local or remote), including framework, cloud architecture, file stats, and discovered modules.',
    inputSchema: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: 'Repository owner or "local"' },
        repo: { type: 'string', description: 'Repository name or path' },
        branch: { type: 'string', description: 'Optional Git branch name' },
      },
      required: ['owner', 'repo'],
    },
  },
  {
    name: 'get_dependency_graph',
    description:
      'Get the software dependency and architectural module graph for a repository (local or remote).',
    inputSchema: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: 'Repository owner or "local"' },
        repo: { type: 'string', description: 'Repository name or path' },
        branch: { type: 'string', description: 'Optional Git branch name' },
        category: { type: 'string', description: 'Optional category filter (e.g. component, service, api_route, data_model)' },
        limit: { type: 'number', description: 'Maximum nodes/edges to return (default 200)' },
      },
      required: ['owner', 'repo'],
    },
  },
  {
    name: 'get_module_details',
    description:
      'Get deep static AST analysis and dependency details for a specific module or file in the repository.',
    inputSchema: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: 'Repository owner or "local"' },
        repo: { type: 'string', description: 'Repository name or path' },
        path: { type: 'string', description: 'Relative path of the module/file' },
        branch: { type: 'string', description: 'Optional Git branch name' },
      },
      required: ['owner', 'repo', 'path'],
    },
  },
  {
    name: 'get_analysis_status',
    description:
      'Check the freshness, cache state, and diagnostics of the repository analysis.',
    inputSchema: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: 'Repository owner or "local"' },
        repo: { type: 'string', description: 'Repository name or path' },
        branch: { type: 'string', description: 'Optional Git branch name' },
      },
      required: ['owner', 'repo'],
    },
  },
  {
    name: 'get_changed_files',
    description:
      'Retrieve files changed, added, or deleted since the last indexed analysis snapshot.',
    inputSchema: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: 'Repository owner or "local"' },
        repo: { type: 'string', description: 'Repository name or path' },
        branch: { type: 'string', description: 'Optional Git branch name' },
      },
      required: ['owner', 'repo'],
    },
  },
  {
    name: 'list_repository_files',
    description:
      'List all indexed repository files with categorization, extensions, and metadata.',
    inputSchema: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: 'Repository owner or "local"' },
        repo: { type: 'string', description: 'Repository name or path' },
        branch: { type: 'string', description: 'Optional Git branch name' },
        limit: { type: 'number', description: 'Maximum files to return (default 300, max 1000)' },
      },
      required: ['owner', 'repo'],
    },
  },
];

export const DOMOSCOPE_MCP_PROMPTS = [
  {
    name: 'reverse_engineer_subsystem',
    description: 'Generates prompt instructions to recreate a subsystem of a repository with modern AI agents',
    arguments: [
      { name: 'owner', description: 'Repository owner', required: true },
      { name: 'repo', description: 'Repository name', required: true },
      { name: 'subsystem', description: 'Subsystem (e.g. data_layer, api_layer, ui_ux)', required: false },
    ],
  },
  {
    name: 'audit_security_posture',
    description: 'Produces a full security report and vulnerability mitigation guide for a repository',
    arguments: [
      { name: 'owner', description: 'Repository owner', required: true },
      { name: 'repo', description: 'Repository name', required: true },
    ],
  },
  {
    name: 'explain_architecture',
    description: 'Summarizes high-level architectural design patterns, components, and data flows',
    arguments: [
      { name: 'owner', description: 'Repository owner', required: true },
      { name: 'repo', description: 'Repository name', required: true },
    ],
  },
];

// In-memory analysis cache for fast MCP multi-turn queries
interface CachedRepoAnalysis {
  metadata: RepoMetadata;
  files: RepoFile[];
  fileContents: Map<string, string>;
  analysis: RepoAnalysis;
  graph: GraphBuildResult;
  dbSchema: ReturnType<typeof parseDatabaseFiles>;
  apiRoutes: ReturnType<typeof parseApiEndpoints>;
  securityFindings: ReturnType<typeof runSecurityChecks>;
  dependencies: RepoDependency[];
  framework: FrameworkDetectionResult;
  cloud: CloudDetectionResult;
  analyzedAt: number;
}

const analysisCache = new Map<string, CachedRepoAnalysis>();

/**
 * Fetch raw file content from GitHub REST or raw GitHub CDN
 */
async function fetchRawFile(owner: string, repo: string, branch: string, path: string, token?: string): Promise<string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3.raw',
    'User-Agent': 'DomoScope-MCP/1.0',
  };
  if (token) {
    headers['Authorization'] = token.startsWith('ghp_') || token.startsWith('github_pat_')
      ? `Bearer ${token}`
      : `token ${token}`;
  }

  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
    const res = await fetch(url, { headers });
    if (res.ok) {
      return await res.text();
    }
  } catch {
    // fallback to raw CDN
  }

  try {
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
    const rawRes = await fetch(rawUrl);
    if (rawRes.ok) {
      return await rawRes.text();
    }
  } catch {
    // ignore
  }

  return '';
}

/**
 * Core repository analyzer for MCP tools
 */
export async function analyzeRepositoryForMCP(
  rawOwner: string,
  rawRepo: string,
  branch?: string,
  token?: string
): Promise<CachedRepoAnalysis> {
  const isLocal =
    rawOwner === 'local' ||
    rawOwner.startsWith('/') ||
    rawOwner.startsWith('.') ||
    rawRepo.startsWith('/') ||
    rawRepo.startsWith('.');
  const owner = isLocal ? 'local' : sanitizeRepoSlug(rawOwner);
  const repo = isLocal ? rawRepo : sanitizeRepoSlug(rawRepo);
  const cacheKey = `${owner}/${repo}@${branch || 'default'}`;

  const cached = analysisCache.get(cacheKey);
  if (cached && Date.now() - cached.analyzedAt < 30 * 60 * 1000) {
    return cached;
  }

  if (isLocal) {
    if (typeof process !== 'undefined' && process.versions?.node) {
      try {
        const { analyzeLocalRepository } = await import('./local/localAnalysisEngine');
        const targetPath =
          rawOwner === 'local' ? (rawRepo === 'local' || !rawRepo ? '.' : rawRepo) : rawOwner;
        const snapshot = await analyzeLocalRepository({ rootDir: targetPath });
        const result: CachedRepoAnalysis = {
          metadata: snapshot.metadata,
          files: snapshot.files,
          fileContents: snapshot.fileContents || new Map(),
          analysis: snapshot.analysis,
          graph: snapshot.graph,
          dbSchema: snapshot.databaseSchema,
          apiRoutes: snapshot.apiEndpoints,
          securityFindings: snapshot.securityFindings,
          dependencies: snapshot.dependencies,
          framework: snapshot.frameworks,
          cloud: snapshot.cloudServices,
          analyzedAt: snapshot.timestamp,
        };
        analysisCache.set(cacheKey, result);
        return result;
      } catch (err: any) {
        console.error('Local analysis error in MCP:', err);
      }
    }
  }

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'DomoScope-MCP/1.0',
  };
  if (token) {
    headers['Authorization'] = token.startsWith('ghp_') || token.startsWith('github_pat_')
      ? `Bearer ${token}`
      : `token ${token}`;
  }

  // 1. Fetch metadata
  let metadata: RepoMetadata = {
    owner,
    repo,
    fullName: `${owner}/${repo}`,
    description: '',
    defaultBranch: branch || 'main',
    stars: 0,
    forks: 0,
    watchers: 0,
    openIssues: 0,
    language: 'TypeScript',
    license: null,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    size: 0,
    isPrivate: false,
    htmlUrl: `https://github.com/${owner}/${repo}`,
  };

  try {
    const metaRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    if (metaRes.ok) {
      const data = await metaRes.json();
      metadata = {
        owner: data.owner?.login || owner,
        repo: data.name || repo,
        fullName: data.full_name || `${owner}/${repo}`,
        description: data.description || '',
        language: data.language || 'TypeScript',
        stars: data.stargazers_count || 0,
        forks: data.forks_count || 0,
        openIssues: data.open_issues_count || 0,
        watchers: data.watchers_count || 0,
        license: data.license?.spdx_id || null,
        isPrivate: Boolean(data.private),
        defaultBranch: branch || data.default_branch || 'main',
        updatedAt: data.updated_at || new Date().toISOString(),
        createdAt: data.created_at || new Date().toISOString(),
        size: data.size || 0,
        htmlUrl: data.html_url || `https://github.com/${owner}/${repo}`,
      };
    }
  } catch (e) {
    console.warn(`[DomoScope MCP] Failed to fetch metadata for ${owner}/${repo}`, e);
  }

  const activeBranch = branch || metadata.defaultBranch || 'main';

  // 2. Fetch Git Tree
  let files: RepoFile[] = [];
  try {
    const treeRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${activeBranch}?recursive=1`,
      { headers }
    );
    if (treeRes.ok) {
      const treeData = await treeRes.json();
      if (Array.isArray(treeData.tree)) {
        files = treeData.tree.map((item: any) => {
          const path = item.path as string;
          const ext = path.includes('.') ? path.split('.').pop()?.toLowerCase() || '' : '';
          const name = path.split('/').pop() || path;
          const category = categorizeFile(path, ext, item.type === 'blob' ? 'blob' : 'tree');
          return {
            path,
            name,
            size: item.size || 0,
            type: item.type === 'blob' ? 'blob' : 'tree',
            extension: ext,
            category,
          } as RepoFile;
        });
      }
    }
  } catch (e) {
    console.warn(`[DomoScope MCP] Failed to fetch tree for ${owner}/${repo}`, e);
  }

  // 3. Preload critical files for deep static analysis
  const fileContents = new Map<string, string>();

  // Fallback tree discovery if GitHub REST API rate-limited or blocked
  if (files.length === 0) {
    const discoveredPaths = new Set<string>(['README.md']);

    try {
      const pageRes = await fetch(`https://github.com/${owner}/${repo}`);
      if (pageRes.ok) {
        const pageHtml = await pageRes.text();
        const matches = pageHtml.matchAll(
          new RegExp(`/${owner}/${repo}/blob/(?:${activeBranch}|[a-zA-Z0-9_.-]+)/([^"\\\\#?]+)`, 'g')
        );
        for (const m of matches) {
          if (m[1]) {
            discoveredPaths.add(m[1].replace(/\\+$/, ''));
          }
        }
      }
    } catch {
      // ignore
    }

    // Probe candidate root manifests & entry points to confirm existence
    const probeCandidates = [
      'pubspec.yaml',
      'package.json',
      'requirements.txt',
      'pyproject.toml',
      'go.mod',
      'Cargo.toml',
      'schema.prisma',
      'lib/main.dart',
      'src/App.tsx',
      'src/main.tsx',
      'src/index.ts',
      'docs/dfd/entity_relationship_diagram.md',
    ];

    await Promise.all(
      probeCandidates.map(async (candidate) => {
        const content = await fetchRawFile(owner, repo, activeBranch, candidate, token);
        if (content && content.trim().length > 0) {
          discoveredPaths.add(candidate);
          fileContents.set(candidate, content);
        }
      })
    );

    files = Array.from(discoveredPaths).map((filePath) => {
      const ext = filePath.includes('.') ? filePath.split('.').pop()?.toLowerCase() || '' : '';
      const name = filePath.split('/').pop() || filePath;
      const category = categorizeFile(filePath, ext, 'blob');
      return {
        path: filePath,
        name,
        size: 500,
        type: 'blob',
        extension: ext,
        category,
      } as RepoFile;
    });
  }

  const criticalFilePatterns = [
    'package.json',
    'pubspec.yaml',
    'pubspec.yml',
    'requirements.txt',
    'pyproject.toml',
    'go.mod',
    'cargo.toml',
    'schema.prisma',
    'readme.md',
    'lib/main.dart',
    'src/app.tsx',
    'src/main.tsx',
    'src/index.ts',
  ];

  const filesToFetch = files
    .filter((f) => {
      if (fileContents.has(f.path)) return false; // already fetched
      const lower = f.path.toLowerCase();
      const nameLower = f.name.toLowerCase();
      if (criticalFilePatterns.includes(nameLower) || criticalFilePatterns.includes(lower)) return true;
      if (lower.includes('models/') || lower.includes('routes/') || lower.includes('api/')) return true;
      if (lower.endsWith('.sql') || lower.includes('migrations/')) return true;
      if (lower.includes('entity_relationship') || lower.includes('erd') || lower.includes('schema')) return true;
      return false;
    })
    .slice(0, 30);

  await Promise.all(
    filesToFetch.map(async (f) => {
      const content = await fetchRawFile(owner, repo, activeBranch, f.path, token);
      if (content) {
        fileContents.set(f.path, content);
      }
    })
  );

  const manifestFiles = Array.from(fileContents.entries())
    .filter(([p]) => /package\.json|pubspec\.ya?ml|requirements\.txt|go\.mod|cargo\.toml/i.test(p))
    .map(([path, content]) => ({ path, content }));

  const sourceCandidates = Array.from(fileContents.entries()).map(([path, content]) => ({ path, content }));

  // 4. Perform architectural analysis
  const dependencies = parseDependencies(manifestFiles, sourceCandidates);
  const framework = detectFrameworks(files, fileContents, dependencies);
  const cloud = detectCloudServices(files, fileContents, dependencies);
  const dbSchema = parseDatabaseFiles(sourceCandidates);
  const apiRoutes = parseApiEndpoints(sourceCandidates);
  const securityFindings = runSecurityChecks(sourceCandidates);
  const graph = buildArchitectureGraph(files, fileContents, { databaseSchema: dbSchema });

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
  for (const f of files) {
    if (categoriesCount[f.category] !== undefined) {
      categoriesCount[f.category]++;
    }
  }

  const entryPointCandidates = ['src/index.ts', 'src/main.ts', 'src/main.tsx', 'src/App.tsx', 'lib/main.dart', 'index.js', 'main.py', 'main.go'];
  const entryPoints = files
    .filter((f) => entryPointCandidates.some((c) => f.path.toLowerCase() === c.toLowerCase()))
    .map((f) => f.path);

  const analysis: RepoAnalysis = {
    metadata,
    files,
    summary: `${metadata.fullName} codebase architecture analysis`,
    categoriesCount,
    languages: { [metadata.language || 'TypeScript']: files.length },
    totalFiles: files.filter((f) => f.type === 'blob').length,
    totalDirs: files.filter((f) => f.type === 'tree').length,
    detectedTools: framework.allDetected,
    entryPoints: entryPoints.length > 0 ? entryPoints : [files[0]?.path || 'root'],
  };

  const result: CachedRepoAnalysis = {
    metadata,
    files,
    fileContents,
    analysis,
    graph,
    dbSchema,
    apiRoutes,
    securityFindings,
    dependencies,
    framework,
    cloud,
    analyzedAt: Date.now(),
  };

  analysisCache.set(cacheKey, result);
  return result;
}

/**
 * Main JSON-RPC MCP request handler conforming to protocol version 2024-11-05
 */
export async function handleMcpRequest(
  request: JSONRPCRequest,
  options?: { githubToken?: string }
): Promise<JSONRPCResponse> {
  const id = request.id !== undefined ? request.id : null;

  try {
    switch (request.method) {
      // ── Lifecycle Handshake ──────────────────────────────────────────────
      case 'initialize': {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: { listChanged: false },
              resources: { subscribe: false, listChanged: false },
              prompts: { listChanged: false },
            },
            serverInfo: {
              name: 'domoscope-mcp',
              version: '1.0.0',
              description: 'Model Context Protocol (MCP) server for DomoScope software architecture exploration',
            },
          },
        };
      }

      case 'notifications/initialized': {
        return {
          jsonrpc: '2.0',
          id,
          result: {},
        };
      }

      case 'ping': {
        return {
          jsonrpc: '2.0',
          id,
          result: {},
        };
      }

      // ── Tools ─────────────────────────────────────────────────────────────
      case 'tools/list': {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            tools: DOMOSCOPE_MCP_TOOLS,
          },
        };
      }

      case 'tools/call': {
        const { name, arguments: args = {} } = request.params || {};

        if (!name) {
          return {
            jsonrpc: '2.0',
            id,
            error: { code: -32602, message: 'Missing tool name in params' },
          };
        }

        let owner = args.owner;
        let repo = args.repo;
        const branch = args.branch;

        if (!owner && !repo && (args.projectPath || args.path)) {
          owner = 'local';
          repo = args.projectPath || args.path || '.';
        } else if (owner === '.' || owner === './') {
          owner = 'local';
          repo = '.';
        }

        if (!owner || !repo) {
          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32602,
              message: 'Both "owner" and "repo" (or "projectPath") parameters are required for repository inspection',
            },
          };
        }

        const data = await analyzeRepositoryForMCP(owner, repo, branch, options?.githubToken);

        switch (name) {
          case 'get_repository_architecture': {
            const summary = {
              repository: data.metadata.fullName,
              defaultBranch: data.metadata.defaultBranch,
              primaryFramework: data.framework.primary.name,
              primaryCategory: data.framework.primary.category,
              detectedFrameworks: [data.framework.primary, ...data.framework.secondary].map((f) => ({ name: f.name, category: f.category })),
              cloudArchitecture: data.cloud.architectureTitle,
              cloudProviders: data.cloud.providers,
              entryPoints: data.analysis.entryPoints,
              totalFiles: data.files.length,
              componentsCount: data.graph.nodes.filter((n) => n.data?.category === 'component').length,
              servicesCount: data.graph.nodes.filter((n) => n.data?.category === 'service').length,
              routesCount: data.apiRoutes.length,
              databaseTablesCount: data.dbSchema.tables.length,
              architectureGraph: {
                nodes: data.graph.nodes.slice(0, 100).map((n) => ({ id: n.id, label: n.data?.label || n.id, category: n.data?.category })),
                edges: data.graph.edges.slice(0, 100).map((e) => ({ source: e.source, target: e.target })),
              },
            };

            return {
              jsonrpc: '2.0',
              id,
              result: {
                content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }],
              },
            };
          }

          case 'get_reverse_engineer_blueprint': {
            const validCategory: ReverseEngineerCategory =
              args.category && ['fullstack', 'ui_ux', 'frontend', 'backend', 'database', 'agent_skill'].includes(args.category)
                ? (args.category as ReverseEngineerCategory)
                : 'fullstack';

            const blueprintText = generateReverseEngineerSpec(
              validCategory,
              data.metadata.repo,
              data.analysis,
              data.files,
              data.fileContents,
              data.dbSchema,
              data.dependencies
            );

            return {
              jsonrpc: '2.0',
              id,
              result: {
                content: [{ type: 'text', text: blueprintText }],
              },
            };
          }

          case 'get_database_erd': {
            const { format = 'json' } = args;

            if (format === 'sql') {
              let sql = `-- DomoScope Generated SQL Schema DDL for ${data.metadata.fullName}\n\n`;
              for (const t of data.dbSchema.tables) {
                sql += `CREATE TABLE ${t.name} (\n`;
                const cols = t.columns.map((c) => {
                  let def = `  ${c.name} ${c.type || 'TEXT'}`;
                  if (c.isPrimary) def += ' PRIMARY KEY';
                  if (!c.isNullable && !c.isPrimary) def += ' NOT NULL';
                  if (c.references) def += ` REFERENCES ${c.references.table}(${c.references.column})`;
                  return def;
                });
                sql += cols.join(',\n') + '\n);\n\n';
              }
              return {
                jsonrpc: '2.0',
                id,
                result: {
                  content: [{ type: 'text', text: sql }],
                },
              };
            }

            if (format === 'mermaid') {
              let m = `erDiagram\n`;
              for (const r of data.dbSchema.relationships) {
                m += `  ${r.fromTable} ||--o{ ${r.toTable} : "${r.fromColumn} -> ${r.toColumn}"\n`;
              }
              for (const t of data.dbSchema.tables) {
                m += `  ${t.name} {\n`;
                for (const c of t.columns.slice(0, 10)) {
                  m += `    ${c.type || 'string'} ${c.name}\n`;
                }
                m += `  }\n`;
              }
              return {
                jsonrpc: '2.0',
                id,
                result: {
                  content: [{ type: 'text', text: m }],
                },
              };
            }

            return {
              jsonrpc: '2.0',
              id,
              result: {
                content: [{ type: 'text', text: JSON.stringify(data.dbSchema, null, 2) }],
              },
            };
          }

          case 'get_api_catalog': {
            return {
              jsonrpc: '2.0',
              id,
              result: {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(
                      {
                        repository: data.metadata.fullName,
                        totalEndpoints: data.apiRoutes.length,
                        endpoints: data.apiRoutes,
                      },
                      null,
                      2
                    ),
                  },
                ],
              },
            };
          }

          case 'get_security_audit': {
            return {
              jsonrpc: '2.0',
              id,
              result: {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(
                      {
                        repository: data.metadata.fullName,
                        totalFindings: data.securityFindings.length,
                        findings: data.securityFindings,
                      },
                      null,
                      2
                    ),
                  },
                ],
              },
            };
          }

          case 'get_dependencies': {
            return {
              jsonrpc: '2.0',
              id,
              result: {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(
                      {
                        repository: data.metadata.fullName,
                        totalDependencies: data.dependencies.length,
                        dependencies: data.dependencies,
                      },
                      null,
                      2
                    ),
                  },
                ],
              },
            };
          }

          case 'get_file_tree': {
            const limit = Math.min(Number(args.limit) || 200, 1000);
            return {
              jsonrpc: '2.0',
              id,
              result: {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(
                      {
                        repository: data.metadata.fullName,
                        totalIndexedFiles: data.files.length,
                        returnedFiles: Math.min(data.files.length, limit),
                        files: data.files.slice(0, limit),
                      },
                      null,
                      2
                    ),
                  },
                ],
              },
            };
          }

          case 'read_repository_file': {
            const filePath = String(args.path || '').trim();
            if (!filePath) {
              return {
                jsonrpc: '2.0',
                id,
                error: { code: -32602, message: 'Missing "path" parameter' },
              };
            }

            let content = data.fileContents.get(filePath);
            if (!content) {
              content = await fetchRawFile(owner, repo, data.metadata.defaultBranch, filePath, options?.githubToken);
            }

            if (!content) {
              return {
                jsonrpc: '2.0',
                id,
                result: {
                  content: [{ type: 'text', text: `File not found or empty: ${filePath}` }],
                  isError: true,
                },
              };
            }

            return {
              jsonrpc: '2.0',
              id,
              result: {
                content: [{ type: 'text', text: content }],
              },
            };
          }

          case 'generate_markdown_spec': {
            const spec = MarkdownSpecGenerator.generateSpec(
              data.analysis,
              data.files,
              data.fileContents,
              data.dbSchema,
              data.dependencies,
              data.securityFindings
            );

            return {
              jsonrpc: '2.0',
              id,
              result: {
                content: [{ type: 'text', text: spec }],
              },
            };
          }

          case 'query_domoscope': {
            const query = String(args.query || '').trim();
            if (!query) {
              return {
                jsonrpc: '2.0',
                id,
                error: { code: -32602, message: 'Missing "query" parameter' },
              };
            }

            const answer = `### DomoScope Codebase Summary for ${data.metadata.fullName}\n\n` +
              `- **Primary Framework**: ${data.framework.primary.name} (${data.framework.primary.category})\n` +
              `- **Cloud Foundation**: ${data.cloud.architectureTitle}\n` +
              `- **Entry Points**: ${data.analysis.entryPoints.join(', ') || 'N/A'}\n` +
              `- **Key Components**: ${data.graph.nodes.slice(0, 8).map((n) => n.data?.label || n.id).join(', ')}\n` +
              `- **Database Tables**: ${data.dbSchema.tables.map((t) => t.name).join(', ') || 'None'}\n` +
              `- **API Routes**: ${data.apiRoutes.length} endpoints discovered\n` +
              `- **Security Findings**: ${data.securityFindings.length} issues detected\n\n` +
              `*Grounded in DomoScope static AST analysis.*`;

            return {
              jsonrpc: '2.0',
              id,
              result: {
                content: [{ type: 'text', text: answer }],
              },
            };
          }

          case 'get_project_overview': {
            const overview = {
              repository: data.metadata.fullName,
              description: data.metadata.description,
              primaryFramework: data.framework.primary.name,
              primaryCategory: data.framework.primary.category,
              secondaryFrameworks: data.framework.secondary.map((f) => f.name),
              cloudArchitecture: data.cloud.architectureTitle,
              cloudProviders: data.cloud.providers,
              entryPoints: data.analysis.entryPoints,
              totalIndexedFiles: data.files.length,
              componentsCount: data.graph.nodes.filter((n) => n.data?.category === 'component').length,
              servicesCount: data.graph.nodes.filter((n) => n.data?.category === 'service').length,
              apiRoutesCount: data.apiRoutes.length,
              databaseTablesCount: data.dbSchema.tables.length,
              dependenciesCount: data.dependencies.length,
              securityIssuesCount: data.securityFindings.length,
              defaultBranch: data.metadata.defaultBranch,
              analyzedAt: new Date(data.analyzedAt).toISOString(),
            };
            return {
              jsonrpc: '2.0',
              id,
              result: {
                content: [{ type: 'text', text: JSON.stringify(overview, null, 2) }],
              },
            };
          }

          case 'get_dependency_graph': {
            const limit = Math.min(Number(args.limit) || 200, 1000);
            const filterCategory = args.category ? String(args.category).toLowerCase() : null;

            let nodes = data.graph.nodes;
            if (filterCategory) {
              nodes = nodes.filter((n) => String(n.data?.category).toLowerCase() === filterCategory);
            }
            const nodeIds = new Set(nodes.map((n) => n.id));
            const edges = data.graph.edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));

            return {
              jsonrpc: '2.0',
              id,
              result: {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(
                      {
                        repository: data.metadata.fullName,
                        totalNodes: nodes.length,
                        totalEdges: edges.length,
                        nodes: nodes.slice(0, limit).map((n) => ({
                          id: n.id,
                          label: n.data?.label || n.id,
                          category: n.data?.category,
                          filePath: n.data?.filePath || n.id,
                          dependencies: n.data?.dependencies || [],
                        })),
                        edges: edges.slice(0, limit).map((e) => ({
                          source: e.source,
                          target: e.target,
                          type: e.type,
                        })),
                      },
                      null,
                      2
                    ),
                  },
                ],
              },
            };
          }

          case 'get_module_details': {
            const targetPath = String(args.path || args.filePath || args.module_path || args.modulePath || '').trim();
            if (!targetPath) {
              return {
                jsonrpc: '2.0',
                id,
                error: { code: -32602, message: 'Missing "path" parameter' },
              };
            }
            const matchedNode = data.graph.nodes.find(
              (n) => n.id === targetPath || n.data?.filePath === targetPath || n.id.endsWith(targetPath)
            );
            const relatedEdges = data.graph.edges.filter(
              (e) => e.source === matchedNode?.id || e.target === matchedNode?.id
            );
            const relatedRoutes = data.apiRoutes.filter(
              (r) => r.file === targetPath || r.path === targetPath || (r as any).controller?.includes(targetPath)
            );
            const fileEntry = data.files.find((f) => f.path === targetPath);
            const content = data.fileContents.get(targetPath);

            const details = {
              repository: data.metadata.fullName,
              filePath: targetPath,
              exists: Boolean(fileEntry || matchedNode),
              category: fileEntry?.category || matchedNode?.data?.category || 'unknown',
              nodeInfo: matchedNode
                ? {
                    id: matchedNode.id,
                    label: matchedNode.data?.label,
                    dependencies: matchedNode.data?.dependencies,
                  }
                : null,
              inboundConnections: relatedEdges.filter((e) => e.target === matchedNode?.id).map((e) => e.source),
              outboundConnections: relatedEdges.filter((e) => e.source === matchedNode?.id).map((e) => e.target),
              associatedApiRoutes: relatedRoutes,
              lineCount: content ? content.split('\n').length : fileEntry?.size ? Math.round(fileEntry.size / 30) : 0,
            };

            return {
              jsonrpc: '2.0',
              id,
              result: {
                content: [{ type: 'text', text: JSON.stringify(details, null, 2) }],
              },
            };
          }

          case 'get_analysis_status': {
            const status = {
              repository: data.metadata.fullName,
              analyzedAt: new Date(data.analyzedAt).toISOString(),
              isFresh: Date.now() - data.analyzedAt < 5 * 60 * 1000,
              totalFiles: data.files.length,
              cachedInMemory: true,
              modulesIndexed: data.graph.nodes.length,
              routesDiscovered: data.apiRoutes.length,
              tablesDiscovered: data.dbSchema.tables.length,
              securityIssuesFound: data.securityFindings.length,
            };
            return {
              jsonrpc: '2.0',
              id,
              result: {
                content: [{ type: 'text', text: JSON.stringify(status, null, 2) }],
              },
            };
          }

          case 'get_changed_files': {
            return {
              jsonrpc: '2.0',
              id,
              result: {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(
                      {
                        repository: data.metadata.fullName,
                        lastIndexedAt: new Date(data.analyzedAt).toISOString(),
                        totalFiles: data.files.length,
                        files: data.files.slice(0, 100).map((f) => ({
                          path: f.path,
                          category: f.category,
                          size: f.size,
                        })),
                      },
                      null,
                      2
                    ),
                  },
                ],
              },
            };
          }

          case 'list_repository_files': {
            const limit = Math.min(Number(args.limit) || 300, 1000);
            return {
              jsonrpc: '2.0',
              id,
              result: {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(
                      {
                        repository: data.metadata.fullName,
                        totalIndexedFiles: data.files.length,
                        returnedFiles: Math.min(data.files.length, limit),
                        files: data.files.slice(0, limit),
                      },
                      null,
                      2
                    ),
                  },
                ],
              },
            };
          }

          default: {
            return {
              jsonrpc: '2.0',
              id,
              error: { code: -32601, message: `Method or tool not found: ${name}` },
            };
          }
        }
      }

      // ── Resources ─────────────────────────────────────────────────────────
      case 'resources/list': {
        const resources = [
          {
            uri: 'domoscope://tools/catalog',
            name: 'DomoScope Tools Catalog',
            description: 'Catalog of architectural inspection tools provided by DomoScope',
            mimeType: 'application/json',
          },
          {
            uri: 'domoscope://architecture/schema',
            name: 'DomoScope Architecture Schema',
            description: 'Specification schema for node types, edges, and domain entities',
            mimeType: 'application/json',
          },
        ];

        return {
          jsonrpc: '2.0',
          id,
          result: { resources },
        };
      }

      case 'resources/read': {
        const uri = request.params?.uri;
        if (uri === 'domoscope://tools/catalog') {
          return {
            jsonrpc: '2.0',
            id,
            result: {
              contents: [
                {
                  uri,
                  mimeType: 'application/json',
                  text: JSON.stringify(DOMOSCOPE_MCP_TOOLS, null, 2),
                },
              ],
            },
          };
        }

        return {
          jsonrpc: '2.0',
          id,
          error: { code: -32602, message: `Resource not found: ${uri}` },
        };
      }

      // ── Prompts ───────────────────────────────────────────────────────────
      case 'prompts/list': {
        return {
          jsonrpc: '2.0',
          id,
          result: { prompts: DOMOSCOPE_MCP_PROMPTS },
        };
      }

      case 'prompts/get': {
        const { name, arguments: promptArgs = {} } = request.params || {};
        const p = DOMOSCOPE_MCP_PROMPTS.find((item) => item.name === name);
        if (!p) {
          return {
            jsonrpc: '2.0',
            id,
            error: { code: -32602, message: `Prompt template not found: ${name}` },
          };
        }

        const owner = promptArgs.owner || '<owner>';
        const repo = promptArgs.repo || '<repo>';

        let promptText = '';
        if (name === 'reverse_engineer_subsystem') {
          promptText = `You are an expert software engineer using DomoScope MCP tools. Inspect repository ${owner}/${repo} using \`get_reverse_engineer_blueprint\` and \`get_database_erd\`. Provide a step-by-step implementation guide to reconstruct its core systems.`;
        } else if (name === 'audit_security_posture') {
          promptText = `You are a security auditor using DomoScope MCP tools. Call \`get_security_audit\` for ${owner}/${repo}, evaluate findings, and prioritize fixes based on CWE severity.`;
        } else {
          promptText = `Explain the architectural components and data flows of ${owner}/${repo} using DomoScope \`get_repository_architecture\`.`;
        }

        return {
          jsonrpc: '2.0',
          id,
          result: {
            description: p.description,
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: promptText,
                },
              },
            ],
          },
        };
      }

      default: {
        return {
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: `Method not found: ${request.method}`,
          },
        };
      }
    }
  } catch (err: any) {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: -32603,
        message: err?.message || 'Internal MCP server error',
      },
    };
  }
}
