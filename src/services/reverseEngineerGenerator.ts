import {
  RepoAnalysis,
  RepoFile,
  DatabaseSchema,
  RepoDependency,
} from '../types';
import { detectFrameworks } from './frameworkDetector';
import { parseApiEndpoints } from './apiRouteCatalog';
import { parseDatabaseFiles } from './databaseParser';
import { detectCloudServices, CloudDetectionResult } from './cloudServicesDetector';

export type ReverseEngineerCategory =
  | 'fullstack'
  | 'ui_ux'
  | 'frontend'
  | 'backend'
  | 'database'
  | 'agent_skill';

export interface CategoryOption {
  id: ReverseEngineerCategory;
  title: string;
  subtitle: string;
  iconName: string;
}

export const REVERSE_CATEGORIES: CategoryOption[] = [
  {
    id: 'fullstack',
    title: 'Full-Stack Architectural Blueprint',
    subtitle: 'End-to-end design, file layout, dependencies, and integration guide',
    iconName: 'Layers',
  },
  {
    id: 'agent_skill',
    title: 'AI Agent SKILL.md Pack',
    subtitle: 'Downloadable SKILL.md file for Antigravity, Cursor, Claude Code & Copilot',
    iconName: 'Bot',
  },
  {
    id: 'ui_ux',
    title: 'UI / UX & Design System',
    subtitle: 'Color palettes, layout boundaries, typography, dark mode & CSS rules',
    iconName: 'Palette',
  },
  {
    id: 'frontend',
    title: 'Frontend Components & State',
    subtitle: 'Component tree breakdown, state management, custom hooks & routing',
    iconName: 'Layout',
  },
  {
    id: 'backend',
    title: 'Backend APIs & Logic Adapters',
    subtitle: 'API routes, controllers, fallback engines, and service layer specifications',
    iconName: 'Server',
  },
  {
    id: 'database',
    title: 'Database & Data Models',
    subtitle: 'Synthesized ERD entities, SQL/Prisma/Dart models, and relations',
    iconName: 'Database',
  },
];

export function generateReverseEngineerSpec(
  category: ReverseEngineerCategory,
  repoName: string,
  analysis: RepoAnalysis | null,
  files: RepoFile[],
  fileContents: Map<string, string> | Record<string, string>,
  databaseSchema: DatabaseSchema | null,
  dependencies: RepoDependency[]
): string {
  const contentsMap: Map<string, string> =
    fileContents instanceof Map ? fileContents : new Map(Object.entries(fileContents || {}));

  const filesWithContent = files.map((f) => ({
    path: f.path,
    content: contentsMap.get(f.path) || '',
  }));

  const cloudResult = detectCloudServices(files, contentsMap, dependencies);
  const apiRoutes = parseApiEndpoints(filesWithContent);
  const dbSchema =
    databaseSchema || parseDatabaseFiles(filesWithContent.filter((f) => Boolean(f.content)));

  switch (category) {
    case 'fullstack':
      return generateFullStackBlueprint(repoName, analysis, files, contentsMap, dbSchema, dependencies, cloudResult, apiRoutes);
    case 'agent_skill':
      return generateAgentSkillPack(repoName, analysis, files, contentsMap, dbSchema, dependencies, cloudResult, apiRoutes);
    case 'ui_ux':
      return generateUiUxBlueprint(repoName, analysis, files, contentsMap, dependencies, cloudResult);
    case 'frontend':
      return generateFrontendBlueprint(repoName, analysis, files, contentsMap, dependencies, cloudResult);
    case 'backend':
      return generateBackendBlueprint(repoName, analysis, files, contentsMap, dependencies, cloudResult, apiRoutes);
    case 'database':
      return generateDatabaseBlueprint(repoName, analysis, files, contentsMap, dbSchema, dependencies, cloudResult);
    default:
      return generateFullStackBlueprint(repoName, analysis, files, contentsMap, dbSchema, dependencies, cloudResult, apiRoutes);
  }
}

// =============================================================================
// 1. FULL-STACK ARCHITECTURAL BLUEPRINT
// =============================================================================
function generateFullStackBlueprint(
  repoName: string,
  analysis: RepoAnalysis | null,
  files: RepoFile[],
  fileContents: Map<string, string>,
  dbSchema: DatabaseSchema,
  dependencies: RepoDependency[],
  cloud: CloudDetectionResult,
  apiRoutes: any[]
): string {
  const lines: string[] = [];
  const dateStr = new Date().toISOString().split('T')[0];
  const primaryLang = analysis?.metadata.language || 'TypeScript';
  const frameworkResult = detectFrameworks(files, fileContents, dependencies);
  const primaryFramework = frameworkResult.primary;

  const components = files.filter((f) => f.category === 'component');
  const services = files.filter((f) => f.category === 'service' || f.category === 'api');
  const configs = files.filter((f) => f.category === 'config');
  const tests = files.filter((f) => f.category === 'test');

  lines.push(`# Complete Full-Stack Architectural Blueprint: ${repoName}`);
  lines.push(`> **Target System**: \`${repoName}\` | **Architecture Specification**: \`PRODUCTION MASTER BLUEPRINT\``);
  lines.push(`> **Specification Density**: \`Comprehensive Master Blueprint\` | **Date**: \`${dateStr}\``);
  lines.push(`> **Primary Runtime**: \`${primaryFramework.name}\` (${primaryFramework.category}) | **Ecosystem**: \`${primaryLang}\``);
  lines.push(`> **Cloud & Infrastructure**: \`${cloud.hasCloudServices ? cloud.providers.join(', ').toUpperCase() : 'ZERO-CLOUD / LOCAL CLIENT RUNTIME'}\` (${cloud.architectureTitle})`);
  lines.push(`> *Use this blueprint to understand, rebuild, adapt, or autonomously generate this complete system with 100% architectural fidelity.*`);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  // Table of Contents
  lines.push(`## Table of Contents`);
  lines.push(`1. [System Mission & Executive Overview](#1-system-mission--executive-overview)`);
  lines.push(`2. [Cloud Infrastructure, BaaS & Storage Architecture](#2-cloud-infrastructure-baas--storage-architecture)`);
  lines.push(`3. [Master Technology Matrix & Runtime Stack](#3-master-technology-matrix--runtime-stack)`);
  lines.push(`4. [Complete Directory Topology & Module Map](#4-complete-directory-topology--module-map)`);
  lines.push(`5. [Frontend Subsystem & UI Component Tree](#5-frontend-subsystem--ui-component-tree)`);
  lines.push(`6. [Backend API Engine, Route Contracts & Adapters](#6-backend-api-engine-route-contracts--adapters)`);
  lines.push(`7. [Data Architecture, Database Schemas & Storage Systems](#7-data-architecture-database-schemas--storage-systems)`);
  lines.push(`8. [End-to-End Application Lifecycle & State Pipeline](#8-end-to-end-application-lifecycle--state-pipeline)`);
  lines.push(`9. [Security Posture, Encryption & Data Sovereignty](#9-security-posture-encryption--data-sovereignty)`);
  lines.push(`10. [Exhaustive 10-Phase Step-by-Step Reproduction Blueprint](#10-exhaustive-10-phase-step-by-step-reproduction-blueprint)`);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  // 1. Executive Overview
  lines.push(`## 1. System Mission & Executive Overview`);
  lines.push(``);
  lines.push(`### 1.1 Project Purpose & Core Domain`);
  lines.push(`${analysis?.summary || `The ${repoName} project is an engineered software application designed to deliver responsive developer tooling and architecture visualization.`}`);
  lines.push(``);
  lines.push(`The software solves real-world engineering challenges by providing modular abstraction boundaries, deterministic state machines, and performant user interface workflows. It is built to balance high throughput, maintainability, and clean decoupling across presentation, business logic, and storage layers.`);
  lines.push(``);

  lines.push(`### 1.2 Core Architectural Invariants`);
  lines.push(`- **Unidirectional Data Flow**: State mutations follow deterministic dispatch mechanisms; UI layers render strictly from derived state props.`);
  lines.push(`- **Monochrome High-Contrast Theme**: Visual ergonomics follow a strict monochrome palette (pure black #000000, white #ffffff, and neutral zinc scale #09090b - #f4f4f5).`);
  lines.push(`- **Data Sovereignty & Local Isolation**: All code parsing, repository graphs, and secret handling occur within client-side sandboxes without telemetry leakage.`);
  lines.push(`- **Zero-Install Client Execution**: Lightweight client runtimes operate without requiring users to download gigabytes of heavy external model weights.`);
  lines.push(``);

  // 2. Cloud Infrastructure & Storage
  lines.push(`## 2. Cloud Infrastructure, BaaS & Storage Architecture`);
  lines.push(``);
  if (cloud.hasCloudServices) {
    lines.push(`This application leverages the following cloud providers and Backend-as-a-Service (BaaS) platforms:`);
    lines.push(``);
    lines.push(`| Provider | Service Category | Detected Features & Capabilities | Evidence & Signals |`);
    lines.push(`| :--- | :--- | :--- | :--- |`);
    cloud.services.forEach((s) => {
      lines.push(`| **${s.name}** | \`${s.category}\` | ${s.detectedFeatures.join(', ')} | \`${s.evidence.join('; ')}\` |`);
    });
    lines.push(``);

    lines.push(`### 2.1 Storage Systems & Bucket Topologies`);
    cloud.storageSystems.forEach((st) => {
      lines.push(`#### Storage Target: \`${st.name}\` (${st.type.toUpperCase()})`);
      lines.push(`- **Provider**: ${st.provider}`);
      lines.push(`- **Storage Classification**: \`${st.type}\``);
      lines.push(`- **Purpose**: ${st.description}`);
      lines.push(`- **Evidence**: ${st.evidence.join(', ')}`);
      lines.push(``);
    });
  } else {
    lines.push(`### 2.1 Self-Contained Local Runtime (Zero External Cloud Services)`);
    lines.push(`This codebase adheres to a **Zero-Cloud architecture**. It does not bind to external proprietary cloud infrastructure (such as AWS, GCP, Azure, Supabase, or Firebase) for core execution. Instead:`);
    lines.push(`- **Data Persistence**: Managed locally using browser IndexedDB, LocalStorage, or embedded SQLite engines.`);
    lines.push(`- **Compute Execution**: Computed directly on the user's host environment or client JavaScript/WebAssembly sandbox.`);
    lines.push(`- **Privacy**: Eliminates external attack vectors, third-party data egress, and vendor lock-in.`);
    lines.push(``);
  }

  // 3. Tech Stack Matrix
  lines.push(`## 3. Master Technology Matrix & Runtime Stack`);
  lines.push(`| Dimension | Technology / Tool | Version / Scope | Primary Role |`);
  lines.push(`| :--- | :--- | :--- | :--- |`);
  lines.push(`| **Primary Language** | \`${primaryLang}\` | Strict typing | Core business & UI logic |`);
  lines.push(`| **Framework** | \`${primaryFramework.name}\` | \`${primaryFramework.badge}\` | ${primaryFramework.description} |`);
  lines.push(`| **Framework Category** | \`${primaryFramework.category}\` | Native archetype | ${primaryFramework.archetype} |`);
  lines.push(`| **Routing Engine** | \`${primaryFramework.routingType}\` | Client/Server router | Screen transitions and URL synchronization |`);
  lines.push(`| **Styling Engine** | \`${primaryFramework.stylingEcosystem || 'Tailwind CSS'}\` | Utility-first | Strict monochrome design system |`);
  lines.push(`| **Total Scanned Files** | \`${files.length} source files\` | Complete repository | Full structural footprint |`);
  lines.push(`| **Entry Points** | \`${analysis?.entryPoints.join(', ') || 'src/main.tsx'}\` | System bootstrap | Application initialization |`);
  lines.push(``);

  // 4. Complete Directory Topology
  lines.push(`## 4. Complete Directory Topology & Module Map`);
  lines.push(`Below is the complete file directory layout parsed from the target repository:`);
  lines.push(``);
  lines.push(`\`\`\`text`);
  lines.push(`${repoName}/`);
  const dirMap = new Map<string, string[]>();
  files.forEach((f) => {
    const parts = f.path.split('/');
    const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '.';
    if (!dirMap.has(dir)) dirMap.set(dir, []);
    dirMap.get(dir)!.push(parts[parts.length - 1]);
  });
  Array.from(dirMap.keys()).sort().forEach((dir) => {
    const indent = dir === '.' ? '  ' : '  '.repeat(dir.split('/').length + 1);
    if (dir !== '.') lines.push(`${indent}📁 ${dir}/`);
    dirMap.get(dir)!.slice(0, 25).forEach((fn) => lines.push(`${indent}  📄 ${fn}`));
  });
  lines.push(`\`\`\``);
  lines.push(``);

  lines.push(`### 4.1 Exhaustive File Registry (${files.length} Total Files)`);
  lines.push(`| File Path | Category | Byte Size | Architectural Responsibility |`);
  lines.push(`| :--- | :--- | :--- | :--- |`);
  files.forEach((f) => {
    lines.push(`| \`${f.path}\` | \`${f.category}\` | ${f.size || 0} B | ${getFileRoleDescription(f.path, f.category)} |`);
  });
  lines.push(``);

  // 5. Frontend Subsystem
  lines.push(`## 5. Frontend Subsystem & UI Component Tree`);
  lines.push(`The presentation layer comprises **${components.length} UI components** organized in modular hierarchy:`);
  lines.push(``);
  components.forEach((c) => {
    lines.push(`### Component: \`${c.name}\``);
    lines.push(`- **Source Path**: \`${c.path}\``);
    lines.push(`- **Module Category**: \`${c.category}\``);
    lines.push(`- **Layout Role**: Modular view component rendering reactive DOM nodes.`);
    lines.push(`- **State Dependencies**: Receives typed props; enforces deterministic view updates.`);
    lines.push(``);
  });

  // 6. Backend API Engine
  lines.push(`## 6. Backend API Engine, Route Contracts & Adapters`);
  lines.push(`The system features **${apiRoutes.length} discovered API endpoints** and network adapters:`);
  lines.push(``);
  if (apiRoutes.length > 0) {
    lines.push(`| Method | Endpoint Path | Framework / Service | Source File Location | Summary |`);
    lines.push(`| :--- | :--- | :--- | :--- | :--- |`);
    apiRoutes.forEach((ep) => {
      lines.push(`| \`${ep.method}\` | \`${ep.path}\` | \`${ep.cloudService || ep.framework}\` | \`${ep.file}:${ep.line}\` | ${ep.summary || 'REST Route'} |`);
    });
  } else {
    lines.push(`*Note: No traditional HTTP REST server endpoints were discovered. All operations are handled via client-side adapters and local state modules.*`);
  }
  lines.push(``);

  // 7. Database & Persistence
  lines.push(`## 7. Data Architecture, Database Schemas & Storage Systems`);
  lines.push(`The data persistence tier contains **${dbSchema.tables.length} schema entities / models**:`);
  lines.push(``);
  dbSchema.tables.forEach((tbl) => {
    lines.push(`### Entity: \`${tbl.name}\` (\`${tbl.schemaType}\`)`);
    lines.push(`- **Source File**: \`${tbl.sourceFile}\``);
    lines.push(`- **Column Count**: ${tbl.columns.length} columns`);
    lines.push(``);
    lines.push(`| Column Name | Data Type | Nullable | Primary Key | Foreign Key Reference |`);
    lines.push(`| :--- | :--- | :--- | :--- | :--- |`);
    tbl.columns.forEach((col) => {
      lines.push(`| \`${col.name}\` | \`${col.type}\` | ${col.isNullable ? 'Yes' : 'No'} | ${col.isPrimary ? 'PRIMARY KEY' : '-'} | ${col.references ? `-> ${col.references.table}.${col.references.column}` : '-'} |`);
    });
    lines.push(``);
  });

  // 8. Lifecycle & State
  lines.push(`## 8. End-to-End Application Lifecycle & State Pipeline`);
  lines.push(`1. **Bootstrap Phase**: The entrypoint initializes environment configs, mounts root providers, and establishes local memory caches.`);
  lines.push(`2. **State Hydration**: Client restores active branch metadata and stored authentication tokens from encrypted storage.`);
  lines.push(`3. **Data Fetching & Parsing**: Files are ingested, categorized into architectural tiers, and AST/regex relationships are compiled into directed graphs.`);
  lines.push(`4. **View Render**: Components render viewports with virtualized lists and hardware-accelerated SVG canvases.`);
  lines.push(`5. **User Action Dispatch**: Interactions dispatch actions that compute pure state updates and trigger targeted UI rerenders.`);
  lines.push(``);

  // 9. Security Posture
  lines.push(`## 9. Security Posture, Encryption & Data Sovereignty`);
  lines.push(`- **Zero Hardcoded Secrets**: All API credentials and tokens are injected via environment variables or encrypted client storage.`);
  lines.push(`- **CORS & Origin Isolation**: Serverless endpoints enforce strict Access-Control-Allow-Origin restrictions.`);
  lines.push(`- **Prompt Injection Defense**: All user-supplied prompts and repository data are wrapped in delimiters to prevent instruction hijacking.`);
  lines.push(``);

  // 10. Reproduction Blueprint
  lines.push(`## 10. Exhaustive 10-Phase Step-by-Step Reproduction Blueprint`);
  for (let phase = 1; phase <= 10; phase++) {
    lines.push(getReproductionPhaseDetails(phase, repoName, primaryLang, primaryFramework.name, components, services, dbSchema, cloud));
  }

  return lines.join('\n');
}

// =============================================================================
// 2. AI AGENT SKILL.md PACK
// =============================================================================
export function generateAgentSkillPack(
  repoName: string,
  analysis: RepoAnalysis | null,
  files: RepoFile[],
  fileContents: Map<string, string> | Record<string, string>,
  databaseSchema: DatabaseSchema | null,
  dependencies: RepoDependency[],
  cloudResult?: CloudDetectionResult,
  apiRoutes?: any[]
): string {
  const contentsMap: Map<string, string> =
    fileContents instanceof Map ? fileContents : new Map(Object.entries(fileContents || {}));
  const cloud = cloudResult || detectCloudServices(files, contentsMap, dependencies);
  const primaryLang = analysis?.metadata.language || 'TypeScript';

  const components = files.filter((f) => f.category === 'component');
  const services = files.filter((f) => f.category === 'service' || f.category === 'api');
  const tables = databaseSchema?.tables || [];

  const lines: string[] = [];
  lines.push(`---`);
  lines.push(`name: clone-${repoName.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase()}`);
  lines.push(`description: Autonomous AI agent engineering specification and replication instructions for ${repoName}`);
  lines.push(`framework: ${analysis?.detectedTools[0] || 'Vite + React'}`);
  lines.push(`language: ${primaryLang}`);
  lines.push(`cloud_providers: [${cloud.providers.map((p) => `"${p}"`).join(', ')}]`);
  lines.push(`total_source_files: ${files.length}`);
  lines.push(`rules:`);
  lines.push(`  - Enforce strict monochrome black/white/zinc styling (no unauthorized colors)`);
  lines.push(`  - Maintain client-side zero-install execution with zero heavy weight downloads`);
  lines.push(`  - Use unidirectional state management and strict interface contracts`);
  lines.push(`---`);
  lines.push(``);

  lines.push(`# AI Agent Engineering Skill Pack: Replicating \`${repoName}\``);
  lines.push(`> **Agent Role**: Autonomous Systems Engineer & Full-Stack Architect`);
  lines.push(`> **Mission**: Autonomously reproduce, extend, or refactor ${repoName} with zero architectural drift.`);
  lines.push(`> **Specification Level**: Autonomous AI Engineering Skill Specification`);
  lines.push(``);

  lines.push(`## 1. Agent Operational Mandate`);
  lines.push(`You are an autonomous AI software engineer instructed to construct or modify this application. You must strictly adhere to the file structures, interface signatures, and architectural constraints documented in this skill file.`);
  lines.push(``);

  lines.push(`## 2. Invariable Design & Architectural Rules`);
  lines.push(`1. **Monochrome Design Discipline**: Every UI element must strictly use shades of zinc (#09090b, #18181b, #27272a, #71717a, #e4e4e7, #f4f4f5, #ffffff). Colorful alert badges or accents are strictly prohibited.`);
  lines.push(`2. **Zero-Install Local Execution**: The assistant and local tools must run directly in the browser sandbox. Never prompt users to download 1GB+ model weights to mobile devices.`);
  lines.push(`3. **Independent Scroll Viewports**: Main viewports and document view cards must have independent vertical scrolling (\`overflow-y-auto\`) and never lock to cramped fixed containers.`);
  lines.push(`4. **Cloud & BaaS Integrity**: Cloud integrations (${cloud.hasCloudServices ? cloud.providers.join(', ') : 'none'}) must be cleanly decoupled via environment variables.`);
  lines.push(``);

  lines.push(`## 3. Master Component Generation Directives`);
  components.forEach((c) => {
    lines.push(`### Directive: \`${c.path}\``);
    lines.push(`- **Action**: Implement component \`${c.name}\``);
    lines.push(`- **Styling**: Tailwind utility classes conforming to monochrome boundaries`);
    lines.push(`- **Interface**: Strictly type all props with TypeScript interfaces`);
    lines.push(`- **Code Blueprint**:`);
    lines.push(`\`\`\`tsx`);
    lines.push(`// Generated specification for ${c.path}`);
    lines.push(`export interface ${c.name}Props {`);
    lines.push(`  // Define specific props matching ${c.name}`);
    lines.push(`  className?: string;`);
    lines.push(`}`);
    lines.push(`export function ${c.name}(props: ${c.name}Props) {`);
    lines.push(`  return <div className="p-4 bg-white border border-zinc-200 rounded-2xl">{/* ${c.name} content */}</div>;`);
    lines.push(`}`);
    lines.push(`\`\`\``);
    lines.push(``);
  });

  lines.push(`## 4. Master Service & Business Logic Directives`);
  services.forEach((s) => {
    lines.push(`### Service Module: \`${s.path}\``);
    lines.push(`- **Role**: Core business logic and caching adapter`);
    lines.push(`- **Contract**: Zero UI imports; pure deterministic functions`);
    lines.push(`- **Implementation Template**:`);
    lines.push(`\`\`\`ts`);
    lines.push(`// Service logic for ${s.path}`);
    lines.push(`export const ${s.name.replace(/\.[a-z]+$/, '')} = {`);
    lines.push(`  async execute(...) {`);
    lines.push(`    // Business logic`);
    lines.push(`  }`);
    lines.push(`};`);
    lines.push(`\`\`\``);
    lines.push(``);
  });

  lines.push(`## 5. Database Schema & Data Models Directive`);
  tables.forEach((t) => {
    lines.push(`### Model: \`${t.name}\``);
    lines.push(`- **Source**: \`${t.sourceFile}\``);
    lines.push(`- **Columns**: ${t.columns.map((col) => `\`${col.name}: ${col.type}\``).join(', ')}`);
    lines.push(`\`\`\`ts`);
    lines.push(`export interface ${t.name} {`);
    t.columns.forEach((col) => {
      lines.push(`  ${col.name}${col.isNullable ? '?' : ''}: ${mapSqlToTs(col.type)};`);
    });
    lines.push(`}`);
    lines.push(`\`\`\``);
    lines.push(``);
  });

  lines.push(`## 6. Verification & Automated Test Directives`);
  lines.push(`After implementing the codebase, execute the following commands in order:`);
  lines.push(`\`\`\`bash`);
  lines.push(`# 1. Validate TypeScript compilation`);
  lines.push(`npx tsc --noEmit`);
  lines.push(``);
  lines.push(`# 2. Execute unit and integration tests`);
  lines.push(`npx vitest run`);
  lines.push(``);
  lines.push(`# 3. Build production bundle`);
  lines.push(`npm run build`);
  lines.push(`\`\`\``);
  lines.push(``);

  lines.push(`## 7. Autonomous Agent Multi-Turn Prompt Playbook`);
  for (let step = 1; step <= 8; step++) {
    lines.push(`### Step ${step}: Multi-Turn Agent Prompt`);
    lines.push(`> "Execute Phase ${step} of the ${repoName} replication plan. Implement all files in Section 4 matching the monochrome design system rules."`);
    lines.push(``);
  }

  return lines.join('\n');
}

// =============================================================================
// 3. UI / UX & DESIGN SYSTEM SPECIFICATION
// =============================================================================
function generateUiUxBlueprint(
  repoName: string,
  analysis: RepoAnalysis | null,
  files: RepoFile[],
  fileContents: Map<string, string>,
  dependencies: RepoDependency[],
  cloud: CloudDetectionResult
): string {
  const components = files.filter((f) => f.category === 'component');
  const styles = files.filter((f) => f.category === 'style');
  const lines: string[] = [];

  lines.push(`# UI/UX & Design System Architecture: ${repoName}`);
  lines.push(`> **Design Philosophy**: Strict High-Contrast Monochrome Discipline`);
  lines.push(`> **Specification Level**: Complete Design System & UI Architecture`);
  lines.push(`> **Scope**: Color tokens, typography, component geometry, interactive states, and accessibility`);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  lines.push(`## 1. Aesthetic Manifesto & Design Principles`);
  lines.push(`The user interface for **${repoName}** adheres to an uncompromising, minimalist aesthetic:`);
  lines.push(`- **Monochrome High Contrast**: We eliminate arbitrary decorative colors. Every visual element relies on stark contrast between deep blacks (#09090b), pure whites (#ffffff), and a graded neutral zinc scale.`);
  lines.push(`- **Information Density**: Clean typography, crisp 1px borders (\`border-zinc-200\`), and subtle micro-shadows (\`shadow-xs\`) ensure high readability without visual clutter.`);
  lines.push(`- **Fluid & Scrollable Viewports**: Viewport containers must never clip content arbitrarily. Main panels and document cards provide generous scrolling containers with independent scrollbars.`);
  lines.push(``);

  lines.push(`## 2. Color Palette & Token Scale`);
  lines.push(`| Token Name | HEX Code | Tailwind Utility | Semantic Purpose |`);
  lines.push(`| :--- | :--- | :--- | :--- |`);
  lines.push(`| **Background Canvas** | \`#fafafa\` | \`bg-zinc-50\` | Application root canvas background |`);
  lines.push(`| **Card Background** | \`#ffffff\` | \`bg-white\` | Content cards, modals, and panel surfaces |`);
  lines.push(`| **Subtle Fill** | \`#f4f4f5\` | \`bg-zinc-100\` | Input fields, active badges, and table headers |`);
  lines.push(`| **Border Default** | \`#e4e4e7\` | \`border-zinc-200\` | Structural 1px boundary lines |`);
  lines.push(`| **Border Dark** | \`#d4d4d8\` | \`border-zinc-300\` | Hover borders and divider lines |`);
  lines.push(`| **Muted Text** | \`#a1a1aa\` | \`text-zinc-400\` | Timestamp labels and secondary icons |`);
  lines.push(`| **Body Text** | \`#52525b\` | \`text-zinc-600\` | Paragraphs and narrative descriptions |`);
  lines.push(`| **Heading Text** | \`#18181b\` | \`text-zinc-900\` | Section headers and card titles |`);
  lines.push(`| **Primary Action** | \`#09090b\` | \`bg-zinc-900 text-white\` | Primary CTA buttons and key badges |`);
  lines.push(`| **Code Block Dark** | \`#09090b\` | \`bg-zinc-950 text-zinc-100\` | Source code viewports and terminals |`);
  lines.push(``);

  lines.push(`## 3. Typography & Hierarchy Scale`);
  lines.push(`- **Primary Sans Font**: \`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif\``);
  lines.push(`- **Monospace Font**: \`ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace\``);
  lines.push(``);
  lines.push(`| Level | Font Size | Weight | Tracking | Usage |`);
  lines.push(`| :--- | :--- | :--- | :--- | :--- |`);
  lines.push(`| **Display Title** | 24px - 30px | 800 (Extrabold) | \`-0.025em\` | Landing hero and repository titles |`);
  lines.push(`| **Section Heading** | 18px - 20px | 700 (Bold) | \`-0.02em\` | Card headers and tab titles |`);
  lines.push(`| **Component Subtitle** | 14px - 15px | 600 (Semibold) | \`normal\` | Group titles and item labels |`);
  lines.push(`| **Body Text** | 12px - 13px | 400 (Regular) | \`normal\` | General descriptions and messages |`);
  lines.push(`| **Code & Badges** | 10px - 11px | 600 (Semibold Mono) | \`+0.05em\` | Status tags, routes, file paths |`);
  lines.push(``);

  lines.push(`## 4. Component-by-Component Design Inventory (${components.length} Components)`);
  components.forEach((comp) => {
    lines.push(`### Component Spec: \`${comp.name}\``);
    lines.push(`- **File Location**: \`${comp.path}\``);
    lines.push(`- **Container Layout**: Rounded 16px/24px card (\`rounded-2xl\`), 1px solid border (\`border-zinc-200\`), subtle shadow (\`shadow-xs\`).`);
    lines.push(`- **Interactive States**:`);
    lines.push(`  - **Hover**: Subtle background transition to \`hover:bg-zinc-50/80\` or \`hover:border-zinc-400\`.`);
    lines.push(`  - **Active / Pressed**: Micro scale feedback \`active:scale-[0.99]\`.`);
    lines.push(`  - **Focus Visible**: High contrast ring \`focus:ring-2 focus:ring-zinc-900 focus:outline-none\`.`);
    lines.push(`  - **Disabled**: Reduced opacity \`opacity-50 pointer-events-none\`.`);
    lines.push(`- **Accessibility (a11y)**: Accessible ARIA labels on all icon buttons; keyboard accessible via Tab key.`);
    lines.push(``);
  });

  lines.push(`## 5. Responsive Breakpoint Matrix`);
  lines.push(`| Breakpoint | Minimum Width | Layout Adjustments |`);
  lines.push(`| :--- | :--- | :--- |`);
  lines.push(`| **Mobile** | \`< 640px\` | Full-width single column stack, drawer navigation, collapsible drawers |`);
  lines.push(`| **Tablet** | \`640px - 1024px\` | 2-column card grids, compact sidebar |`);
  lines.push(`| **Desktop** | \`1024px - 1440px\` | Split pane architecture, resizable dual viewports, 4-column metrics |`);
  lines.push(`| **Ultra-Wide**| \`> 1440px\` | Max-width content constraint (1280px - 1400px), centered layout |`);
  lines.push(``);

  lines.push(`## 6. Tailwind CSS Master Configuration`);
  lines.push(`\`\`\`js`);
  lines.push(`/** @type {import('tailwindcss').Config} */`);
  lines.push(`module.exports = {`);
  lines.push(`  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],`);
  lines.push(`  theme: {`);
  lines.push(`    extend: {`);
  lines.push(`      colors: {`);
  lines.push(`        zinc: {`);
  lines.push(`          50: '#fafafa',`);
  lines.push(`          100: '#f4f4f5',`);
  lines.push(`          200: '#e4e4e7',`);
  lines.push(`          300: '#d4d4d8',`);
  lines.push(`          400: '#a1a1aa',`);
  lines.push(`          500: '#71717a',`);
  lines.push(`          600: '#52525b',`);
  lines.push(`          700: '#3f3f46',`);
  lines.push(`          800: '#27272a',`);
  lines.push(`          900: '#18181b',`);
  lines.push(`          950: '#09090b',`);
  lines.push(`        },`);
  lines.push(`      },`);
  lines.push(`    },`);
  lines.push(`  },`);
  lines.push(`  plugins: [],`);
  lines.push(`};`);
  lines.push(`\`\`\``);

  return lines.join('\n');
}

// =============================================================================
// 4. FRONTEND COMPONENTS & STATE ARCHITECTURE
// =============================================================================
function generateFrontendBlueprint(
  repoName: string,
  analysis: RepoAnalysis | null,
  files: RepoFile[],
  fileContents: Map<string, string>,
  dependencies: RepoDependency[],
  cloud: CloudDetectionResult
): string {
  const components = files.filter((f) => f.category === 'component');
  const services = files.filter((f) => f.category === 'service');
  const lines: string[] = [];

  lines.push(`# Frontend Component & State Architecture: ${repoName}`);
  lines.push(`> **Architecture**: Modular Component Tree & Unidirectional Reactive State`);
  lines.push(`> **Specification Level**: Complete Frontend State & Component Hierarchy`);
  lines.push(`> **Component Count**: ${components.length} UI Components | **Services**: ${services.length} Client Modules`);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  lines.push(`## 1. Frontend Architectural Philosophy`);
  lines.push(`The client-side architecture is organized around three foundational principles:`);
  lines.push(`1. **Atomic Presentation Decoupling**: Components are pure rendering engines that accept typed props and invoke callback events, keeping UI testable in isolation.`);
  lines.push(`2. **Unidirectional Reactive Flow**: Data flows downward via props or context providers; user inputs dispatch asynchronous events that update single-source-of-truth stores.`);
  lines.push(`3. **Independent Viewport Scroll Isolation**: Top-level views and nested document panels use explicit scroll containers (\`overflow-y-auto\`) to prevent cramped cutoffs.`);
  lines.push(``);

  lines.push(`## 2. Component Hierarchy & Interface Contracts`);
  components.forEach((c) => {
    lines.push(`### \`${c.name}\` (\`${c.path}\`)`);
    lines.push(`- **Module Path**: \`${c.path}\``);
    lines.push(`- **Category**: Component Primitive / View Container`);
    lines.push(`- **Props Contract Specification**:`);
    lines.push(`\`\`\`typescript`);
    lines.push(`export interface ${c.name}Props {`);
    lines.push(`  // Input properties`);
    lines.push(`  data?: any;`);
    lines.push(`  className?: string;`);
    lines.push(`  onAction?: (actionId: string, payload?: any) => void;`);
    lines.push(`}`);
    lines.push(`\`\`\``);
    lines.push(`- **Lifecycle & State Hooks**: Initializes on mount; memoizes complex computations with \`useMemo\`; attaches event listeners safely with cleanup returns.`);
    lines.push(``);
  });

  lines.push(`## 3. State Management & Cache Topologies`);
  lines.push(`- **Client Cache**: IndexedDB key-value stores partition cached ASTs and repository metadata by branch SHA.`);
  lines.push(`- **Reactive State**: React \`useState\` and \`useReducer\` manage transient UI state (active tab, search filter, selected node).`);
  lines.push(`- **Memoization Strategy**: Costly tree parsing and graph layouts are cached via \`useMemo\` and invalidated only when file contents change.`);
  lines.push(``);

  lines.push(`## 4. Frontend Testing & Verification Suite`);
  lines.push(`Every component must be validated with component-level unit tests:`);
  lines.push(`\`\`\`typescript`);
  lines.push(`import { describe, it, expect } from 'vitest';`);
  lines.push(`import { render, screen } from '@testing-library/react';`);
  lines.push(``);
  lines.push(`describe('Frontend Component Integrity', () => {`);
  components.slice(0, 10).forEach((c) => {
    lines.push(`  it('renders ${c.name} without crashing', () => {`);
    lines.push(`    // Assert component mount and accessible landmarks`);
    lines.push(`  });`);
  });
  lines.push(`});`);
  lines.push(`\`\`\``);

  return lines.join('\n');
}

// =============================================================================
// 5. BACKEND APIS & LOGIC ADAPTERS
// =============================================================================
function generateBackendBlueprint(
  repoName: string,
  analysis: RepoAnalysis | null,
  files: RepoFile[],
  fileContents: Map<string, string>,
  dependencies: RepoDependency[],
  cloud: CloudDetectionResult,
  apiRoutes: any[]
): string {
  const services = files.filter((f) => f.category === 'service' || f.category === 'api');
  const lines: string[] = [];

  lines.push(`# Backend APIs, Services & Logic Adapters: ${repoName}`);
  lines.push(`> **Architecture**: Polyglot API Engine, Serverless Endpoints & Cloud BaaS Adapters`);
  lines.push(`> **Specification Level**: Complete API Route Contracts & Service Architecture`);
  lines.push(`> **Discovered Endpoints**: ${apiRoutes.length} Routes | **Cloud Providers**: ${cloud.providers.join(', ') || 'Local / None'}`);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  lines.push(`## 1. Backend Architecture Overview`);
  lines.push(`The service tier provides clean boundary abstraction over external APIs, cloud runtimes, and local analytical engines:`);
  lines.push(`- **Cloud & BaaS Integrations**: Direct adapters for Supabase, Firebase, AWS Lambda, Cloudflare Workers, and Vercel Serverless.`);
  lines.push(`- **Resilience & Fallback Strategy**: Graceful degradation handles rate limit exhaustion (403/429) or offline states through cached local fallbacks.`);
  lines.push(`- **Strict Type Safety**: Request bodies and response payloads are validated with TypeScript DTOs.`);
  lines.push(``);

  lines.push(`## 2. API Endpoint Catalog & Route Contracts (${apiRoutes.length} Routes)`);
  if (apiRoutes.length > 0) {
    apiRoutes.forEach((ep) => {
      lines.push(`### Route: \`${ep.method} ${ep.path}\``);
      lines.push(`- **Service / Runtime**: \`${ep.cloudService || ep.framework}\``);
      lines.push(`- **File Definition**: \`${ep.file}:${ep.line}\``);
      lines.push(`- **Summary**: ${ep.summary || 'API Action Handler'}`);
      lines.push(`- **Payload Contract**:`);
      lines.push(`\`\`\`typescript`);
      lines.push(`// Request DTO`);
      lines.push(`export interface ${ep.method}${sanitizeRouteName(ep.path)}Request {`);
      lines.push(`  // Request parameters`);
      lines.push(`}`);
      lines.push(`// Response DTO`);
      lines.push(`export interface ${ep.method}${sanitizeRouteName(ep.path)}Response {`);
      lines.push(`  success: boolean;`);
      lines.push(`  data: any;`);
      lines.push(`}`);
      lines.push(`\`\`\``);
      lines.push(``);
    });
  } else {
    lines.push(`*No standalone REST endpoints detected. System uses client-side services and direct adapters.*`);
    lines.push(``);
  }

  lines.push(`## 3. Service Layer Implementations (${services.length} Services)`);
  services.forEach((s) => {
    lines.push(`### Service: \`${s.name}\` (\`${s.path}\`)`);
    lines.push(`- **Module Purpose**: Encapsulates external calls and data transformation.`);
    lines.push(`- **Error Handling**: Wraps API calls with retry backoff and local cache fallbacks.`);
    lines.push(``);
  });

  return lines.join('\n');
}

// =============================================================================
// 6. DATABASE & DATA MODELS SPECIFICATION
// =============================================================================
function generateDatabaseBlueprint(
  repoName: string,
  analysis: RepoAnalysis | null,
  files: RepoFile[],
  fileContents: Map<string, string>,
  dbSchema: DatabaseSchema,
  dependencies: RepoDependency[],
  cloud: CloudDetectionResult
): string {
  const tables = dbSchema.tables || [];
  const lines: string[] = [];

  lines.push(`# Database Schema & Data Models Specification: ${repoName}`);
  lines.push(`> **Architecture**: Relational & Document Entity Models`);
  lines.push(`> **Specification Level**: Complete Entity Schema & Relational Architecture`);
  lines.push(`> **Entity Count**: ${tables.length} Tables/Models | **Cloud Storage**: ${cloud.storageSystems.map((s) => s.name).join(', ') || 'Local / In-Memory'}`);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  lines.push(`## 1. Database Architecture & Storage Topology`);
  lines.push(`The data storage layer is engineered for integrity, fast retrieval, and clean relational structure:`);
  lines.push(`- **Primary Schema Provider**: \`${tables[0]?.schemaType || 'Inferred Domain Models'}\``);
  lines.push(`- **Entity Count**: ${tables.length} recognized entities`);
  lines.push(`- **Cloud & BaaS Storage Systems**: ${cloud.storageSystems.map((s) => `${s.name} (${s.type})`).join(', ') || 'Local Sandbox'}`);
  lines.push(``);

  lines.push(`## 2. Complete Entity Specifications (${tables.length} Tables)`);
  tables.forEach((tbl) => {
    lines.push(`### Entity: \`${tbl.name}\``);
    lines.push(`- **Source File**: \`${tbl.sourceFile}\``);
    lines.push(`- **Schema Format**: \`${tbl.schemaType}\``);
    lines.push(`- **Attributes & Columns**:`);
    lines.push(``);
    lines.push(`| Column Name | Data Type | Nullable | Primary Key | Constraints / References |`);
    lines.push(`| :--- | :--- | :--- | :--- | :--- |`);
    tbl.columns.forEach((c) => {
      lines.push(`| \`${c.name}\` | \`${c.type}\` | ${c.isNullable ? 'Yes' : 'No'} | ${c.isPrimary ? 'PRIMARY KEY' : '-'} | ${c.references ? `-> ${c.references.table}.${c.references.column}` : '-'} |`);
    });
    lines.push(``);
    lines.push(`#### Production SQL DDL Migration`);
    lines.push(`\`\`\`sql`);
    lines.push(`CREATE TABLE IF NOT EXISTS "${tbl.name}" (`);
    const colDefs = tbl.columns.map((c) => {
      let def = `  "${c.name}" ${mapSqlType(c.type)}`;
      if (c.isPrimary) def += ' PRIMARY KEY';
      if (!c.isNullable && !c.isPrimary) def += ' NOT NULL';
      return def;
    });
    lines.push(colDefs.join(',\n'));
    lines.push(`);`);
    lines.push(`\`\`\``);
    lines.push(``);
  });

  lines.push(`## 3. TypeScript Type-Safe Entity Definitions`);
  tables.forEach((tbl) => {
    lines.push(`\`\`\`typescript`);
    lines.push(`export interface ${tbl.name} {`);
    tbl.columns.forEach((c) => {
      lines.push(`  ${c.name}${c.isNullable ? '?' : ''}: ${mapSqlToTs(c.type)};`);
    });
    lines.push(`}`);
    lines.push(`\`\`\``);
    lines.push(``);
  });

  return lines.join('\n');
}

// =============================================================================
// HELPER ROUTINES
// =============================================================================
function getFileRoleDescription(path: string, category: string): string {
  const p = path.toLowerCase();
  if (p.includes('modal')) return 'Overlay dialog & interactive user modal';
  if (p.includes('tab')) return 'Tabbed panel workspace view container';
  if (p.includes('service')) return 'Business logic abstraction & network client';
  if (p.includes('hook') || p.includes('use')) return 'Custom reactive state hook';
  if (p.includes('type') || p.includes('interface')) return 'TypeScript domain interface declarations';
  if (p.includes('test') || p.includes('spec')) return 'Automated test suite & assertions';
  if (p.includes('config')) return 'Tooling, bundler, or environment configuration';
  if (p.includes('api') || p.includes('route')) return 'API endpoint handler & route controller';
  return `${category} source file`;
}

function sanitizeRouteName(path: string): string {
  return path.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');
}

function mapSqlToTs(type: string): string {
  const t = type.toLowerCase();
  if (t.includes('int') || t.includes('num') || t.includes('float') || t.includes('double') || t.includes('decimal')) return 'number';
  if (t.includes('bool')) return 'boolean';
  if (t.includes('json')) return 'Record<string, any>';
  if (t.includes('date') || t.includes('time')) return 'Date | string';
  return 'string';
}

function mapSqlType(type: string): string {
  const t = type.toLowerCase();
  if (t.includes('int')) return 'INTEGER';
  if (t.includes('bool')) return 'BOOLEAN';
  if (t.includes('text') || t.includes('string')) return 'TEXT';
  if (t.includes('time') || t.includes('date')) return 'TIMESTAMP';
  return 'VARCHAR(255)';
}

function getReproductionPhaseDetails(
  phase: number,
  repoName: string,
  lang: string,
  framework: string,
  components: RepoFile[],
  services: RepoFile[],
  dbSchema: DatabaseSchema,
  cloud: CloudDetectionResult
): string {
  const phases = [
    {
      num: 1,
      title: 'Repository Initialization & Toolchain Setup',
      desc: `Initialize the ${framework} workspace using ${lang}. Configure strict TypeScript, linters, and the monochrome Tailwind CSS system.`,
      cmd: `mkdir ${repoName} && cd ${repoName}\nnpm init -y\nnpm install -D typescript vite tailwindcss vitest`,
    },
    {
      num: 2,
      title: 'Directory Scaffolding & Boundary Invariants',
      desc: 'Create root directories (src/components, src/services, src/types) matching the architectural module map.',
      cmd: 'mkdir -p src/components/{common,layout,workspace} src/services src/types tests',
    },
    {
      num: 3,
      title: 'Domain Types & Schema Definitions',
      desc: `Define TypeScript interfaces for all ${dbSchema.tables.length} database entities and repository models.`,
      cmd: 'touch src/types/index.ts',
    },
    {
      num: 4,
      title: 'Cloud Services & Storage Infrastructure Binding',
      desc: `Configure cloud integrations (${cloud.hasCloudServices ? cloud.providers.join(', ') : 'local sandbox storage'}).`,
      cmd: '# Configure environment variables & client initialization',
    },
    {
      num: 5,
      title: 'Core Business Services & Logic Adapters',
      desc: `Implement all ${services.length} services with error boundary retries and cached fallbacks.`,
      cmd: '# Implement services in src/services/',
    },
    {
      num: 6,
      title: 'Presentation Layer & UI Components',
      desc: `Construct the ${components.length} UI components enforcing strict monochrome styling.`,
      cmd: '# Implement visual components with Tailwind CSS',
    },
    {
      num: 7,
      title: 'Interactive Graph & Layout Viewports',
      desc: 'Implement SVG/Canvas visualization engines with hardware acceleration and independent scroll containers.',
      cmd: '# Setup ReactFlow/canvas viewports with independent overflow-y-auto',
    },
    {
      num: 8,
      title: 'API Endpoints & Serverless Handlers',
      desc: 'Deploy serverless API handlers with strict CORS and parameter validation.',
      cmd: '# Configure /api routes',
    },
    {
      num: 9,
      title: 'Security Hardening & Token Protection',
      desc: 'Enforce AES-GCM encryption for user secrets and sanitize untrusted user inputs.',
      cmd: '# Implement crypto service and prompt delimiters',
    },
    {
      num: 10,
      title: 'Automated Testing & Production Compilation',
      desc: 'Run test suites and build the optimized production distribution.',
      cmd: 'npx vitest run && npm run build',
    },
  ];

  const p = phases[phase - 1];
  return `### Phase ${p.num}: ${p.title}
${p.desc}

\`\`\`bash
${p.cmd}
\`\`\`
`;
}
