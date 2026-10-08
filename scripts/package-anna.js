import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const bundleDir = path.join(rootDir, 'bundle');

console.log('[package-anna] Packaging DomoScope distribution into bundle/...');

if (!fs.existsSync(distDir)) {
  console.error('[package-anna] Error: dist/ directory does not exist. Run vite build first.');
  process.exit(1);
}

// Clean and recreate bundle/
if (fs.existsSync(bundleDir)) {
  fs.rmSync(bundleDir, { recursive: true, force: true });
}
fs.cpSync(distDir, bundleDir, { recursive: true });

// Scan all files in bundle/ to assert strict Anna packaging bounds
const oversizedFiles = [];
let totalBytes = 0;
let fileCount = 0;

function scan(currentDir) {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      scan(fullPath);
    } else {
      fileCount++;
      const stats = fs.statSync(fullPath);
      totalBytes += stats.size;
      const relPath = path.relative(rootDir, fullPath);
      if (stats.size >= 10 * 1024 * 1024) {
        oversizedFiles.push({ path: relPath, sizeMb: (stats.size / (1024 * 1024)).toFixed(2) });
      }
    }
  }
}

scan(bundleDir);

const totalMb = (totalBytes / (1024 * 1024)).toFixed(2);
console.log(`[package-anna] Bundle Summary: ${fileCount} files, Total size: ${totalMb} MB`);

if (oversizedFiles.length > 0) {
  console.error('[package-anna] ❌ ERROR: Bundle contains files exceeding Anna 10MB limit:');
  for (const f of oversizedFiles) {
    console.error(`  - ${f.path} (${f.sizeMb} MB)`);
  }
  process.exit(1);
}

if (totalBytes >= 50 * 1024 * 1024) {
  console.error(`[package-anna] ❌ ERROR: Total bundle size (${totalMb} MB) exceeds Anna 50MB limit.`);
  process.exit(1);
}

console.log('✅ Prepared bundle/ directory for anna-app push. All files <10MB, total <50MB.');
