# 03 — CLI Specification & Subcommands

**Entry Points:** `bin/domoscope.js` (CLI), `bin/domoscope-mcp.js` (MCP Server)  
**Execution:** Zero-install via `npx domoscope <command>` or global `domoscope <command>`  
**Runtime Requirement:** Node.js >= 18.0.0  

---

## 1. Global Options & Flags

| Flag | Short | Type | Description | Default |
|---|---|---|---|---|
| `--dir <path>` | `-d` | string | Target directory to analyze or serve | `process.cwd()` |
| `--no-cache` | | boolean | Force bypass `.domoscope/cache.json` and perform full scan | `false` |
| `--verbose` | | boolean | Enable debug logging with millisecond execution timings | `false` |
| `--help` | `-h` | boolean | Print help dialog and list available subcommands | |
| `--version` | `-v` | boolean | Print installed DomoScope version string | |

---

## 2. Subcommand Specifications

### 2.1. `domoscope doctor`
Performs an automated pre-flight health check of the local execution environment and target repository.

**Usage:**
```bash
npx domoscope doctor [--verbose]
```

**Diagnostic Checks Executed:**
1. **Node.js Runtime:** Asserts version >= 18.0.0 (fails on outdated versions).
2. **Project Directory:** Verifies target path exists, is a directory, and has read access.
3. **Git Repository Status:** Checks for valid `.git/` folder and inspects active branch.
4. **Local Disk Cache:** Tests write permissions for `.domoscope/` directory.
5. **Analysis Engines:** Verifies AST parser modules (Prisma, SQL, Supabase, Mongoose, TypeORM, API Discovery).
6. **MCP Server Readiness:** Validates that 16 MCP tools and 3 prompts are registered and compliant with the 2024-11-05 protocol.

**Sample Terminal Output:**
```
=================================================================
🩺 DomoScope Doctor — Environment & Repository Diagnostics
=================================================================
✓ Node.js Runtime:       v22.22.3 (>= 18 required)
✓ Project Directory:     /Users/developer/my-project (Accessible)
✓ Git Repository:        Active branch: main (commit: a4f8b91)
✓ Local Cache Write:     /Users/developer/my-project/.domoscope (Writable)
✓ Analysis Engines:      Prisma, SQL, Supabase, Firebase, MongoDB, TypeORM, AST Graph, API Discovery
✓ MCP Server Readiness:  16 tools & 3 prompts registered (Protocol 2024-11-05)
=================================================================
✓ System is healthy and fully ready for DomoScope workflows!
```

---

### 2.2. `domoscope init`
Inspects the repository structure and generates a standardized `.domoscope.json` configuration file, followed by an immediate baseline scan.

**Usage:**
```bash
npx domoscope init [--force]
```

**Created Configuration (`.domoscope.json`):**
```json
{
  "name": "my-project",
  "version": "1.0.0",
  "respectGitIgnore": true,
  "exclude": [
    "dist/**",
    "build/**",
    ".next/**",
    "coverage/**"
  ],
  "maxFileSize": 2097152,
  "analysis": {
    "enabled": true,
    "incremental": true
  },
  "server": {
    "port": 4004
  }
}
```

---

### 2.3. `domoscope analyze`
Executes unified static analysis across all supported subsystems and renders a formatted terminal summary table.

**Usage:**
```bash
# Terminal summary table:
npx domoscope analyze

# Export full snapshot JSON to file:
npx domoscope analyze --json --output analysis.json

# Stream JSON to stdout (for unix piping):
npx domoscope analyze --json | jq .frameworks
```

**Sample Terminal Table Output:**
```
=================================================================
🔭 DomoScope Codebase Analysis — my-project
=================================================================
Project Root:         /Users/developer/my-project
Git Branch:           main
Snapshot ID:          snap_1790775529067_44f53860
Duration:             342ms (Incremental Cache Hit)

📊 CODEBASE METRICS
  • Total Files:        146
  • Total Directories:  28
  • Total Lines of Code:45,956
  • Primary Framework:  React / TypeScript (Next.js)
  • Detected Tooling:   Vite, TailwindCSS, Vitest, Docker

🏗️ ARCHITECTURE & MODULES
  • Graph Nodes:        146
  • Graph Import Edges: 382
  • Entry Points:       src/main.tsx, src/App.tsx

🗄️ DATABASE & ENTITIES
  • Tables / Entities:  8 (Prisma, PostgreSQL)
  • Relationships:      12

📡 API ROUTE CATALOG
  • Discovered Routes:  14

🛡️ SECURITY AUDIT
  • Findings:           0 (Zero high/critical risks detected)
=================================================================
```

---

### 2.4. `domoscope graph`
Exports the directed software dependency graph in either Mermaid flowchart format or structured JSON.

**Usage:**
```bash
# Export Mermaid diagram (compatible with GitHub / Notion markdown):
npx domoscope graph --format mermaid --output architecture.mmd

# Export JSON graph:
npx domoscope graph --format json --output graph.json
```

**Mermaid Output Sample:**
```mermaid
graph TD
  "src_main_tsx" --> "src_App_tsx"
  "src_App_tsx" --> "src_pages_Workspace_tsx"
  "src_pages_Workspace_tsx" --> "src_services_localAnalysisEngine_ts"
  "src_services_localAnalysisEngine_ts" --> "src_services_databaseParser_ts"
```

---

### 2.5. `domoscope docs`
Generates a complete 6-file reverse-engineering markdown documentation suite in the specified output directory (default: `.domoscope/docs/`).

**Usage:**
```bash
npx domoscope docs
npx domoscope docs --output ./docs/architecture
```

**Files Generated:**
1. `PROJECT_OVERVIEW.md`: Mission statement, lines of code, language breakdown, tooling list, and entry points.
2. `ARCHITECTURE.md`: Module dependency graph, top 15 hub files, and top 50 directed Mermaid import edges.
3. `DATABASE.md`: Schema overview, table definitions, column types, PK/FK flags, and Mermaid ERD.
4. `API_REFERENCE.md`: Route table with HTTP methods, paths, frameworks, and source file line references.
5. `SECURITY_AUDIT.md`: Categorized audit report by severity with remediation guidelines.
6. `REVERSE_ENGINEER_SPEC.md`: 1,000+ line actionable technical specification and AI prompts.

---

### 2.6. `domoscope serve`
Launches the local visualizer studio daemon and REST/SSE server.

**Usage:**
```bash
npx domoscope serve
npx domoscope serve --port 4004 --host 0.0.0.0 --no-watch
```

**Supported Options:**
- `--port <number>`: Target HTTP port (default: `4004`, auto-increments if in use).
- `--host <ip>`: Host interface binding (default: `0.0.0.0` for Docker compatibility).
- `--no-watch`: Disables background file watcher.

---

### 2.7. `domoscope watch`
Runs a live, debounced terminal file watcher with incremental re-analysis.

**Usage:**
```bash
npx domoscope watch [--verbose]
```

**Terminal Output:**
```
[DomoScope Watch] Watching /Users/developer/my-project for changes...
[21:40:12] File change: src/components/Dashboard.tsx
⟳ Re-analyzing codebase... ✓ Updated snapshot: snap_1790776812 (146 files in 48ms)
```

---

### 2.8. `domoscope mcp`
Starts the stdio Model Context Protocol (MCP) server. See [`04_MCP_PROTOCOL_SPEC.md`](./04_MCP_PROTOCOL_SPEC.md) for full details.

**Usage:**
```bash
npx domoscope mcp
npx domoscope mcp --list-tools
```

---

## 3. Exit Codes

| Exit Code | Meaning |
|---|---|
| `0` | Success / All operations completed cleanly |
| `1` | Command failed (e.g. fatal analysis error, unknown subcommand) |
| `130` | Interrupted by user (`SIGINT` / `Ctrl+C`) |
