// Vercel Serverless Function: /api/mcp
// Model Context Protocol (MCP) server endpoint for DomoScope
// Conforms to MCP Specification (2024-11-05) over HTTP JSON-RPC 2.0 and SSE transports.

import {
  handleMcpRequest,
  DOMOSCOPE_MCP_TOOLS,
  DOMOSCOPE_MCP_PROMPTS,
  JSONRPCRequest,
} from '../src/services/mcpCore';

export const config = {
  runtime: 'nodejs',
  maxDuration: 60, // allow up to 60s for deep repository static analysis
};

export default async function handler(req: any, res: any) {
  // Set CORS headers for remote agents, IDE extensions, and browser clients
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS,HEAD');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-GitHub-Token, mcp-session-id'
  );
  res.setHeader('Access-Control-Expose-Headers', 'Content-Type, mcp-session-id');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Handle GET: MCP Discovery, Health Check, & SSE Initialization
  if (req.method === 'GET' || req.method === 'HEAD') {
    const isSse =
      req.query?.transport === 'sse' ||
      req.query?.sse === 'true' ||
      (typeof req.headers?.accept === 'string' && req.headers.accept.includes('text/event-stream'));

    if (isSse) {
      // SSE transport initialization
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      });

      const host = req.headers['host'] || 'domoscope.vercel.app';
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const endpointUrl = `${protocol}://${host}/api/mcp`;

      // Announce message endpoint per MCP SSE specification
      res.write(`event: endpoint\ndata: ${endpointUrl}\n\n`);
      res.write(`event: ping\ndata: {"timestamp":${Date.now()}}\n\n`);

      // Keep alive for 5 seconds then close or let client stream
      const timer = setTimeout(() => {
        try {
          res.end();
        } catch {
          // ignore
        }
      }, 5000);

      req.on('close', () => {
        clearTimeout(timer);
      });
      return;
    }

    // Standard JSON discovery endpoint
    res.status(200).json({
      status: 'online',
      server: 'domoscope-mcp',
      version: '1.0.0',
      protocolVersion: '2024-11-05',
      description: 'Model Context Protocol (MCP) server for DomoScope software architecture exploration',
      endpoints: {
        http_jsonrpc: '/api/mcp',
        sse: '/api/mcp?transport=sse',
      },
      capabilities: {
        tools: {
          count: DOMOSCOPE_MCP_TOOLS.length,
          available: DOMOSCOPE_MCP_TOOLS.map((t) => ({ name: t.name, description: t.description })),
        },
        prompts: {
          count: DOMOSCOPE_MCP_PROMPTS.length,
          available: DOMOSCOPE_MCP_PROMPTS.map((p) => ({ name: p.name, description: p.description })),
        },
        resources: [
          { uri: 'domoscope://tools/catalog', name: 'DomoScope Tools Catalog' },
          { uri: 'domoscope://architecture/schema', name: 'DomoScope Architecture Schema' },
        ],
      },
      quickConnect: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        exampleBody: {
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: 'get_repository_architecture',
            arguments: { owner: 'Thes-IS-IT', repo: 'Easylens' },
          },
        },
      },
    });
    return;
  }

  // Handle POST: JSON-RPC 2.0 requests
  if (req.method === 'POST') {
    let body = req.body;

    // Parse body if received as raw string or stream
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (err: any) {
        res.status(400).json({
          jsonrpc: '2.0',
          id: null,
          error: { code: -32700, message: `Parse error: ${err?.message || 'Invalid JSON'}` },
        });
        return;
      }
    }

    if (!body || typeof body !== 'object') {
      res.status(400).json({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32600, message: 'Invalid Request: body must be a JSON-RPC 2.0 object' },
      });
      return;
    }

    // Extract GitHub Token if provided in headers or env
    const authHeader = (req.headers['authorization'] as string) || '';
    const xGithubToken = (req.headers['x-github-token'] as string) || '';
    let githubToken =
      xGithubToken ||
      (authHeader.startsWith('Bearer ') || authHeader.startsWith('token ')
        ? authHeader.replace(/^(Bearer|token)\s+/i, '').trim()
        : authHeader) ||
      process.env.GITHUB_TOKEN ||
      process.env.VITE_GITHUB_TOKEN;

    // Handle batch JSON-RPC requests
    if (Array.isArray(body)) {
      const responses = await Promise.all(
        body.map((singleReq) => handleMcpRequest(singleReq as JSONRPCRequest, { githubToken }))
      );
      res.status(200).json(responses);
      return;
    }

    // Handle single JSON-RPC request
    try {
      const response = await handleMcpRequest(body as JSONRPCRequest, { githubToken });
      res.status(200).json(response);
    } catch (err: any) {
      res.status(500).json({
        jsonrpc: '2.0',
        id: body?.id ?? null,
        error: { code: -32603, message: err?.message || 'Internal server error processing MCP request' },
      });
    }
    return;
  }

  // Method not supported
  res.status(405).json({
    jsonrpc: '2.0',
    id: null,
    error: { code: -32601, message: `HTTP method ${req.method} not supported. Use GET or POST.` },
  });
}
