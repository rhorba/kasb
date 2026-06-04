# ─── Stage 1: Install dependencies ───────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

RUN npm install -g pnpm@9

# Copy workspace manifests first for layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/core/package.json       packages/core/
COPY packages/db/package.json         packages/db/
COPY packages/cashbook/package.json   packages/cashbook/
COPY packages/credit/package.json     packages/credit/
COPY packages/inventory/package.json  packages/inventory/
COPY packages/whatsapp/package.json   packages/whatsapp/
COPY packages/notifications/package.json packages/notifications/
COPY apps/web/package.json            apps/web/

RUN pnpm install --frozen-lockfile

# ─── Stage 2: Build ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm@9

COPY --from=deps /app ./
# Copy source (tsconfig paths point to source — packages compiled via transpilePackages)
COPY tsconfig.base.json ./
COPY packages/ packages/
COPY apps/web/ apps/web/

ENV DOCKER_BUILD=1 NODE_ENV=production

RUN pnpm -F web build

# ─── Stage 3: Production runtime ──────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Standalone output contains its own node_modules copy
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static     ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public           ./public

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
