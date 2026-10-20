FROM node:20-bookworm-slim AS base

# 1) Build stage - compila TS y remueve devDeps
FROM base AS builder

# Evita instalar navegadores de Playwright/Chrome (no los necesitamos aquí)
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    NODE_ENV=production

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev --no-audit --no-fund

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

# 2) Runtime stage - imagen final pequeña
FROM base AS runtime

ENV NODE_ENV=production

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       ffmpeg \
    && rm -rf /var/lib/apt/lists/*

USER node

WORKDIR /app

COPY --from=builder --chown=node:node /app/package*.json ./
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist

# Puerto por defecto; EasyPanel/Caddy sobreescribirán si es necesario
EXPOSE 8000

CMD ["node","dist/index.js"]
