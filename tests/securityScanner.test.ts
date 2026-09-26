import { describe, it, expect } from 'vitest';
import { runSecurityChecks } from '../src/services/securityScanner';

describe('Security Static Scanner', () => {
  it('detects unsafe eval() usage with line and evidence', () => {
    const code = `
      function runScript(input) {
        return eval(input);
      }
    `;

    const findings = runSecurityChecks([{ path: 'src/utils/runner.js', content: code }]);
    expect(findings.length).toBeGreaterThan(0);
    const evalFinding = findings.find((f) => f.title.includes('eval'));
    expect(evalFinding).toBeDefined();
    expect(evalFinding?.file).toBe('src/utils/runner.js');
    expect(evalFinding?.line).toBe(3);
    expect(evalFinding?.severity).toBe('high');
  });

  it('detects dangerous child_process.exec usage', () => {
    const code = `
      const { exec } = require('child_process');
      exec("ls " + userInput);
    `;

    const findings = runSecurityChecks([{ path: 'src/api/shell.js', content: code }]);
    expect(findings.some((f) => f.title.includes('Shell Command'))).toBe(true);
  });

  it('detects hardcoded RSA private keys', () => {
    const code = `
      const key = "-----BEGIN RSA PRIVATE KEY-----\\nMIIEowIBAAKCAQEA...";
    `;

    const findings = runSecurityChecks([{ path: 'src/config/key.pem', content: code }]);
    const keyFinding = findings.find((f) => f.title.includes('Private Key'));
    expect(keyFinding).toBeDefined();
    expect(keyFinding?.severity).toBe('critical');
  });

  it('detects suspicious raw SQL string concatenation', () => {
    const code = `
      const query = "SELECT * FROM users WHERE id = " + userId;
      db.execute(query);
    `;

    const findings = runSecurityChecks([{ path: 'src/db/users.ts', content: code }]);
    const sqlFinding = findings.find((f) => f.title.includes('SQL String Concatenation'));
    expect(sqlFinding).toBeDefined();
    expect(sqlFinding?.line).toBe(2);
  });

  it('returns empty array when source code is clean', () => {
    const cleanCode = `
      export function add(a: number, b: number): number {
        return a + b;
      }
    `;

    const findings = runSecurityChecks([{ path: 'src/math.ts', content: cleanCode }]);
    expect(findings.length).toBe(0);
  });
});
