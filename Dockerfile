# syntax=docker/dockerfile:1
FROM node:26-alpine AS base
# Node 25+ ships without corepack; same pnpm as mise.toml and packageManager.
RUN npm install -g pnpm@10.34.9
WORKDIR /app

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build \
 && pnpm --filter server deploy --prod --legacy /out/server

# One process serves the web app at / and the API under /api, on $PORT.
FROM base
ENV NODE_ENV=production PORT=3000 WEB_ROOT=/app/public
COPY --from=build /out/server ./
COPY --from=build /app/apps/web/dist ./public
EXPOSE 3000
CMD ["node", "dist/index.js"]
