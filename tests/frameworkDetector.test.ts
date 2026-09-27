import { describe, it, expect } from 'vitest';
import { detectFrameworks } from '../src/services/frameworkDetector';
import { RepoFile, RepoDependency } from '../src/types';

describe('Universal Framework & Architecture Detector', () => {
  it('detects Next.js App Router projects', () => {
    const files: RepoFile[] = [
      { path: 'package.json', name: 'package.json', type: 'blob', extension: 'json', category: 'config' },
      { path: 'next.config.ts', name: 'next.config.ts', type: 'blob', extension: 'ts', category: 'config' },
      { path: 'app/layout.tsx', name: 'layout.tsx', type: 'blob', extension: 'tsx', category: 'component' },
      { path: 'app/page.tsx', name: 'page.tsx', type: 'blob', extension: 'tsx', category: 'component' },
      { path: 'app/api/users/route.ts', name: 'route.ts', type: 'blob', extension: 'ts', category: 'api' },
    ];

    const dependencies: RepoDependency[] = [
      { name: 'next', version: '15.2.0', isDev: false, ecosystem: 'npm', manifestPath: 'package.json' },
      { name: 'react', version: '19.0.0', isDev: false, ecosystem: 'npm', manifestPath: 'package.json' },
    ];

    const result = detectFrameworks(files, new Map(), dependencies);
    expect(result.primary.id).toBe('nextjs');
    expect(result.primary.name).toBe('Next.js');
    expect(result.primary.category).toBe('Full-Stack');
    expect(result.primary.archetype).toContain('App Router');
    expect(result.primary.version).toBe('15.2.0');
    expect(result.primary.capabilities).toContain('React Server Components');
  });

  it('detects FastAPI Python backend services', () => {
    const files: RepoFile[] = [
      { path: 'requirements.txt', name: 'requirements.txt', type: 'blob', extension: 'txt', category: 'config' },
      { path: 'main.py', name: 'main.py', type: 'blob', extension: 'py', category: 'service' },
      { path: 'api/routers.py', name: 'routers.py', type: 'blob', extension: 'py', category: 'api' },
    ];

    const fileContents = new Map<string, string>([
      ['requirements.txt', 'fastapi==0.111.0\nuvicorn>=0.29.0\npydantic>=2.0\n'],
    ]);

    const result = detectFrameworks(files, fileContents, []);
    expect(result.primary.id).toBe('fastapi');
    expect(result.primary.name).toBe('FastAPI');
    expect(result.primary.category).toBe('Backend API');
    expect(result.primary.runtime).toContain('Python');
    expect(result.primary.archetype).toContain('ASGI');
  });

  it('detects NestJS TypeScript backend projects', () => {
    const files: RepoFile[] = [
      { path: 'package.json', name: 'package.json', type: 'blob', extension: 'json', category: 'config' },
      { path: 'nest-cli.json', name: 'nest-cli.json', type: 'blob', extension: 'json', category: 'config' },
      { path: 'src/main.ts', name: 'main.ts', type: 'blob', extension: 'ts', category: 'service' },
      { path: 'src/users/users.controller.ts', name: 'users.controller.ts', type: 'blob', extension: 'ts', category: 'api' },
    ];

    const dependencies: RepoDependency[] = [
      { name: '@nestjs/core', version: '10.3.8', isDev: false, ecosystem: 'npm', manifestPath: 'package.json' },
    ];

    const result = detectFrameworks(files, new Map(), dependencies);
    expect(result.primary.id).toBe('nestjs');
    expect(result.primary.name).toBe('NestJS');
    expect(result.primary.category).toBe('Backend API');
    expect(result.primary.archetype).toContain('Dependency Injection');
  });

  it('detects Flutter multi-platform mobile applications', () => {
    const files: RepoFile[] = [
      { path: 'pubspec.yaml', name: 'pubspec.yaml', type: 'blob', extension: 'yaml', category: 'config' },
      { path: 'lib/main.dart', name: 'main.dart', type: 'blob', extension: 'dart', category: 'service' },
      { path: 'lib/screens/home.dart', name: 'home.dart', type: 'blob', extension: 'dart', category: 'component' },
    ];

    const result = detectFrameworks(files, new Map(), []);
    expect(result.primary.id).toBe('flutter');
    expect(result.primary.name).toBe('Flutter');
    expect(result.primary.category).toBe('Mobile & Multi-Platform');
    expect(result.primary.runtime).toContain('Dart');
  });

  it('detects Go Gin and microservice backends', () => {
    const files: RepoFile[] = [
      { path: 'go.mod', name: 'go.mod', type: 'blob', extension: 'mod', category: 'config' },
      { path: 'main.go', name: 'main.go', type: 'blob', extension: 'go', category: 'service' },
      { path: 'handlers/api.go', name: 'api.go', type: 'blob', extension: 'go', category: 'api' },
    ];

    const fileContents = new Map<string, string>([
      ['go.mod', 'module myapp\n\ngo 1.22\n\nrequire github.com/gin-gonic/gin v1.9.1\n'],
    ]);

    const result = detectFrameworks(files, fileContents, []);
    expect(result.primary.id).toBe('go-framework');
    expect(result.primary.name).toContain('Gin');
    expect(result.primary.runtime).toContain('Goroutine');
  });

  it('detects Spring Boot enterprise Java applications', () => {
    const files: RepoFile[] = [
      { path: 'pom.xml', name: 'pom.xml', type: 'blob', extension: 'xml', category: 'config' },
      { path: 'src/main/java/com/example/demo/DemoApplication.java', name: 'DemoApplication.java', type: 'blob', extension: 'java', category: 'service' },
      { path: 'src/main/java/com/example/demo/UserController.java', name: 'UserController.java', type: 'blob', extension: 'java', category: 'api' },
    ];

    const result = detectFrameworks(files, new Map(), []);
    expect(result.primary.id).toBe('springboot');
    expect(result.primary.name).toBe('Spring Boot');
    expect(result.primary.runtime).toContain('JVM');
  });

  it('detects React Single-Page Applications (Vite SPA)', () => {
    const files: RepoFile[] = [
      { path: 'package.json', name: 'package.json', type: 'blob', extension: 'json', category: 'config' },
      { path: 'vite.config.ts', name: 'vite.config.ts', type: 'blob', extension: 'ts', category: 'config' },
      { path: 'src/App.tsx', name: 'App.tsx', type: 'blob', extension: 'tsx', category: 'component' },
      { path: 'src/main.tsx', name: 'main.tsx', type: 'blob', extension: 'tsx', category: 'component' },
    ];

    const dependencies: RepoDependency[] = [
      { name: 'react', version: '19.0.0', isDev: false, ecosystem: 'npm', manifestPath: 'package.json' },
      { name: 'vite', version: '6.0.0', isDev: true, ecosystem: 'npm', manifestPath: 'package.json' },
    ];

    const result = detectFrameworks(files, new Map(), dependencies);
    expect(result.primary.id).toBe('react');
    expect(result.primary.name).toContain('React');
    expect(result.primary.category).toBe('Frontend');
  });
});
