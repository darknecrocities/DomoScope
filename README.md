<div align="center">

# 🔭 DomoScope

**Free, open-source, and autonomous GitHub repository inspection, visualization, and reverse-engineering platform.**

[![License: MIT](https://img.shields.io/badge/License-MIT-black.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-black.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-black.svg)](https://react.dev/)
[![Model Context Protocol](https://img.shields.io/badge/MCP-Protocol%202024--11--05-black.svg)](https://modelcontextprotocol.io/)
[![Tests](https://img.shields.io/badge/Vitest-100%25%20Passing-black.svg)](tests/)

[Live App](https://domoscope.vercel.app) • [MCP Server Setup](#-model-context-protocol-mcp-server) • [Reverse Engineering](#-autonomous-reverse-engineering-engine) • [Database ERD](#-polyglot-database-erd-engine) • [API Catalog](#-api-route-catalog) • [Documentation](#-getting-started)

</div>

---

## 📖 Overview

**DomoScope** transforms any public or private GitHub repository into an interactive, multi-dimensional architectural blueprint. Built with a strict monochrome editorial aesthetic and powered by in-browser static analysis, DomoScope lets developers, architects, and autonomous AI agents inspect codebases, reverse engineer complete systems, map database relationships, audit security vulnerabilities, and extract production-ready technical specifications in seconds.

---

## ⚡ Key Capabilities

```
                      ┌──────────────────────────────────────────────┐
                      │              GitHub Repository               │
                      └──────────────────────┬───────────────────────┘
                                             │
                      ┌──────────────────────▼───────────────────────┐
                      │       DomoScope Ingestion Engine             │
                      └──────┬───────────────┬───────────────┬───────┘
                             │               │               │
            ┌────────────────▼─┐   ┌─────────▼────────┐   ┌──▼────────────────┐
            │ Architecture &   │   │  Polyglot ERD    │   │ Reverse Engineer  │
            │ Dependency Graph │   │  Engine          │   │ Blueprint & Spec  │
            └────────────────┬─┘   └─────────┬────────┘   └──┬────────────────┘
                             │               │               │
            ┌────────────────▼───────────────▼───────────────▼────────────────┐
            │   DomoScope Model Context Protocol (MCP) Server & Studio        │
            │   (Claude Desktop, Cursor, Gemini CLI, Subagents, Autonomous Bots)│
            └─────────────────────────────────────────────────────────────────┘
```

### 🧠 Autonomous Reverse Engineering Engine
* **Architectural Reconstruction**: Analyzes code organization, file dependencies, and architectural patterns (Clean Architecture, MVC, Microservices, Event-Driven, Monoliths, Serverless).
* **Component Breakdown & Data Lifecycle**: Maps frontend component hierarchies, backend service flows, and state management lifecycles.
* **Step-by-Step Rebuilding Blueprint**: Generates an actionable, phase-by-phase implementation recipe for rebuilding or porting the project from scratch.
* **Subagent Prompts & Bot Delegation**: Pre-configures detailed execution prompts for AI coding agents to autonomously re-implement modules, database schemas, and API handlers.
* **Exportable Specifications**: Export complete reverse engineering blueprints as Markdown, Mermaid architecture diagrams, or direct LLM system prompts.

---

### 🔌 Model Context Protocol (MCP) Server
DomoScope exposes a native **Model Context Protocol (MCP)** server with dual-transport capability (**local stdio** and **remote cloud HTTP/SSE**), allowing any AI client or autonomous agent to connect directly and inspect codebases:

* **Stdio CLI Transport**: Run locally via `npx domoscope-mcp` or `node bin/domoscope-mcp.js`.
* **Cloud SSE / HTTP Transport**: Deploy serverless on Vercel (`/api/mcp`) for remote agents and webhooks.
* **Agent Integration**: Seamlessly connect **Claude Desktop**, **Cursor IDE**, **Gemini CLI**, **Windsurf**, **Antigravity**, **LangChain**, and **LlamaIndex**.

#### Registered MCP Tools:
| Tool Name | Description | Key Arguments |
|---|---|---|
| `get_repository_architecture` | Retrieves high-level architecture, layers, tech stack, and graph summary | `owner`, `repo`, `branch` |
| `get_database_erd` | Extracts database tables, columns, PK/FK relationships, and formats (JSON, SQL, DBML) | `owner`, `repo`, `format` |
| `get_reverse_engineer_blueprint` | Generates deep architectural reconstruction and rebuilding instructions | `owner`, `repo`, `category` |
| `get_api_catalog` | Extracts all backend, REST, GraphQL, tRPC, and serverless API endpoints | `owner`, `repo`, `framework` |
| `get_dependencies` | Scans manifests (`package.json`, `go.mod`, `Cargo.toml`, etc.) and usage | `owner`, `repo` |
| `get_cloud_services` | Detects integrated cloud infrastructure, auth, database, and payments | `owner`, `repo` |
| `get_security_audit` | In-browser static analysis of vulnerabilities, leaked secrets, and raw SQL | `owner`, `repo` |
| `query_domoscope` | AI-assisted natural language query answering architectural questions | `query`, `owner`, `repo` |
| `get_file_content` | Safely retrieves source code of specific repository files | `owner`, `repo`, `filePath` |
| `list_repository_files` | Lists filtered file tree with extension and path globbing | `owner`, `repo`, `extension` |

---

### 🗄️ Polyglot Database ERD Engine
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

### 🌐 Interactive Architecture & Dependency Graph
* **Real AST Import Resolution**: Parses ECMAScript `import`, CommonJS `require`, Go `import`, Python `import`, Rust `use`, and Dart `import` statements.
* **Interactive Canvas**: Powered by `@xyflow/react` and `dagre` with node filtering, cluster grouping, circular dependency detection, and depth slicing.
* **Source Viewer**: Monaco Editor side drawer with instant file jumping, syntax highlighting, and inline explanations.

---

### 📡 API Route Catalog & Endpoints
* Automatically discovers backend routes, HTTP methods, route params, request bodies, and controller handlers across:
  * **Next.js**: App Router (`app/**/route.ts`) and Pages Router (`pages/api/**`)
  * **Node.js**: Express, Fastify, NestJS, Koa, Hono
  * **Python**: FastAPI, Flask, Django REST Framework
  * **Go**: Gin, Fiber, Echo, standard `net/http`
  * **Rust**: Axum, Actix-web, Rocket
  * **PHP / Ruby**: Laravel, Ruby on Rails

---

### 🔒 Security Scanner & Static Audit
* Scans files entirely client-side in the browser:
  * Hardcoded API keys, JWT secrets, Stripe secret keys, and private certificates.
  * Insecure dynamic execution (`eval()`, `new Function()`, `exec()`, `execSync()`).
  * Raw SQL string concatenation and unsanitized queries.
  * Exposed staging endpoints, sensitive `.env` files, and misconfigured permissions.

---

### 🤖 Local AI Assistant (WebLLM)
* **Zero Cloud Latency & Total Privacy**: Run repository AI queries directly on-device using WebGPU acceleration via `@mlc-ai/web-llm`.
* **Deterministic Grounded Fallback**: Operates in offline environments with grounded rule-based architectural analysis when WebGPU is unavailable.

---

## 🛠️ Tech Stack

* **Frontend & Framework**: React 18, TypeScript, Vite, Tailwind CSS, Framer Motion
* **Graph & Diagram Visualization**: `@xyflow/react`, `dagre`, `mermaid`
* **Code Editor & Viewer**: `@monaco-editor/react`
* **Local On-Device AI**: `@mlc-ai/web-llm` (WebGPU)
* **Persistence & Caching**: IndexedDB (`idb`)
* **Icons**: Lucide React
* **Testing & Quality Assurance**: Vitest (100% unit & integration test coverage)
* **MCP Server Protocol**: `@modelcontextprotocol/sdk` (Protocol Version 2024-11-05)

---

## 🚀 Getting Started

### Prerequisites
* **Node.js 18+** (recommended Node v20 or v22)
* **npm**, **pnpm**, or **yarn**

### Local Setup

```bash
# 1. Clone the repository
git clone https://github.com/darknecrocities/DomoScope.git
cd DomoScope

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🤖 Model Context Protocol (MCP) Server Setup

DomoScope's MCP server allows AI agents to directly analyze and reverse engineer any repository.

### 1. Connecting Claude Desktop
Add DomoScope to your `claude_desktop_config.json`:

**MacOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

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

*Or via npx:*
```json
{
  "mcpServers": {
    "domoscope": {
      "command": "npx",
      "args": ["domoscope-mcp"]
    }
  }
}
```

### 2. Connecting Cursor IDE
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

## 🧪 Testing

DomoScope is tested with a comprehensive Vitest test suite covering:
* Real AST import resolution and dependency parsing
* Polyglot database schema synthesis (Prisma, SQL, Supabase, Firebase, MongoDB, TypeORM, Mermaid)
* DAG graph generation, cycle breaking, and Dagre layout calculations
* Reverse engineering blueprint generator and API route catalog
* MCP Server protocol handshake, JSON-RPC 2.0 handling, tool registration, and tool calls

```bash
# Run all unit and integration tests
npx vitest run

# Run with watch mode during development
npx vitest
```

---

## ⚙️ Environment Variables (Optional)

DomoScope runs completely free without requiring third-party API keys. 

GitHub provides an unauthenticated rate limit of 60 requests/hour per IP. To increase this to 5,000 requests/hour, configure a GitHub Personal Access Token:

```env
# .env
VITE_GITHUB_TOKEN=ghp_your_personal_access_token_here
```

Tokens can also be added directly inside the application via the in-app **Settings** modal with encrypted local storage.

---

## 🛡️ Security & Privacy

1. **Client-Side Processing**: Repository analysis, token parsing, and AST generation occur directly in your browser or local MCP process.
2. **Zero Code Execution**: DomoScope never executes repository binaries, shell scripts, or npm lifecycle hooks.
3. **Encrypted Credentials**: In-app GitHub tokens are stored locally in IndexedDB using AES-GCM encryption.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
