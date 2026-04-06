# Stage 1: Build
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

# Install ALL dependencies (including dev) for build
RUN npm install

COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Final build (NestJS)
RUN npm run build

# Stage 2: Production runner
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

# Cleanup dev deps to reduce image size
RUN npm prune --production

# Create entrypoint script
# CRITICAL: do NOT use 'set -e' — a failed prisma push must NOT stop the app
RUN printf '#!/bin/sh\n\
echo "=== TAD Backend Entrypoint ==="\n\
echo "Running Prisma DB Push (non-blocking)..."\n\
npx prisma db push --accept-data-loss --skip-generate 2>&1 || echo "WARNING: prisma db push failed - app will start anyway"\n\
echo "Starting NestJS application..."\n\
exec node dist/src/main\n\
' > /app/entrypoint.sh && chmod +x /app/entrypoint.sh

EXPOSE 3000

CMD ["/bin/sh", "/app/entrypoint.sh"]
