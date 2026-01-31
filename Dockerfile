FROM node:22-slim AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

FROM base AS deps

COPY package.json pnpm-lock.yaml ./
COPY patches ./patches/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN ./setup.sh && pnpm run build

FROM node:22-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
RUN groupadd --gid 1001 diadem && \
    useradd --uid 1001 --gid diadem --shell /bin/bash --create-home diadem
COPY --from=builder --chown=diadem:diadem /app/build ./build
COPY --from=builder --chown=diadem:diadem /app/package.json ./
COPY --from=deps --chown=diadem:diadem /app/node_modules ./node_modules

# Files needed for drizzle-kit db:push at runtime
COPY --from=builder --chown=diadem:diadem /app/drizzle.config.ts ./
COPY --from=builder --chown=diadem:diadem /app/src/lib/server/db ./src/lib/server/db
COPY --from=builder --chown=diadem:diadem /app/src/lib/services ./src/lib/services

# Create config.toml mount point (actual config mounted at runtime)
RUN touch ./src/lib/server/config.toml && chown diadem:diadem ./src/lib/server/config.toml

RUN mkdir -p /app/config /app/logs && chown diadem:diadem /app/config /app/logs
COPY --chown=diadem:diadem docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh
USER diadem
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3900

EXPOSE 3900

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD node -e "fetch('http://localhost:${PORT:-3900}').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

ENTRYPOINT ["./docker-entrypoint.sh"]
