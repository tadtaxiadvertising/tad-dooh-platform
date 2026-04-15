# --- STAGE 1: Builder ---
FROM node:20-alpine AS builder

# Instalamos dependencias necesarias para Prisma y compilación en Alpine
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Copiamos manifiestos primero para aprovechar el cache de capas
COPY package*.json ./
COPY prisma ./prisma/

# Cambiamos 'npm ci' por 'npm install' si el lockfile falta, 
# pero forzamos limpieza de cache para ahorrar espacio.
RUN npm install && npm cache clean --force

COPY . .

# Generar cliente de Prisma (asegúrate que en schema.prisma esté 'linux-musl-openssl-3.0.x')
RUN npx prisma generate
RUN npm run build

# --- STAGE 2: Runner ---
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl

WORKDIR /app

# Solo copiamos lo estrictamente necesario del builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

# Eliminamos dependencias de desarrollo para liberar espacio en el VPS
RUN npm prune --production && npm cache clean --force

# Script de entrada (basado en el log anterior)
RUN printf '#!/bin/sh\necho "=== TAD Backend Entrypoint ==="\nif [ -f "dist/main.js" ]; then\n  exec node dist/main.js\nelif [ -f "dist/src/main.js" ]; then\n  exec node dist/src/main.js\nelse\n  echo "Error: dist/main.js no encontrado"\n  exit 1\nfi\n' > /app/entrypoint.sh && chmod +x /app/entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["/bin/sh", "/app/entrypoint.sh"]
