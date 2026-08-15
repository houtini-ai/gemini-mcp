# syntax=docker/dockerfile:1
#
# Container image for the @houtini/gemini-mcp stdio MCP server.
# Used by the Docker MCP registry (docker/mcp-registry) to build + sign the
# `mcp/gemini` image. dist/ is gitignored, so the image builds from source.
#
# Build:  docker build -t mcp/gemini .
# Run:    docker run -i --rm -e GEMINI_API_KEY=... mcp/gemini

# --- build stage: full build (server + UI viewers) needs devDeps -------------
FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
# --ignore-scripts: skip prepare/prepack (they'd re-run the build); we build explicitly.
RUN npm ci --ignore-scripts || npm install --ignore-scripts
COPY . .
RUN npm run build

# --- runtime: production deps + built dist only ------------------------------
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts || npm install --omit=dev --ignore-scripts
COPY --from=build /app/dist ./dist
# stdio transport: the gateway/clients speak MCP over stdin/stdout.
ENTRYPOINT ["node", "dist/cli.js"]
