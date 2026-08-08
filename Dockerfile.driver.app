# Base image para dependencias
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./

# Copiar dependencias de workspaces necesarias
COPY apps/driver/package.json ./apps/driver/
COPY packages/ ./packages/
RUN npm ci

# Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build --workspace=apps/driver
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3004
COPY --from=builder /app/apps/driver/public ./apps/driver/public
COPY --from=builder /app/apps/driver/.next/standalone ./
COPY --from=builder /app/apps/driver/.next/static ./apps/driver/.next/static
EXPOSE 3004
CMD ["node", "apps/driver/server.js"]
