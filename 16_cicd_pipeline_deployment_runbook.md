# 🚀 16 — CI/CD PIPELINE & DEPLOYMENT RUNBOOK

> **Versión**: 16.0.0 (v12.1.2 Microservices on EasyPanel)
> **Última Actualización**: 2026-06-05
> **Audiencia**: DevOps, SRE, CTO
> **Infraestructura**: EasyPanel VPS + Docker + Nixpacks

---

## 1. TOPOLOGÍA DE DESPLIEGUE

### 1.1 Servicios en Producción

| Servicio | Tecnología | URL EasyPanel | RAM Limit | Internal Port | Dev Port |
| --- | --- | --- | --- | --- | --- |
| **tad-api** | NestJS 10 + Prisma | `tad-api.rewvid.easypanel.host` | 512 MB | 3000 | 3000 |
| **tad-dashboard** | Next.js 15 (Admin) | `tad-dashboard.rewvid.easypanel.host` | 512 MB | 3000 | 3002 |
| **tad-advertiser** | Next.js 15 (Adv Portal) | `tad-advertiser.rewvid.easypanel.host` | 512 MB | 3000 | 3000/3001 |
| **tad-driver** | Next.js 15 (Driver PWA) | `tad-driver.rewvid.easypanel.host` | 512 MB | 3000 | 3004 |
| **tad-remotion** | Remotion + Chromium | `tad-remotion.rewvid.easypanel.host` | 1024 MB | 8000 | 8000 |
| **tad-simulator** | Next.js + SQLite | *(not deployed to prod)* | — | 3000 | 3000 |
| **tad-player** | Static tablet player | *(not deployed to prod)* | — | 3000 | 3000 |

> **⚠️ Port Clarification:** All Dockerfiles expose port **3000** internally. The external port mapping (3001, 3002, 3003, etc.) is an **EasyPanel routing concern** — not a code configuration. Dev ports differ: Admin=3002, Driver=3004, Advertiser=3000/3001.

### 1.2 Flujo de Despliegue

```
Git Push → EasyPanel Auto-Build → Docker Image → Health Check → Live
```

EasyPanel detecta cambios en el repositorio Git y ejecuta automáticamente:
1. Build del Dockerfile (o Nixpacks si no hay Dockerfile)
2. Deploy del contenedor con los secrets configurados
3. Health check antes de marcar como "Live"

---

## 2. EASYPANEL CONFIGURATION

### 2.1 Secrets (Variables de Entorno)

Todas las credenciales están centralizadas en EasyPanel bajo **Secrets**. **NUNCA** almacenar en `.env` trackeado por Git.

| Secret | Service | Description |
| --- | --- | --- |
| `DATABASE_URL` | tad-api | Connection Pool (puerto 6543) + `?pgbouncer=true&connection_limit=5` |
| `DIRECT_URL` | tad-api | Obligatoria al arrancar Docker: Session pooler o Direct Connection (puerto 5432) para migraciones |
| `SUPABASE_SERVICE_ROLE_KEY` | tad-api | JWT bypass RLS — **SOLO Backend** |
| `SUPABASE_ANON_KEY` | Frontend services | Public anon key para client-side |
| `NEXT_PUBLIC_API_URL` | Frontend services | URL del API Gateway |
| `SMTP_PASSWORD` | tad-api | Password para correos transaccionales |
| `ADMIN_SECRET` | tad-api | Header `x-admin-secret` para purge operations |
| `TABLET_HUB_KEY` | tad-api | Header `x-tablet-key` para hub data |
| `NEXT_TELEMETRY_DISABLED` | tad-dashboard | `1` — Desactivar telemetría Vercel |
| `NODE_OPTIONS` | ALL | `--max_old_space_size=256` (Frontend) / `--max_old_space_size=512` (API) |

#### Recuperación de `DIRECT_URL=MISSING`

El entrypoint de `Dockerfile.api` detiene el contenedor antes de ejecutar Prisma si falta `DIRECT_URL`. Un rebuild no crea esta variable.

1. En Supabase → **Connect**, copiar la cadena **Session pooler**, puerto `5432`, del mismo proyecto de `DATABASE_URL`. Conservar el host y usuario exactos (`postgres.<project-ref>` si se usa el rol postgres); codificar los caracteres especiales de la contraseña. Direct Connection también sirve si el VPS tiene conectividad al endpoint.
2. Preparar `DIRECT_URL` en **EasyPanel → tad-api → Environment**, como variable runtime del servicio. Un secreto de proyecto debe estar referenciado por el servicio para llegar al contenedor. No usar el Transaction pooler `:6543` para migraciones.
3. Antes de activar el despliegue, contrastar `_prisma_migrations` con las migraciones versionadas y verificar backup/rollback. El arranque ejecuta **todas** las migraciones pendientes. Hay migraciones históricas con borrados de duplicados y columnas; no se ha demostrado que estén pendientes en producción. No usar `migrate reset`, `db push` ni `migrate resolve` para eludir esta comprobación.
4. Tras validar el historial, guardar y volver a desplegar `tad-api`. Confirmar `DIRECT_URL=SET`, `Prisma migrations applied.` y `Starting node dist/main.js ...`; después verificar `https://tad.api.ibusiness.com.do/api/health`.

La variable `DATABASE_URL` solo se sustituye por `DIRECT_URL` durante `prisma migrate deploy`; la API sigue usando la conexión runtime original. Revertir los cambios de código o de entorno no revierte SQL que ya se haya aplicado.

Referencia: [Supabase — Prisma](https://supabase.com/docs/guides/database/prisma). Incidente diagnosticado el 2026-10-30 contra `680604c4`; la recuperación de producción requiere validación tras el despliegue.

Si aparece `DIRECT_URL=SET` seguido de `P1013: invalid domain character`, la variable ya existe, pero su valor no es una conexión válida. Los textos entre `< >` o `[ ]` son marcadores y deben reemplazarse por valores reales. Revisar también espacios, comillas introducidas como parte del valor y caracteres especiales de la contraseña; codificar solo los componentes que lo requieran, no la URL completa. No compartir la contraseña para diagnosticarlo. [Prisma — Connection URLs](https://www.prisma.io/docs/orm/reference/connection-urls).

Si `DATABASE_URL` ya contiene una conexión **válida al pooler compartido de Supabase** en `:6543`, se puede copiar su valor a `DIRECT_URL`, cambiar únicamente el puerto a `:5432` y retirar `pgbouncer=true`, conservando host, usuario, contraseña codificada, base de datos y los demás parámetros aplicables. Esto no aplica a endpoints de otros proveedores o poolers dedicados. Contrastar el resultado con **Connect → Session pooler** antes de desplegar.

**Comprobación externa del 2026-10-30, 02:49 (America/La_Paz):**

| Comprobación | Resultado observado | Alcance |
| --- | --- | --- |
| HTTPS público `/api/health` | Falla validación de nombre y cadena; certificado `CN=Easypanel`, autofirmado | El HTTPS público no está operativo |
| Mismo endpoint omitiendo validación solo para diagnóstico | HTTP 404, página HTML de EasyPanel | No confirma respuesta de NestJS ni salud de la base de datos |
| `https://proyecto-ia-tad-api.rewvid.easypanel.host/health` con validación TLS | HTTP 502, HTML | El proxy no entrega una respuesta saludable del backend; causa exacta pendiente de logs/configuración |
| Supabase MCP `get_project` para `ltdcdhqixvbpdcitthqf` | `ACTIVE_HEALTHY`, región `us-west-2` | Metadatos del proveedor; no verifica credenciales del contenedor ni historial Prisma |

Los logs aportados durante esta comprobación incluyen el bloqueo inicial `DIRECT_URL=MISSING` y también `P1013` / `DIRECT_URL=SET`. Sin marcas temporales no se establece el orden exacto de todos los reinicios. No se ejecutaron migraciones ni se modificó configuración de producción durante el diagnóstico. La corrección del dominio/certificado y la validación del arranque siguen pendientes.

#### Recuperación de P3009 durante el arranque

El 2026-10-30 se confirmó en `_prisma_migrations` que `20261012_campaign_notification_dedup` falló por SQL inválido y bloqueaba el inicio de Node. La recuperación autorizada completó las cuatro migraciones pendientes y reconcilió su historial con Prisma CLI, tras respaldo cifrado, restauración aislada y prueba transaccional en PostgreSQL 17. Resultado: 18 aplicadas, 0 fallidas activas, API y proxy Driver con HTTP 200. El [informe del incidente](docs/qa/incident-2026-10-30-api-startup/README.md) contiene la secuencia ejecutada y sus límites; no repetirla contra el estado ya recuperado ni ejecutar `resolve --applied` sin verificar todos los efectos SQL.

### 2.2 Configuración por Servicio en EasyPanel

#### tad-api (NestJS)

```yaml
# EasyPanel Advanced Settings
Memory Limit: 512MB
Memory Swap: 1GB
CPU Limit: 0.5 cores
Health Check Path: /api/health (NOT /api/v1/health)
Health Check Interval: 30s
Restart Policy: unless-stopped

# Build Command (Nixpacks)
Build: nixpacks build
Start: node dist/main

# O con Dockerfile personalizado:
Build: docker build -f Dockerfile.api -t tad-api .
Start: # Dejar el comando predeterminado de la imagen; entrypoint migra y luego inicia Node.
```

#### tad-dashboard (Next.js Admin)

```yaml
Memory Limit: 512MB
Memory Swap: 1GB
CPU Limit: 0.5 cores
Health Check Path: /
Health Check Interval: 60s
Restart Policy: unless-stopped

# Build Command
Build: nixpacks build
Start: next start
```

#### tad-remotion (Video Engine)

```yaml
Memory Limit: 1024MB
Memory Swap: 2GB
CPU Limit: 1.0 core
Health Check Path: /health
Health Check Interval: 30s
Restart Policy: unless-stopped

# Dockerfile requiere node:20-bullseye para compatibilidad con Chromium
```

---

### 2.3 Custom domains and HTTPS (mandatory production gate)

DNS pointing to the VPS is **not sufficient**: each hostname must also be attached to its correct EasyPanel service so Traefik can route requests and issue a trusted TLS certificate.

| Hostname | EasyPanel service | Internal port | Required check |
| --- | --- | ---: | --- |
| `tad.api.ibusiness.com.do` | `tad-api` | 3000 | `/api/health` returns HTTP 200 |
| `tad.adm.ibusiness.com.do` | `tad-admin` | 3000 | Portal root redirects to login and ends in HTTP 200 |
| `tad.driver.ibusiness.com.do` | `tad-driver` | 3000 | Portal root returns HTTP 200 |
| `tad.drive.ibusiness.com.do` (alias) | `tad-driver` | 3000 | Same driver service; add as a second domain |
| `tad.player.ibusiness.com.do` | `tad-player` | 80 | `/health` returns HTTP 200 |
| `tad.anunciante.ibusiness.com.do` | `tad-advertiser` | 3000 | Portal root returns HTTP 200 |

**Procedure**

1. In the DNS provider, create/verify each host's A record pointing to the public IP shown by EasyPanel. For the optional `tad.drive` alias, use an A record to that same IP or a CNAME to `tad.driver.ibusiness.com.do` (only if no conflicting A/AAAA record exists).
2. In EasyPanel, open the named service → **Domains** → add the exact hostname, path `/`, and internal port from the table. Enable HTTPS/automatic certificate provisioning.
3. For `tad.drive`, attach the alias to the existing `tad-driver` service; a CORS allow-list entry alone does not create DNS or routing.
4. Wait for certificate issuance and verify each domain with strict TLS validation. Do not use `curl -k` as a health check and do not disable certificate validation in browsers or clients.
5. Redeploy only if the service configuration/build requires it; adding a domain should update the reverse-proxy route. Confirm the service is running and listening on the expected port before diagnosing the application.

**Diagnostic signatures**

- Certificate subject/issuer `CN=Easypanel` (self-signed): the custom host is receiving EasyPanel's default certificate, not a valid certificate for that hostname.
- HTTP 404 when inspecting that endpoint with certificate validation bypassed: likely no matching domain router/service mapping; verify the host is attached to the correct service and port.
- DNS resolution failure: add/fix the record at the DNS provider before retrying certificate issuance.
- A trusted certificate and HTTP 200 prove only TLS/routing/HTTP reachability. Also test API health, CORS preflight, authentication and player-to-API communication.

Use the official [EasyPanel App service Domains guide](https://easypanel.io/docs/services/app#domains) for hostname, internal protocol, port and HTTPS settings. The separate Custom Service Domain feature controls automatic service hostname assignment.

## 3. DEPLOYMENT PROCEDURES

### 3.1 Deploy Routine (Standard)

```bash
# 1. Asegurar que el código está limpio
cd /path/to/tad-dooh-platform
git status
git pull origin main

# 2. Build local para verificar (opcional pero recomendado)
npm run build

# 3. Push a main — EasyPanel detecta y auto-deploy
git add .
git commit -m "descriptive message"
git push origin main
```

**EasyPanel Auto-Deploy:**
- EasyPanel watches the Git repository
- On push to `main`, triggers automatic build
- Build time: ~3-5 min per service
- Zero manual intervention required

### 3.2 Deploy con Migración de Base de Datos

Cuando el `schema.prisma` cambia, la migración debe ejecutarse **ANTES** que el nuevo código esté live.

```bash
# Opción A: Usando deploy:migrate script (ACTUAL — uses db push)
cd apps/api
npm run deploy:migrate
# ⚠️ This runs: npx prisma db push --accept-data-loss --skip-generate
# ⚠️ --accept-data-loss is DANGEROUS — only use for controlled schema changes

# Opción B: Safe migration (RECOMMENDED — uses migrate deploy)
npx prisma migrate deploy  # Safer — respects migration history
npx prisma generate        # Regenerate client

# Opción C: Manual full cycle (for critical schema changes)
# 1. Create migration
npx prisma migrate dev --name descriptive_name --create-only
# 2. Review SQL file in prisma/migrations/
# 3. Apply in production (uses DIRECT_URL)
npx prisma migrate deploy
# 4. Regenerate client
npx prisma generate
# 5. Deploy normal
git push origin main
```

**⚠️ ADVERTENCIA:** Migraciones destructivas (DROP COLUMN, RENAME) pueden causar pérdida de datos. Siempre crear una migración aditiva primero y hacer la destructiva en un segundo deploy.

### 3.3 Deploy de Emergency Hotfix

```bash
# 1. Crear branch de hotfix
git checkout -b hotfix/critical-issue

# 2. Fix rápido
# ... editar archivos ...

# 3. Test mínimo
npm run test:e2e -- critical-flow

# 4. Push directo a main (bypass review si es crítico)
git add .
git commit -m "HOTFIX: critical issue description"
git push origin hotfix/critical-issue
git checkout main
git merge hotfix/critical-issue
git push origin main
```

---

## 4. ROLLBACK PROCEDURES

### 4.1 Rollback via EasyPanel

EasyPanel mantiene la imagen anterior del contenedor. Para rollback:

1. **EasyPanel UI**: Navigate to service → Deployments → Select previous deployment → "Redeploy"
2. **Tiempo estimado**: ~30 seconds para que el contenedor anterior esté live

### 4.2 Rollback de Migración de BD

```bash
# Las migraciones de Prisma NO se auto-reverten.
# Para rollback manual:

# 1. Crear una migración de revert
npx prisma migrate dev --name revert_changes

# 2. Aplicar en producción
npx prisma migrate deploy

# ⚠️ NEVER use prisma migrate reset in production — borra TODOS los datos
```

### 4.3 Rollback de Contenedor Específico

```bash
# Si solo un servicio tiene problemas:
docker stop tad-api
docker rm tad-api

# EasyPanel re-deployará la última imagen exitosa
```

---

## 5. HEALTH CHECKS & MONITORING

### 5.1 Health Check Endpoints

| Service | Endpoint | Expected Response |
| --- | --- | --- |
| tad-api | `/api/health` | `{ status: "up", timestamp, service, node_env }` |
| tad-dashboard | `/` | HTTP 200 (Next.js SSR) |
| tad-advertiser | `/` | HTTP 200 |
| tad-driver | `/` | HTTP 200 |
| tad-remotion | `/health` | `{ status: "ok" }` |

### 5.2 Failure Detection

| Signal | Action |
| --- | --- |
| Health check fails 3x consecutively | EasyPanel auto-restarts container |
| Memory > 90% of limit | Monitor closely, prepare manual restart |
| OOM Kill detected | Auto-restart + investigate leak |
| DB connection pool exhausted | Scale `connection_limit` or restart API |

### 5.3 Monitoring Checklist

```bash
# Ver estado de contenedores
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Ver uso de memoria
docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}\t{{.CPUPerc}}"

# Ver logs de un servicio
docker logs tad-api --tail 100

# Ver conexiones de Prisma activas
# Consultar en Supabase Dashboard → Database → Connections
```

---

## 6. PRISMA CONNECTION MANAGEMENT

### 6.1 Lifecycle Hooks (MANDATORY)

```typescript
// apps/api/src/main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // MANDATORY: Prevent orphan connections on redeploy
  app.enableShutdownHooks();

  await app.listen(3000);
}
```

### 6.2 Connection Pool Configuration

```
# DATABASE_URL format (Transaction pooler; host exacto de Supabase -> Connect):
postgresql://postgres.<PROJECT_REF>:<URL_ENCODED_PASSWORD>@<POOLER_HOST>:6543/postgres?pgbouncer=true&connection_limit=5

# DIRECT_URL format (Session pooler, migrations only):
postgresql://postgres.<PROJECT_REF>:<URL_ENCODED_PASSWORD>@<POOLER_HOST>:5432/postgres
```

**Rules:**
- `DATABASE_URL` = Runtime queries (always use pooler)
- `DIRECT_URL` = Migrations only (Session pooler o Direct Connection; sin `pgbouncer=true`)
- `connection_limit=5` = Maximum 5 Prisma connections per API instance

### 6.3 Thundering Herd Prevention

Cuando 50+ tablets wake up at 8:00 AM simultaneously:

1. **Batch endpoints** (`/fleet/track-batch`, `/analytics/batch`) — NOT individual inserts
2. **Throttle guards** — 500 req/min on sync endpoints
3. **PostgREST bypass** — Mobile gateway can INSERT directly to Supabase via REST API (RLS-protected anonymous INSERT)

---

## 7. DISASTER RECOVERY

### 7.1 VPS Total Failure

```bash
# 1. EasyPanel restores from Docker images automatically on VPS reboot
# 2. Verify all services are up:
curl -s https://tad-api.rewvid.easypanel.host/api/health
curl -s https://tad-dashboard.rewvid.easypanel.host/

# 3. If DB is unreachable:
# - Check Supabase Dashboard for connection status
# - Verify DATABASE_URL and DIRECT_URL secrets are correct
# - Restart tad-api container
```

### 7.2 Database Failure

```bash
# Supabase handles automatic failover
# If prolonged outage:
# 1. Google Sheets backup: GET /api/v1/sheets/report
# 2. Tablets continue offline playback (48-hour JWT TTL)
# 3. Mobile gateway buffers GPS in localStorage
# 4. On DB recovery: Auto-sync from buffers
```

### 7.3 Single Service Failure

| Scenario | Recovery |
| --- | --- |
| tad-api down | EasyPanel auto-restart. Tablets play offline. GPS buffered. |
| tad-dashboard down | Admin portal unavailable. API + tablets unaffected. |
| tad-remotion down | Video generation fails. Existing campaigns unaffected. |
| Supabase down | All portals read-only. Tablets play cached content. GPS buffered locally. |

---

## 8. DEPLOY CHECKLIST

### 8.1 Pre-Deploy (Before pushing to main)

- [ ] All tests pass (`npm run test`)
- [ ] E2E critical flow passes (`npx playwright test critical-flow`)
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] No ESLint errors (`npm run lint`)
- [ ] Prisma schema validated (`npx prisma validate`)
- [ ] Migration tested locally (`npx prisma migrate dev`)
- [ ] Secrets updated in EasyPanel if new env vars added
- [ ] RAM limits verified in EasyPanel per service

### 8.2 Post-Deploy (After EasyPanel auto-deploy)

- [ ] Health check responds 200 on all services
- [ ] Admin login works (`admin@tad.do`)
- [ ] API responds: `curl https://tad-api.rewvid.easypanel.host/api/v1/health`
- [ ] No 5xx errors in first 5 minutes
- [ ] Memory usage < 80% of limit per container
- [ ] Prisma connections < 5 per instance
- [ ] Tablet test device syncs successfully

### 8.3 Financial Deploy (Additional checks for payroll/subscription changes)

- [ ] Wallet balance unchanged for existing drivers
- [ ] Kill-Switch logic verified with test device
- [ ] Payroll calculation produces same results as before
- [ ] Idempotency keys table accessible
- [ ] Financial transaction ledger intact

---

## 9. ENVIRONMENT MATRIX

### 9.1 Development (Local)

| Setting | Value |
| --- | --- |
| `NODE_ENV` | `development` |
| `DATABASE_URL` | Local PostgreSQL or Supabase test project |
| `NEXT_TELEMETRY_DISABLED` | `1` |
| `NODE_OPTIONS` | Not restricted (full heap) |

### 9.2 Staging (EasyPanel Internal)

| Setting | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Supabase staging project pooler |
| `NEXT_TELEMETRY_DISABLED` | `1` |
| `NODE_OPTIONS` | `--max_old_space_size=256` |

### 9.3 Production (EasyPanel Live)

| Setting | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Supabase production pooler (6543) |
| `DIRECT_URL` | Supabase direct (5432) |
| `SUPABASE_SERVICE_ROLE_KEY` | Production service role key |
| `NEXT_TELEMETRY_DISABLED` | `1` |
| `NODE_OPTIONS` | `--max_old_space_size=512` (API) / `256` (Frontend) |

---

## 10. LOGGING & OBSERVABILITY

### 10.1 Structured Logs

```typescript
// LoggerMiddleware applies to ALL routes
// Format: { timestamp, method, path, statusCode, durationMs, userAgent }
```

### 10.2 SystemError Table (SRE Audit)

All operational failures MUST be logged to `SystemError`:

| Source | Severity Examples |
| --- | --- |
| `EMAIL` | SMTP failure, template missing |
| `WALLET` | Balance inconsistency, withdrawal failure |
| `TELEMETRY` | GPS batch parse error, PostGIS failure |
| `DEVICE` | Heartbeat parse error, sync manifest crash |
| `SYNC` | Playlist generation failure, hash mismatch |

### 10.3 Log Aggregation

- **EasyPanel**: Built-in container logs (per service)
- **Sentry**: Error tracking via `SentryInterceptor` (NestJS)
- **Supabase Dashboard**: Database query performance monitoring

---

## 11. SCALE OPERATIONS

### 11.1 Adding a New Service

```bash
# 1. Create app in EasyPanel
# 2. Configure Git repository + branch
# 3. Set secrets
# 4. Configure memory/CPU limits
# 5. Set health check path
# 6. Deploy and verify
```

### 11.2 Vertical Scaling (VPS Upgrade)

When the VPS can no longer handle the load:

1. Upgrade VPS plan (more RAM/CPU)
2. Increase container limits proportionally
3. Keep `connection_limit=5` per Prisma instance (Supabase free tier constraint)
4. Consider Redis for BI snapshots if Postgres latency increases

### 11.3 Horizontal Scaling (Multiple API Instances)

> **Current limitation**: EasyPanel on single VPS doesn't support horizontal scaling natively.

For horizontal scaling:
1. Move to Kubernetes or multi-VPS setup
2. Ensure `IdempotencyKey` table handles concurrent requests
3. Use Redis for session/cache sharing between instances
4. Load balancer between multiple `tad-api` instances

---

## 12. TROUBLESHOOTING QUICK REFERENCE

| Problem | Symptoms | Fix |
| --- | --- | --- | --- |
| **OOM Kill** | Container restarts unexpectedly, `docker logs` shows `OOMKilled` | Reduce `max_old_space_size`, check for memory leaks, add more RAM limit |
| **MODULE_NOT_FOUND** | Build fails, container exits immediately | Check Dockerfile COPY paths, verify `npm install` ran, clear node_modules cache |
| **Prisma Connection Exhaustion** | API returns 500, Supabase shows max connections | Verify `connection_limit=5`, add `pgbouncer=true`, check `enableShutdownHooks()` |
| **Build Timeout** | EasyPanel build exceeds 10 min | Optimize Dockerfile (multi-stage), reduce dependencies, use `.dockerignore` |
| **CORS Error** | Frontend can't reach API | Verify `NEXT_PUBLIC_API_URL`, check NestJS CORS configuration |
| **402 Kill-Switch** | Tablet shows blank screen | Check `subscriptionPaid` status, verify `SubscriptionGuard` logic |
| **SWC Binary Error** | Build fails with `.next/server/chunks` error | Clear `.next` cache, rebuild with `NODE_ENV=production` |
| **Nixpacks Build Failure** | EasyPanel can't detect framework | Add custom `Dockerfile` to app directory |

---

## 13. CORS CONFIGURATION — Production & Dev

The NestJS API (`main.ts`) configures CORS with the following allowed origins:

```typescript
// apps/api/src/main.ts
app.enableCors({
  origin: [
    'http://localhost:3002',    // Admin (dev)
    'http://localhost:3003',    // Advertiser (dev)
    'http://localhost:3004',    // Driver (dev)
    'https://tad-dashboard.rewvid.easypanel.host',
    'https://tad-advertiser.rewvid.easypanel.host',
    'https://tad-driver.rewvid.easypanel.host',
    process.env.CORS_ORIGIN,    // Additional origin override
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
});
```

**Environment Override:** Set `CORS_ORIGIN` in EasyPanel secrets to add additional domains (e.g., custom domains, staging URLs).

**⚠️ Common Issue:** Frontend CORS errors usually mean `NEXT_PUBLIC_API_URL` is set incorrectly. Must match exact EasyPanel domain: `https://tad-api.rewvid.easypanel.host`.

---

## 14. CI PIPELINE STATUS — Honest Assessment

> **⚠️ REALITY:** No CI/CD pipeline exists. The `.github/workflows/` directory is empty. EasyPanel auto-builds on every push to `main` with **zero quality gates**.

**Current flow:**
```
Developer → git push main → EasyPanel auto-build → Container → Health check → Live
            (NO lint gate, NO test gate, NO build verification)
```

**Recommended minimum CI pipeline (TODO):**
1. `npm run lint` — 0 ESLint errors
2. `npx prisma generate` — Client regenerated
3. `npm run build` — TypeScript compiles
4. `npm run test:e2e` — Critical path E2E passes
5. Deploy only if all gates pass

---

## 15. API SHUTDOWN HOOKS

`main.ts` calls `app.enableShutdownHooks()` which ensures:
- Prisma `$disconnect()` runs on SIGTERM/SIGINT
- No orphaned DB connections in Supabase
- Clean container restart on EasyPanel redeploy

**Important:** EasyPanel sends SIGTERM on redeploy. The container has 30s to gracefully shut down before SIGKILL.
