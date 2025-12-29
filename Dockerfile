FROM node:20-slim AS build

WORKDIR /app

# Fly's remote builder runs in CI mode, and Yarn will default to immutable installs.
# Your `.dockerignore` excludes `apps/native`, which makes the workspace set differ from
# what `yarn.lock` was generated with, so immutable installs fail. We explicitly disable
# immutable installs in Docker and focus-install only the server workspace.
ENV YARN_ENABLE_IMMUTABLE_INSTALLS=false
ENV HUSKY=0

# Enable Corepack for Yarn 4 (as pinned by `packageManager` in package.json)
RUN corepack enable

# Native dependencies (e.g. `node-av`) may require node-gyp toolchain during install.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 build-essential pkg-config \
  && rm -rf /var/lib/apt/lists/*

COPY . .

# Install only what the server workspace needs (and its dependent workspaces),
# avoiding pulling in Expo / React Native deps.
RUN yarn workspaces focus server

# Build the server bundle
RUN yarn --cwd apps/server build

FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/server/dist ./apps/server/dist

EXPOSE 8080
CMD ["node", "apps/server/dist/index.mjs"]
