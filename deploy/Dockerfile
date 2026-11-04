# Same reproducible Bun dependency tree for the API and static frontend.
FROM oven/bun:1.4.2 AS base
WORKDIR /srv/app

COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/test-utils/package.json packages/test-utils/package.json
RUN bun install --frozen-lockfile
COPY . .

FROM base AS web-build
# Production web and API share the HTTPS origin through Caddy.
ARG PUBLIC_API_URL=/api/v1
ARG PUBLIC_REGISTRATION_ENABLED=false
ENV PUBLIC_API_URL=${PUBLIC_API_URL}
ENV PUBLIC_REGISTRATION_ENABLED=${PUBLIC_REGISTRATION_ENABLED}
RUN bun run build

FROM base AS api
ENV NODE_ENV=production
EXPOSE 3000
USER bun
CMD ["bun", "deploy/start-api.ts"]

FROM caddy:2-alpine AS web
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=web-build /srv/app/apps/web/build /srv/web
EXPOSE 80 443
