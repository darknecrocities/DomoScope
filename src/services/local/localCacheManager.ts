import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { FileFingerprint } from './localScanner';
import {
  RepoMetadata,
  RepoFile,
  RepoAnalysis,
  DatabaseSchema,
  RepoDependency,
  ApiEndpoint,
  SecurityFinding,
} from '../../types';
import { GraphBuildResult } from '../graphBuilder';
import { FrameworkDetectionResult } from '../frameworkDetector';
import { CloudDetectionResult } from '../cloudServicesDetector';

export interface LocalReverseEngineerData {
  fullstack: string;
  agentSkill: string;
  uiUx?: string;
  frontend?: string;
  backend?: string;
  database?: string;
  overview: string;
}

export interface LocalAnalysisSnapshot {
  snapshotId: string;
  rootDir: string;
  projectName: string;
  analyzedAt: string;
  timestamp: number;
  durationMs: number;
  isIncremental: boolean;
  isCached?: boolean;
  metadata: RepoMetadata;
  files: RepoFile[];
  fileContents?: Map<string, string>;
  analysis: RepoAnalysis;
  graph: GraphBuildResult;
  database: DatabaseSchema;
  databaseSchema: DatabaseSchema;
  dependencies: RepoDependency[];
  apiRoutes: ApiEndpoint[];
  apiEndpoints: ApiEndpoint[];
  securityFindings: SecurityFinding[];
  frameworks: FrameworkDetectionResult;
  cloudServices: CloudDetectionResult;
  reverseEngineer: LocalReverseEngineerData;
  stats: {
    totalFiles: number;
    totalDirs: number;
    totalBytes: number;
    totalLines: number;
    scanDurationMs: number;
    parseDurationMs: number;
    cachedFilesCount: number;
    reanalyzedFilesCount: number;
  };
}

export interface LocalCachePayload {
  version: number;
  engineVersion?: string;
  snapshotId?: string;
  rootDir?: string;
  timestamp: string | number;
  fingerprints?: Record<string, { mtimeMs: number; sha256: string; size: number }>;
  snapshot?: LocalAnalysisSnapshot;
  files?: any[];
  git?: any;
}

const CACHE_VERSION = 1;
const ENGINE_VERSION = '1.0.0';

/**
 * Returns the preferred cache path for a project root (.domoscope/cache.json or ~/.domoscope/cache/<slug>.json)
 */
export function getCacheFilePath(rootDir: string): string {
  const localDir = path.join(path.resolve(rootDir), '.domoscope');
  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    return path.join(localDir, 'cache.json');
  } catch {
    // Fallback to home directory cache if project root is read-only
    const homeCache = path.join(os.homedir(), '.domoscope', 'cache');
    try {
      if (!fs.existsSync(homeCache)) {
        fs.mkdirSync(homeCache, { recursive: true });
      }
    } catch {
      // Ignore
    }
    const slug = path.basename(path.resolve(rootDir)).replace(/[^a-zA-Z0-9_-]/g, '_');
    const hash = crypto.createHash('sha256').update(path.resolve(rootDir)).digest('hex').substring(0, 8);
    return path.join(homeCache, `${slug}-${hash}.json`);
  }
}

export class LocalCacheManager {
  private rootDir: string;

  constructor(rootDir: string = process.cwd()) {
    this.rootDir = path.resolve(rootDir);
  }

  async load(targetRoot?: string): Promise<LocalCachePayload | null> {
    return LocalCacheManager.loadCache(targetRoot || this.rootDir);
  }

  async save(
    payload: {
      version?: number;
      timestamp?: number | string;
      files?: any[];
      git?: any;
      snapshot?: LocalAnalysisSnapshot;
      fingerprints?: any;
    },
    targetRoot?: string
  ): Promise<void> {
    const root = targetRoot || this.rootDir;
    const cacheFile = getCacheFilePath(root);
    const dir = path.dirname(cacheFile);

    try {
      if (!fs.existsSync(dir)) {
        await fsp.mkdir(dir, { recursive: true });
      }

      const fullPayload: LocalCachePayload = {
        version: payload.version ?? CACHE_VERSION,
        engineVersion: ENGINE_VERSION,
        snapshotId: payload.snapshot?.snapshotId || `snap_${Date.now()}`,
        rootDir: root,
        timestamp: payload.timestamp || new Date().toISOString(),
        files: payload.files,
        git: payload.git,
        fingerprints: payload.fingerprints || {},
        snapshot: payload.snapshot,
      };

      const tmpFile = `${cacheFile}.${Date.now()}.tmp`;
      const jsonStr = JSON.stringify(fullPayload, null, 2);

      await fsp.writeFile(tmpFile, jsonStr, 'utf8');
      await fsp.rename(tmpFile, cacheFile);
    } catch (err) {
      console.error(`[LocalCacheManager] Failed to save cache:`, err);
    }
  }

  async diffWithCurrentFiles(currentFiles: Array<{ path: string; hash?: string; mtime?: number }>): Promise<{
    isChanged: boolean;
    added: any[];
    modified: any[];
    deleted: string[];
    unchanged: any[];
  }> {
    const cached = await this.load();
    if (!cached || !cached.files) {
      return {
        isChanged: true,
        added: currentFiles,
        modified: [],
        deleted: [],
        unchanged: [],
      };
    }

    const cachedMap = new Map<string, any>();
    for (const f of cached.files) {
      cachedMap.set(f.path, f);
    }

    const currentMap = new Map<string, any>();
    for (const f of currentFiles) {
      currentMap.set(f.path, f);
    }

    const added: any[] = [];
    const modified: any[] = [];
    const unchanged: any[] = [];
    const deleted: string[] = [];

    for (const [p, curr] of currentMap.entries()) {
      if (!cachedMap.has(p)) {
        added.push(curr);
      } else {
        const prev = cachedMap.get(p);
        if (prev.hash !== curr.hash || prev.mtime !== curr.mtime) {
          modified.push(curr);
        } else {
          unchanged.push(curr);
        }
      }
    }

    for (const [p] of cachedMap.entries()) {
      if (!currentMap.has(p)) {
        deleted.push(p);
      }
    }

    const isChanged = added.length > 0 || modified.length > 0 || deleted.length > 0;
    return { isChanged, added, modified, deleted, unchanged };
  }

  /**
   * Loads the cached analysis payload from disk
   */
  static async loadCache(rootDir: string): Promise<LocalCachePayload | null> {
    const cacheFile = getCacheFilePath(rootDir);
    if (!fs.existsSync(cacheFile)) {
      return null;
    }

    try {
      const raw = await fsp.readFile(cacheFile, 'utf8');
      const data = JSON.parse(raw) as LocalCachePayload;

      // Validate version & schema integrity
      if (data.version !== CACHE_VERSION) {
        console.warn(`[LocalCacheManager] Invalid or outdated cache version at ${cacheFile}.`);
        return null;
      }

      return data;
    } catch (err) {
      console.warn(`[LocalCacheManager] Cache corruption detected at ${cacheFile}. Discarding.`, err);
      try {
        await fsp.unlink(cacheFile);
      } catch {
        // Ignore
      }
      return null;
    }
  }

  /**
   * Saves the analysis snapshot atomically to disk
   */
  static async saveCache(
    rootDir: string,
    snapshot: LocalAnalysisSnapshot,
    fingerprints: Map<string, FileFingerprint>
  ): Promise<void> {
    const cacheFile = getCacheFilePath(rootDir);
    const dir = path.dirname(cacheFile);

    try {
      if (!fs.existsSync(dir)) {
        await fsp.mkdir(dir, { recursive: true });
      }

      const fpRecord: Record<string, { mtimeMs: number; sha256: string; size: number }> = {};
      for (const [key, val] of fingerprints.entries()) {
        fpRecord[key] = {
          mtimeMs: val.mtimeMs,
          sha256: val.sha256,
          size: val.size,
        };
      }

      const payload: LocalCachePayload = {
        version: CACHE_VERSION,
        engineVersion: ENGINE_VERSION,
        snapshotId: snapshot.snapshotId,
        rootDir: path.resolve(rootDir),
        timestamp: new Date().toISOString(),
        fingerprints: fpRecord,
        snapshot,
        files: snapshot.files,
      };

      const tmpFile = `${cacheFile}.${Date.now()}.tmp`;
      const jsonStr = JSON.stringify(payload, null, 2);

      await fsp.writeFile(tmpFile, jsonStr, 'utf8');
      await fsp.rename(tmpFile, cacheFile);
    } catch (err) {
      console.error(`[LocalCacheManager] Failed to persist cache to ${cacheFile}:`, err);
    }
  }

  /**
   * Clears the cache for a given project directory
   */
  static async clearCache(rootDir: string): Promise<boolean> {
    const cacheFile = getCacheFilePath(rootDir);
    try {
      if (fs.existsSync(cacheFile)) {
        await fsp.unlink(cacheFile);
        return true;
      }
    } catch {
      // Ignore
    }
    return false;
  }

  /**
   * Compares cached file fingerprints with current fingerprints to find differences
   */
  static diffFingerprints(
    cached: Record<string, { mtimeMs: number; sha256: string; size: number }>,
    current: Map<string, FileFingerprint>
  ): {
    added: string[];
    modified: string[];
    deleted: string[];
    unchanged: string[];
  } {
    const added: string[] = [];
    const modified: string[] = [];
    const deleted: string[] = [];
    const unchanged: string[] = [];

    const cachedKeys = new Set(Object.keys(cached));

    for (const [relPath, currFp] of current.entries()) {
      if (!cachedKeys.has(relPath)) {
        added.push(relPath);
      } else {
        const c = cached[relPath];
        if (c.mtimeMs !== currFp.mtimeMs || c.sha256 !== currFp.sha256 || c.size !== currFp.size) {
          modified.push(relPath);
        } else {
          unchanged.push(relPath);
        }
      }
    }

    for (const cachedKey of cachedKeys) {
      if (!current.has(cachedKey)) {
        deleted.push(cachedKey);
      }
    }

    return { added, modified, deleted, unchanged };
  }
}
