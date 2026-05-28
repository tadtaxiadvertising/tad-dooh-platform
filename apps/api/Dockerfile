# Dockerfile (Raíz para despliegue en Easypanel)
FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production

# Copiamos solo lo esencial para ejecución
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

# Ejecutamos migraciones y lanzamos la app
CMD npx prisma migrate deploy && node dist/main
