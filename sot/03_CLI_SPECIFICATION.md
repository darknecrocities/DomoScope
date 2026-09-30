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
DomoScope Doctor — Environment & Repository Diagnostics
=================================================================
[OK] Node.js Runtime:       v22.22.3 (>= 18 required)
[OK] Project Directory:     /Users/developer/my-project (Accessible)
[OK] Git Repository:        Active branch: main (commit: a4f8b91)
[OK] Local Cache Write:     /Users/developer/my-project/.domoscope (Writable)
[OK] Analysis Engines:      Prisma, SQL, Supabase, Firebase, MongoDB, TypeORM, AST Graph, API Discovery
[OK] MCP Server Readiness:  16 tools & 3 prompts registered (Protocol 2024-11-05)
=================================================================
[OK] System is healthy and fully ready for DomoScope workflows!
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
DomoScope Codebase Analysis — my-project
=================================================================
Project Root:         /Users/developer/my-project
Git Branch:           main
Snapshot ID:          snap_1790775529067_44f53860
Duration:             342ms (Incremental Cache Hit)

CODEBASE METRICS
  • Total Files:        146
  • Total Directories:  28
  • Total Lines of Code:45,956
  • Primary Framework:  React / TypeScript (Next.js)
  • Detected Tooling:   Vite, TailwindCSS, Vitest, Docker

ARCHITECTURE & MODULES
  • Graph Nodes:        146
  • Graph Import Edges: 382
  • Entry Points:       src/main.tsx, src/App.tsx

DATABASE & ENTITIES
  • Tables / Entities:  8 (Prisma, PostgreSQL)
  • Relationships:      12

API ROUTE CATALOG
  • Discovered Routes:  14

SECURITY AUDIT
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
Generates a complete 7-file reverse-engineering markdown documentation suite in the specified output directory (default: `.domoscope/docs/`).

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
7. `SKILL.md`: Autonomous AI Agent Skill Definition ready for Claude Code, Cursor, Codex, or Antigravity.

---

### 2.6. `domoscope skill`
Generates an exportable `SKILL.md` agent skill pack for the repository.

**Usage:**
```bash
# Output to SKILL.md in project root:
npx domoscope skill

# Custom output destination:
npx domoscope skill --output ./skills/my-repo-skill.md
```

### 2.7. `domoscope compare`
Compares two software projects side-by-side and produces an architectural grading report with metric diffs and plain-English takeaways.

**Usage:**
```bash
# Compare current directory against another project:
npx domoscope compare ../other-repo

# Compare two distinct repositories or paths:
npx domoscope compare ./frontend ./backend

# Export report in Markdown or JSON format:
npx domoscope compare ./repoA ./repoB --format markdown --output comparison.md
npx domoscope compare ./repoA ./repoB --json --output comparison.json
```

**Supported Options:**
- `--format <table|json|markdown>`: Output format (default: `table`).
- `--output <file>`: Destination file path for the comparison report.
- `--no-cache`: Bypass local cache during analysis.
- `--verbose`: Print detailed progress logs.

**Sample Terminal Output:**
```
================================================================================
DomoScope Repository Comparison & Architectural Grading
================================================================================
METRIC                        acme-frontend             acme-backend            
--------------------------------------------------------------------------------
Overall Health Score          A (91/100)                B+ (85/100)             
Primary Framework             React (Next.js)           Express (Node)          
Total Lines of Code           14,250                    28,400                  
Total Files                   64                        112                     
Dependencies                  18                        36                      
Database Tables               6                         14                      
API Endpoints                 8                         24                      
Security Warnings             0                         2                       
Rebuild Complexity            Moderate                  High                    
--------------------------------------------------------------------------------
KEY TAKEAWAYS & DIVERGENCES
--------------------------------------------------------------------------------
* Codebase Volume & Scale: acme-backend is approximately 2.0x larger in code volume than acme-frontend (28,400 vs 14,250 lines).
* Framework & Core Stack: acme-frontend is built with React (Next.js), whereas acme-backend is powered by Express (Node).
* Database & Persistence Models: acme-frontend maps 6 entities, while acme-backend defines 14 entities.
* Security & Secret Hygiene: acme-frontend demonstrates a cleaner security posture (0 findings vs 2 in acme-backend).
* Rebuild & Porting Effort: acme-frontend has a moderate rebuild complexity (3 phases), compared to high for acme-backend (4 phases).
================================================================================
```

---

### 2.8. `domoscope serve`
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

### 2.9. `domoscope watch`
Runs a live, debounced terminal file watcher with incremental re-analysis.

**Usage:**
```bash
npx domoscope watch [--verbose]
```

**Terminal Output:**
```
[DomoScope Watch] Watching /Users/developer/my-project for changes...
[21:40:12] File change: src/components/Dashboard.tsx
Re-analyzing codebase... [OK] Updated snapshot: snap_1790776812 (146 files in 48ms)
```

---

### 2.10. `domoscope mcp`
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
