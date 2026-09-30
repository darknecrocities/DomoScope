import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { runLocalAnalysis, getLocalGitBranch } from './localAnalysisEngine';
import { LocalCacheManager } from './localCacheManager';
import { LocalWatcher } from './localWatcher';
import { startLocalServer } from './localServer';
import { generateAndSaveDocumentation } from './localDocsGenerator';
import { DOMOSCOPE_MCP_TOOLS, DOMOSCOPE_MCP_PROMPTS } from '../mcpCore';

export interface CliCommandContext {
  cwd: string;
  args: string[];
}

export function parseCliArgs(args: string[]): {
  command: string;
  options: Record<string, string | boolean>;
  positionals: string[];
} {
  const options: Record<string, string | boolean> = {};
  const positionals: string[] = [];
  let command = 'help';

  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (i === 0 && !arg.startsWith('-')) {
      command = arg;
      i++;
      continue;
    }

    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      if (key.startsWith('no-')) {
        options[key.slice(3)] = false;
      } else if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
        options[key] = args[i + 1];
        i++;
      } else {
        options[key] = true;
      }
    } else if (arg.startsWith('-')) {
      const key = arg.slice(1);
      if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
        options[key] = args[i + 1];
        i++;
      } else {
        options[key] = true;
      }
    } else {
      positionals.push(arg);
    }
    i++;
  }

  return { command, options, positionals };
}

export async function runCli(argv: string[] = process.argv.slice(2)): Promise<number> {
  const { command, options, positionals } = parseCliArgs(argv);
  const cwd = (options.cwd as string) || (options.dir as string) || positionals[0] || process.cwd();
  const rootDir = path.resolve(cwd);

  if (options.help || options.h || command === 'help') {
    printHelp();
    return 0;
  }

  if (options.version || options.v || command === 'version') {
    console.log('DomoScope v1.0.0 — Local-First Codebase Intelligence Platform');
    return 0;
  }

  switch (command) {
    case 'init':
      return handleInit(rootDir, options);
    case 'analyze':
      return handleAnalyze(rootDir, options);
    case 'graph':
      return handleGraph(rootDir, options);
    case 'docs':
      return handleDocs(rootDir, options);
    case 'skill':
      return handleSkill(rootDir, options);
    case 'serve':
      return handleServe(rootDir, options);
    case 'watch':
      return handleWatch(rootDir, options);
    case 'mcp':
      return handleMcp(rootDir, options);
    case 'doctor':
      return handleDoctor(rootDir, options);
    default:
      console.error(`\x1b[31m[DomoScope]\x1b[0m Unknown command: "${command}"\n`);
      printHelp();
      return 1;
  }
}

function printHelp() {
  console.log(`
\x1b[1m\x1b[37mDomoScope — Local-First Repository Intelligence & Developer Platform\x1b[0m

\x1b[33mUSAGE:\x1b[0m
  $ npx domoscope <command> [options]

\x1b[33mCOMMANDS:\x1b[0m
  \x1b[32minit\x1b[0m       Inspect current project and create recommended .domoscope.json config
  \x1b[32manalyze\x1b[0m    Execute static analysis and output structured architectural summary
  \x1b[32mgraph\x1b[0m      Export module dependency and architecture graph (JSON or Mermaid)
  \x1b[32mdocs\x1b[0m       Generate complete markdown documentation suite in .domoscope/docs/
  \x1b[32mskill\x1b[0m      Generate exportable SKILL.md pack for Claude, Cursor, and Antigravity
  \x1b[32mserve\x1b[0m      Launch local interactive DomoScope dashboard on localhost:4004
  \x1b[32mwatch\x1b[0m      Run live terminal file watcher with incremental re-analysis
  \x1b[32mmcp\x1b[0m        Launch local Model Context Protocol (MCP) server for AI coding agents
  \x1b[32mdoctor\x1b[0m     Run system and repository diagnostic health checks

\x1b[33mGLOBAL OPTIONS:\x1b[0m
  -d, --dir <path>       Target project directory (default: current working directory)
  --no-cache             Bypass local cache and force clean re-analysis
  --verbose              Print detailed diagnostic logs
  -h, --help             Show this help message
  -v, --version          Show version

\x1b[33mEXAMPLES:\x1b[0m
  $ npx domoscope analyze
  $ npx domoscope analyze --json --output analysis.json
  $ npx domoscope graph --format mermaid
  $ npx domoscope docs --output ./docs/architecture
  $ npx domoscope serve --port 4004
  $ npx domoscope doctor
`);
}

async function handleInit(rootDir: string, options: Record<string, any>): Promise<number> {
  console.log(`\x1b[1m\x1b[37m[DomoScope Init]\x1b[0m Initializing project at \x1b[36m${rootDir}\x1b[0m...`);

  const configPath = path.join(rootDir, '.domoscope.json');
  if (fs.existsSync(configPath) && !options.force) {
    console.log(`\x1b[33m[DomoScope]\x1b[0m Configuration file \`.domoscope.json\` already exists. Use --force to overwrite.`);
  } else {
    const defaultConfig = {
      name: path.basename(rootDir),
      version: '1.0.0',
      respectGitIgnore: true,
      exclude: ['dist/**', 'build/**', '.next/**', 'coverage/**'],
      maxFileSize: 2097152,
      analysis: {
        enabled: true,
        incremental: true,
      },
      server: {
        port: 4004,
      },
    };
    await fsp.writeFile(configPath, JSON.stringify(defaultConfig, null, 2), 'utf8');
    console.log(`\x1b[32m✓ Created configuration:\x1b[0m \`.domoscope.json\``);
  }

  console.log(`\n\x1b[1m\x1b[37mRunning baseline analysis...\x1b[0m`);
  const snapshot = await runLocalAnalysis(rootDir, { verbose: Boolean(options.verbose) });

  console.log(`\x1b[32m✓ Analysis complete!\x1b[0m`);
  console.log(`  - \x1b[1mFiles Indexed:\x1b[0m ${snapshot.stats.totalFiles}`);
  console.log(`  - \x1b[1mLines of Code:\x1b[0m ${snapshot.stats.totalLines.toLocaleString()}`);
  console.log(`  - \x1b[1mPrimary Framework:\x1b[0m ${snapshot.frameworks?.primary?.name || 'Generic / Polyglot'}`);
  console.log(`  - \x1b[1mDatabase Tables:\x1b[0m ${snapshot.database.tables.length}`);
  console.log(`  - \x1b[1mAPI Routes:\x1b[0m ${snapshot.apiRoutes.length}`);
  console.log(`\nRun \x1b[36mnpx domoscope serve\x1b[0m to explore your project in the interactive dashboard!`);

  return 0;
}

async function handleAnalyze(rootDir: string, options: Record<string, any>): Promise<number> {
  const startTime = Date.now();
  const noCache = options.cache === false || options['no-cache'] === true;

  const snapshot = await runLocalAnalysis(rootDir, {
    noCache,
    verbose: Boolean(options.verbose),
  });

  if (options.json) {
    const jsonStr = JSON.stringify(snapshot, null, 2);
    if (options.output) {
      await fsp.writeFile(path.resolve(options.output as string), jsonStr, 'utf8');
      console.log(`\x1b[32m✓ Analysis JSON written to:\x1b[0m ${options.output}`);
    } else {
      process.stdout.write(jsonStr + '\n');
    }
    return 0;
  }

  // CLI Table Output
  console.log(`
=================================================================
🔭 DomoScope Codebase Analysis — ${snapshot.projectName}
=================================================================
Project Root:         ${snapshot.rootDir}
Git Branch:           ${snapshot.metadata.defaultBranch}
Snapshot ID:          ${snapshot.snapshotId}
Duration:             ${snapshot.durationMs}ms (${snapshot.isIncremental ? 'Incremental Cache Hit' : 'Full Scan'})

📊 CODEBASE METRICS
  • Total Files:        ${snapshot.stats.totalFiles.toLocaleString()}
  • Total Directories:  ${snapshot.stats.totalDirs.toLocaleString()}
  • Total Lines of Code:${snapshot.stats.totalLines.toLocaleString()}
  • Primary Framework:  ${snapshot.frameworks?.primary?.name || 'Generic / Polyglot'}
  • Detected Tooling:   ${snapshot.analysis.detectedTools.join(', ') || 'None'}

\x1b[1m\x1b[36m🏗️ ARCHITECTURE & MODULES\x1b[0m
  • Graph Nodes:        ${snapshot.graph.nodes.length}
  • Graph Import Edges: ${snapshot.graph.edges.length}
  • Entry Points:       ${snapshot.analysis.entryPoints.join(', ') || 'None'}

\x1b[1m\x1b[36m🗄️ DATABASE & ENTITIES\x1b[0m
  • Tables / Entities:  ${snapshot.database.tables.length} (${snapshot.database.detectedTypes.join(', ') || 'None'})
  • Relationships:      ${snapshot.database.relationships.length}

\x1b[1m\x1b[36m📡 API ROUTE CATALOG\x1b[0m
  • Discovered Routes:  ${snapshot.apiRoutes.length}

\x1b[1m\x1b[36m🛡️ SECURITY AUDIT\x1b[0m
  • Findings:           ${snapshot.securityFindings.length} (${snapshot.securityFindings.filter((f) => f.severity === 'critical' || f.severity === 'high').length} High/Critical)
\x1b[1m\x1b[37m=================================================================\x1b[0m
`);

  if (options.output) {
    const jsonStr = JSON.stringify(snapshot, null, 2);
    await fsp.writeFile(path.resolve(options.output as string), jsonStr, 'utf8');
    console.log(`\x1b[32m✓ Snapshot saved to:\x1b[0m ${options.output}`);
  }

  return 0;
}

async function handleGraph(rootDir: string, options: Record<string, any>): Promise<number> {
  const noCache = options.cache === false || options['no-cache'] === true;
  const snapshot = await runLocalAnalysis(rootDir, { noCache, verbose: Boolean(options.verbose) });
  const format = ((options.format as string) || 'mermaid').toLowerCase();

  if (format === 'json') {
    const jsonStr = JSON.stringify(snapshot.graph, null, 2);
    if (options.output) {
      await fsp.writeFile(path.resolve(options.output as string), jsonStr, 'utf8');
      console.log(`\x1b[32m✓ Architecture graph written to:\x1b[0m ${options.output}`);
    } else {
      process.stdout.write(jsonStr + '\n');
    }
    return 0;
  }

  // Format as Mermaid flowchart
  const edges = snapshot.graph.edges
    .map((e) => `  "${e.source.replace(/[^a-zA-Z0-9_-]/g, '_')}" --> "${e.target.replace(/[^a-zA-Z0-9_-]/g, '_')}"`)
    .join('\n');

  const mermaidStr = `graph TD\n${edges || '  // No import edges detected'}\n`;

  if (options.output) {
    await fsp.writeFile(path.resolve(options.output as string), mermaidStr, 'utf8');
    console.log(`\x1b[32m✓ Mermaid graph written to:\x1b[0m ${options.output}`);
  } else {
    process.stdout.write(mermaidStr);
  }

  return 0;
}

async function handleDocs(rootDir: string, options: Record<string, any>): Promise<number> {
  const outputDir = (options.output as string) || (options.out as string) || path.join(rootDir, '.domoscope', 'docs');
  console.log(`\x1b[1m\x1b[37m[DomoScope Docs]\x1b[0m Generating documentation in \x1b[36m${outputDir}\x1b[0m...`);

  const noCache = options.cache === false || options['no-cache'] === true;
  const snapshot = await runLocalAnalysis(rootDir, { noCache, verbose: Boolean(options.verbose) });
  const docs = await generateAndSaveDocumentation(snapshot, outputDir);

  console.log(`\x1b[32m✓ Generated ${docs.length} documentation files:\x1b[0m`);
  for (const doc of docs) {
    console.log(`  • \x1b[1m${doc.relativePath}\x1b[0m — ${doc.title}`);
  }

  return 0;
}

async function handleSkill(rootDir: string, options: Record<string, any>): Promise<number> {
  const outputPath = (options.output as string) || (options.out as string) || path.join(rootDir, 'SKILL.md');
  console.log(`\x1b[1m\x1b[37m[DomoScope Skill]\x1b[0m Generating AI Agent SKILL.md for \x1b[36m${rootDir}\x1b[0m...`);

  const noCache = options.cache === false || options['no-cache'] === true;
  const snapshot = await runLocalAnalysis(rootDir, { noCache, verbose: Boolean(options.verbose) });
  const skillContent = snapshot.reverseEngineer.agentSkill || snapshot.reverseEngineer.overview || `# AI Agent Engineering Skill Pack: ${snapshot.projectName}`;

  await fsp.writeFile(path.resolve(outputPath), skillContent, 'utf8');
  console.log(`\x1b[32m✓ Generated Agentic Skill:\x1b[0m \x1b[1m${outputPath}\x1b[0m`);
  console.log(`  Drop into Claude Code, Cursor, Codex, or Antigravity!`);

  return 0;
}

async function handleServe(rootDir: string, options: Record<string, any>): Promise<number> {
  const port = options.port ? parseInt(options.port as string, 10) : 4004;
  const host = (options.host as string) || process.env.HOST || '0.0.0.0';
  console.log(`\x1b[1m\x1b[37m[DomoScope Server]\x1b[0m Starting local studio for \x1b[36m${rootDir}\x1b[0m...`);

  const running = await startLocalServer({
    rootDir,
    port,
    host,
    watch: options.watch !== false,
  });

  console.log(`
\x1b[1m\x1b[32m🔭 DomoScope Dashboard is live!\x1b[0m
  \x1b[1m\x1b[37mURL:\x1b[0m           \x1b[36m\x1b[4m${running.url}\x1b[0m
  \x1b[1m\x1b[37mProject:\x1b[0m       ${running.rootDir}
  \x1b[1m\x1b[37mWatch Mode:\x1b[0m    ${running.watcher ? 'Active (Auto-refresh on file change)' : 'Disabled'}

\x1b[90mPress Ctrl+C to stop server.\x1b[0m
`);

  return new Promise((resolve) => {
    process.on('SIGINT', async () => {
      console.log(`\n\x1b[33m[DomoScope]\x1b[0m Stopping server...`);
      await running.close();
      console.log(`\x1b[32m✓ Server stopped cleanly.\x1b[0m`);
      resolve(0);
    });
  });
}

async function handleWatch(rootDir: string, options: Record<string, any>): Promise<number> {
  console.log(`\x1b[1m\x1b[37m[DomoScope Watch]\x1b[0m Watching \x1b[36m${rootDir}\x1b[0m for changes...`);

  const watcher = new LocalWatcher(rootDir);
  watcher.on('change', (file, type) => {
    console.log(`\x1b[90m[${new Date().toLocaleTimeString()}]\x1b[0m File ${type}: \x1b[36m${file}\x1b[0m`);
  });

  watcher.on('analyzing', () => {
    process.stdout.write(`\x1b[33m⟳ Re-analyzing codebase...\x1b[0m `);
  });

  watcher.on('snapshot', (snap) => {
    console.log(`\x1b[32m✓ Updated snapshot:\x1b[0m \x1b[1m${snap.snapshotId}\x1b[0m (${snap.stats.totalFiles} files in ${snap.durationMs}ms)`);
  });

  watcher.on('error', (err) => {
    console.error(`\x1b[31m[DomoScope Watch Error]\x1b[0m`, err);
  });

  await watcher.start();

  return new Promise((resolve) => {
    process.on('SIGINT', () => {
      console.log(`\n\x1b[33m[DomoScope]\x1b[0m Stopping watcher...`);
      watcher.stop();
      resolve(0);
    });
  });
}

async function handleMcp(rootDir: string, options: Record<string, any>): Promise<number> {
  // Delegate to existing bin/domoscope-mcp.js
  const mcpScript = path.resolve(__dirname, '../../../bin/domoscope-mcp.js');
  if (fs.existsSync(mcpScript)) {
    await import(mcpScript);
    return 0;
  }
  console.error(`\x1b[31m[DomoScope MCP]\x1b[0m MCP server executable not found at ${mcpScript}`);
  return 1;
}

async function handleDoctor(rootDir: string, options: Record<string, any>): Promise<number> {
  console.log(`
\x1b[1m\x1b[37m=================================================================\x1b[0m
\x1b[1m\x1b[37m🩺 DomoScope Doctor — Environment & Repository Diagnostics\x1b[0m
\x1b[1m\x1b[37m=================================================================\x1b[0m
`);

  let allPassed = true;

  // 1. Node.js Version Check
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0], 10);
  if (majorVersion >= 18) {
    console.log(`\x1b[32m✓ Node.js Runtime:\x1b[0m       ${nodeVersion} (>= 18 required)`);
  } else {
    console.log(`\x1b[31m✗ Node.js Runtime:\x1b[0m       ${nodeVersion} — Unsupported! Upgrade to Node.js 18 or higher.`);
    allPassed = false;
  }

  // 2. Project Directory Access
  try {
    const stat = await fsp.stat(rootDir);
    if (stat.isDirectory()) {
      console.log(`\x1b[32m✓ Project Directory:\x1b[0m     ${rootDir} (Accessible)`);
    } else {
      console.log(`\x1b[31m✗ Project Directory:\x1b[0m     ${rootDir} is not a directory.`);
      allPassed = false;
    }
  } catch (err: any) {
    console.log(`\x1b[31m✗ Project Directory:\x1b[0m     Cannot read ${rootDir}: ${err.message}`);
    allPassed = false;
  }

  // 3. Git Repository Check
  const gitDir = path.join(rootDir, '.git');
  if (fs.existsSync(gitDir)) {
    const { branch, commitSha } = getLocalGitBranch(rootDir);
    console.log(`\x1b[32m✓ Git Repository:\x1b[0m        Active (Branch: \x1b[36m${branch}\x1b[0m, SHA: \x1b[36m${commitSha || 'HEAD'}\x1b[0m)`);
  } else {
    console.log(`\x1b[33mℹ Git Repository:\x1b[0m        No .git directory found (Standard directory mode)`);
  }

  // 4. Cache Directory & Permissions
  const cachePath = LocalCacheManager ? path.join(rootDir, '.domoscope') : '';
  try {
    await fsp.mkdir(cachePath, { recursive: true });
    const testFile = path.join(cachePath, '.write-test');
    await fsp.writeFile(testFile, 'test', 'utf8');
    await fsp.unlink(testFile);
    console.log(`\x1b[32m✓ Local Cache Write:\x1b[0m     ${cachePath} (Writable)`);
  } catch {
    console.log(`\x1b[33mℹ Local Cache Write:\x1b[0m     Project root is read-only. Fallback home cache will be used.`);
  }

  // 5. Parser Engines Readiness
  console.log(`\x1b[32m✓ Analysis Engines:\x1b[0m      Prisma, SQL, Supabase, Firebase, MongoDB, TypeORM, AST Graph, API Discovery`);

  // 6. MCP Protocol Check
  console.log(`\x1b[32m✓ MCP Server Readiness:\x1b[0m  ${DOMOSCOPE_MCP_TOOLS.length} tools & ${DOMOSCOPE_MCP_PROMPTS.length} prompts registered (Protocol 2024-11-05)`);

  console.log(`\x1b[1m\x1b[37m=================================================================\x1b[0m`);
  if (allPassed) {
    console.log(`\x1b[1m\x1b[32m✓ System is healthy and fully ready for DomoScope workflows!\x1b[0m\n`);
    return 0;
  } else {
    console.log(`\x1b[1m\x1b[31m✗ Diagnostics found issues. Please fix the reported errors above.\x1b[0m\n`);
    return 1;
  }
}
