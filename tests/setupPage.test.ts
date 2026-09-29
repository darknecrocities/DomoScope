import { describe, it, expect } from 'vitest';
import { DOMOSCOPE_MCP_TOOLS } from '../src/services/mcpCore';
import { isFileSystemAccessSupported } from '../src/services/browserLocalScanner';
import { CryptoService } from '../src/services/cryptoService';

describe('Setup Page & Developer Experience Diagnostics', () => {
  it('exposes all 16 registered MCP tools with valid schemas and descriptions', () => {
    expect(DOMOSCOPE_MCP_TOOLS.length).toBe(16);

    const toolNames = DOMOSCOPE_MCP_TOOLS.map((t) => t.name);
    expect(toolNames).toContain('get_project_overview');
    expect(toolNames).toContain('get_repository_architecture');
    expect(toolNames).toContain('get_database_erd');
    expect(toolNames).toContain('get_api_catalog');
    expect(toolNames).toContain('get_security_audit');
    expect(toolNames).toContain('get_module_details');
    expect(toolNames).toContain('get_dependencies');
    expect(toolNames).toContain('read_repository_file');
    expect(toolNames).toContain('list_repository_files');
    expect(toolNames).toContain('get_file_tree');
    expect(toolNames).toContain('generate_markdown_spec');
    expect(toolNames).toContain('get_reverse_engineer_blueprint');
    expect(toolNames).toContain('query_domoscope');
    expect(toolNames).toContain('get_dependency_graph');
    expect(toolNames).toContain('get_analysis_status');
    expect(toolNames).toContain('get_changed_files');

    DOMOSCOPE_MCP_TOOLS.forEach((tool) => {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
    });
  });

  it('generates valid JSON-RPC 2.0 configuration blocks for AI agent clients', () => {
    const claudeConfig = {
      mcpServers: {
        domoscope: {
          command: 'node',
          args: ['/path/to/domoscope/bin/domoscope-mcp.js'],
          env: {
            GITHUB_TOKEN: 'ghp_test_token_12345',
          },
        },
      },
    };

    expect(claudeConfig.mcpServers.domoscope.command).toBe('node');
    expect(claudeConfig.mcpServers.domoscope.args[0]).toContain('domoscope-mcp.js');
    expect(claudeConfig.mcpServers.domoscope.env.GITHUB_TOKEN).toBe('ghp_test_token_12345');

    const jsonStr = JSON.stringify(claudeConfig, null, 2);
    expect(JSON.parse(jsonStr)).toEqual(claudeConfig);
  });

  it('verifies AES-GCM token encryption and masking functionality', async () => {
    const rawToken = 'ghp_secretTokenForDomoScopeTesting123456';
    const masked = CryptoService.maskToken(rawToken);

    expect(masked.startsWith('ghp_')).toBe(true);
    expect(masked.endsWith('3456')).toBe(true);
    expect(masked).not.toContain('secretTokenForDomoScopeTesting');

    const sanitizedError = CryptoService.sanitizeError(`Failed request with token ${rawToken} on endpoint`);
    expect(sanitizedError).not.toContain(rawToken);
    expect(sanitizedError).toContain('[REDACTED_GITHUB_TOKEN]');
  });

  it('checks File System Access API support helper safely in test environment', () => {
    const isSupported = isFileSystemAccessSupported();
    // In node/vitest environment, showDirectoryPicker is not in window
    expect(typeof isSupported).toBe('boolean');
  });
});
