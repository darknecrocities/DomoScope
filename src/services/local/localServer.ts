import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runLocalAnalysis } from './localAnalysisEngine';
import { LocalAnalysisSnapshot } from './localCacheManager';
import { LocalWatcher } from './localWatcher';
import { isPathWithinRoot } from './localScanner';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface LocalServerOptions {
  rootDir: string;
  port?: number;
  host?: string;
  watch?: boolean;
  distDir?: string;
  enableMcp?: boolean;
}

export interface RunningLocalServer {
  server: http.Server;
  port: number;
  url: string;
  rootDir: string;
  watcher: LocalWatcher | null;
  close: () => Promise<void>;
}

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

function sendJson(res: http.ServerResponse, data: any, statusCode = 200) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(data));
}

export async function startLocalServer(options: LocalServerOptions): Promise<RunningLocalServer> {
  const rootDir = path.resolve(options.rootDir);
  const initialPort = options.port || 4004;
  const host = options.host || process.env.HOST || '0.0.0.0';
  const distDir = options.distDir || path.resolve(__dirname, '../../../dist');

  // Initialize analysis and watcher
  let currentSnapshot: LocalAnalysisSnapshot = await runLocalAnalysis(rootDir);
  let watcher: LocalWatcher | null = null;
  const sseClients = new Set<http.ServerResponse>();

  if (options.watch !== false) {
    watcher = new LocalWatcher(rootDir);
    watcher.on('snapshot', (newSnapshot) => {
      currentSnapshot = newSnapshot;
      // Broadcast to SSE clients
      const message = `event: snapshot\ndata: ${JSON.stringify({ snapshotId: newSnapshot.snapshotId, analyzedAt: newSnapshot.analyzedAt })}\n\n`;
      for (const client of sseClients) {
        try {
          client.write(message);
        } catch {
          sseClients.delete(client);
        }
      }
    });
    // Start watcher asynchronously
    watcher.start().catch((err) => console.warn('[LocalServer] Watcher error:', err));
  }

  const server = http.createServer(async (req, res) => {
    // Enable CORS for all local requests
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      });
      res.end();
      return;
    }

    const reqUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = reqUrl.pathname;

    // 1. GET /api/local/status
    if (req.method === 'GET' && pathname === '/api/local/status') {
      return sendJson(res, {
        status: 'ok',
        rootDir,
        projectName: currentSnapshot.projectName,
        snapshotId: currentSnapshot.snapshotId,
        analyzedAt: currentSnapshot.analyzedAt,
        totalFiles: currentSnapshot.stats.totalFiles,
        totalLines: currentSnapshot.stats.totalLines,
        isIncremental: currentSnapshot.isIncremental,
      });
    }

    // 2. GET /api/local/analysis
    if (req.method === 'GET' && pathname === '/api/local/analysis') {
      return sendJson(res, currentSnapshot);
    }

    // 3. GET /api/local/file?path=src/index.ts
    if (req.method === 'GET' && pathname === '/api/local/file') {
      const targetRel = reqUrl.searchParams.get('path');
      if (!targetRel) {
        return sendJson(res, { error: 'Missing required "path" query parameter' }, 400);
      }

      const fullPath = path.resolve(rootDir, targetRel);
      const isSafe = await isPathWithinRoot(fullPath, rootDir);
      if (!isSafe) {
        return sendJson(res, { error: 'Access denied: path traversal outside project root is prohibited' }, 403);
      }

      try {
        if (!fs.existsSync(fullPath)) {
          return sendJson(res, { error: 'File not found' }, 404);
        }
        const stat = await fsp.stat(fullPath);
        if (stat.isDirectory()) {
          return sendJson(res, { error: 'Path is a directory' }, 400);
        }
        if (stat.size > 2 * 1024 * 1024) {
          return sendJson(res, { error: 'File exceeds 2MB limit' }, 413);
        }
        const content = await fsp.readFile(fullPath, 'utf8');
        return sendJson(res, {
          path: targetRel,
          content,
          size: stat.size,
          extension: path.extname(targetRel).slice(1),
        });
      } catch (err: any) {
        return sendJson(res, { error: `Failed to read file: ${err.message}` }, 500);
      }
    }

    // 4. GET /api/local/events (SSE)
    if (req.method === 'GET' && pathname === '/api/local/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });
      res.write(`event: connected\ndata: ${JSON.stringify({ snapshotId: currentSnapshot.snapshotId })}\n\n`);
      sseClients.add(res);

      req.on('close', () => {
        sseClients.delete(res);
      });
      return;
    }

    // 5. POST /api/local/analyze (Trigger fresh analysis)
    if (req.method === 'POST' && pathname === '/api/local/analyze') {
      try {
        currentSnapshot = await runLocalAnalysis(rootDir, { noCache: true });
        return sendJson(res, { success: true, snapshot: currentSnapshot });
      } catch (err: any) {
        return sendJson(res, { error: `Analysis failed: ${err.message}` }, 500);
      }
    }

    // 6. Serve static UI assets from dist/ or standalone dashboard fallback
    let filePath = path.join(distDir, pathname === '/' ? 'index.html' : pathname);

    // If dist file doesn't exist, try index.html for SPA routing
    if (!fs.existsSync(filePath) && fs.existsSync(path.join(distDir, 'index.html'))) {
      filePath = path.join(distDir, 'index.html');
    }

    if (fs.existsSync(filePath)) {
      try {
        const stat = await fsp.stat(filePath);
        if (stat.isFile()) {
          const ext = path.extname(filePath).toLowerCase();
          const contentType = MIME_TYPES[ext] || 'application/octet-stream';
          const content = await fsp.readFile(filePath);
          res.writeHead(200, {
            'Content-Type': contentType,
            'Content-Length': content.length,
          });
          res.end(content);
          return;
        }
      } catch {
        // Fall through to 404
      }
    }

    // Default 404
    sendJson(res, { error: `Endpoint not found: ${pathname}` }, 404);
  });

  // Find available port starting from initialPort
  const port = await new Promise<number>((resolve, reject) => {
    let testPort = initialPort;
    const maxPort = initialPort + 50;

    function tryListen() {
      server.listen(testPort, host);
    }

    server.once('listening', () => {
      resolve(testPort);
    });

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        testPort++;
        if (testPort <= maxPort) {
          tryListen();
        } else {
          reject(new Error(`Unable to bind server: all ports between ${initialPort} and ${maxPort} are in use.`));
        }
      } else {
        reject(err);
      }
    });

    tryListen();
  });

  const url = `http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`;

  return {
    server,
    port,
    url,
    rootDir,
    watcher,
    close: async () => {
      if (watcher) {
        watcher.stop();
      }
      for (const client of sseClients) {
        try {
          client.end();
        } catch {
          // Ignore
        }
      }
      sseClients.clear();
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    },
  };
}
