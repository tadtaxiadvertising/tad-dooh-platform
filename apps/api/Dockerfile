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

# Stage 2: Migrate (separate stage to run db push as a pre-start step at BUILD time)
# We use a startup script instead to allow DATABASE_URL to be injected at runtime by EasyPanel
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

# Create entrypoint script that runs migrate then starts the app
RUN echo '#!/bin/sh' > /app/entrypoint.sh && \
    echo 'set -e' >> /app/entrypoint.sh && \
    echo 'echo "🔄 Running Prisma DB Push..."' >> /app/entrypoint.sh && \
    echo 'npx prisma db push --accept-data-loss --skip-generate || echo "⚠️ DB push failed, continuing..."' >> /app/entrypoint.sh && \
    echo 'echo "🚀 Starting TAD Backend..."' >> /app/entrypoint.sh && \
    echo 'exec node dist/src/main' >> /app/entrypoint.sh && \
    chmod +x /app/entrypoint.sh

EXPOSE 3000

CMD ["/bin/sh", "/app/entrypoint.sh"]
