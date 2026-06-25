# DD2 Monorepo — Frontend-Service (static SPA via nginx, /api → backend proxy).
# Build-Context = Repo-Root (Workspaces).

# ---------- Stage 1: builder ----------
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
COPY vendor/ ./vendor/
COPY packages/api-types/package.json ./packages/api-types/package.json
COPY apps/backend/package.json ./apps/backend/package.json
COPY apps/cli/package.json ./apps/cli/package.json
COPY apps/frontend/package.json ./apps/frontend/package.json
RUN npm ci
COPY packages/api-types ./packages/api-types
COPY apps/frontend ./apps/frontend
RUN npm run build -w @devd/frontend

# ---------- Stage 2: runtime (nginx) ----------
FROM nginx:1.27-alpine AS runtime
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1/ || exit 1
