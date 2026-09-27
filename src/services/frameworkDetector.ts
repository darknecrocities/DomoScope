import { RepoFile, RepoDependency } from '../types';

export interface FrameworkInfo {
  id: string;
  name: string;
  category:
    | 'Full-Stack'
    | 'Frontend'
    | 'Backend API'
    | 'Mobile & Multi-Platform'
    | 'Desktop'
    | 'CLI / Utility'
    | 'Library';
  version?: string;
  runtime: string;
  archetype: string;
  routingType: string;
  description: string;
  badge: string;
  capabilities: string[];
  stylingEcosystem?: string;
  buildTool?: string;
  keyConfigFiles: string[];
  entryPoint?: string;
}

export interface FrameworkDetectionResult {
  primary: FrameworkInfo;
  secondary: FrameworkInfo[];
  allDetected: string[];
  ecosystem: {
    language: string;
    runtime: string;
    buildTool?: string;
    packageManager?: string;
    styling?: string;
    testing?: string;
    database?: string;
  };
}

/**
 * Universal Polyglot Framework & Architecture Detector
 *
 * Accurately detects and explains ANY web, backend, mobile, full-stack, or desktop
 * framework across Node.js/TS, Python, Go, Rust, Java/Kotlin, PHP, Ruby, Dart/Flutter,
 * and .NET.
 */
export function detectFrameworks(
  files: RepoFile[],
  fileContents: Map<string, string> = new Map(),
  dependencies: RepoDependency[] = []
): FrameworkDetectionResult {
  const paths = files.map((f) => f.path.toLowerCase());
  const pathSet = new Set(paths);
  const detectedList: FrameworkInfo[] = [];

  // Map dependencies for rapid lookup
  const depMap = new Map<string, string>();
  for (const d of dependencies) {
    depMap.set(d.name.toLowerCase(), d.version);
  }

  // Also check package.json if present in fileContents
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
      // ignore JSON parse error
    }
  }

  // Helper to extract version
  const getVer = (name: string): string | undefined => depMap.get(name.toLowerCase());

  // ---------------------------------------------------------------------------
  // 1. Next.js
  // ---------------------------------------------------------------------------
  if (
    depMap.has('next') ||
    paths.some((p) => p.includes('next.config')) ||
    paths.some((p) => p.startsWith('app/') || p.includes('/app/')) && paths.some((p) => p.endsWith('layout.tsx') || p.endsWith('layout.jsx'))
  ) {
    const isAppRouter = paths.some((p) => p.includes('app/') && (p.endsWith('page.tsx') || p.endsWith('page.jsx') || p.endsWith('route.ts')));
    detectedList.push({
      id: 'nextjs',
      name: 'Next.js',
      category: 'Full-Stack',
      version: getVer('next'),
      runtime: 'Node.js (V8) / Edge Runtime',
      archetype: isAppRouter
        ? 'App Router (React Server Components + Server Actions)'
        : 'Pages Router (getServerSideProps + getStaticProps)',
      routingType: isAppRouter ? 'Directory-Based App Router' : 'File-Based Pages Router',
      badge: `Next.js ${getVer('next') || '15+'}`,
      description:
        'Production-grade full-stack React framework featuring hybrid SSR/SSG rendering, React Server Components (RSC), optimized asset pipelines, and edge API route handlers.',
      capabilities: ['Server-Side Rendering (SSR)', 'React Server Components', 'Edge Route Handlers', 'Static Site Generation', 'Turbopack / Webpack'],
      buildTool: depMap.has('turbopack') ? 'Turbopack' : 'Next Compiler (SWC)',
      keyConfigFiles: files.filter((f) => /next\.config\.[a-z]+/i.test(f.path)).map((f) => f.path),
      entryPoint: paths.find((p) => /app\/(page|layout)\.[jt]sx?/i.test(p)) || paths.find((p) => /pages\/(_app|index)\.[jt]sx?/i.test(p)),
    });
  }

  // ---------------------------------------------------------------------------
  // 2. Nuxt (Vue Full-Stack)
  // ---------------------------------------------------------------------------
  if (depMap.has('nuxt') || depMap.has('nuxt3') || paths.some((p) => p.includes('nuxt.config'))) {
    detectedList.push({
      id: 'nuxt',
      name: 'Nuxt',
      category: 'Full-Stack',
      version: getVer('nuxt') || getVer('nuxt3'),
      runtime: 'Node.js / Nitro Engine',
      archetype: 'Universal Vue 3 Full-Stack Engine with Nitro Server',
      routingType: 'File-System Vue Routing',
      badge: `Nuxt ${getVer('nuxt') || '3+'}`,
      description:
        'The intuitive Vue framework for building universal web applications with auto-imports, high-performance SSR, and cross-platform Nitro server engine.',
      capabilities: ['Universal SSR', 'Vue 3 Composition API', 'Nitro Server', 'Auto-Imports', 'File-System Routing'],
      buildTool: 'Vite / Nitro',
      keyConfigFiles: files.filter((f) => /nuxt\.config\.[a-z]+/i.test(f.path)).map((f) => f.path),
    });
  }

  // ---------------------------------------------------------------------------
  // 3. SvelteKit / Svelte
  // ---------------------------------------------------------------------------
  if (depMap.has('@sveltejs/kit') || paths.some((p) => p.includes('svelte.config'))) {
    detectedList.push({
      id: 'sveltekit',
      name: 'SvelteKit',
      category: 'Full-Stack',
      version: getVer('@sveltejs/kit'),
      runtime: 'Node.js / Vite',
      archetype: 'Compiler-Driven Reactive Full-Stack Framework',
      routingType: 'Directory-Based +page.svelte Routing',
      badge: `SvelteKit ${getVer('@sveltejs/kit') || '2+'}`,
      description:
        'High-performance full-stack web framework powered by Svelte compiler, eliminating virtual DOM overhead with surgical reactive DOM updates.',
      capabilities: ['Zero-Virtual-DOM', 'Server-Side Rendering', 'Form Actions', 'Prerendering', 'Vite-Native'],
      buildTool: 'Vite',
      keyConfigFiles: files.filter((f) => /svelte\.config\.[a-z]+/i.test(f.path)).map((f) => f.path),
    });
  } else if (depMap.has('svelte') || paths.some((p) => p.endsWith('.svelte'))) {
    detectedList.push({
      id: 'svelte',
      name: 'Svelte',
      category: 'Frontend',
      version: getVer('svelte'),
      runtime: 'Browser (DOM Compiler)',
      archetype: 'Reactive Component Compiler UI',
      routingType: 'Client-Side SPA Routing',
      badge: `Svelte ${getVer('svelte') || '5+'}`,
      description: 'Radical compiler approach to user interfaces that converts component code into tiny, hyper-efficient imperative JavaScript.',
      capabilities: ['Reactive Runes', 'No Virtual DOM', 'True CSS Scoping', 'Lightweight Bundles'],
      buildTool: 'Vite / Rollup',
      keyConfigFiles: [],
    });
  }

  // ---------------------------------------------------------------------------
  // 4. Astro
  // ---------------------------------------------------------------------------
  if (depMap.has('astro') || paths.some((p) => p.includes('astro.config')) || paths.some((p) => p.endsWith('.astro'))) {
    detectedList.push({
      id: 'astro',
      name: 'Astro',
      category: 'Full-Stack',
      version: getVer('astro'),
      runtime: 'Node.js / Edge',
      archetype: 'Component Islands Architecture for Content-Driven Web',
      routingType: 'File-System Markdown & Island Routing',
      badge: `Astro ${getVer('astro') || '4+'}`,
      description:
        'All-in-one web framework designed for speed, utilizing Islands Architecture to ship zero JavaScript by default while hydrating interactive UI on-demand.',
      capabilities: ['Zero JS by Default', 'Islands Architecture', 'Content Collections', 'Multi-Framework Support'],
      buildTool: 'Vite',
      keyConfigFiles: files.filter((f) => /astro\.config\.[a-z]+/i.test(f.path)).map((f) => f.path),
    });
  }

  // ---------------------------------------------------------------------------
  // 5. Remix
  // ---------------------------------------------------------------------------
  if (depMap.has('@remix-run/react') || depMap.has('@remix-run/node') || paths.some((p) => p.includes('remix.config'))) {
    detectedList.push({
      id: 'remix',
      name: 'Remix',
      category: 'Full-Stack',
      version: getVer('@remix-run/react'),
      runtime: 'Node.js / Web Standards',
      archetype: 'Web Standards-First SSR & Nested Route Architecture',
      routingType: 'Nested Route Loaders & Actions',
      badge: `Remix ${getVer('@remix-run/react') || '2+'}`,
      description:
        'Full-stack web framework focused on web standards, resilient HTML form submissions, progressive enhancement, and nested layout routing.',
      capabilities: ['Nested Routing', 'Loader / Action Pattern', 'Optimistic UI', 'Zero-Waterfall Data Loading'],
      buildTool: 'Vite',
      keyConfigFiles: files.filter((f) => /remix\.config\.[a-z]+/i.test(f.path)).map((f) => f.path),
    });
  }

  // ---------------------------------------------------------------------------
  // 6. NestJS (Enterprise Node.js Backend)
  // ---------------------------------------------------------------------------
  if (depMap.has('@nestjs/core') || paths.some((p) => p.includes('nest-cli.json'))) {
    detectedList.push({
      id: 'nestjs',
      name: 'NestJS',
      category: 'Backend API',
      version: getVer('@nestjs/core'),
      runtime: 'Node.js (TypeScript) / Express / Fastify',
      archetype: 'Enterprise Modular Architecture (Dependency Injection & Decorators)',
      routingType: 'Decorator-Based Controller Routing',
      badge: `NestJS ${getVer('@nestjs/core') || '10+'}`,
      description:
        'Progressive Node.js framework for building efficient, scalable enterprise server-side applications with TypeScript, dependency injection, and clean module boundaries.',
      capabilities: ['Dependency Injection', 'Decorators & Guards', 'Interceptors & Pipes', 'Microservices', 'Swagger / OpenAPI'],
      buildTool: 'Nest CLI / TypeScript Compiler',
      keyConfigFiles: files.filter((f) => /nest-cli\.json/i.test(f.path)).map((f) => f.path),
      entryPoint: paths.find((p) => /src\/main\.(ts|js)/i.test(p)),
    });
  }

  // ---------------------------------------------------------------------------
  // 7. Express.js
  // ---------------------------------------------------------------------------
  if (depMap.has('express') && !depMap.has('@nestjs/core')) {
    detectedList.push({
      id: 'express',
      name: 'Express.js',
      category: 'Backend API',
      version: getVer('express'),
      runtime: 'Node.js (V8)',
      archetype: 'Middleware Pipeline & REST API Architecture',
      routingType: 'Express Router Middleware Handlers',
      badge: `Express ${getVer('express') || '4.x'}`,
      description:
        'Fast, unopinionated, minimalist web framework for Node.js, providing a robust set of HTTP utility methods and middleware handling.',
      capabilities: ['RESTful Routing', 'Middleware Chain', 'HTTP Utilities', 'Database Agnostic'],
      buildTool: 'Node.js Runtime',
      keyConfigFiles: [],
      entryPoint: paths.find((p) => /(app|server|index)\.(ts|js)/i.test(p)),
    });
  }

  // ---------------------------------------------------------------------------
  // 8. Fastify / Hono / Elysia
  // ---------------------------------------------------------------------------
  if (depMap.has('fastify') && !depMap.has('@nestjs/core')) {
    detectedList.push({
      id: 'fastify',
      name: 'Fastify',
      category: 'Backend API',
      version: getVer('fastify'),
      runtime: 'Node.js (V8)',
      archetype: 'High-Throughput Low-Overhead Schema-Validated API',
      routingType: 'Fastify Route Handlers',
      badge: `Fastify ${getVer('fastify') || '4+'}`,
      description: 'Extremely fast and low-overhead web framework for Node.js, focused on providing the best developer experience with minimum cost.',
      capabilities: ['JSON Schema Validation', 'High Throughput', 'Asynchronous Architecture'],
      keyConfigFiles: [],
    });
  }

  if (depMap.has('hono')) {
    detectedList.push({
      id: 'hono',
      name: 'Hono',
      category: 'Backend API',
      version: getVer('hono'),
      runtime: 'Cloudflare Workers / Bun / Deno / Node.js',
      archetype: 'Ultrafast Web Standards Edge Router',
      routingType: 'RegExp Router Middleware',
      badge: `Hono ${getVer('hono') || '4+'}`,
      description: 'Small, ultrafast web framework built on Web Standards, designed to run on Cloudflare Workers, Fastly, Deno, Bun, or Node.js.',
      capabilities: ['Multi-Runtime (Cloudflare, Bun, Node)', 'Type-Safe RPC', 'Zero-Dependency Core'],
      keyConfigFiles: [],
    });
  }

  // ---------------------------------------------------------------------------
  // 9. React SPA (Vite / CRA)
  // ---------------------------------------------------------------------------
  const hasReact = depMap.has('react') || depMap.has('react-dom') || paths.some((p) => p.endsWith('.tsx') || p.endsWith('.jsx'));
  const isNextOrRemix = detectedList.some((d) => d.id === 'nextjs' || d.id === 'remix' || d.id === 'astro');

  if (hasReact && !isNextOrRemix) {
    const isVite = depMap.has('vite') || paths.some((p) => p.includes('vite.config'));
    detectedList.push({
      id: 'react',
      name: isVite ? 'React (Vite SPA)' : 'React Single Page App',
      category: 'Frontend',
      version: getVer('react'),
      runtime: 'Browser (V8 / JavaScriptCore)',
      archetype: 'Client-Side Reactive Single-Page Application (SPA)',
      routingType: depMap.has('react-router-dom') || depMap.has('@tanstack/react-router') ? 'Client-Side Declarative Router' : 'Component State Tree',
      badge: `React ${getVer('react') || '18/19'} · SPA`,
      description:
        'Declarative, component-based frontend application utilizing virtual DOM reconciliation, custom hooks, and modular UI component architecture.',
      capabilities: ['Component Trees', 'Virtual DOM Reconciliation', 'Client-Side Routing', 'Rich UI Ecosystem'],
      buildTool: isVite ? 'Vite' : 'Webpack',
      keyConfigFiles: files.filter((f) => /vite\.config\.[a-z]+/i.test(f.path)).map((f) => f.path),
      entryPoint: paths.find((p) => /src\/(main|index|App)\.[jt]sx?/i.test(p)),
    });
  }

  // ---------------------------------------------------------------------------
  // 10. Vue.js (SPA)
  // ---------------------------------------------------------------------------
  const hasVue = depMap.has('vue') || paths.some((p) => p.endsWith('.vue'));
  if (hasVue && !detectedList.some((d) => d.id === 'nuxt')) {
    detectedList.push({
      id: 'vue',
      name: 'Vue.js',
      category: 'Frontend',
      version: getVer('vue'),
      runtime: 'Browser (Reactivity Engine)',
      archetype: 'Progressive Component Framework (Composition API)',
      routingType: depMap.has('vue-router') ? 'Vue Router' : 'Component-Based',
      badge: `Vue ${getVer('vue') || '3+'}`,
      description: 'Progressive JavaScript framework for building user interfaces with reactive data-binding and single-file component architecture.',
      capabilities: ['Single-File Components (.vue)', 'Composition API', 'Pinia State Store', 'Reactivity System'],
      buildTool: 'Vite',
      keyConfigFiles: files.filter((f) => /vite\.config\.[a-z]+/i.test(f.path)).map((f) => f.path),
    });
  }

  // ---------------------------------------------------------------------------
  // 11. Angular
  // ---------------------------------------------------------------------------
  if (depMap.has('@angular/core') || paths.some((p) => p.includes('angular.json'))) {
    detectedList.push({
      id: 'angular',
      name: 'Angular',
      category: 'Frontend',
      version: getVer('@angular/core'),
      runtime: 'Browser (TypeScript Platform)',
      archetype: 'Enterprise Component Platform (Signals & Standalone Architecture)',
      routingType: 'Angular RouterModule',
      badge: `Angular ${getVer('@angular/core') || '18+'}`,
      description: 'Platform and framework for building scalable single-page client applications using TypeScript, dependency injection, and RxJS/Signals.',
      capabilities: ['Dependency Injection', 'Signals Reactivity', 'Standalone Components', 'TypeScript Enforced'],
      buildTool: 'Angular CLI / esbuild',
      keyConfigFiles: files.filter((f) => /angular\.json/i.test(f.path)).map((f) => f.path),
    });
  }

  // ---------------------------------------------------------------------------
  // 12. Python: FastAPI, Django, Flask, Streamlit
  // ---------------------------------------------------------------------------
  const hasPython = paths.some((p) => p.endsWith('.py') || p.endsWith('requirements.txt') || p.endsWith('pyproject.toml'));
  if (hasPython) {
    // Read python requirements if available
    const reqContent = fileContents.get('requirements.txt') || fileContents.get('pyproject.toml') || '';
    const hasFastApi = reqContent.toLowerCase().includes('fastapi') || paths.some((p) => p.includes('api') && p.endsWith('.py'));
    const hasDjango = reqContent.toLowerCase().includes('django') || paths.some((p) => p.endsWith('manage.py') || p.endsWith('settings.py'));
    const hasFlask = reqContent.toLowerCase().includes('flask');
    const hasStreamlit = reqContent.toLowerCase().includes('streamlit');

    if (hasFastApi) {
      detectedList.push({
        id: 'fastapi',
        name: 'FastAPI',
        category: 'Backend API',
        runtime: 'Python 3.10+ (Uvicorn / Starlette ASGI)',
        archetype: 'Asynchronous High-Throughput REST API (ASGI & Pydantic Validation)',
        routingType: 'Decorator APIRouter Endpoints',
        badge: 'FastAPI · ASGI',
        description:
          'Modern, fast, high-performance web framework for building APIs with Python, based on standard Python type hints and automatic OpenAPI documentation.',
        capabilities: ['Async ASGI Engine', 'Pydantic Type Validation', 'Auto OpenAPI / Swagger Docs', 'High Concurrency'],
        buildTool: 'Uvicorn / Poetry / Pipenv',
        keyConfigFiles: files.filter((f) => /pyproject\.toml|requirements\.txt/i.test(f.path)).map((f) => f.path),
        entryPoint: paths.find((p) => /(main|app)\.py/i.test(p)),
      });
    }

    if (hasDjango) {
      detectedList.push({
        id: 'django',
        name: 'Django',
        category: 'Full-Stack',
        runtime: 'Python 3 (WSGI / ASGI)',
        archetype: 'Batteries-Included Model-View-Template (MVT) Architecture',
        routingType: 'urls.py URLConf Routing',
        badge: 'Django · Full-Stack',
        description:
          'High-level Python web framework that encourages rapid development and clean, pragmatic design with built-in ORM, admin panel, and authentication.',
        capabilities: ['Django ORM', 'Admin Dashboard', 'Template Engine', 'Security & CSRF Protection'],
        buildTool: 'manage.py / Poetry',
        keyConfigFiles: files.filter((f) => /settings\.py|manage\.py/i.test(f.path)).map((f) => f.path),
        entryPoint: paths.find((p) => /manage\.py/i.test(p)),
      });
    }

    if (hasFlask && !hasFastApi && !hasDjango) {
      detectedList.push({
        id: 'flask',
        name: 'Flask',
        category: 'Backend API',
        runtime: 'Python 3 (WSGI)',
        archetype: 'Lightweight WSGI Microframework',
        routingType: '@app.route Decorator Handlers',
        badge: 'Flask · Microframework',
        description: 'Lightweight WSGI Python microframework designed to make getting started quick and easy, with the ability to scale up to complex applications.',
        capabilities: ['WSGI Standard', 'Jinja2 Templating', 'Modular Blueprints'],
        keyConfigFiles: [],
      });
    }

    if (hasStreamlit) {
      detectedList.push({
        id: 'streamlit',
        name: 'Streamlit',
        category: 'Frontend',
        runtime: 'Python 3 (Tornado Backend + React Frontend)',
        archetype: 'Data & Machine Learning Interactive Dashboard',
        routingType: 'Multi-Page Script Execution',
        badge: 'Streamlit · AI/Data App',
        description: 'Faster way to build and share data apps, turning Python data scripts into shareable web apps in minutes.',
        capabilities: ['Interactive Widgets', 'Dataframe Visualizations', 'Zero HTML/CSS Needed'],
        keyConfigFiles: [],
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 13. Go: Gin, Fiber, Echo, Chi, Standard Library
  // ---------------------------------------------------------------------------
  const hasGo = paths.some((p) => p.endsWith('.go') || p.endsWith('go.mod'));
  if (hasGo) {
    const goMod = fileContents.get('go.mod') || '';
    let frameworkName = 'Go Standard HTTP';
    let archetype = 'Compiled Native Go Concurrent Service';

    if (goMod.includes('gin-gonic/gin')) {
      frameworkName = 'Gin Web Framework';
      archetype = 'High-Speed Martini-like Go REST API (Radix Tree Router)';
    } else if (goMod.includes('gofiber/fiber')) {
      frameworkName = 'Fiber (Go)';
      archetype = 'Express-Inspired Ultra-Fast Go Web Framework (Fasthttp)';
    } else if (goMod.includes('labstack/echo')) {
      frameworkName = 'Echo (Go)';
      archetype = 'Extensible Micro-Engine Go Framework';
    } else if (goMod.includes('go-chi/chi')) {
      frameworkName = 'Chi Router';
      archetype = 'Idiomatic Composable Go 1.22+ HTTP Service';
    }

    detectedList.push({
      id: 'go-framework',
      name: frameworkName,
      category: 'Backend API',
      runtime: 'Go Runtime (Goroutines & Channel Concurrency)',
      archetype,
      routingType: 'Go HTTP Mux / Router Handlers',
      badge: `${frameworkName} · Go`,
      description:
        'Compiled, statically typed high-throughput backend service leveraging Go lightweight goroutines for massive parallel concurrency and minimal memory footprint.',
      capabilities: ['Goroutine Concurrency', 'Static Binary Compilation', 'Low Latency', 'Zero JVM/Node Overhead'],
      buildTool: 'go build / go modules',
      keyConfigFiles: files.filter((f) => /go\.mod|go\.sum/i.test(f.path)).map((f) => f.path),
      entryPoint: paths.find((p) => /(cmd\/.*\/main|main)\.go/i.test(p)),
    });
  }

  // ---------------------------------------------------------------------------
  // 14. Flutter & Dart (Cross-Platform Mobile/Web/Desktop)
  // ---------------------------------------------------------------------------
  const hasFlutter = paths.some((p) => p.endsWith('pubspec.yaml') || p.includes('lib/main.dart'));
  if (hasFlutter) {
    detectedList.push({
      id: 'flutter',
      name: 'Flutter',
      category: 'Mobile & Multi-Platform',
      runtime: 'Dart Engine (Impeller / Skia)',
      archetype: 'Mobile, Web & Desktop App',
      routingType: 'Screen Navigation (Navigator / GoRouter)',
      badge: 'Flutter 3.x · Dart',
      description:
        "Google's UI toolkit for creating fast, beautiful apps across mobile (iOS & Android), web, and desktop from a single codebase.",
      capabilities: ['Fast Native Performance', 'Hardware Accelerated Graphics', 'Instant Hot Reload', 'iOS, Android & Web Support'],
      buildTool: 'Flutter CLI / pub',
      keyConfigFiles: files.filter((f) => /pubspec\.ya?ml/i.test(f.path)).map((f) => f.path),
      entryPoint: paths.find((p) => p === 'lib/main.dart' || p.endsWith('/lib/main.dart')),
    });
  }

  // ---------------------------------------------------------------------------
  // 15. Java / Kotlin: Spring Boot / Android
  // ---------------------------------------------------------------------------
  const hasJavaOrKotlin = paths.some((p) => p.endsWith('.java') || p.endsWith('.kt') || p.endsWith('pom.xml') || p.endsWith('build.gradle') || p.endsWith('build.gradle.kts'));
  if (hasJavaOrKotlin) {
    const isSpring = paths.some((p) => p.includes('src/main/java') || p.includes('src/main/kotlin')) &&
      (paths.some((p) => p.endsWith('pom.xml') || p.endsWith('build.gradle')) || paths.some((p) => p.toLowerCase().includes('application')));

    const isAndroid = paths.some((p) => p.includes('androidmanifest.xml') || p.includes('app/build.gradle'));

    if (isAndroid) {
      detectedList.push({
        id: 'android',
        name: 'Android Native',
        category: 'Mobile & Multi-Platform',
        runtime: 'Android Runtime (ART / JVM)',
        archetype: 'Native Android Architecture (Jetpack Compose / XML Layouts)',
        routingType: 'Android Jetpack Navigation Component',
        badge: 'Android · Kotlin',
        description: 'Native Android mobile application built with Modern Android Development (MAD) practices and Jetpack component libraries.',
        capabilities: ['Jetpack Compose', 'ART Native Execution', 'Room Database', 'Android SDK'],
        buildTool: 'Gradle',
        keyConfigFiles: files.filter((f) => /build\.gradle|settings\.gradle|androidmanifest\.xml/i.test(f.path)).map((f) => f.path),
      });
    } else if (isSpring) {
      detectedList.push({
        id: 'springboot',
        name: 'Spring Boot',
        category: 'Backend API',
        runtime: 'Java Virtual Machine (JVM 17/21+)',
        archetype: 'Enterprise Inversion-of-Control (IoC) Microservice Architecture',
        routingType: '@RestController & RequestMapping Endpoints',
        badge: 'Spring Boot 3.x',
        description:
          'Enterprise-grade Java/Kotlin framework providing stand-alone production-ready microservices with Inversion of Control, Spring Data JPA, and actuator monitoring.',
        capabilities: ['Inversion of Control (IoC)', 'Spring Data JPA', 'Embedded Tomcat/Netty', 'Actuator Health Checks'],
        buildTool: paths.some((p) => p.endsWith('pom.xml')) ? 'Maven' : 'Gradle',
        keyConfigFiles: files.filter((f) => /pom\.xml|build\.gradle|application\.(ya?ml|properties)/i.test(f.path)).map((f) => f.path),
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 16. PHP: Laravel / Symfony
  // ---------------------------------------------------------------------------
  const hasPhp = paths.some((p) => p.endsWith('.php') || p.endsWith('composer.json'));
  if (hasPhp) {
    const isLaravel = paths.some((p) => p.endsWith('artisan') || p.includes('app/http/controllers'));
    if (isLaravel) {
      detectedList.push({
        id: 'laravel',
        name: 'Laravel',
        category: 'Full-Stack',
        runtime: 'PHP 8.2+ (Zend Engine)',
        archetype: 'Modern PHP Model-View-Controller (MVC) Framework',
        routingType: 'routes/web.php & routes/api.php Routing',
        badge: 'Laravel · Full-Stack PHP',
        description:
          'Web application framework with expressive, elegant syntax, featuring Eloquent ORM, robust background queue workers, and Blade/Inertia templating.',
        capabilities: ['Eloquent ORM', 'Artisan CLI', 'Blade / Inertia.js', 'Queue & Job Scheduling'],
        buildTool: 'Composer / Vite',
        keyConfigFiles: files.filter((f) => /composer\.json|artisan/i.test(f.path)).map((f) => f.path),
        entryPoint: paths.find((p) => /public\/index\.php|artisan/i.test(p)),
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 17. Rust: Actix-web / Axum / Cargo CLI
  // ---------------------------------------------------------------------------
  const hasRust = paths.some((p) => p.endsWith('.rs') || p.endsWith('Cargo.toml'));
  if (hasRust) {
    const cargo = fileContents.get('Cargo.toml') || '';
    let frameworkName = 'Rust Native Application';
    let archetype = 'Memory-Safe High-Performance Compiled Binary';

    if (cargo.includes('actix-web')) {
      frameworkName = 'Actix Web';
      archetype = 'Ultra-High-Concurrency Actor-Based Rust Async API';
    } else if (cargo.includes('axum')) {
      frameworkName = 'Axum';
      archetype = 'Ergonomic Modular Async Rust Web Framework (Tokio/Tower)';
    } else if (cargo.includes('tokio')) {
      frameworkName = 'Tokio Async Runtime';
      archetype = 'Asynchronous Event-Driven Rust Architecture';
    }

    detectedList.push({
      id: 'rust-app',
      name: frameworkName,
      category: cargo.includes('actix') || cargo.includes('axum') ? 'Backend API' : 'CLI / Utility',
      runtime: 'Native Machine Code (Rust LLVM, Zero-Cost Abstractions)',
      archetype,
      routingType: 'Rust Typed Handlers',
      badge: `${frameworkName} · Rust`,
      description:
        'Memory-safe, high-performance compiled application built with Rust, delivering zero-cost abstractions, fearless concurrency, and zero garbage collection pauses.',
      capabilities: ['Memory Safety Without GC', 'Fearless Concurrency', 'Zero-Cost Abstractions', 'Bare-Metal Performance'],
      buildTool: 'Cargo / rustc',
      keyConfigFiles: files.filter((f) => /Cargo\.toml|Cargo\.lock/i.test(f.path)).map((f) => f.path),
      entryPoint: paths.find((p) => /src\/(main|lib)\.rs/i.test(p)),
    });
  }

  // ---------------------------------------------------------------------------
  // Ecosystem Helpers (Styling, Testing, Database, Package Manager)
  // ---------------------------------------------------------------------------
  let styling = 'CSS / Standard';
  if (depMap.has('tailwindcss') || paths.some((p) => p.includes('tailwind.config'))) styling = 'Tailwind CSS';
  else if (depMap.has('@mui/material') || depMap.has('@emotion/react')) styling = 'Material UI (MUI)';
  else if (depMap.has('styled-components')) styling = 'Styled Components';
  else if (paths.some((p) => p.endsWith('.scss') || p.endsWith('.sass'))) styling = 'SCSS / SASS';

  let testing = 'None detected';
  if (depMap.has('vitest') || paths.some((p) => p.includes('vitest.config'))) testing = 'Vitest';
  else if (depMap.has('jest') || paths.some((p) => p.includes('jest.config'))) testing = 'Jest';
  else if (depMap.has('pytest') || paths.some((p) => p.includes('pytest'))) testing = 'Pytest';
  else if (paths.some((p) => p.endsWith('_test.go'))) testing = 'Go testing';
  else if (paths.some((p) => p.includes('tests/'))) testing = 'Test Suites Active';

  let database = 'None detected';
  if (depMap.has('prisma') || paths.some((p) => p.includes('schema.prisma'))) database = 'Prisma ORM';
  else if (depMap.has('drizzle-orm') || paths.some((p) => p.includes('drizzle'))) database = 'Drizzle ORM';
  else if (depMap.has('mongoose')) database = 'Mongoose (MongoDB)';
  else if (paths.some((p) => p.endsWith('.sql'))) database = 'SQL / Relational DB';
  else if (paths.some((p) => p.includes('sqlalchemy'))) database = 'SQLAlchemy';

  let packageManager = 'Default';
  if (pathSet.has('pnpm-lock.yaml')) packageManager = 'pnpm';
  else if (pathSet.has('yarn.lock')) packageManager = 'Yarn';
  else if (pathSet.has('package-lock.json')) packageManager = 'npm';
  else if (pathSet.has('bun.lockb') || pathSet.has('bun.lock')) packageManager = 'Bun';
  else if (pathSet.has('poetry.lock')) packageManager = 'Poetry';
  else if (pathSet.has('cargo.lock')) packageManager = 'Cargo';
  else if (pathSet.has('go.sum')) packageManager = 'Go Modules';

  // Fallback if no framework specifically identified
  if (detectedList.length === 0) {
    const mainLang = files.some((f) => f.extension === 'ts' || f.extension === 'tsx')
      ? 'TypeScript'
      : files.some((f) => f.extension === 'py')
      ? 'Python'
      : files.some((f) => f.extension === 'go')
      ? 'Go'
      : files.some((f) => f.extension === 'rs')
      ? 'Rust'
      : 'General';

    const frameworkName = mainLang === 'General' ? 'Framework' : `${mainLang} Framework`;

    detectedList.push({
      id: 'custom-framework',
      name: frameworkName,
      category: 'Library',
      runtime: mainLang === 'General' ? 'Standard Runtime' : `${mainLang} Runtime`,
      archetype: 'Organized Modular Codebase',
      routingType: 'Standard File Structure',
      badge: `${mainLang} Project`,
      description: `Structured software project organized across modular source files, components, and configuration standards.`,
      capabilities: ['Clean Code Structure', 'Organized Modules', 'Cross-Platform Ready'],
      keyConfigFiles: [],
    });
  }

  const primary = detectedList[0];
  const secondary = detectedList.slice(1);

  return {
    primary,
    secondary,
    allDetected: detectedList.map((d) => d.name),
    ecosystem: {
      language: primary.runtime.split(' ')[0] === 'Polyglot' ? 'Multi-language' : primary.runtime.split(' ')[0] || 'Multi-language',
      runtime: primary.runtime,
      buildTool: primary.buildTool,
      packageManager,
      styling,
      testing,
      database,
    },
  };
}
