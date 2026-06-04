# ─── Stage 1: Install + build ─────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm@9

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.base.json ./
COPY packages/core/package.json      packages/core/
COPY packages/db/package.json        packages/db/
COPY packages/notifications/package.json packages/notifications/
COPY apps/worker/package.json        apps/worker/

RUN pnpm install --frozen-lockfile

COPY packages/core/src/  packages/core/src/
COPY packages/db/src/    packages/db/src/
COPY packages/notifications/src/ packages/notifications/src/
COPY apps/worker/src/    apps/worker/src/
COPY apps/worker/tsconfig.json apps/worker/

RUN pnpm -F worker build

# ─── Stage 2: Production runtime ──────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 worker_group \
 && adduser  --system --uid 1001 worker_user

COPY --from=builder --chown=worker_user:worker_group /app/apps/worker/dist ./dist
COPY --from=builder --chown=worker_user:worker_group /app/node_modules ./node_modules

USER worker_user

CMD ["node", "dist/index.js"]
