# 07 — Docker Packaging & Containerization

**Status:** Production Ready  
**Base Image:** `node:22-alpine`  
**Container User:** `node` (Unprivileged UID 1000)  
**Default Port:** `4004` (Configurable via `PORT` environment variable)  
**Default Host Binding:** `0.0.0.0` (Container bridge compatible)  

---

## 1. Overview & Dual-Mode Packaging

DomoScope is packaged as an Alpine-based OCI-compliant container image designed to operate in **two flexible modes**:

1. **Interactive Studio Mode (Default):** Runs the local HTTP/SSE studio server with full interactive UI and live file watching on `http://localhost:4004`.
2. **Headless CLI Utility Mode:** Functions as a portable CLI without requiring Node.js on the host. Any subcommand (`analyze`, `graph`, `docs`, `doctor`, `mcp`) can be executed on a mounted workspace.

```
+-------------------------------------------------------------------------+
|                         DomoScope Container                             |
|                                                                         |
|   +-----------------------+              +--------------------------+   |
|   |   Studio Server Mode  |              |   Headless CLI Mode      |   |
|   |   (serve localhost)   |              |   (analyze, docs, mcp)   |   |
|   +-----------+-----------+              +------------+-------------+   |
|               |                                       |                 |
|               v                                       v                 |
|       Port 4004 (HTTP/SSE)                    Stdout / Export File      |
|               |                                       |                 |
+---------------+---------------------------------------+-----------------+
                |                                       |
                v                                       v
         Host Web Browser                       Host Terminal / CI
```

---

## 2. Multi-Stage Dockerfile Architecture

The `Dockerfile` employs a multi-stage build pattern to optimize container security, minimize attack surface, and keep final image size under 150MB:

### Stage 1: Build Stage (`builder`)
- Pulls `node:22-alpine` with build utilities (`git`).
- Copies `package.json` and `package-lock.json`.
- Runs `npm ci` installing all dependencies (including devDependencies required for Vite and TypeScript).
- Compiles the React 19 frontend and runs Rollup bundling via `npm run build`.
- Outputs optimized static assets to `/app/dist`.

### Stage 2: Runtime Stage (`runner`)
- Pulls a clean `node:22-alpine` image with lightweight runtime tools (`git`, `curl`).
- Installs production-only dependencies (`npm ci --omit=dev`), discarding Vite, TypeScript, and test runners from the final image.
- Copies compiled `/app/dist` from the builder stage.
- Copies CLI executables (`bin/domoscope.js`, `bin/domoscope-mcp.js`) and runtime source (`src/`).
- Drops root privileges to unprivileged user `node` (UID 1000).
- Sets up non-root permissions for `/workspace` and `/app/.domoscope`.
- Binds to `0.0.0.0:4004` to support container port forwarding.
- Configures an automated container `HEALTHCHECK`.

---

## 3. Dockerfile Specification

```dockerfile
# Stage 1: Build Vite Frontend & Compile Types
FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache git
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production Runtime Image
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4004

RUN apk add --no-cache git curl
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY bin ./bin
COPY src ./src
COPY tsconfig.json ./

RUN chmod +x ./bin/domoscope.js ./bin/domoscope-mcp.js
RUN mkdir -p /workspace /app/.domoscope && \
    chown -R node:node /app /workspace

USER node
EXPOSE 4004

HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4004/api/local/status || exit 1

ENTRYPOINT ["node", "bin/domoscope.js"]
CMD ["serve", "--dir", "/workspace", "--port", "4004", "--host", "0.0.0.0"]
```

---

## 4. Usage Patterns & Commands

### 4.1. Running the Interactive Studio with Docker Compose

```yaml
services:
  domoscope:
    build:
      context: .
      dockerfile: Dockerfile
    image: domoscope:latest
    container_name: domoscope-app
    restart: unless-stopped
    ports:
      - "4004:4004"
    environment:
      - NODE_ENV=production
      - HOST=0.0.0.0
      - PORT=4004
      - GITHUB_TOKEN=${GITHUB_TOKEN:-}
    volumes:
      - .:/workspace:rw
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4004/api/local/status"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 5s
```

**Commands:**
```bash
# Start background studio
docker compose up -d

# View live streaming server logs
docker compose logs -f

# Check container health status
docker compose ps

# Stop studio
docker compose down
```

### 4.2. Running as a Portable CLI Tool (No Node.js Required on Host)

Because `ENTRYPOINT` is configured as `["node", "bin/domoscope.js"]`, any DomoScope subcommand can be executed directly:

```bash
# 1. Run diagnostic doctor on current repository
docker run --rm -v $(pwd):/workspace domoscope doctor

# 2. Analyze codebase and output structured metrics
docker run --rm -v $(pwd):/workspace domoscope analyze

# 3. Generate 7-file markdown documentation suite in ./docs
docker run --rm -v $(pwd):/workspace domoscope docs --output /workspace/docs

# 4. Generate autonomous AI agent SKILL.md specification
docker run --rm -v $(pwd):/workspace domoscope skill --output /workspace/SKILL.md

# 5. Export architectural dependency graph as Mermaid
docker run --rm -v $(pwd):/workspace domoscope graph --format mermaid --output /workspace/architecture.mmd

# 6. Run headless MCP server over stdio
docker run -i --rm domoscope mcp
```

---

## 5. NPM Convenience Scripts

The project includes pre-configured npm shortcuts in `package.json`:

```json
{
  "scripts": {
    "docker:build": "docker build -t domoscope:latest .",
    "docker:package": "docker build -t domoscope:latest -t domoscope:v1.0.0 .",
    "docker:up": "docker compose up -d",
    "docker:down": "docker compose down",
    "docker:logs": "docker compose logs -f"
  }
}
```

---

## 6. Container Health & Observability

- **Endpoint:** `GET http://localhost:4004/api/local/status`
- **Interval:** 15 seconds
- **Timeout:** 5 seconds
- **Start Period:** 5 seconds grace period
- **Payload Example:**
```json
{
  "status": "ok",
  "rootDir": "/workspace",
  "projectName": "domoscope",
  "snapshotId": "snap_1790775529067_44f53860",
  "analyzedAt": "2026-09-30T13:38:49.067Z",
  "totalFiles": 146,
  "totalLines": 45956,
  "isIncremental": true
}
```
