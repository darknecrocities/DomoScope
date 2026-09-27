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

    // Flutter / Dart pubspec.yaml
    if (filename === 'pubspec.yaml' || filename === 'pubspec.yml') {
      const lines = manifest.content.split('\n');
      let currentSection: 'none' | 'dependencies' | 'dev_dependencies' = 'none';

      for (const rawLine of lines) {
        // Strip comments
        const clean = rawLine.replace(/#.*$/, '').trimEnd();
        if (!clean.trim()) continue;

        // Check top-level sections (must have zero leading spaces)
        if (/^dependencies\s*:/i.test(clean)) {
          currentSection = 'dependencies';
          continue;
        } else if (/^dev_dependencies\s*:/i.test(clean)) {
          currentSection = 'dev_dependencies';
          continue;
        } else if (/^[a-zA-Z0-9_-]+\s*:/i.test(clean) && !clean.startsWith(' ') && !clean.startsWith('\t')) {
          currentSection = 'none';
          continue;
        }

        if (currentSection === 'dependencies' || currentSection === 'dev_dependencies') {
          // Lines with 2+ space indent representing a dependency entry
          const match = rawLine.match(/^(\s{2,}|\t+)([a-zA-Z0-9_]+)\s*:\s*(.*)/);
          if (match) {
            const name = match[2];
            // Skip sdk/path subkeys
            if (name === 'sdk' || name === 'path' || name === 'git' || name === 'url' || name === 'ref') continue;

            let version = match[3]?.trim();
            if (!version || version.startsWith('{') || version.startsWith('sdk:')) {
              version = version ? version.replace(/^sdk:\s*/, '') : '*';
            }
            version = version.replace(/^["']|["']$/g, '');
            if (!version) version = '*';

            // Avoid duplicate additions
            if (!dependencies.some((d) => d.name.toLowerCase() === name.toLowerCase() && d.manifestPath === manifest.path)) {
              dependencies.push({
                name,
                version,
                isDev: currentSection === 'dev_dependencies',
                ecosystem: 'pub',
                manifestPath: manifest.path,
                usedInFiles: findUsages(name, sourceFiles),
              });
            }
          }
        }
      }
    }

    // Python pyproject.toml
    if (filename === 'pyproject.toml') {
      const depRegex = /^([a-zA-Z0-9_-]+)\s*=\s*["']([^"']+)["']/gm;
      let match;
      while ((match = depRegex.exec(manifest.content)) !== null) {
        if (!dependencies.some((d) => d.name === match![1])) {
          dependencies.push({
            name: match[1],
            version: match[2],
            isDev: false,
            ecosystem: 'python',
            manifestPath: manifest.path,
            usedInFiles: findUsages(match[1], sourceFiles),
          });
        }
      }
    }

    // PHP composer.json
    if (filename === 'composer.json') {
      try {
        const composer = JSON.parse(manifest.content);
        if (composer.require) {
          for (const [name, version] of Object.entries(composer.require)) {
            if (name === 'php') continue;
            dependencies.push({
              name,
              version: String(version),
              isDev: false,
              ecosystem: 'packagist',
              manifestPath: manifest.path,
              usedInFiles: findUsages(name, sourceFiles),
            });
          }
        }
        if (composer['require-dev']) {
          for (const [name, version] of Object.entries(composer['require-dev'])) {
            dependencies.push({
              name,
              version: String(version),
              isDev: true,
              ecosystem: 'packagist',
              manifestPath: manifest.path,
              usedInFiles: findUsages(name, sourceFiles),
            });
          }
        }
      } catch {
        // ignore composer json parse error
      }
    }

    // Ruby Gemfile
    if (filename === 'Gemfile') {
      const gemRegex = /^\s*gem\s+['"]([^'"]+)['"](?:,\s*['"]([^'"]+)['"])?/gm;
      let match;
      while ((match = gemRegex.exec(manifest.content)) !== null) {
        dependencies.push({
          name: match[1],
          version: match[2] || '*',
          isDev: false,
          ecosystem: 'rubygems',
          manifestPath: manifest.path,
          usedInFiles: findUsages(match[1], sourceFiles),
        });
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
  // Match JS/TS 'pkg', Dart 'package:pkg/...', Python 'import pkg', etc.
  const importRegex = new RegExp(`(['"](?:package:)?${escapedName}(?:/[^'"]*)?['"]|\\bimport\\s+${escapedName}\\b|\\bfrom\\s+${escapedName}\\b)`, 'i');

  for (const file of sourceFiles) {
    if (file.content && importRegex.test(file.content)) {
      usages.push(file.path);
    }
  }

  return usages;
}
