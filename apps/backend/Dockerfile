# DD2 Monorepo — Backend-Service (API only). Build-Context = Repo-Root (Workspaces).
# better-sqlite3 hat keine Alpine-Prebuilds → python3/make/g++ im Builder Pflicht.

# ---------- Stage 1: builder ----------
FROM node:22-alpine AS builder
RUN apk add --no-cache python3 make g++
WORKDIR /app

# Workspace-Manifeste + vendored file:-Dep (note-field) vor npm ci.
COPY package.json package-lock.json* ./
COPY vendor/ ./vendor/
COPY packages/api-types/package.json ./packages/api-types/package.json
COPY apps/backend/package.json ./apps/backend/package.json
COPY apps/cli/package.json ./apps/cli/package.json
COPY apps/frontend/package.json ./apps/frontend/package.json
RUN npm ci --omit=dev

# Backend-Code + geteilte api-types + Migrations-Runner.
COPY packages/api-types ./packages/api-types
COPY apps/backend ./apps/backend
COPY scripts ./scripts

# ---------- Stage 2: runtime ----------
FROM node:22-alpine AS runtime
RUN apk add --no-cache tini
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3001

COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/packages ./packages
COPY --from=builder --chown=node:node /app/apps/backend ./apps/backend
COPY --from=builder --chown=node:node /app/scripts ./scripts
COPY --from=builder --chown=node:node /app/package.json ./package.json

# DB + uploads liegen außerhalb des Images (Volume-Mount auf apps/backend/{data,uploads}).
RUN mkdir -p /app/apps/backend/data /app/apps/backend/uploads \
    && chown -R node:node /app/apps/backend/data /app/apps/backend/uploads
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/health || exit 1

# migrate (idempotent, Resolver → apps/backend/migrations) → api.
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sh", "-c", "node scripts/migrate.js && node apps/backend/src/api.js"]
