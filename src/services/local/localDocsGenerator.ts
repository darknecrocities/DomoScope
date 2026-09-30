import fsp from 'node:fs/promises';
import path from 'node:path';
import { LocalAnalysisSnapshot } from './localCacheManager';

export interface GeneratedDocFile {
  relativePath: string;
  path: string;
  title: string;
  content: string;
}

export function generateProjectOverviewDoc(snapshot: LocalAnalysisSnapshot): string {
  const { projectName, metadata, analysis, frameworks, cloudServices, stats } = snapshot;

  const langs = Object.entries(analysis.languages)
    .sort((a, b) => b[1] - a[1])
    .map(([lang, count]) => `- **${lang}**: ${count} files (${Math.round((count / Math.max(1, stats.totalFiles)) * 100)}%)`)
    .join('\n');

  const tools = analysis.detectedTools.length > 0
    ? analysis.detectedTools.map((t) => `\`${t}\``).join(', ')
    : 'None detected';

  const entryPoints = analysis.entryPoints.length > 0
    ? analysis.entryPoints.map((e) => `- \`${e}\``).join('\n')
    : '- `None identified`';

  return `# ${projectName} — Project Overview

> Generated autonomously by DomoScope on ${new Date(snapshot.analyzedAt).toUTCString()}

## 📊 Summary
${analysis.summary}

---

## 🏗️ Architecture & Frameworks
- **Primary Framework**: \`${frameworks.primary?.name || 'Generic / Polyglot'}\`
- **Detected Frameworks**: ${frameworks.allDetected && frameworks.allDetected.length > 0 ? frameworks.allDetected.map((f) => `\`${f}\``).join(', ') : 'None'}
- **Detected Tooling & Build**: ${tools}
- **Detected Cloud & Infra**: ${cloudServices.services.length > 0 ? cloudServices.services.map((s) => `\`${s.name} (${s.category})\``).join(', ') : 'None'}

---

## 📈 File & Codebase Metrics
- **Total Tracked Files**: ${stats.totalFiles.toLocaleString()}
- **Total Directories**: ${stats.totalDirs.toLocaleString()}
- **Total Lines of Code**: ${stats.totalLines.toLocaleString()}
- **Total Size**: ${Math.round(stats.totalBytes / 1024).toLocaleString()} KB
- **Snapshot ID**: \`${snapshot.snapshotId}\`

---

## 🌐 Language Breakdown
${langs || '- No source languages recognized.'}

---

## 🚀 Entry Points
${entryPoints}
`;
}

export function generateArchitectureDoc(snapshot: LocalAnalysisSnapshot): string {
  const { projectName, graph, frameworks } = snapshot;

  const nodeCount = graph.nodes.length;
  const edgeCount = graph.edges.length;

  const topNodes = [...graph.nodes]
    .sort((a, b) => (b.data?.importedByCount || 0) - (a.data?.importedByCount || 0))
    .slice(0, 15)
    .map((n, i) => `${i + 1}. **\`${n.data?.label || n.id}\`** (\`${n.data?.category || 'file'}\`) — Imported by ${n.data?.importedByCount || 0} modules, imports ${n.data?.importsCount || 0}`)
    .join('\n');

  // Simple Mermaid flowchart
  const mermaidEdges = graph.edges
    .slice(0, 50)
    .map((e) => `  "${e.source.replace(/[^a-zA-Z0-9_-]/g, '_')}" --> "${e.target.replace(/[^a-zA-Z0-9_-]/g, '_')}"`)
    .join('\n');

  const mermaidBlock = mermaidEdges.length > 0
    ? `\`\`\`mermaid
flowchart TD
${mermaidEdges}
\`\`\``
    : '_No explicit module import edges detected._';

  return `# ${projectName} — Architecture & Module Dependency Guide

## 🏛️ High-Level Structure
- **Architecture Style**: ${frameworks.primary?.name ? `${frameworks.primary.name} Application Architecture` : 'Modular Codebase'}
- **Total Dependency Graph Nodes**: ${nodeCount}
- **Total Directed Import Edges**: ${edgeCount}

---

## 🔑 Core & Most-Referenced Modules
${topNodes || '- No nodes indexed.'}

---

## 🗺️ Visual Module Dependency Flowchart (Top 50 Edges)
${mermaidBlock}
`;
}

export function generateDatabaseDoc(snapshot: LocalAnalysisSnapshot): string {
  const { projectName, database } = snapshot;

  if (database.tables.length === 0) {
    return `# ${projectName} — Database & Entity Documentation\n\n_No database schemas, Prisma models, SQL tables, or domain entities were detected in this codebase._\n`;
  }

  const tableSections = database.tables.map((table) => {
    const cols = table.columns
      .map((c) => `| \`${c.name}\` | \`${c.type}\` | ${c.isPrimary ? '🔑 PK' : c.isForeignKey ? '🔗 FK' : '—'} | ${c.isNullable ? 'Yes' : 'No'} | ${c.references ? `\`${c.references.table}.${c.references.column}\`` : '—'} |`)
      .join('\n');

    return `### 📋 Table / Entity: \`${table.name}\` (\`${table.schemaType}\`)
**Source File**: \`${table.sourceFile}\`

| Column | Type | Key | Nullable | References |
|---|---|---|---|---|
${cols}
`;
  }).join('\n\n');

  // Mermaid ERD
  const mermaidRels = database.relationships
    .map((r) => `  ${r.fromTable} ||--o{ ${r.toTable} : "${r.fromColumn} -> ${r.toColumn}"`)
    .join('\n');

  const mermaidERD = mermaidRels.length > 0
    ? `\`\`\`mermaid
erDiagram
${mermaidRels}
\`\`\``
    : '_No explicit or inferred foreign key relationships._';

  return `# ${projectName} — Database & Entity Documentation

## 🗄️ Schema Overview
- **Detected Database Ecosystems**: ${database.detectedTypes.map((t) => `\`${t}\``).join(', ') || 'Custom'}
- **Total Tables / Entities**: ${database.tables.length}
- **Total Relationships**: ${database.relationships.length}

---

## 🔗 Entity Relationship Diagram
${mermaidERD}

---

## 📑 Detailed Entity Definitions
${tableSections}
`;
}

export function generateApiDoc(snapshot: LocalAnalysisSnapshot): string {
  const { projectName, apiRoutes } = snapshot;

  if (apiRoutes.length === 0) {
    return `# ${projectName} — API Route Catalog\n\n_No backend API endpoints, HTTP routes, or serverless handlers were detected._\n`;
  }

  const rows = apiRoutes
    .map((r) => `| \`${r.method}\` | \`${r.path}\` | \`${r.framework}\` | \`${r.file}:${r.line}\` |`)
    .join('\n');

  return `# ${projectName} — API Route Catalog

## 📡 Endpoint Summary
- **Total Discovered Routes**: ${apiRoutes.length}

| Method | Endpoint Path | Framework | Source Location |
|---|---|---|---|
${rows}
`;
}

export function generateSecurityDoc(snapshot: LocalAnalysisSnapshot): string {
  const { projectName, securityFindings } = snapshot;

  const countBySeverity = {
    critical: securityFindings.filter((f) => f.severity === 'critical').length,
    high: securityFindings.filter((f) => f.severity === 'high').length,
    medium: securityFindings.filter((f) => f.severity === 'medium').length,
    low: securityFindings.filter((f) => f.severity === 'low').length,
  };

  const findingsList = securityFindings.length > 0
    ? securityFindings.map((f, i) => `### ${i + 1}. [${f.severity.toUpperCase()}] ${f.title}
- **Category**: \`${f.category}\`
- **Location**: \`${f.file}:${f.line}\`
- **Explanation**: ${f.explanation}
- **Remediation**: ${f.suggestedAction}
`).join('\n\n')
    : '_Zero security vulnerabilities or leaked secrets detected._';

  return `# ${projectName} — Security Audit Report

## 🛡️ Scan Overview
- **Critical**: ${countBySeverity.critical}
- **High**: ${countBySeverity.high}
- **Medium**: ${countBySeverity.medium}
- **Low**: ${countBySeverity.low}

---

## 🔍 Detailed Findings
${findingsList}
`;
}

/**
 * Generates all structured project documentation files and writes them to the specified output directory.
 */
export async function generateAndSaveDocumentation(
  snapshot: LocalAnalysisSnapshot,
  outputDir: string
): Promise<GeneratedDocFile[]> {
  const resolvedOut = path.resolve(outputDir);
  await fsp.mkdir(resolvedOut, { recursive: true });

  const docs: GeneratedDocFile[] = [
    { relativePath: 'PROJECT_OVERVIEW.md', path: 'PROJECT_OVERVIEW.md', title: 'Project Overview', content: generateProjectOverviewDoc(snapshot) },
    { relativePath: 'ARCHITECTURE.md', path: 'ARCHITECTURE.md', title: 'Architecture & Dependencies', content: generateArchitectureDoc(snapshot) },
    { relativePath: 'DATABASE.md', path: 'DATABASE.md', title: 'Database & Entities', content: generateDatabaseDoc(snapshot) },
    { relativePath: 'API_REFERENCE.md', path: 'API_REFERENCE.md', title: 'API Reference', content: generateApiDoc(snapshot) },
    { relativePath: 'SECURITY_AUDIT.md', path: 'SECURITY_AUDIT.md', title: 'Security Audit', content: generateSecurityDoc(snapshot) },
    { relativePath: 'REVERSE_ENGINEER_SPEC.md', path: 'REVERSE_ENGINEER_SPEC.md', title: 'Reverse Engineering Specification', content: snapshot.reverseEngineer.overview || 'Specification generated.' },
    { relativePath: 'SKILL.md', path: 'SKILL.md', title: 'Autonomous AI Agent Skill Definition', content: snapshot.reverseEngineer.agentSkill || snapshot.reverseEngineer.overview || 'Skill definition generated.' },
  ];

  for (const doc of docs) {
    const fullPath = path.join(resolvedOut, doc.relativePath);
    await fsp.writeFile(fullPath, doc.content, 'utf8');
  }

  return docs;
}

export const generateLocalDocs = (snapshot: LocalAnalysisSnapshot, opts: { outputDir: string }) =>
  generateAndSaveDocumentation(snapshot, opts.outputDir);

