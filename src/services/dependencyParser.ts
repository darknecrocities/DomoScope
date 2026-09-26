import { RepoDependency } from '../types';

export function parseDependencies(
  manifests: { path: string; content: string }[],
  sourceFiles: { path: string; content?: string }[]
): RepoDependency[] {
  const dependencies: RepoDependency[] = [];

  for (const manifest of manifests) {
    const filename = manifest.path.split('/').pop() || '';

    // Node.js package.json
    if (filename === 'package.json') {
      try {
        const pkg = JSON.parse(manifest.content);
        if (pkg.dependencies) {
          for (const [name, version] of Object.entries(pkg.dependencies)) {
            dependencies.push({
              name,
              version: String(version),
              isDev: false,
              ecosystem: 'npm',
              manifestPath: manifest.path,
              usedInFiles: findUsages(name, sourceFiles),
            });
          }
        }
        if (pkg.devDependencies) {
          for (const [name, version] of Object.entries(pkg.devDependencies)) {
            dependencies.push({
              name,
              version: String(version),
              isDev: true,
              ecosystem: 'npm',
              manifestPath: manifest.path,
              usedInFiles: findUsages(name, sourceFiles),
            });
          }
        }
      } catch (e) {
        console.warn('Failed to parse package.json:', e);
      }
    }

    // Python requirements.txt
    if (filename === 'requirements.txt') {
      const lines = manifest.content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const match = trimmed.match(/^([a-zA-Z0-9_.-]+)(?:[=><~]=?([a-zA-Z0-9_.-]+))?/);
        if (match) {
          const name = match[1];
          const version = match[2] || '*';
          dependencies.push({
            name,
            version,
            isDev: false,
            ecosystem: 'python',
            manifestPath: manifest.path,
            usedInFiles: findUsages(name, sourceFiles),
          });
        }
      }
    }

    // Go go.mod
    if (filename === 'go.mod') {
      const requireRegex = /^\s*([a-zA-Z0-9_./-]+)\s+v([0-9a-zA-Z_.-]+)/gm;
      let match;
      while ((match = requireRegex.exec(manifest.content)) !== null) {
        dependencies.push({
          name: match[1],
          version: `v${match[2]}`,
          isDev: false,
          ecosystem: 'go',
          manifestPath: manifest.path,
          usedInFiles: findUsages(match[1], sourceFiles),
        });
      }
    }

    // Rust Cargo.toml
    if (filename === 'Cargo.toml') {
      const depRegex = /^([a-zA-Z0-9_-]+)\s*=\s*["']([^"']+)["']/gm;
      let match;
      while ((match = depRegex.exec(manifest.content)) !== null) {
        dependencies.push({
          name: match[1],
          version: match[2],
          isDev: false,
          ecosystem: 'rust',
          manifestPath: manifest.path,
          usedInFiles: findUsages(match[1], sourceFiles),
        });
      }
    }
  }

  return dependencies;
}

function findUsages(packageName: string, sourceFiles: { path: string; content?: string }[]): string[] {
  const usages: string[] = [];
  const escapedName = packageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const importRegex = new RegExp(`['"]${escapedName}(?:/[^'"]*)?['"]`, 'i');

  for (const file of sourceFiles) {
    if (file.content && importRegex.test(file.content)) {
      usages.push(file.path);
    }
  }

  return usages;
}
