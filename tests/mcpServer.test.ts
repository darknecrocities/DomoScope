import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  handleMcpRequest,
  DOMOSCOPE_MCP_TOOLS,
  DOMOSCOPE_MCP_PROMPTS,
  JSONRPCRequest,
} from '../src/services/mcpCore';

const mockPackageJson = JSON.stringify({
  name: 'easylens',
  dependencies: {
    flutter: '*',
    provider: '^6.1.2',
    sqflite: '^2.3.0',
  },
});

const mockSqlSchema = `
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL,
  email TEXT NOT NULL
);

CREATE TABLE devices (
  id INTEGER PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  device_name TEXT NOT NULL
);
`;

const mockTree = [
  { path: 'pubspec.yaml', type: 'blob', size: 200 },
  { path: 'README.md', type: 'blob', size: 150 },
  { path: 'lib/main.dart', type: 'blob', size: 400 },
  { path: 'lib/screens/dashboard.dart', type: 'blob', size: 600 },
  { path: 'lib/services/api_client.dart', type: 'blob', size: 500 },
  { path: 'lib/models/schema.sql', type: 'blob', size: 800 },
];

describe('DomoScope MCP Server Protocol Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    // Mock global fetch to provide fast, deterministic repository data
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: any) => {
      const url = String(input?.url || input || '');

      // 1. Repo metadata endpoint
      if (url.includes('api.github.com/repos/') && !url.includes('/git/trees') && !url.includes('/contents/')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            name: 'Easylens',
            full_name: 'Thes-IS-IT/Easylens',
            description: 'AI-assisted vision platform for the visually impaired',
            default_branch: 'main',
            stargazers_count: 42,
            forks_count: 5,
            open_issues_count: 1,
            watchers_count: 42,
            language: 'Dart',
            private: false,
            updated_at: '2026-09-29T00:00:00Z',
          }),
        } as any;
      }

      // 2. Git tree endpoint
      if (url.includes('/git/trees/')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            tree: mockTree,
          }),
        } as any;
      }

      // 3. Raw file contents or REST contents
      if (url.includes('pubspec.yaml') || url.includes('package.json')) {
        return {
          ok: true,
          status: 200,
          text: async () => mockPackageJson,
        } as any;
      }

      if (url.includes('.sql') || url.includes('schema')) {
        return {
          ok: true,
          status: 200,
          text: async () => mockSqlSchema,
        } as any;
      }

      if (url.includes('main.dart') || url.includes('dashboard.dart')) {
        return {
          ok: true,
          status: 200,
          text: async () => `import 'package:flutter/material.dart'; void main() => runApp(MyApp());`,
        } as any;
      }

      return {
        ok: true,
        status: 200,
        text: async () => `# EasyLens Documentation\n\nAI mobility aid.`,
      } as any;
    });
  });

  describe('Protocol Lifecycle Handshake', () => {
    it('handles initialize with 2024-11-05 protocol version', async () => {
      const req: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test-agent', version: '1.0.0' },
        },
      };

      const res = await handleMcpRequest(req);
      expect(res.jsonrpc).toBe('2.0');
      expect(res.id).toBe(1);
      expect(res.result).toBeDefined();
      expect(res.result.protocolVersion).toBe('2024-11-05');
      expect(res.result.serverInfo.name).toBe('domoscope-mcp');
      expect(res.result.capabilities.tools).toBeDefined();
      expect(res.result.capabilities.prompts).toBeDefined();
      expect(res.result.capabilities.resources).toBeDefined();
    });

    it('handles notifications/initialized', async () => {
      const req: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'notifications/initialized',
      };

      const res = await handleMcpRequest(req);
      expect(res.jsonrpc).toBe('2.0');
      expect(res.id).toBe(2);
      expect(res.result).toEqual({});
    });

    it('handles ping request', async () => {
      const req: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 'ping-123',
        method: 'ping',
      };

      const res = await handleMcpRequest(req);
      expect(res.jsonrpc).toBe('2.0');
      expect(res.id).toBe('ping-123');
      expect(res.result).toEqual({});
    });
  });

  describe('Tools Registry', () => {
    it('returns all 16 DomoScope tools on tools/list', async () => {
      const req: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/list',
      };

      const res = await handleMcpRequest(req);
      expect(res.result.tools).toBeDefined();
      expect(res.result.tools.length).toBe(16);

      const toolNames = res.result.tools.map((t: any) => t.name);
      expect(toolNames).toContain('get_repository_architecture');
      expect(toolNames).toContain('get_reverse_engineer_blueprint');
      expect(toolNames).toContain('get_database_erd');
      expect(toolNames).toContain('get_api_catalog');
      expect(toolNames).toContain('get_security_audit');
      expect(toolNames).toContain('get_dependencies');
      expect(toolNames).toContain('get_file_tree');
      expect(toolNames).toContain('read_repository_file');
      expect(toolNames).toContain('generate_markdown_spec');
      expect(toolNames).toContain('query_domoscope');
      expect(toolNames).toContain('get_project_overview');
      expect(toolNames).toContain('get_dependency_graph');
      expect(toolNames).toContain('get_module_details');
      expect(toolNames).toContain('get_analysis_status');
      expect(toolNames).toContain('get_changed_files');
      expect(toolNames).toContain('list_repository_files');
    });

    it('each tool defines strict inputSchema with required owner and repo', () => {
      for (const tool of DOMOSCOPE_MCP_TOOLS) {
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema.properties.owner).toBeDefined();
        expect(tool.inputSchema.properties.repo).toBeDefined();
        expect(tool.inputSchema.required).toContain('owner');
        expect(tool.inputSchema.required).toContain('repo');
      }
    });
  });

  describe('Prompts and Resources', () => {
    it('returns prompts on prompts/list', async () => {
      const req: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 4,
        method: 'prompts/list',
      };

      const res = await handleMcpRequest(req);
      expect(res.result.prompts.length).toBe(DOMOSCOPE_MCP_PROMPTS.length);
    });

    it('generates prompt template on prompts/get', async () => {
      const req: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 5,
        method: 'prompts/get',
        params: {
          name: 'reverse_engineer_subsystem',
          arguments: { owner: 'Thes-IS-IT', repo: 'Easylens' },
        },
      };

      const res = await handleMcpRequest(req);
      expect(res.result.messages).toBeDefined();
      expect(res.result.messages[0].content.text).toContain('Thes-IS-IT/Easylens');
    });

    it('lists and reads architectural catalog resources', async () => {
      const listReq: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 6,
        method: 'resources/list',
      };

      const listRes = await handleMcpRequest(listReq);
      expect(listRes.result.resources.length).toBeGreaterThan(0);

      const readReq: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 7,
        method: 'resources/read',
        params: { uri: 'domoscope://tools/catalog' },
      };

      const readRes = await handleMcpRequest(readReq);
      expect(readRes.result.contents[0].text).toContain('get_repository_architecture');
    });
  });

  describe('Tool Execution (tools/call)', () => {
    it('returns error when tool name is missing or unknown', async () => {
      const req: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 8,
        method: 'tools/call',
        params: { name: 'unknown_tool', arguments: { owner: 'test', repo: 'test' } },
      };

      const res = await handleMcpRequest(req);
      expect(res.error).toBeDefined();
      expect(res.error?.code).toBe(-32601);
    });

    it('returns error when owner or repo is missing', async () => {
      const req: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 9,
        method: 'tools/call',
        params: { name: 'get_repository_architecture', arguments: { owner: 'only-owner' } },
      };

      const res = await handleMcpRequest(req);
      expect(res.error).toBeDefined();
      expect(res.error?.code).toBe(-32602);
      expect(res.error?.message).toContain('Both "owner" and "repo"');
    });

    it('executes get_repository_architecture tool', async () => {
      const req: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 10,
        method: 'tools/call',
        params: {
          name: 'get_repository_architecture',
          arguments: { owner: 'Thes-IS-IT', repo: 'Easylens' },
        },
      };

      const res = await handleMcpRequest(req);
      expect(res.result).toBeDefined();
      expect(res.result.content[0].type).toBe('text');
      const parsed = JSON.parse(res.result.content[0].text);
      expect(parsed.repository).toBe('Thes-IS-IT/Easylens');
      expect(parsed.primaryFramework).toBeDefined();
      expect(parsed.architectureGraph).toBeDefined();
    });

    it('executes get_reverse_engineer_blueprint tool', async () => {
      const req: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 11,
        method: 'tools/call',
        params: {
          name: 'get_reverse_engineer_blueprint',
          arguments: { owner: 'Thes-IS-IT', repo: 'Easylens', category: 'fullstack' },
        },
      };

      const res = await handleMcpRequest(req);
      expect(res.result).toBeDefined();
      expect(res.result.content[0].text).toContain('Easylens');
    });

    it('executes get_database_erd in json, sql, and mermaid formats', async () => {
      // JSON format
      const jsonRes = await handleMcpRequest({
        jsonrpc: '2.0',
        id: 12,
        method: 'tools/call',
        params: {
          name: 'get_database_erd',
          arguments: { owner: 'Thes-IS-IT', repo: 'Easylens', format: 'json' },
        },
      });
      expect(jsonRes.result.content[0].text).toBeDefined();

      // SQL format
      const sqlRes = await handleMcpRequest({
        jsonrpc: '2.0',
        id: 13,
        method: 'tools/call',
        params: {
          name: 'get_database_erd',
          arguments: { owner: 'Thes-IS-IT', repo: 'Easylens', format: 'sql' },
        },
      });
      expect(sqlRes.result.content[0].text).toContain('DomoScope Generated SQL Schema');

      // Mermaid format
      const mermaidRes = await handleMcpRequest({
        jsonrpc: '2.0',
        id: 14,
        method: 'tools/call',
        params: {
          name: 'get_database_erd',
          arguments: { owner: 'Thes-IS-IT', repo: 'Easylens', format: 'mermaid' },
        },
      });
      expect(mermaidRes.result.content[0].text).toContain('erDiagram');
    });

    it('executes get_api_catalog tool', async () => {
      const res = await handleMcpRequest({
        jsonrpc: '2.0',
        id: 15,
        method: 'tools/call',
        params: {
          name: 'get_api_catalog',
          arguments: { owner: 'Thes-IS-IT', repo: 'Easylens' },
        },
      });
      expect(res.result.content[0].text).toBeDefined();
      const parsed = JSON.parse(res.result.content[0].text);
      expect(parsed.repository).toBe('Thes-IS-IT/Easylens');
      expect(Array.isArray(parsed.endpoints)).toBe(true);
    });

    it('executes get_security_audit tool', async () => {
      const res = await handleMcpRequest({
        jsonrpc: '2.0',
        id: 16,
        method: 'tools/call',
        params: {
          name: 'get_security_audit',
          arguments: { owner: 'Thes-IS-IT', repo: 'Easylens' },
        },
      });
      const parsed = JSON.parse(res.result.content[0].text);
      expect(parsed.repository).toBe('Thes-IS-IT/Easylens');
      expect(Array.isArray(parsed.findings)).toBe(true);
    });

    it('executes get_dependencies tool', async () => {
      const res = await handleMcpRequest({
        jsonrpc: '2.0',
        id: 17,
        method: 'tools/call',
        params: {
          name: 'get_dependencies',
          arguments: { owner: 'Thes-IS-IT', repo: 'Easylens' },
        },
      });
      const parsed = JSON.parse(res.result.content[0].text);
      expect(parsed.repository).toBe('Thes-IS-IT/Easylens');
      expect(Array.isArray(parsed.dependencies)).toBe(true);
    });

    it('executes get_file_tree tool with limit', async () => {
      const res = await handleMcpRequest({
        jsonrpc: '2.0',
        id: 18,
        method: 'tools/call',
        params: {
          name: 'get_file_tree',
          arguments: { owner: 'Thes-IS-IT', repo: 'Easylens', limit: 3 },
        },
      });
      const parsed = JSON.parse(res.result.content[0].text);
      expect(parsed.repository).toBe('Thes-IS-IT/Easylens');
      expect(parsed.returnedFiles).toBeLessThanOrEqual(3);
    });

    it('executes generate_markdown_spec tool', async () => {
      const res = await handleMcpRequest({
        jsonrpc: '2.0',
        id: 19,
        method: 'tools/call',
        params: {
          name: 'generate_markdown_spec',
          arguments: { owner: 'Thes-IS-IT', repo: 'Easylens' },
        },
      });
      expect(res.result.content[0].text).toContain('System Architecture Specification');
      expect(res.result.content[0].text).toContain('Thes-IS-IT/Easylens');
    });

    it('executes query_domoscope tool', async () => {
      const res = await handleMcpRequest({
        jsonrpc: '2.0',
        id: 20,
        method: 'tools/call',
        params: {
          name: 'query_domoscope',
          arguments: {
            owner: 'Thes-IS-IT',
            repo: 'Easylens',
            query: 'What are the main entry points and framework?',
          },
        },
      });
      expect(res.result.content[0].text).toContain('DomoScope Codebase Summary');
      expect(res.result.content[0].text).toContain('Primary Framework');
    });

    it('executes get_project_overview tool', async () => {
      const res = await handleMcpRequest({
        jsonrpc: '2.0',
        id: 21,
        method: 'tools/call',
        params: {
          name: 'get_project_overview',
          arguments: { owner: 'Thes-IS-IT', repo: 'Easylens' },
        },
      });
      const parsed = JSON.parse(res.result.content[0].text);
      expect(parsed.repository).toBe('Thes-IS-IT/Easylens');
      expect(parsed.primaryFramework).toBeDefined();
      expect(parsed.totalIndexedFiles).toBeGreaterThan(0);
    });

    it('executes get_dependency_graph tool', async () => {
      const res = await handleMcpRequest({
        jsonrpc: '2.0',
        id: 22,
        method: 'tools/call',
        params: {
          name: 'get_dependency_graph',
          arguments: { owner: 'Thes-IS-IT', repo: 'Easylens', limit: 10 },
        },
      });
      const parsed = JSON.parse(res.result.content[0].text);
      expect(parsed.repository).toBe('Thes-IS-IT/Easylens');
      expect(Array.isArray(parsed.nodes)).toBe(true);
      expect(Array.isArray(parsed.edges)).toBe(true);
    });

    it('executes get_module_details tool', async () => {
      const res = await handleMcpRequest({
        jsonrpc: '2.0',
        id: 23,
        method: 'tools/call',
        params: {
          name: 'get_module_details',
          arguments: { owner: 'Thes-IS-IT', repo: 'Easylens', path: 'lib/main.dart' },
        },
      });
      const parsed = JSON.parse(res.result.content[0].text);
      expect(parsed.filePath).toBe('lib/main.dart');
      expect(parsed.category).toBeDefined();
    });

    it('executes get_analysis_status tool', async () => {
      const res = await handleMcpRequest({
        jsonrpc: '2.0',
        id: 24,
        method: 'tools/call',
        params: {
          name: 'get_analysis_status',
          arguments: { owner: 'Thes-IS-IT', repo: 'Easylens' },
        },
      });
      const parsed = JSON.parse(res.result.content[0].text);
      expect(parsed.repository).toBe('Thes-IS-IT/Easylens');
      expect(parsed.isFresh).toBe(true);
      expect(parsed.totalFiles).toBeGreaterThan(0);
    });

    it('executes get_changed_files tool', async () => {
      const res = await handleMcpRequest({
        jsonrpc: '2.0',
        id: 25,
        method: 'tools/call',
        params: {
          name: 'get_changed_files',
          arguments: { owner: 'Thes-IS-IT', repo: 'Easylens' },
        },
      });
      const parsed = JSON.parse(res.result.content[0].text);
      expect(parsed.repository).toBe('Thes-IS-IT/Easylens');
      expect(Array.isArray(parsed.files)).toBe(true);
    });

    it('executes list_repository_files tool', async () => {
      const res = await handleMcpRequest({
        jsonrpc: '2.0',
        id: 26,
        method: 'tools/call',
        params: {
          name: 'list_repository_files',
          arguments: { owner: 'Thes-IS-IT', repo: 'Easylens', limit: 5 },
        },
      });
      const parsed = JSON.parse(res.result.content[0].text);
      expect(parsed.repository).toBe('Thes-IS-IT/Easylens');
      expect(parsed.returnedFiles).toBeLessThanOrEqual(5);
    });
  });

  describe('Error handling', () => {
    it('returns method not found for unknown JSON-RPC method', async () => {
      const res = await handleMcpRequest({
        jsonrpc: '2.0',
        id: 99,
        method: 'non_existent_method',
      });
      expect(res.error).toBeDefined();
      expect(res.error?.code).toBe(-32601);
    });
  });
});
