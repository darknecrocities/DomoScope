# AI Usage Log: DomoScope

This document outlines the usage of AI tools during the research, architecture, implementation, and refinement of DomoScope. It complies with the class requirements for full transparency and architectural attribution.

[![Made with AI](https://img.shields.io/badge/Made_with-AI_assistance-blue)](AI-USAGE.md)

---

## 1. How I used AI (35 points)

At least six entries documenting real interactions during the project, detailing the tool, request, response, decisions made, and commit links.

### Entry 1: 2026-09-27 — Universal Polyglot API Endpoint & Route Discovery Engine
- **Tool**: Google Antigravity / Claude
- **Request**: "Generate regex and AST visitor patterns to parse Express routes (`app.get`, `router.post`) and Next.js App/Pages router route handlers in TypeScript."
- **Output**: Provided regex patterns for standard Express verb declarations and basic directory scanning for Next.js `app/api/**/route.ts`.
- **What I kept / changed**: Kept the basic HTTP verb matching tokens. Completely overhauled the engine in `src/services/apiRouteCatalog.ts` to support dynamic route path parameters (`:id`, `[id]`), middleware parameter counting, deduplication across multi-file routers, and polyglot route detection for FastAPI, Flask, and Spring Boot.
- **Commit**: [`5461de1`](https://github.com/darknecrocities/DomoScope/commit/5461de1)

### Entry 2: 2026-09-28 — Interactive Database ERD Canvas & Table Nodes
- **Tool**: Claude 3.5 Sonnet
- **Request**: "How to configure React Flow / XYFlow custom nodes with dynamic PK/FK handles and Dagre auto-layout for entity relationship diagrams?"
- **Output**: Provided a basic XYFlow node template with source/target handle positions and an initial Dagre graph layout function.
- **What I kept / changed**: Kept the Dagre coordinate calculation structure. Rewrote the custom node renderer in `src/components/workspace/DatabaseTableNode.tsx` and `DatabaseERD.tsx` to include interactive field drawers, animated PK/FK connection lines, column type badges, nullable indicators, and viewport fit transitions.
- **Commit**: [`6ffd2b7`](https://github.com/darknecrocities/DomoScope/commit/6ffd2b7)

### Entry 3: 2026-09-29 — Polyglot Database ERD Parser & Model Context Protocol (MCP) Server Setup
- **Tool**: Claude 3.5 Sonnet / Google Antigravity
- **Request**: "Generate regex matchers for SQL CREATE TABLE statements across Postgres and MySQL dialects, and provide MCP 2024-11-05 JSON-RPC protocol boilerplate."
- **Output**: Provided initial regex patterns for table names and column definitions, plus standard MCP JSON-RPC schemas (`ListToolsRequestSchema`, `CallToolRequestSchema`).
- **What I kept / changed**: Kept the protocol message structures. Authored the complete parser in `src/services/databaseParser.ts` supporting multi-line DDL, inline foreign keys (`REFERENCES other(id)`), composite primary keys, and Prisma schemas. Implemented all 16 MCP tools in `src/services/mcpCore.ts`, strictly separating stderr diagnostics from stdout JSON-RPC frames.
- **Commit**: [`3315fd1`](https://github.com/darknecrocities/DomoScope/commit/3315fd1)

### Entry 4: 2026-09-29 — Local-First Scanner & CLI Daemon
- **Tool**: Google Antigravity
- **Request**: "Scaffold a Node.js CLI with commander and an in-memory file scanner for local repository analysis."
- **Output**: Provided a simple `commander` CLI boilerplate and a recursive directory traversal loop using `fs.readdir`.
- **What I kept / changed**: Kept the CLI argument parser scaffolding. Completely replaced the directory traversal with `src/services/local/localScanner.ts`, adding canonical path containment (`isPathWithinRoot`), symlink recursion guards, `.gitignore` filtering via the `ignore` library, and a local Express daemon (`localServer.ts`) with incremental cache management.
- **Commit**: [`9a67fa1`](https://github.com/darknecrocities/DomoScope/commit/9a67fa1)

### Entry 5: 2026-09-30 — Dynamic Entrypoint and Setup Suggestions
- **Tool**: Google Antigravity
- **Request**: "Create a suggestion engine that recommends run commands and entrypoints based on package.json, requirements.txt, or Cargo.toml."
- **Output**: Provided a dictionary mapping manifest files to common start commands (`npm run dev`, `python app.py`).
- **What I kept / changed**: Extended the suggestion engine in `src/services/suggestionsGenerator.ts` to inspect script fields, framework configurations (Vite, Next.js, Express, FastAPI, NestJS), and generate step-by-step setup walkthroughs and recipes tailored to the detected codebase.
- **Commit**: [`647ce90`](https://github.com/darknecrocities/DomoScope/commit/647ce90)

### Entry 6: 2026-10-01 — Architectural Scoring and Quality Evaluation
- **Tool**: Claude 3.5 Sonnet
- **Request**: "Write an evaluation algorithm that calculates repository scores for modularity, security, test coverage, and documentation completeness."
- **Output**: Provided a weighting matrix and scoring formula taking raw file counts and test ratios.
- **What I kept / changed**: Refactored the heuristic in `src/services/repoComparison.ts` to evaluate real AST centrality metrics, circular dependency penalties, architectural maintainability, and presence of comprehensive documentation files (`SOT.md`, `README.md`, `CONTRIBUTING.md`).
- **Commit**: [`2d66f01`](https://github.com/darknecrocities/DomoScope/commit/2d66f01)

### Entry 7: 2026-10-05 — Subpath Hosting and Asset Bundling Polish
- **Tool**: Claude
- **Request**: "Resolve Vite asset path issues when serving dynamic single-page applications under arbitrary subpaths and hash routing."
- **Output**: Suggested configuring `base: './'` in `vite.config.ts` and swapping `BrowserRouter` for `HashRouter`.
- **What I kept / changed**: Implemented relative base paths and safe asset resolvers in `vite.config.ts` while preserving full deep-linking support across both web and containerized environments in `src/main.tsx`.
- **Commit**: [`bc56b65`](https://github.com/darknecrocities/DomoScope/commit/bc56b65)

---

## 2. Where the AI got it wrong (25 points)

Three real, non-trivial technical failures encountered during development where AI-generated suggestions were flawed or insecure, requiring manual diagnostic and architectural intervention.

### Case 1: Standard Output Contamination in MCP Stdio Transport
- **What it gave**: The AI suggested using `console.log()` statements for informational startup messages and progress updates during repository indexing inside the MCP server module.
- **What was wrong**: In the Model Context Protocol stdio transport, all messages sent over `process.stdout` must be strict, valid JSON-RPC 2.0 frames. Writing plain text strings like `"DomoScope MCP Server running..."` corrupted the JSON stream, causing Claude Desktop and Cursor to immediately crash with JSON parse errors.
- **What I did instead**: Redirected all server logs and diagnostic telemetry to `process.stderr` using a custom logger wrapper (`logger.error` / `process.stderr.write`), keeping `stdout` reserved exclusively for formatted JSON-RPC messages.
- **Commit**: [`3315fd1`](https://github.com/darknecrocities/DomoScope/commit/3315fd1)

### Case 2: Naive Path Traversal and Symlink Loops in Filesystem Scanner
- **What it gave**: The AI provided a simple recursive `fs.readdir` loop for scanning repository files that checked only `!file.startsWith('.')`.
- **What was wrong**: The implementation failed to follow `.gitignore` specifications and blindly followed symbolic links. When encountering circular symlinks or symlinks pointing outside the project root, it triggered infinite recursion, crashed the Node process with heap out-of-memory, and risked reading sensitive parent directories on the host machine.
- **What I did instead**: Implemented `isPathWithinRoot` checks and integrated `ignore` parser library to honor `.gitignore` patterns rigorously, while adding cycle detection on directory inodes in `src/services/local/localScanner.ts`.
- **Commit**: [`9a67fa1`](https://github.com/darknecrocities/DomoScope/commit/9a67fa1)

### Case 3: Inaccurate SQL Foreign Key Relationship Extraction
- **What it gave**: The AI suggested a single regex to match `FOREIGN KEY (column) REFERENCES table(column)` in SQL schemas.
- **What was wrong**: It completely failed to recognize inline foreign key declarations commonly used in PostgreSQL and SQLite (such as `user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`), resulting in empty ERD relationship arrows for standard relational tables.
- **What I did instead**: Authored a two-pass parser in `src/services/databaseParser.ts` that captures both table-level constraint clauses and column-level inline reference declarations, correctly resolving table and column relationships.
- **Commit**: [`3315fd1`](https://github.com/darknecrocities/DomoScope/commit/3315fd1)

---

## 3. Who wrote what (30 points)

Compliance with the 80/20 rule: showing that at least 20% of the project was authored directly by the developer, with full architectural understanding.

### Code Written by Myself (Arron Kian Parejas)

1. **Local Safe Scanner and Ingestion Service (`src/services/local/localScanner.ts`)**
   - **Commit**: [`9a67fa1`](https://github.com/darknecrocities/DomoScope/commit/9a67fa1)
   - **Explanation**: I designed and wrote the safe local file scanner from scratch. It enforces root-directory containment with strict canonical path resolution, filters hidden and ignored paths according to project `.gitignore` rules using the `ignore` library, prevents symlink traversal attacks, and limits file reads to 2MB to preserve memory performance during AST processing.

2. **Polyglot Database ERD Parser (`src/services/databaseParser.ts`)**
   - **Commit**: [`3315fd1`](https://github.com/darknecrocities/DomoScope/commit/3315fd1)
   - **Explanation**: I authored the relational database parser that identifies tables, fields, data types, primary keys, and foreign keys across PostgreSQL DDL, MySQL, SQLite, and Prisma schema definitions. I handled edge cases involving inline foreign keys (`REFERENCES other_table(id)`), nullable constraints, composite primary keys, and cascade rules to produce valid relational entity graphs for Postgres and SQL dialects.

3. **Universal Polyglot API Endpoint & Route Discovery Engine (`src/services/apiRouteCatalog.ts`)**
   - **Commit**: [`5461de1`](https://github.com/darknecrocities/DomoScope/commit/5461de1)
   - **Explanation**: I wrote the route scanner that crawls Node/Express router declarations (`app.get`, `router.post`, etc.), Next.js App and Pages routers, and backend handlers. It parses HTTP verbs, path variables, middleware chains, and handler symbols, cataloging the entire API surface into an interactive inspector table.

4. **System Source of Truth Specifications (`SOT.md` and `sot/*`)**
   - **Commit**: [`0e2ddfc`](https://github.com/darknecrocities/DomoScope/commit/0e2ddfc)
   - **Explanation**: I personally authored the complete 9-part system specification suite detailing the architectural topology, feature catalog, CLI commands, MCP protocol contracts, and security policies, ensuring complete deterministic alignment across the codebase.

### AI-Written Code Explained

1. **AST Dependency Graph Topological Sorting Algorithm (`src/services/graphBuilder.ts`)**
   - **Commit**: [`86cc8c0`](https://github.com/darknecrocities/DomoScope/commit/86cc8c0) / [`c863ba1`](https://github.com/darknecrocities/DomoScope/commit/c863ba1)
   - **Explanation**: The AI generated the core graph traversal and cycle detection routines utilizing Kahn's algorithm for topological sorting and Tarjan's strongly connected components algorithm. The code builds an in-memory adjacency list from import statements, computes in-degree and out-degree centrality for each module, and detects circular import chains. I thoroughly reviewed and tested this implementation to ensure it handles non-cyclic components gracefully and accurately highlights architectural bottlenecks.
