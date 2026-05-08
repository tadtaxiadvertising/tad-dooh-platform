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
RUN apk add --no-cache openssl libc6-compat curl
WORKDIR /app

# SRE v12.1.1: 460MB = 90% del límite de 512MB. Deja ~52MB para Alpine OS + OpenSSL + native bindings.
# PROHIBIDO subir a >460 — EasyPanel mata el contenedor con OOMKilled si V8 toca el techo.
ENV NODE_OPTIONS="--max_old_space_size=460"

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

# Limpieza final para mantener el contenedor ligero
RUN npm prune --production && npm cache clean --force

EXPOSE 3000

# Health check nativo de Docker: evita que EasyPanel envíe SIGTERM prematuro
# --start-period=60s: espera 60s antes del primer chequeo (tiempo de init de NestJS)
# --interval=30s: chequea cada 30s
# --timeout=10s: timeout por chequeo
# --retries=3: 3 fallos consecutivos = unhealthy
HEALTHCHECK --start-period=60s --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# CMD directo a node — SIGTERM llega al proceso correcto sin pasar por npm
CMD ["node", "dist/main.js"]
