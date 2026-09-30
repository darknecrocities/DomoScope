# 02 — Comprehensive Feature Catalog

This document details all supported capabilities across DomoScope's intelligence platform.

---

## 1. Feature Matrix

| Category | Feature Name | Description | Status |
|---|---|---|:---:|
| **Codebase Intelligence** | Polyglot Framework Detection | 30+ frameworks identified (React, Next.js, Vue, FastAPI, Django, Express, Spring, Flutter, etc.) | Production |
| **Codebase Intelligence** | Directed AST Dependency Graph | Interactive dependency graph with hub detection and Mermaid export | Production |
| **Codebase Intelligence** | Dual-Repository Comparison & Grading | Side-by-side comparison of 2 repositories with dynamic architectural, scale, DB, API, security and rebuild grading | Production |
| **Database & Models** | Polyglot Database ERD Engine | Prisma, SQL DDL (PostgreSQL, MySQL, SQLite), Mongoose, TypeORM with Mermaid ERD generation | Production |
| **API & Networking** | Automated API Route Catalog | Discovers REST routes across Express, Next.js App/Pages router, FastAPI, Flask, Django, Spring Boot, Gin | Production |
| **Security & Safety** | Secret & Credential Leak Scanner | High-entropy scanner for AWS keys, GitHub tokens, database connection strings, JWTs, and private keys | Production |
| **Security & Safety** | Safe Path Containment | Guard preventing directory traversal and out-of-boundary access | Production |
| **Security & Safety** | Hardware Vault Encryption | AES-GCM 256-bit encryption for GitHub tokens stored in IndexedDB | Production |
| **AI & Agentic DX** | Model Context Protocol (MCP) | Dual stdio and HTTP/SSE MCP server with 16 registered tools and 3 prompts (2024-11-05 spec) | Production |
| **AI & Agentic DX** | Autonomous Rebuild Blueprints | Phased step-by-step implementation blueprints and subagent prompts | Production |
| **AI & Agentic DX** | 7-File Markdown Suite Generator | Generates complete documentation suite including `SKILL.md` in `.domoscope/docs/` (`domoscope docs`) | Production |
| **AI & Agentic DX** | Autonomous Agent `SKILL.md` Generator | Dedicated skill generator (`domoscope skill`) for Claude Code, Cursor, Codex, and Antigravity | Production |
| **AI & Agentic DX** | In-Browser WebGPU LLM Engine | Offline local LLM inference via `@mlc-ai/web-llm` (Qwen, Llama, DeepSeek) directly in browser | Production |
| **AI & Agentic DX** | Interactive Agent Prompt Wizard | Generates custom prompts for Cursor, Claude, Antigravity, Windsurf, Cline | Production |
| **CLI & Runtime** | Zero-Install Node CLI | 10 executable subcommands (`doctor`, `init`, `analyze`, `graph`, `docs`, `skill`, `compare`, `serve`, `watch`, `mcp`) | Production |
| **CLI & Runtime** | Incremental File Watcher | Debounced file watcher with instant SHA-256 hot cache invalidation | Production |
| **CLI & Runtime** | Local Studio Daemon | Localhost:4004 visual studio with live SSE reload | Production |
| **Packaging & CI/CD** | Multi-Stage Dockerfile | Production-ready Alpine container running Node 22 as unprivileged user | Production |
| **Packaging & CI/CD** | Docker Compose | Pre-configured `docker-compose.yml` with host volume mapping | Production |
| **Packaging & CI/CD** | GitHub Actions Matrix CI | Tests across Node 20 & 22, Oxlint, Vitest (157 passing tests), Vite build, and Docker smoke tests | Production |
| **Packaging & CI/CD** | Automated GHCR Publishing | Automated release workflow publishing Docker packages on semantic tags | Production |
