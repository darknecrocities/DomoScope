import { RepoFile } from '../types';

export interface TechItem {
  name: string;
  category: 'framework' | 'database' | 'ui' | 'tooling' | 'ai' | 'cloud_api';
  version?: string;
  sourceFile: string;
  description: string;
}

export interface TechStackReport {
  projectName: string;
  primaryLanguage: string;
  items: TechItem[];
  totalDependencies: number;
}

const TECH_CATALOG: Record<string, { category: TechItem['category']; description: string }> = {
  // AI & Local LLM
  '@mlc-ai/web-llm': { category: 'ai', description: 'In-browser local LLM engine using WebGPU acceleration' },
  'openai': { category: 'ai', description: 'OpenAI API client library for GPT-4o & reasoning models' },
  '@anthropic-ai/sdk': { category: 'ai', description: 'Anthropic Claude API client for Sonnet & Opus models' },
  '@google/genai': { category: 'ai', description: 'Google Gemini API client library' },
  '@google/generative-ai': { category: 'ai', description: 'Google Generative AI SDK' },

  // Frameworks & Core
  'react': { category: 'framework', description: 'Declarative UI library for building interactive component trees' },
  'react-dom': { category: 'framework', description: 'React DOM rendering engine' },
  'next': { category: 'framework', description: 'Full-stack React framework with SSR and API routes' },
  'vue': { category: 'framework', description: 'Progressive JavaScript web application framework' },
  'svelte': { category: 'framework', description: 'Cybernetically enhanced web application framework' },
  'express': { category: 'framework', description: 'Fast, unopinionated web framework for Node.js' },
  'fastapi': { category: 'framework', description: 'Modern, fast Python web framework for building APIs' },
  'flask': { category: 'framework', description: 'Lightweight WSGI Python web application framework' },

  // UI & Styling
  'tailwindcss': { category: 'ui', description: 'Utility-first CSS framework for rapid UI development' },
  'framer-motion': { category: 'ui', description: 'Production-ready motion engine and animation library for React' },
  'lucide-react': { category: 'ui', description: 'Clean & consistent icon library for React' },
  '@xyflow/react': { category: 'ui', description: 'Customizable node-based interactive graph and diagram engine' },
  'reactflow': { category: 'ui', description: 'Node-based interactive workflow diagram library' },
  '@monaco-editor/react': { category: 'ui', description: 'VS Code Monaco code editor component for React' },
  'postcss': { category: 'ui', description: 'Tool for transforming CSS with JavaScript plugins' },
  'autoprefixer': { category: 'ui', description: 'PostCSS plugin to parse CSS and add vendor prefixes' },

  // State & Routing
  'react-router-dom': { category: 'framework', description: 'Declarative routing library for React applications' },
  'react-router': { category: 'framework', description: 'Standard routing library for React apps' },
  'zustand': { category: 'framework', description: 'Small, fast, scalable state management solution' },
  '@tanstack/react-query': { category: 'framework', description: 'Powerful asynchronous state management & data fetching' },

  // Database & Storage
  'idb': { category: 'database', description: 'IndexedDB wrapper for local browser key-value & document caching' },
  'prisma': { category: 'database', description: 'Next-generation ORM for Node.js & TypeScript' },
  '@prisma/client': { category: 'database', description: 'Auto-generated type-safe database client' },
  'drizzle-orm': { category: 'database', description: 'TypeScript ORM with SQL-like query builder' },
  'pg': { category: 'database', description: 'PostgreSQL client for Node.js' },
  'mongoose': { category: 'database', description: 'MongoDB object modeling tool' },

  // Tooling & Build
  'vite': { category: 'tooling', description: 'Next-generation frontend build tool and hot dev server' },
  'typescript': { category: 'tooling', description: 'Strongly typed programming language built on JavaScript' },
  'oxlint': { category: 'tooling', description: 'High-performance Rust-based JavaScript/TypeScript linter' },
  'vitest': { category: 'tooling', description: 'Blazing fast Vite-native unit test runner' },
  'dagre': { category: 'tooling', description: 'Directed graph layout engine for visual node placement' },
  '@types/dagre': { category: 'tooling', description: 'TypeScript type definitions for Dagre graph engine' },
};

export const TechStackInspector = {
  inspectRepository(files: RepoFile[], fileContents: Map<string, string>): TechStackReport {
    const items: TechItem[] = [];
    let totalDependencies = 0;

    // 1. Inspect package.json
    const packageJsonContent = fileContents.get('package.json');
    if (packageJsonContent) {
      try {
        const parsed = JSON.parse(packageJsonContent);
        const deps = { ...parsed.dependencies, ...parsed.devDependencies };
        totalDependencies = Object.keys(deps).length;

        for (const [depName, versionStr] of Object.entries(deps)) {
          const info = TECH_CATALOG[depName];
          const cleanVersion = (versionStr as string).replace(/^[\^~>=]/, '');

          if (info) {
            items.push({
              name: depName,
              category: info.category,
              version: cleanVersion,
              sourceFile: 'package.json',
              description: info.description,
            });
          } else {
            // General categorized package
            let category: TechItem['category'] = 'tooling';
            if (depName.includes('ui') || depName.includes('icon') || depName.includes('css')) category = 'ui';
            if (depName.includes('db') || depName.includes('sql') || depName.includes('store')) category = 'database';
            if (depName.includes('ai') || depName.includes('llm') || depName.includes('gpt')) category = 'ai';

            items.push({
              name: depName,
              category,
              version: cleanVersion,
              sourceFile: 'package.json',
              description: `Third-party dependency (${depName})`,
            });
          }
        }
      } catch (err) {
        console.warn('Failed to parse package.json for tech stack inspection:', err);
      }
    }

    // 2. Fallback / supplementary inspection for Python (pyproject.toml / requirements.txt)
    const pyproject = fileContents.get('pyproject.toml') || fileContents.get('requirements.txt');
    if (pyproject) {
      const lines = pyproject.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const match = trimmed.match(/^([a-zA-Z0-9_\-]+)(?:==|>=|~=)?(.*)$/);
          if (match) {
            const pkgName = match[1].toLowerCase();
            const ver = match[2] || 'latest';
            totalDependencies++;
            items.push({
              name: pkgName,
              category: pkgName.includes('torch') || pkgName.includes('transformers') || pkgName.includes('langchain') ? 'ai' : 'framework',
              version: ver,
              sourceFile: fileContents.has('pyproject.toml') ? 'pyproject.toml' : 'requirements.txt',
              description: `Python dependency (${pkgName})`,
            });
          }
        }
      }
    }

    // Sort items by priority: AI > Framework > Database > UI > Tooling > Cloud API
    const categoryOrder: Record<TechItem['category'], number> = {
      ai: 1,
      framework: 2,
      database: 3,
      ui: 4,
      cloud_api: 5,
      tooling: 6,
    };

    items.sort((a, b) => categoryOrder[a.category] - categoryOrder[b.category]);

    return {
      projectName: files[0]?.path.split('/')[0] || 'Repository',
      primaryLanguage: files.some((f) => f.path.endsWith('.ts') || f.path.endsWith('.tsx')) ? 'TypeScript' : 'JavaScript',
      items,
      totalDependencies: Math.max(items.length, totalDependencies),
    };
  },
};
