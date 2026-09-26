import { ApiEndpoint } from '../types';

export function parseApiEndpoints(files: { path: string; content: string }[]): ApiEndpoint[] {
  const endpoints: ApiEndpoint[] = [];

  for (const file of files) {
    const lines = file.content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 1. Express / JS Router: app.get('/path'), router.post('/path')
      const expressMatch = line.match(/(?:app|router|server)\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/i);
      if (expressMatch) {
        endpoints.push({
          id: `ep-express-${file.path}-${i}`,
          method: expressMatch[1].toUpperCase() as ApiEndpoint['method'],
          path: expressMatch[2],
          file: file.path,
          line: i + 1,
          framework: 'express',
          summary: `Express Route Handler`,
        });
      }

      // 2. FastAPI / Flask: @app.get('/path') or @router.post('/path') or @app.route('/path', methods=['POST'])
      const pyMatch = line.match(/@(?:app|router|api)\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/i);
      if (pyMatch) {
        endpoints.push({
          id: `ep-fastapi-${file.path}-${i}`,
          method: pyMatch[1].toUpperCase() as ApiEndpoint['method'],
          path: pyMatch[2],
          file: file.path,
          line: i + 1,
          framework: 'fastapi',
          summary: `Python FastAPI / Flask Endpoint`,
        });
      }

      // 3. Spring Boot: @GetMapping("/path"), @PostMapping("/path")
      const springMatch = line.match(/@(Get|Post|Put|Delete|Patch|Request)Mapping\s*\(\s*(?:value\s*=\s*)?["']([^"']+)["']/i);
      if (springMatch) {
        let m = springMatch[1].toUpperCase();
        if (m === 'REQUEST') m = 'GET';
        endpoints.push({
          id: `ep-spring-${file.path}-${i}`,
          method: m as ApiEndpoint['method'],
          path: springMatch[2],
          file: file.path,
          line: i + 1,
          framework: 'spring',
          summary: `Spring Controller Method`,
        });
      }

      // 4. Go Gin: r.GET("/path"), group.POST("/path")
      const ginMatch = line.match(/(?:r|group|engine|router)\.(GET|POST|PUT|DELETE|PATCH)\s*\(\s*["']([^"']+)["']/);
      if (ginMatch) {
        endpoints.push({
          id: `ep-gin-${file.path}-${i}`,
          method: ginMatch[1].toUpperCase() as ApiEndpoint['method'],
          path: ginMatch[2],
          file: file.path,
          line: i + 1,
          framework: 'gin',
          summary: `Go Gin Web Handler`,
        });
      }

      // 5. Flutter Dio / HTTP Client: dio.get('/api/users'), http.post(Uri.parse('/api/users'))
      const dioMatch = line.match(/(?:dio|client|http)\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/i);
      if (dioMatch) {
        endpoints.push({
          id: `ep-dio-${file.path}-${i}`,
          method: dioMatch[1].toUpperCase() as ApiEndpoint['method'],
          path: dioMatch[2],
          file: file.path,
          line: i + 1,
          framework: 'dio',
          summary: `Flutter / Mobile HTTP API Request`,
        });
      }

      // 6. GraphQL Schema fields
      const gqlQueryMatch = line.match(/^\s*([a-zA-Z0-9_]+)\s*\([^)]*\)\s*:\s*([a-zA-Z0-9_!\[\]]+)/);
      if (gqlQueryMatch && (file.path.endsWith('.graphql') || file.path.endsWith('.gql'))) {
        endpoints.push({
          id: `ep-gql-${file.path}-${i}`,
          method: 'QUERY',
          path: `gql/${gqlQueryMatch[1]}`,
          file: file.path,
          line: i + 1,
          framework: 'graphql',
          summary: `GraphQL Query: ${gqlQueryMatch[1]}`,
        });
      }
    }
  }

  return endpoints;
}
