export interface RepoIdentifier {
  owner: string;
  repo: string;
  branch?: string;
}

export interface RepoMetadata {
  owner: string;
  repo: string;
  fullName: string;
  description: string;
  defaultBranch: string;
  stars: number;
  forks: number;
  watchers: number;
  openIssues: number;
  language: string;
  license: string | null;
  updatedAt: string;
  createdAt: string;
  size: number;
  isPrivate: boolean;
  htmlUrl: string;
}

export type FileCategory =
  | 'component'
  | 'service'
  | 'api'
  | 'database'
  | 'config'
  | 'test'
  | 'style'
  | 'doc'
  | 'file'
  | 'folder';

export interface RepoFile {
  path: string;
  name: string;
  type: 'blob' | 'tree';
  size?: number;
  sha?: string;
  extension: string;
  category: FileCategory;
  content?: string;
}

export interface RepoAnalysis {
  metadata: RepoMetadata;
  files: RepoFile[];
  summary: string;
  categoriesCount: Record<FileCategory, number>;
  languages: Record<string, number>;
  totalFiles: number;
  totalDirs: number;
  detectedTools: string[];
  entryPoints: string[];
}

export interface ArchitectureNodeData {
  label: string;
  path: string;
  extension: string;
  category: FileCategory;
  importsCount: number;
  importedByCount: number;
  size?: number;
  isEntryPoint?: boolean;
  isDatabase?: boolean;
  complexityScore?: number;
  couplingScore?: number;
  healthColor?: 'green' | 'yellow' | 'red';
  heatmapMode?: boolean;
  theme?: 'light' | 'dark' | 'monokai';
  rankDirection?: 'TB' | 'LR' | 'BT' | 'RL';
  [key: string]: unknown;
}

export interface ArchitectureEdgeData {
  type: 'direct' | 'inferred' | 'call' | 'hierarchy';
  [key: string]: unknown;
}

export interface TableColumn {
  name: string;
  type: string;
  isPrimary: boolean;
  isNullable: boolean;
  isForeignKey: boolean;
  references?: {
    table: string;
    column: string;
  };
}

export interface TableRelationship {
  id: string;
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  isInferred: boolean;
}

export interface DatabaseTable {
  name: string;
  columns: TableColumn[];
  sourceFile: string;
  schemaType: 'prisma' | 'sql' | 'drizzle' | 'typeorm' | 'sqlalchemy' | 'django' | 'drift' | 'room' | 'typescript' | 'domain' | string;
}

export interface DatabaseSchema {
  tables: DatabaseTable[];
  relationships: TableRelationship[];
  detectedTypes: string[];
  sourceFiles: string[];
}

export interface RepoDependency {
  name: string;
  version: string;
  isDev: boolean;
  ecosystem: 'npm' | 'python' | 'go' | 'rust' | 'unknown';
  manifestPath: string;
  usedInFiles: string[];
}

export interface BranchInfo {
  name: string;
  sha: string;
  isDefault: boolean;
  commitMessage?: string;
  commitDate?: string;
  author?: string;
}

export interface BranchComparison {
  baseBranch: string;
  compareBranch: string;
  aheadBy: number;
  behindBy: number;
  status: string;
  filesAdded: string[];
  filesRemoved: string[];
  filesModified: string[];
  dependencyChanges: {
    name: string;
    change: 'added' | 'removed' | 'modified';
    from?: string;
    to?: string;
  }[];
  databaseChanges: string[];
}

export interface SecurityFinding {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  file: string;
  line: number;
  evidence: string;
  explanation: string;
  suggestedAction: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: number;
  referencedFiles?: string[];
  modelName?: string;
  thoughtProcess?: string;
}

export interface SearchItem {
  id: string;
  title: string;
  subtitle: string;
  type: 'file' | 'folder' | 'symbol' | 'dependency' | 'database';
  path?: string;
  category?: FileCategory;
}

export type AIProvider = 'local' | 'anthropic' | 'gemini' | 'openai';

export interface AIModelOption {
  id: string;
  name: string;
  provider: AIProvider;
  description: string;
  isDefault?: boolean;
  size?: string;
  badge?: string;
  isDownloadable?: boolean;
  isReasoning?: boolean;
}

export interface AIProviderConfig {
  provider: AIProvider;
  selectedModel: string;
  openaiKey?: string;
  anthropicKey?: string;
  geminiKey?: string;
  reasoningEffort?: 'low' | 'medium' | 'high';
}

export interface ApiEndpoint {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'QUERY' | 'MUTATION' | 'ALL' | 'HEAD' | 'OPTIONS';
  path: string;
  file: string;
  line: number;
  framework:
    | 'express'
    | 'fastapi'
    | 'flask'
    | 'spring'
    | 'gin'
    | 'dio'
    | 'http'
    | 'graphql'
    | 'nextjs'
    | 'nestjs'
    | 'django'
    | 'laravel'
    | 'supabase'
    | 'firebase'
    | 'aws-lambda'
    | 'cloudflare-worker'
    | 'azure-function'
    | 'vercel-serverless'
    | 'client-http'
    | 'client-fetch'
    | 'discovered-route'
    | string;
  summary?: string;
  cloudService?: string;
  storageType?: string;
}

export interface CallGraphNode {
  id: string;
  name: string;
  file: string;
  line: number;
  calls: string[]; // IDs or names of called functions
  calledBy: string[];
}

export interface SecurityPatch {
  findingId: string;
  file: string;
  originalCode: string;
  patchedCode: string;
  description: string;
}

export interface AuditReportData {
  repoName: string;
  generatedAt: string;
  healthScore: number;
  totalFiles: number;
  totalLines: number;
  architectureSummary: string;
  complexityDistribution: { green: number; yellow: number; red: number };
  securityIssuesCount: { critical: number; high: number; medium: number; low: number };
  detectedFrameworks: string[];
  databaseTablesCount: number;
  apiEndpointsCount: number;
}
