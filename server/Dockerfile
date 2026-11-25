FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-workspace.yaml ./
COPY server/package.json server/package.json
COPY packages/core/package.json packages/core/package.json
RUN pnpm install --frozen-lockfile=false

FROM deps AS build
COPY . .
RUN pnpm --filter @404-labor/watchdog-server build
RUN pnpm deploy --legacy --filter @404-labor/watchdog-server --prod /prod

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV WATCHDOG_SETUP_MODE=auto
RUN corepack enable
COPY --from=build /prod ./
EXPOSE 4040
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4040/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]
