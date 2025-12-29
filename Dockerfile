FROM node:20-slim

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV HUSKY=0

# Enable Corepack for Yarn
RUN corepack enable

COPY . .

# Install dependencies using Yarn
# Skip lifecycle scripts (like husky) that aren't needed in Docker
RUN yarn install --immutable

# Build the server
RUN yarn --cwd apps/server build

EXPOSE 8080
CMD ["node", "apps/server/dist/index.mjs"]
