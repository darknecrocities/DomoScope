import { describe, it, expect } from 'vitest';
import { detectCloudServices } from '../src/services/cloudServicesDetector';
import { RepoFile, RepoDependency } from '../src/types';

describe('Cloud, BaaS, Infrastructure and Storage Detector', () => {
  it('accurately identifies DomoNote as a Local-First architecture with Dexie and ZERO false serverless functions', () => {
    const files: RepoFile[] = [
      { path: 'package.json', name: 'package.json', type: 'blob', extension: 'json', category: 'config' },
      { path: 'firebase.json', name: 'firebase.json', type: 'blob', extension: 'json', category: 'config' },
      { path: 'vercel.json', name: 'vercel.json', type: 'blob', extension: 'json', category: 'config' },
      { path: 'vite.config.ts', name: 'vite.config.ts', type: 'blob', extension: 'ts', category: 'config' },
      { path: 'src/main.tsx', name: 'main.tsx', type: 'blob', extension: 'tsx', category: 'component' },
      { path: 'src/App.tsx', name: 'App.tsx', type: 'blob', extension: 'tsx', category: 'component' },
      { path: 'src/components/Modal.tsx', name: 'Modal.tsx', type: 'blob', extension: 'tsx', category: 'component' },
      { path: 'src/services/firebase/firebase.ts', name: 'firebase.ts', type: 'blob', extension: 'ts', category: 'service' },
      { path: 'src/services/firebase/stats.ts', name: 'stats.ts', type: 'blob', extension: 'ts', category: 'service' },
    ];

    const fileContents = new Map<string, string>([
      [
        'package.json',
        JSON.stringify({
          name: 'domonote',
          dependencies: {
            clsx: '^2.1.1',
            dexie: '^4.0.11',
            'dexie-react-hooks': '^1.1.7',
            firebase: '^12.19.0',
            react: '^18.3.1',
            'react-dom': '^18.3.1',
          },
        }),
      ],
      [
        'firebase.json',
        JSON.stringify({
          firestore: {
            rules: 'firestore.rules',
          },
        }),
      ],
      [
        'vercel.json',
        JSON.stringify({
          rewrites: [{ source: '/(.*)', destination: '/index.html' }],
        }),
      ],
      [
        'src/components/Modal.tsx',
        `export function Modal({ onRequestClose }: { onRequestClose: () => void }) {\n  return <dialog onClick={onRequestClose} />;\n}`,
      ],
      [
        'src/services/firebase/firebase.ts',
        `import { initializeApp } from 'firebase/app';\nimport { getAnalytics } from 'firebase/analytics';\nexport const app = initializeApp({});\nexport const analytics = getAnalytics(app);`,
      ],
    ]);

    const dependencies: RepoDependency[] = [
      { name: 'dexie', version: '^4.0.11', isDev: false, ecosystem: 'npm', manifestPath: 'package.json' },
      { name: 'dexie-react-hooks', version: '^1.1.7', isDev: false, ecosystem: 'npm', manifestPath: 'package.json' },
      { name: 'firebase', version: '^12.19.0', isDev: false, ecosystem: 'npm', manifestPath: 'package.json' },
      { name: 'react', version: '^18.3.1', isDev: false, ecosystem: 'npm', manifestPath: 'package.json' },
    ];

    const result = detectCloudServices(files, fileContents, dependencies);

    // 1. Must NOT detect Firebase Cloud Functions
    const firebaseSvc = result.services.find((s) => s.id.includes('firebase'));
    expect(firebaseSvc).toBeDefined();
    expect(firebaseSvc?.detectedFeatures).not.toContain('Firebase Cloud Functions');

    // 2. Must NOT detect Vercel Serverless Functions (vercel.json is purely static SPA rewrites)
    const vercelSvc = result.services.find((s) => s.id === 'vercel');
    expect(vercelSvc).toBeDefined();
    expect(vercelSvc?.category).toBe('cdn');
    expect(vercelSvc?.badge).toBe('Vercel Edge Hosting');
    expect(vercelSvc?.detectedFeatures).not.toContain('Vercel Serverless Functions');
    expect(vercelSvc?.detectedFeatures).toContain('Static Edge Deployment');

    // 3. Must have ZERO serverless runtimes
    expect(result.serverlessRuntimes).toHaveLength(0);

    // 4. Must detect Dexie.js as primary local-first storage
    const dexieStorage = result.storageSystems.find((s) => s.name.includes('Dexie'));
    expect(dexieStorage).toBeDefined();
    expect(dexieStorage?.type).toBe('local');
    expect(dexieStorage?.provider).toContain('IndexedDB');

    // 5. Architecture must be correctly classified as Local-First
    expect(result.architectureType).toBe('local_first');
    expect(result.architectureTitle).toBe('Local-First Client Architecture (Dexie.js / IndexedDB)');
    expect(result.architectureBadge).toBe('LOCAL-FIRST CLIENT');
    expect(result.hasBackendCloud).toBe(false);
  });

  it('detects genuine Firebase Cloud Functions when firebase-functions package exists', () => {
    const files: RepoFile[] = [
      { path: 'package.json', name: 'package.json', type: 'blob', extension: 'json', category: 'config' },
      { path: 'firebase.json', name: 'firebase.json', type: 'blob', extension: 'json', category: 'config' },
      { path: 'functions/src/index.ts', name: 'index.ts', type: 'blob', extension: 'ts', category: 'service' },
    ];

    const fileContents = new Map<string, string>([
      [
        'package.json',
        JSON.stringify({
          dependencies: {
            firebase: '^10.0.0',
            'firebase-functions': '^4.4.0',
            'firebase-admin': '^11.0.0',
          },
        }),
      ],
      [
        'firebase.json',
        JSON.stringify({
          functions: { source: 'functions' },
        }),
      ],
      [
        'functions/src/index.ts',
        `import * as functions from 'firebase-functions';\nexport const api = functions.https.onRequest((req, res) => res.send('ok'));`,
      ],
    ]);

    const result = detectCloudServices(files, fileContents, [
      { name: 'firebase', version: '^10.0.0', isDev: false, ecosystem: 'npm', manifestPath: 'package.json' },
      { name: 'firebase-functions', version: '^4.4.0', isDev: false, ecosystem: 'npm', manifestPath: 'package.json' },
      { name: 'firebase-admin', version: '^11.0.0', isDev: false, ecosystem: 'npm', manifestPath: 'package.json' },
    ]);

    const firebaseSvc = result.services.find((s) => s.id === 'firebase');
    expect(firebaseSvc).toBeDefined();
    expect(firebaseSvc?.detectedFeatures).toContain('Firebase Cloud Functions');
    expect(result.serverlessRuntimes).toContain('Firebase Cloud Functions (Node.js)');
    expect(result.architectureType).toBe('serverless_fullstack');
  });

  it('detects genuine Vercel Serverless Functions when root api/ routes exist', () => {
    const files: RepoFile[] = [
      { path: 'package.json', name: 'package.json', type: 'blob', extension: 'json', category: 'config' },
      { path: 'vercel.json', name: 'vercel.json', type: 'blob', extension: 'json', category: 'config' },
      { path: 'api/chat.ts', name: 'chat.ts', type: 'blob', extension: 'ts', category: 'api' },
      { path: 'api/models.ts', name: 'models.ts', type: 'blob', extension: 'ts', category: 'api' },
    ];

    const fileContents = new Map<string, string>([
      [
        'vercel.json',
        JSON.stringify({
          functions: { 'api/*.ts': { memory: 1024 } },
        }),
      ],
      ['api/chat.ts', `export default async function handler(req: any, res: any) { res.json({ ok: true }); }`],
    ]);

    const result = detectCloudServices(files, fileContents, []);

    const vercelSvc = result.services.find((s) => s.id === 'vercel');
    expect(vercelSvc).toBeDefined();
    expect(vercelSvc?.category).toBe('compute');
    expect(vercelSvc?.badge).toBe('Vercel Serverless');
    expect(vercelSvc?.detectedFeatures).toContain('Vercel Serverless Functions');
    expect(result.serverlessRuntimes).toContain('Vercel Serverless / Edge Runtime');
  });

  it('does NOT falsely trigger Supabase Edge Functions on generic functions/ folder', () => {
    const files: RepoFile[] = [
      { path: 'package.json', name: 'package.json', type: 'blob', extension: 'json', category: 'config' },
      { path: 'src/functions/mathUtils.ts', name: 'mathUtils.ts', type: 'blob', extension: 'ts', category: 'service' },
      { path: 'src/lib/supabase.ts', name: 'supabase.ts', type: 'blob', extension: 'ts', category: 'service' },
    ];

    const fileContents = new Map<string, string>([
      [
        'src/lib/supabase.ts',
        `import { createClient } from '@supabase/supabase-js';\nexport const supabase = createClient('https://xyz.supabase.co', 'anon-key');\nconst { data } = await supabase.from('users').select('*');`,
      ],
    ]);

    const result = detectCloudServices(files, fileContents, [
      { name: '@supabase/supabase-js', version: '^2.40.0', isDev: false, ecosystem: 'npm', manifestPath: 'package.json' },
    ]);

    const supabaseSvc = result.services.find((s) => s.id === 'supabase');
    expect(supabaseSvc).toBeDefined();
    // Must NOT contain Deno Edge Functions because src/functions/ is just a normal utils folder!
    expect(supabaseSvc?.detectedFeatures).not.toContain('Deno Edge Functions');
    expect(supabaseSvc?.detectedFeatures).toContain('PostgreSQL Database Client');
    expect(result.serverlessRuntimes).not.toContain('Supabase Edge Functions (Deno)');
  });

  it('detects genuine Supabase Edge Functions under supabase/functions/', () => {
    const files: RepoFile[] = [
      { path: 'package.json', name: 'package.json', type: 'blob', extension: 'json', category: 'config' },
      { path: 'supabase/functions/stripe-webhook/index.ts', name: 'index.ts', type: 'blob', extension: 'ts', category: 'service' },
    ];

    const result = detectCloudServices(files, new Map(), [
      { name: '@supabase/supabase-js', version: '^2.40.0', isDev: false, ecosystem: 'npm', manifestPath: 'package.json' },
    ]);

    const supabaseSvc = result.services.find((s) => s.id === 'supabase');
    expect(supabaseSvc).toBeDefined();
    expect(supabaseSvc?.detectedFeatures).toContain('Deno Edge Functions');
    expect(result.serverlessRuntimes).toContain('Supabase Edge Functions (Deno)');
  });

  it('does NOT trigger Azure Functions on azure-pipelines.yml CI/CD files', () => {
    const files: RepoFile[] = [
      { path: 'package.json', name: 'package.json', type: 'blob', extension: 'json', category: 'config' },
      { path: 'azure-pipelines.yml', name: 'azure-pipelines.yml', type: 'blob', extension: 'yml', category: 'config' },
    ];

    const result = detectCloudServices(files, new Map(), []);
    expect(result.services.find((s) => s.id === 'azure')).toBeUndefined();
    expect(result.serverlessRuntimes).not.toContain('Azure Functions');
  });

  it('detects standalone client app with zero cloud services and local sandbox', () => {
    const files: RepoFile[] = [
      { path: 'package.json', name: 'package.json', type: 'blob', extension: 'json', category: 'config' },
      { path: 'src/main.ts', name: 'main.ts', type: 'blob', extension: 'ts', category: 'service' },
    ];

    const result = detectCloudServices(files, new Map(), [
      { name: 'typescript', version: '^5.0.0', isDev: true, ecosystem: 'npm', manifestPath: 'package.json' },
    ]);

    expect(result.hasCloudServices).toBe(false);
    expect(result.architectureType).toBe('standalone');
    expect(result.architectureBadge).toBe('LOCAL SANDBOX');
  });

  it('accurately detects Flutter mobile app with Firebase BaaS, Google Gemini AI, ML Kit, and Maps (e.g. Easylens)', () => {
    const files: RepoFile[] = [
      { path: 'pubspec.yaml', name: 'pubspec.yaml', type: 'blob', extension: 'yaml', category: 'config' },
      { path: 'android/app/google-services.json', name: 'google-services.json', type: 'blob', extension: 'json', category: 'config' },
      { path: 'lib/main.dart', name: 'main.dart', type: 'blob', extension: 'dart', category: 'component' },
      { path: 'lib/services/ai_service.dart', name: 'ai_service.dart', type: 'blob', extension: 'dart', category: 'service' },
      { path: 'lib/services/firebase_service.dart', name: 'firebase_service.dart', type: 'blob', extension: 'dart', category: 'service' },
    ];

    const fileContents = new Map<string, string>([
      [
        'pubspec.yaml',
        `name: easylens
dependencies:
  flutter:
    sdk: flutter
  firebase_core: ^3.1.1
  firebase_auth: ^5.1.2
  firebase_storage: ^12.1.1
  cloud_firestore: ^5.0.2
  google_sign_in: ^6.2.1
  google_generative_ai: ^0.4.4
  flutter_gemma: ^0.13.6
  google_mlkit_image_labeling: ^0.14.2
  google_mlkit_object_detection: ^0.15.1
  tflite_flutter: ^0.12.1
  google_maps_flutter: ^2.5.3
  shared_preferences: ^2.2.3
`,
      ],
      [
        'lib/services/ai_service.dart',
        `import 'package:google_generative_ai/google_generative_ai.dart';
final model = GenerativeModel(model: 'gemini-1.5-pro', apiKey: 'key');`,
      ],
      [
        'lib/services/firebase_service.dart',
        `import 'package:firebase_core/firebase_core.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_storage/firebase_storage.dart';
final db = FirebaseFirestore.instance;
final auth = FirebaseAuth.instance;
final storage = FirebaseStorage.instance;`,
      ],
    ]);

    const dependencies: RepoDependency[] = [
      { name: 'firebase_core', version: '^3.1.1', isDev: false, ecosystem: 'pub', manifestPath: 'pubspec.yaml' },
      { name: 'firebase_auth', version: '^5.1.2', isDev: false, ecosystem: 'pub', manifestPath: 'pubspec.yaml' },
      { name: 'firebase_storage', version: '^12.1.1', isDev: false, ecosystem: 'pub', manifestPath: 'pubspec.yaml' },
      { name: 'cloud_firestore', version: '^5.0.2', isDev: false, ecosystem: 'pub', manifestPath: 'pubspec.yaml' },
      { name: 'google_sign_in', version: '^6.2.1', isDev: false, ecosystem: 'pub', manifestPath: 'pubspec.yaml' },
      { name: 'google_generative_ai', version: '^0.4.4', isDev: false, ecosystem: 'pub', manifestPath: 'pubspec.yaml' },
      { name: 'flutter_gemma', version: '^0.13.6', isDev: false, ecosystem: 'pub', manifestPath: 'pubspec.yaml' },
      { name: 'google_mlkit_object_detection', version: '^0.15.1', isDev: false, ecosystem: 'pub', manifestPath: 'pubspec.yaml' },
      { name: 'google_maps_flutter', version: '^2.5.3', isDev: false, ecosystem: 'pub', manifestPath: 'pubspec.yaml' },
      { name: 'shared_preferences', version: '^2.2.3', isDev: false, ecosystem: 'pub', manifestPath: 'pubspec.yaml' },
    ];

    const result = detectCloudServices(files, fileContents, dependencies);

    // 1. Must detect cloud services
    expect(result.hasCloudServices).toBe(true);
    expect(result.hasBackendCloud).toBe(true);

    // 2. Architecture must be classified as Firebase Mobile & Cloud AI
    expect(result.architectureType).toBe('cloud_baas');
    expect(result.architectureBadge).toBe('FIREBASE + AI BAAS');
    expect(result.architectureTitle).toBe('Firebase Mobile & Cloud AI Architecture');

    // 3. Must detect Firebase Platform with Firestore, Auth, Storage
    const fb = result.services.find((s) => s.id === 'firebase');
    expect(fb).toBeDefined();
    expect(fb?.detectedFeatures).toContain('Cloud Firestore NoSQL');
    expect(fb?.detectedFeatures).toContain('Firebase Authentication');
    expect(fb?.detectedFeatures).toContain('Firebase Cloud Storage');
    expect(fb?.detectedFeatures).toContain('Google Sign-In / OAuth');

    // 4. Must detect Google Gemini Generative AI
    const gemini = result.services.find((s) => s.id === 'google-gemini');
    expect(gemini).toBeDefined();
    expect(gemini?.category).toBe('ai');
    expect(gemini?.badge).toBe('Google Gemini AI');

    // 5. Must detect Edge AI / ML Kit
    const edgeAi = result.services.find((s) => s.id === 'on-device-ai');
    expect(edgeAi).toBeDefined();
    expect(edgeAi?.category).toBe('ai');

    // 6. Must detect Google Maps
    const maps = result.services.find((s) => s.id === 'google-maps');
    expect(maps).toBeDefined();

    // 7. Must detect Cloud Storage Systems (Firestore, Firebase Storage, SharedPreferences)
    expect(result.storageSystems.length).toBeGreaterThanOrEqual(3);
    expect(result.storageSystems.some((s) => s.name === 'Cloud Firestore')).toBe(true);
    expect(result.storageSystems.some((s) => s.name === 'Firebase Cloud Storage')).toBe(true);
    expect(result.storageSystems.some((s) => s.name.includes('SharedPreferences'))).toBe(true);

    // 8. Auth providers
    expect(result.authProviders).toContain('Firebase Auth');
    expect(result.authProviders).toContain('Google Identity / Sign-In');
  });
});
