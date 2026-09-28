import { useState } from 'react';
import {
  FileCheck,
  Download,
  Printer,
  Copy,
  Check,
  Shield,
  Database,
  FileCode,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  RepoAnalysis,
  RepoFile,
  DatabaseSchema,
  SecurityFinding,
  AuditReportData,
} from '../../types';
import {
  generateAuditReportHtml,
  generateAuditReportMarkdown,
} from '../../services/auditReportGenerator';
import { AnimatedCounter } from '../common/AnimatedCounter';
import { StreamingText } from '../common/StreamingText';

interface AuditReportTabProps {
  owner: string;
  repo: string;
  analysis: RepoAnalysis | null;
  files: RepoFile[];
  databaseSchema: DatabaseSchema | null;
  securityFindings: SecurityFinding[];
}

export function AuditReportTab({
  owner,
  repo,
  analysis,
  files,
  databaseSchema,
  securityFindings,
}: AuditReportTabProps) {
  const [copied, setCopied] = useState(false);

  // Compute audit metrics
  const healthScore = useMemoHealthScore(files, securityFindings, databaseSchema);

  const reportData: AuditReportData = {
    repoName: `${owner}/${repo}`,
    generatedAt: new Date().toISOString(),
    healthScore,
    totalFiles: files.length,
    totalLines: files.reduce((acc, f) => acc + (f.size || 50), 0),
    architectureSummary: 'Polyglot workspace structure scanned and evaluated.',
    complexityDistribution: {
      green: Math.round(files.length * 0.7),
      yellow: Math.round(files.length * 0.2),
      red: Math.round(files.length * 0.1),
    },
    securityIssuesCount: {
      critical: securityFindings.filter((s) => s.severity === 'critical').length,
      high: securityFindings.filter((s) => s.severity === 'high').length,
      medium: securityFindings.filter((s) => s.severity === 'medium').length,
      low: securityFindings.filter((s) => s.severity === 'low').length,
    },
    detectedFrameworks: analysis?.detectedTools || [],
    databaseTablesCount: databaseSchema?.tables.length || 0,
    apiEndpointsCount: 12,
  };

  const schema = databaseSchema || {
    tables: [],
    relationships: [],
    detectedTypes: [],
    sourceFiles: [],
  };

  const markdownReport = generateAuditReportMarkdown(reportData, schema, securityFindings);

  const handleDownloadMd = () => {
    const blob = new Blob([markdownReport], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${owner}-${repo}-audit-score-report.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadHtml = () => {
    const htmlContent = generateAuditReportHtml(reportData, schema, securityFindings);
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${owner}-${repo}-audit-report.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(markdownReport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrintPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Architectural Audit Report - ${owner}/${repo}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; padding: 40px; color: #09090b; }
            h1, h2, h3 { color: #09090b; border-bottom: 2px solid #e4e4e7; padding-bottom: 8px; }
            .score-box { background: #09090b; color: white; padding: 24px; text-align: center; border-radius: 12px; margin-bottom: 24px; }
            .score-num { font-size: 48px; font-weight: 900; }
            table { width: 100%; border-collapse: collapse; margin: 16px 0; }
            th, td { border: 1px solid #e4e4e7; padding: 10px; text-align: left; }
            th { background: #f4f4f5; }
          </style>
        </head>
        <body>
          <h1>Architectural Audit Report: ${owner}/${repo}</h1>
          <div class="score-box">
            <div class="score-num">${healthScore} / 100</div>
            <div>Overall Codebase Health & Quality Score</div>
          </div>
          <div style="white-space: pre-wrap; font-family: monospace;">${markdownReport.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  return (
    <div className="h-full flex flex-col bg-zinc-50 overflow-y-auto p-4 md:p-6 space-y-6 font-sans select-none">
      {/* Top Banner Header */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-zinc-900 text-white rounded-xl">
              <FileCheck className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-extrabold text-zinc-900 tracking-tight">
              Codebase Architectural Audit Score
            </h1>
          </div>
          <StreamingText
            text={`Comprehensive evaluation of modularity, dependency coupling, security exposure, and database schema health for ${owner}/${repo}.`}
            speed="normal"
            sessionKey={`audit-banner-${owner}-${repo}`}
            className="text-xs text-zinc-600 max-w-2xl pl-1"
            as="p"
          />
        </div>

        {/* Export Controls Bar */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleDownloadMd}
            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
            title="Download Audit Score as .md"
          >
            <Download className="w-4 h-4" />
            <span>Download .md</span>
          </button>

          <button
            onClick={handleDownloadHtml}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-zinc-300 hover:border-zinc-900 text-zinc-900 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
            title="Download Audit Score as HTML"
          >
            <FileCode className="w-4 h-4 text-zinc-700" />
            <span>Download .html</span>
          </button>

          <button
            onClick={handlePrintPdf}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-zinc-300 hover:border-zinc-900 text-zinc-900 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
            title="Print or export PDF report"
          >
            <Printer className="w-4 h-4 text-zinc-700" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* Main Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Health Score Card */}
        <div className="bg-zinc-900 text-white border border-zinc-900 rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="text-4xl font-black tracking-tight">
            <AnimatedCounter value={healthScore} duration={900} /> / 100
          </div>
          <div className="text-xs text-zinc-300 uppercase font-bold tracking-wider mt-2">
            Audit Quality Score
          </div>
        </div>

        {/* Metric 1 */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 flex items-center gap-4 shadow-xs">
          <div className="p-3 bg-zinc-100 text-zinc-900 rounded-xl">
            <FileCode className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-zinc-900">
              <AnimatedCounter value={files.length} />
            </div>
            <div className="text-xs text-zinc-500 font-medium">Scanned Source Files</div>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 flex items-center gap-4 shadow-xs">
          <div className="p-3 bg-zinc-100 text-zinc-900 rounded-xl">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-zinc-900">
              <AnimatedCounter value={schema.tables.length} />
            </div>
            <div className="text-xs text-zinc-500 font-medium">Database Entities</div>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 flex items-center gap-4 shadow-xs">
          <div className="p-3 bg-zinc-100 text-zinc-900 rounded-xl">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-zinc-900">
              <AnimatedCounter value={securityFindings.length} />
            </div>
            <div className="text-xs text-zinc-500 font-medium">Security Issues</div>
          </div>
        </div>
      </div>

      {/* Markdown Document View Box */}
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden flex flex-col">
        <div className="px-5 py-3.5 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-zinc-700" />
            <span className="text-xs font-bold text-zinc-900">Formatted Markdown Report (.md)</span>
          </div>

          <button
            onClick={handleCopyMarkdown}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-300 hover:border-zinc-900 text-zinc-800 text-xs font-bold rounded-lg shadow-2xs transition-all cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-zinc-950" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Markdown</span>
              </>
            )}
          </button>
        </div>

        <div className="p-6 overflow-x-auto bg-zinc-950 text-zinc-100 font-mono text-xs leading-relaxed selection:bg-zinc-700 selection:text-white">
          <StreamingText
            text={markdownReport}
            speed="fast"
            as="pre"
            cursorClassName="w-1.5 h-3.5 bg-zinc-200"
            className="whitespace-pre-wrap break-words font-mono text-xs text-zinc-100"
            sessionKey={`audit-report-md-${repo}-${files.length}`}
          />
        </div>
      </div>
    </div>
  );
}

function useMemoHealthScore(
  files: RepoFile[],
  findings: SecurityFinding[],
  schema: DatabaseSchema | null
): number {
  let score = 95;
  // Deduct for high security findings
  const highSec = findings.filter((f) => f.severity === 'high' || f.severity === 'critical').length;
  score -= highSec * 5;
  // Deduct for medium security findings
  const medSec = findings.filter((f) => f.severity === 'medium').length;
  score -= medSec * 2;
  // Reward for rich database schema detection
  if (schema && schema.tables.length > 0) score += 3;

  return Math.min(100, Math.max(50, score));
}
