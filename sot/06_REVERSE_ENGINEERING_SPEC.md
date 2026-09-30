# 06 — Autonomous Reverse Engineering & Agent Blueprints

**Purpose:** Bridge Human Developer Architecture to Autonomous Coding Agents  
**Target Agents:** Cursor, Claude Desktop / Code, Antigravity, Windsurf, Cline, Aider  
**Format:** Markdown (`REVERSE_ENGINEER_SPEC.md`) + Mermaid Flowcharts & ERDs  

---

## 1. Problem Statement: The "Forgotten Codebase" Dilemma

Modern engineering teams and solo developers accumulate repositories that become dormant. When attempting to resume, extend, or rebuild these projects using AI coding agents, developers face significant hurdles:
1. **Context Window Saturation:** Feeding entire large repositories into an LLM context wastes tokens, degrades instruction adherence, and increases hallucinations.
2. **Missing Architectural Intent:** Without structured documentation, AI agents guess framework conventions, leading to duplicate utility functions and circular imports.
3. **Implicit Data Models:** Implicit schemas (e.g. raw SQL migrations or unstructured JSON) cause agents to invent non-existent column names or foreign keys.

DomoScope's Autonomous Reverse Engineering Engine eliminates this friction by extracting an explicit, **ground-truth engineering blueprint** that can be directly handed to an AI agent.

---

## 2. Six-Phase Rebuilding Blueprint Architecture

When `domoscope docs` is executed, or when a user clicks **"Generate .md"** in the DomoScope studio, the engine synthesizes a structured blueprint comprising six distinct phases:

### Phase 1: Architectural Foundation & Environment Setup
- Primary runtime, framework version, build toolchain, and package manager.
- Identified architectural design pattern (Clean Architecture, MVC, Microservices, Monolith, Serverless).
- Entry points (`src/main.tsx`, `cmd/main.go`, `app.py`).
- Environment variable contracts (`.env.example` extraction).

### Phase 2: Domain Entities & Database Migrations
- Complete catalog of all discovered tables and domain models.
- Column types, nullability, defaults, primary keys, and foreign keys.
- Executable Mermaid Entity-Relationship Diagram (`erDiagram`).

### Phase 3: Module Topology & Directed Dependency Graph
- Directory topology and module boundaries.
- The 15 most-referenced hub modules and their incoming/outgoing import edge counts.
- Directed visual architecture flowchart (`flowchart TD`).

### Phase 4: API Surface & Route Catalog
- Complete endpoint listing with HTTP verbs (`GET`, `POST`, `PUT`, `DELETE`).
- Relative source file paths and line number coordinates for each route handler.

### Phase 5: Security Findings & Hardening Checklist
- Any exposed secrets, hardcoded API keys, or vulnerable dependencies.
- Step-by-step remediation instructions for secure deployment.

### Phase 6: Autonomous Subagent Prompts
Pre-formatted prompts designed for multi-agent delegation.

---

## 3. Subagent Prompt Templates

DomoScope automatically generates copy-paste prompts formatted for modern LLM agents:

### 3.1. Database & Schema Migration Subagent Prompt
```markdown
You are the Database & Schema Migration Subagent.
Your goal is to implement the persistence layer for the project based on the following verified DomoScope schema:

Project: {{projectName}}
Detected Engine: {{databaseType}}

Schema Definitions:
{{databaseTables}}

Relationships:
{{databaseRelationships}}

Instructions:
1. Generate the exact schema migration file using the target ORM.
2. Implement primary and foreign key constraints matching the ERD.
3. Add seed data fixtures for local testing.
```

### 3.2. API & Route Handler Subagent Prompt
```markdown
You are the API & Backend Route Subagent.
Your goal is to implement the HTTP endpoints discovered in the DomoScope catalog:

Endpoints to Implement:
{{apiRouteList}}

Instructions:
1. Create controller handlers matching each HTTP method and route path.
2. Ensure input validation schemas (e.g. Zod or Pydantic) validate request bodies.
3. Wire the route handlers into the database layer created in Phase 2.
```

### 3.3. Full Rebuild Orchestrator Prompt (For Cursor / Claude Code)
```markdown
I want to resume and continue development on this codebase. 
Here is the official DomoScope Reverse Engineering Blueprint:

<blueprint>
{{fullReverseEngineerSpec}}
</blueprint>

Your task:
1. Review the architecture style and module boundaries.
2. Ensure new changes adhere to the primary framework: {{primaryFramework}}.
3. Begin by creating tests for the core business logic.
```
