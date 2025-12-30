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
RUN mkdir -p src/routes/\(custom\) && \
    mkdir -p src/components/custom && \
    mkdir -p src/lib/server && \
    cp config/custom.example.css config/custom.css && \
    cp config/Home.example.svelte config/Home.svelte && \
    cp config/config.example.toml config/config.toml && \
    ln config/custom.css src/custom.css && \
    ln config/Home.svelte src/components/custom/Home.svelte && \
    ln config/config.toml src/lib/server/config.toml
RUN pnpm run build

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
