# Stage 1: Build
FROM node:20-slim AS builder

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

# Install everything including devDeps
RUN npm ci

COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Final build
RUN npm run build

# Stage 2: Production
FROM node:20-slim AS runner

# SSL is needed for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production
# Reducido un poco para evitar OOM on startup en EasyPanel
ENV NODE_OPTIONS=--max-old-space-size=320
ENV PORT=3000

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
# Para evitar errores por dependencias faltantes en runtime, copiamos node_modules completo
# y luego eliminamos devDeps.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

# Limpiar dev dependencies del node_modules final
RUN npm prune --production

EXPOSE 3000

CMD ["node", "dist/src/main"]
