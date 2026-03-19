# ============================================
# TAD DOOH Backend - Production Dockerfile
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependencias del sistema para bcrypt y prisma
RUN apk add --no-cache libc6-compat python3 make g++

# Copiar archivos de dependencias y prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Instalar TODAS las dependencias (necesitamos devDeps para build)
RUN npm ci

# Generar Prisma Client
RUN npx prisma generate

# Copiar código fuente
COPY . .

# Build de NestJS
RUN npm run build

# ============================================
# Production Stage
# ============================================
FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache libc6-compat

# Copiar package.json para el script start:prod
COPY --from=builder /app/package*.json ./

# Copiar node_modules de producción
COPY --from=builder /app/node_modules ./node_modules

# Copiar build compilado
COPY --from=builder /app/dist ./dist

# Copiar Prisma schema + client generado (CRÍTICO)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

ENV NODE_ENV=production
ENV NODE_OPTIONS=--max-old-space-size=1536
ENV PORT=3000

EXPOSE 3000

# Ejecutar migraciones y arrancar
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
