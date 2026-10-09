<div align="center">

# DomoScope

**Free, open-source, local-first developer experience (DX) and repository intelligence platform with npm CLI, real-time AST analysis, interactive architecture visualization, and Model Context Protocol (MCP) support for AI coding agents.**

[![License: MIT](https://img.shields.io/badge/License-MIT-black.svg)](LICENSE)
[![Creator: Arron Kian Parejas](https://img.shields.io/badge/Creator-Arron%20Kian%20Parejas-black.svg)](https://github.com/DarkNecrocities)
[![Made with AI](https://img.shields.io/badge/Made_with-AI_assistance-blue)](AI-USAGE.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-black.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-black.svg)](https://react.dev/)
[![Model Context Protocol](https://img.shields.io/badge/MCP-Protocol%202024--11--05-black.svg)](https://modelcontextprotocol.io/)
[![Tests](https://img.shields.io/badge/Vitest-100%25%20Passing-black.svg)](tests/)

[Live App](https://domoscope.vercel.app) • [Architecture SOT](SOT.md) • [CLI Quickstart](#cli-quickstart) • [MCP Server Setup](#model-context-protocol-mcp-server) • [Reverse Engineering](#autonomous-reverse-engineering-engine) • [Database ERD](#polyglot-database-erd-engine) • [Local Development](#local-development)

</div>

---

## Overview

**DomoScope** transforms any local project or GitHub repository into an interactive, multi-dimensional architectural blueprint. Built with a strict monochrome editorial aesthetic and powered by framework-independent static analysis, DomoScope lets developers, architects, and autonomous AI agents inspect codebases, reverse engineer complete systems, map database relationships, audit security vulnerabilities, and extract production-ready technical specifications in seconds.

---

## Antigravity CLI Interactive Experience & Terminal ASCII Studio

DomoScope provides a full-featured, interactive terminal REPL inspired by **Google Antigravity CLI (`agy`)** and **Claude Code**:

```
 ██████╗   ██████╗  ███╗   ███╗  ██████╗  ███████╗  ██████╗  ██████╗  ██████╗  ███████╗
 ██╔══██╗ ██╔═══██╗ ████╗ ████║ ██╔═══██╗ ██╔════╝ ██╔════╝ ██╔═══██╗ ██╔══██╗ ██╔════╝
 ██║  ██║ ██║   ██║ ██╔████╔██║ ██║   ██║ ███████╗ ██║      ██║   ██║ ██████╔╝ █████╗  
 ██║  ██║ ██║   ██║ ██║╚██╔╝██║ ██║   ██║ ╚════██║ ██║      ██║   ██║ ██╔═══╝  ██╔══╝  
 ██████╔╝ ╚██████╔╝ ██║ ╚═╝ ██║ ╚██████╔╝ ███████║ ╚██████╗ ╚██████╔╝ ██║      ███████╗
 ╚═════╝   ╚═════╝  ╚═╝     ╚═╝  ╚═════╝  ╚══════╝  ╚═════╝  ╚═════╝  ╚═╝      ╚══════╝

  ╭──────────────────────────────────────────────────────────────────────────╮
  │ 🔭 DomoScope v1.0.0 — Autonomous Repository Intelligence & Studio        │
  ├──────────────────────────────────────────────────────────────────────────┤
  │ Project: your-project    Branch: main (15d5dd6)                          │
  │ Engine:  AST + Polyglot ERD    Protocol: MCP 2024-11-05 (16 Tools)       │
  │ Mode:    Antigravity CLI REPL  Status:   ● Ready                         │
  ╰──────────────────────────────────────────────────────────────────────────╯
```

```bash
# 1. Launch Antigravity-style interactive terminal TUI (default in TTY)
npx domoscope

# 2. Display custom DomoScope ASCII art banner & terminal badges
npx domoscope ascii
```

### Interactive Slash Commands (`/`)
Inside the interactive session, use slash commands or ask natural language questions:
- `/analyze`: Run deep AST repository analysis with live visual summary.
- `/status`: View LoC metrics, file counts, detected frameworks & cache stats.
- `/graph`: Inspect module hub nodes, import fan-out, and export Mermaid/JSON.
- `/db`: Inspect discovered database tables, columns, relations & ORM schemas.
- `/routes`: Browse and filter discovered API route catalog.
- `/security`: Run security audit for hardcoded tokens & vulnerabilities.
- `/reverse`: View autonomous reverse-engineering blueprint & rebuild recipe.
- `/skill`: Export autonomous AI Agent `SKILL.md` for Antigravity, Cursor, and Claude.
- `/docs`: Generate full 7-file markdown documentation suite in `.domoscope/docs/`.
- `/compare <dir>`: Compare current project side-by-side with another repo.
- `/serve`: Toggle local DomoScope web studio dashboard (`http://localhost:4004`).
- `/watch`: Toggle live file watcher with incremental re-analysis.
- `/mcp`: Display Model Context Protocol configuration snippets.
- `/doctor`: Run system and repository diagnostic health checks.
- **Natural Language Queries**: Ask questions directly in terminal (`what does this project do?`, `show api routes`, `find auth`).

---

## CLI Quickstart

DomoScope provides a zero-dependency npm CLI package for instant terminal analysis, live file watching, documentation generation, and agentic workflows:

```bash
# 1. Launch Antigravity interactive terminal session
npx domoscope

# 2. Display DomoScope ASCII art banner
npx domoscope ascii

# 3. Inspect repository health & diagnostic checks
npx domoscope doctor

# 4. Run baseline project initialization
npx domoscope init

# 5. Analyze codebase architecture with structured output
npx domoscope analyze

# 6. Export architectural dependency graph (Mermaid or JSON)
npx domoscope graph --format mermaid --output architecture.mmd

# 7. Generate complete 7-file markdown documentation suite
npx domoscope docs --output ./docs/architecture

# 8. Generate autonomous AI agent SKILL.md specification
npx domoscope skill --output SKILL.md

# 9. Compare two repositories side-by-side with dynamic grading
npx domoscope compare ./repoA ./repoB --format markdown

# 10. Launch local interactive studio dashboard on localhost:4004
npx domoscope serve --port 4004

# 11. Start live file watcher with incremental re-analysis
npx domoscope watch

# 12. Run local Model Context Protocol (MCP) server for AI agents
npx domoscope mcp
```

### CLI Command Reference:

| Command | Description | Key Options |
|---|---|---|
| `domoscope` (or `-i`) | Launches Antigravity-style interactive terminal REPL (default in TTY) | `-d, --dir`, `--verbose` |
| `domoscope ascii` | Displays custom DomoScope ASCII art banner & terminal badges | `--compact`, `--no-color` |
| `domoscope init` | Inspects current project and creates `.domoscope.json` configuration | `-d, --dir`, `--force` |
| `domoscope analyze` | Executes unified static analysis and outputs structured summary | `--json`, `--output <file>`, `--no-cache` |
| `domoscope graph` | Exports module dependency and architectural graph | `--format <mermaid\|json>`, `--output <file>` |
| `domoscope docs` | Generates 7 markdown guides & agent skill in `.domoscope/docs/` | `--output <dir>` |
| `domoscope skill` | Exports ready-to-use `SKILL.md` pack for Claude, Cursor, Antigravity | `--output <file>` |
| `domoscope compare` | Compares two projects side-by-side with dynamic architectural grading | `--format <table\|json\|markdown>`, `--output <file>` |
| `domoscope serve` | Launches local dashboard and REST/SSE server | `--port <number>`, `--open`, `--no-open` |
| `domoscope watch` | Runs debounced live terminal watcher with instant cache diffing | `-d, --dir`, `--verbose` |
| `domoscope mcp` | Starts stdio JSON-RPC 2.0 MCP server for AI coding agents | `--verbose` |
| `domoscope doctor` | Executes environment and repository diagnostic health checks | `-d, --dir` |

---

## Key Capabilities

```
                      ┌──────────────────────────────────────────────┐
                      │    Local Project / GitHub Remote Repository  │
                      └──────────────────────┬───────────────────────┘
                                             │
                      ┌──────────────────────▼───────────────────────┐
                      │   Safe Discovery & Incremental Cache Engine  │
                      │  (.gitignore, sha256 diff, symlink containment)│
                      └──────┬───────────────┬───────────────┬───────┘
                             │               │               │
            ┌────────────────▼─┐   ┌─────────▼────────┐   ┌──▼────────────────┐
            │ Architecture &   │   │  Polyglot ERD    │   │ Reverse Engineer  │
            │ Dependency Graph │   │  Engine          │   │ Blueprint & Spec  │
            └────────────────┬─┘   └─────────┬────────┘   └──┬────────────────┘
                             │               │               │
            ┌────────────────▼───────────────▼───────────────▼────────────────┐
            │   DomoScope Model Context Protocol (MCP) Server & Local Studio  │
            │   (Claude Desktop, Cursor, Gemini CLI, Antigravity, Subagents)  │
            └─────────────────────────────────────────────────────────────────┘
```

### Autonomous Reverse Engineering Engine
* **Architectural Reconstruction**: Analyzes code organization, file dependencies, and architectural patterns (Clean Architecture, MVC, Microservices, Event-Driven, Monoliths, Serverless).
* **Component Breakdown & Data Lifecycle**: Maps frontend component hierarchies, backend service flows, and state management lifecycles.
* **Step-by-Step Rebuilding Blueprint**: Generates an actionable, phase-by-phase implementation recipe for rebuilding or porting the project from scratch.
* **Subagent Prompts & Bot Delegation**: Pre-configures detailed execution prompts for AI coding agents to autonomously re-implement modules, database schemas, and API handlers.
* **Exportable Specifications**: Export complete reverse engineering blueprints as Markdown, Mermaid architecture diagrams, or direct LLM system prompts.

---

### Model Context Protocol (MCP) Server
DomoScope exposes a native **Model Context Protocol (MCP)** server with dual-transport capability (**local stdio** and **remote cloud HTTP/SSE**), allowing any AI client or autonomous agent to connect directly and inspect codebases:

* **Stdio CLI Transport**: Run locally via `npx domoscope mcp` or `node bin/domoscope-mcp.js`.
* **Cloud SSE / HTTP Transport**: Deploy serverless on Vercel (`/api/mcp`) for remote agents and webhooks.
* **Agent Integration**: Seamlessly connect **Claude Desktop**, **Cursor IDE**, **Gemini CLI**, **Windsurf**, **Antigravity**, **LangChain**, and **LlamaIndex**.

#### Registered MCP Tools:
| Tool Name | Description | Key Arguments |
|---|---|---|
| `get_repository_architecture` | High-level architecture, layers, tech stack, and graph summary | `owner`, `repo`, `branch` |
| `get_project_overview` | High-level project summary, primary/secondary frameworks, cloud foundations | `owner`, `repo` |
| `get_dependency_graph` | Architectural dependency and module graph with category filters | `owner`, `repo`, `category`, `limit` |
| `get_module_details` | Deep static AST inspection for a specific file or module | `owner`, `repo`, `path` |
| `get_analysis_status` | Freshness, memory cache state, and diagnostic health check | `owner`, `repo` |
| `get_changed_files` | Files modified, added, or deleted since last indexed snapshot | `owner`, `repo` |
| `list_repository_files` | Full indexed file tree with categorization and size metadata | `owner`, `repo`, `limit` |
| `get_database_erd` | Database tables, columns, PK/FK relationships (JSON, SQL DDL, Mermaid) | `owner`, `repo`, `format` |
| `get_reverse_engineer_blueprint` | Deep architectural reconstruction and rebuilding instructions | `owner`, `repo`, `category` |
| `get_api_catalog` | All backend, REST, GraphQL, tRPC, and serverless API endpoints | `owner`, `repo` |
| `get_dependencies` | Scans manifests (`package.json`, `go.mod`, `Cargo.toml`, etc.) | `owner`, `repo` |
| `get_security_audit` | Static analysis of vulnerabilities, leaked secrets, and raw SQL | `owner`, `repo` |
| `read_repository_file` | Safely retrieves source code of specific repository files | `owner`, `repo`, `path` |
| `get_file_tree` | Full directory structure and file categories | `owner`, `repo`, `limit` |
| `generate_markdown_spec` | Comprehensive 1,000+ line production technical specification | `owner`, `repo` |
| `query_domoscope` | AI-assisted natural language query answering architectural questions | `query`, `owner`, `repo` |

---

### Polyglot Database ERD Engine
DomoScope parses relational and document schemas across modern database ecosystems and ORMs without hardcoded bias:

* **Supabase**: AST parsing of generated TypeScript definitions (`database.types.ts`, `types/supabase.ts`) with explicit `Relationships: [...]` foreign key extraction.
* **Firebase / Firestore**: Lexical hierarchy stack parser for `firestore.rules` and client queries mapping nested subcollections (e.g. `users/{userId}/orders/{orderId}`) into parent-child relationship lines.
* **MongoDB & Mongoose**: Extracts `new Schema({ ... })` definitions with `ref: 'Model'` associations.
* **TypeORM**: Decorator AST parsing (`@Entity`, `@PrimaryGeneratedColumn`, `@Column`, `@ManyToOne`, `@JoinColumn`) with automatic class-to-table name mapping.
* **Prisma ORM**: Full support for `schema.prisma` models, relations (`@relation`), scalar types, enums, and composite keys.
* **SQL DDL**: PostgreSQL, MySQL, SQLite, and MariaDB `CREATE TABLE`, `FOREIGN KEY (...) REFERENCES ...`, `CONSTRAINT`, and schema prefixes (`public.users`, `auth.users`).
* **Drizzle ORM**: Parses `pgTable`, `mysqlTable`, `sqliteTable`, and `.references()` relations.
* **Drift / Moor**: Dart/Flutter table classes, auto-increment keys, and foreign columns.
* **Mermaid ERD**: Markdown code blocks and `.mermaid` / `.mmd` diagrams.
* **Domain Entity Synthesis**: Synthesizes structured entity tables from TypeScript interfaces, Go structs, Python Pydantic/Dataclasses, and Java/Kotlin classes.
* **Layout-Aware Handle Routing**: Top-to-Bottom (TB) and Left-to-Right (LR) Dagre graph routing eliminating crossed lines and horizontal doglegs.

---

### Interactive Architecture & Dependency Graph
* **Real AST Import Resolution**: Parses ECMAScript `import`, CommonJS `require`, Go `import`, Python `import`, Rust `use`, and Dart `import` statements.
* **Interactive Canvas**: Powered by `@xyflow/react` and `dagre` with node filtering, cluster grouping, circular dependency detection, and depth slicing.
* **Source Viewer**: Monaco Editor side drawer with instant file jumping, syntax highlighting, and inline explanations.

---

## Local Development

### Prerequisites
* Node.js 18.0.0 or higher
* npm 9.0.0 or higher

### Installation

```bash
# Clone the repository
git clone https://github.com/darknecrocities/DomoScope.git
cd DomoScope

# Install dependencies
npm install

# Start local development server
npm run dev
```

---

## Configuring AI Coding Agents

### 1. Claude Desktop Configuration
Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "domoscope": {
      "command": "node",
      "args": ["/absolute/path/to/DomoScope/bin/domoscope-mcp.js"]
    }
  }
}
```

### 2. Cursor IDE Configuration
Add to `.cursor/mcp.json` in your workspace:

```json
{
  "mcpServers": {
    "domoscope": {
      "command": "node",
      "args": ["/absolute/path/to/DomoScope/bin/domoscope-mcp.js"]
    }
  }
}
```

### 3. Connecting via Remote Cloud Endpoint (Vercel)
For remote AI agents or webhooks:

```json
{
  "mcpServers": {
    "domoscope-cloud": {
      "url": "https://domoscope.vercel.app/api/mcp",
      "type": "sse"
    }
  }
}
```

---

## Testing

DomoScope is tested with a comprehensive Vitest test suite covering:
* Local filesystem scanning, `.gitignore` matching, and path traversal protection
* Local cache manager atomic persistence, diffing, and corruption recovery
* Real AST import resolution and dependency parsing
* Polyglot database schema synthesis (Prisma, SQL, Supabase, Firebase, MongoDB, TypeORM, Mermaid)
* DAG graph generation, cycle breaking, and Dagre layout calculations
* Reverse engineering blueprint generator and API route catalog
* MCP Server protocol handshake, JSON-RPC 2.0 handling, tool registration, and tool calls

```bash
# Run all unit and integration tests (23 suites, 142+ tests)
npx vitest run

# Run with watch mode during development
npx vitest
```

---

## Known Issues & Next Steps

### Known Issues
1. **Large Monorepo In-Memory Spikes**: AST parsing and dependency graph generation for repositories with >10,000 files currently load source modules directly in Node.js process memory. Mitigated via 2MB per-file cutoff and `.gitignore` pruning, but full streaming AST ingestion is planned.
2. **Deeply Nested Dynamic Routes**: Complex, dynamically evaluated Express router factories (e.g. `app.use(createRouter(cfg))`) require runtime evaluation and fallback to static regex parsing.
3. **MCP Stdio Transport Strictness**: All diagnostic and debug logs must be routed strictly to `stderr`; accidental `stdout` writes from third-party libraries will corrupt the JSON-RPC packet stream.

### Next Steps (Week 3 Roadmap)
1. **Docker Containerization**: Finalize `Dockerfile` and `docker-compose.yml` for zero-configuration self-hosted deployment.
2. **WebAssembly Parsing**: Introduce Tree-sitter WebAssembly bindings to offload syntax parsing to web workers.
3. **Interactive ERD Schema Editing**: Allow bidirectional visual schema modifications with instant SQL migration export.

---

## Security & Privacy

1. **Local-First Processing**: Repository analysis, token parsing, and AST generation occur directly in your browser or local MCP process.
2. **Path Traversal Containment**: Scanners enforce strict boundary checks preventing symlinks from escaping project roots.
3. **Sensitive File Protection**: API keys, credentials, and `.env` secrets are automatically redacted in audit outputs.
4. **Zero Arbitrary Execution**: DomoScope never executes repository binaries, shell scripts, or untrusted package hooks.
5. **Encrypted Credentials**: In-app GitHub tokens are stored locally in IndexedDB using AES-GCM encryption.

---

## AI Usage

[![Made with AI](https://img.shields.io/badge/Made_with-AI_assistance-blue)](AI-USAGE.md)

DomoScope was developed with AI assistance from **Google Antigravity** and **Claude 3.5 Sonnet** (~40% AI assistance for boilerplate scaffolding, regex exploration, and AST heuristics; ~60% manually designed and written for safe local scanners, polyglot database/API parsers, and SOT specifications, strictly exceeding the >=20% self-authored requirement).

See [AI-USAGE.md](AI-USAGE.md) for full disclosure, commit evidence, and breakdown of self-written vs. AI-generated code.

---

## Creator & Trademark

**DomoScope** is designed, architected, and created by **Arron Kian Parejas** ([@DarkNecrocities](https://github.com/DarkNecrocities)).

* **Creator & Author**: Arron Kian Parejas
* **GitHub Username**: [DarkNecrocities](https://github.com/DarkNecrocities)
* **Trademark Notice**: DomoScope is an official trademark and property of Arron Kian Parejas (DarkNecrocities). All rights reserved.
* **Copyright**: Copyright (c) 2026 Arron Kian Parejas. All rights reserved.

---

## License

This project is licensed under the [MIT License](LICENSE) - Copyright (c) 2026 Arron Kian Parejas (DarkNecrocities).
