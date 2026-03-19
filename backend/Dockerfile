# ETAPA 1: Construcción
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build

# ETAPA 2: Ejecución
FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
ENV NODE_OPTIONS=--max-old-space-size=256

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# Generar cliente para la arquitectura final si es necesario
RUN npx prisma generate

EXPOSE 3000

# Arranque directo y veloz
CMD ["node", "dist/src/main"]
