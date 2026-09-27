import { ApiEndpoint } from '../types';

/**
 * Universal Polyglot API Endpoint & Route Discovery Engine
 *
 * Scans codebases across Next.js (App & Pages routers), Express, NestJS,
 * FastAPI, Flask, Django, Spring Boot, Go Gin/Fiber, Rails, Laravel,
 * GraphQL, and client-side HTTP calls (Fetch, Axios, Dio).
 */
export function parseApiEndpoints(files: { path: string; content?: string }[]): ApiEndpoint[] {
  const endpoints: ApiEndpoint[] = [];
  const seenKeys = new Set<string>();

  const addEndpoint = (ep: Omit<ApiEndpoint, 'id'> & { id?: string }) => {
    const uniqueKey = `${ep.method}:${ep.path.toLowerCase()}:${ep.file}:${ep.line}`;
    if (!seenKeys.has(uniqueKey)) {
      seenKeys.add(uniqueKey);
      endpoints.push({
        id: ep.id || `ep-${endpoints.length + 1}-${ep.method.toLowerCase()}`,
        ...ep,
      });
    }
  };

  for (const file of files) {
    const content = file.content || '';
    const normPath = file.path.replace(/\\/g, '/');

    // =========================================================================
    // 1. Next.js App Router (app/**/route.ts / app/api/**/route.ts)
    // =========================================================================
    const nextAppMatch = normPath.match(/(?:^|\/)(?:src\/)?app\/(.+?)\/route\.[jt]sx?$/i);
    if (nextAppMatch) {
      const routePath = '/' + nextAppMatch[1].replace(/\[([^\]]+)\]/g, ':$1');
      const lines = content.split('\n');

      const methodsFound = new Set<string>();
      lines.forEach((line, lineIdx) => {
        const methodMatch = line.match(/export\s+(?:async\s+)?(?:function|const)\s+(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)/);
        if (methodMatch) {
          const method = methodMatch[1].toUpperCase() as ApiEndpoint['method'];
          methodsFound.add(method);
          addEndpoint({
            method,
            path: routePath,
            file: normPath,
            line: lineIdx + 1,
            framework: 'nextjs',
            summary: `Next.js App Router Handler (${method})`,
          });
        }
      });

      // Fallback: If route file exists but method wasn't explicitly matched
      if (methodsFound.size === 0) {
        addEndpoint({
          method: 'GET',
          path: routePath,
          file: normPath,
          line: 1,
          framework: 'nextjs',
          summary: 'Next.js App Router API Endpoint',
        });
      }
    }

    // =========================================================================
    // 2. Next.js Pages Router (pages/api/**/*.ts)
    // =========================================================================
    const nextPagesMatch = normPath.match(/(?:^|\/)(?:src\/)?pages\/api\/(.+?)\.[jt]sx?$/i);
    if (nextPagesMatch) {
      let routePath = '/api/' + nextPagesMatch[1].replace(/\[([^\]]+)\]/g, ':$1');
      if (routePath.endsWith('/index')) {
        routePath = routePath.slice(0, -6) || '/api';
      }

      addEndpoint({
        method: 'ALL',
        path: routePath,
        file: normPath,
        line: 1,
        framework: 'nextjs',
        summary: 'Next.js Pages Router API Handler',
      });
    }

    // =========================================================================
    // 2b. Vercel Serverless Functions (api/**/*.ts, api/**/*.js)
    // =========================================================================
    const vercelMatch = normPath.match(/^(?:api)\/(.+?)\.[jt]sx?$/i);
    if (vercelMatch && !nextAppMatch && !nextPagesMatch) {
      const routePath = '/api/' + vercelMatch[1].replace(/\[([^\]]+)\]/g, ':$1');
      addEndpoint({
        method: 'ALL',
        path: routePath,
        file: normPath,
        line: 1,
        framework: 'vercel-serverless',
        cloudService: 'Vercel',
        summary: `Vercel Serverless Endpoint (${routePath})`,
      });
    }

    // =========================================================================
    // 2c. Supabase Edge Functions (supabase/functions/**/index.ts)
    // =========================================================================
    const supabaseMatch = normPath.match(/(?:^|\/)supabase\/functions\/([^/]+)(?:\/index)?\.[jt]sx?$/i);
    if (supabaseMatch) {
      const funcName = supabaseMatch[1];
      addEndpoint({
        method: 'POST',
        path: `/functions/v1/${funcName}`,
        file: normPath,
        line: 1,
        framework: 'supabase',
        cloudService: 'Supabase',
        summary: `Supabase Edge Function: ${funcName}`,
      });
    }

    // =========================================================================
    // 2d. Cloudflare Pages & Workers Functions (functions/api/**, _worker.js)
    // =========================================================================
    const cfPagesMatch = normPath.match(/(?:^|\/)functions\/(api\/.+?)\.[jt]sx?$/i);
    if (cfPagesMatch) {
      const routePath = '/' + cfPagesMatch[1].replace(/\[([^\]]+)\]/g, ':$1');
      addEndpoint({
        method: 'ALL',
        path: routePath,
        file: normPath,
        line: 1,
        framework: 'cloudflare-worker',
        cloudService: 'Cloudflare',
        summary: `Cloudflare Pages API Route (${routePath})`,
      });
    } else if (normPath === '_worker.js' || normPath === '_worker.ts' || (content.includes('export default') && content.includes('fetch(') && content.includes('env'))) {
      addEndpoint({
        method: 'ALL',
        path: '/*',
        file: normPath,
        line: 1,
        framework: 'cloudflare-worker',
        cloudService: 'Cloudflare',
        summary: 'Cloudflare Worker Catch-All Edge Dispatcher',
      });
    }

    // =========================================================================
    // 2e. AWS Lambda Handlers (exports.handler, export const handler)
    // =========================================================================
    if (
      (content.includes('exports.handler =') || content.match(/export\s+const\s+handler\s*=/)) &&
      !normPath.includes('test')
    ) {
      const cleanName = normPath.split('/').pop()?.split('.')[0] || 'handler';
      addEndpoint({
        method: 'ALL',
        path: `/lambda/${cleanName}`,
        file: normPath,
        line: 1,
        framework: 'aws-lambda',
        cloudService: 'AWS Lambda',
        summary: `AWS Lambda Serverless Function: ${cleanName}`,
      });
    }

    // =========================================================================
    // 2f. Firebase Cloud Functions (onRequest, onCall)
    // =========================================================================
    if (content.includes('functions.https') || content.includes('onRequest(') || content.includes('onCall(')) {
      const fnMatches = content.matchAll(/(?:export\s+const\s+|exports\.)([a-zA-Z0-9_]+)\s*=\s*(?:functions\.(?:region\([^)]+\)\.)?https\.(?:onRequest|onCall)|onRequest|onCall)\(/g);
      for (const m of fnMatches) {
        addEndpoint({
          method: 'POST',
          path: `/api/${m[1]}`,
          file: normPath,
          line: 1,
          framework: 'firebase',
          cloudService: 'Firebase',
          summary: `Firebase HTTPS Function: ${m[1]}`,
        });
      }
    }

    // =========================================================================
    // 3. NestJS Controllers (@Controller + @Get, @Post, etc.)
    // =========================================================================
    if (content.includes('@Controller')) {
      const controllerMatch = content.match(/@Controller\s*\(\s*['"]?([^'")\s]*)['"]?\s*\)/);
      const prefix = controllerMatch && controllerMatch[1] ? '/' + controllerMatch[1].replace(/^\//, '') : '';

      const lines = content.split('\n');
      lines.forEach((line, lineIdx) => {
        const methodMatch = line.match(/@(Get|Post|Put|Delete|Patch|Head|Options)\s*\(\s*['"]?([^'")\s]*)['"]?\s*\)/i);
        if (methodMatch) {
          const method = methodMatch[1].toUpperCase() as ApiEndpoint['method'];
          const subPath = methodMatch[2] ? '/' + methodMatch[2].replace(/^\//, '') : '';
          const fullPath = (prefix + subPath).replace(/\/+/g, '/') || '/';

          addEndpoint({
            method,
            path: fullPath,
            file: normPath,
            line: lineIdx + 1,
            framework: 'nestjs',
            summary: `NestJS Controller Action (${method})`,
          });
        }
      });
    }

    if (!content || content.trim().length === 0) {
      const p = normPath.toLowerCase();
      if (
        (p.includes('/api/') || p.includes('/routes/') || p.includes('/controllers/') || p.endsWith('/route.ts') || p.endsWith('/route.js')) &&
        !p.includes('test') &&
        !p.includes('.d.ts') &&
        !nextAppMatch &&
        !nextPagesMatch
      ) {
        const cleanName = normPath.split('/').pop()?.split('.')[0] || 'endpoint';
        const inferredPath = `/api/${cleanName.replace(/[-_]?(controller|route|router|handler)$/i, '')}`;

        addEndpoint({
          method: 'ALL',
          path: inferredPath,
          file: normPath,
          line: 1,
          framework: 'discovered-route',
          summary: `Auto-Discovered Route: ${normPath}`,
        });
      }
      continue;
    }
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // =======================================================================
      // 4. Express / Fastify / Hono / Elysia / Koa Web Routers
      // =======================================================================
      if (!normPath.endsWith('.py') && !line.trim().startsWith('@')) {
        const expressMatch = line.match(/(?:app|router|server|api|route|v1)\.(get|post|put|delete|patch|head|options)\s*\(\s*['"`]([^'"`]+)['"`]/i);
        if (expressMatch) {
          addEndpoint({
            method: expressMatch[1].toUpperCase() as ApiEndpoint['method'],
            path: expressMatch[2],
            file: normPath,
            line: i + 1,
            framework: 'express',
            summary: 'Node.js Route Handler',
          });
        }
      }

      // =======================================================================
      // 5. Python FastAPI / Flask / Django
      // =======================================================================
      if (normPath.endsWith('.py') || line.trim().startsWith('@')) {
        const pyMatch = line.match(/@(?:app|router|api)\.(get|post|put|delete|patch|api_route)\s*\(\s*['"`]([^'"`]+)['"`]/i);
        if (pyMatch) {
          addEndpoint({
            method: pyMatch[1].toUpperCase() === 'API_ROUTE' ? 'ALL' : (pyMatch[1].toUpperCase() as ApiEndpoint['method']),
            path: pyMatch[2],
            file: normPath,
            line: i + 1,
            framework: 'fastapi',
            summary: 'FastAPI / Python Route Handler',
          });
        }
      }

      const flaskRouteMatch = line.match(/@(?:app|bp|api)\.route\s*\(\s*['"`]([^'"`]+)['"`](?:.*?methods\s*=\s*\[([^\]]+)\])?/i);
      if (flaskRouteMatch) {
        const path = flaskRouteMatch[1];
        const methodsRaw = flaskRouteMatch[2];
        const method = methodsRaw ? (methodsRaw.split(',')[0].replace(/['"\s]/g, '').toUpperCase() as ApiEndpoint['method']) : 'GET';
        addEndpoint({
          method,
          path,
          file: normPath,
          line: i + 1,
          framework: 'flask',
          summary: 'Flask Endpoint',
        });
      }

      const djangoUrlMatch = line.match(/path\s*\(\s*['"]([^'"]+)['"]\s*,\s*([a-zA-Z0-9_.]+)/);
      if (djangoUrlMatch && normPath.endsWith('.py')) {
        addEndpoint({
          method: 'ALL',
          path: '/' + djangoUrlMatch[1].replace(/^\//, ''),
          file: normPath,
          line: i + 1,
          framework: 'django',
          summary: `Django URL View: ${djangoUrlMatch[2]}`,
        });
      }

      // =======================================================================
      // 6. Java / Kotlin Spring Boot
      // =======================================================================
      const springMatch = line.match(/@(Get|Post|Put|Delete|Patch|Request)Mapping\s*\(\s*(?:(?:value|path)\s*=\s*)?["']([^"']+)["']/i);
      if (springMatch) {
        let m = springMatch[1].toUpperCase();
        if (m === 'REQUEST') m = 'GET';
        addEndpoint({
          method: m as ApiEndpoint['method'],
          path: springMatch[2].startsWith('/') ? springMatch[2] : '/' + springMatch[2],
          file: normPath,
          line: i + 1,
          framework: 'spring',
          summary: 'Spring Boot Controller Method',
        });
      }

      // =======================================================================
      // 7. Go Gin / Fiber / Chi / Echo / Mux
      // =======================================================================
      const goMatch = line.match(/(?:r|group|engine|router|api|v1|app|e)\.(GET|POST|PUT|DELETE|PATCH|Handle|HandleFunc)\s*\(\s*["']([^"']+)["']/);
      if (goMatch && (normPath.endsWith('.go') || normPath.includes('router') || normPath.includes('handler'))) {
        let m = goMatch[1].toUpperCase();
        if (m === 'HANDLE' || m === 'HANDLEFUNC') m = 'GET';
        addEndpoint({
          method: m as ApiEndpoint['method'],
          path: goMatch[2].startsWith('/') ? goMatch[2] : '/' + goMatch[2],
          file: normPath,
          line: i + 1,
          framework: 'gin',
          summary: 'Go Web Route Handler',
        });
      }

      // =======================================================================
      // 8. PHP / Laravel / Lumen
      // =======================================================================
      const laravelMatch = line.match(/Route::(get|post|put|delete|patch|any)\s*\(\s*['"]([^'"]+)['"]/i);
      if (laravelMatch) {
        addEndpoint({
          method: laravelMatch[1].toUpperCase() === 'ANY' ? 'ALL' : (laravelMatch[1].toUpperCase() as ApiEndpoint['method']),
          path: laravelMatch[2].startsWith('/') ? laravelMatch[2] : '/' + laravelMatch[2],
          file: normPath,
          line: i + 1,
          framework: 'laravel',
          summary: 'Laravel Route Definition',
        });
      }

      // =======================================================================
      // 9. Client-side HTTP Calls (Fetch / Axios / Ky / Dio)
      // =======================================================================
      const clientCallMatch = line.match(/(?:axios|api|client|http|dio)\.(get|post|put|delete|patch)\s*(?:<[^>]+>)?\s*\(\s*['"`](\/[a-zA-Z0-9_\-/{}:]+)['"`]/i);
      if (clientCallMatch && !normPath.includes('test') && !normPath.includes('spec')) {
        addEndpoint({
          method: clientCallMatch[1].toUpperCase() as ApiEndpoint['method'],
          path: clientCallMatch[2],
          file: normPath,
          line: i + 1,
          framework: 'client-http',
          summary: 'Client-side API Request',
        });
      }

      const fetchMatch = line.match(/fetch\s*\(\s*['"`](\/api\/[a-zA-Z0-9_\-/{}:]+)['"`]/i);
      if (fetchMatch) {
        addEndpoint({
          method: 'GET',
          path: fetchMatch[1],
          file: normPath,
          line: i + 1,
          framework: 'client-fetch',
          summary: 'Native Client Fetch Call',
        });
      }

      // =======================================================================
      // 10. GraphQL Schemas & Operations
      // =======================================================================
      const gqlQueryMatch = line.match(/^\s*([a-zA-Z0-9_]+)\s*\([^)]*\)\s*:\s*([a-zA-Z0-9_!\[\]]+)/);
      if (gqlQueryMatch && (normPath.endsWith('.graphql') || normPath.endsWith('.gql'))) {
        addEndpoint({
          method: 'QUERY',
          path: `/graphql/${gqlQueryMatch[1]}`,
          file: normPath,
          line: i + 1,
          framework: 'graphql',
          summary: `GraphQL Query: ${gqlQueryMatch[1]}`,
        });
      }
    }
  }

  // ===========================================================================
  // 11. Fallback Heuristics: Discovered Route & Controller Files
  // ===========================================================================
  if (endpoints.length === 0) {
    for (const file of files) {
      const p = file.path.toLowerCase();
      if (
        (p.includes('/api/') || p.includes('/routes/') || p.includes('/controllers/')) &&
        !p.includes('test') &&
        !p.includes('.d.ts')
      ) {
        const cleanName = file.path.split('/').pop()?.split('.')[0] || 'endpoint';
        const inferredPath = `/api/${cleanName.replace(/[-_]?(controller|route|router|handler)$/i, '')}`;

        addEndpoint({
          method: 'ALL',
          path: inferredPath,
          file: file.path,
          line: 1,
          framework: 'discovered-route',
          summary: `Auto-Discovered Route Controller: ${file.path}`,
        });
      }
    }
  }

  return endpoints.sort((a, b) => a.path.localeCompare(b.path));
}
