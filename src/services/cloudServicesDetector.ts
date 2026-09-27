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
  type: 'object_storage' | 'relational' | 'document' | 'key_value' | 'cache' | 'local';
  provider: string;
  description: string;
  evidence: string[];
}

export interface CloudDetectionResult {
  hasCloudServices: boolean;
  providers: CloudProviderType[];
  services: CloudServiceInfo[];
  storageSystems: StorageSystemInfo[];
  authProviders: string[];
  serverlessRuntimes: string[];
}

/**
 * Universal Cloud, BaaS, Infrastructure, and Storage Detector
 * Scans dependencies, config files, source code imports, and route patterns.
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

  // Read package.json if present
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

  // Combined code sample for fast regex matching
  let codeSample = '';
  for (const [path, content] of contentsMap.entries()) {
    if (path.endsWith('.ts') || path.endsWith('.tsx') || path.endsWith('.js') || path.endsWith('.py') || path.endsWith('.go')) {
      codeSample += `\n// --- ${path} ---\n` + content.slice(0, 1500);
    }
  }

  const services: CloudServiceInfo[] = [];
  const storageSystems: StorageSystemInfo[] = [];
  const authProviders: Set<string> = new Set();
  const serverlessRuntimes: Set<string> = new Set();
  const detectedProviders: Set<CloudProviderType> = new Set();

  // Helper to add service
  const addService = (svc: CloudServiceInfo) => {
    if (!services.some((s) => s.id === svc.id)) {
      services.push(svc);
      detectedProviders.add(svc.provider);
    }
  };

  // ── 1. SUPABASE DETECTION ──────────────────────────────────────────────────
  const hasSupabasePkg =
    depNames.has('@supabase/supabase-js') ||
    depNames.has('@supabase/ssr') ||
    depNames.has('@supabase/auth-helpers-nextjs') ||
    depNames.has('@supabase/auth-ui-react');
  const hasSupabaseFiles = allFilePathsLower.some(
    (p) => p.includes('supabase/') || p.includes('supabase.ts') || p.includes('supabaseclient')
  );
  const hasSupabaseCode =
    codeSample.includes('createClient') && (codeSample.includes('supabase') || codeSample.includes('SUPABASE_URL'));

  if (hasSupabasePkg || hasSupabaseFiles || hasSupabaseCode) {
    const features: string[] = [];
    const evidence: string[] = [];

    if (hasSupabasePkg) evidence.push('Supabase SDK in dependencies (@supabase/supabase-js)');
    if (hasSupabaseFiles) evidence.push('Supabase configuration / directory detected');
    if (codeSample.includes('.from(')) features.push('PostgreSQL Database Client');
    if (codeSample.includes('.auth.')) {
      features.push('Supabase Auth & Session Handling');
      authProviders.add('Supabase Auth');
    }
    if (codeSample.includes('.storage.')) {
      features.push('Supabase Storage Buckets');
      storageSystems.push({
        name: 'Supabase Storage',
        type: 'object_storage',
        provider: 'Supabase',
        description: 'S3-compatible object storage for files, media, and attachments',
        evidence: ['supabase.storage detected in source code'],
      });
    }
    if (allFilePathsLower.some((p) => p.includes('supabase/functions') || p.includes('functions/'))) {
      features.push('Deno Edge Functions');
      serverlessRuntimes.add('Supabase Edge Functions (Deno)');
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
      endpointsOrResources: ['PostgreSQL DB', 'Auth API', 'Storage Buckets', 'Edge Functions'],
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
  const hasFirebasePkg =
    depNames.has('firebase') ||
    depNames.has('firebase-admin') ||
    depNames.has('@firebase/app') ||
    depNames.has('@firebase/firestore') ||
    depNames.has('@firebase/auth');
  const hasFirebaseFiles = allFilePathsLower.some(
    (p) =>
      p.includes('firebase.json') ||
      p.includes('firestore.rules') ||
      p.includes('storage.rules') ||
      p.includes('.firebaserc') ||
      p.includes('firebase.ts')
  );
  const hasFirebaseCode =
    codeSample.includes('initializeApp') && (codeSample.includes('firebase') || codeSample.includes('getFirestore'));

  if (hasFirebasePkg || hasFirebaseFiles || hasFirebaseCode) {
    const features: string[] = [];
    const evidence: string[] = [];

    if (hasFirebasePkg) evidence.push('Firebase SDK in dependencies (firebase / firebase-admin)');
    if (hasFirebaseFiles) evidence.push('Firebase configuration files (firebase.json / rules)');
    if (codeSample.includes('getFirestore') || codeSample.includes('collection(') || codeSample.includes('doc(')) {
      features.push('Cloud Firestore NoSQL');
      storageSystems.push({
        name: 'Cloud Firestore',
        type: 'document',
        provider: 'Google Cloud / Firebase',
        description: 'NoSQL document database with realtime listeners and offline support',
        evidence: ['getFirestore / collection calls detected'],
      });
    }
    if (codeSample.includes('getAuth') || codeSample.includes('signInWith')) {
      features.push('Firebase Authentication');
      authProviders.add('Firebase Auth');
    }
    if (codeSample.includes('getStorage') || codeSample.includes('ref(')) {
      features.push('Firebase Cloud Storage');
      storageSystems.push({
        name: 'Firebase Cloud Storage',
        type: 'object_storage',
        provider: 'Google Cloud / Firebase',
        description: 'Object storage for user-generated content and files',
        evidence: ['getStorage calls detected in code'],
      });
    }
    if (allFilePathsLower.some((p) => p.includes('functions/src') || p.includes('functions/index')) || codeSample.includes('onRequest')) {
      features.push('Firebase Cloud Functions');
      serverlessRuntimes.add('Firebase Cloud Functions (Node.js)');
    }
    if (features.length === 0) features.push('Firebase Cloud Services');

    addService({
      id: 'firebase',
      name: 'Google Firebase Platform',
      provider: 'firebase',
      category: 'cloud_baas',
      badge: 'Google BaaS',
      description: 'Google application development platform for Firestore, Auth, Functions, and Storage.',
      detectedFeatures: features,
      evidence,
      endpointsOrResources: ['Firestore DB', 'Firebase Auth', 'Firebase Storage', 'Cloud Functions'],
    });
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
    if (depNames.has('@google-cloud/storage') || codeSample.includes('@google-cloud/storage')) {
      features.push('Google Cloud Storage (GCS)');
      storageSystems.push({
        name: 'Google Cloud Storage (GCS)',
        type: 'object_storage',
        provider: 'Google Cloud Platform',
        description: 'Scalable cloud object storage for binary assets and archives',
        evidence: ['@google-cloud/storage in dependencies'],
      });
    }
    if (depNames.has('@google-cloud/bigquery')) features.push('BigQuery Analytics Warehouse');
    if (depNames.has('@google-cloud/pubsub')) features.push('Cloud Pub/Sub Asynchronous Messaging');
    if (hasGcpFiles) features.push('Google Cloud Build / App Engine');
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
      endpointsOrResources: ['GCS Buckets', 'Cloud Run / App Engine', 'Cloud Pub/Sub'],
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
      p.includes('cdk.json') ||
      p.includes('amplify/') ||
      p.includes('.aws/')
  );
  const hasAwsCode =
    codeSample.includes('S3Client') ||
    codeSample.includes('DynamoDBClient') ||
    codeSample.includes('AWS.S3') ||
    codeSample.includes('exports.handler = async');

  if (hasAwsPkg || hasAwsFiles || hasAwsCode) {
    const features: string[] = [];
    const evidence: string[] = [];

    if (hasAwsPkg) evidence.push('AWS SDK in dependencies (@aws-sdk or aws-sdk)');
    if (hasAwsFiles) evidence.push('AWS Serverless / CDK / SAM configuration detected');
    if (codeSample.includes('S3Client') || codeSample.includes('AWS.S3') || depNames.has('@aws-sdk/client-s3')) {
      features.push('Amazon S3 Object Storage');
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
      storageSystems.push({
        name: 'Amazon DynamoDB',
        type: 'document',
        provider: 'AWS',
        description: 'Fully managed NoSQL document and key-value database',
        evidence: ['DynamoDBClient detected'],
      });
    }
    if (hasAwsFiles || codeSample.includes('exports.handler') || depNames.has('@aws-sdk/client-lambda')) {
      features.push('AWS Lambda Serverless Functions');
      serverlessRuntimes.add('AWS Lambda');
    }
    if (depNames.has('@aws-sdk/client-cognito-identity') || codeSample.includes('Cognito')) {
      features.push('AWS Cognito Identity');
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
      endpointsOrResources: ['S3 Buckets', 'Lambda Functions', 'DynamoDB Tables', 'API Gateway'],
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

    if (hasCloudflarePkg) evidence.push('Wrangler CLI / Cloudflare Workers types in dependencies');
    if (hasCloudflareFiles) evidence.push('wrangler.toml or _worker.js file detected');

    features.push('Cloudflare Workers Edge Compute');
    serverlessRuntimes.add('Cloudflare Workers (V8 Edge)');

    if (codeSample.includes('env.D1') || pkgContent.includes('d1')) {
      features.push('Cloudflare D1 SQL Database');
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
      name: 'Cloudflare Edge & Developer Platform',
      provider: 'cloudflare',
      category: 'compute',
      badge: 'Cloudflare Edge',
      description: 'Global edge network providing Workers serverless execution, D1 SQL, and R2 object storage.',
      detectedFeatures: features,
      evidence,
      endpointsOrResources: ['Workers Routes', 'R2 Storage Buckets', 'D1 Databases', 'KV Namespaces'],
    });
  }

  // ── 6. MICROSOFT AZURE ────────────────────────────────────────────────────
  const hasAzurePkg =
    depNames.has('@azure/storage-blob') ||
    depNames.has('@azure/cosmos') ||
    depNames.has('@azure/functions') ||
    depNames.has('@azure/identity');
  const hasAzureFiles = allFilePathsLower.some((p) => p.includes('host.json') || p.includes('azure-pipelines'));

  if (hasAzurePkg || hasAzureFiles) {
    const features: string[] = [];
    if (depNames.has('@azure/storage-blob') || codeSample.includes('BlobServiceClient')) {
      features.push('Azure Blob Storage');
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
      storageSystems.push({
        name: 'Azure CosmosDB',
        type: 'document',
        provider: 'Microsoft Azure',
        description: 'Globally distributed multi-model NoSQL database service',
        evidence: ['@azure/cosmos detected'],
      });
    }
    if (depNames.has('@azure/functions') || hasAzureFiles) {
      features.push('Azure Functions');
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
      evidence: ['Azure client libraries or configuration files detected'],
      endpointsOrResources: ['Blob Storage', 'CosmosDB', 'Azure Functions'],
    });
  }

  // ── 7. VERCEL SERVERLESS & STORAGE ────────────────────────────────────────
  const hasVercelPkg =
    depNames.has('@vercel/kv') ||
    depNames.has('@vercel/blob') ||
    depNames.has('@vercel/postgres') ||
    depNames.has('@vercel/edge');
  const hasVercelFiles = allFilePathsLower.some((p) => p === 'vercel.json' || p.startsWith('api/'));

  if (hasVercelPkg || hasVercelFiles) {
    const features: string[] = ['Vercel Serverless Functions'];
    serverlessRuntimes.add('Vercel Serverless / Edge Runtime');

    if (depNames.has('@vercel/blob')) {
      features.push('Vercel Blob Storage');
      storageSystems.push({
        name: 'Vercel Blob',
        type: 'object_storage',
        provider: 'Vercel',
        description: 'Fast, global file upload and object storage powered by AWS S3/Cloudflare',
        evidence: ['@vercel/blob package detected'],
      });
    }
    if (depNames.has('@vercel/kv')) {
      features.push('Vercel KV (Redis)');
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
      storageSystems.push({
        name: 'Vercel Postgres',
        type: 'relational',
        provider: 'Vercel / Neon',
        description: 'Serverless PostgreSQL database designed for compute-at-the-edge',
        evidence: ['@vercel/postgres package detected'],
      });
    }

    addService({
      id: 'vercel',
      name: 'Vercel Cloud Platform',
      provider: 'vercel',
      category: 'compute',
      badge: 'Vercel Serverless',
      description: 'Frontend cloud platform with serverless API functions, Edge middleware, and storage.',
      detectedFeatures: features,
      evidence: ['vercel.json or @vercel storage packages detected'],
      endpointsOrResources: ['/api/* Serverless Routes', 'Edge Middleware', 'Vercel Storage'],
    });
  }

  // ── 8. DATABASE & CACHE ENGINES (Postgres, Mongo, Redis, SQLite, etc.) ────
  if (depNames.has('pg') || depNames.has('postgres') || codeSample.includes('postgres://') || codeSample.includes('postgresql://')) {
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

  if (depNames.has('mongoose') || depNames.has('mongodb') || codeSample.includes('mongodb://') || codeSample.includes('mongodb+srv://')) {
    storageSystems.push({
      name: 'MongoDB / Atlas',
      type: 'document',
      provider: 'MongoDB',
      description: 'Document-oriented distributed NoSQL database',
      evidence: ['mongoose / mongodb library detected in dependencies'],
    });
  }

  if (depNames.has('redis') || depNames.has('ioredis') || depNames.has('@upstash/redis') || depNames.has('@upstash/ratelimit')) {
    storageSystems.push({
      name: 'Redis / Upstash Cache',
      type: 'cache',
      provider: depNames.has('@upstash/redis') ? 'Upstash' : 'Redis',
      description: 'In-memory data structure store used for caching, rate-limiting, and queues',
      evidence: ['redis / @upstash/redis dependency detected'],
    });
  }

  if (depNames.has('better-sqlite3') || depNames.has('sqlite3') || allFilePathsLower.some((p) => p.endsWith('.sqlite') || p.endsWith('.db'))) {
    if (!storageSystems.some((s) => s.name.includes('D1'))) {
      storageSystems.push({
        name: 'SQLite Database',
        type: 'relational',
        provider: 'Embedded / Local',
        description: 'Serverless embedded relational SQL database engine',
        evidence: ['sqlite3 or .sqlite database files found'],
      });
    }
  }

  // ── 9. AUTH PROVIDERS ─────────────────────────────────────────────────────
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

  // ── 10. CLIENT-SIDE LOCAL STORAGE (Fallback if zero cloud services) ───────
  if (storageSystems.length === 0) {
    if (depNames.has('idb') || codeSample.includes('indexedDB') || codeSample.includes('localStorage')) {
      storageSystems.push({
        name: 'Browser IndexedDB / LocalStorage',
        type: 'local',
        provider: 'Client Sandbox',
        description: 'In-browser persistent client-side key-value and object store with 0 external network calls',
        evidence: ['idb dependency or IndexedDB/LocalStorage usage'],
      });
    }
  }

  const providersArray = Array.from(detectedProviders);

  return {
    hasCloudServices: services.length > 0,
    providers: providersArray,
    services,
    storageSystems,
    authProviders: Array.from(authProviders),
    serverlessRuntimes: Array.from(serverlessRuntimes),
  };
}
