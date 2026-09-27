import { RepoFile, RepoDependency } from '../types';

export type AppTypeCategory =
  | 'Model Training & AI / ML'
  | 'Web Application'
  | 'Mobile Application'
  | 'Desktop Software & GUI'
  | 'Backend API & Microservice'
  | 'CLI & Developer Tool'
  | 'Software Library & SDK'
  | 'Monorepo & Polyglot Workspace'
  | 'Game & Interactive Graphics'
  | 'Web3 & Smart Contracts'
  | 'Embedded & Systems Software'
  | 'Data Pipeline & ETL';

export interface AppTypeInfo {
  id: string;
  name: string;
  category: AppTypeCategory;
  badge: string;
  description: string;
  targetPlatforms: string[];
  executionPattern: string;
  confidence: 'High' | 'Medium' | 'Low';
  detectedIndicators: string[];
}

export interface AppTypeDetectionResult {
  primary: AppTypeInfo;
  secondary: AppTypeInfo[];
  allTypes: string[];
  isHybrid: boolean;
  ecosystemSummary: string;
}

/**
 * Universal Application Type & Architecture Archetype Detector
 *
 * Detects whether a repository is a Model Training / ML system, Web Application,
 * Mobile App, Desktop Software, Backend API, CLI Tool, Library, Monorepo, Game, or Web3 system.
 * Inspects file trees, dependencies, manifests, entry points, and domain heuristics.
 */
export function detectAppType(
  files: RepoFile[],
  fileContents: Map<string, string> = new Map(),
  dependencies: RepoDependency[] = []
): AppTypeDetectionResult {
  const paths = files.map((f) => f.path.toLowerCase());
  const pathSet = new Set(paths);
  const detectedList: AppTypeInfo[] = [];

  // Map dependencies for rapid lookup
  const depMap = new Map<string, string>();
  for (const d of dependencies) {
    depMap.set(d.name.toLowerCase(), d.version || 'detected');
  }

  // Also parse package.json, pyproject.toml, requirements.txt, or Cargo.toml if available
  const pkgContent = fileContents.get('package.json');
  if (pkgContent) {
    try {
      const parsed = JSON.parse(pkgContent);
      const allDeps = { ...parsed.dependencies, ...parsed.devDependencies };
      for (const [k, v] of Object.entries(allDeps)) {
        if (!depMap.has(k.toLowerCase())) {
          depMap.set(k.toLowerCase(), String(v).replace(/^[\^~>=]/, ''));
        }
      }
    } catch {
      // ignore
    }
  }

  const reqContent = fileContents.get('requirements.txt') || fileContents.get('requirements-dev.txt');
  if (reqContent) {
    const lines = reqContent.split('\n');
    for (const line of lines) {
      const trimmed = line.trim().split(/[=><~]/)[0].trim().toLowerCase();
      if (trimmed && !trimmed.startsWith('#')) {
        depMap.set(trimmed, 'python-dep');
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 1. MODEL TRAINING & MACHINE LEARNING / AI
  // ---------------------------------------------------------------------------
  const mlDeps = [
    'torch',
    'torchvision',
    'torchaudio',
    'tensorflow',
    'keras',
    'jax',
    'flax',
    'transformers',
    'huggingface_hub',
    'datasets',
    'accelerate',
    'deepspeed',
    'scikit-learn',
    'sklearn',
    'xgboost',
    'lightgbm',
    'catboost',
    'optuna',
    'wandb',
    'mlflow',
    'langchain',
    'llamaindex',
    'ollama',
    'openai',
    'diffusers',
    'timm',
    'lightning',
    'pytorch-lightning',
  ];
  const detectedMlDeps = mlDeps.filter((d) => depMap.has(d));
  const hasJupyter = paths.some((p) => p.endsWith('.ipynb'));
  const hasModelDirs = paths.some((p) =>
    /(?:^|\/)(models|weights|checkpoints|datasets|training|experiments|embeddings)\//i.test(p)
  );
  const hasTrainScript = paths.some((p) =>
    /(?:train|training|finetune|eval|evaluate|inference|predict|dataset|model)\.(py|ipynb|sh)/i.test(p)
  );
  const hasModelWeights = paths.some((p) =>
    /\.(pt|pth|onnx|safetensors|bin|h5|ckpt|tflite)$/i.test(p)
  );

  const mlIndicators: string[] = [];
  if (detectedMlDeps.length > 0) mlIndicators.push(`Frameworks: ${detectedMlDeps.slice(0, 4).join(', ')}`);
  if (hasTrainScript) mlIndicators.push('Training & Evaluation Pipeline Scripts');
  if (hasModelDirs) mlIndicators.push('Model Checkpoint & Dataset Directories');
  if (hasJupyter) mlIndicators.push('Jupyter Notebook Workflows (.ipynb)');
  if (hasModelWeights) mlIndicators.push('Trained Model Artifacts (.pt, .safetensors, .onnx)');

  if (detectedMlDeps.length > 0 || (hasTrainScript && (hasModelDirs || hasJupyter || hasModelWeights))) {
    detectedList.push({
      id: 'ml_training',
      name: 'Model Training & Machine Learning',
      category: 'Model Training & AI / ML',
      badge: 'ML / Deep Learning',
      description:
        'Machine learning, neural network architecture, data preparation, and model training/fine-tuning repository.',
      targetPlatforms: ['CUDA / GPU Clusters', 'Python Runtime', 'HPC Cloud (Torch / JAX)', 'Local Model Inference'],
      executionPattern: 'Epoch Iteration, Gradient Backpropagation & Distributed GPU Inference',
      confidence: detectedMlDeps.length >= 2 || hasModelWeights ? 'High' : 'Medium',
      detectedIndicators: mlIndicators,
    });
  }

  // ---------------------------------------------------------------------------
  // 2. MOBILE APPLICATION
  // ---------------------------------------------------------------------------
  const hasFlutter =
    depMap.has('flutter') ||
    paths.some((p) => p === 'pubspec.yaml' || p.endsWith('/pubspec.yaml') || p === 'lib/main.dart' || p.startsWith('lib/'));
  const hasReactNative = depMap.has('react-native') || depMap.has('expo') || paths.some((p) => p.includes('app.json') && (fileContents.get(p) || '').includes('expo'));
  const hasNativeIos = paths.some((p) => p.includes('ios/') || p.endsWith('.xcodeproj') || p.endsWith('.xcworkspace') || p.endsWith('.swift'));
  const hasNativeAndroid = paths.some((p) => p.includes('android/') || p.endsWith('androidmanifest.xml') || (p.endsWith('.kt') && paths.some((x) => x.includes('android'))));
  const hasCapacitor = depMap.has('@capacitor/core') || depMap.has('@ionic/react') || depMap.has('@ionic/vue');

  const mobileIndicators: string[] = [];
  if (hasFlutter) mobileIndicators.push('Flutter Multi-Platform SDK');
  if (hasReactNative) mobileIndicators.push('React Native / Expo Engine');
  if (hasNativeIos) mobileIndicators.push('iOS Native Project Files');
  if (hasNativeAndroid) mobileIndicators.push('Android Native Project Files');
  if (hasCapacitor) mobileIndicators.push('Capacitor / Ionic Hybrid Bridge');

  if (hasFlutter || hasReactNative || (hasNativeIos && hasNativeAndroid) || hasCapacitor) {
    detectedList.push({
      id: 'mobile_app',
      name: 'Mobile Application',
      category: 'Mobile Application',
      badge: hasFlutter ? 'Flutter Mobile' : hasReactNative ? 'React Native' : 'Native Mobile',
      description:
        'Touch-first mobile client engineered for iOS and Android devices with hardware integration and responsive view controllers.',
      targetPlatforms: ['Apple iOS (App Store)', 'Google Android (Play Store)', 'Mobile Tablets & Devices'],
      executionPattern: 'Touch Gesture Event Loop & Native Platform Bridge',
      confidence: 'High',
      detectedIndicators: mobileIndicators,
    });
  }

  // ---------------------------------------------------------------------------
  // 3. DESKTOP SOFTWARE & GUI APPLICATION
  // ---------------------------------------------------------------------------
  const hasElectron = depMap.has('electron') || depMap.has('@electron/remote') || paths.some((p) => p.includes('electron'));
  const hasTauri = depMap.has('@tauri-apps/api') || paths.some((p) => p.includes('src-tauri') || p.includes('tauri.conf.json'));
  const hasWails = paths.some((p) => p.includes('wails.json'));
  const hasPyQt = depMap.has('pyqt5') || depMap.has('pyqt6') || depMap.has('pyside2') || depMap.has('pyside6') || depMap.has('tkinter');
  const hasDesktopFlutter = hasFlutter && paths.some((p) => p.includes('macos/') || p.includes('windows/') || p.includes('linux/'));

  const desktopIndicators: string[] = [];
  if (hasElectron) desktopIndicators.push('Electron Chromium Shell');
  if (hasTauri) desktopIndicators.push('Tauri Rust Native WebView');
  if (hasWails) desktopIndicators.push('Wails Go Desktop Bridge');
  if (hasPyQt) desktopIndicators.push('Qt / Python Desktop Windowing');
  if (hasDesktopFlutter) desktopIndicators.push('Flutter Native Desktop Runners');

  if (hasElectron || hasTauri || hasWails || hasPyQt || (hasDesktopFlutter && !hasNativeIos)) {
    detectedList.push({
      id: 'desktop_software',
      name: 'Desktop Software & GUI',
      category: 'Desktop Software & GUI',
      badge: hasTauri ? 'Tauri Desktop' : hasElectron ? 'Electron App' : 'Native Desktop',
      description:
        'Cross-platform desktop application packaging native OS windowing, system tray, menus, and low-level filesystem access.',
      targetPlatforms: ['macOS (Universal)', 'Microsoft Windows (x64/ARM)', 'Linux Desktop (AppImage/deb/rpm)'],
      executionPattern: 'Native Windowing Event Loop & OS Interprocess Communication (IPC)',
      confidence: 'High',
      detectedIndicators: desktopIndicators,
    });
  }

  // ---------------------------------------------------------------------------
  // 4. WEB APPLICATION (SPA, SSR, Jamstack, Fullstack)
  // ---------------------------------------------------------------------------
  const hasWebFramework =
    depMap.has('react') ||
    depMap.has('vue') ||
    depMap.has('angular') ||
    depMap.has('@angular/core') ||
    depMap.has('svelte') ||
    depMap.has('next') ||
    depMap.has('nuxt') ||
    depMap.has('astro') ||
    depMap.has('@remix-run/react') ||
    depMap.has('vite');
  const hasHtmlEntry = paths.some((p) => p.endsWith('.html'));
  const hasUiComponents = files.filter((f) => f.category === 'component').length >= 3;

  const webIndicators: string[] = [];
  if (depMap.has('next')) webIndicators.push('Next.js Fullstack Engine');
  else if (depMap.has('react')) webIndicators.push('React Declarative Component Tree');
  else if (depMap.has('vue')) webIndicators.push('Vue 3 Reactive UI');
  else if (depMap.has('svelte')) webIndicators.push('Svelte Reactive Compiler');
  if (hasHtmlEntry) webIndicators.push('Browser Document Root (index.html)');
  if (hasUiComponents) webIndicators.push('Modular Component Architecture');

  if ((hasWebFramework || hasHtmlEntry) && !hasReactNative && !hasFlutter) {
    const isFullStack = depMap.has('next') || depMap.has('nuxt') || depMap.has('@remix-run/react') || depMap.has('express') || depMap.has('fastify');
    detectedList.push({
      id: 'web_app',
      name: isFullStack ? 'Full-Stack Web Application' : 'Web Application (SPA)',
      category: 'Web Application',
      badge: isFullStack ? 'Full-Stack Web' : 'Web SPA',
      description:
        'Interactive web application delivering dynamic UI, client-side routing, and responsive browser experiences.',
      targetPlatforms: ['Modern Web Browsers (Chrome, Safari, Firefox, Edge)', 'Edge CDN', 'Mobile Web'],
      executionPattern: 'Virtual DOM / Reactive State Hydration & Client-Side Navigation',
      confidence: 'High',
      detectedIndicators: webIndicators,
    });
  }

  // ---------------------------------------------------------------------------
  // 5. BACKEND API & MICROSERVICE
  // ---------------------------------------------------------------------------
  const hasBackend =
    depMap.has('express') ||
    depMap.has('@nestjs/core') ||
    depMap.has('fastify') ||
    depMap.has('hono') ||
    depMap.has('fastapi') ||
    depMap.has('flask') ||
    depMap.has('django') ||
    depMap.has('gin-gonic/gin') ||
    depMap.has('actix-web') ||
    depMap.has('axum') ||
    depMap.has('spring-boot') ||
    paths.some((p) => p.includes('api/') || p.includes('routes/') || p.includes('controllers/'));

  const backendIndicators: string[] = [];
  if (depMap.has('fastapi')) backendIndicators.push('FastAPI Asynchronous Engine');
  if (depMap.has('express')) backendIndicators.push('Express HTTP Middleware Pipeline');
  if (depMap.has('@nestjs/core')) backendIndicators.push('NestJS Modular Dependency Injection');
  if (paths.some((p) => /routes|controllers|endpoints/i.test(p))) backendIndicators.push('Structured Route Handlers');

  if (hasBackend && !detectedList.some((d) => d.id === 'web_app' && d.badge.includes('Full-Stack'))) {
    detectedList.push({
      id: 'backend_api',
      name: 'Backend API & Microservice',
      category: 'Backend API & Microservice',
      badge: 'API & Microservice',
      description:
        'Server-side service handling HTTP/REST/GraphQL requests, business logic, authentication, and database transactions.',
      targetPlatforms: ['Docker Container', 'Kubernetes / Cloud Server', 'Serverless Functions'],
      executionPattern: 'HTTP Request Pipeline & Database Persistence',
      confidence: 'High',
      detectedIndicators: backendIndicators,
    });
  }

  // ---------------------------------------------------------------------------
  // 6. CLI TOOL & DEVELOPER UTILITY
  // ---------------------------------------------------------------------------
  const hasCliDeps =
    depMap.has('commander') ||
    depMap.has('yargs') ||
    depMap.has('meow') ||
    depMap.has('clap') ||
    depMap.has('cobra') ||
    depMap.has('click') ||
    depMap.has('argparse') ||
    depMap.has('chalk') ||
    depMap.has('ora');
  const hasBinField = pkgContent && pkgContent.includes('"bin"');
  const hasBinDir = paths.some((p) => p.startsWith('bin/') || p.includes('/bin/'));

  const cliIndicators: string[] = [];
  if (hasCliDeps) cliIndicators.push('CLI Argument Parser Library');
  if (hasBinField) cliIndicators.push('package.json "bin" executable field');
  if (hasBinDir) cliIndicators.push('Executable scripts directory (bin/)');

  if (hasCliDeps || hasBinField || hasBinDir) {
    detectedList.push({
      id: 'cli_tool',
      name: 'CLI Tool & Developer Utility',
      category: 'CLI & Developer Tool',
      badge: 'Terminal CLI',
      description:
        'Command-line executable or automation utility providing terminal flags, commands, and interactive developer workflows.',
      targetPlatforms: ['POSIX Terminal (bash, zsh)', 'Windows PowerShell / CMD', 'CI/CD Automation Runners'],
      executionPattern: 'Command-Line Flag Parsing & Exit Code Synchronization',
      confidence: hasBinField ? 'High' : 'Medium',
      detectedIndicators: cliIndicators,
    });
  }

  // ---------------------------------------------------------------------------
  // 7. MONOREPO & MULTI-PACKAGE WORKSPACE
  // ---------------------------------------------------------------------------
  const hasWorkspaces =
    (pkgContent && pkgContent.includes('"workspaces"')) ||
    pathSet.has('pnpm-workspace.yaml') ||
    pathSet.has('lerna.json') ||
    pathSet.has('turbo.json') ||
    pathSet.has('nx.json');
  const hasPackagesDir = paths.some((p) => p.startsWith('packages/') || p.startsWith('apps/'));

  if (hasWorkspaces || hasPackagesDir) {
    detectedList.push({
      id: 'monorepo',
      name: 'Monorepo Workspace',
      category: 'Monorepo & Polyglot Workspace',
      badge: 'Monorepo',
      description:
        'Unified repository containing multiple coordinated packages, applications, shared libraries, and tools.',
      targetPlatforms: ['Multi-Project Workspace', 'Turborepo / Nx / pnpm Build System'],
      executionPattern: 'Coordinated Inter-Package Linkage & Dependency Graph Caching',
      confidence: 'High',
      detectedIndicators: ['Workspace Configuration File', 'Packages / Apps Directory Structure'],
    });
  }

  // ---------------------------------------------------------------------------
  // 8. GAME & INTERACTIVE GRAPHICS
  // ---------------------------------------------------------------------------
  const hasGameDeps =
    depMap.has('three') ||
    depMap.has('@react-three/fiber') ||
    depMap.has('pixi.js') ||
    depMap.has('phaser') ||
    depMap.has('babylonjs') ||
    depMap.has('pygame') ||
    paths.some((p) => p.endsWith('.shader') || p.endsWith('.glsl') || p.endsWith('.gltf'));

  if (hasGameDeps) {
    detectedList.push({
      id: 'game_graphics',
      name: 'Game & Interactive 3D Graphics',
      category: 'Game & Interactive Graphics',
      badge: '3D Graphics / Game',
      description:
        'Interactive 3D simulation, WebGL/WebGPU graphics renderer, or browser game engine.',
      targetPlatforms: ['WebGL / WebGPU Hardware Accelerated Canvas', 'Interactive 3D Viewport'],
      executionPattern: '60fps RequestAnimationFrame Render Loop & Shader Computations',
      confidence: 'High',
      detectedIndicators: ['Graphics / Shader Engine Dependencies'],
    });
  }

  // ---------------------------------------------------------------------------
  // 9. WEB3 & SMART CONTRACTS
  // ---------------------------------------------------------------------------
  const hasSolidity = paths.some((p) => p.endsWith('.sol'));
  const hasWeb3Deps = depMap.has('ethers') || depMap.has('web3') || depMap.has('hardhat') || depMap.has('@wagmi/core') || depMap.has('viem');

  if (hasSolidity || hasWeb3Deps) {
    detectedList.push({
      id: 'web3',
      name: 'Web3 & Smart Contract System',
      category: 'Web3 & Smart Contracts',
      badge: 'Smart Contracts / Web3',
      description:
        'Decentralized application protocol, Ethereum/Solana smart contracts, and blockchain state management.',
      targetPlatforms: ['Ethereum Virtual Machine (EVM)', 'Decentralized Networks (IPFS/RPC)'],
      executionPattern: 'Cryptographic Transaction Signing & On-Chain State Mutations',
      confidence: 'High',
      detectedIndicators: hasSolidity ? ['Solidity (.sol) Contract Sources'] : ['Web3 SDKs'],
    });
  }

  // ---------------------------------------------------------------------------
  // 10. SOFTWARE LIBRARY & SDK (Fallback when not a standalone app)
  // ---------------------------------------------------------------------------
  if (detectedList.length === 0) {
    const isLibrary =
      paths.some((p) => p.endsWith('index.ts') || p.endsWith('index.js') || p.endsWith('mod.rs') || p.endsWith('lib.rs')) ||
      (pkgContent && (pkgContent.includes('"main"') || pkgContent.includes('"exports"')));

    detectedList.push({
      id: 'software_library',
      name: isLibrary ? 'Software Library & SDK' : 'Software Application',
      category: isLibrary ? 'Software Library & SDK' : 'Software Library & SDK',
      badge: isLibrary ? 'Library / SDK' : 'Software Project',
      description:
        'Reusable software modules, domain algorithms, or software development kit intended for integration into other applications.',
      targetPlatforms: ['Package Distribution (npm / PyPI / Crates.io)', 'Universal Runtime'],
      executionPattern: 'Modular Class & Function Exports',
      confidence: 'Medium',
      detectedIndicators: ['Module Export Signatures & Config Manifests'],
    });
  }

  const primary = detectedList[0];
  const secondary = detectedList.slice(1);
  const isHybrid = secondary.length > 0;

  const ecosystemSummary = isHybrid
    ? `Hybrid Architecture: ${primary.name} combined with ${secondary.map((s) => s.name).join(', ')}`
    : `${primary.name} (${primary.targetPlatforms.slice(0, 2).join(', ')})`;

  return {
    primary,
    secondary,
    allTypes: detectedList.map((d) => d.name),
    isHybrid,
    ecosystemSummary,
  };
}
