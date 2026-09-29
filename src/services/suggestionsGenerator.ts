import {
  RepoAnalysis,
  RepoFile,
  DatabaseSchema,
  SecurityFinding,
  RepoDependency,
  ApiEndpoint,
} from '../types';

export type ChecklistStatus = 'completed' | 'needs_setup';
export type ChecklistCategory =
  | 'essential'
  | 'security'
  | 'quality'
  | 'tooling'
  | 'architecture';

export interface CodeSnippet {
  language: string;
  filename?: string;
  code: string;
}

export interface SetupChecklistItem {
  id: string;
  title: string;
  status: ChecklistStatus;
  category: ChecklistCategory;
  summary: string;
  explanation: string;
  actionText?: string;
  actionFile?: string;
  targetFiles?: string[];
  codeSnippet?: CodeSnippet;
  agentPrompt?: string;
  tags: string[];
}

export interface ChecklistStats {
  total: number;
  completedCount: number;
  needsSetupCount: number;
  completionPercentage: number;
  byCategory: Record<ChecklistCategory, { total: number; completed: number; needsSetup: number }>;
}

export interface SetupChecklistResult {
  items: SetupChecklistItem[];
  stats: ChecklistStats;
}

/**
 * Deterministic engine that evaluates standard, crucial repository setup items:
 * .gitignore, README.md, .env.example, LICENSE, Lockfiles, Node versioning, CI workflows,
 * automated testing, linter/formatters, TypeScript, pre-commit hooks, SECURITY.md,
 * CONTRIBUTING.md, PR templates, .editorconfig, ErrorBoundary, services, database, and modularity.
 */
export function generateSetupChecklist(params: {
  analysis: RepoAnalysis;
  files: RepoFile[];
  fileContents?: Map<string, string>;
  databaseSchema?: DatabaseSchema | null;
  securityFindings?: SecurityFinding[];
  dependencies?: RepoDependency[];
  apiRoutes?: ApiEndpoint[];
}): SetupChecklistResult {
  const {
    analysis,
    files,
    fileContents = new Map(),
    databaseSchema = null,
    securityFindings = [],
    dependencies = [],
  } = params;

  const items: SetupChecklistItem[] = [];
  const repoName = analysis.metadata?.fullName || 'Project';

  const getFileContent = (path: string): string => {
    return fileContents.get(path) || files.find((f) => f.path === path)?.content || '';
  };

  const sourceFiles = files.filter(
    (f) => f.type === 'blob' && !/\.(png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot|lock|map)$/i.test(f.path)
  );

  // =========================================================================
  // 1. .gitignore Setup
  // =========================================================================
  const gitignoreFile = files.find((f) => /^\.gitignore$/i.test(f.name) || f.path === '.gitignore');
  if (gitignoreFile) {
    const content = getFileContent(gitignoreFile.path);
    const hasNodeModules = /node_modules/i.test(content);
    const hasEnv = /\.env/i.test(content);

    items.push({
      id: 'setup-gitignore',
      title: 'Git Ignore Configuration (.gitignore)',
      status: 'completed',
      category: 'essential',
      summary: `.gitignore file is present and configured${hasNodeModules && hasEnv ? ' for dependencies and environment secrets' : ''}.`,
      explanation: 'A committed .gitignore prevents build artifacts, secret keys, temporary cache files, and dependency folders from being committed to Git version control.',
      actionText: 'Open .gitignore',
      actionFile: gitignoreFile.path,
      targetFiles: ['.gitignore'],
      tags: ['git', 'security', 'hygiene'],
    });
  } else {
    items.push({
      id: 'setup-gitignore',
      title: 'Git Ignore Configuration (.gitignore)',
      status: 'needs_setup',
      category: 'essential',
      summary: 'No .gitignore file detected at the repository root. Build artifacts and secrets risk accidental commit.',
      explanation: 'A .gitignore file is crucial to prevent node_modules, .env secrets, logs, build directories (dist/, build/), and OS metadata (.DS_Store) from polluting the repository history.',
      targetFiles: ['.gitignore'],
      actionText: 'Setup .gitignore',
      tags: ['git', 'security', 'hygiene'],
      agentPrompt: `Create a standard, comprehensive \`.gitignore\` file at the root of \`${repoName}\` ignoring node_modules, build artifacts (dist, build, out), local environment files (.env, .env.local), logs, and OS files (.DS_Store).`,
      codeSnippet: {
        language: 'gitignore',
        filename: '.gitignore',
        code: `# Dependencies
node_modules/
.pnp
.pnp.js

# Environment Variables & Secrets
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
*.pem

# Build & Output Directories
dist/
build/
out/
.next/
.nuxt/
.cache/

# Debug Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Editor & OS Metadata
.DS_Store
.idea/
.vscode/*
!.vscode/extensions.json
*.suo
*.ntvs*
*.njsproj
*.sln`,
      },
    });
  }

  // =========================================================================
  // 2. Root Documentation (README.md)
  // =========================================================================
  const readmeFile = files.find((f) => /^readme\.md$/i.test(f.name));
  if (readmeFile) {
    items.push({
      id: 'setup-readme',
      title: 'Root Documentation (README.md)',
      status: 'completed',
      category: 'essential',
      summary: 'README.md is available at the repository root, providing onboarding and project context.',
      explanation: 'Project documentation clarifies setup instructions, prerequisite tools, environment requirements, and contribution workflows for developers.',
      actionText: 'Open README',
      actionFile: readmeFile.path,
      targetFiles: [readmeFile.path],
      tags: ['docs', 'onboarding'],
    });
  } else {
    items.push({
      id: 'setup-readme',
      title: 'Root Documentation (README.md)',
      status: 'needs_setup',
      category: 'essential',
      summary: 'No README.md documentation found at the root of the repository.',
      explanation: 'A README.md is the primary entry point for any developer cloning the project. It should outline project mission, quickstart instructions, environment setup, and architecture highlights.',
      targetFiles: ['README.md'],
      actionText: 'Create README.md',
      tags: ['docs', 'onboarding'],
      agentPrompt: `Create a clear, structured \`README.md\` for \`${repoName}\` with Overview, Tech Stack, Prerequisites, Installation Guide, Run & Build Commands, and Project Architecture.`,
      codeSnippet: {
        language: 'markdown',
        filename: 'README.md',
        code: `# ${analysis.metadata?.repo || 'Project Name'}

${analysis.metadata?.description || 'A modern software application.'}

## Prerequisites
- Node.js >= 18.0.0
- npm, pnpm, or yarn

## Getting Started

1. Clone the repository:
\`\`\`bash
git clone ${analysis.metadata?.htmlUrl || 'https://github.com/owner/repo.git'}
cd ${analysis.metadata?.repo || 'repo'}
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Configure environment variables:
\`\`\`bash
cp .env.example .env
\`\`\`

4. Start the development server:
\`\`\`bash
npm run dev
\`\`\`

## Architecture & Structure
- \`src/\` - Core application source code
- \`tests/\` - Automated test suites`,
      },
    });
  }

  // =========================================================================
  // 3. Package Lockfile (Deterministic Installs)
  // =========================================================================
  const lockfile = files.find((f) =>
    /^(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb|Cargo\.lock|Pipfile\.lock|poetry\.lock|uv\.lock|go\.sum)$/i.test(f.name)
  );

  if (lockfile) {
    items.push({
      id: 'setup-lockfile',
      title: 'Deterministic Dependency Lockfile',
      status: 'completed',
      category: 'essential',
      summary: `Committed lockfile detected (${lockfile.name}), ensuring reproducible dependency trees.`,
      explanation: 'Lockfiles pin transitive dependency versions across local development and CI environments, preventing unexpected breaking changes.',
      actionText: 'Open Lockfile',
      actionFile: lockfile.path,
      targetFiles: [lockfile.path],
      tags: ['dependencies', 'npm', 'reproducibility'],
    });
  } else {
    items.push({
      id: 'setup-lockfile',
      title: 'Deterministic Dependency Lockfile',
      status: 'needs_setup',
      category: 'essential',
      summary: 'No package-lock.json, pnpm-lock.yaml, or yarn.lock file found committed.',
      explanation: 'Without a committed lockfile, installs can pull differing minor/patch dependency versions across environments, resulting in non-reproducible builds.',
      targetFiles: ['package-lock.json'],
      actionText: 'Generate Lockfile',
      tags: ['dependencies', 'npm', 'reproducibility'],
      agentPrompt: `Generate and commit a deterministic lockfile in \`${repoName}\` using \`npm i --package-lock-only\` or \`pnpm install\`.`,
    });
  }

  // =========================================================================
  // 4. Runtime & Node Version Pinning (.nvmrc / .node-version)
  // =========================================================================
  const nodeVersionFile = files.find((f) => /^\.(nvmrc|node-version)$/i.test(f.name));
  const pkgJsonContent = getFileContent('package.json');
  const hasEngines = /"engines"\s*:\s*\{[^}]*"node"/i.test(pkgJsonContent);

  if (nodeVersionFile || hasEngines) {
    items.push({
      id: 'setup-node-version',
      title: 'Runtime & Node.js Version Pinning',
      status: 'completed',
      category: 'essential',
      summary: `Node runtime version is explicitly pinned${nodeVersionFile ? ` via ${nodeVersionFile.name}` : ' via package.json engines'}.`,
      explanation: 'Pinning the exact Node.js version prevents runtime discrepancies and unsupported API errors between team members and CI pipelines.',
      actionText: nodeVersionFile ? 'Open Version File' : 'Open package.json',
      actionFile: nodeVersionFile ? nodeVersionFile.path : 'package.json',
      targetFiles: nodeVersionFile ? [nodeVersionFile.path] : ['package.json'],
      tags: ['node', 'dx', 'runtime'],
    });
  } else {
    items.push({
      id: 'setup-node-version',
      title: 'Runtime & Node.js Version Pinning (.nvmrc)',
      status: 'needs_setup',
      category: 'essential',
      summary: 'No .nvmrc, .node-version, or package.json "engines" field declared.',
      explanation: 'Declaring a target Node.js version guarantees developers and CI environments execute the exact supported JavaScript runtime version.',
      targetFiles: ['.nvmrc'],
      actionText: 'Add .nvmrc',
      tags: ['node', 'dx', 'runtime'],
      agentPrompt: `Create an \`.nvmrc\` file containing \`20.18.0\` (or LTS) at the root of \`${repoName}\` to pin the runtime version.`,
      codeSnippet: {
        language: 'text',
        filename: '.nvmrc',
        code: `20.18.0`,
      },
    });
  }

  // =========================================================================
  // 5. Open-Source License (LICENSE)
  // =========================================================================
  const licenseFile = files.find((f) => /^license(\.md|\.txt)?$/i.test(f.name));
  const hasLicense = Boolean(analysis.metadata?.license || licenseFile);

  if (hasLicense) {
    items.push({
      id: 'setup-license',
      title: 'Open-Source License (LICENSE)',
      status: 'completed',
      category: 'essential',
      summary: `Explicitly licensed under ${analysis.metadata?.license || 'SPDX Open-Source License'}.`,
      explanation: 'An explicit open-source license establishes clear legal terms for distribution, modification, and commercial or personal usage.',
      actionText: licenseFile ? 'Open LICENSE' : undefined,
      actionFile: licenseFile ? licenseFile.path : undefined,
      targetFiles: licenseFile ? [licenseFile.path] : [],
      tags: ['legal', 'license'],
    });
  } else {
    items.push({
      id: 'setup-license',
      title: 'Open-Source License (LICENSE)',
      status: 'needs_setup',
      category: 'essential',
      summary: 'No standard open-source license file (e.g., MIT, Apache-2.0) is specified.',
      explanation: 'Without a LICENSE file, the repository defaults to exclusive copyright, preventing others from legally using, modifying, or contributing to the software.',
      targetFiles: ['LICENSE'],
      actionText: 'Add LICENSE',
      tags: ['legal', 'license'],
      agentPrompt: `Add an MIT License \`LICENSE\` file to \`${repoName}\` specifying the current year and copyright holder.`,
      codeSnippet: {
        language: 'text',
        filename: 'LICENSE',
        code: `MIT License

Copyright (c) ${new Date().getFullYear()} ${analysis.metadata?.owner || 'Author'}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.`,
      },
    });
  }

  // =========================================================================
  // 6. Environment Template (.env.example)
  // =========================================================================
  const envExampleFile = files.find((f) => /^\.env(\.example|\.template|\.sample)$/i.test(f.name));
  const usesEnv = sourceFiles.some((f) => /process\.env|import\.meta\.env/i.test(getFileContent(f.path))) || files.some((f) => /^\.env/i.test(f.name));

  if (envExampleFile) {
    items.push({
      id: 'setup-env-example',
      title: 'Environment Template (.env.example)',
      status: 'completed',
      category: 'security',
      summary: 'A committed .env.example template is present with sample variable keys.',
      explanation: 'Committing an environment template documents all required environment configuration variables without exposing secret values.',
      actionText: 'Open .env.example',
      actionFile: envExampleFile.path,
      targetFiles: [envExampleFile.path],
      tags: ['config', 'security', 'dx'],
    });
  } else if (usesEnv) {
    items.push({
      id: 'setup-env-example',
      title: 'Environment Template (.env.example)',
      status: 'needs_setup',
      category: 'security',
      summary: 'The repository references environment variables but lacks a committed .env.example template.',
      explanation: 'Providing a committed .env.example template with dummy values prevents runtime configuration errors when other developers or CI runners spin up the project.',
      targetFiles: ['.env.example'],
      actionText: 'Create .env.example',
      tags: ['config', 'security', 'dx'],
      agentPrompt: `Scan \`${repoName}\` for all \`process.env\` and \`import.meta.env\` references and create a clean \`.env.example\` file containing all required keys with descriptive placeholder values.`,
      codeSnippet: {
        language: 'bash',
        filename: '.env.example',
        code: `# Application Configuration
NODE_ENV=development
PORT=3000

# Backend / Database URI
DATABASE_URL="postgresql://user:password@localhost:5432/db?schema=public"

# Authentication & API Keys (Placeholders only - never commit real keys)
AUTH_SECRET="your-32-character-secret-key-here"
VITE_API_URL="http://localhost:3000"`,
      },
    });
  } else {
    items.push({
      id: 'setup-env-example',
      title: 'Environment Template (.env.example)',
      status: 'completed',
      category: 'security',
      summary: 'No external runtime environment variables required or template is standard.',
      explanation: 'Stateless or self-contained repositories without runtime environment variables do not require a dedicated .env.example file.',
      tags: ['config', 'dx'],
    });
  }

  // =========================================================================
  // 7. Security Policy & Vulnerability Reporting (SECURITY.md)
  // =========================================================================
  const securityDoc = files.find((f) => /^security\.md$/i.test(f.name) || /^\.github\/security\.md$/i.test(f.path));
  if (securityDoc) {
    items.push({
      id: 'setup-security-policy',
      title: 'Security Policy & Vulnerability Disclosure (SECURITY.md)',
      status: 'completed',
      category: 'security',
      summary: 'SECURITY.md policy file is present, outlining responsible vulnerability reporting.',
      explanation: 'A security policy provides security researchers with a secure, private disclosure process to report vulnerabilities before public release.',
      actionText: 'Open SECURITY.md',
      actionFile: securityDoc.path,
      targetFiles: [securityDoc.path],
      tags: ['security', 'compliance', 'cwe'],
    });
  } else {
    items.push({
      id: 'setup-security-policy',
      title: 'Security Policy & Vulnerability Disclosure (SECURITY.md)',
      status: 'needs_setup',
      category: 'security',
      summary: 'No SECURITY.md policy found to guide private vulnerability reporting.',
      explanation: 'Publishing a SECURITY.md defines supported release versions and an encrypted/private email endpoint for reporting security flaws.',
      targetFiles: ['SECURITY.md'],
      actionText: 'Add SECURITY.md',
      tags: ['security', 'compliance', 'cwe'],
      agentPrompt: `Create a standard \`SECURITY.md\` in \`${repoName}\` detailing supported versions and private vulnerability reporting instructions.`,
      codeSnippet: {
        language: 'markdown',
        filename: 'SECURITY.md',
        code: `# Security Policy

## Supported Versions
| Version | Supported          |
| ------- | ------------------ |
| latest  | :white_check_mark: |

## Reporting a Vulnerability
If you discover a security vulnerability within this project, please send an email to security@example.com instead of opening a public issue. All vulnerability reports will receive a prompt response.`,
      },
    });
  }

  // =========================================================================
  // 8. Security & Secrets Hygiene (AST Scan)
  // =========================================================================
  const highSecIssues = securityFindings.filter((f) => f.severity === 'critical' || f.severity === 'high');

  if (highSecIssues.length === 0) {
    items.push({
      id: 'setup-security-scan',
      title: 'Security & Secrets Hygiene (AST Scan)',
      status: 'completed',
      category: 'security',
      summary: 'Zero plaintext credentials, hardcoded API secrets, or unsafe injection patterns found.',
      explanation: 'Source files do not contain committed secret keys, adhering to OWASP and SAIF defensive coding standards.',
      targetFiles: [],
      tags: ['security', 'hygiene', 'owasp'],
    });
  } else {
    const topIssue = highSecIssues[0];
    items.push({
      id: 'setup-security-scan',
      title: 'Security & Secrets Hygiene (AST Scan)',
      status: 'needs_setup',
      category: 'security',
      summary: `${highSecIssues.length} high/critical security finding(s) detected in source code.`,
      explanation: `Issue in ${topIssue.file}:${topIssue.line} (${topIssue.title}). Secrets should be stored in environment variables, never in source files.`,
      actionText: 'Inspect Finding',
      actionFile: topIssue.file,
      targetFiles: highSecIssues.map((f) => f.file),
      tags: ['security', 'hygiene', 'owasp'],
      agentPrompt: `Remediate hardcoded secret in \`${topIssue.file}:${topIssue.line}\` in \`${repoName}\`. Replace with \`process.env\` lookup and add placeholder to \`.env.example\`.`,
    });
  }

  // =========================================================================
  // 9. Automated Test Suite (Vitest / Jest / Pytest)
  // =========================================================================
  const testFilesCount = analysis.categoriesCount?.test || 0;
  if (testFilesCount > 0) {
    items.push({
      id: 'setup-testing',
      title: 'Automated Test Suite (Unit & Integration)',
      status: 'completed',
      category: 'quality',
      summary: `Automated test suites detected (${testFilesCount} test file(s) across the repository).`,
      explanation: 'Automated test suites verify component contracts and logic invariants, ensuring regression-free modifications and refactoring.',
      actionText: 'View Test Files',
      actionFile: sourceFiles.find((f) => f.category === 'test')?.path,
      targetFiles: sourceFiles.filter((f) => f.category === 'test').map((f) => f.path).slice(0, 3),
      tags: ['testing', 'quality', 'vitest'],
    });
  } else {
    items.push({
      id: 'setup-testing',
      title: 'Automated Test Suite (Unit & Integration)',
      status: 'needs_setup',
      category: 'quality',
      summary: 'No automated test files (.test.ts, .spec.ts, or tests/ directory) detected.',
      explanation: 'Without automated unit testing, regressions can easily go undetected until reaching production. Setting up Vitest or Jest enables fast, localized verification.',
      targetFiles: ['vitest.config.ts', 'tests/'],
      actionText: 'Setup Vitest',
      tags: ['testing', 'quality', 'vitest'],
      agentPrompt: `Configure Vitest in \`${repoName}\`:
1. Add \`vitest\` to \`devDependencies\` in \`package.json\`.
2. Create \`vitest.config.ts\`.
3. Create a starter unit test in \`tests/example.test.ts\` verifying core functionality.
4. Add \`"test": "vitest run"\` script to package.json.`,
      codeSnippet: {
        language: 'typescript',
        filename: 'vitest.config.ts',
        code: `import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node', // or 'jsdom' for React components
    include: ['tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
  },
});`,
      },
    });
  }

  // =========================================================================
  // 10. Continuous Integration (CI/CD Pipeline)
  // =========================================================================
  const ciFiles = files.filter((f) => /^\.github\/workflows\/|\.gitlab-ci\.yml|\.circleci\//i.test(f.path));
  if (ciFiles.length > 0) {
    items.push({
      id: 'setup-ci',
      title: 'Continuous Integration Pipeline (CI/CD)',
      status: 'completed',
      category: 'quality',
      summary: `Automated CI workflow detected (${ciFiles.map((f) => f.name).join(', ')}).`,
      explanation: 'Continuous Integration automatically validates builds, tests, and code quality on pull requests before merging to main.',
      actionText: 'Open CI Config',
      actionFile: ciFiles[0].path,
      targetFiles: ciFiles.map((f) => f.path),
      tags: ['ci-cd', 'github-actions', 'automation'],
    });
  } else {
    items.push({
      id: 'setup-ci',
      title: 'Continuous Integration Pipeline (CI/CD)',
      status: 'needs_setup',
      category: 'quality',
      summary: 'No automated CI/CD pipeline (.github/workflows) detected.',
      explanation: 'A CI pipeline automatically runs typechecks, linters, and unit tests on every pull request, preventing broken builds from landing on main.',
      targetFiles: ['.github/workflows/ci.yml'],
      actionText: 'Setup GitHub Actions',
      tags: ['ci-cd', 'github-actions', 'automation'],
      agentPrompt: `Create a GitHub Actions CI workflow in \`.github/workflows/ci.yml\` for \`${repoName}\` that runs on push and pull_request to main. It should checkout code, setup Node 20, install dependencies, run build, and run tests.`,
      codeSnippet: {
        language: 'yaml',
        filename: '.github/workflows/ci.yml',
        code: `name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  validate:
    name: Build & Test Validation
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Typecheck & Build
        run: npm run build

      - name: Run automated test suite
        run: npm test`,
      },
    });
  }

  // =========================================================================
  // 11. Automated Dependency Updates (Dependabot / Renovate)
  // =========================================================================
  const dependabotFile = files.find((f) =>
    /^\.github\/dependabot\.ya?ml$/i.test(f.path) || /^renovate\.json$/i.test(f.name)
  );

  if (dependabotFile) {
    items.push({
      id: 'setup-dependabot',
      title: 'Automated Dependency Updates (Dependabot / Renovate)',
      status: 'completed',
      category: 'quality',
      summary: `Automated dependency update bot configured (${dependabotFile.name}).`,
      explanation: 'Automated dependency update tools detect security advisories (CVEs) and submit pull requests to update vulnerable packages.',
      actionText: 'Open Config',
      actionFile: dependabotFile.path,
      targetFiles: [dependabotFile.path],
      tags: ['dependencies', 'security', 'automation'],
    });
  } else {
    items.push({
      id: 'setup-dependabot',
      title: 'Automated Dependency Updates (Dependabot)',
      status: 'needs_setup',
      category: 'quality',
      summary: 'No Dependabot or Renovate configuration found to automate security patches.',
      explanation: 'Configuring Dependabot automatically monitors your package manifest for outdated dependencies and opens automated fix PRs.',
      targetFiles: ['.github/dependabot.yml'],
      actionText: 'Add Dependabot',
      tags: ['dependencies', 'security', 'automation'],
      agentPrompt: `Create a \`.github/dependabot.yml\` configuration in \`${repoName}\` to check npm and github-actions daily.`,
      codeSnippet: {
        language: 'yaml',
        filename: '.github/dependabot.yml',
        code: `version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"`,
      },
    });
  }

  // =========================================================================
  // 12. Code Formatting & Linting Standards (ESLint / Prettier / Biome)
  // =========================================================================
  const linterFile = files.find((f) =>
    /^(eslint\.config\.|^\.eslintrc|\.prettierrc|biome\.json)/i.test(f.name)
  );
  const hasLinterDep = dependencies.some((d) => /eslint|prettier|biome/i.test(d.name));

  if (linterFile || hasLinterDep) {
    items.push({
      id: 'setup-linting',
      title: 'Code Formatting & Linter Standards',
      status: 'completed',
      category: 'tooling',
      summary: `Configured via ${linterFile ? linterFile.name : 'installed linter dependencies'}.`,
      explanation: 'Linters and formatters enforce uniform code styling, detect common syntax antipatterns, and prevent styling debates in code reviews.',
      actionText: linterFile ? 'Open Linter Config' : undefined,
      actionFile: linterFile ? linterFile.path : undefined,
      targetFiles: linterFile ? [linterFile.path] : [],
      tags: ['tooling', 'eslint', 'formatting'],
    });
  } else {
    items.push({
      id: 'setup-linting',
      title: 'Code Formatting & Linter Standards',
      status: 'needs_setup',
      category: 'tooling',
      summary: 'No ESLint, Prettier, or Biome configuration file detected.',
      explanation: 'Configuring an automated linter catches unhandled promises, missing imports, and unused variables before runtime execution.',
      targetFiles: ['eslint.config.js', '.prettierrc'],
      actionText: 'Setup ESLint',
      tags: ['tooling', 'eslint', 'formatting'],
      agentPrompt: `Set up ESLint and Prettier in \`${repoName}\` with recommended TypeScript and React rules.`,
      codeSnippet: {
        language: 'javascript',
        filename: 'eslint.config.js',
        code: `import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
);`,
      },
    });
  }

  // =========================================================================
  // 13. Editor Standardization (.editorconfig)
  // =========================================================================
  const editorconfigFile = files.find((f) => /^\.editorconfig$/i.test(f.name));
  if (editorconfigFile) {
    items.push({
      id: 'setup-editorconfig',
      title: 'Cross-Editor Indentation Standards (.editorconfig)',
      status: 'completed',
      category: 'tooling',
      summary: '.editorconfig is committed, enforcing uniform indentation and line endings across all IDEs.',
      explanation: 'An .editorconfig file ensures consistent spaces, charset, and newline behavior across VS Code, WebStorm, Neovim, and Sublime Text.',
      actionText: 'Open .editorconfig',
      actionFile: editorconfigFile.path,
      targetFiles: [editorconfigFile.path],
      tags: ['tooling', 'editor', 'dx'],
    });
  } else {
    items.push({
      id: 'setup-editorconfig',
      title: 'Cross-Editor Indentation Standards (.editorconfig)',
      status: 'needs_setup',
      category: 'tooling',
      summary: 'No .editorconfig found to standardize tab sizes and line endings across code editors.',
      explanation: 'Without an .editorconfig file, developers on Windows and macOS can produce mixed CRLF/LF line endings and inconsistent 2 vs 4-space indentations.',
      targetFiles: ['.editorconfig'],
      actionText: 'Add .editorconfig',
      tags: ['tooling', 'editor', 'dx'],
      agentPrompt: `Create an \`.editorconfig\` at the root of \`${repoName}\` enforcing UTF-8, 2 spaces indentation, and LF line endings.`,
      codeSnippet: {
        language: 'ini',
        filename: '.editorconfig',
        code: `root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.md]
trim_trailing_whitespace = false`,
      },
    });
  }

  // =========================================================================
  // 14. Git Pre-Commit Hooks (Husky / Lint-Staged)
  // =========================================================================
  const hasHusky = files.some((f) => /^\.husky\//i.test(f.path));
  const hasLintStaged = files.some((f) => /lint-staged|\.lintstagedrc/i.test(f.name)) || /"lint-staged"/i.test(pkgJsonContent);

  if (hasHusky || hasLintStaged) {
    items.push({
      id: 'setup-git-hooks',
      title: 'Git Pre-Commit Automation (Husky / Lint-Staged)',
      status: 'completed',
      category: 'tooling',
      summary: 'Pre-commit hooks are configured to automate linting and formatting before commits.',
      explanation: 'Pre-commit hooks catch syntax errors, formatting defects, and broken typechecks locally before commits reach the remote origin.',
      targetFiles: hasHusky ? ['.husky/pre-commit'] : ['package.json'],
      tags: ['git', 'tooling', 'husky'],
    });
  } else {
    items.push({
      id: 'setup-git-hooks',
      title: 'Git Pre-Commit Automation (Husky / Lint-Staged)',
      status: 'needs_setup',
      category: 'tooling',
      summary: 'No Git pre-commit hooks configured to validate staged files prior to commit.',
      explanation: 'Configuring Husky and lint-staged runs linters and formatters only on staged files, guaranteeing bad code is never committed.',
      targetFiles: ['.husky/pre-commit', '.lintstagedrc.json'],
      actionText: 'Configure Husky',
      tags: ['git', 'tooling', 'husky'],
      agentPrompt: `Configure Husky and lint-staged in \`${repoName}\` to run ESLint and Prettier on staged files during \`git commit\`.`,
      codeSnippet: {
        language: 'json',
        filename: '.lintstagedrc.json',
        code: `{
  "*.{ts,tsx,js,jsx}": ["eslint --fix", "prettier --write"],
  "*.{json,md,css}": ["prettier --write"]
}`,
      },
    });
  }

  // =========================================================================
  // 15. Contributor Guide & PR Templates (CONTRIBUTING.md)
  // =========================================================================
  const contributingDoc = files.find((f) => /^contributing\.md$/i.test(f.name) || /^\.github\/contributing\.md$/i.test(f.path));
  const prTemplate = files.find((f) => /pull_request_template\.md$/i.test(f.name) || /^\.github\/pull_request_template\.md$/i.test(f.path));

  if (contributingDoc || prTemplate) {
    items.push({
      id: 'setup-contributing',
      title: 'Contribution Guidelines & PR Templates',
      status: 'completed',
      category: 'tooling',
      summary: `Contribution workflow documented via ${contributingDoc ? contributingDoc.name : prTemplate?.name}.`,
      explanation: 'Clear contribution guidelines standardize branch naming, commit messages, PR descriptions, and testing checklists.',
      actionText: 'Open Guide',
      actionFile: contributingDoc ? contributingDoc.path : prTemplate?.path,
      targetFiles: [contributingDoc?.path || prTemplate?.path || 'CONTRIBUTING.md'],
      tags: ['dx', 'docs', 'collaboration'],
    });
  } else {
    items.push({
      id: 'setup-contributing',
      title: 'Contribution Guidelines (CONTRIBUTING.md)',
      status: 'needs_setup',
      category: 'tooling',
      summary: 'No CONTRIBUTING.md or Pull Request template found to guide new developers.',
      explanation: 'A CONTRIBUTING.md document outlines branching models, PR review standards, and local testing instructions for contributors.',
      targetFiles: ['CONTRIBUTING.md'],
      actionText: 'Add CONTRIBUTING.md',
      tags: ['dx', 'docs', 'collaboration'],
      agentPrompt: `Create a concise \`CONTRIBUTING.md\` in \`${repoName}\` outlining branch naming, pull request guidelines, and local test commands.`,
      codeSnippet: {
        language: 'markdown',
        filename: 'CONTRIBUTING.md',
        code: `# Contributing to ${analysis.metadata?.repo || 'Project'}

Thank you for contributing!

## Development Workflow
1. Fork and create a branch from \`main\`:
   \`\`\`bash
   git checkout -b feat/your-feature-name
   \`\`\`
2. Ensure all tests pass:
   \`\`\`bash
   npm test
   npm run build
   \`\`\`
3. Open a Pull Request with a clear description of your changes.`,
      },
    });
  }

  // =========================================================================
  // 16. TypeScript & Static Typing (tsconfig.json)
  // =========================================================================
  const tsconfigFile = files.find((f) => /^tsconfig(\..+)?\.json$/i.test(f.name));
  const hasTsFiles = sourceFiles.some((f) => /\.(ts|tsx)$/i.test(f.path));

  if (tsconfigFile || hasTsFiles) {
    items.push({
      id: 'setup-typescript',
      title: 'TypeScript & Type Safety (tsconfig.json)',
      status: 'completed',
      category: 'architecture',
      summary: 'Static type checking is active across the codebase.',
      explanation: 'Strict typing prevents null reference crashes, provides IDE autocomplete, and validates component props at compile time.',
      actionText: tsconfigFile ? 'Open tsconfig.json' : undefined,
      actionFile: tsconfigFile ? tsconfigFile.path : undefined,
      targetFiles: tsconfigFile ? [tsconfigFile.path] : [],
      tags: ['typescript', 'typing', 'tooling'],
    });
  } else {
    items.push({
      id: 'setup-typescript',
      title: 'TypeScript & Type Safety (tsconfig.json)',
      status: 'needs_setup',
      category: 'architecture',
      summary: 'No TypeScript configuration detected. Code is untyped JavaScript.',
      explanation: 'Adopting TypeScript adds compile-time type safety, refactoring safety, and self-documenting interface definitions.',
      targetFiles: ['tsconfig.json'],
      actionText: 'Setup TypeScript',
      tags: ['typescript', 'typing', 'tooling'],
      agentPrompt: `Initialize TypeScript in \`${repoName}\` by creating \`tsconfig.json\` with strict type checking.`,
      codeSnippet: {
        language: 'json',
        filename: 'tsconfig.json',
        code: `{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}`,
      },
    });
  }

  // =========================================================================
  // 17. Application Bootstrap & Entry Point
  // =========================================================================
  if (analysis.entryPoints && analysis.entryPoints.length > 0) {
    items.push({
      id: 'setup-entrypoint',
      title: 'Application Bootstrap & Entry Point',
      status: 'completed',
      category: 'architecture',
      summary: `Standard initialization entry point detected at ${analysis.entryPoints[0]}.`,
      explanation: 'A designated entry point bootstraps global providers, error boundaries, routing engines, and dependency injections.',
      actionText: 'Open Entry Point',
      actionFile: analysis.entryPoints[0],
      targetFiles: [analysis.entryPoints[0]],
      tags: ['architecture', 'bootstrap'],
    });
  } else {
    items.push({
      id: 'setup-entrypoint',
      title: 'Application Bootstrap & Entry Point',
      status: 'needs_setup',
      category: 'architecture',
      summary: 'No standard application entry point (e.g. main.tsx, index.ts, server.ts) detected.',
      explanation: 'Establishing a clear bootstrap file provides a single starting point for build tools, test runners, and developers.',
      targetFiles: ['src/main.tsx', 'src/index.ts'],
      actionText: 'Create Entry Point',
      tags: ['architecture', 'bootstrap'],
      agentPrompt: `Create a standard bootstrap entry point in \`src/main.tsx\` or \`src/index.ts\` for \`${repoName}\`.`,
    });
  }

  // =========================================================================
  // 18. Client-Side Error Boundary & Crash Isolation
  // =========================================================================
  const hasErrorBoundary = sourceFiles.some((f) => /ErrorBoundary|componentDidCatch/i.test(getFileContent(f.path)));
  const isFrontendProject = sourceFiles.some((f) => /\.(tsx|jsx|vue|svelte)$/i.test(f.path));

  if (hasErrorBoundary) {
    items.push({
      id: 'setup-error-boundary',
      title: 'UI Error Boundary & Crash Isolation',
      status: 'completed',
      category: 'architecture',
      summary: 'React Error Boundary is configured to catch and isolate unhandled render exceptions.',
      explanation: 'Error Boundaries prevent rendering crashes in one component from blanking the entire browser viewport.',
      targetFiles: sourceFiles.filter((f) => /ErrorBoundary/i.test(f.path)).map((f) => f.path),
      tags: ['react', 'resilience', 'architecture'],
    });
  } else if (isFrontendProject) {
    items.push({
      id: 'setup-error-boundary',
      title: 'UI Error Boundary & Crash Isolation',
      status: 'needs_setup',
      category: 'architecture',
      summary: 'No React ErrorBoundary detected to catch unexpected rendering exceptions.',
      explanation: 'An unhandled render error in any React component will unmount the entire component tree unless caught by an ErrorBoundary.',
      targetFiles: ['src/components/common/ErrorBoundary.tsx'],
      actionText: 'Add ErrorBoundary',
      tags: ['react', 'resilience', 'architecture'],
      agentPrompt: `Create a reusable \`ErrorBoundary.tsx\` in \`src/components/common/\` for \`${repoName}\` that catches React rendering errors and displays a fallback error card with a retry button.`,
      codeSnippet: {
        language: 'typescript',
        filename: 'src/components/common/ErrorBoundary.tsx',
        code: `import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI Render Error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-6 bg-zinc-50 border border-zinc-200 rounded-xl text-center space-y-2">
          <p className="text-sm font-bold text-zinc-950">Component Encountered an Error</p>
          <p className="text-xs text-zinc-600">{this.state.error?.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}`,
      },
    });
  }

  // =========================================================================
  // 19. Database Schema & Integrity (if schema present)
  // =========================================================================
  if (databaseSchema && databaseSchema.tables && databaseSchema.tables.length > 0) {
    const missingPks = databaseSchema.tables.filter((t) => !t.columns.some((c) => c.isPrimary));
    if (missingPks.length === 0) {
      items.push({
        id: 'setup-database',
        title: 'Database Schema & Entity Integrity',
        status: 'completed',
        category: 'architecture',
        summary: `All ${databaseSchema.tables.length} database model(s) define valid Primary Keys.`,
        explanation: 'Primary keys guarantee deterministic record lookups and referential integrity across the database layer.',
        actionText: 'Open Schema File',
        actionFile: databaseSchema.sourceFiles[0],
        targetFiles: databaseSchema.sourceFiles,
        tags: ['database', 'schema'],
      });
    } else {
      items.push({
        id: 'setup-database',
        title: 'Database Schema & Entity Integrity',
        status: 'needs_setup',
        category: 'architecture',
        summary: `${missingPks.length} database model(s) missing Primary Key definitions: ${missingPks.map((t) => t.name).join(', ')}.`,
        explanation: 'Every relational model requires a unique identifier (Primary Key) to prevent orphan rows and support indexing.',
        actionText: 'Open Schema File',
        actionFile: missingPks[0].sourceFile,
        targetFiles: missingPks.map((t) => t.sourceFile).filter(Boolean),
        tags: ['database', 'schema'],
      });
    }
  }

  // =========================================================================
  // 20. Modular File Sizing (No giant monolithic files >350 LOC)
  // =========================================================================
  const largeFiles: string[] = [];
  for (const file of sourceFiles) {
    const content = getFileContent(file.path);
    const lines = content ? content.split('\n').length : file.size ? Math.round(file.size / 38) : 0;
    if (lines > 350 && !file.path.includes('node_modules') && !file.path.includes('dist') && !file.path.endsWith('.json')) {
      largeFiles.push(file.path);
    }
  }

  if (largeFiles.length === 0) {
    items.push({
      id: 'setup-modularity',
      title: 'Modular Component & File Sizing',
      status: 'completed',
      category: 'architecture',
      summary: 'All source files maintain focused responsibility (< 350 lines of code).',
      explanation: 'Maintaining compact, modular files prevents high cognitive load and reduces merge conflicts in collaborative workflows.',
      targetFiles: sourceFiles.slice(0, 3).map((f) => f.path),
      tags: ['architecture', 'clean-code'],
    });
  } else {
    items.push({
      id: 'setup-modularity',
      title: 'Modular Component & File Sizing',
      status: 'needs_setup',
      category: 'architecture',
      summary: `${largeFiles.length} source file(s) exceed 350 lines of code. Decompose into focused subcomponents or hooks.`,
      explanation: 'Large monolithic files bundle multiple responsibilities together, making unit testing and maintenance difficult.',
      actionText: 'View Top Hotspot',
      actionFile: largeFiles[0],
      targetFiles: largeFiles.slice(0, 4),
      tags: ['architecture', 'clean-code', 'refactoring'],
      agentPrompt: `Refactor the large monolithic file \`${largeFiles[0]}\` in \`${repoName}\` into smaller, reusable subcomponents and custom hooks.`,
    });
  }

  // =========================================================================
  // STATS
  // =========================================================================
  const completedCount = items.filter((i) => i.status === 'completed').length;
  const needsSetupCount = items.filter((i) => i.status === 'needs_setup').length;
  const completionPercentage = Math.round((completedCount / items.length) * 100);

  const byCategory: Record<ChecklistCategory, { total: number; completed: number; needsSetup: number }> = {
    essential: { total: 0, completed: 0, needsSetup: 0 },
    security: { total: 0, completed: 0, needsSetup: 0 },
    quality: { total: 0, completed: 0, needsSetup: 0 },
    tooling: { total: 0, completed: 0, needsSetup: 0 },
    architecture: { total: 0, completed: 0, needsSetup: 0 },
  };

  for (const item of items) {
    if (!byCategory[item.category]) {
      byCategory[item.category] = { total: 0, completed: 0, needsSetup: 0 };
    }
    byCategory[item.category].total++;
    if (item.status === 'completed') {
      byCategory[item.category].completed++;
    } else {
      byCategory[item.category].needsSetup++;
    }
  }

  return {
    items,
    stats: {
      total: items.length,
      completedCount,
      needsSetupCount,
      completionPercentage,
      byCategory,
    },
  };
}

/**
 * Filter checklist items by status, category, and search query.
 */
export function filterChecklist(
  items: SetupChecklistItem[],
  filters: {
    status?: ChecklistStatus | 'all';
    category?: ChecklistCategory | 'all';
    searchQuery?: string;
  }
): SetupChecklistItem[] {
  const { status = 'all', category = 'all', searchQuery = '' } = filters;
  const q = searchQuery.trim().toLowerCase();

  return items.filter((item) => {
    if (status !== 'all' && item.status !== status) {
      return false;
    }

    if (category !== 'all' && item.category !== category) {
      return false;
    }

    if (q) {
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchSummary = item.summary.toLowerCase().includes(q);
      const matchExplanation = item.explanation.toLowerCase().includes(q);
      const matchTags = item.tags.some((t) => t.toLowerCase().includes(q));
      const matchFiles = item.targetFiles?.some((f) => f.toLowerCase().includes(q));
      if (!matchTitle && !matchSummary && !matchExplanation && !matchTags && !matchFiles) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Generate formatted Markdown export of the repository setup checklist.
 */
export function generateChecklistMarkdown(
  repoName: string,
  items: SetupChecklistItem[],
  stats: ChecklistStats
): string {
  const timestamp = new Date().toISOString().split('T')[0];

  let md = `# Repository Setup & Standards Checklist: ${repoName}\n\n`;
  md += `**Date:** ${timestamp}  \n`;
  md += `**Setup Progress:** ${stats.completedCount}/${stats.total} checks completed (${stats.completionPercentage}%)\n\n`;
  md += `---\n\n`;

  md += `## Checklist Overview\n\n`;
  items.forEach((item, idx) => {
    const check = item.status === 'completed' ? '[x]' : '[ ]';
    const statusLabel = item.status === 'completed' ? 'COMPLETED' : 'ACTION REQUIRED';
    md += `${idx + 1}. ${check} **${item.title}** (${statusLabel})\n`;
    md += `   ${item.summary}\n\n`;
  });

  md += `---\n\n`;
  md += `## Setup Recipes & Action Items\n\n`;

  items
    .filter((item) => item.status === 'needs_setup')
    .forEach((item, idx) => {
      md += `### ${idx + 1}. ${item.title}\n\n`;
      md += `${item.explanation}\n\n`;

      if (item.codeSnippet) {
        md += `**Recommended Configuration (\`${item.codeSnippet.filename || 'Config'}\`):**\n\n`;
        md += `\`\`\`${item.codeSnippet.language}\n${item.codeSnippet.code}\n\`\`\`\n\n`;
      }

      if (item.agentPrompt) {
        md += `**AI Agent Execution Prompt:**\n\n`;
        md += `> ${item.agentPrompt.split('\n').join('\n> ')}\n\n`;
      }

      md += `---\n\n`;
    });

  return md;
}
