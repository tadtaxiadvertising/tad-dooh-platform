# Stage 1: Build
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install

COPY . .

# Generate Prisma Client (Minimalistic)
RUN npx prisma generate

# Final build (NestJS)
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS runner

# SSL is needed for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production
# Configuración estándar para alto rendimiento (8GB RAM disponible)
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

CMD ["npm", "run", "start:prod"]
