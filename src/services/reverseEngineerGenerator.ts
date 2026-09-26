import {
  RepoAnalysis,
  RepoFile,
  DatabaseSchema,
  RepoDependency,
} from '../types';

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
  if (category === 'agent_skill') {
    return generateAgentSkillPack(repoName, analysis, files, databaseSchema, dependencies);
  }

  const dateStr = new Date().toISOString().split('T')[0];
  const primaryLang = analysis?.metadata.language || 'TypeScript';
  const totalFiles = files.length;
  const entryPoints = analysis?.entryPoints || [];
  const detectedFrameworks = analysis?.detectedTools || [];

  // Group files by type
  const components = files.filter((f) => f.category === 'component');
  const services = files.filter((f) => f.category === 'service' || f.category === 'api');
  const dbFiles = files.filter((f) => f.category === 'database');
  const styles = files.filter((f) => f.category === 'style');
  const configs = files.filter((f) => f.category === 'config');

  let md = `# Reverse Engineering Specification: ${repoName}\n\n`;
  md += `> **Category**: \`${category.toUpperCase()}\` | **Target Project**: ${repoName} | **Date**: ${dateStr}\n`;
  md += `> *Use this blueprint to replicate or adapt the architecture into your own project.*\n\n`;

  if (category === 'fullstack') {
    md += `## 1. Project High-Level Architecture\n\n`;
    md += `- **Primary Ecosystem**: ${primaryLang}\n`;
    md += `- **Detected Frameworks**: ${detectedFrameworks.join(', ') || 'Standard Web Stack'}\n`;
    md += `- **Total Files**: ${totalFiles} scanned source files\n`;
    md += `- **Entry Points**: ${entryPoints.map((e) => `\`${e}\``).join(', ') || 'N/A'}\n\n`;

    md += `### 1.1 Directory Structure & File Map\n\n`;
    md += `\`\`\`text\n`;
    md += `${repoName}/\n`;
    const topDirs = Array.from(new Set(files.map((f) => f.path.split('/')[0])));
    topDirs.slice(0, 15).forEach((dir) => {
      const dirFiles = files.filter((f) => f.path.startsWith(dir + '/'));
      md += `├── ${dir}/ (${dirFiles.length} files)\n`;
    });
    md += `\`\`\`\n\n`;

    md += `## 2. Core Subsystems Breakdown\n\n`;
    md += `### 2.1 UI/UX Layer\n`;
    md += `- **Design Aesthetics**: Strict monochrome dark/light system, responsive flex containers.\n`;
    md += `- **Key Component Files**: ${components.slice(0, 8).map((c) => `\`${c.path}\``).join(', ') || 'N/A'}\n\n`;

    md += `### 2.2 Backend & Services\n`;
    md += `- **Service Modules**: ${services.slice(0, 8).map((s) => `\`${s.path}\``).join(', ') || 'N/A'}\n\n`;

    md += `### 2.3 Database & State\n`;
    md += `- **Tables Count**: ${databaseSchema?.tables.length || 0} entities\n`;
    md += `- **Primary Schema Provider**: ${databaseSchema?.tables[0]?.schemaType || 'Inferred Domain Models'}\n\n`;
  }

  if (category === 'ui_ux') {
    md += `## 🎨 UI/UX & Design System Architecture\n\n`;
    md += `### 1. Color System & Aesthetics\n`;
    md += `- **Palette**: High-contrast monochrome (Black \`#09090b\` / White \`#ffffff\` / Zinc \`#71717a\`).\n`;
    md += `- **Borders & Cards**: Crisp 1px solid borders (\`border-zinc-200\` / \`border-zinc-800\`), subtle micro-shadows (\`shadow-xs\`).\n`;
    md += `- **Typography**: System Inter stack (\`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto\`).\n\n`;

    md += `### 2. Layout Structure & Sticky Boundaries\n`;
    md += `- **Main Layout Window**: Locked to \`h-screen overflow-hidden flex flex-col\`.\n`;
    md += `- **Sidebar Rule**: Sidebar fixed with \`sticky top-0 h-[calc(100vh-3.25rem)] overflow-y-auto\`.\n`;
    md += `- **Content Viewport**: Main panel with \`flex-1 h-full overflow-y-auto\` for independent scrolling.\n\n`;

    md += `### 3. Component Hierarchy (${components.length} UI Components)\n\n`;
    components.forEach((comp) => {
      md += `#### \`${comp.name}\` (\`${comp.path}\`)\n`;
      md += `- **Role**: Component building block\n`;
      md += `- **Size**: ${comp.size || 0} bytes\n\n`;
    });
  }

  if (category === 'frontend') {
    md += `## 💻 Frontend Component & State Architecture\n\n`;
    md += `### 1. Component Map (${components.length} Components Found)\n\n`;
    md += `| Component Name | File Path | Category |\n`;
    md += `| :--- | :--- | :--- |\n`;
    components.forEach((comp) => {
      md += `| \`${comp.name}\` | \`${comp.path}\` | \`${comp.category}\` |\n`;
    });
    md += `\n`;

    md += `### 2. State & Data Flow\n`;
    md += `- Custom Hooks / State containers detected across key component routes.\n`;
    md += `- Props contract pattern with strict TypeScript interface signatures.\n\n`;

    md += `### 3. Styles & Asset Bundling\n`;
    styles.forEach((s) => {
      md += `- Style entry: \`${s.path}\`\n`;
    });
    md += `\n`;
  }

  if (category === 'backend') {
    md += `## ⚙️ Backend API & Services Architecture\n\n`;
    md += `### 1. Service Layer & Controllers (${services.length} Services Found)\n\n`;
    md += `| Service Name | File Location | Complexity |\n`;
    md += `| :--- | :--- | :--- |\n`;
    services.forEach((s) => {
      md += `| \`${s.name}\` | \`${s.path}\` | ${s.size ? `${s.size} bytes` : 'Standard'} |\n`;
    });
    md += `\n`;

    md += `### 2. External Integration & Fallback Engines\n`;
    md += `- Rate limiting protection and multi-strategy fetch mechanisms.\n`;
    md += `- Error boundary wrappers and graceful retry strategies.\n\n`;
  }

  if (category === 'database') {
    md += `## 🌁 Database Schema & Domain Entity Specification\n\n`;
    const tables = databaseSchema?.tables || [];
    md += `### 1. Entity Overview (${tables.length} Tables/Models Detected)\n\n`;
    tables.forEach((t) => {
      md += `#### Entity: \`${t.name}\` (Source: \`${t.sourceFile}\` | Type: \`${t.schemaType}\`)\n`;
      md += `| Column / Attribute | Data Type | Key Constraints |\n`;
      md += `| :--- | :--- | :--- |\n`;
      t.columns.forEach((c) => {
        const flags = [];
        if (c.isPrimary) flags.push('PRIMARY KEY');
        if (c.isForeignKey) flags.push(`FK -> ${c.references?.table || 'external'}`);
        if (!c.isNullable) flags.push('NOT NULL');
        md += `| \`${c.name}\` | \`${c.type}\` | ${flags.join(', ') || 'Standard'} |\n`;
      });
      md += `\n`;
    });

    if (databaseSchema?.relationships.length) {
      md += `### 2. Entity Relationships (${databaseSchema.relationships.length} Relations)\n\n`;
      databaseSchema.relationships.forEach((r) => {
        md += `- \`${r.fromTable}.${r.fromColumn}\` ➔ \`${r.toTable}.${r.toColumn}\` (\`${r.type}\`)\n`;
      });
      md += `\n`;
    }
  }

  md += `---\n`;
  md += `### How to Replicate this Subsystem in Your Project:\n`;
  md += `1. Copy the relevant dependencies listed in the \`Dependencies\` tab.\n`;
  md += `2. Create the file structure outlined above in your project root.\n`;
  md += `3. Or download the **AI Agent SKILL.md Pack** to let an AI assistant build it automatically!\n`;

  return md;
}

export function generateAgentSkillPack(
  repoName: string,
  analysis: RepoAnalysis | null,
  files: RepoFile[],
  databaseSchema: DatabaseSchema | null,
  dependencies: RepoDependency[]
): string {
  const cleanName = repoName.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
  const tables = databaseSchema?.tables || [];
  const primaryLang = analysis?.metadata.language || 'TypeScript';

  return `---
name: clone-${cleanName}-architecture
description: Replicate and reverse-engineer the complete architecture, UI design system, database entities, and service patterns of ${repoName} into any target codebase.
---

# Skill Guide: Replicating ${repoName} Architecture

This skill equips AI agents (Antigravity, Cursor, Claude Code, Copilot) with exact structural blueprints, design guidelines, entity definitions, and step-by-step instructions to clone or adapt ${repoName}'s architecture.

## 1. System Overview & Tech Stack
- **Target Repository**: \`${repoName}\`
- **Primary Language**: ${primaryLang}
- **Detected Frameworks**: ${analysis?.detectedTools.join(', ') || 'Web Technologies'}
- **Total Source Files**: ${files.length}

## 2. Key Architectural Rules & Constraints
1. **Design System**: Use strict monochrome grayscale (Black \`#09090b\`, White \`#ffffff\`, Zinc/Slate accents). Avoid distracting bright background colors.
2. **Sticky Sidebar Layout**: Window scroll must be locked (\`h-screen overflow-hidden flex flex-col\`). Main content panel scrolls independently (\`overflow-y-auto\`).
3. **Data Safety & Fallbacks**: Implement defensive null-checks and multi-tiered fallback strategies for external API rate limits or network failures.
4. **Clean Layering**: Keep UI components decoupled from data fetching. Wrap data processing in dedicated services under \`src/services/\` or \`lib/services/\`.

## 3. Core Directory Layout to Recreate
\`\`\`text
src/
├── components/          # Reusable UI components & modals
│   ├── layout/          # Sticky Navbar, Sidebar, AppBar
│   └── workspace/       # Feature tab panels & visualization views
├── services/            # API clients, parser engines, fallback drivers
├── types/               # TypeScript interfaces & domain entity schemas
└── pages/               # Main route view containers
\`\`\`

## 4. Key Database Entities (${tables.length} Models)
${tables.map((t) => `
### Model: \`${t.name}\`
Source: \`${t.sourceFile}\` (${t.schemaType})
Columns:
${t.columns.map((c) => `- \`${c.name}\` (${c.type})${c.isPrimary ? ' [PRIMARY KEY]' : ''}`).join('\n')}
`).join('\n')}

## 5. Key Dependencies
\`\`\`json
{
${dependencies.slice(0, 15).map((d) => `  "${d.name}": "${d.version}"`).join(',\n')}
}
\`\`\`

## 6. Prompt for AI Agents to Execute
Copy and paste this prompt to any AI coding assistant to build this feature set:

> "Please initialize a new project using ${primaryLang} and ${analysis?.detectedTools[0] || 'Vite/React'} matching the architecture of ${repoName}. Enforce a strict monochrome black/white/zinc design system, sticky sidebar layout with independent panel scrolling, and the domain database models defined in this skill."
`;
}
