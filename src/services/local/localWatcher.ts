import fs from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { runLocalAnalysis } from './localAnalysisEngine';
import { LocalAnalysisSnapshot } from './localCacheManager';
import { DEFAULT_IGNORED_DIRS } from './localScanner';

export interface LocalWatcherEvents {
  change: (filePath: string, eventType: string) => void;
  analyzing: () => void;
  snapshot: (snapshot: LocalAnalysisSnapshot) => void;
  error: (err: Error) => void;
}

export class LocalWatcher extends EventEmitter {
  private rootDir: string;
  private isWatching = false;
  private debounceTimer: NodeJS.Timeout | null = null;
  private debounceMs = 300;
  private watchers: fs.FSWatcher[] = [];
  private currentSnapshot: LocalAnalysisSnapshot | null = null;
  private isAnalyzing = false;
  private pendingReanalysis = false;

  constructor(rootDir: string, debounceMs = 300) {
    super();
    this.rootDir = path.resolve(rootDir);
    this.debounceMs = debounceMs;
  }

  public getSnapshot(): LocalAnalysisSnapshot | null {
    return this.currentSnapshot;
  }

  public async start(): Promise<LocalAnalysisSnapshot> {
    if (this.isWatching) {
      if (this.currentSnapshot) return this.currentSnapshot;
    }

    this.isWatching = true;

    // Run initial baseline analysis
    this.emit('analyzing');
    try {
      this.currentSnapshot = await runLocalAnalysis(this.rootDir);
      this.emit('snapshot', this.currentSnapshot);
    } catch (err: any) {
      this.emit('error', err);
      throw err;
    }

    // Start native recursive watcher
    try {
      const watcher = fs.watch(
        this.rootDir,
        { recursive: true },
        (eventType, filename) => {
          if (!filename) return;

          // Normalize path separators
          const normFile = filename.replace(/\\/g, '/');

          // Check if file is in ignored directories
          const firstSegment = normFile.split('/')[0];
          if (DEFAULT_IGNORED_DIRS.has(firstSegment) || normFile.startsWith('.')) {
            return;
          }

          this.handleFileChange(normFile, eventType);
        }
      );

      this.watchers.push(watcher);
    } catch (err: any) {
      // If recursive watch is unsupported on current OS, fallback to directory watching
      console.warn(`[LocalWatcher] Native recursive watch fallback:`, err.message);
    }

    return this.currentSnapshot;
  }

  private handleFileChange(relPath: string, eventType: string) {
    this.emit('change', relPath, eventType);

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.triggerAnalysis();
    }, this.debounceMs);
  }

  private async triggerAnalysis() {
    if (this.isAnalyzing) {
      this.pendingReanalysis = true;
      return;
    }

    this.isAnalyzing = true;
    this.emit('analyzing');

    try {
      this.currentSnapshot = await runLocalAnalysis(this.rootDir);
      this.emit('snapshot', this.currentSnapshot);
    } catch (err: any) {
      this.emit('error', err);
    } finally {
      this.isAnalyzing = false;
      if (this.pendingReanalysis) {
        this.pendingReanalysis = false;
        this.triggerAnalysis();
      }
    }
  }

  public stop() {
    this.isWatching = false;
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    for (const watcher of this.watchers) {
      try {
        watcher.close();
      } catch {
        // Ignore
      }
    }
    this.watchers = [];
    this.removeAllListeners();
  }
}
