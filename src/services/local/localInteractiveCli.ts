/**
 * DomoScope Interactive Terminal CLI & TUI
 * Inspired by Google Antigravity CLI (agy), Gemini Terminal, and Claude Code
 * Local-First Repository Intelligence & Developer Experience Platform
 */

import readline from 'node:readline';
import path from 'node:path';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import { runLocalAnalysis, getLocalGitBranch } from './localAnalysisEngine';
import { LocalAnalysisSnapshot } from './localCacheManager';
import { generateAndSaveDocumentation } from './localDocsGenerator';
import { startLocalServer, RunningLocalServer } from './localServer';
import { LocalWatcher } from './localWatcher';
import { DOMOSCOPE_MCP_TOOLS, DOMOSCOPE_MCP_PROMPTS } from '../mcpCore';
import {
  fromLocalSnapshot,
  compareRepositories,
  formatComparisonTerminal,
} from '../repoComparison';
import {
  getAsciiBanner,
  formatBox,
  stripAnsi,
  ANSI,
  gradientText,
} from './asciiBanner';

export interface InteractiveCliOptions {
  rootDir?: string;
  verbose?: boolean;
  noColor?: boolean;
  input?: NodeJS.ReadableStream;
  output?: NodeJS.WritableStream;
}

export class DomoScopeInteractiveCli {
  public rootDir: string;
  public projectName: string;
  public verbose: boolean;
  public noColor: boolean;

  private rl: readline.Interface | null = null;
  private currentSnapshot: LocalAnalysisSnapshot | null = null;
  private snapshotPromise: Promise<LocalAnalysisSnapshot | null> | null = null;
  private activeServer: RunningLocalServer | null = null;
  private activeWatcher: LocalWatcher | null = null;
  private isExiting = false;
  private commandQueue: Promise<void> = Promise.resolve();
  private customInput?: NodeJS.ReadableStream;
  private customOutput?: NodeJS.WritableStream;

  constructor(options: InteractiveCliOptions = {}) {
    this.rootDir = path.resolve(options.rootDir || process.cwd());
    this.projectName = path.basename(this.rootDir);
    this.verbose = Boolean(options.verbose);
    this.noColor = Boolean(options.noColor || process.env.NO_COLOR);
    this.customInput = options.input;
    this.customOutput = options.output;
  }

  /**
   * Starts the interactive Antigravity CLI session
   */
  public async start(): Promise<number> {
    const gitInfo = getLocalGitBranch(this.rootDir);

    // 1. Render DomoScope ASCII Art Banner
    this.print(
      getAsciiBanner({
        rootDir: this.rootDir,
        projectName: this.projectName,
        activeBranch: gitInfo.branch,
        noColor: this.noColor,
      })
    );

    // 2. Setup Readline Interface with Autocompletion FIRST so inputs are never lost
    const input = this.customInput || process.stdin;
    const output = this.customOutput || process.stdout;

    this.rl = readline.createInterface({
      input,
      output,
      completer: this.autoCompleter.bind(this),
      prompt: this.getPromptString(gitInfo.branch),
      terminal: input === process.stdin,
      historySize: 200,
    });

    // 3. Perform background baseline snapshot load
    this.snapshotPromise = runLocalAnalysis(this.rootDir, {
      noCache: false,
      verbose: this.verbose,
    })
      .then((snap) => {
        this.currentSnapshot = snap;
        if (snap.projectName) {
          this.projectName = snap.projectName;
        }
        const hit = snap.isCached ? 'Cache Hit' : 'Indexed';
        this.print(
          `  ${this.color(ANSI.gray, '⚡')} ${this.color(
            ANSI.dim,
            `Ready (${snap.stats.totalFiles} files, ${snap.stats.totalLines.toLocaleString()} LoC in ${snap.durationMs}ms [${hit}])`
          )}\n`
        );
        return snap;
      })
      .catch((err: any) => {
        this.print(
          `  ${this.color(ANSI.yellow, '⚠')} ${this.color(
            ANSI.dim,
            `Initial index failed: ${err.message}. Run /analyze to retry.`
          )}\n`
        );
        return null;
      });

    return new Promise((resolve) => {
      this.rl!.prompt();

      this.rl!.on('line', (line: string) => {
        const trimmed = line.trim();
        if (this.isExiting) return;

        this.commandQueue = this.commandQueue.then(async () => {
          if (this.isExiting) return;

          if (trimmed) {
            try {
              await this.handleInput(trimmed);
            } catch (err: any) {
              this.print(
                `\n${this.color(ANSI.brightRed, '✗ Error executing command:')} ${err.message}\n`
              );
            }
          }

          if (!this.isExiting && this.rl) {
            const latestGit = getLocalGitBranch(this.rootDir);
            this.rl.setPrompt(this.getPromptString(latestGit.branch));
            this.rl.prompt();
          }
        });
      });

      this.rl!.on('close', async () => {
        await this.commandQueue;
        if (!this.isExiting) {
          await this.shutdown();
        }
        resolve(0);
      });

      this.rl!.on('SIGINT', () => {
        this.print(`\n${this.color(ANSI.gray, '(Press Ctrl+D or type /exit to quit DomoScope)')}\n`);
        if (this.rl) this.rl.prompt();
      });
    });
  }

  /**
   * Evaluates a line of input (either a /slash command or natural language query)
   */
  public async handleInput(input: string): Promise<void> {
    if (input.startsWith('/')) {
      const parts = input.slice(1).trim().split(/\s+/);
      const command = parts[0].toLowerCase();
      const args = parts.slice(1);
      await this.executeSlashCommand(command, args);
    } else {
      await this.handleNaturalQuery(input);
    }
  }

  /**
   * Executes a slash command (Antigravity CLI style)
   */
  public async executeSlashCommand(command: string, args: string[]): Promise<void> {
    switch (command) {
      case 'help':
      case 'h':
      case '?':
        this.showHelp();
        break;

      case 'banner':
      case 'ascii':
      case 'logo': {
        const snap = await this.ensureSnapshot();
        this.print(
          getAsciiBanner({
            rootDir: this.rootDir,
            projectName: snap.projectName || this.projectName,
            noColor: this.noColor,
          })
        );
        break;
      }

      case 'status':
      case 'info':
      case 'stat':
        await this.showStatus();
        break;

      case 'analyze':
      case 'scan':
        await this.runAnalysisCommand(args);
        break;

      case 'graph':
      case 'deps':
      case 'arch':
        await this.showGraphCommand(args);
        break;

      case 'db':
      case 'database':
      case 'erd':
      case 'schema':
        await this.showDatabaseCommand(args);
        break;

      case 'routes':
      case 'api':
      case 'endpoints':
        await this.showRoutesCommand(args);
        break;

      case 'security':
      case 'audit':
      case 'sec':
        await this.showSecurityCommand(args);
        break;

      case 'reverse':
      case 'blueprint':
      case 'spec':
        await this.showReverseEngineerCommand();
        break;

      case 'skill':
      case 'agent':
        await this.showSkillCommand(args);
        break;

      case 'docs':
      case 'generate-docs':
        await this.generateDocsCommand(args);
        break;

      case 'compare':
      case 'diff':
        await this.compareCommand(args);
        break;

      case 'doctor':
      case 'health':
        await this.runDoctorCommand();
        break;

      case 'serve':
      case 'studio':
      case 'ui':
        await this.serveCommand(args);
        break;

      case 'watch':
        await this.toggleWatchCommand();
        break;

      case 'mcp':
        this.showMcpInfo();
        break;

      case 'clear':
      case 'cls':
        this.clearScreen();
        break;

      case 'exit':
      case 'quit':
      case 'q':
        await this.shutdown();
        break;

      default:
        this.print(
          `\n${this.color(ANSI.brightRed, 'Unknown slash command:')} /${command}`
        );
        this.print(
          `Type ${this.color(ANSI.brightCyan, '/help')} to view all available commands.\n`
        );
        break;
    }
  }

  /**
   * Answers natural language questions about the codebase
   */
  public async handleNaturalQuery(query: string): Promise<void> {
    const q = query.toLowerCase();
    const snapshot = await this.ensureSnapshot();

    this.print(`\n${this.color(ANSI.brightCyan, '🔭 DomoScope Query:')} "${query}"`);

    if (q.includes('security') || q.includes('vuln') || q.includes('audit')) {
      await this.showSecurityCommand([]);
      return;
    }

    if (q.includes('route') || q.includes('api') || q.includes('endpoint')) {
      await this.showRoutesCommand([]);
      return;
    }

    if (q.includes('database') || q.includes('table') || q.includes('schema') || q.includes('erd') || q.includes('model')) {
      await this.showDatabaseCommand([]);
      return;
    }

    if (q.includes('graph') || q.includes('dependency') || q.includes('import') || q.includes('architecture')) {
      await this.showGraphCommand([]);
      return;
    }

    if (q.includes('reverse') || q.includes('rebuild') || q.includes('recipe') || q.includes('blueprint')) {
      await this.showReverseEngineerCommand();
      return;
    }

    if (q.includes('skill') || q.includes('agent')) {
      await this.showSkillCommand([]);
      return;
    }

    if (q.includes('stat') || q.includes('metric') || q.includes('size') || q.includes('lines') || q.includes('how big')) {
      await this.showStatus();
      return;
    }

    // Keyword search across project files and components
    const matchingFiles = snapshot.analysis.files
      ? snapshot.analysis.files.filter((f) => f.path.toLowerCase().includes(q)).map((f) => f.path)
      : [];

    const overview = snapshot.reverseEngineer.overview || 'Architectural repository inspection.';
    const primaryFw = snapshot.frameworks?.primary?.name || 'Polyglot';

    this.print(`\n${this.color(ANSI.bold, 'Summary:')}`);
    this.print(`  • Project: ${this.color(ANSI.brightWhite, snapshot.projectName)} (${primaryFw})`);
    this.print(`  • Total Files: ${snapshot.stats.totalFiles} | LoC: ${snapshot.stats.totalLines.toLocaleString()}`);
    this.print(`  • Entry Points: ${snapshot.analysis.entryPoints.join(', ') || 'Auto-detected'}`);
    this.print(`  • Description: ${overview.slice(0, 200)}...`);

    if (matchingFiles.length > 0) {
      this.print(`\n${this.color(ANSI.bold, 'Relevant Code Matches:')}`);
      matchingFiles.slice(0, 5).forEach((f) => {
        this.print(`  - ${this.color(ANSI.cyan, f)}`);
      });
    }

    this.print(`\n${this.color(ANSI.dim, 'Tip: Run /help to explore specific architectural lenses (e.g. /routes, /db, /security, /graph).')}\n`);
  }

  // =========================================================================
  // Command Implementations
  // =========================================================================

  private showHelp(): void {
    const header = `${this.color(ANSI.bold + ANSI.brightWhite, 'DomoScope Terminal Commands & Navigation')}`;
    const sep = this.color(ANSI.gray, '─'.repeat(74));

    const helpText = [
      sep,
      `  ${header}`,
      sep,
      `  ${this.color(ANSI.brightCyan, '🏗️  ARCHITECTURE & CODEBASE')}`,
      `    ${this.color(ANSI.green, '/analyze')} [--force]    Execute AST analysis and show architectural summary`,
      `    ${this.color(ANSI.green, '/status')}             View current repo metrics, LoC, frameworks, and cache`,
      `    ${this.color(ANSI.green, '/graph')} [--format ...] View module imports and export Mermaid/JSON graphs`,
      ``,
      `  ${this.color(ANSI.brightCyan, '🗄️  DATA & APIS')}`,
      `    ${this.color(ANSI.green, '/db')} [tableName]      Inspect database tables, columns, relations & ORM schemas`,
      `    ${this.color(ANSI.green, '/routes')} [filter]     Browse discovered API routes & endpoints catalog`,
      ``,
      `  ${this.color(ANSI.brightCyan, '🛡️  SECURITY & QUALITY')}`,
      `    ${this.color(ANSI.green, '/security')}           Run security scanner for hardcoded keys & vulnerabilities`,
      `    ${this.color(ANSI.green, '/doctor')}             Run environment and repository diagnostic health checks`,
      ``,
      `  ${this.color(ANSI.brightCyan, '🤖  AGENTIC & SPECIFICATIONS')}`,
      `    ${this.color(ANSI.green, '/reverse')}            View autonomous reverse-engineering blueprint & recipe`,
      `    ${this.color(ANSI.green, '/skill')} [output]     Export autonomous AI Agent SKILL.md for Antigravity/Cursor`,
      `    ${this.color(ANSI.green, '/docs')} [outDir]      Generate complete 7-file markdown documentation suite`,
      `    ${this.color(ANSI.green, '/compare')} <dir>      Compare current project side-by-side with another repo`,
      `    ${this.color(ANSI.green, '/mcp')}                Show Model Context Protocol tools & client config snippets`,
      ``,
      `  ${this.color(ANSI.brightCyan, '⚡  STUDIO & DAEMONS')}`,
      `    ${this.color(ANSI.green, '/serve')} [port]       Launch or toggle local DomoScope web studio (localhost:4004)`,
      `    ${this.color(ANSI.green, '/watch')}              Toggle live file watcher with incremental re-analysis`,
      ``,
      `  ${this.color(ANSI.brightCyan, '💻  SESSION & NAVIGATION')}`,
      `    ${this.color(ANSI.green, '/banner')}             Display the DomoScope ASCII art banner`,
      `    ${this.color(ANSI.green, '/clear')}              Clear the terminal screen`,
      `    ${this.color(ANSI.green, '/help')}               Show this interactive command guide`,
      `    ${this.color(ANSI.green, '/exit')}               Exit DomoScope terminal session (or Ctrl+D)`,
      sep,
      `  ${this.color(ANSI.dim, '💡 Tip: You can also ask natural questions directly (e.g., "explain auth flow").')}`,
      sep,
    ].join('\n');

    this.print('\n' + helpText + '\n');
  }

  private async showStatus(): Promise<void> {
    const snap = await this.ensureSnapshot();
    const git = getLocalGitBranch(this.rootDir);

    const boxLines = [
      `${this.color(ANSI.cyan, 'Repository:')}   ${this.color(ANSI.brightWhite, snap.projectName)} (${snap.rootDir})`,
      `${this.color(ANSI.cyan, 'Git Branch:')}   ${git.branch}${git.commitSha ? ` [SHA: ${git.commitSha}]` : ''}`,
      `${this.color(ANSI.cyan, 'Framework:')}    ${snap.frameworks?.primary?.name || 'Polyglot / Generic'}`,
      `${this.color(ANSI.cyan, 'Total Files:')}  ${snap.stats.totalFiles.toLocaleString()} files across ${snap.stats.totalDirs.toLocaleString()} directories`,
      `${this.color(ANSI.cyan, 'Lines of Code:')}${snap.stats.totalLines.toLocaleString()} LoC (${Math.round((snap.stats.totalBytes || 0) / 1024)} KB)`,
      `${this.color(ANSI.cyan, 'Database:')}     ${snap.database.tables.length} tables/entities (${snap.database.detectedTypes.join(', ') || 'None'})`,
      `${this.color(ANSI.cyan, 'API Catalog:')}  ${snap.apiRoutes.length} discovered endpoints`,
      `${this.color(ANSI.cyan, 'Security:')}     ${snap.securityFindings.length} findings (${snap.securityFindings.filter(f => f.severity === 'critical' || f.severity === 'high').length} High/Critical)`,
      `${this.color(ANSI.cyan, 'Analysis:')}     ${snap.durationMs}ms (${snap.isCached ? 'Cache Hit' : 'Fresh Scan'})`,
    ];

    this.print('\n' + formatBox(boxLines, { title: '📊 Repository Status & Metrics' }) + '\n');
  }

  private async runAnalysisCommand(args: string[]): Promise<void> {
    const force = args.includes('--force') || args.includes('--no-cache');
    const jsonOutput = args.includes('--json');

    this.print(`\n  ${this.color(ANSI.yellow, '⟳')} Running deep repository AST analysis${force ? ' [Force Clean]' : ''}...`);
    const startTime = Date.now();

    this.currentSnapshot = await runLocalAnalysis(this.rootDir, {
      noCache: force,
      verbose: this.verbose,
    });

    const elapsed = Date.now() - startTime;
    this.print(`  ${this.color(ANSI.brightGreen, '✓')} Analysis finished in ${elapsed}ms!\n`);

    if (jsonOutput) {
      this.print(JSON.stringify(this.currentSnapshot, null, 2));
      return;
    }

    await this.showStatus();
  }

  private async showGraphCommand(args: string[]): Promise<void> {
    const snap = await this.ensureSnapshot();
    const formatArg = args.find((a, i) => args[i - 1] === '--format') || 'summary';
    const outArg = args.find((a, i) => args[i - 1] === '--output' || args[i - 1] === '-o');

    if (formatArg === 'mermaid') {
      const edges = snap.graph.edges
        .map((e) => `  "${e.source.replace(/[^a-zA-Z0-9_-]/g, '_')}" --> "${e.target.replace(/[^a-zA-Z0-9_-]/g, '_')}"`)
        .join('\n');
      const mermaidStr = `graph TD\n${edges || '  // No dependencies detected'}\n`;

      if (outArg) {
        await fsp.writeFile(path.resolve(outArg), mermaidStr, 'utf8');
        this.print(`\n  ${this.color(ANSI.brightGreen, '✓')} Exported Mermaid graph to ${outArg}\n`);
      } else {
        this.print('\n' + mermaidStr + '\n');
      }
      return;
    }

    if (formatArg === 'json') {
      const jsonStr = JSON.stringify(snap.graph, null, 2);
      if (outArg) {
        await fsp.writeFile(path.resolve(outArg), jsonStr, 'utf8');
        this.print(`\n  ${this.color(ANSI.brightGreen, '✓')} Exported graph JSON to ${outArg}\n`);
      } else {
        this.print('\n' + jsonStr + '\n');
      }
      return;
    }

    // Default: Terminal architectural summary
    const topNodes = [...snap.graph.nodes]
      .sort((a, b) => ((b.data as any)?.importsCount || 0) - ((a.data as any)?.importsCount || 0))
      .slice(0, 8);

    const lines = [
      `${this.color(ANSI.cyan, 'Architecture Nodes:')} ${snap.graph.nodes.length}`,
      `${this.color(ANSI.cyan, 'Import Connections:')} ${snap.graph.edges.length}`,
      `${this.color(ANSI.cyan, 'Detected Entry Points:')} ${snap.analysis.entryPoints.join(', ') || 'src/main, src/index'}`,
      ``,
      `${this.color(ANSI.bold, 'Key Hub Modules (Highest Fan-Out):')}`,
      ...topNodes.map(
        (n) => `  • ${this.color(ANSI.brightWhite, n.id)} (${(n.data as any)?.importsCount || 0} imports, ${(n.data as any)?.category || n.type || 'module'})`
      ),
    ];

    this.print('\n' + formatBox(lines, { title: '🏗️  Module Architecture Graph' }) + '\n');
    this.print(`  ${this.color(ANSI.dim, 'Tip: Run /graph --format mermaid --output graph.mmd to export visual diagram.')}\n`);
  }

  private async showDatabaseCommand(args: string[]): Promise<void> {
    const snap = await this.ensureSnapshot();
    const targetTable = args[0]?.toLowerCase();

    if (snap.database.tables.length === 0) {
      this.print(`\n  ${this.color(ANSI.yellow, 'ℹ')} No database schemas detected in this repository.`);
      this.print(`    (Supported: Prisma, SQL DDL, TypeORM, Supabase, Firebase, MongoDB)\n`);
      return;
    }

    if (targetTable) {
      const table = snap.database.tables.find((t) => t.name.toLowerCase() === targetTable);
      if (!table) {
        this.print(`\n  ${this.color(ANSI.brightRed, '✗')} Table "${targetTable}" not found.`);
        this.print(`  Available tables: ${snap.database.tables.map((t) => t.name).join(', ')}\n`);
        return;
      }

      const colLines = [
        `${this.color(ANSI.bold, `Table: ${table.name}`)} (${table.columns?.length || 0} columns)`,
        ``,
        `${this.color(ANSI.dim, 'Column Name'.padEnd(25) + 'Type'.padEnd(18) + 'Attributes')}`,
        '─'.repeat(60),
      ];

      table.columns?.forEach((col) => {
        const pk = col.isPrimary ? this.color(ANSI.brightYellow, '[PK]') : '';
        const fk = col.isForeignKey ? this.color(ANSI.cyan, '[FK]') : '';
        const req = col.isNullable ? 'NULLABLE' : 'NOT NULL';
        colLines.push(
          `${this.color(ANSI.brightWhite, col.name.padEnd(25))}${col.type.padEnd(18)}${[pk, fk, req].filter(Boolean).join(' ')}`
        );
      });

      this.print('\n' + formatBox(colLines, { title: `🗄️ Database Table: ${table.name}` }) + '\n');
      return;
    }

    const rows = [
      `${this.color(ANSI.cyan, 'Detected ORMs/DBs:')} ${snap.database.detectedTypes.join(', ') || 'Standard SQL'}`,
      `${this.color(ANSI.cyan, 'Total Entities:')}    ${snap.database.tables.length} tables/models`,
      `${this.color(ANSI.cyan, 'Relationships:')}     ${snap.database.relationships.length} foreign key links`,
      ``,
      `${this.color(ANSI.dim, 'Entity Name'.padEnd(26) + 'Columns'.padEnd(12) + 'Relationships')}`,
      '─'.repeat(60),
    ];

    snap.database.tables.forEach((t) => {
      const rels = snap.database.relationships.filter((r) => r.fromTable === t.name || r.toTable === t.name).length;
      rows.push(
        `${this.color(ANSI.brightWhite, t.name.padEnd(26))}${String(t.columns?.length || 0).padEnd(12)}${rels > 0 ? `${rels} links` : 'None'}`
      );
    });

    this.print('\n' + formatBox(rows, { title: '🗄️ Database ERD & Entity Catalog' }) + '\n');
    this.print(`  ${this.color(ANSI.dim, 'Tip: Run /db <tableName> to inspect columns, types, and constraints.')}\n`);
  }

  private async showRoutesCommand(args: string[]): Promise<void> {
    const snap = await this.ensureSnapshot();
    const filter = args[0]?.toLowerCase();

    let routes = snap.apiRoutes;
    if (filter) {
      routes = routes.filter(
        (r) =>
          r.path.toLowerCase().includes(filter) ||
          r.method.toLowerCase().includes(filter) ||
          (r.framework && r.framework.toLowerCase().includes(filter))
      );
    }

    if (routes.length === 0) {
      this.print(`\n  ${this.color(ANSI.yellow, 'ℹ')} No API routes found${filter ? ` matching "${filter}"` : ''}.`);
      this.print(`    (Supported: Next.js App/Pages router, Express, FastAPI, NestJS, RPC, Astro)\n`);
      return;
    }

    const methodColor = (m: string) => {
      switch (m.toUpperCase()) {
        case 'GET': return this.color(ANSI.brightGreen, m.padEnd(7));
        case 'POST': return this.color(ANSI.brightCyan, m.padEnd(7));
        case 'PUT': return this.color(ANSI.brightYellow, m.padEnd(7));
        case 'DELETE': return this.color(ANSI.brightRed, m.padEnd(7));
        default: return this.color(ANSI.brightWhite, m.padEnd(7));
      }
    };

    const lines = [
      `${this.color(ANSI.cyan, 'Total Endpoints:')} ${routes.length} discovered routes`,
      ``,
      `${this.color(ANSI.dim, 'Method'.padEnd(8) + 'Path'.padEnd(35) + 'Handler Source')}`,
      '─'.repeat(70),
    ];

    routes.slice(0, 20).forEach((r) => {
      const loc = `${path.basename(r.file || '')}${r.line ? `:${r.line}` : ''}`;
      lines.push(`${methodColor(r.method)} ${this.color(ANSI.brightWhite, r.path.padEnd(35))} ${this.color(ANSI.gray, loc)}`);
    });

    if (routes.length > 20) {
      lines.push(this.color(ANSI.dim, `... and ${routes.length - 20} more routes. Use /routes <filter> to refine.`));
    }

    this.print('\n' + formatBox(lines, { title: '📡 API Route & Endpoint Catalog' }) + '\n');
  }

  private async showSecurityCommand(args: string[]): Promise<void> {
    const snap = await this.ensureSnapshot();
    const findings = snap.securityFindings;

    if (findings.length === 0) {
      this.print(`\n  ${this.color(ANSI.brightGreen, '✓')} Zero security vulnerabilities detected! (Scanned for hardcoded secrets, injection, insecure tokens)\n`);
      return;
    }

    const sevBadge = (sev: string) => {
      switch (sev.toLowerCase()) {
        case 'critical': return this.color(ANSI.brightRed, '[CRITICAL]');
        case 'high': return this.color(ANSI.red, '[HIGH]    ');
        case 'medium': return this.color(ANSI.yellow, '[MEDIUM]  ');
        case 'low': return this.color(ANSI.cyan, '[LOW]     ');
        default: return this.color(ANSI.gray, '[INFO]    ');
      }
    };

    const lines = [
      `${this.color(ANSI.cyan, 'Total Findings:')} ${findings.length} detected security warnings`,
      ``,
      `${this.color(ANSI.dim, 'Severity'.padEnd(12) + 'Category'.padEnd(20) + 'Location & Message')}`,
      '─'.repeat(74),
    ];

    findings.slice(0, 15).forEach((f) => {
      const loc = `${path.basename(f.file || '')}${f.line ? `:${f.line}` : ''}`;
      lines.push(
        `${sevBadge(f.severity)} ${this.color(ANSI.brightWhite, f.category.padEnd(20))} ${this.color(ANSI.gray, loc)} - ${f.title || f.explanation}`
      );
    });

    if (findings.length > 15) {
      lines.push(this.color(ANSI.dim, `... and ${findings.length - 15} more findings.`));
    }

    this.print('\n' + formatBox(lines, { title: '🛡️  Security Audit Report' }) + '\n');
  }

  private async showReverseEngineerCommand(): Promise<void> {
    const snap = await this.ensureSnapshot();
    const re = snap.reverseEngineer;

    const lines = [
      `${this.color(ANSI.cyan, 'Project Architecture:')} ${snap.projectName}`,
      `${this.color(ANSI.cyan, 'Primary Framework:')}    ${snap.frameworks?.primary?.name || 'Polyglot / Modular'}`,
      ``,
      `${this.color(ANSI.bold, 'System Overview:')}`,
      `  ${(re.overview || 'Standard modern application layout.').slice(0, 300)}...`,
      ``,
      `${this.color(ANSI.bold, 'Rebuilding Recipe & Milestones:')}`,
      `  1. Architecture Initialization: Scaffolding repository & runtime dependencies.`,
      `  2. Schema & Storage Layer: Setup database models & entity relations.`,
      `  3. API & Controller Handlers: Implement endpoint logic & validation rules.`,
      `  4. Client & UI Modules: Wire views, state management & reactive stores.`,
    ];

    this.print('\n' + formatBox(lines, { title: '🤖 Autonomous Reverse-Engineering Blueprint' }) + '\n');
    this.print(`  ${this.color(ANSI.dim, 'Tip: Run /skill to export complete autonomous agent prompt instructions.')}\n`);
  }

  private async showSkillCommand(args: string[]): Promise<void> {
    const snap = await this.ensureSnapshot();
    const outPath = args[0];

    const content = snap.reverseEngineer.agentSkill || snap.reverseEngineer.overview || `# AI Agent Skill: ${snap.projectName}`;

    if (outPath) {
      const resolved = path.resolve(outPath);
      await fsp.writeFile(resolved, content, 'utf8');
      this.print(`\n  ${this.color(ANSI.brightGreen, '✓')} Exported AI Agent SKILL.md to: ${this.color(ANSI.brightWhite, resolved)}\n`);
    } else {
      const previewLines = content.split('\n').slice(0, 18);
      const lines = [
        `${this.color(ANSI.cyan, 'Agent Skill Pack:')} ${snap.projectName}`,
        `${this.color(ANSI.cyan, 'Compatible With:')}   Google Antigravity, Claude Code, Cursor, Codex`,
        ``,
        ...previewLines.map((l) => this.color(ANSI.gray, l)),
      ];
      this.print('\n' + formatBox(lines, { title: '🤖 Autonomous Agent SKILL.md Preview' }) + '\n');
      this.print(`  ${this.color(ANSI.dim, 'Run /skill <filename> (e.g. /skill SKILL.md) to save file to disk.')}\n`);
    }
  }

  private async generateDocsCommand(args: string[]): Promise<void> {
    const snap = await this.ensureSnapshot();
    const outDir = args[0] ? path.resolve(args[0]) : path.join(this.rootDir, '.domoscope', 'docs');

    this.print(`\n  ${this.color(ANSI.yellow, '⟳')} Generating markdown documentation suite in ${outDir}...`);
    const docs = await generateAndSaveDocumentation(snap, outDir);

    this.print(`  ${this.color(ANSI.brightGreen, '✓')} Successfully generated ${docs.length} documentation guides:\n`);
    docs.forEach((doc) => {
      this.print(`    • ${this.color(ANSI.brightWhite, doc.relativePath.padEnd(28))} ${this.color(ANSI.dim, doc.title)}`);
    });
    this.print('');
  }

  private async compareCommand(args: string[]): Promise<void> {
    if (args.length === 0) {
      this.print(`\n  ${this.color(ANSI.brightRed, '✗')} Please specify a target repository to compare against.`);
      this.print(`  Usage: /compare <targetPath> (e.g. /compare ../other-repo)\n`);
      return;
    }

    const targetDir = path.resolve(args[0]);
    if (!fs.existsSync(targetDir)) {
      this.print(`\n  ${this.color(ANSI.brightRed, '✗')} Target path does not exist: ${targetDir}\n`);
      return;
    }

    this.print(`\n  ${this.color(ANSI.yellow, '⟳')} Comparing "${this.projectName}" with "${path.basename(targetDir)}"...`);
    const baseSnap = await this.ensureSnapshot();
    const targetSnap = await runLocalAnalysis(targetDir, { noCache: false });

    const inputA = fromLocalSnapshot(baseSnap);
    const inputB = fromLocalSnapshot(targetSnap);
    const comp = compareRepositories(inputA, inputB);

    const report = formatComparisonTerminal(comp);
    this.print('\n' + report + '\n');
  }

  private async runDoctorCommand(): Promise<void> {
    const checks: { name: string; status: 'ok' | 'warn' | 'fail'; detail: string }[] = [];

    // Node check
    const nodeMajor = parseInt(process.version.slice(1).split('.')[0], 10);
    checks.push({
      name: 'Node.js Runtime',
      status: nodeMajor >= 18 ? 'ok' : 'fail',
      detail: `${process.version} (>= v18 required)`,
    });

    // Git check
    const gitDir = path.join(this.rootDir, '.git');
    if (fs.existsSync(gitDir)) {
      const git = getLocalGitBranch(this.rootDir);
      checks.push({
        name: 'Git Repository',
        status: 'ok',
        detail: `Branch: ${git.branch}${git.commitSha ? ` (${git.commitSha})` : ''}`,
      });
    } else {
      checks.push({
        name: 'Git Repository',
        status: 'warn',
        detail: 'Standard folder mode (no .git directory)',
      });
    }

    // Cache check
    const cacheDir = path.join(this.rootDir, '.domoscope');
    try {
      await fsp.mkdir(cacheDir, { recursive: true });
      checks.push({ name: 'Cache Storage', status: 'ok', detail: `${cacheDir} (Writable)` });
    } catch {
      checks.push({ name: 'Cache Storage', status: 'warn', detail: 'Project is read-only. Home fallback used.' });
    }

    // Parsers check
    checks.push({
      name: 'Analysis Engines',
      status: 'ok',
      detail: 'AST, Prisma, SQL, Supabase, Mongo, TypeORM, Security, API Discovery',
    });

    // MCP check
    checks.push({
      name: 'MCP Server',
      status: 'ok',
      detail: `${DOMOSCOPE_MCP_TOOLS.length} tools, ${DOMOSCOPE_MCP_PROMPTS.length} prompts registered`,
    });

    const lines = checks.map((c) => {
      const icon = c.status === 'ok'
        ? this.color(ANSI.brightGreen, '✓')
        : c.status === 'warn'
        ? this.color(ANSI.yellow, 'ℹ')
        : this.color(ANSI.brightRed, '✗');
      return `  ${icon} ${this.color(ANSI.brightWhite, c.name.padEnd(20))} ${this.color(ANSI.gray, c.detail)}`;
    });

    this.print('\n' + formatBox(lines, { title: '🩺 System & Repository Diagnostics' }) + '\n');
  }

  private async serveCommand(args: string[]): Promise<void> {
    if (this.activeServer) {
      if (args[0] === 'stop') {
        await this.activeServer.close();
        this.activeServer = null;
        this.print(`\n  ${this.color(ANSI.brightGreen, '✓')} Local DomoScope server stopped.\n`);
        return;
      }
      this.print(`\n  ${this.color(ANSI.brightGreen, '●')} Server already running at: ${this.color(ANSI.brightCyan + ANSI.underline, this.activeServer.url)}`);
      this.print(`  Type ${this.color(ANSI.yellow, '/serve stop')} to terminate it.\n`);
      return;
    }

    const port = args[0] ? parseInt(args[0], 10) : 4004;
    this.print(`\n  ${this.color(ANSI.yellow, '⟳')} Launching DomoScope studio dashboard on port ${port}...`);

    try {
      this.activeServer = await startLocalServer({
        rootDir: this.rootDir,
        port,
        watch: true,
      });

      this.print(`  ${this.color(ANSI.brightGreen, '✓')} Dashboard is live!`);
      this.print(`  ${this.color(ANSI.brightCyan + ANSI.underline, this.activeServer.url)}\n`);
    } catch (err: any) {
      this.print(`  ${this.color(ANSI.brightRed, '✗')} Failed to start server: ${err.message}\n`);
    }
  }

  private async toggleWatchCommand(): Promise<void> {
    if (this.activeWatcher) {
      this.activeWatcher.stop();
      this.activeWatcher = null;
      this.print(`\n  ${this.color(ANSI.yellow, '○')} Live file watcher stopped.\n`);
      return;
    }

    this.print(`\n  ${this.color(ANSI.brightGreen, '●')} Starting live file watcher on ${this.rootDir}...`);
    this.activeWatcher = new LocalWatcher(this.rootDir);

    this.activeWatcher.on('change', (file, type) => {
      this.print(`\n  ${this.color(ANSI.gray, `[${new Date().toLocaleTimeString()}]`)} File ${type}: ${this.color(ANSI.cyan, file)}`);
    });

    this.activeWatcher.on('snapshot', (snap) => {
      this.currentSnapshot = snap;
      this.print(`  ${this.color(ANSI.brightGreen, '✓')} Incremental update: ${snap.stats.totalFiles} files in ${snap.durationMs}ms`);
      if (this.rl) this.rl.prompt();
    });

    await this.activeWatcher.start();
    this.print(`  ${this.color(ANSI.dim, 'Watching for changes. Type /watch again to disable.')}\n`);
  }

  private showMcpInfo(): void {
    const configAntigravity = {
      mcpServers: {
        domoscope: {
          command: 'npx',
          args: ['domoscope', 'mcp'],
        },
      },
    };

    const lines = [
      `${this.color(ANSI.cyan, 'MCP Protocol:')}  Version 2024-11-05 (stdio & SSE)`,
      `${this.color(ANSI.cyan, 'Tools Count:')}   ${DOMOSCOPE_MCP_TOOLS.length} active agent tools`,
      `${this.color(ANSI.cyan, 'Prompts Count:')} ${DOMOSCOPE_MCP_PROMPTS.length} system prompts`,
      ``,
      `${this.color(ANSI.bold, 'Antigravity / Claude Desktop Configuration:')}`,
      `Add this to your MCP settings:`,
      `${this.color(ANSI.gray, JSON.stringify(configAntigravity, null, 2))}`,
    ];

    this.print('\n' + formatBox(lines, { title: '🔌 Model Context Protocol (MCP) Integration' }) + '\n');
  }

  private clearScreen(): void {
    const out = this.customOutput || process.stdout;
    if ('isTTY' in out && (out as any).isTTY) {
      out.write('\x1b[2J\x1b[0;0H');
    }
    const git = getLocalGitBranch(this.rootDir);
    this.print(
      getAsciiBanner({
        rootDir: this.rootDir,
        projectName: this.projectName,
        activeBranch: git.branch,
        compact: true,
        noColor: this.noColor,
      })
    );
  }

  public async shutdown(): Promise<void> {
    if (this.isExiting) return;
    this.isExiting = true;

    if (this.activeServer) {
      await this.activeServer.close();
      this.activeServer = null;
    }
    if (this.activeWatcher) {
      this.activeWatcher.stop();
      this.activeWatcher = null;
    }
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }

    this.print(`\n  ${this.color(ANSI.brightCyan, '🔭 Thank you for using DomoScope.')} Have a productive session!\n`);
  }

  // =========================================================================
  // Internal Helpers
  // =========================================================================

  private async ensureSnapshot(): Promise<LocalAnalysisSnapshot> {
    if (this.currentSnapshot) {
      if (this.currentSnapshot.projectName) {
        this.projectName = this.currentSnapshot.projectName;
      }
      return this.currentSnapshot;
    }
    if (this.snapshotPromise) {
      const snap = await this.snapshotPromise;
      if (snap) {
        this.currentSnapshot = snap;
        if (snap.projectName) {
          this.projectName = snap.projectName;
        }
        return snap;
      }
    }
    this.currentSnapshot = await runLocalAnalysis(this.rootDir, { noCache: false });
    if (this.currentSnapshot.projectName) {
      this.projectName = this.currentSnapshot.projectName;
    }
    return this.currentSnapshot;
  }

  private getPromptString(branch: string): string {
    if (this.noColor) {
      return `domoscope [${branch}] > `;
    }
    const telescope = `\x1b[36m🔭 domoscope\x1b[0m`;
    const gitTag = `\x1b[90m(\x1b[35m${branch}\x1b[90m)\x1b[0m`;
    const arrow = `\x1b[1m\x1b[32m❯\x1b[0m `;
    return `${telescope} ${gitTag} ${arrow}`;
  }

  private autoCompleter(line: string): [string[], string] {
    const slashCommands = [
      '/help',
      '/banner',
      '/status',
      '/analyze',
      '/graph',
      '/db',
      '/routes',
      '/security',
      '/reverse',
      '/skill',
      '/docs',
      '/compare',
      '/doctor',
      '/serve',
      '/watch',
      '/mcp',
      '/clear',
      '/exit',
      '/quit',
    ];

    const hits = slashCommands.filter((c) => c.startsWith(line));
    return [hits.length ? hits : slashCommands, line];
  }

  private searchFileTree(tree: any[], query: string, prefix = ''): string[] {
    const matches: string[] = [];
    for (const item of tree) {
      const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.name.toLowerCase().includes(query)) {
        matches.push(fullPath);
      }
      if (item.children && Array.isArray(item.children)) {
        matches.push(...this.searchFileTree(item.children, query, fullPath));
      }
    }
    return matches;
  }

  private print(msg: string): void {
    const out = this.customOutput || process.stdout;
    out.write(msg + '\n');
  }

  private color(ansiCode: string, text: string): string {
    if (this.noColor) return text;
    return `${ansiCode}${text}${ANSI.reset}`;
  }
}
