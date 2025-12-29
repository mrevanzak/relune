FROM oven/bun:1.3.5

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY . .

# Avoid Bun failing in CI-style "frozen lockfile" mode.
# Delete bun.lock first, then let Bun generate a fresh one that respects bunfig.toml hoisting.
# Skip lifecycle scripts (like husky) that aren't needed in Docker.
#
# IMPORTANT: Use hoisted linker in Docker so native platform packages (e.g. @seydx/node-av-linux-x64)
# resolve correctly at runtime. This overrides bunfig.toml's isolated linker for the container only.
RUN rm -f bun.lock && bun install --ignore-scripts --linker=hoisted

RUN bun run --cwd apps/server build

EXPOSE 8080
CMD ["bun", "apps/server/dist/index.mjs"]
