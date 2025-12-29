FROM oven/bun:latest AS base
WORKDIR /app

# ---- deps (workspace-aware, but only the server + required packages) ----
FROM base AS deps

COPY package.json bun.lock bunfig.toml turbo.json tsconfig.json ./

COPY apps/server/package.json apps/server/package.json
COPY apps/server/tsconfig.json apps/server/tsconfig.json
COPY apps/server/tsdown.config.ts apps/server/tsdown.config.ts

COPY packages/api/package.json packages/api/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/env/package.json packages/env/package.json
COPY packages/config/package.json packages/config/package.json

RUN bun install

# ---- build ----
FROM deps AS build

COPY apps/server/src apps/server/src

COPY packages/api/src packages/api/src
COPY packages/db/src packages/db/src
COPY packages/env/src packages/env/src

# Some packages rely on shared TS config during bundling/type resolution.
COPY packages/config/tsconfig.base.json packages/config/tsconfig.base.json

RUN bun run --cwd apps/server build

# ---- production deps ----
FROM base AS prod-deps

COPY package.json bun.lock bunfig.toml turbo.json tsconfig.json ./

COPY apps/server/package.json apps/server/package.json
COPY apps/server/tsconfig.json apps/server/tsconfig.json
COPY apps/server/tsdown.config.ts apps/server/tsdown.config.ts

COPY packages/api/package.json packages/api/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/env/package.json packages/env/package.json
COPY packages/config/package.json packages/config/package.json

RUN bun install --production

# ---- runtime ----
FROM base AS runner
ENV NODE_ENV=production
# Fly.io sets PORT for you; we default it here for local `docker run`.
ENV PORT=8080

COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=prod-deps /app/apps/server/node_modules /app/apps/server/node_modules
COPY --from=build /app/apps/server/dist /app/apps/server/dist

EXPOSE 8080
CMD ["bun", "apps/server/dist/index.mjs"]


