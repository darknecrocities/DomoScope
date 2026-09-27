import { describe, it, expect } from 'vitest';
import { parseApiEndpoints } from '../src/services/apiRouteCatalog';
import { RepoFile } from '../src/types';

describe('API Route Catalog Service', () => {
  it('extracts Next.js App Router endpoints (app/api/**/route.ts)', () => {
    const files = [
      {
        path: 'app/api/users/route.ts',
        content: `
        export async function GET(request: Request) {
          return Response.json({ users: [] });
        }
        export async function POST(request: Request) {
          return Response.json({ success: true });
        }
        export async function DELETE(request: Request) {
          return Response.json({ deleted: true });
        }
        `,
      },
    ];

    const endpoints = parseApiEndpoints(files);
    expect(endpoints.length).toBe(3);

    const methods = endpoints.map((e) => e.method);
    expect(methods).toContain('GET');
    expect(methods).toContain('POST');
    expect(methods).toContain('DELETE');
    expect(endpoints[0].path).toBe('/api/users');
    expect(endpoints[0].framework).toBe('nextjs');
  });

  it('extracts Next.js Pages Router endpoints (pages/api/**.ts)', () => {
    const files = [
      {
        path: 'pages/api/posts/[id].ts',
        content: `
        export default function handler(req, res) {
          res.status(200).json({ name: 'John Doe' });
        }
        `,
      },
    ];

    const endpoints = parseApiEndpoints(files);
    expect(endpoints.length).toBe(1);
    expect(endpoints[0].path).toBe('/api/posts/:id');
    expect(endpoints[0].framework).toBe('nextjs');
  });

  it('extracts NestJS controller endpoints with decorators', () => {
    const files = [
      {
        path: 'src/users/users.controller.ts',
        content: `
        @Controller('api/v1/users')
        export class UsersController {
          @Get()
          findAll() {
            return [];
          }

          @Post('create')
          create(@Body() dto: CreateUserDto) {
            return { id: 1 };
          }
        }
        `,
      },
    ];

    const endpoints = parseApiEndpoints(files);
    expect(endpoints.length).toBe(2);
    expect(endpoints.find((e) => e.method === 'GET')?.path).toBe('/api/v1/users');
    expect(endpoints.find((e) => e.method === 'POST')?.path).toBe('/api/v1/users/create');
    expect(endpoints[0].framework).toBe('nestjs');
  });

  it('extracts Express.js router endpoints', () => {
    const files = [
      {
        path: 'src/routes/auth.js',
        content: `
        const router = express.Router();
        router.post('/login', authController.login);
        router.get('/me', authController.getProfile);
        module.exports = router;
        `,
      },
    ];

    const endpoints = parseApiEndpoints(files);
    expect(endpoints.length).toBe(2);
    expect(endpoints.map((e) => e.method)).toEqual(expect.arrayContaining(['POST', 'GET']));
    expect(endpoints[0].framework).toBe('express');
  });

  it('extracts FastAPI endpoints', () => {
    const files = [
      {
        path: 'app/api/endpoints.py',
        content: `
        @router.get("/items/{item_id}", response_model=Item)
        def read_item(item_id: int):
            return {"item_id": item_id}
        `,
      },
    ];

    const endpoints = parseApiEndpoints(files);
    expect(endpoints.length).toBe(1);
    expect(endpoints[0].method).toBe('GET');
    expect(endpoints[0].path).toBe('/items/{item_id}');
    expect(endpoints[0].framework).toBe('fastapi');
  });

  it('discovers route files heuristically when file contents are not yet loaded', () => {
    const files = [
      {
        path: 'src/app/api/products/[id]/route.ts',
        content: '',
      },
      {
        path: 'backend/routes/orders.js',
        content: '',
      },
      {
        path: 'README.md',
        content: '# Documentation',
      },
    ];

    const endpoints = parseApiEndpoints(files);
    expect(endpoints.length).toBe(2);
    expect(endpoints.some((e) => e.file.includes('products'))).toBe(true);
    expect(endpoints.some((e) => e.file.includes('orders'))).toBe(true);
  });

  it('extracts Cloud & Serverless endpoints (Supabase, Cloudflare, AWS Lambda, Vercel)', () => {
    const files = [
      {
        path: 'supabase/functions/send-email/index.ts',
        content: `Deno.serve(async (req) => { return new Response("ok"); });`,
      },
      {
        path: 'functions/api/auth.ts',
        content: `export const onRequest = async () => new Response("ok");`,
      },
      {
        path: 'src/handlers/processPayment.ts',
        content: `export const handler = async (event) => { return { statusCode: 200 }; };`,
      },
      {
        path: 'api/chat.ts',
        content: `export default async function handler(req, res) { res.status(200).json({}); }`,
      },
    ];

    const endpoints = parseApiEndpoints(files);
    expect(endpoints.some((e) => e.framework === 'supabase' && e.path === '/functions/v1/send-email')).toBe(true);
    expect(endpoints.some((e) => e.framework === 'cloudflare-worker' && e.path === '/api/auth')).toBe(true);
    expect(endpoints.some((e) => e.framework === 'aws-lambda' && e.path === '/lambda/processPayment')).toBe(true);
    expect(endpoints.some((e) => e.framework === 'vercel-serverless' && e.path === '/api/chat')).toBe(true);
  });
});

