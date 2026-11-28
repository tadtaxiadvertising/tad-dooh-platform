# =============================================================================
# TAD DOOH Platform — EasyPanel Environment Variables Template
# =============================================================================
# ATENCION P0 #244/#217: PLANTILLA HISTORICA; NO IMPORTAR NI DESPLEGAR DIRECTAMENTE.
# En EasyPanel, una App Git/Dockerfile puede reenviar Environment Variables
# a Docker Buildx como build-args. Eso expone credenciales en logs o metadatos.
# Las claves/URLs privilegiadas deben configurarse SOLO en el runtime de una
# imagen auditada precompilada (digest GHCR), tras la rotacion de secretos #244/#489.
# No pegues credenciales en Git, build args, tickets, logs, CI o este archivo.
# Cada servicio tiene su propio conjunto; nunca importar el bloque completo.
# No ejecutar redeploys ni migraciones con el esquema sin restauracion validada #217.
# El project ref esperado debe confirmarlo el propietario de EasyPanel mediante
# inventario independiente: NO deducirlo del SUPABASE_URL de una plantilla.
# =============================================================================

# =============================================================================
# SERVICIO 1: tad-api (Backend NestJS) — Puerto 3000
# =============================================================================
# EasyPanel Service Name: tad-api
# Dockerfile: Dockerfile.api
# Dominio: https://tad.api.ibusiness.com.do

# El propietario debe copiar las URLs exactas desde Supabase Connect y
# confirmar PRIVADAMENTE que SUPABASE_URL, DATABASE_URL y DIRECT_URL contienen
# el mismo project ref independiente. No reutilizar hosts de otra region.
# Pooler: usuario postgres.<project_ref> (NO usuario postgres sin sufijo).
# Direct: db.<project_ref>.supabase.co; verificar conectividad IPv6/IPv4.
# No copiar valores marcados con <...> a EasyPanel sin completarlos.
DATABASE_URL=<URI_DEL_POOLER_SUPABASE_CON_REF_VERIFICADO>
DIRECT_URL=<URI_DIRECTA_O_POOLER_SESION_CON_REF_VERIFICADO>

# Supabase (la referencia independiente no se deduce de estas URLs)
SUPABASE_URL=<URL_OFICIAL_DEL_PROYECTO_SUPABASE>
TAD_EXPECTED_SUPABASE_PROJECT_REF=<REF_20_CARACTERES_CONFIRMADA_POR_PROPIETARIO>
SUPABASE_SERVICE_ROLE_KEY=<TU_SERVICE_ROLE_KEY>
SUPABASE_ANON_KEY=<TU_ANON_KEY>
SUPABASE_PUBLISHABLE_KEY=<TU_PUBLISHABLE_KEY>
SUPABASE_JWT_SECRET=<TU_JWT_SECRET_32_CHARS_MIN>

# JWT (hereda de SUPABASE_JWT_SECRET si no se define)
JWT_SECRET=<TU_JWT_SECRET_32_CHARS_MIN>

# Solo para bootstrap de usuarios nuevos; no cambia contraseñas existentes.
# Configurar temporalmente si se usa /auth/bootstrap/sync-users y retirar después.
AUTH_BOOTSTRAP_PASSWORD=

# Servidor
PORT=3000
NODE_ENV=production
NODE_OPTIONS="--max-old-space-size=512 --expose-gc"

# CORS — NUEVOS DOMINIOS PRODUCCIÓN (ibusiness.com.do)
CORS_ORIGIN=https://tad.adm.ibusiness.com.do,https://tad.anunciante.ibusiness.com.do,https://tad.driver.ibusiness.com.do,https://tad.drive.ibusiness.com.do,https://tad.player.ibusiness.com.do,https://tad.remotion.ibusiness.com.do,https://tad.simulator.ibusiness.com.do,https://tad.api.ibusiness.com.do

# CDN / Storage
CDN_URL_PREFIX=https://media.tad.do

# Monitoreo (opcional)
UMAMI_API_TOKEN=
SENTRY_DSN=


# =============================================================================
# SERVICIO 2: tad-admin (Admin Dashboard Next.js) — Puerto 3000
# =============================================================================
# EasyPanel Service Name: tad-admin
# Dockerfile: Dockerfile.admin
# Dominio: https://tad.adm.ibusiness.com.do

# API Gateway (público - para navegador)
NEXT_PUBLIC_API_URL=https://tad.api.ibusiness.com.do/api

# API Gateway (interno - para SSR en EasyPanel, red privada)
BACKEND_INTERNAL_URL=http://tad-api:3000

# Supabase (público - para navegador)
NEXT_PUBLIC_SUPABASE_URL=https://ltdcdhqixvbpdcitthqf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<TU_ANON_KEY>

# Identidad del portal
NEXT_PUBLIC_PORTAL_TYPE=ADMIN

# Next.js
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
NODE_OPTIONS="--max-old-space-size=384 --expose-gc"
PORT=3000
HOSTNAME="0.0.0.0"

# Sentry (opcional)
SENTRY_AUTH_TOKEN=
NEXT_PUBLIC_SENTRY_DSN=


# =============================================================================
# SERVICIO 3: tad-advertiser (Advertiser Portal Next.js) — Puerto 3000
# =============================================================================
# EasyPanel Service Name: tad-advertiser
# Dockerfile: Dockerfile.advertiser
# Dominio: https://tad.anunciante.ibusiness.com.do

# API Gateway (público - para navegador)
NEXT_PUBLIC_API_URL=https://tad.api.ibusiness.com.do/api

# API Gateway (interno - para SSR en EasyPanel, red privada)
BACKEND_INTERNAL_URL=http://tad-api:3000

# Supabase (público - para navegador)
NEXT_PUBLIC_SUPABASE_URL=https://ltdcdhqixvbpdcitthqf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<TU_ANON_KEY>

# Identidad del portal
NEXT_PUBLIC_PORTAL_TYPE=ADVERTISER

# Next.js
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
NODE_OPTIONS="--max-old-space-size=384 --expose-gc"
PORT=3000
HOSTNAME="0.0.0.0"

# Sentry (opcional)
SENTRY_AUTH_TOKEN=
NEXT_PUBLIC_SENTRY_DSN=


# =============================================================================
# SERVICIO 4: tad-driver (Driver Portal Next.js PWA) — Puerto 3000
# =============================================================================
# EasyPanel Service Name: tad-driver
# Dockerfile: Dockerfile.driver
# Dominio canónico: https://tad.driver.ibusiness.com.do
# Alias opcional solicitado: https://tad.drive.ibusiness.com.do
# Si se usa el alias, asígnalo también al servicio tad-driver en EasyPanel (puerto interno 3000).

# API Gateway (público - para navegador)
NEXT_PUBLIC_API_URL=https://tad.api.ibusiness.com.do/api

# API Gateway (interno - para SSR en EasyPanel, red privada)
BACKEND_INTERNAL_URL=http://tad-api:3000

# Supabase (público - para navegador)
NEXT_PUBLIC_SUPABASE_URL=https://ltdcdhqixvbpdcitthqf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<TU_ANON_KEY>

# Identidad del portal
NEXT_PUBLIC_PORTAL_TYPE=DRIVER

# Next.js
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
NODE_OPTIONS="--max-old-space-size=384 --expose-gc"
PORT=3000
HOSTNAME="0.0.0.0"

# Sentry (opcional)
SENTRY_AUTH_TOKEN=
NEXT_PUBLIC_SENTRY_DSN=


# =============================================================================
# SERVICIO 5: tad-player (Tablet Player Vite + Nginx) — Puerto 80
# =============================================================================
# EasyPanel Service Name: tad-player
# Dockerfile: Dockerfile.player
# Dominio: https://tad.player.ibusiness.com.do

# API Gateway (build-time para Vite)
VITE_API_URL=https://tad.api.ibusiness.com.do/api/v1

# Supabase (build-time para Vite)
VITE_SUPABASE_URL=https://ltdcdhqixvbpdcitthqf.supabase.co
VITE_SUPABASE_ANON_KEY=<TU_ANON_KEY>

# Nginx runtime
PORT=80
HOSTNAME="0.0.0.0"


# =============================================================================
# SERVICIO 6: tad-remotion (Video Engine) — Puerto 8000
# =============================================================================
# EasyPanel Service Name: tad-remotion
# Dockerfile: apps/tad-remotion/Dockerfile (via docker-compose.remotion.yml)
# Dominio: https://tad.remotion.ibusiness.com.do

# API Gateway interno (para callbacks de render)
API_URL=http://tad-api:3000

# Servidor
PORT=8000
NODE_ENV=production
NODE_OPTIONS="--max-old-space-size=1024 --expose-gc"

# Concurrencia de render (1 para estabilidad en 1GB RAM)
REMOTION_CONCURRENCY=1

# Caddy (reverse proxy + SSL automático)
TAD_REMOTION_DOMAIN=tad.remotion.ibusiness.com.do


# =============================================================================
# SERVICIO 7: tad-simulator (Device Simulator CLI) — Sin puerto expuesto
# =============================================================================
# EasyPanel Service Name: tad-simulator
# Dockerfile: Dockerfile.simulator
# Dominio: https://tad.simulator.ibusiness.com.do (si se expone web UI)

# API Gateway
API_URL=http://tad-api:3000
NODE_ENV=production


# =============================================================================
# VARIABLES COMUNES (SECRETOS) — Configurar en EasyPanel "Project Secrets"
# =============================================================================
# Estos valores son IDÉNTICOS para todos los servicios.
# En EasyPanel: Project Settings → Secrets → Agregar cada uno:

# Supabase
# SUPABASE_URL=https://ltdcdhqixvbpdcitthqf.supabase.co
# SUPABASE_SERVICE_ROLE_KEY=<TU_SERVICE_ROLE_KEY>
# SUPABASE_ANON_KEY=<TU_ANON_KEY>
# SUPABASE_PUBLISHABLE_KEY=<TU_PUBLISHABLE_KEY>
# SUPABASE_JWT_SECRET=<TU_JWT_SECRET_32_CHARS_MIN>

# Database
# DATABASE_URL=postgresql://postgres:<PASSWORD>@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?connection_limit=5
# DIRECT_URL=postgresql://postgres:<PASSWORD>@aws-0-sa-east-1.pooler.supabase.com:5432/postgres

# JWT
# JWT_SECRET=<TU_JWT_SECRET_32_CHARS_MIN>

# =============================================================================
# CHECKLIST DE DESPLIEGUE POR SERVICIO
# =============================================================================
# Orden CRÍTICO (dependencias):
#
# 1. tad-api          → Deploy primero (todos dependen de él)
#    ☐ Variables cargadas
#    ☐ Health check: curl https://tad.api.ibusiness.com.do/health
#    ☐ Logs: "TAD DOOH API Gateway Operativo en el puerto 3000"
#
# 2. tad-remotion     → Deploy segundo (API debe estar vivo)
#    ☐ Variables cargadas
#    ☐ Health check: curl https://tad.remotion.ibusiness.com.do/health
#    ☐ Logs: "Remotion server ready on port 8000"
#
# 3. tad-admin        → Deploy tercero
#    ☐ Variables cargadas (incluir BACKEND_INTERNAL_URL=http://tad-api:3000)
#    ☐ Health check: curl https://tad.adm.ibusiness.com.do/
#    ☐ Verificar: Redirige / → /login
#
# 4. tad-advertiser   → Deploy cuarto (ya funciona, verificar)
#    ☐ Variables cargadas (incluir BACKEND_INTERNAL_URL=http://tad-api:3000)
#    ☐ Health check: curl https://tad.anunciante.ibusiness.com.do/
#    ☐ Verificar: Redirige / → /login
#
# 5. tad-driver       → Deploy quinto
#    ☐ Variables cargadas (incluir BACKEND_INTERNAL_URL=http://tad-api:3000)
#    ☐ Health check: curl https://tad.driver.ibusiness.com.do/
#    ☐ Verificar: Redirige / → /driver/login
#
# 6. tad-player       → Deploy sexto
#    ☐ Variables cargadas (VITE_* en build args)
#    ☐ Health check: curl https://tad.player.ibusiness.com.do/health
#    ☐ Verificar: Responde {"status":"OK","service":"tad-player"}
#
# 7. tad-simulator    → Deploy séptimo (opcional)
#    ☐ Variables cargadas
#    ☐ Verificar: Logs muestran conexión a API
#
# =============================================================================
# VERIFICACIÓN POST-DEPLOY (Ejecutar desde tu máquina)
# =============================================================================
# curl -s https://tad.api.ibusiness.com.do/health | jq .
# curl -s https://tad.adm.ibusiness.com.do/ | head -5
# curl -s https://tad.anunciante.ibusiness.com.do/ | head -5
# curl -s https://tad.driver.ibusiness.com.do/ | head -5
# curl -s https://tad.drive.ibusiness.com.do/ | head -5  # alias opcional
# curl -s https://tad.player.ibusiness.com.do/health | jq .
# curl -s https://tad.remotion.ibusiness.com.do/health | jq .
#
# Verificar CORS:
# curl -H "Origin: https://tad.adm.ibusiness.com.do" \
#      -H "Access-Control-Request-Method: POST" \
#      -X OPTIONS \
#      https://tad.api.ibusiness.com.do/api/v1/auth/login -v
#
# =============================================================================
# DNS REQUERIDO (Configurar en tu proveedor DNS - Cloudflare, GoDaddy, etc.)
# =============================================================================
# Tipo    Nombre                    Valor (IP de tu VPS EasyPanel)    Proxy
# A       tad.api                   <IP_VPS_EASYPANEL>                Sí (Orange Cloud)
# A       tad.adm                   <IP_VPS_EASYPANEL>                Sí
# A       tad.anunciante            <IP_VPS_EASYPANEL>                Sí
# A       tad.driver                <IP_VPS_EASYPANEL>                Sí
# A       tad.drive                 <IP_VPS_EASYPANEL>                Sí (alias opcional del portal Driver)
# A       tad.player                <IP_VPS_EASYPANEL>                Sí
# A       tad.remotion              <IP_VPS_EASYPANEL>                Sí
# A       tad.simulator             <IP_VPS_EASYPANEL>                Sí
#
# Con Cloudflare Proxy (Orange Cloud):
# - SSL/TLS automático (Full Strict)
# - WAF protege tu VPS
# - HTTP/3 y compresión Brotli
# - Traefik en EasyPanel maneja el ACME challenge vía HTTP-01
# =============================================================================
