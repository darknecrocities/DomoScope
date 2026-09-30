# 08 — CI/CD Pipeline & Testing Strategy

**Framework:** Vitest 5.0  
**Linter:** Oxlint 1.81 (116 active rules)  
**CI Runner:** GitHub Actions (`ubuntu-latest`)  
**Node.js Matrix:** 20.x (LTS) & 22.x (Current)  

---

## 1. Quality Assurance Philosophy

DomoScope enforces strict test-driven reliability. Codebase static analysis and AST parsers must be deterministic, resilient to corrupted caches, and safe from infinite traversal loops.

### Key Testing Principles:
1. **Real Code Fixtures:** Tests parse realistic multi-framework project files (TypeScript, Prisma, SQL DDL, Python, JSON) rather than fragile mocked strings.
2. **Sub-Second Execution:** The entire 25-suite test harness runs in under 1 second using Vitest's parallel worker threads.
3. **End-to-End CLI Verification:** Subcommands (`init`, `doctor`, `analyze`, `graph`, `docs`) execute against isolated temporary directories and assert correct filesystem side-effects and exit codes.
4. **Resilient Error Recovery:** Cache corruption, missing git directories, unparseable source files, and unknown CLI flags are tested to verify clean error handling without unhandled exceptions.

---

## 2. Test Suite Catalog (25 Suites, 156 Assertions)

```
Test Files  25 passed (25)
Tests       156 passed (156)
Duration    ~800ms
```

| Suite Name | Scope & Assertions |
|---|---|
| `apiRouteCatalog.test.ts` | Discovers HTTP routes across Express, Next.js App router, FastAPI, and Flask |
| `databaseParser.test.ts` | Validates Prisma schema, SQL DDL, Mongoose, and TypeORM table/column extraction |
| `graphBuilder.test.ts` | Verifies directed dependency graph creation, import edge counts, and circular import handling |
| `localAnalysisEngine.test.ts` | Tests full analysis pipeline from filesystem traversal to structured snapshot |
| `localCacheManager.test.ts` | Verifies cache hit/miss semantics, SHA-256 diffing, and recovery from corrupted JSON |
| `localCli.test.ts` | Full CLI argument parser and execution for `init`, `analyze`, `graph`, `docs`, and `doctor` |
| `localDocsGenerator.test.ts` | Validates generation of all 6 markdown documentation files with Mermaid blocks |
| `localScanner.test.ts` | Tests `.gitignore` adherence, file limits, binary filtering, and path containment |
| `markdownSpecGenerator.test.ts`| Asserts generation of complete 1,000+ line technical specification |
| `mcpServer.test.ts` | Verifies 16 MCP tool registrations, JSON-RPC 2.0 requests, and error formats |
| `securityScanner.test.ts` | Verifies detection of AWS keys, GitHub tokens, database URLs, and private keys |
| `reverseEngineerGenerator.test.ts` | Validates generation of phased rebuilding recipes and subagent prompts |
| `cloudServicesDetector.test.ts`| Detects cloud configuration files (Docker, AWS, GCP, Vercel, Supabase) |
| `frameworkDetector.test.ts` | Asserts correct framework categorization and tooling detection |
| `cryptoService.test.ts` | Validates AES-GCM 256-bit encryption and decryption of credentials |
| `chatGuardrail.test.ts` | Tests prompt injection resistance and input sanitization |

---

## 3. GitHub Actions CI Workflow (`.github/workflows/ci.yml`)

The CI pipeline runs on every push and pull request to `main`:

```yaml
name: CI Pipeline

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint-and-test:
    name: Lint, Test & Typecheck
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [20.x, 22.x]

    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Run Linter (oxlint)
        run: npm run lint

      - name: Run Unit & Integration Tests (Vitest)
        run: npm test

      - name: Build Production Assets (Vite & tsc)
        run: npm run build

      - name: Verify CLI Executable
        run: |
          node bin/domoscope.js --help
          node bin/domoscope.js doctor
          node bin/domoscope-mcp.js --list-tools

  docker-build:
    name: Docker Build & Verification
    runs-on: ubuntu-latest
    needs: [lint-and-test]

    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build Docker Image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: false
          tags: domoscope:ci
          load: true

      - name: Test Docker Container Startup & Healthcheck
        run: |
          docker run -d --name domoscope-test -p 4004:4004 domoscope:ci
          for i in {1..30}; do
            if curl -s http://localhost:4004/api/local/status | grep -q "ok"; then
              echo "DomoScope container is healthy and responding!"
              docker stop domoscope-test
              exit 0
            fi
            sleep 1
          done
          echo "Container health check timed out!"
          docker logs domoscope-test
          exit 1
```

---

## 4. Release & Publishing Pipeline (`.github/workflows/release.yml`)

Triggered on semantic version tags (`v*.*.*`):
1. Runs tests and builds production distribution.
2. Builds multi-architecture OCI images (x86_64 and ARM64).
3. Publishes to GitHub Container Registry (`ghcr.io/darknecrocities/domoscope:latest` and `ghcr.io/darknecrocities/domoscope:vX.Y.Z`).
4. Generates automated GitHub Releases with release notes and compiled assets.
