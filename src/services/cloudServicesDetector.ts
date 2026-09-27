import { RepoFile, RepoDependency } from '../types';

export type CloudProviderType =
  | 'supabase'
  | 'firebase'
  | 'aws'
  | 'gcp'
  | 'cloudflare'
  | 'azure'
  | 'vercel'
  | 'netlify'
  | 'redis'
  | 'other';

export type ServiceCategory =
  | 'cloud_baas'
  | 'storage'
  | 'database'
  | 'auth'
  | 'compute'
  | 'cdn'
  | 'messaging'
  | 'ai';

export interface CloudServiceInfo {
  id: string;
  name: string;
  provider: CloudProviderType;
  category: ServiceCategory;
  badge: string;
  description: string;
  detectedFeatures: string[];
  evidence: string[];
  endpointsOrResources: string[];
}

export interface StorageSystemInfo {
  name: string;
  type: 'object_storage' | 'relational' | 'document' | 'key_value' | 'cache' | 'local' | 'vector';
  provider: string;
  description: string;
  evidence: string[];
}

export type ArchitectureClassificationType =
  | 'local_first'
  | 'cloud_baas'
  | 'serverless_fullstack'
  | 'cloud_infrastructure'
  | 'static_edge'
  | 'standalone';

export interface CloudDetectionResult {
  hasCloudServices: boolean;
  hasBackendCloud: boolean;
  architectureType: ArchitectureClassificationType;
  architectureTitle: string;
  architectureBadge: string;
  architectureDescription: string;
  providers: CloudProviderType[];
  services: CloudServiceInfo[];
  storageSystems: StorageSystemInfo[];
  authProviders: string[];
  serverlessRuntimes: string[];
}

/**
 * Universal Cloud, BaaS, Infrastructure, and Storage Detector
 * Scans dependencies, config files, source code imports, and route patterns
 * with strict zero-false-positive precision.
 */
export function detectCloudServices(
  files: RepoFile[],
  fileContents: Map<string, string> | Record<string, string>,
  dependencies: RepoDependency[] = []
): CloudDetectionResult {
  const contentsMap: Map<string, string> =
    fileContents instanceof Map ? fileContents : new Map(Object.entries(fileContents || {}));

  const allFilePaths = files.map((f) => f.path.replace(/\\/g, '/'));
  const allFilePathsLower = allFilePaths.map((p) => p.toLowerCase());
  const depNames = new Set(dependencies.map((d) => d.name.toLowerCase()));

  // Read package.json if present to capture all dependencies & devDependencies
  const pkgContent = contentsMap.get('package.json') || '';
  if (pkgContent) {
    try {
      const parsed = JSON.parse(pkgContent);
      const allDeps = { ...parsed.dependencies, ...parsed.devDependencies };
      Object.keys(allDeps).forEach((k) => depNames.add(k.toLowerCase()));
    } catch {
      // ignore json parse error
    }
  }

  // Combined code sample for regex/substring matching across loaded files
  let codeSample = '';
  for (const [path, content] of contentsMap.entries()) {
    if (
      path.endsWith('.ts') ||
      path.endsWith('.tsx') ||
      path.endsWith('.js') ||
      path.endsWith('.jsx') ||
      path.endsWith('.py') ||
      path.endsWith('.go') ||
      path.endsWith('.rs')
    ) {
      codeSample += `\n// --- ${path} ---\n` + content.slice(0, 2000);
    }
  }

  const services: CloudServiceInfo[] = [];
  const storageSystems: StorageSystemInfo[] = [];
  const authProviders: Set<string> = new Set();
  const serverlessRuntimes: Set<string> = new Set();
  const detectedProviders: Set<CloudProviderType> = new Set();

  // Helper to add service safely without duplicates
  const addService = (svc: CloudServiceInfo) => {
    if (!services.some((s) => s.id === svc.id)) {
      services.push(svc);
      detectedProviders.add(svc.provider);
    }
  };

  // ── 0. LOCAL-FIRST & CLIENT EMBEDDED DATABASES ────────────────────────────
  // Explicitly identify client-side offline-first databases so apps like DomoNote
  // are properly classified as Local-First instead of falsely tagged as heavy cloud stacks.
  if (depNames.has('dexie') || depNames.has('dexie-react-hooks')) {
    storageSystems.push({
      name: 'Dexie.js (IndexedDB Object Store)',
      type: 'local',
      provider: 'Client Sandbox (IndexedDB)',
      description: 'High-performance local IndexedDB wrapper for offline-first reactive data management',
      evidence: ['dexie package detected in dependencies'],
    });
  }

  if (depNames.has('rxdb')) {
    storageSystems.push({
      name: 'RxDB (Reactive NoSQL)',
      type: 'local',
      provider: 'Client Sandbox (Offline-First)',
      description: 'Reactive client-side NoSQL database with offline-first real-time replication',
      evidence: ['rxdb package detected in dependencies'],
    });
  }

  if (depNames.has('pouchdb') || depNames.has('pouchdb-browser')) {
    storageSystems.push({
      name: 'PouchDB (CouchDB-Compatible)',
      type: 'local',
      provider: 'Client Sandbox (IndexedDB)',
      description: 'In-browser database that syncs seamlessly with CouchDB / Cloudant',
      evidence: ['pouchdb package detected in dependencies'],
    });
  }

  if (depNames.has('localforage')) {
    storageSystems.push({
      name: 'localForage (Offline Storage)',
      type: 'local',
      provider: 'Client Sandbox',
      description: 'Cross-browser asynchronous offline storage library using IndexedDB/WebSQL/localStorage',
      evidence: ['localforage package detected in dependencies'],
    });
  }

  if (depNames.has('@sqlite.org/sqlite-wasm') || depNames.has('sql.js') || depNames.has('absurd-sql')) {
    storageSystems.push({
      name: 'SQLite WASM (In-Browser Relational)',
      type: 'local',
      provider: 'Client Sandbox (WebAssembly)',
      description: 'Official SQLite engine compiled to WebAssembly with virtual file system persistence',
      evidence: ['sqlite wasm or sql.js package in dependencies'],
    });
  }

  if (depNames.has('idb')) {
    storageSystems.push({
      name: 'IndexedDB (idb Promise Wrapper)',
      type: 'local',
      provider: 'Client Sandbox (IndexedDB)',
      description: 'Lightweight Promise-based wrapper around browser IndexedDB',
      evidence: ['idb package detected in dependencies'],
    });
  }

  // ── 1. SUPABASE DETECTION ──────────────────────────────────────────────────
  const hasSupabasePkg =
    depNames.has('@supabase/supabase-js') ||
    depNames.has('@supabase/ssr') ||
    depNames.has('@supabase/auth-helpers-nextjs') ||
    depNames.has('@supabase/auth-ui-react');
  const hasSupabaseFiles = allFilePathsLower.some(
    (p) => p.includes('supabase/') || p.endsWith('/supabase.ts') || p.endsWith('/supabaseclient.ts')
  );
  const hasSupabaseCode =
    codeSample.includes('createClient') && (codeSample.includes('supabase') || codeSample.includes('SUPABASE_URL'));

  if (hasSupabasePkg || hasSupabaseFiles || hasSupabaseCode) {
    const features: string[] = [];
    const evidence: string[] = [];
    const endpoints: string[] = [];

    if (hasSupabasePkg) evidence.push('Supabase SDK in dependencies (@supabase/supabase-js)');
    if (hasSupabaseFiles) evidence.push('Supabase configuration directory detected');

    const hasDbClient = codeSample.includes('.from(');
    if (hasDbClient) {
      features.push('PostgreSQL Database Client');
      endpoints.push('PostgreSQL DB');
    }

    const hasAuth = codeSample.includes('.auth.') || depNames.has('@supabase/auth-helpers-nextjs');
    if (hasAuth) {
      features.push('Supabase Auth & Session Handling');
      authProviders.add('Supabase Auth');
      endpoints.push('Auth API');
    }

    const hasStorage = codeSample.includes('.storage.');
    if (hasStorage) {
      features.push('Supabase Storage Buckets');
      endpoints.push('Storage Buckets');
      storageSystems.push({
        name: 'Supabase Storage',
        type: 'object_storage',
        provider: 'Supabase',
        description: 'S3-compatible object storage for files, media, and attachments',
        evidence: ['supabase.storage detected in source code'],
      });
    }

    // STRICT: Only detect Deno Edge Functions if files actually exist under supabase/functions/
    // NEVER match generic 'functions/' directories!
    const hasDenoFunctions =
      allFilePathsLower.some((p) => p.includes('supabase/functions/')) ||
      codeSample.includes('supabase.functions.invoke');
    if (hasDenoFunctions) {
      features.push('Deno Edge Functions');
      serverlessRuntimes.add('Supabase Edge Functions (Deno)');
      endpoints.push('Edge Functions');
    }

    if (codeSample.includes('.channel(') || codeSample.includes('.on(')) {
      features.push('Realtime Database Subscriptions');
    }

    if (features.length === 0) features.push('Managed PostgreSQL & BaaS Platform');

    addService({
      id: 'supabase',
      name: 'Supabase Backend Platform',
      provider: 'supabase',
      category: 'cloud_baas',
      badge: 'BaaS / Postgres',
      description: 'Open source Firebase alternative providing PostgreSQL, Auth, Instant APIs, and Storage.',
      detectedFeatures: features,
      evidence,
      endpointsOrResources: endpoints.length > 0 ? endpoints : ['PostgreSQL DB', 'Auth API'],
    });

    storageSystems.push({
      name: 'Supabase PostgreSQL',
      type: 'relational',
      provider: 'Supabase',
      description: 'Managed PostgreSQL relational database with row-level security (RLS)',
      evidence: ['Supabase Client detected'],
    });
  }

  // ── 2. FIREBASE / GCP DETECTION ───────────────────────────────────────────
  // Strict, precise detection of Firebase that never flags Cloud Functions unless
  // real function packages/configs exist. Avoids matching generic 'onRequest' or React props.
  const hasFirebasePkg =
    depNames.has('firebase') ||
    depNames.has('firebase-admin') ||
    depNames.has('@firebase/app') ||
    depNames.has('@firebase/firestore') ||
    depNames.has('@firebase/auth') ||
    depNames.has('@firebase/storage');

  const hasFirebaseFiles = allFilePathsLower.some(
    (p) =>
      p === 'firebase.json' ||
      p.endsWith('/firebase.json') ||
      p.includes('firestore.rules') ||
      p.includes('storage.rules') ||
      p.includes('.firebaserc')
  );

  const hasFirebaseCode =
    codeSample.includes("from 'firebase/") ||
    codeSample.includes('from "firebase/') ||
    codeSample.includes("from 'firebase-admin") ||
    codeSample.includes('from "firebase-admin') ||
    (codeSample.includes('initializeApp') && (codeSample.includes('firebase') || codeSample.includes('getFirestore')));

  if (hasFirebasePkg || hasFirebaseFiles || hasFirebaseCode) {
    const features: string[] = [];
    const evidence: string[] = [];
    const endpoints: string[] = [];

    if (hasFirebasePkg) evidence.push('Firebase SDK in dependencies');
    if (hasFirebaseFiles) evidence.push('Firebase configuration files (firebase.json / rules)');

    // 2a. Cloud Firestore
    const hasFirestore =
      depNames.has('@firebase/firestore') ||
      allFilePathsLower.some((p) => p.includes('firestore.rules')) ||
      (contentsMap.get('firebase.json')?.includes('"firestore"') ?? false) ||
      codeSample.includes('getFirestore') ||
      codeSample.includes('firebase/firestore') ||
      codeSample.includes('firebase-admin/firestore');

    if (hasFirestore) {
      features.push('Cloud Firestore NoSQL');
      endpoints.push('Firestore DB');
      storageSystems.push({
        name: 'Cloud Firestore',
        type: 'document',
        provider: 'Google Cloud / Firebase',
        description: 'NoSQL document database with realtime listeners and offline support',
        evidence: ['getFirestore / Firestore configuration detected'],
      });
    }

    // 2b. Firebase Auth
    const hasAuth =
      depNames.has('@firebase/auth') ||
      codeSample.includes('getAuth') ||
      codeSample.includes('firebase/auth') ||
      codeSample.includes('firebase-admin/auth') ||
      codeSample.includes('signInWith') ||
      codeSample.includes('onAuthStateChanged');

    if (hasAuth) {
      features.push('Firebase Authentication');
      authProviders.add('Firebase Auth');
      endpoints.push('Firebase Auth');
    }

    // 2c. Firebase Cloud Storage
    const hasStorage =
      depNames.has('@firebase/storage') ||
      allFilePathsLower.some((p) => p.includes('storage.rules')) ||
      (contentsMap.get('firebase.json')?.includes('"storage"') ?? false) ||
      codeSample.includes('getStorage') ||
      codeSample.includes('firebase/storage') ||
      codeSample.includes('firebase-admin/storage');

    if (hasStorage) {
      features.push('Firebase Cloud Storage');
      endpoints.push('Firebase Storage');
      storageSystems.push({
        name: 'Firebase Cloud Storage',
        type: 'object_storage',
        provider: 'Google Cloud / Firebase',
        description: 'Object storage for user-generated content and binary files',
        evidence: ['Firebase Storage rules or getStorage detected'],
      });
    }

    // 2d. Firebase Cloud Functions
    // STRICT: MUST have firebase-functions dependency OR firebase.json containing "functions"
    // OR dedicated functions/package.json OR explicit import from 'firebase-functions'.
    // NEVER match generic 'onRequest' (e.g. onRequestClose in React modals)!
    const hasFunctionsPkg = depNames.has('firebase-functions');
    const hasFunctionsConfig = contentsMap.get('firebase.json')?.includes('"functions"') ?? false;
    const hasFunctionsDir =
      allFilePathsLower.some((p) => p === 'functions/package.json' || p.endsWith('/functions/package.json')) &&
      allFilePathsLower.some((p) => p.includes('functions/src/') || p.includes('functions/index'));
    const hasFunctionsCode =
      codeSample.includes("from 'firebase-functions'") ||
      codeSample.includes('require("firebase-functions")') ||
      codeSample.includes("from 'firebase-admin/functions'");

    if (hasFunctionsPkg || hasFunctionsConfig || hasFunctionsDir || hasFunctionsCode) {
      features.push('Firebase Cloud Functions');
      endpoints.push('Cloud Functions');
      serverlessRuntimes.add('Firebase Cloud Functions (Node.js)');
    }

    // 2e. Firebase Analytics / Telemetry
    const hasAnalytics =
      depNames.has('@firebase/analytics') ||
      codeSample.includes('getAnalytics') ||
      codeSample.includes('firebase/analytics') ||
      codeSample.includes('logEvent(');

    if (hasAnalytics) {
      features.push('Firebase Analytics & Telemetry');
      endpoints.push('Firebase Analytics');
    }

    // Determine service archetype and badge based strictly on detected features
    const hasBackendFeatures = hasFirestore || hasAuth || hasStorage || (features.includes('Firebase Cloud Functions'));

    if (!hasBackendFeatures && hasAnalytics) {
      // Pure client-side telemetry tracker (e.g. anonymous visitor counts in DomoNote)
      addService({
        id: 'firebase-analytics',
        name: 'Google Firebase (Client SDK)',
        provider: 'firebase',
        category: 'messaging',
        badge: 'Telemetry & Stats',
        description: 'Google Firebase client library utilized for client-side analytics and visitor metrics.',
        detectedFeatures: features,
        evidence: ['Firebase client SDK detected for visit/event tracking'],
        endpointsOrResources: endpoints.length > 0 ? endpoints : ['Firebase Analytics'],
      });
    } else if (hasBackendFeatures) {
      // True backend BaaS platform
      addService({
        id: 'firebase',
        name: 'Google Firebase Platform',
        provider: 'firebase',
        category: 'cloud_baas',
        badge: 'Google BaaS',
        description: 'Google application development platform for Firestore NoSQL, Authentication, and Storage.',
        detectedFeatures: features.length > 0 ? features : ['Firebase Cloud Services'],
        evidence,
        endpointsOrResources: endpoints.length > 0 ? endpoints : ['Firestore DB'],
      });
    } else {
      // Declared dependency with no active backend usage
      addService({
        id: 'firebase',
        name: 'Google Firebase (Client SDK)',
        provider: 'firebase',
        category: 'cloud_baas',
        badge: 'Client SDK',
        description: 'Firebase SDK declared in dependencies.',
        detectedFeatures: ['Firebase Client Library'],
        evidence,
        endpointsOrResources: ['Firebase SDK'],
      });
    }
  }

  // ── 3. GOOGLE CLOUD PLATFORM (GCP) ────────────────────────────────────────
  const hasGcpPkg =
    depNames.has('@google-cloud/storage') ||
    depNames.has('@google-cloud/bigquery') ||
    depNames.has('@google-cloud/firestore') ||
    depNames.has('@google-cloud/pubsub') ||
    depNames.has('google-auth-library');
  const hasGcpFiles = allFilePathsLower.some((p) => p.includes('app.yaml') || p.includes('cloudbuild.yaml'));

  if (hasGcpPkg || hasGcpFiles) {
    const features: string[] = [];
    const evidence: string[] = [];
    const endpoints: string[] = [];

    if (depNames.has('@google-cloud/storage') || codeSample.includes('@google-cloud/storage')) {
      features.push('Google Cloud Storage (GCS)');
      endpoints.push('GCS Buckets');
      storageSystems.push({
        name: 'Google Cloud Storage (GCS)',
        type: 'object_storage',
        provider: 'Google Cloud Platform',
        description: 'Scalable cloud object storage for binary assets and archives',
        evidence: ['@google-cloud/storage in dependencies'],
      });
    }
    if (depNames.has('@google-cloud/bigquery')) {
      features.push('BigQuery Analytics Warehouse');
      endpoints.push('BigQuery Datasets');
    }
    if (depNames.has('@google-cloud/pubsub')) {
      features.push('Cloud Pub/Sub Asynchronous Messaging');
      endpoints.push('Pub/Sub Topics');
    }
    if (hasGcpFiles) {
      features.push('Google Cloud Build / App Engine');
      endpoints.push('App Engine / Cloud Run');
    }
    if (features.length === 0) features.push('Google Cloud Services');

    addService({
      id: 'gcp',
      name: 'Google Cloud Platform (GCP)',
      provider: 'gcp',
      category: 'compute',
      badge: 'Google Cloud',
      description: 'Enterprise cloud infrastructure for object storage, serverless compute, and data analytics.',
      detectedFeatures: features,
      evidence: ['@google-cloud client libraries or GCP config files found'],
      endpointsOrResources: endpoints.length > 0 ? endpoints : ['GCS Buckets', 'Cloud Run'],
    });
  }

  // ── 4. AMAZON WEB SERVICES (AWS) ──────────────────────────────────────────
  const hasAwsPkg =
    depNames.has('aws-sdk') ||
    Array.from(depNames).some((d) => d.startsWith('@aws-sdk/')) ||
    depNames.has('aws-amplify') ||
    depNames.has('serverless');
  const hasAwsFiles = allFilePathsLower.some(
    (p) =>
      p.includes('serverless.yml') ||
      p.includes('serverless.yaml') ||
      p.includes('serverless.ts') ||
      p.includes('sam.yaml') ||
      p.includes('sam.yml') ||
      p.includes('cdk.json') ||
      p.includes('amplify/')
  );
  const hasAwsCode =
    codeSample.includes('S3Client') ||
    codeSample.includes('DynamoDBClient') ||
    codeSample.includes('AWS.S3') ||
    codeSample.includes('@aws-sdk');

  if (hasAwsPkg || hasAwsFiles || hasAwsCode) {
    const features: string[] = [];
    const evidence: string[] = [];
    const endpoints: string[] = [];

    if (hasAwsPkg) evidence.push('AWS SDK in dependencies (@aws-sdk or aws-sdk)');
    if (hasAwsFiles) evidence.push('AWS Serverless / CDK / SAM configuration detected');

    if (codeSample.includes('S3Client') || codeSample.includes('AWS.S3') || depNames.has('@aws-sdk/client-s3')) {
      features.push('Amazon S3 Object Storage');
      endpoints.push('S3 Buckets');
      storageSystems.push({
        name: 'Amazon S3',
        type: 'object_storage',
        provider: 'AWS',
        description: 'Scalable cloud object storage for binary files, backups, and user uploads',
        evidence: ['@aws-sdk/client-s3 or S3Client detected'],
      });
    }
    if (codeSample.includes('DynamoDB') || depNames.has('@aws-sdk/client-dynamodb')) {
      features.push('Amazon DynamoDB NoSQL');
      endpoints.push('DynamoDB Tables');
      storageSystems.push({
        name: 'Amazon DynamoDB',
        type: 'document',
        provider: 'AWS',
        description: 'Fully managed NoSQL document and key-value database',
        evidence: ['DynamoDBClient detected'],
      });
    }

    // STRICT: Lambda requires actual Lambda SDK, serverless config, or handler export
    const hasLambda =
      depNames.has('@aws-sdk/client-lambda') ||
      depNames.has('aws-lambda') ||
      allFilePathsLower.some((p) => p.includes('serverless.yml') || p.includes('sam.yaml') || p.includes('sam.yml')) ||
      codeSample.includes('exports.handler = async') ||
      codeSample.includes('export const handler = async');

    if (hasLambda) {
      features.push('AWS Lambda Serverless Functions');
      endpoints.push('Lambda Functions');
      serverlessRuntimes.add('AWS Lambda');
    }

    if (depNames.has('@aws-sdk/client-cognito-identity') || codeSample.includes('Cognito')) {
      features.push('AWS Cognito Identity');
      endpoints.push('Cognito User Pools');
      authProviders.add('AWS Cognito');
    }

    if (features.length === 0) features.push('AWS Cloud Services');

    addService({
      id: 'aws',
      name: 'Amazon Web Services (AWS)',
      provider: 'aws',
      category: 'compute',
      badge: 'AWS Cloud',
      description: 'Amazon Web Services infrastructure including S3 storage, Lambda compute, and DynamoDB.',
      detectedFeatures: features,
      evidence,
      endpointsOrResources: endpoints.length > 0 ? endpoints : ['S3 Buckets', 'AWS SDK'],
    });
  }

  // ── 5. CLOUDFLARE ─────────────────────────────────────────────────────────
  const hasCloudflarePkg =
    depNames.has('wrangler') ||
    depNames.has('@cloudflare/workers-types') ||
    depNames.has('@cloudflare/kv-asset-handler');
  const hasCloudflareFiles = allFilePathsLower.some(
    (p) =>
      p.includes('wrangler.toml') ||
      p.includes('wrangler.json') ||
      p.includes('_worker.js') ||
      p.includes('_middleware.ts') ||
      p.includes('functions/api/')
  );
  const hasCloudflareCode =
    codeSample.includes('env.KV') ||
    codeSample.includes('env.D1') ||
    codeSample.includes('env.R2') ||
    codeSample.includes('export default { fetch');

  if (hasCloudflarePkg || hasCloudflareFiles || hasCloudflareCode) {
    const features: string[] = [];
    const evidence: string[] = [];
    const endpoints: string[] = [];

    if (hasCloudflarePkg) evidence.push('Wrangler CLI / Cloudflare Workers types in dependencies');
    if (hasCloudflareFiles) evidence.push('wrangler.toml or _worker.js file detected');

    features.push('Cloudflare Workers Edge Compute');
    endpoints.push('Workers Routes');
    serverlessRuntimes.add('Cloudflare Workers (V8 Edge)');

    if (codeSample.includes('env.D1') || pkgContent.includes('d1')) {
      features.push('Cloudflare D1 SQL Database');
      endpoints.push('D1 Databases');
      storageSystems.push({
        name: 'Cloudflare D1',
        type: 'relational',
        provider: 'Cloudflare',
        description: 'Serverless SQLite database distributed at the edge',
        evidence: ['env.D1 binding detected'],
      });
    }
    if (codeSample.includes('env.R2') || pkgContent.includes('r2')) {
      features.push('Cloudflare R2 Object Storage');
      endpoints.push('R2 Storage Buckets');
      storageSystems.push({
        name: 'Cloudflare R2',
        type: 'object_storage',
        provider: 'Cloudflare',
        description: 'S3-compatible zero-egress cloud object storage',
        evidence: ['env.R2 storage binding detected'],
      });
    }
    if (codeSample.includes('env.KV') || pkgContent.includes('kv')) {
      features.push('Cloudflare Workers KV');
      endpoints.push('KV Namespaces');
      storageSystems.push({
        name: 'Workers KV',
        type: 'key_value',
        provider: 'Cloudflare',
        description: 'Low-latency global key-value data storage',
        evidence: ['env.KV binding detected'],
      });
    }

    addService({
      id: 'cloudflare',
      name: 'Cloudflare Edge Platform',
      provider: 'cloudflare',
      category: 'compute',
      badge: 'Cloudflare Edge',
      description: 'Global edge network providing Workers serverless execution, D1 SQL, and R2 object storage.',
      detectedFeatures: features,
      evidence,
      endpointsOrResources: endpoints.length > 0 ? endpoints : ['Workers Routes'],
    });
  }

  // ── 6. MICROSOFT AZURE ────────────────────────────────────────────────────
  const hasAzurePkg =
    depNames.has('@azure/storage-blob') ||
    depNames.has('@azure/cosmos') ||
    depNames.has('@azure/functions') ||
    depNames.has('@azure/identity');
  // STRICT: host.json or function.json indicate Azure Functions.
  // NEVER use azure-pipelines (which is CI/CD, not Azure Functions)!
  const hasAzureFunctionsFiles = allFilePathsLower.some((p) => p.endsWith('host.json') || p.endsWith('function.json'));

  if (hasAzurePkg || hasAzureFunctionsFiles) {
    const features: string[] = [];
    const endpoints: string[] = [];

    if (depNames.has('@azure/storage-blob') || codeSample.includes('BlobServiceClient')) {
      features.push('Azure Blob Storage');
      endpoints.push('Blob Storage');
      storageSystems.push({
        name: 'Azure Blob Storage',
        type: 'object_storage',
        provider: 'Microsoft Azure',
        description: 'Massively scalable object storage for cloud workloads',
        evidence: ['@azure/storage-blob detected'],
      });
    }
    if (depNames.has('@azure/cosmos') || codeSample.includes('CosmosClient')) {
      features.push('Azure CosmosDB');
      endpoints.push('CosmosDB');
      storageSystems.push({
        name: 'Azure CosmosDB',
        type: 'document',
        provider: 'Microsoft Azure',
        description: 'Globally distributed multi-model NoSQL database service',
        evidence: ['@azure/cosmos detected'],
      });
    }
    if (depNames.has('@azure/functions') || hasAzureFunctionsFiles) {
      features.push('Azure Functions');
      endpoints.push('Azure Functions');
      serverlessRuntimes.add('Azure Functions');
    }
    if (features.length === 0) features.push('Azure Cloud Services');

    addService({
      id: 'azure',
      name: 'Microsoft Azure Cloud',
      provider: 'azure',
      category: 'compute',
      badge: 'Microsoft Azure',
      description: 'Enterprise cloud services providing Blob Storage, CosmosDB, and Azure Functions.',
      detectedFeatures: features,
      evidence: ['Azure client libraries or host.json detected'],
      endpointsOrResources: endpoints.length > 0 ? endpoints : ['Azure Cloud Services'],
    });
  }

  // ── 7. VERCEL SERVERLESS & STATIC HOSTING ─────────────────────────────────
  // Differentiate between static frontend edge hosting (vercel.json rewrites)
  // versus actual serverless compute functions (/api route handlers).
  const hasVercelStoragePkg =
    depNames.has('@vercel/kv') || depNames.has('@vercel/blob') || depNames.has('@vercel/postgres');
  const hasVercelOtherPkg =
    depNames.has('@vercel/edge') ||
    depNames.has('@vercel/node') ||
    depNames.has('@vercel/functions') ||
    depNames.has('@vercel/analytics') ||
    depNames.has('@vercel/speed-insights');
  const hasVercelConfigFile = allFilePathsLower.some((p) => p === 'vercel.json' || p.endsWith('/vercel.json'));

  // STRICT: Only flag serverless functions if actual API function handlers exist
  // e.g. root api/ folder with executable route files, or Next.js pages/api / app/api,
  // or @vercel/node / @vercel/functions packages or functions config in vercel.json.
  const hasServerlessApiFiles =
    allFilePathsLower.some(
      (p) =>
        p.startsWith('api/') &&
        (p.endsWith('.ts') || p.endsWith('.js') || p.endsWith('.py') || p.endsWith('.go')) &&
        !p.endsWith('.d.ts') &&
        !p.includes('api/client') &&
        !p.includes('api/types')
    ) ||
    allFilePathsLower.some((p) => p.includes('pages/api/') || p.includes('app/api/')) ||
    depNames.has('@vercel/node') ||
    depNames.has('@vercel/functions') ||
    (contentsMap.get('vercel.json')?.includes('"functions"') ?? false);

  if (hasVercelStoragePkg || hasVercelOtherPkg || hasVercelConfigFile || hasServerlessApiFiles) {
    const features: string[] = [];
    const endpoints: string[] = [];

    if (hasServerlessApiFiles) {
      features.push('Vercel Serverless Functions');
      endpoints.push('/api/* Serverless Routes');
      serverlessRuntimes.add('Vercel Serverless / Edge Runtime');
    }

    if (depNames.has('@vercel/blob')) {
      features.push('Vercel Blob Storage');
      endpoints.push('Vercel Blob');
      storageSystems.push({
        name: 'Vercel Blob',
        type: 'object_storage',
        provider: 'Vercel',
        description: 'Global file upload and object storage powered by AWS S3/Cloudflare',
        evidence: ['@vercel/blob package detected'],
      });
    }

    if (depNames.has('@vercel/kv')) {
      features.push('Vercel KV (Redis)');
      endpoints.push('Vercel KV');
      storageSystems.push({
        name: 'Vercel KV',
        type: 'cache',
        provider: 'Vercel / Upstash',
        description: 'Durable, low-latency Redis-compatible key-value data store',
        evidence: ['@vercel/kv package detected'],
      });
    }

    if (depNames.has('@vercel/postgres')) {
      features.push('Vercel Postgres (Neon)');
      endpoints.push('Vercel Postgres');
      storageSystems.push({
        name: 'Vercel Postgres',
        type: 'relational',
        provider: 'Vercel / Neon',
        description: 'Serverless PostgreSQL database designed for compute-at-the-edge',
        evidence: ['@vercel/postgres package detected'],
      });
    }

    if (hasVercelConfigFile && !hasServerlessApiFiles) {
      features.push('Static Edge Deployment');
      features.push('SPA Routing & Rewrites');
      endpoints.push('Global Edge CDN', 'SPA Rewrites');
    }

    const isCompute = hasServerlessApiFiles || depNames.has('@vercel/edge');

    addService({
      id: 'vercel',
      name: 'Vercel Cloud Platform',
      provider: 'vercel',
      category: isCompute ? 'compute' : 'cdn',
      badge: isCompute ? 'Vercel Serverless' : 'Vercel Edge Hosting',
      description: isCompute
        ? 'Frontend cloud platform with serverless API functions, Edge execution, and storage.'
        : 'Frontend cloud platform providing global Edge CDN, asset optimization, and routing rewrites.',
      detectedFeatures: features.length > 0 ? features : ['Vercel Edge Deployment'],
      evidence: [hasVercelConfigFile ? 'vercel.json configuration detected' : '@vercel package detected'],
      endpointsOrResources: endpoints.length > 0 ? endpoints : ['Global Edge CDN'],
    });
  }

  // ── 8. NETLIFY ────────────────────────────────────────────────────────────
  const hasNetlifyPkg = depNames.has('@netlify/functions') || depNames.has('netlify-cli');
  const hasNetlifyFiles = allFilePathsLower.some((p) => p.includes('netlify.toml'));
  const hasNetlifyFunctions = allFilePathsLower.some(
    (p) => p.includes('netlify/functions/') || p.includes('netlify/edge-functions/')
  );

  if (hasNetlifyPkg || hasNetlifyFiles || hasNetlifyFunctions) {
    const features: string[] = [];
    const endpoints: string[] = [];

    if (hasNetlifyFunctions || depNames.has('@netlify/functions')) {
      features.push('Netlify Serverless Functions');
      endpoints.push('Netlify Functions');
      serverlessRuntimes.add('Netlify Functions (Serverless)');
    }

    if (hasNetlifyFiles) {
      features.push('Netlify Edge CDN');
      endpoints.push('Global CDN');
    }

    const isCompute = hasNetlifyFunctions || depNames.has('@netlify/functions');

    addService({
      id: 'netlify',
      name: 'Netlify Cloud Platform',
      provider: 'netlify',
      category: isCompute ? 'compute' : 'cdn',
      badge: isCompute ? 'Netlify Serverless' : 'Netlify Edge CDN',
      description: isCompute
        ? 'Edge platform providing serverless function execution and web hosting.'
        : 'Global CDN and static hosting platform with declarative configuration.',
      detectedFeatures: features.length > 0 ? features : ['Netlify Hosting'],
      evidence: ['netlify.toml or netlify functions detected'],
      endpointsOrResources: endpoints.length > 0 ? endpoints : ['Global CDN'],
    });
  }

  // ── 9. DATABASE & CACHE ENGINES (Postgres, Mongo, Redis, SQLite, MySQL) ──
  if (
    depNames.has('pg') ||
    depNames.has('postgres') ||
    codeSample.includes('postgres://') ||
    codeSample.includes('postgresql://')
  ) {
    if (!storageSystems.some((s) => s.name.includes('PostgreSQL'))) {
      storageSystems.push({
        name: 'PostgreSQL Database',
        type: 'relational',
        provider: 'Postgres / Self-Hosted',
        description: 'Relational database engine with robust ACID transactions and SQL schemas',
        evidence: ['pg / postgres dependencies or connection strings'],
      });
    }
  }

  if (
    depNames.has('mongoose') ||
    depNames.has('mongodb') ||
    codeSample.includes('mongodb://') ||
    codeSample.includes('mongodb+srv://')
  ) {
    storageSystems.push({
      name: 'MongoDB / Atlas',
      type: 'document',
      provider: 'MongoDB',
      description: 'Document-oriented distributed NoSQL database',
      evidence: ['mongoose / mongodb library detected in dependencies'],
    });
  }

  if (
    depNames.has('redis') ||
    depNames.has('ioredis') ||
    depNames.has('@upstash/redis') ||
    depNames.has('@upstash/ratelimit')
  ) {
    storageSystems.push({
      name: 'Redis / Upstash Cache',
      type: 'cache',
      provider: depNames.has('@upstash/redis') ? 'Upstash' : 'Redis',
      description: 'In-memory data structure store used for caching, rate-limiting, and queues',
      evidence: ['redis / @upstash/redis dependency detected'],
    });
  }

  if (
    depNames.has('mysql2') ||
    depNames.has('mysql') ||
    depNames.has('@planetscale/database') ||
    codeSample.includes('mysql://')
  ) {
    storageSystems.push({
      name: depNames.has('@planetscale/database') ? 'PlanetScale / MySQL' : 'MySQL Database',
      type: 'relational',
      provider: depNames.has('@planetscale/database') ? 'PlanetScale' : 'MySQL',
      description: 'Relational SQL database engine with structured schema definitions',
      evidence: ['mysql2 / @planetscale/database dependency detected'],
    });
  }

  if (
    depNames.has('better-sqlite3') ||
    depNames.has('sqlite3') ||
    allFilePathsLower.some((p) => p.endsWith('.sqlite') || p.endsWith('.sqlite3') || p.endsWith('.db'))
  ) {
    if (!storageSystems.some((s) => s.name.includes('SQLite') || s.name.includes('D1'))) {
      storageSystems.push({
        name: 'SQLite Database',
        type: 'relational',
        provider: 'Embedded / Local',
        description: 'Serverless embedded relational SQL database engine',
        evidence: ['sqlite3 or .sqlite database files found'],
      });
    }
  }

  // Vector databases (AI & Embedding systems)
  if (
    depNames.has('@pinecone-database/pinecone') ||
    depNames.has('chromadb') ||
    depNames.has('@qdrant/js-client-rest')
  ) {
    const vecName = depNames.has('@pinecone-database/pinecone')
      ? 'Pinecone Vector DB'
      : depNames.has('chromadb')
        ? 'ChromaDB'
        : 'Qdrant Vector DB';
    storageSystems.push({
      name: vecName,
      type: 'vector',
      provider: 'Vector Store',
      description: 'High-dimensional vector embedding database for semantic AI retrieval and RAG',
      evidence: ['vector database client detected in dependencies'],
    });
  }

  // ── 10. AUTH PROVIDERS ────────────────────────────────────────────────────
  if (depNames.has('@clerk/clerk-react') || depNames.has('@clerk/nextjs') || depNames.has('@clerk/backend')) {
    authProviders.add('Clerk Authentication');
    addService({
      id: 'clerk',
      name: 'Clerk Identity Platform',
      provider: 'other',
      category: 'auth',
      badge: 'Auth Provider',
      description: 'Complete user management and authentication suite with prebuilt UI components.',
      detectedFeatures: ['User Management', 'JWT Verification', 'Multi-factor Auth (MFA)'],
      evidence: ['@clerk packages in dependencies'],
      endpointsOrResources: ['/api/auth', 'User Sessions'],
    });
  }

  if (depNames.has('next-auth') || depNames.has('@auth/core')) {
    authProviders.add('NextAuth / Auth.js');
  }
  if (depNames.has('auth0') || depNames.has('@auth0/auth0-react') || depNames.has('@auth0/nextjs-auth0')) {
    authProviders.add('Auth0');
  }
  if (depNames.has('@kinde-oss/kinde-auth-nextjs') || depNames.has('@kinde-oss/kinde-auth-react')) {
    authProviders.add('Kinde Auth');
  }

  // ── 11. GENERIC CLIENT-SIDE FALLBACK STORAGE ──────────────────────────────
  // If zero storage systems detected, check if standard browser APIs are utilized.
  if (storageSystems.length === 0) {
    if (codeSample.includes('indexedDB') || codeSample.includes('localStorage') || depNames.has('localstorage')) {
      storageSystems.push({
        name: 'Browser IndexedDB / LocalStorage',
        type: 'local',
        provider: 'Client Sandbox',
        description: 'In-browser persistent client-side key-value and object store with 0 external network calls',
        evidence: ['Browser IndexedDB / localStorage API detected in source code'],
      });
    }
  }

  // ── 12. ARCHITECTURAL CLASSIFICATION & TITLE SYNTHESIS ────────────────────
  // Determine if the app is fundamentally Local-First, Serverless, BaaS, or Cloud Infra
  const hasLocalStore = storageSystems.some((s) => s.type === 'local');
  const hasServerlessCompute = serverlessRuntimes.size > 0;
  const hasAuthSystems = authProviders.size > 0;
  const hasTrueCloudBackend =
    (services.some((s) => s.category === 'cloud_baas' && s.badge !== 'Telemetry & Stats' && s.badge !== 'Client SDK') &&
      (hasAuthSystems || !hasLocalStore)) ||
    services.some((s) => s.category === 'compute') ||
    hasServerlessCompute;

  let architectureType: ArchitectureClassificationType = 'standalone';
  let architectureTitle = 'Self-Contained Client Architecture';
  let architectureBadge = 'LOCAL SANDBOX';
  let architectureDescription = 'Standalone client application operating without external cloud infrastructure.';

  if (hasLocalStore && !hasServerlessCompute) {
    // True Local-First / Offline-First Application (like DomoNote with Dexie.js / IndexedDB)
    architectureType = 'local_first';
    const localStoreName = storageSystems.find((s) => s.type === 'local')?.name || 'Browser Storage';
    const baseName = localStoreName.includes('Dexie') ? 'Dexie.js / IndexedDB' : localStoreName.split(' ')[0];
    architectureTitle = `Local-First Client Architecture (${baseName})`;
    architectureBadge = 'LOCAL-FIRST CLIENT';
    architectureDescription =
      'Offline-capable client application persisting state locally in browser storage with zero external backend dependencies.';
  } else if (hasServerlessCompute) {
    // Distributed serverless architecture
    architectureType = 'serverless_fullstack';
    const runtimeList = Array.from(serverlessRuntimes).map((r) => r.split(' ')[0]);
    architectureTitle = `${runtimeList.join(' + ')} Serverless Architecture`;
    architectureBadge = 'SERVERLESS ARCHITECTURE';
    architectureDescription = 'Distributed event-driven serverless architecture running compute at the edge.';
  } else if (services.some((s) => s.category === 'cloud_baas' && s.badge !== 'Telemetry & Stats')) {
    // Full Backend-as-a-Service (Supabase or full Firebase)
    architectureType = 'cloud_baas';
    const baasSvc = services.find((s) => s.category === 'cloud_baas' && s.badge !== 'Telemetry & Stats');
    architectureTitle = baasSvc?.name || 'Cloud BaaS Platform Architecture';
    architectureBadge = 'CLOUD BAAS';
    architectureDescription =
      'Managed backend-as-a-service providing database, authentication, and realtime services.';
  } else if (services.some((s) => s.category === 'compute' || s.category === 'storage')) {
    // Cloud infrastructure (AWS / GCP / Azure)
    architectureType = 'cloud_infrastructure';
    const providerList = Array.from(detectedProviders)
      .filter((p) => p !== 'other')
      .map((p) => p.toUpperCase());
    architectureTitle = `${providerList.join(' + ')} Cloud Infrastructure`;
    architectureBadge = 'CLOUD INFRASTRUCTURE';
    architectureDescription = 'Cloud infrastructure architecture with distributed computing and storage.';
  } else if (services.some((s) => s.category === 'cdn')) {
    // Static edge deployment (Vercel / Netlify static hosting)
    architectureType = 'static_edge';
    const cdnSvc = services.find((s) => s.category === 'cdn');
    architectureTitle = `Static Edge Frontend (${cdnSvc?.provider.toUpperCase() || 'CDN'} Deployed)`;
    architectureBadge = 'EDGE HOSTED';
    architectureDescription = 'Pre-rendered static client application distributed globally via edge CDN.';
  }

  const providersArray = Array.from(detectedProviders);

  return {
    hasCloudServices: services.length > 0,
    hasBackendCloud: hasTrueCloudBackend,
    architectureType,
    architectureTitle,
    architectureBadge,
    architectureDescription,
    providers: providersArray,
    services,
    storageSystems,
    authProviders: Array.from(authProviders),
    serverlessRuntimes: Array.from(serverlessRuntimes),
  };
}
