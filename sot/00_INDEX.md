# 🔭 DomoScope — Master Source of Truth (SOT)

**Version:** 1.0.0  
**Project:** DomoScope (`darknecrocities/DomoScope`)  
**Repository Type:** Local-First Repository Intelligence & Developer Experience Platform  
**Documentation Index:** Modular SOT Suite (`/sot`)  

---

## 📚 SOT Module Directory

The DomoScope architectural specification and system documentation is split into specialized modules for maintainability, developer onboarding, and AI agent ingestion:

| Module | Title | Primary Focus |
|---|---|---|
| [**01. Architecture Topology**](./01_ARCHITECTURE.md) | High-Level Architecture & Data Flows | System layers, data flow diagrams, boundaries, and runtime environments |
| [**02. Feature Catalog**](./02_FEATURES_CATALOG.md) | Exhaustive Capabilities & Status | Detailed listing of all platform features and capabilities |
| [**03. CLI Specification**](./03_CLI_SPECIFICATION.md) | 8 Subcommands & Command-Line Interface | `init`, `analyze`, `graph`, `docs`, `serve`, `watch`, `mcp`, `doctor` |
| [**04. MCP Protocol Specification**](./04_MCP_PROTOCOL_SPEC.md) | Model Context Protocol (MCP) Server | Stdio JSON-RPC & SSE transports, 16 tools, and prompt definitions |
| [**05. Analysis Engines**](./05_ANALYSIS_ENGINES.md) | Deep Static AST, ERD, API & Security Engines | Polyglot parser details, entity extraction, route catalogs, regex entropy |
| [**06. Reverse Engineering Spec**](./06_REVERSE_ENGINEERING_SPEC.md) | Autonomous Rebuilding & AI Blueprints | Phase-by-phase implementation recipes and agent delegation prompts |
| [**07. Docker Packaging**](./07_DOCKER_PACKAGING.md) | Containerization & Package Distribution | Multi-stage Docker packaging, compose orchestration, volume mounting |
| [**08. CI/CD & Testing Strategy**](./08_CICD_AND_TESTING.md) | GitHub Actions & Quality Assurance | Matrix testing (Node 20 & 22), Oxlint, Vitest, and smoke test suites |
| [**09. Security & Crypto Vault**](./09_SECURITY_AND_VAULT.md) | Privacy, Local Sandbox & Hardware Encryption | Zero egress guarantee, AES-GCM 256-bit token vault, path traversal guards |

---

## 🎯 Quick Navigation

- **Running DomoScope via CLI:** See [`03_CLI_SPECIFICATION.md`](./03_CLI_SPECIFICATION.md)
- **Connecting Cursor or Claude via MCP:** See [`04_MCP_PROTOCOL_SPEC.md`](./04_MCP_PROTOCOL_SPEC.md)
- **Running in Docker:** See [`07_DOCKER_PACKAGING.md`](./07_DOCKER_PACKAGING.md)
- **CI/CD Pipelines:** See [`08_CICD_AND_TESTING.md`](./08_CICD_AND_TESTING.md)
