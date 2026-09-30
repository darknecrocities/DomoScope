# DomoScope — System Source of Truth (SOT)
**Version:** 1.0.0  
**Status:** Approved & Living Document  
**Target Runtimes:** Node.js >= 18, Modern Chromium/WebKit Browsers (WebGPU-enabled), Docker (Linux/x86_64 & ARM64)  
**License:** MIT  

> **Modular SOT Suite**: For deep-dive subsystem specifications, consult the modular documentation in the [`sot/`](./sot/00_INDEX.md) directory:
> - [**01. Architecture Topology**](./sot/01_ARCHITECTURE.md) • [**02. Feature Catalog**](./sot/02_FEATURES_CATALOG.md) • [**03. CLI Specification**](./sot/03_CLI_SPECIFICATION.md)
> - [**04. MCP Protocol Spec**](./sot/04_MCP_PROTOCOL_SPEC.md) • [**05. Analysis Engines**](./sot/05_ANALYSIS_ENGINES.md) • [**06. Reverse Engineering**](./sot/06_REVERSE_ENGINEERING_SPEC.md)
> - [**07. Docker Packaging**](./sot/07_DOCKER_PACKAGING.md) • [**08. CI/CD & Testing**](./sot/08_CICD_AND_TESTING.md) • [**09. Security & Vault**](./sot/09_SECURITY_AND_VAULT.md)

---

## 1. Executive Summary & Core Mission

**DomoScope** is an open-source, local-first developer experience (DX) and repository intelligence platform. It converts any local codebase or GitHub repository into an interactive, multi-dimensional architectural blueprint. 

### Key Value Propositions
1. **Local-First & Zero Egress**: Complete source code scanning, AST parsing, and dependency mapping happen entirely on the user's machine (or inside their private container). No source code is transmitted to external proprietary cloud servers.
2. **Context Standardization for Autonomous AI Agents**: Generates structured, deterministic markdown specifications (`.md`) and Mermaid diagrams so coding agents (Cursor, Claude, Antigravity, Windsurf, Cline, Aider) can immediately understand, resume, or re-implement forgotten codebases without context window degradation.
3. **Native Model Context Protocol (MCP) Server**: Implements the official 2024-11-05 MCP specification across dual transports (stdio JSON-RPC 2.0 and remote HTTP/SSE), allowing external AI assistants to query codebases programmatically.
4. **Polyglot Database & API Cataloging**: Automatically extracts Entity Relationship Diagrams (ERDs) and REST/API routes across multiple languages, ORMs, and backend frameworks.
5. **Deterministic Rebuilding Blueprints**: Reverse engineers architectural patterns into phased implementation recipes and subagent delegation prompts.

---

## 2. High-Level System Architecture

DomoScope follows a modular, layered architecture designed for low latency, zero-configuration execution, and cross-runtime flexibility (Browser, Node.js CLI, Docker Container, and Serverless Edge).

```mermaid
flowchart TD
    subgraph InputSources ["Input Sources"]
        LocalRepo["Local Directory / Workspace (Host or Docker Volume)"]
        RemoteRepo["GitHub Remote API (Octokit / Token Vault)"]
    end

    subgraph CoreEngine ["DomoScope Core Analysis Engines"]
        Scanner["Safe File Scanner (.gitignore, Symlink Guard, Sha256 Diff)"]
        CacheMgr["Local Cache Manager (.domoscope/cache.json)"]
        ASTEngine["AST & Module Dependency Graph Engine"]
        DBParser["Polyglot DB & ERD Parser (Prisma, SQL, Mongoose, TypeORM)"]
        APICatalog["API Route Discovery Engine (Express, Next, FastAPI, etc.)"]
        SecurityScanner["Security & Secret Entropy Audit Engine"]
        ReverseEng["Reverse Engineering Blueprint & Prompt Engine"]
    end

    subgraph OutputSurfaces ["Output & Consumption Surfaces"]
        CLI["Zero-Install CLI (npx domoscope 10 commands)"]
        LocalServer["Local Studio Daemon (HTTP/SSE on localhost:4004)"]
        WebStudio["React 19 Interactive Web Studio (Monaco, XYFlow, Tailwind)"]
        DocsGen["7-File Markdown Suite Generator (.domoscope/docs/)"]
        SkillGen["Autonomous Agent SKILL.md Generator"]
        MCPEngine["Model Context Protocol (MCP) Server (Stdio & SSE)"]
    end

    subgraph AIAgents ["Autonomous AI Agents"]
        AgentCursor["Cursor IDE"]
        AgentClaude["Claude Desktop"]
        AgentAntigravity["Antigravity / Gemini"]
        AgentOther["Windsurf / Cline / Aider"]
    end

    InputSources --> Scanner
    Scanner --> CacheMgr
    CacheMgr --> ASTEngine & DBParser & APICatalog & SecurityScanner & ReverseEng
    
    ASTEngine & DBParser & APICatalog & SecurityScanner & ReverseEng --> OutputSurfaces
    OutputSurfaces --> DocsGen
    DocsGen --> AIAgents
    MCPEngine <==> AIAgents
```

---

## 3. Subsystem Breakdown

### 3.1. Local Scanner & File Ingestion (`src/services/local/localScanner.ts`)
* **Safeguards**:
  * Strict path traversal prevention (`isPathWithinRoot`) ensuring file operations cannot escape the target workspace.
  * Real-time `.gitignore` parser adherence, automatically filtering `node_modules`, `build`, `.git`, `.next`, binaries, and lockfiles.
  * Symlink resolution containment checking to avoid directory loops and arbitrary file leaks.
  * Maximum file size boundaries (2MB per file) to prevent memory exhaustion on giant media/bundle dumps.
* **Metadata Extraction**: Computes fast streaming SHA-256 hashes for each file to enable sub-second incremental caching.

### 3.2. AST & Dependency Graph Engine (`src/services/graphBuilder.ts`, `localAnalysisEngine.ts`)
* Analyzes ES6 imports, CommonJS `require`, dynamic `import()`, Python `import`, Go imports, and Dart package declarations.
* Computes directed acyclic graphs with metrics:
  * In-degree / Out-degree centrality.
  * Imported-by counts to identify architectural bottlenecks and core utilities.
  * Categorization: components, services, hooks, utilities, styles, configurations, and models.
* Generates exportable Mermaid flowcharts (`graph TD`) and JSON adjacency lists.

### 3.3. Polyglot Database & ERD Engine (`src/services/databaseParser.ts`)
Parses schema definitions into structured database tables, column types, primary keys (PK), foreign keys (FK), nullability, and relations:
* **Prisma**: Parses `schema.prisma` models, attributes (`@id`, `@relation`, `@default`), and relational references.
* **SQL DDL**: Parses `CREATE TABLE` statements across PostgreSQL, MySQL, and SQLite dialects.
* **Supabase / PostgreSQL**: Detects relational schemas, enum types, and foreign key constraints.
* **Mongoose / MongoDB**: Extracts Mongoose schema models and embedded object definitions.
* **TypeORM / Sequelize**: Identifies entity decorators and table classes.
* **Output**: Renders interactive canvas diagrams via `@xyflow/react` and exports clean Mermaid ERDs (`erDiagram`).

### 3.4. API Route Discovery Catalog (`src/services/apiRouteCatalog.ts`)
Discovers HTTP route paths, HTTP methods (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`), and source line coordinates for:
* **Node/TS/JS**: Express, Fastify, NestJS, Next.js (App Router `route.ts` & Pages Router `api/*`).
* **Python**: FastAPI, Flask, Django REST Framework (`urls.py`).
* **Go**: Gin, Fiber, Chi.
* **Java/Kotlin**: Spring Boot (`@GetMapping`, `@PostMapping`).
* **Ruby**: Rails `routes.rb`.

### 3.5. Security & Secret Leak Scanner (`src/services/securityScanner.ts`)
Performs static analysis and regex entropy checks against source code for high-risk vulnerabilities:
* AWS Access Keys (`AKIA...`), GitHub Personal Access Tokens (`ghp_...`), OpenAI API keys (`sk-...`), Slack tokens.
* Private RSA/EC keys (`-----BEGIN PRIVATE KEY-----`).
* Hardcoded database connection strings (`postgres://...`, `mongodb+srv://...`).
* JWT signing secrets and hardcoded authorization tokens.
* Assigns risk ratings: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW` with actionable remediation guidance.

### 3.6. Autonomous Reverse Engineering & Blueprint Engine (`src/services/reverseEngineerGenerator.ts`)
Reconstructs the mental model of a codebase for human developers and autonomous AI coding agents:
* **Architecture Style Detection**: Identifies whether the project is Monolithic, Microservices, Clean Architecture, MVC, Serverless, or Event-Driven.
* **Component Breakdown**: Maps UI hierarchies to backend services and data stores.
* **Phase-by-Phase Rebuilding Plan**: Step 1: Core Foundation -> Step 2: Data Models -> Step 3: Business Logic -> Step 4: UI/API Layer -> Step 5: Tests.
* **Subagent Delegation Prompts**: Pre-formats copy-paste prompts tailored for AI coding agents to re-create or extend specific subsystems.

### 3.7. Markdown Documentation Generator (`src/services/local/localDocsGenerator.ts`)
Generates 6 standardized markdown documents in `.domoscope/docs/` (or user-chosen directory):
1. `PROJECT_OVERVIEW.md`: Mission, language distribution, framework stack, and entry points.
2. `ARCHITECTURE.md`: Module graph, high-reference hubs, and visual Mermaid architecture flowcharts.
3. `DATABASE.md`: Complete table catalog, columns, PK/FK links, and Mermaid ERD.
4. `API_REFERENCE.md`: Discovered API endpoints, HTTP methods, and source code coordinates.
5. `SECURITY_AUDIT.md`: Categorized security findings and secret exposure audit.
6. `REVERSE_ENGINEER_SPEC.md`: 1,000+ line actionable implementation specification and AI prompts.

### 3.8. Model Context Protocol (MCP) Engine (`src/services/mcpCore.ts`, `bin/domoscope-mcp.js`)
* Compliant with Model Context Protocol specification (2024-11-05).
* Exposes **16 registered tools** and **3 prompts** over stdio JSON-RPC 2.0 and HTTP/SSE.
* Standard tools:
  * `get_repository_architecture`: High-level system structure, layers, and frameworks.
  * `get_project_overview`: File metrics, frameworks, and cloud services.
  * `get_dependency_graph`: Directed module dependency graph with filters.
  * `get_module_details`: AST details, imports, and exports for a specific file.
  * `get_database_erd`: Schemas and relationships in JSON, SQL DDL, or Mermaid.
  * `get_reverse_engineer_blueprint`: Rebuilding instructions and subagent prompts.
  * `read_repository_file`: Safe bounded file reader.
  * `query_domoscope`: Grounded natural language architectural Q&A.

### 3.9. Local Server & Studio Daemon (`src/services/local/localServer.ts`)
* Built-in Node.js HTTP & Server-Sent Events (SSE) daemon running on `localhost:4004`.
* Binds to `0.0.0.0` for full Docker container port forwarding.
* Provides live SSE stream (`/api/local/events`) for instantaneous dashboard reload on filesystem modifications.
* Serves pre-compiled production Vite assets with SPA history API fallback.

---

## 4. Complete Feature Catalog

| Feature Category | Feature Name | Description | Status |
|---|---|---|:---:|
| **Analysis** | Polyglot Framework Detection | Identifies 30+ frameworks across JS/TS, Python, Go, Rust, Java, Dart | Done |
| **Analysis** | AST Dependency Graph | Interactive directed acyclic graph with centrality metrics | Done |
| **Analysis** | Polyglot ERD Generator | Prisma, SQL DDL, Mongoose, TypeORM with Mermaid export | Done |
| **Analysis** | API Route Discovery | Catalog of REST routes across 8 major backend ecosystems | Done |
| **Analysis** | Security & Secret Audit | Scans for leaked keys, tokens, DB URLs, and CVE patterns | Done |
| **Analysis** | Cloud & Infra Detection | Detects AWS, GCP, Azure, Docker, Vercel, Supabase, Firebase configs | Done |
| **AI / Agentic** | Model Context Protocol (MCP) | Full stdio & SSE MCP server with 16 tools for AI coding assistants | Done |
| **AI / Agentic** | Autonomous Rebuild Blueprint | Phased implementation recipes and subagent delegation prompts | Done |
| **AI / Agentic** | 7-File Markdown Suite | Automated `.md` doc generator (`domoscope docs`) | Done |
| **AI / Agentic** | Autonomous Agent `SKILL.md` Pack | Exportable `SKILL.md` specification for Claude, Codex, Cursor (`domoscope skill`) | Done |
| **AI / Agentic** | In-Browser WebGPU LLM | Local offline LLM execution via WebLLM (Qwen, Llama, DeepSeek) | Done |
| **AI / Agentic** | Interactive Prompt Generator | UI wizard generating customized prompts for Cursor, Claude, Antigravity | Done |
| **Analysis & Diff** | Dual-Repository Comparison | Evaluates two repositories side-by-side with dynamic architectural grading | Done |
| **CLI & Runtime** | Zero-Install CLI | 10 executable subcommands via `npx domoscope <command>` | Done |
| **CLI & Runtime** | Incremental File Watcher | Debounced filesystem watcher with SHA-256 hot cache invalidation | Done |
| **CLI & Runtime** | Local Studio Daemon | Localhost:4004 visual dashboard with real-time SSE updates | Done |
| **Security** | Hardware Token Encryption | AES-GCM 256-bit encrypted GitHub token vault in IndexedDB | Done |
| **Security** | Safe Path Containment | Strict traversal and symlink guards preventing unauthorized file access | Done |
| **Deployment** | Multi-Stage Dockerfile | Production-ready Alpine container running Node 22 with non-root security | Done |
| **Deployment** | Docker Compose | Pre-configured `docker-compose.yml` with host volume mounting | Done |
| **CI / CD** | Automated GitHub Actions CI | Matrix testing (Node 20 & 22), Oxlint, Vitest, Vite build, Docker test | Done |
| **CI / CD** | Release & Container Publish | Automated semantic release and GHCR Docker image deployment | Done |

---

## 5. CLI Command Reference

| Command | Usage | Description | Key Options |
|---|---|---|---|
| `init` | `domoscope init` | Scans directory and creates recommended `.domoscope.json` config | `--force`, `--verbose` |
| `analyze` | `domoscope analyze [path]` | Executes static analysis and outputs formatted metrics table | `--json`, `--output <file>`, `--no-cache` |
| `graph` | `domoscope graph` | Exports dependency module graph | `--format <mermaid\|json>`, `--output <file>` |
| `docs` | `domoscope docs` | Generates 7-file markdown documentation suite | `--output <dir>` |
| `skill` | `domoscope skill` | Exports autonomous AI agent `SKILL.md` pack | `--output <file>` |
| `compare` | `domoscope compare <pathA> [pathB]` | Compares two projects side-by-side with dynamic architectural grading | `--format <table\|json\|markdown>`, `--output <file>` |
| `serve` | `domoscope serve` | Launches local studio dashboard and REST/SSE daemon | `--port <num>`, `--host <ip>`, `--no-watch` |
| `watch` | `domoscope watch` | Starts live terminal watcher with incremental cache diffing | `--verbose`, `-d, --dir` |
| `mcp` | `domoscope mcp` | Starts stdio JSON-RPC 2.0 MCP server for AI coding agents | `--list-tools`, `--verbose` |
| `doctor` | `domoscope doctor` | Executes environment and repository diagnostic health checks | `--verbose` |

---

## 6. Docker & Containerization Architecture

DomoScope is packaged with a two-stage Alpine Linux container:
1. **Builder Stage (`node:22-alpine`)**: Installs build toolchain, executes `npm ci`, compiles TypeScript, and creates optimized Vite production bundle in `/app/dist`.
2. **Runner Stage (`node:22-alpine`)**:
   * Contains only production dependencies (`npm ci --omit=dev`).
   * Runs as unprivileged `node` user (UID 1000).
   * Binds to `0.0.0.0:4004` to support container port mapping.
   * Mounts the target host project into `/workspace:rw`.
   * Includes active `HEALTHCHECK` probing `http://localhost:4004/api/local/status`.

### Running with Docker Compose:
```bash
docker compose up -d
# Studio is immediately accessible at http://localhost:4004
```

### Running with Docker CLI:
```bash
docker run -d \
  --name domoscope \
  -p 4004:4004 \
  -v $(pwd):/workspace \
  domoscope:latest
```

---

## 7. CI/CD & Testing Strategy

### 7.1. Automated Test Suite (Vitest)
* **Unit Testing**: Covers AST parsers, database schema extractors, route detectors, and crypto vaults across 25 test suites (156+ assertions).
* **Integration Testing**: Tests end-to-end CLI execution, doctor diagnostics, file generation, cache recovery, and stdio MCP server messaging.
* **Execution Performance**: Full test run completes in < 1 second.

### 7.2. GitHub Actions Pipeline (`.github/workflows/ci.yml`)
1. **Matrix Validation**: Tests against Node.js 20.x (LTS) and Node.js 22.x (Current).
2. **Linting Check**: Runs `oxlint` with 116 high-performance static analysis rules.
3. **Automated Testing**: Runs `npm test` verifying 100% passing test assertions.
4. **Production Build**: Executes `npm run build` validating Rollup bundle generation and TypeScript compilation.
5. **CLI Verification**: Executes `domoscope --help`, `domoscope doctor`, and `domoscope-mcp --list-tools`.
6. **Docker Smoke Test**: Builds Docker image, starts container in CI, and verifies health check response via curl.
