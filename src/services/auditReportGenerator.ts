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
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 40px; }
    .container { max-width: 900px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
    .header { border-b: 2px solid #e2e8f0; padding-bottom: 24px; margin-bottom: 32px; display: flex; justify-content: space-between; align-items: center; }
    .title { font-size: 28px; font-weight: 800; color: #0f172a; margin: 0; }
    .subtitle { font-size: 14px; color: #64748b; margin-top: 4px; }
    .badge { background: #eff6ff; color: #2563eb; padding: 6px 14px; border-radius: 20px; font-weight: 600; font-size: 13px; }
    .score-card { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 24px; border-radius: 14px; text-align: center; margin-bottom: 32px; }
    .score-num { font-size: 48px; font-weight: 900; margin: 0; }
    .score-label { font-size: 14px; opacity: 0.9; text-transform: uppercase; letter-spacing: 1px; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 32px; }
    .metric { background: #f1f5f9; padding: 18px; border-radius: 12px; text-align: center; }
    .metric-val { font-size: 24px; font-weight: 700; color: #0f172a; }
    .metric-name { font-size: 12px; color: #64748b; text-transform: uppercase; margin-top: 4px; }
    h2 { font-size: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-top: 32px; color: #0f172a; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { text-align: left; padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
    th { background: #f8fafc; font-weight: 600; color: #475569; }
    .tag { display: inline-block; background: #e2e8f0; color: #334155; padding: 2px 8px; border-radius: 6px; font-size: 12px; margin-right: 6px; }
    .severity-high { color: #dc2626; font-weight: 600; }
    .severity-medium { color: #d97706; font-weight: 600; }
    .footer { margin-top: 48px; border-t: 1px solid #e2e8f0; padding-top: 20px; text-align: center; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1 class="title">Architectural Audit Report</h1>
        <div class="subtitle">Repository: <strong>${reportData.repoName}</strong> | Date: ${dateStr}</div>
      </div>
      <div class="badge">DomoScope Intelligence</div>
    </div>

    <div class="score-card">
      <div class="score-num">${reportData.healthScore} / 100</div>
      <div class="score-label">Overall Codebase Health & Quality Score</div>
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
        <div class="metric-name">Security Vulnerabilities</div>
      </div>
    </div>

    <h2>Complexity & Maintainability Distribution</h2>
    <p>Hotspot breakdown across codebase modules based on coupling degree and file size:</p>
    <ul>
      <li><strong style="color: #16a34a;">Green (Optimal / Low Coupling):</strong> ${reportData.complexityDistribution.green} modules</li>
      <li><strong style="color: #d97706;">Yellow (Moderate Coupling):</strong> ${reportData.complexityDistribution.yellow} modules</li>
      <li><strong style="color: #dc2626;">Red (High Complexity / Refactor Hotspot):</strong> ${reportData.complexityDistribution.red} modules</li>
    </ul>

    <h2>Database Schema Overview (${schema.tables.length} Tables)</h2>
    <table>
      <thead>
        <tr><th>Table Name</th><th>Columns</th><th>Schema Provider</th><th>Source File</th></tr>
      </thead>
      <tbody>
        ${schema.tables.map(t => `
          <tr>
            <td><strong>${t.name}</strong></td>
            <td>${t.columns.length} columns</td>
            <td><span class="tag">${t.schemaType}</span></td>
            <td>${t.sourceFile}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <h2>Security Audit Findings (${findings.length} Issues)</h2>
    <table>
      <thead>
        <tr><th>Severity</th><th>Title</th><th>Location</th></tr>
      </thead>
      <tbody>
        ${findings.map(f => `
          <tr>
            <td class="severity-${f.severity}">${f.severity.toUpperCase()}</td>
            <td>${f.title}</td>
            <td>${f.file}:${f.line}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="footer">
      Generated automatically by DomoScope Universal Polyglot Intelligence • Clean Architecture Edition
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

  md += `## 📊 Executive Summary & Key Metrics\n\n`;
  md += `| Metric | Value |\n`;
  md += `| :--- | :--- |\n`;
  md += `| **Overall Health Score** | **${reportData.healthScore} / 100** |\n`;
  md += `| **Total Source Files** | ${reportData.totalFiles} |\n`;
  md += `| **Database Tables & Entities** | ${schema.tables.length} |\n`;
  md += `| **Security Vulnerabilities** | ${findings.length} |\n`;
  md += `| **Primary Technologies** | ${reportData.detectedFrameworks.join(', ') || 'Polyglot'} |\n\n`;

  md += `## ⚡ Complexity & Maintainability Distribution\n\n`;
  md += `- **Optimal (Low Coupling)**: ${reportData.complexityDistribution.green} modules\n`;
  md += `- **Moderate Coupling**: ${reportData.complexityDistribution.yellow} modules\n`;
  md += `- **High Complexity (Refactor Candidates)**: ${reportData.complexityDistribution.red} modules\n\n`;

  md += `## 𝌰 Database Schema & Data Models (${schema.tables.length} Entities)\n\n`;
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

  md += `## 🛡️ Security Audit Findings (${findings.length} Issues)\n\n`;
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
  md += `*Generated automatically by DomoScope Universal Architectural Engine.*\n`;

  return md;
}
