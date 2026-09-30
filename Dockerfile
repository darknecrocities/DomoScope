# =================================================================
# Stage 1: Build Vite Frontend & Compile Types
# =================================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Install git for metadata extraction if needed
RUN apk add --no-cache git

# Copy dependency manifests
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies required for vite/tsc)
RUN npm ci

# Copy full source tree
COPY . .

# Build production assets
RUN npm run build

# =================================================================
# Stage 2: Production Runtime Image
# =================================================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4004

# Install runtime utilities (curl for healthcheck, git for repo analysis)
RUN apk add --no-cache git curl

# Copy dependency manifests
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy compiled frontend distribution from builder
COPY --from=builder /app/dist ./dist

# Copy CLI executables and application source required by jiti
COPY bin ./bin
COPY src ./src
COPY tsconfig.json ./

# Ensure CLI binaries are executable
RUN chmod +x ./bin/domoscope.js ./bin/domoscope-mcp.js

# Setup workspace and permission directory for non-root user
RUN mkdir -p /workspace /app/.domoscope && \
    chown -R node:node /app /workspace

USER node

# Expose DomoScope local studio & REST/SSE port
EXPOSE 4004

# Docker healthcheck
HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4004/api/local/status || exit 1

# Default command: launch DomoScope studio server targeting /workspace
ENTRYPOINT ["node", "bin/domoscope.js"]
CMD ["serve", "--dir", "/workspace", "--port", "4004", "--host", "0.0.0.0"]
