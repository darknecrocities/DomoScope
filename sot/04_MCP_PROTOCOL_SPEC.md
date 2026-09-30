# 04 — Model Context Protocol (MCP) Specification

**Protocol Version:** 2024-11-05  
**Transports:** Stdio JSON-RPC 2.0 (Local CLI) & Server-Sent Events (SSE / HTTP)  
**Registered Tools:** 16 Tools  
**Registered Prompts:** 3 Prompt Templates  

---

## 1. Transport Architectures

### 1.1. Stdio JSON-RPC 2.0 Transport
Used by local agent clients (Cursor, Claude Desktop, Antigravity, Windsurf, Cline).
- Executed via: `node bin/domoscope-mcp.js` or `npx domoscope mcp`.
- Communication occurs via standard input and standard output using newline-delimited JSON-RPC 2.0 strings.
- **Rule of Stdio Isolation:** All human-facing logs, diagnostics, and banner messages are strictly written to `stderr`. `stdout` is exclusively reserved for valid JSON-RPC 2.0 packets.

### 1.2. Remote Server-Sent Events (SSE) Transport
Used for cloud agents or remote microservice execution.
- Endpoint: `/api/mcp` (or hosted Vercel function).
- Accepts JSON-RPC POST payloads and maintains streaming SSE channels.

---

## 2. JSON-RPC Protocol Handshake

### 2.1. Initialization Request (`initialize`)
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {},
      "prompts": {}
    },
    "clientInfo": {
      "name": "Cursor",
      "version": "1.0.0"
    }
  }
}
```

### 2.2. Initialization Response
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {},
      "prompts": {}
    },
    "serverInfo": {
      "name": "domoscope-mcp",
      "version": "1.0.0"
    }
  }
}
```

---

## 3. Registered Tool Catalog (16 Tools)

### `get_repository_architecture`
Returns a high-level summary of the architectural layers, frameworks, and subsystem components.
```json
{
  "name": "get_repository_architecture",
  "inputSchema": {
    "type": "object",
    "properties": {
      "owner": { "type": "string" },
      "repo": { "type": "string" },
      "branch": { "type": "string" }
    },
    "required": ["owner", "repo"]
  }
}
```

### `get_dependency_graph`
Returns the directed dependency graph with nodes, categories, and edge connections.
```json
{
  "name": "get_dependency_graph",
  "inputSchema": {
    "type": "object",
    "properties": {
      "owner": { "type": "string" },
      "repo": { "type": "string" },
      "category": { "type": "string" },
      "limit": { "type": "number", "default": 200 }
    },
    "required": ["owner", "repo"]
  }
}
```

### `get_database_erd`
Returns the extracted relational database schema in structured JSON, raw SQL DDL, or Mermaid ERD.
```json
{
  "name": "get_database_erd",
  "inputSchema": {
    "type": "object",
    "properties": {
      "owner": { "type": "string" },
      "repo": { "type": "string" },
      "format": { "type": "string", "enum": ["mermaid", "sql", "json"], "default": "mermaid" }
    },
    "required": ["owner", "repo"]
  }
}
```

### `get_api_catalog`
Returns discovered HTTP routes and handlers.
```json
{
  "name": "get_api_catalog",
  "inputSchema": {
    "type": "object",
    "properties": {
      "owner": { "type": "string" },
      "repo": { "type": "string" }
    },
    "required": ["owner", "repo"]
  }
}
```

### `get_security_audit`
Returns vulnerability scan findings, leaked secrets, and remediation steps.
```json
{
  "name": "get_security_audit",
  "inputSchema": {
    "type": "object",
    "properties": {
      "owner": { "type": "string" },
      "repo": { "type": "string" }
    },
    "required": ["owner", "repo"]
  }
}
```

### `get_reverse_engineer_blueprint`
Returns the complete phased reconstruction recipe and subagent prompts.
```json
{
  "name": "get_reverse_engineer_blueprint",
  "inputSchema": {
    "type": "object",
    "properties": {
      "owner": { "type": "string" },
      "repo": { "type": "string" },
      "category": { "type": "string" }
    },
    "required": ["owner", "repo"]
  }
}
```

### `read_repository_file`
Safely reads file source contents with path containment validation.
```json
{
  "name": "read_repository_file",
  "inputSchema": {
    "type": "object",
    "properties": {
      "owner": { "type": "string" },
      "repo": { "type": "string" },
      "path": { "type": "string" }
    },
    "required": ["owner", "repo", "path"]
  }
}
```

---

## 4. Registered MCP Prompts (3 Prompts)

DomoScope registers standardized prompt templates that coding agents can invoke directly:

1. **`rebuild_subsystem`**: Pre-configures an agent with exact domain entity structures and API routes to re-implement a targeted module.
2. **`audit_security_vulnerabilities`**: Guides an agent through fixing high-risk secrets and unsafe configurations found during scanning.
3. **`generate_architectural_overview`**: Synthesizes an executive architectural review ready for inclusion in team PRs or documentation.

---

## 5. Client IDE Setup Cards

### Cursor (`.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "domoscope": {
      "command": "npx",
      "args": ["-y", "domoscope", "mcp"]
    }
  }
}
```

### Claude Desktop (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "domoscope": {
      "command": "node",
      "args": ["/Users/arronkianparejas/domoscope/bin/domoscope-mcp.js"],
      "env": {
        "GITHUB_TOKEN": "ghp_your_optional_token"
      }
    }
  }
}
```

### Antigravity / Gemini CLI:
```json
{
  "mcpServers": {
    "domoscope": {
      "command": "npx",
      "args": ["domoscope", "mcp"]
    }
  }
}
```
