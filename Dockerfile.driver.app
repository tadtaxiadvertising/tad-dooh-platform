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

# Build-time vars for Next.js public env resolution
ARG NEXT_PUBLIC_SUPABASE_URL="https://ltdcdhqixvbpdcitthqf.supabase.co"
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_sa_TwjDpFtkNn93Ynrw5PA_pv3BhfSi"
ARG NEXT_PUBLIC_API_URL="https://tad-api.rewvid.easypanel.host/api/v1"
ARG NEXT_PUBLIC_UMAMI_ID=""
ARG NEXT_PUBLIC_UMAMI_URL=""
ARG NEXT_PUBLIC_SENTRY_DSN=""
ARG NEXT_PUBLIC_PORTAL_TYPE="DRIVER"
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL} \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY} \
    NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    NEXT_PUBLIC_UMAMI_ID=${NEXT_PUBLIC_UMAMI_ID} \
    NEXT_PUBLIC_UMAMI_URL=${NEXT_PUBLIC_UMAMI_URL} \
    NEXT_PUBLIC_SENTRY_DSN=${NEXT_PUBLIC_SENTRY_DSN} \
    NEXT_PUBLIC_PORTAL_TYPE=${NEXT_PUBLIC_PORTAL_TYPE}

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
