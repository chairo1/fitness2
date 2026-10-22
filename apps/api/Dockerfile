# syntax=docker/dockerfile:1
# Build context is the repository root:  docker build -f apps/api/Dockerfile .
FROM node:22-alpine AS base
RUN apk add --no-cache openssl libc6-compat \
 && corepack enable
WORKDIR /repo

# ---- deps: install the whole workspace (cached on manifests only) ----
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter api... --filter @fit/db...

# ---- build: compile db + api, then make a self-contained prod tree ----
FROM deps AS build
COPY . .
RUN pnpm --filter @fit/db build && pnpm --filter api build
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm --filter api deploy --prod /out \
 && cp -r apps/api/dist /out/dist \
 && mkdir /out/bin \
 && cp apps/api/docker/db-env.sh apps/api/docker/create-admin apps/api/docker/docker-entrypoint.sh /out/bin/ \
 && chmod +x /out/bin/create-admin /out/bin/docker-entrypoint.sh \
 && APP_ROOT=/out sh -c '. /out/bin/db-env.sh && node "$PRISMA" generate --schema "$DB/prisma/schema.prisma"'

# ---- runtime ----
FROM node:22-alpine AS runtime
RUN apk add --no-cache openssl libc6-compat
ENV NODE_ENV=production PORT=3000 CHECKPOINT_DISABLE=1 PRISMA_HIDE_UPDATE_MESSAGE=1
WORKDIR /app
COPY --from=build --chown=node:node /out /app
ENV PATH="/app/bin:$PATH"
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/health" >/dev/null || exit 1
ENTRYPOINT ["/app/bin/docker-entrypoint.sh"]
