# syntax=docker/dockerfile:1
FROM node:26-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build \
 && pnpm --filter server deploy --prod --legacy /out/server

FROM base AS server
ENV NODE_ENV=production PORT=3000
COPY --from=build /out/server ./
EXPOSE 3000
CMD ["node", "dist/index.js"]

FROM nginx:alpine AS web
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
