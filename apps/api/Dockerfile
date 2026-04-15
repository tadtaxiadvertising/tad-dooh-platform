# Stage 1: Build
FROM node:20-alpine AS builder

# Required for Prisma and build tools
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Step 10: Optimizing dependency layer
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies and immediately clean cache to save space in layer
RUN npm ci && npm cache clean --force

COPY . .

# Step 18: Build and Generate
RUN npx prisma generate
RUN npm run build

# Stage 2: Production runner
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy essentials from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

# Prune dev dependencies and clean cache again
RUN npm prune --production && npm cache clean --force

# Create entrypoint script
RUN printf '#!/bin/sh\n\
echo "=== TAD Backend Entrypoint ==="\n\
if [ -f "dist/main.js" ]; then\n\
  exec node dist/main.js\n\
elif [ -f "dist/src/main.js" ]; then\n\
  exec node dist/src/main.js\n\
else\n\
  echo "Error: Could not find main.js"\n\
  exit 1\n\
fi\n\
' > /app/entrypoint.sh && chmod +x /app/entrypoint.sh

EXPOSE 3000

CMD ["/bin/sh", "/app/entrypoint.sh"]
