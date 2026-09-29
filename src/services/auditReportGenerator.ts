import { AuditReportData, DatabaseSchema, SecurityFinding } from '../types';

export function generateAuditReportHtml(
  reportData: AuditReportData,
  schema: DatabaseSchema,
  findings: SecurityFinding[]
): string {
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>DomoScope Architectural Audit Report - ${reportData.repoName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #18181b; margin: 0; padding: 40px; }
    .container { max-width: 900px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #e4e4e7; }
    .header { border-bottom: 2px solid #e4e4e7; padding-bottom: 24px; margin-bottom: 32px; display: flex; justify-content: space-between; align-items: center; }
    .title { font-size: 26px; font-weight: 800; color: #09090b; margin: 0; letter-spacing: -0.5px; }
    .subtitle { font-size: 13px; color: #71717a; margin-top: 4px; font-family: monospace; }
    .badge { background: #18181b; color: #ffffff; padding: 6px 14px; border-radius: 8px; font-weight: 600; font-size: 12px; font-family: monospace; }
    .score-card { background: #09090b; color: white; padding: 28px; border-radius: 14px; text-align: center; margin-bottom: 32px; }
    .score-num { font-size: 48px; font-weight: 900; margin: 0; font-family: monospace; }
    .score-label { font-size: 12px; opacity: 0.8; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; font-family: monospace; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 32px; }
    .metric { background: #f4f4f5; padding: 18px; border-radius: 12px; text-align: center; border: 1px solid #e4e4e7; }
    .metric-val { font-size: 24px; font-weight: 800; color: #09090b; font-family: monospace; }
    .metric-name { font-size: 11px; color: #71717a; text-transform: uppercase; margin-top: 4px; font-family: monospace; font-weight: 600; }
    h2 { font-size: 18px; font-weight: 700; border-bottom: 1px solid #e4e4e7; padding-bottom: 8px; margin-top: 32px; color: #09090b; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #f4f4f5; font-size: 13px; }
    th { background: #f4f4f5; font-weight: 600; color: #52525b; font-family: monospace; font-size: 12px; }
    .tag { display: inline-block; background: #e4e4e7; color: #27272a; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-family: monospace; margin-right: 6px; }
    .severity-critical { color: #b91c1c; font-weight: 700; font-family: monospace; }
    .severity-high { color: #dc2626; font-weight: 700; font-family: monospace; }
    .severity-medium { color: #d97706; font-weight: 600; font-family: monospace; }
    .severity-low { color: #52525b; font-weight: 600; font-family: monospace; }
    .footer { margin-top: 48px; border-top: 1px solid #e4e4e7; padding-top: 20px; text-align: center; font-size: 11px; color: #a1a1aa; font-family: monospace; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1 class="title">Architectural Audit Report</h1>
        <div class="subtitle">Repository: ${reportData.repoName} | Date: ${dateStr}</div>
      </div>
      <div class="badge">DomoScope Intelligence</div>
    </div>

    <div class="score-card">
      <div class="score-num">${reportData.healthScore} / 100</div>
      <div class="score-label">Overall Codebase Health and Quality Score</div>
    </div>

    <div class="grid">
      <div class="metric">
        <div class="metric-val">${reportData.totalFiles}</div>
        <div class="metric-name">Total Index Files</div>
      </div>
      <div class="metric">
        <div class="metric-val">${schema.tables.length}</div>
        <div class="metric-name">Database Tables</div>
      </div>
      <div class="metric">
        <div class="metric-val">${findings.length}</div>
        <div class="metric-name">Security Findings</div>
      </div>
    </div>

    <h2>Complexity and Maintainability Distribution</h2>
    <p style="font-size: 13px; color: #52525b;">Hotspot breakdown across codebase modules based on coupling degree and file size:</p>
    <ul style="font-size: 13px; line-height: 1.8;">
      <li><strong>Low Coupling (Optimal):</strong> ${reportData.complexityDistribution.green} modules</li>
      <li><strong>Moderate Coupling:</strong> ${reportData.complexityDistribution.yellow} modules</li>
      <li><strong>High Complexity (Refactor Candidate):</strong> ${reportData.complexityDistribution.red} modules</li>
    </ul>

    <h2>Database Schema Overview (${schema.tables.length} Tables)</h2>
    <table>
      <thead>
        <tr><th>Table Name</th><th>Columns</th><th>Schema Provider</th><th>Source File</th></tr>
      </thead>
      <tbody>
        ${schema.tables.length > 0 ? schema.tables.map(t => `
          <tr>
            <td><strong>${t.name}</strong></td>
            <td>${t.columns.length} columns</td>
            <td><span class="tag">${t.schemaType}</span></td>
            <td><code>${t.sourceFile}</code></td>
          </tr>
        `).join('') : `<tr><td colspan="4" style="color: #71717a;">No database tables detected in scanned files.</td></tr>`}
      </tbody>
    </table>

    <h2>Security Audit Findings (${findings.length} Issues)</h2>
    <table>
      <thead>
        <tr><th>Severity</th><th>Title</th><th>Location</th></tr>
      </thead>
      <tbody>
        ${findings.length > 0 ? findings.map(f => `
          <tr>
            <td class="severity-${f.severity}">${f.severity.toUpperCase()}</td>
            <td>${f.title}</td>
            <td><code>${f.file}:${f.line}</code></td>
          </tr>
        `).join('') : `<tr><td colspan="3" style="color: #16a34a;">No potential security vulnerabilities detected.</td></tr>`}
      </tbody>
    </table>

    <div class="footer">
      Generated automatically by DomoScope Architectural Intelligence
    </div>
  </div>
</body>
</html>`;
}

export function generateAuditReportMarkdown(
  reportData: AuditReportData,
  schema: DatabaseSchema,
  findings: SecurityFinding[]
): string {
  const dateStr = new Date().toISOString().split('T')[0];

  let md = `# Architectural Audit Report: ${reportData.repoName}\n\n`;
  md += `> **Audit Score**: **${reportData.healthScore} / 100** | **Generated Date**: ${dateStr} | **Engine**: DomoScope Intelligence\n\n`;

  md += `## Executive Summary and Key Metrics\n\n`;
  md += `| Metric | Value |\n`;
  md += `| :--- | :--- |\n`;
  md += `| **Overall Health Score** | **${reportData.healthScore} / 100** |\n`;
  md += `| **Total Source Files** | ${reportData.totalFiles} |\n`;
  md += `| **Database Tables and Entities** | ${schema.tables.length} |\n`;
  md += `| **Security Findings** | ${findings.length} |\n`;
  md += `| **Primary Technologies** | ${reportData.detectedFrameworks.join(', ') || 'Polyglot'} |\n\n`;

  md += `## Complexity and Maintainability Distribution\n\n`;
  md += `- **Optimal (Low Coupling)**: ${reportData.complexityDistribution.green} modules\n`;
  md += `- **Moderate Coupling**: ${reportData.complexityDistribution.yellow} modules\n`;
  md += `- **High Complexity (Refactor Candidates)**: ${reportData.complexityDistribution.red} modules\n\n`;

  md += `## Database Schema and Data Models (${schema.tables.length} Entities)\n\n`;
  if (schema.tables.length > 0) {
    md += `| Entity / Table Name | Column Count | Schema Type | Source File |\n`;
    md += `| :--- | :--- | :--- | :--- |\n`;
    schema.tables.forEach((t) => {
      md += `| \`${t.name}\` | ${t.columns.length} cols | \`${t.schemaType}\` | \`${t.sourceFile}\` |\n`;
    });
    md += `\n`;
  } else {
    md += `*No database tables or domain models detected in scanned files.*\n\n`;
  }

  md += `## Security Audit Findings (${findings.length} Issues)\n\n`;
  if (findings.length > 0) {
    md += `| Severity | Title | File Location | Evidence |\n`;
    md += `| :--- | :--- | :--- | :--- |\n`;
    findings.forEach((f) => {
      md += `| **${f.severity.toUpperCase()}** | ${f.title} | \`${f.file}:${f.line}\` | \`${f.evidence.slice(0, 40)}\` |\n`;
    });
    md += `\n`;
  } else {
    md += `*No potential security vulnerabilities detected in scanned source code.*\n\n`;
  }

  md += `---\n`;
  md += `*Generated automatically by DomoScope Architectural Intelligence.*\n`;

  return md;
}
