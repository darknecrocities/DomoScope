import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { scanLocalDirectory, LocalScanOptions, LocalScanResult } from './localScanner';
import { LocalCacheManager, LocalAnalysisSnapshot } from './localCacheManager';
import { analyzeRepository } from '../analysis';
import { buildArchitectureGraph } from '../graphBuilder';
import { parseDatabaseFiles } from '../databaseParser';
import { parseApiEndpoints } from '../apiRouteCatalog';
import { runSecurityChecks } from '../securityScanner';
import { parseDependencies } from '../dependencyParser';
import { detectFrameworks } from '../frameworkDetector';
import { detectCloudServices } from '../cloudServicesDetector';
import { generateReverseEngineerSpec } from '../reverseEngineerGenerator';
import { RepoMetadata } from '../../types';

export interface LocalAnalysisOptions extends LocalScanOptions {
  noCache?: boolean;
  verbose?: boolean;
}

/**
 * Reads the local Git branch name from .git/HEAD if available
 */
export function getLocalGitBranch(rootDir: string): { branch: string; commitSha?: string } {
  try {
    const headPath = path.join(rootDir, '.git', 'HEAD');
    if (fs.existsSync(headPath)) {
      const headContent = fs.readFileSync(headPath, 'utf8').trim();
      if (headContent.startsWith('ref: refs/heads/')) {
        const branch = headContent.replace('ref: refs/heads/', '');
        const refPath = path.join(rootDir, '.git', 'refs', 'heads', branch);
        let commitSha: string | undefined;
        if (fs.existsSync(refPath)) {
          commitSha = fs.readFileSync(refPath, 'utf8').trim().substring(0, 7);
        }
        return { branch, commitSha };
      }
      return { branch: 'main', commitSha: headContent.substring(0, 7) };
    }
  } catch {
    // Ignore if not a git repository
  }
  return { branch: 'local' };
}

/**
 * Executes a full or incremental static analysis on a local project directory.
 */
export async function runLocalAnalysis(
  rootDirOrOptions: string | LocalAnalysisOptions,
  maybeOptions?: LocalAnalysisOptions
): Promise<LocalAnalysisSnapshot> {
  const overallStartTime = Date.now();
  const rootDir = typeof rootDirOrOptions === 'string' ? rootDirOrOptions : rootDirOrOptions.rootDir || '.';
  const options = typeof rootDirOrOptions === 'string' ? (maybeOptions || { rootDir }) : rootDirOrOptions;
  const resolvedRoot = path.resolve(rootDir);

  // 1. Check existing cache if cache is enabled
  const cachedPayload = !options.noCache ? await LocalCacheManager.loadCache(resolvedRoot) : null;

  // 2. Perform fast local file scan
  const scanResult: LocalScanResult = await scanLocalDirectory(resolvedRoot, options);
  const projectName = scanResult.projectName;

  // 3. Diff fingerprints if cache is present
  if (cachedPayload && cachedPayload.fingerprints && cachedPayload.snapshot) {
    const diff = LocalCacheManager.diffFingerprints(cachedPayload.fingerprints, scanResult.fingerprints);
    const hasChanges = diff.added.length > 0 || diff.modified.length > 0 || diff.deleted.length > 0;

    // If completely unchanged, return cached snapshot with updated timing record
    if (!hasChanges) {
      if (options.verbose) {
        console.log(`[DomoScope Analysis] Cache HIT for ${projectName}. 0 files changed.`);
      }
      const cached = { ...cachedPayload.snapshot };
      cached.isCached = true;
      cached.timestamp = Date.now();
      cached.fileContents = scanResult.fileContents;
      cached.databaseSchema = cached.database;
      cached.apiEndpoints = cached.apiRoutes;
      cached.stats.scanDurationMs = scanResult.stats.scanDurationMs;
      cached.durationMs = Date.now() - overallStartTime;
      return cached;
    }

    if (options.verbose) {
      console.log(
        `[DomoScope Analysis] Incremental change detected: +${diff.added.length} ~${diff.modified.length} -${diff.deleted.length}`
      );
    }
  }

  const parseStartTime = Date.now();

  // 4. Construct RepoMetadata
  const { branch: gitBranch, commitSha } = getLocalGitBranch(resolvedRoot);
  const metadata: RepoMetadata = {
    owner: 'local',
    repo: projectName,
    fullName: `local/${projectName}`,
    description: `Local repository at ${resolvedRoot}${commitSha ? ` (${commitSha})` : ''}`,
    defaultBranch: gitBranch,
    stars: 0,
    forks: 0,
    watchers: 0,
    openIssues: 0,
    language: 'Polyglot',
    license: null,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    size: Math.round(scanResult.stats.totalBytes / 1024),
    isPrivate: true,
    htmlUrl: `file://${resolvedRoot}`,
  };

  // 5. Run Unified Analysis Engines
  const analysis = analyzeRepository(metadata, scanResult.files);
  const graph = buildArchitectureGraph(scanResult.files, scanResult.fileContents);

  const allFilesWithContent = scanResult.files.map((f) => ({
    path: f.path,
    content: scanResult.fileContents.get(f.path) || '',
  }));

  // Database parsing (extract all files with content)
  const dbFilesForParsing = allFilesWithContent.filter((f) => Boolean(f.content));
  const database = parseDatabaseFiles(dbFilesForParsing);

  // API endpoints
  const apiRoutes = parseApiEndpoints(allFilesWithContent);

  // Security scanner (with secrets auto-redacted in results)
  const rawSecurityFindings = runSecurityChecks(allFilesWithContent);
  const securityFindings = rawSecurityFindings.map((finding) => {
    // Ensure hardcoded secrets are never leaked in cleartext in reports or UI
    if (finding.category.toLowerCase().includes('secret') || finding.category.toLowerCase().includes('key')) {
      return {
        ...finding,
        evidence: finding.evidence ? finding.evidence.replace(/(=|:|\s+)["']?([a-zA-Z0-9_-]{8,})["']?/g, '$1"***REDACTED***"') : '',
      };
    }
    return finding;
  });

  // Dependencies
  const manifestFilesForParsing = allFilesWithContent
    .filter((f) =>
      ['package.json', 'pubspec.yaml', 'requirements.txt', 'cargo.toml', 'go.mod', 'pom.xml', 'gemfile'].includes(
        f.path.split('/').pop()?.toLowerCase() || ''
      ) && Boolean(f.content)
    )
    .map((f) => ({ path: f.path, content: f.content || '' }));
  const dependencies = parseDependencies(manifestFilesForParsing);

  // Frameworks & Cloud services detection
  const frameworks = detectFrameworks(scanResult.files, scanResult.fileContents);
  const cloudServices = detectCloudServices(scanResult.files, scanResult.fileContents);

  // Reverse engineering blueprints
  const fullstackBlueprint = generateReverseEngineerSpec(
    'fullstack',
    projectName,
    analysis,
    scanResult.files,
    scanResult.fileContents,
    database,
    dependencies
  );
  const agentSkillPack = generateReverseEngineerSpec(
    'agent_skill',
    projectName,
    analysis,
    scanResult.files,
    scanResult.fileContents,
    database,
    dependencies
  );

  const reverseEngineer = {
    fullstack: fullstackBlueprint,
    agentSkill: agentSkillPack,
    overview: fullstackBlueprint,
  };

  const parseDurationMs = Date.now() - parseStartTime;
  const totalDurationMs = Date.now() - overallStartTime;

  // 6. Assemble complete Snapshot
  const snapshotId = `snap_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const snapshot: LocalAnalysisSnapshot = {
    snapshotId,
    rootDir: resolvedRoot,
    projectName,
    analyzedAt: new Date().toISOString(),
    timestamp: Date.now(),
    durationMs: totalDurationMs,
    isIncremental: Boolean(cachedPayload),
    isCached: false,
    metadata,
    files: scanResult.files,
    fileContents: scanResult.fileContents,
    analysis,
    graph,
    database,
    databaseSchema: database,
    dependencies,
    apiRoutes,
    apiEndpoints: apiRoutes,
    securityFindings,
    frameworks,
    cloudServices,
    reverseEngineer,
    stats: {
      totalFiles: scanResult.stats.totalFiles,
      totalDirs: scanResult.stats.totalDirs,
      totalBytes: scanResult.stats.totalBytes,
      totalLines: scanResult.stats.totalLines,
      scanDurationMs: scanResult.stats.scanDurationMs,
      parseDurationMs,
      cachedFilesCount: cachedPayload && cachedPayload.snapshot ? cachedPayload.snapshot.files.length : 0,
      reanalyzedFilesCount: scanResult.files.length,
    },
  };

  // 7. Persist cache
  await LocalCacheManager.saveCache(resolvedRoot, snapshot, scanResult.fingerprints);

  return snapshot;
}

export const analyzeLocalRepository = runLocalAnalysis;
