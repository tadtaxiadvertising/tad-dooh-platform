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

# Regeneramos el cliente Prisma para el target Alpine (linux-musl-openssl-3.0.x)
RUN npx prisma generate

EXPOSE 80
ENV PORT=80

# HEALTHCHECK: curl mínimo para que Easypanel sepa cuando está listo
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

# Migraciones en entrypoint separado para que el crash-loop no opaque la causa
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "dist/main"]
