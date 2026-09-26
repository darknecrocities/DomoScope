import { SecurityFinding } from '../types';

interface SecurityRule {
  id: string;
  title: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  regex: RegExp;
  explanation: string;
  suggestedAction: string;
  fileFilter?: (path: string) => boolean;
}

const SECURITY_RULES: SecurityRule[] = [
  // 1. Private Keys
  {
    id: 'SEC-001',
    title: 'Exposed Private Key',
    category: 'Secrets & Credentials',
    severity: 'critical',
    regex: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/,
    explanation: 'A private cryptographic key block was detected in plain text inside this file.',
    suggestedAction: 'Immediately revoke this key and move private credentials to an environment secret manager.',
  },
  // 2. AWS Access Key
  {
    id: 'SEC-002',
    title: 'Potential Hardcoded AWS Access Key',
    category: 'Secrets & Credentials',
    severity: 'critical',
    regex: /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/,
    explanation: 'An AWS Access Key ID pattern was detected.',
    suggestedAction: 'Store credentials in AWS IAM roles or environment variables instead of source code.',
  },
  // 3. GitHub Token
  {
    id: 'SEC-003',
    title: 'Potential Hardcoded GitHub Token',
    category: 'Secrets & Credentials',
    severity: 'critical',
    regex: /gh[pousr]_[A-Za-z0-9_]{36,}/,
    explanation: 'A GitHub personal access token or OAuth token pattern was found.',
    suggestedAction: 'Revoke this token in GitHub settings and load it via secure server environment variables.',
  },
  // 4. OpenAI / AI API Key
  {
    id: 'SEC-004',
    title: 'Potential Hardcoded OpenAI API Key',
    category: 'Secrets & Credentials',
    severity: 'high',
    regex: /sk-[a-zA-Z0-9]{20,T3BlbkFJ[a-zA-Z0-9]{20,}/,
    explanation: 'An OpenAI API key pattern was detected.',
    suggestedAction: 'Store the API key securely in server-side environment secrets.',
  },
  // 5. Generic Hardcoded Secrets
  {
    id: 'SEC-005',
    title: 'Hardcoded Secret or Password',
    category: 'Secrets & Credentials',
    severity: 'high',
    regex: /(?:password|secret|jwt_secret|api_key|apikey|auth_token)\s*[:=]\s*["'][^"'\s]{8,}["']/i,
    explanation: 'A variable naming a credential or secret appears to be assigned a literal string.',
    suggestedAction: 'Extract sensitive credentials into environment variables (.env) and add to .gitignore.',
    fileFilter: (path) => !path.includes('.test.') && !path.includes('.example') && !path.includes('mock'),
  },
  // 6. Unsafe eval()
  {
    id: 'SEC-006',
    title: 'Unsafe Dynamic Code Execution (eval)',
    category: 'Code Injection',
    severity: 'high',
    regex: /\beval\s*\([^)]+\)/,
    explanation: 'Use of eval() executes arbitrary strings as code, presenting a code injection risk if input is untrusted.',
    suggestedAction: 'Replace eval() with structured parsers like JSON.parse() or specific domain functions.',
  },
  // 7. Dangerous Shell Command Execution
  {
    id: 'SEC-007',
    title: 'Unsafe Shell Command Execution',
    category: 'Command Injection',
    severity: 'high',
    regex: /(?:(?:child_process\.)?exec(?:Sync)?|os\.system|subprocess\.Popen\([^)]*shell\s*=\s*True)\s*\(/,
    explanation: 'Executing system shell commands with concatenated arguments can allow shell command injection.',
    suggestedAction: 'Use argument arrays with execFile or spawn without invoking a shell.',
  },
  // 8. Raw SQL String Concatenation
  {
    id: 'SEC-008',
    title: 'Suspicious SQL String Concatenation',
    category: 'SQL Injection',
    severity: 'high',
    regex: /(?:SELECT|INSERT|UPDATE|DELETE)\s+.*(?:WHERE|VALUES)\s+.*(?:["']\s*\+|\+\s*["']|\$\{)/i,
    explanation: 'Constructing SQL statements via string concatenation can leave the database open to SQL injection.',
    suggestedAction: 'Use parameterized queries, prepared statements ($1, ?), or an ORM.',
  },
  // 9. Unsafe innerHTML
  {
    id: 'SEC-009',
    title: 'Potential Cross-Site Scripting (innerHTML)',
    category: 'Cross-Site Scripting (XSS)',
    severity: 'medium',
    regex: /\.innerHTML\s*=\s*[^;]+/,
    explanation: 'Assigning unescaped content to innerHTML can execute arbitrary script tags.',
    suggestedAction: 'Use textContent, createElement, or sanitize HTML using DOMPurify.',
    fileFilter: (path) => !path.includes('.test.') && !path.includes('.spec.'),
  },
  // 10. React dangerouslySetInnerHTML
  {
    id: 'SEC-010',
    title: 'dangerouslySetInnerHTML Usage',
    category: 'Cross-Site Scripting (XSS)',
    severity: 'medium',
    regex: /dangerouslySetInnerHTML\s*=\s*\{/,
    explanation: 'Rendering unescaped markup with dangerouslySetInnerHTML bypasses React built-in XSS protections.',
    suggestedAction: 'Ensure any rendered markup is validated and sanitized with DOMPurify.',
  },
];

export function runSecurityChecks(files: { path: string; content?: string }[]): SecurityFinding[] {
  const findings: SecurityFinding[] = [];

  for (const file of files) {
    if (!file.content) continue;

    // Skip lockfiles, documentation, and minified bundles
    const p = file.path.toLowerCase();
    if (
      p.endsWith('.lock') ||
      p.endsWith('package-lock.json') ||
      p.endsWith('.min.js') ||
      p.endsWith('.map') ||
      p.endsWith('.md')
    ) {
      continue;
    }

    const lines = file.content.split('\n');

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];

      for (const rule of SECURITY_RULES) {
        if (rule.fileFilter && !rule.fileFilter(file.path)) {
          continue;
        }

        if (rule.regex.test(line)) {
          // Avoid duplicate findings on same line
          const existing = findings.find(
            (f) => f.file === file.path && f.line === lineIndex + 1 && f.id === rule.id
          );
          if (!existing) {
            findings.push({
              id: `${rule.id}-${findings.length + 1}`,
              title: rule.title,
              category: rule.category,
              severity: rule.severity,
              file: file.path,
              line: lineIndex + 1,
              evidence: line.trim().slice(0, 120),
              explanation: rule.explanation,
              suggestedAction: rule.suggestedAction,
            });
          }
        }
      }
    }
  }

  // Sort findings by severity: critical -> high -> medium -> low
  const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return findings;
}
