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
import { GitHubService, GitHubError } from '../services/github';
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
      setLoadingStep('Checking repository');

      try {
        // Step 1: Check cache unless forceRefresh
        if (!forceRefresh) {
          const cachedAnalysis = await StorageService.getAnalysis(ownerName, repoName);
          if (cachedAnalysis && isMounted.current) {
            setMetadata(cachedAnalysis.metadata);
            setAnalysis(cachedAnalysis);
            setFiles(cachedAnalysis.files);
            setCurrentBranch(cachedAnalysis.metadata.defaultBranch);

            // Load cached branches, database, security
            const cachedBranches = await StorageService.getBranches(ownerName, repoName);
            if (cachedBranches) setBranches(cachedBranches);

            const activeBranch = branchName || cachedAnalysis.metadata.defaultBranch;
            const cachedSchema = await StorageService.getDatabaseSchema(ownerName, repoName, activeBranch);
            if (cachedSchema) setDatabaseSchema(cachedSchema);

            const cachedSec = await StorageService.getSecurityFindings(ownerName, repoName, activeBranch);
            if (cachedSec) setSecurityFindings(cachedSec);

            // Set default selected file to entry point or first file
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
        }

        // Step 2: Fetch fresh metadata from GitHub
        const meta = await GitHubService.fetchRepoMetadata(ownerName, repoName);
        if (!isMounted.current) return;
        setMetadata(meta);

        const activeBranch = branchName || meta.defaultBranch;
        setCurrentBranch(activeBranch);

        // Step 3: Fetch file tree
        setLoadingStep('Reading files');
        const repoFiles = await GitHubService.fetchRepoTree(ownerName, repoName, activeBranch);
        if (!isMounted.current) return;
        setFiles(repoFiles);

        // Step 4: Fetch manifest and schema files for deep analysis
        setLoadingStep('Understanding structure');
        const criticalFiles = repoFiles.filter(
          (f) =>
            f.type === 'blob' &&
            (f.name === 'package.json' ||
              f.name === 'requirements.txt' ||
              f.name === 'pyproject.toml' ||
              f.name === 'go.mod' ||
              f.name === 'Cargo.toml' ||
              f.name === 'schema.prisma' ||
              f.path.includes('drizzle') ||
              f.path.includes('migrations/') ||
              f.name.endsWith('.sql') ||
              f.name.toLowerCase().includes('readme.md'))
        );

        const contentsMap = new Map<string, string>();

        // Load critical contents in parallel with concurrency limit
        const fetchPromises = criticalFiles.slice(0, 15).map(async (file) => {
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

        // Step 6: Parse database schemas
        const schemaFilesToParse = Array.from(contentsMap.entries())
          .filter(
            ([p]) =>
              p.includes('schema.prisma') ||
              p.endsWith('.sql') ||
              p.includes('drizzle') ||
              p.includes('migrations/')
          )
          .map(([path, content]) => ({ path, content }));
        const schema = parseDatabaseFiles(schemaFilesToParse);
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
        GitHubService.fetchBranches(ownerName, repoName)
          .then((bList) => {
            if (isMounted.current) {
              const enriched = bList.map((b) => ({
                ...b,
                isDefault: b.name === meta.defaultBranch,
              }));
              setBranches(enriched);
              StorageService.saveBranches(ownerName, repoName, enriched);
            }
          })
          .catch(() => {});

        // Save analysis to IndexedDB
        await StorageService.saveAnalysis(ownerName, repoName, analyzed);

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
