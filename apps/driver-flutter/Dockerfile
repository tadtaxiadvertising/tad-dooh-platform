# ============ STAGE 1: Build Flutter Web ============
FROM ghcr.io/cirruslabs/flutter:3.27.4 AS builder

ARG FLUTTER_APP_API_URL=https://tad.api.ibuisiness.com.do/api/v1
ARG FLUTTER_APP_SUPABASE_URL=https://ltdcdhqixvbpdcitthqf.supabase.co
ARG FLUTTER_APP_SUPABASE_ANON_KEY
ARG FLUTTER_APP_ENV=production
ARG FLUTTER_APP_MAX_OFFLINE_HOURS=48
ARG FLUTTER_APP_GPS_DEBOUNCE_MS=300000

ENV API_BASE_URL=$FLUTTER_APP_API_URL
ENV SUPABASE_URL=$FLUTTER_APP_SUPABASE_URL
ENV SUPABASE_ANON_KEY=$FLUTTER_APP_SUPABASE_ANON_KEY
ENV APP_ENV=$FLUTTER_APP_ENV
ENV MAX_OFFLINE_HOURS=$FLUTTER_APP_MAX_OFFLINE_HOURS
ENV GPS_DEBOUNCE_MS=$FLUTTER_APP_GPS_DEBOUNCE_MS

WORKDIR /app

# 1) Cache de dependencias primero (layer separado)
COPY pubspec.yaml pubspec.lock ./
RUN flutter pub get

# 2) Código fuente
COPY . .

# 3) Buscar .env template o crearlo con vars de build
RUN echo "API_BASE_URL=${API_BASE_URL:-https://tad.api.ibuisiness.com.do/api/v1}" > .env && \
    echo "SUPABASE_URL=${SUPABASE_URL:-https://ltdcdhqixvbpdcitthqf.supabase.co}" >> .env && \
    echo "SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY:-sb_publishable_sa_TwjDpFtkNn93Ynrw5PA_pv3BhfSi}" >> .env && \
    echo "APP_ENV=${APP_ENV:-production}" >> .env && \
    echo "MAX_OFFLINE_HOURS=${MAX_OFFLINE_HOURS:-48}" >> .env && \
    echo "GPS_DEBOUNCE_MS=${GPS_DEBOUNCE_MS:-300000}" >> .env

# 4) Build web optimizado
RUN flutter build web \
    --release \
    --web-renderer canvaskit \
    --base-href / \
    --no-tree-shake-icons \
    --source-maps

# ============ STAGE 2: Nginx Alpine ultraligero ============
FROM nginx:1.27-alpine-slim

LABEL maintainer="TAD Dominicana <dev@tad.do>"
LABEL description="TAD Driver Flutter Web - DOOH Platform"
LABEL version="1.0.0"

# Sin paquetes extra — la imagen alpine-slim ya es ~8MB
RUN apk add --no-cache tzdata ca-certificates && \
    cp /usr/share/zoneinfo/America/Santo_Domingo /etc/localtime && \
    echo "America/Santo_Domingo" > /etc/timezone && \
    rm -rf /var/cache/apk/*

# Copiar artifact build desde builder
COPY --from=builder /app/build/web /usr/share/nginx/html

# Nginx config optimizada para SPA + gzip
COPY nginx.conf /etc/nginx/nginx.conf

# Seguridad: usuario no-root
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

USER nginx

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1:80/ | grep -q 'tad_driver' || exit 1

CMD ["nginx", "-g", "daemon off;"]