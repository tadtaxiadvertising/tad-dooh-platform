# ============ STAGE 1: Download Flutter SDK + Build Web ============
FROM docker.io/library/ubuntu:22.04 AS builder

ARG DEBIAN_FRONTEND=noninteractive
ARG FLUTTER_VERSION=3.29.1
ARG FLUTTER_APP_API_URL=https://tad-api.rewvid.easypanel.host/api/v1
ARG FLUTTER_APP_SUPABASE_URL=https://ltdcdhqixvbpdcitthqf.supabase.co
ARG FLUTTER_APP_SUPABASE_ANON_KEY=sb_publishable_sa_TwjDpFtkNn93Ynrw5PA_pv3BhfSi
ARG FLUTTER_APP_ENV=production
ARG FLUTTER_APP_MAX_OFFLINE_HOURS=48
ARG FLUTTER_APP_GPS_DEBOUNCE_MS=300000

ENV API_BASE_URL=$FLUTTER_APP_API_URL \
    SUPABASE_URL=$FLUTTER_APP_SUPABASE_URL \
    SUPABASE_ANON_KEY=$FLUTTER_APP_SUPABASE_ANON_KEY \
    APP_ENV=$FLUTTER_APP_ENV \
    MAX_OFFLINE_HOURS=$FLUTTER_APP_MAX_OFFLINE_HOURS \
    GPS_DEBOUNCE_MS=$FLUTTER_APP_GPS_DEBOUNCE_MS \
    PATH=/usr/local/flutter/bin:$PATH

WORKDIR /app

# Dependencias del sistema + Flutter SDK (descarga oficial sin depender de registry con auth)
RUN apt-get update && apt-get install -y --no-install-recommends \
      curl xz-utils ca-certificates git openssh-client \
      libglu1-mesa libgtk-3-0 libstdc++6 \
    && rm -rf /var/lib/apt/lists/* \
    && curl -fsSL "https://storage.googleapis.com/flutter_infra_release/releases/stable/linux/flutter_linux_${FLUTTER_VERSION}-stable.tar.xz" -o /tmp/flutter.tar.xz \
    && tar -C /usr/local -xJf /tmp/flutter.tar.xz \
    && rm /tmp/flutter.tar.xz \
    && flutter --version \
    && flutter config --no-analytics

# 1) Cache de dependencias
COPY apps/driver-flutter/pubspec.yaml apps/driver-flutter/pubspec.lock ./
RUN flutter pub get

# 2) Código fuente
COPY apps/driver-flutter/ .

# 3) .env con vars de build
RUN echo "API_BASE_URL=${API_BASE_URL}" > .env && \
    echo "SUPABASE_URL=${SUPABASE_URL}" >> .env && \
    echo "SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}" >> .env && \
    echo "APP_ENV=${APP_ENV}" >> .env && \
    echo "MAX_OFFLINE_HOURS=${MAX_OFFLINE_HOURS}" >> .env && \
    echo "GPS_DEBOUNCE_MS=${GPS_DEBOUNCE_MS}" >> .env

# 4) Build web optimizado
RUN flutter build web \
    --release \
    --base-href / \
    --no-tree-shake-icons \
    --source-maps

# ============ STAGE 2: Nginx Alpine ultraligero ============
FROM docker.io/library/nginx:1.27-alpine-slim

LABEL maintainer="TAD Dominicana <dev@tad.do>"
LABEL description="TAD Driver Flutter Web - DOOH Platform"
LABEL version="1.0.0"

RUN apk add --no-cache tzdata ca-certificates curl && \
    cp /usr/share/zoneinfo/America/Santo_Domingo /etc/localtime && \
    echo "America/Santo_Domingo" > /etc/timezone && \
    rm -rf /var/cache/apk/*

# Copiar artifact build desde builder
COPY --from=builder /app/build/web /usr/share/nginx/html

# Nginx config optimizada para SPA + gzip
COPY apps/driver-flutter/nginx.conf /etc/nginx/nginx.conf

# Seguridad: usuario no-root
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

USER nginx

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f -s -o /dev/null "http://127.0.0.1:80/" || exit 1

CMD ["nginx", "-g", "daemon off;"]
