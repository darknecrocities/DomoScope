import { useState, useEffect, useCallback, useRef } from 'react';
import {
  RepoMetadata,
  RepoFile,
  RepoAnalysis,
  DatabaseSchema,
  RepoDependency,
  BranchInfo,
  SecurityFinding,
} from '../types';
import { GitHubService, GitHubError, getAuthHeaders } from '../services/github';
import { fetchViaZipball, fetchViaRawProbe } from '../services/githubFallback';
import { StorageService } from '../services/storage';
import { analyzeRepository } from '../services/analysis';
import { parseDatabaseFiles } from '../services/databaseParser';
import { parseDependencies } from '../services/dependencyParser';
import { runSecurityChecks } from '../services/securityScanner';

export type LoadingStep =
  | 'idle'
  | 'Checking repository'
  | 'Reading files'
  | 'Understanding structure'
  | 'Building project map'
  | 'Preparing workspace'
  | 'done';

export function useRepository(owner?: string, repo?: string, initialBranch?: string) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [loadingStep, setLoadingStep] = useState<LoadingStep>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState<boolean>(false);
  const [isFallbackMode, setIsFallbackMode] = useState<boolean>(false);

  const [metadata, setMetadata] = useState<RepoMetadata | null>(null);
  const [currentBranch, setCurrentBranch] = useState<string>(initialBranch || '');
  const [files, setFiles] = useState<RepoFile[]>([]);
  const [analysis, setAnalysis] = useState<RepoAnalysis | null>(null);
  const [fileContents, setFileContents] = useState<Map<string, string>>(new Map());
  const [databaseSchema, setDatabaseSchema] = useState<DatabaseSchema | null>(null);
  const [dependencies, setDependencies] = useState<RepoDependency[]>([]);
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [securityFindings, setSecurityFindings] = useState<SecurityFinding[]>([]);

  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const loadRepository = useCallback(
    async (ownerName: string, repoName: string, branchName?: string, forceRefresh: boolean = false) => {
      if (!ownerName || !repoName) return;

      setStatus('loading');
      setErrorMessage(null);
      setIsRateLimited(false);
      setIsFallbackMode(false);
      setLoadingStep('Checking repository');

      try {
        // Step 1: Check cache unless forceRefresh
        const cachedAnalysis = await StorageService.getAnalysis(ownerName, repoName, branchName);
        const { hasToken } = await getAuthHeaders();

        // Check if cache was a fallback 2-file probe
        const isFallbackCache =
          cachedAnalysis?.metadata.description?.includes('Stream') ||
          (cachedAnalysis?.files && cachedAnalysis.files.length <= 2);

        // Check if the requested branch matches the cached analysis
        const isTargetingDefault = !branchName || (cachedAnalysis && branchName === cachedAnalysis.metadata.defaultBranch);
        const isMatchingBranch = branchName ? Boolean(cachedAnalysis) : isTargetingDefault;

        // If authenticated with token, ignore stale fallback cache and fetch live API!
        if (
          !forceRefresh &&
          isMatchingBranch &&
          cachedAnalysis &&
          (!hasToken || !isFallbackCache) &&
          isMounted.current
        ) {
          const resolvedBranch = branchName || cachedAnalysis.metadata.defaultBranch;
          setMetadata(cachedAnalysis.metadata);
          setAnalysis(cachedAnalysis);
          setFiles(cachedAnalysis.files);
          setCurrentBranch(resolvedBranch);

          // Load cached branches, database, security
          const cachedBranches = await StorageService.getBranches(ownerName, repoName);
          if (cachedBranches) setBranches(cachedBranches);

          const cachedSchema = await StorageService.getDatabaseSchema(ownerName, repoName, resolvedBranch);
          if (cachedSchema) setDatabaseSchema(cachedSchema);

          const cachedSec = await StorageService.getSecurityFindings(ownerName, repoName, resolvedBranch);
          if (cachedSec) setSecurityFindings(cachedSec);

          if (cachedAnalysis.entryPoints.length > 0) {
            setSelectedFile(cachedAnalysis.entryPoints[0]);
          } else if (cachedAnalysis.files.length > 0) {
            const firstBlob = cachedAnalysis.files.find((f) => f.type === 'blob');
            if (firstBlob) setSelectedFile(firstBlob.path);
          }

          setStatus('success');
          setLoadingStep('done');
          return;
        }

        // Check if this specific branch file tree is cached in IndexedDB
        const cachedBranchTree = (!forceRefresh && branchName)
          ? await StorageService.getFileTree(ownerName, repoName, branchName)
          : null;

        let meta: RepoMetadata | null = metadata;
        let repoFiles: RepoFile[] = [];
        let isFallback = false;
        let preloadedContents = new Map<string, string>();
        let activeBranch = branchName || metadata?.defaultBranch || 'main';

        // Step 2: Try fetching metadata & file tree via GitHub REST API
        try {
          if (!meta) {
            meta = await GitHubService.fetchRepoMetadata(ownerName, repoName);
          }
          activeBranch = branchName || meta.defaultBranch;

          setLoadingStep('Reading files');
          if (cachedBranchTree && cachedBranchTree.length > 0) {
            repoFiles = cachedBranchTree;
          } else {
            repoFiles = await GitHubService.fetchRepoTree(ownerName, repoName, activeBranch);
            StorageService.saveFileTree(ownerName, repoName, activeBranch, repoFiles);
          }
        } catch (err: any) {
          // If GitHub REST API throws RateLimit, 403, 404 or network error -> engage Zero-Rate-Limit Fallback Engine!
          console.warn('[DomoScope] REST API blocked/failed. Engaging High-Availability Direct Stream Engine...', err);
          isFallback = true;
          setIsFallbackMode(true);
          setIsRateLimited(true);

          setLoadingStep('Reading files');
          const fallbackData = (await fetchViaZipball(ownerName, repoName, activeBranch)) ||
                             (await fetchViaRawProbe(ownerName, repoName, activeBranch));

          meta = meta || fallbackData.metadata;
          repoFiles = fallbackData.files;
          preloadedContents = fallbackData.fileContents;
          activeBranch = fallbackData.branch;
        }

        if (!isMounted.current) return;
        setMetadata(meta);
        setCurrentBranch(activeBranch);
        setFiles(repoFiles);

        // Step 4: Fetch manifest, schema, and source files for deep analysis & polyglot graph
        setLoadingStep('Understanding structure');
        const criticalFiles = repoFiles.filter(
          (f) =>
            f.type === 'blob' &&
            (f.name === 'package.json' ||
              f.name === 'requirements.txt' ||
              f.name === 'pyproject.toml' ||
              f.name === 'go.mod' ||
              f.name === 'Cargo.toml' ||
              f.name === 'pubspec.yaml' ||
              f.name === 'schema.prisma' ||
              f.path.includes('drizzle') ||
              f.path.includes('migrations/') ||
              f.name.endsWith('.sql') ||
              ['ts', 'tsx', 'js', 'jsx', 'dart', 'java', 'kt', 'py', 'go', 'rs', 'cs', 'cpp', 'h'].includes(f.extension))
        );

        const contentsMap = new Map<string, string>(preloadedContents);

        // Load missing critical contents in parallel with smart priority sorting (Manifests -> Schemas/Models -> Routes/Entry Points)
        const getFilePriority = (f: RepoFile): number => {
          const n = f.name.toLowerCase();
          const p = f.path.toLowerCase();
          if (n === 'package.json' || n === 'go.mod' || n === 'cargo.toml' || n === 'requirements.txt' || n === 'pyproject.toml') return 1;
          if (n === 'schema.prisma' || n.endsWith('.sql') || p.includes('schema') || p.includes('model') || p.includes('entity') || p.includes('entities')) return 2;
          if (p.includes('routes') || p.includes('api') || p.includes('controllers') || /src\/(main|index|app)\./i.test(p) || p === 'lib/main.dart') return 3;
          return 4;
        };

        const missingCriticals = criticalFiles
          .filter((f) => !contentsMap.has(f.path))
          .sort((a, b) => getFilePriority(a) - getFilePriority(b));

        const fetchPromises = missingCriticals.slice(0, 100).map(async (file) => {
          try {
            const content = await GitHubService.fetchFileContent(ownerName, repoName, activeBranch, file.path);
            contentsMap.set(file.path, content);
          } catch {
            // Ignore individual file fetch failures
          }
        });
        await Promise.all(fetchPromises);

        // Step 5: Analyze repository
        setLoadingStep('Building project map');
        const analyzed = analyzeRepository(meta, repoFiles);
        if (!isMounted.current) return;
        setAnalysis(analyzed);
        setFileContents(new Map(contentsMap));

        // Step 6: Parse database schemas & domain entity models
        const allFetchedFiles = Array.from(contentsMap.entries()).map(([path, content]) => ({ path, content }));
        const schemaFilesToParse = allFetchedFiles.filter((f) => {
          const p = f.path.toLowerCase();
          return (
            p.includes('schema') ||
            p.includes('model') ||
            p.includes('entity') ||
            p.includes('entities') ||
            p.includes('migration') ||
            p.includes('drizzle') ||
            p.endsWith('.sql') ||
            p.endsWith('.prisma') ||
            p.endsWith('.drift') ||
            p.includes('types')
          );
        });

        const schema = parseDatabaseFiles(schemaFilesToParse.length > 0 ? schemaFilesToParse : allFetchedFiles);
        setDatabaseSchema(schema);
        await StorageService.saveDatabaseSchema(ownerName, repoName, activeBranch, schema);

        // Step 7: Parse dependencies
        const manifestFiles = Array.from(contentsMap.entries())
          .filter(
            ([p]) =>
              p.endsWith('package.json') ||
              p.endsWith('requirements.txt') ||
              p.endsWith('go.mod') ||
              p.endsWith('Cargo.toml')
          )
          .map(([path, content]) => ({ path, content }));
        const sourceCandidates = Array.from(contentsMap.entries()).map(([path, content]) => ({ path, content }));
        const deps = parseDependencies(manifestFiles, sourceCandidates);
        setDependencies(deps);

        // Step 8: Run security checks
        const secFindings = runSecurityChecks(sourceCandidates);
        setSecurityFindings(secFindings);
        await StorageService.saveSecurityFindings(ownerName, repoName, activeBranch, secFindings);

        // Step 9: Fetch branches in background
        if (!isFallback) {
          GitHubService.fetchBranches(ownerName, repoName)
            .then((bList) => {
              if (isMounted.current && bList.length > 0) {
                const enriched = bList.map((b) => ({
                  ...b,
                  isDefault: b.name === meta.defaultBranch,
                }));
                setBranches(enriched);
                StorageService.saveBranches(ownerName, repoName, enriched);
              }
            })
            .catch(() => {});
        } else {
          // If fallback mode, preserve existing branches or load from cache
          const cachedBranches = await StorageService.getBranches(ownerName, repoName);
          if (cachedBranches && cachedBranches.length > 0) {
            setBranches(cachedBranches);
          } else {
            setBranches([{ name: activeBranch, sha: 'latest', isDefault: true }]);
          }
        }

        // Save analysis to IndexedDB with branch context
        await StorageService.saveAnalysis(ownerName, repoName, analyzed, activeBranch);

        // Set initial selected file
        if (analyzed.entryPoints.length > 0) {
          setSelectedFile(analyzed.entryPoints[0]);
        } else if (repoFiles.length > 0) {
          const firstBlob = repoFiles.find((f) => f.type === 'blob');
          if (firstBlob) setSelectedFile(firstBlob.path);
        }

        setLoadingStep('Preparing workspace');
        setTimeout(() => {
          if (isMounted.current) {
            setStatus('success');
            setLoadingStep('done');
          }
        }, 150);
      } catch (err: any) {
        if (!isMounted.current) return;
        setStatus('error');
        if (err instanceof GitHubError) {
          setErrorMessage(err.message);
          setIsRateLimited(err.isRateLimit);
        } else {
          setErrorMessage(err?.message || 'Failed to inspect this repository. Please verify the URL and try again.');
        }
      }
    },
    []
  );

  const loadFileContent = useCallback(
    async (filePath: string): Promise<string> => {
      if (!owner || !repo || !currentBranch) return '';

      // Check current in-memory map
      if (fileContents.has(filePath)) {
        return fileContents.get(filePath)!;
      }

      try {
        const content = await GitHubService.fetchFileContent(owner, repo, currentBranch, filePath);
        setFileContents((prev) => {
          const next = new Map(prev);
          next.set(filePath, content);
          return next;
        });

        // Run incremental security check on newly fetched file
        const newFindings = runSecurityChecks([{ path: filePath, content }]);
        if (newFindings.length > 0) {
          setSecurityFindings((prev) => {
            const existingIds = new Set(prev.map((f) => f.id));
            const merged = [...prev];
            for (const f of newFindings) {
              if (!existingIds.has(f.id)) merged.push(f);
            }
            return merged;
          });
        }

        return content;
      } catch (e: any) {
        console.warn(`Error loading content for ${filePath}:`, e);
        return `// Could not load content for ${filePath}\n// ${e.message || 'Network error'}`;
      }
    },
    [owner, repo, currentBranch, fileContents]
  );

  const selectFile = useCallback(
    (filePath: string) => {
      setSelectedFile(filePath);
      loadFileContent(filePath);
    },
    [loadFileContent]
  );

  const refresh = useCallback(() => {
    if (owner && repo) {
      StorageService.clearRepoCache(owner, repo);
      loadRepository(owner, repo, currentBranch, true);
    }
  }, [owner, repo, currentBranch, loadRepository]);

  useEffect(() => {
    if (owner && repo) {
      loadRepository(owner, repo, initialBranch);
    }
  }, [owner, repo, initialBranch, loadRepository]);

  return {
    status,
    loadingStep,
    errorMessage,
    isRateLimited,
    isFallbackMode,
    metadata,
    currentBranch,
    files,
    analysis,
    fileContents,
    databaseSchema,
    dependencies,
    branches,
    securityFindings,
    selectedFile,
    selectedNode,
    setSelectedFile: selectFile,
    setSelectedNode,
    loadFileContent,
    refresh,
    loadRepository,
  };
}
