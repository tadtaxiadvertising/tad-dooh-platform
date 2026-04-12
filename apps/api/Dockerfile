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
# CRITICAL: If main.js is at dist/main.js (flattened) or dist/src/main.js (nested)
RUN printf '#!/bin/sh\n\
echo "=== TAD Backend Entrypoint ==="\n\
echo "Finding NestJS main module..."\n\
if [ -f "dist/main.js" ]; then\n\
  echo "Starting from dist/main.js..."\n\
  exec node dist/main.js\n\
elif [ -f "dist/src/main.js" ]; then\n\
  echo "Starting from dist/src/main.js..."\n\
  exec node dist/src/main.js\n\
else\n\
  echo "Error: Could not find main.js in dist/ or dist/src/"\n\
  ls -R dist/\n\
  exit 1\n\
fi\n\
' > /app/entrypoint.sh && chmod +x /app/entrypoint.sh

EXPOSE 3000

CMD ["/bin/sh", "/app/entrypoint.sh"]
