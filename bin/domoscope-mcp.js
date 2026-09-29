#!/usr/bin/env node

/**
 * DomoScope MCP (Model Context Protocol) Server CLI
 * STDIO JSON-RPC 2.0 bridge for Claude Desktop, Cursor, Antigravity, and Cline.
 *
 * Conforms to Model Context Protocol specification (2024-11-05).
 */

import readline from 'node:readline';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const projectRoot = path.resolve(__dirname, '..');
const jiti = require('jiti')(projectRoot);

const {
  handleMcpRequest,
  DOMOSCOPE_MCP_TOOLS,
  DOMOSCOPE_MCP_PROMPTS,
} = jiti('./src/services/mcpCore.ts');

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
DomoScope MCP Server (Model Context Protocol) v1.0.0

Usage:
  node bin/domoscope-mcp.js [options]

Options:
  -h, --help        Show this help message
  -v, --version     Show version information
  --list-tools      Output all registered MCP tools in JSON format

Environment Variables:
  GITHUB_TOKEN      GitHub Personal Access Token for extended rate limits (5,000 req/hour)

MCP Client Configuration Example (claude_desktop_config.json):
  {
    "mcpServers": {
      "domoscope": {
        "command": "node",
        "args": ["${path.resolve(__dirname, 'domoscope-mcp.js')}"],
        "env": {
          "GITHUB_TOKEN": "ghp_your_token_here"
        }
      }
    }
  }
`);
  process.exit(0);
}

if (args.includes('--version') || args.includes('-v')) {
  console.log('domoscope-mcp 1.0.0 (protocol version 2024-11-05)');
  process.exit(0);
}

if (args.includes('--list-tools')) {
  console.log(JSON.stringify(DOMOSCOPE_MCP_TOOLS, null, 2));
  process.exit(0);
}

// Diagnostics must ONLY be written to stderr, never stdout (stdout is reserved for JSON-RPC)
process.stderr.write(`[DomoScope MCP] Starting DomoScope MCP Server (protocol 2024-11-05)...\n`);
process.stderr.write(`[DomoScope MCP] ${DOMOSCOPE_MCP_TOOLS.length} tools and ${DOMOSCOPE_MCP_PROMPTS.length} prompts registered.\n`);

const githubToken = process.env.GITHUB_TOKEN || process.env.VITE_GITHUB_TOKEN;
if (githubToken) {
  process.stderr.write(`[DomoScope MCP] Authenticated mode active with GITHUB_TOKEN.\n`);
} else {
  process.stderr.write(`[DomoScope MCP] Unauthenticated mode (60 req/hr rate limit). Set GITHUB_TOKEN for 5,000 req/hr.\n`);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

rl.on('line', async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  try {
    const request = JSON.parse(trimmed);
    const response = await handleMcpRequest(request, { githubToken });
    process.stdout.write(JSON.stringify(response) + '\n');
  } catch (err) {
    const errorResponse = {
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32700,
        message: `Parse error: ${err instanceof Error ? err.message : String(err)}`,
      },
    };
    process.stdout.write(JSON.stringify(errorResponse) + '\n');
  }
});

rl.on('close', () => {
  process.stderr.write(`[DomoScope MCP] Stdio connection closed. Exiting.\n`);
  process.exit(0);
});

process.on('SIGINT', () => {
  process.exit(0);
});
