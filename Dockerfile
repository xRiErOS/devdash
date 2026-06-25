# DD-230: Multi-Stage Dockerfile for DevDashboard.
#
# Stage 1 (builder): full toolchain — python3/make/g++ are mandatory because
# better-sqlite3 has no Alpine prebuilds (musl) and always compiles from source.
# This stage also builds the Vite client bundle.
#
# Stage 2 (runtime): bare alpine + node + tini. Copies only the compiled
# node_modules, dist/, server/, scripts/ and package metadata. Runs as the
# unprivileged `node` user (uid 1000). HEALTHCHECK hits /health (no DB).
#
# Image-size target: 150–250 MB. Fallback base: node:22-bookworm-slim if Alpine
# builds break (e.g. glibc-only native deps).

# ---------- Stage 1: builder ----------
FROM node:22-alpine AS builder

# better-sqlite3 native build chain. python3 is required by node-gyp.
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Install deps with the lockfile honoured — reproducible across runs.
# DD-365: note-field ist eine vendored file:-Dependency (vendor/*.tgz) — der Tarball
# MUSS vor `npm ci` im Build-Context liegen, sonst schlägt die Resolution fehl.
COPY package.json package-lock.json* ./
COPY vendor/ ./vendor/
RUN npm ci

# Copy the rest of the source for the Vite build.
COPY . .

# Build the Vite SPA → dist/
RUN npm run build

# Drop devDependencies so we ship a lean node_modules to the runtime stage.
RUN npm prune --omit=dev

# ---------- Stage 2: runtime ----------
FROM node:22-alpine AS runtime

# tini handles PID 1 signal forwarding (SIGTERM / SIGINT) cleanly.
RUN apk add --no-cache tini

WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3001

# Copy only what the runtime needs.
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/server ./server
COPY --from=builder --chown=node:node /app/scripts ./scripts
COPY --from=builder --chown=node:node /app/migrations ./migrations
# DD-624: server/ + server/lib/ importieren contracts/*.contracts.js zur Laufzeit
# (Contract-first-Gateway seit DD#78). Ohne diese Kopie crasht der Boot mit
# ERR_MODULE_NOT_FOUND /app/contracts/... — CI faengt es nicht (kein api.js-Boot-Test).
COPY --from=builder --chown=node:node /app/contracts ./contracts
COPY --from=builder --chown=node:node /app/package.json ./package.json

# DD-249: Migrations baked into /app/migrations (outside the bind-mounted
# /app/data path). The compose mount /volume2/docker/devd/data → /app/data
# previously masked /app/data/migrations completely, so migration 003+ never
# applied on the NAS. Default resolver in scripts/migrate.js picks up
# /app/migrations automatically; ENV `MIGRATIONS_DIR` can override.
ENV MIGRATIONS_DIR=/app/migrations

# Volume mount points. DB + uploads live OUTSIDE the image (compose-mounted).
RUN mkdir -p /app/data /app/uploads \
    && chown -R node:node /app/data /app/uploads

USER node

EXPOSE 3001

# /health is the lightweight liveness probe added in DD-230 (no DB).
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/health || exit 1

# tini → migrate.js (idempotent) → api.js (long-running). The `&&` chain
# guarantees the API only starts once migrations succeed (B01 baked in).
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sh", "-c", "node scripts/migrate.js && node server/api.js"]
