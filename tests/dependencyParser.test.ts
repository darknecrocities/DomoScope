import { describe, it, expect } from 'vitest';
import { parseDependencies } from '../src/services/dependencyParser';

describe('Dependency Parser', () => {
  it('parses package.json runtime and dev dependencies', () => {
    const pkgJson = JSON.stringify({
      dependencies: {
        react: '^18.2.0',
        'lucide-react': '^0.300.0',
      },
      devDependencies: {
        typescript: '^5.0.0',
        vitest: '^1.0.0',
      },
    });

    const sourceFiles = [
      {
        path: 'src/App.tsx',
        content: "import React from 'react';\nimport { Shield } from 'lucide-react';",
      },
    ];

    const deps = parseDependencies(
      [{ path: 'package.json', content: pkgJson }],
      sourceFiles
    );

    expect(deps.length).toBe(4);
    const reactDep = deps.find((d) => d.name === 'react');
    expect(reactDep?.isDev).toBe(false);
    expect(reactDep?.usedInFiles).toContain('src/App.tsx');

    const tsDep = deps.find((d) => d.name === 'typescript');
    expect(tsDep?.isDev).toBe(true);
  });

  it('parses Python requirements.txt', () => {
    const reqs = `
      fastapi==0.104.1
      uvicorn>=0.24.0
      pydantic~=2.5.0
    `;

    const deps = parseDependencies([{ path: 'requirements.txt', content: reqs }], []);
    expect(deps.length).toBe(3);
    expect(deps[0].name).toBe('fastapi');
    expect(deps[0].version).toBe('0.104.1');
    expect(deps[0].ecosystem).toBe('python');
  });

  it('parses Flutter / Dart pubspec.yaml with dependencies and dev_dependencies', () => {
    const pubspec = `
name: easylens
description: An accessibility app

dependencies:
  flutter:
    sdk: flutter
  firebase_core: ^3.1.1
  firebase_auth: ^5.1.2
  firebase_storage: ^12.1.1
  cloud_firestore: ^5.0.2
  google_generative_ai: ^0.4.4
  flutter_gemma: ^0.13.6
  shared_preferences: ^2.2.3

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^6.0.0
`;

    const sourceFiles = [
      {
        path: 'lib/main.dart',
        content: "import 'package:firebase_core/firebase_core.dart';\nimport 'package:cloud_firestore/cloud_firestore.dart';",
      },
    ];

    const deps = parseDependencies([{ path: 'pubspec.yaml', content: pubspec }], sourceFiles);

    expect(deps.length).toBe(10);
    const firestore = deps.find((d) => d.name === 'cloud_firestore');
    expect(firestore).toBeDefined();
    expect(firestore?.version).toBe('^5.0.2');
    expect(firestore?.isDev).toBe(false);
    expect(firestore?.ecosystem).toBe('pub');
    expect(firestore?.usedInFiles).toContain('lib/main.dart');

    const lints = deps.find((d) => d.name === 'flutter_lints');
    expect(lints).toBeDefined();
    expect(lints?.isDev).toBe(true);
  });
});
