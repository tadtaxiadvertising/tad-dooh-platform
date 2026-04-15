# --- STAGE 1: Builder ---
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install --prefer-offline --no-audit && npm cache clean --force

COPY . .

# Generar cliente con soporte para OpenSSL 3.0 (Supabase/Alpine)
RUN npx prisma generate
RUN npm run build

# --- STAGE 2: Runner ---
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

# Obligamos a V8 a hacer recolección de basura agresiva a los 256MB (TAD-OPS-911)
ENV NODE_OPTIONS="--max_old_space_size=256"

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

# Limpieza final para mantener el contenedor ligero
RUN npm prune --production && npm cache clean --force

RUN printf '#!/bin/sh\necho "=== TAD Backend Entrypoint ==="\nexec node dist/main.js\n' > /app/entrypoint.sh && chmod +x /app/entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["./entrypoint.sh"]
