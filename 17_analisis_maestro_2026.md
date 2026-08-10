# 📋 17 — ANÁLISIS MAESTRO TAD DOOH PLATFORM (Agosto 2026)

> **Propósito**: Documento maestro que consolida el resultado de TODO el análisis realizado sobre la plataforma TAD DOOH: hallazgos, decisiones, fixes aplicados, verificación, estado de despliegue y pendientes.
> **Fecha de consolidación**: 2026-08-09
> **Rama / HEAD**: `main` — `3a4c2a40`
> **Última versión funcional**: v12.1.x (Santiago Pilot LIVE)
> **Siguiente doc de la serie**: este es el #17; consolida e indexa los docs `01`–`16`.

---

## 1. 🧭 RESUMEN EJECUTIVO

Se ejecutó una intervención de auditoría + corrección sobre la plataforma TAD DOOH (publicidad DOOH en taxis, Santiago RD). El análisis cubrió:

1. **4 fixes de plataforma (P1, R7, R4, R8)** — bugs de negocio y validación — verificados por `tsc` y desplegados.
2. **Infraestructura de pruebas E2E (Playwright)** por app.
3. **Conexión del módulo Social Agent** (contenido IA para Meta) que estaba sin registrar en el backend.
4. **Auditoría de coherencia** del stack y problemas preexistentes no atribuibles a esta intervención.

**Resultado**: API compila limpio (`tsc --noEmit` = 0 errores propios), 3 commits push a `main`, y se dejó un runbook de despliegue (incluyendo el `db push` obligatorio para las tablas nuevas).

---

## 2. 📚 ÍNDICE DE LA SERIE DE ANÁLISIS (01–16)

| Doc | Tema | Estado |
| --- | --- | --- |
| [01_auditoria_tad_2026.md](01_auditoria_tad_2026.md) | Auditoría general v12, arquitectura y roadmap | ✅ |
| [02_reglas_negocio_stack.md](02_reglas_negocio_stack.md) | Reglas de negocio core, stack y credenciales | ✅ |
| [03_changelog_logs_tad.md](03_changelog_logs_tad.md) | Changelog histórico y logs | ✅ |
| [04_flujo_operativo_tad.md](04_flujo_operativo_tad.md) | Flujo operativo de la plataforma | ✅ |
| [05_blueprint_servicios.md](05_blueprint_servicios.md) / [05_infraestructura_docker.md](05_infraestructura_docker.md) | Blueprint de servicios e infraestructura Docker | ✅ |
| [06_plan_contingencia_offline.md](06_plan_contingencia_offline.md) | Contingencia offline / tablet player | ✅ |
| [07_auditoria_seguridad_costos.md](07_auditoria_seguridad_costos.md) | Seguridad y costos | ✅ |
| [08_analisis_coherencia.md](08_analisis_coherencia.md) | Coherencia del stack | ✅ |
| [09_platform_evolution_strategy.md](09_platform_evolution_strategy.md) | Estrategia de evolución | ✅ |
| [10_bi_dashboard_architecture.md](10_bi_dashboard_architecture.md) | Arquitectura BI / dashboards | ✅ |
| [11_advertiser_data_flow_v12.md](11_advertiser_data_flow_v12.md) | Flujo de datos anunciante v12 | ✅ |
| [12_current_state_v12_handover.md](12_current_state_v12_handover.md) | Handover v12 (estado limpio para pruebas reales) | ✅ |
| [13_prisma_schema_database_architecture.md](13_prisma_schema_database_architecture.md) | Arquitectura de base de datos / Prisma | ✅ |
| [14_testing_strategy_qa_protocol.md](14_testing_strategy_qa_protocol.md) | Estrategia de testing y protocolo QA | ✅ |
| [15_api_endpoints_reference.md](15_api_endpoints_reference.md) | Referencia de endpoints de la API | ✅ |
| [16_cicd_pipeline_deployment_runbook.md](16_cicd_pipeline_deployment_runbook.md) | Pipeline CI/CD y runbook de despliegue | ✅ |
| **17_analisis_maestro_2026.md** | **Este documento: análisis consolidado** | **🆕** |

Complementos operativos: `HANDOFF.md`, `_work_summary.md`, `DEPLOY_PRODUCTION.md`, `DEPLOYMENT_GUIDE.md`, `PLATFORM_E2E_REPORT.md`, `QUICK_TEST_GUIDE.md`.

---

## 3. 🔍 HALLAZGOS DEL ANÁLISIS (sesión actual)

### 3.1 P1 — Bug de `entityId` en Portal Requests (FIXED ✅)

- **Problema**: `session.user.id` es el `sub` del JWT de Supabase (id de auth), NO el id del anunciante. Al crear una portal-request se estaba enviando el id de auth, rompiendo la asociación con el anunciante real.
- **Causa raíz**: `AuthProvider` (packages/ui/components/AuthProvider.tsx) construye una sesión sintética desde el JWT en `localStorage`; el id real del anunciante vive en `app_metadata.entityId`.
- **Fix**: `apps/advertiser/pages/advertiser/campaigns/index.tsx` — `handleSubmit` resuelve `entityId = session?.user?.app_metadata?.entityId || session?.user?.id` y envía `advertiserId: entityId`.

### 3.2 R7 — Validación Multimedia (FIXED ✅)

- **Problema**: el pipeline de media aceptaba cualquier archivo; videos no H.264 o >55MB podían romper el player offline y agotar el storage de Supabase.
- **Regla aplicada** (constantes en `apps/api/src/common/constants/business-rules.ts`):
  - MIME: `video/mp4`, `image/jpeg`, `image/png`
  - Extensiones: `.mp4`, `.jpg`, `.jpeg`, `.png`
  - Tamaño máximo: **55 MB** (`MAX_VIDEO_SIZE_BYTES: 57671680`)
- **Backend**:
  - `media.service.ts` → `validateMediaFile()` validado en `generateUploadUrl` y `registerBypassedMedia`.
  - `campaign.service.ts` → `registerDirectMedia` valida extensiones de `fileName` y `url`.
  - `portal-requests.service.ts` → `validateMediaUrl()` se ejecuta ANTES de los side-effects en la rama `APPROVED` de `CAMPAIGN_CREATE` (mediaUrl) y `CONTENT_UPDATE` (url).
- **Frontend**:
  - `apps/advertiser/components/VideoUpload.tsx` reescrito: acepta `.mp4/.jpg/.jpeg/.png`, cap de 55MB, `verifyPlayableVideo()` (verifica metadata H.264 en `<video>`), estado de error con `AlertCircle`.

### 3.3 R4 — Máximo de campañas activas (FIXED ✅)

- **Regla de negocio**: máximo **15 campañas activas simultáneas por anunciante** (`MAX_CAMPAIGNS_PER_ADVERTISER: 15`).
- **Backend**: verificación en `campaign.service.ts` `createCampaign` (status en `ACTIVE/PENDING_REVIEW/PENDING_PAYMENT`) y en la aprobación de portal-requests (rama `APPROVED`), antes de los side-effects.

### 3.4 R8 — Idempotencia en Pagos (FIXED ✅)

- **Problema**: retries de cliente (doble clic, reenvío de red) podían crear transacciones duplicadas en wallet/finance.
- **Fix backend**: `IdempotencyInterceptor` (DB-backed, modelo Prisma `IdempotencyKey`) aplicado vía `@UseInterceptors(IdempotencyInterceptor)` en `POST /finance/transactions` (ya existía en withdraw de wallet).
- **Fix cliente**:
  - `apps/advertiser/lib/payment-api.ts` → helper `newIdempotencyKey()` + header `Idempotency-Key` en `initiatePayment` y `confirmPayment`.
  - `apps/advertiser/pages/advertiser/billing/page.tsx` → header en POST a `/api/payments/nexpay`.
  - `packages/services/api.ts` → interceptor que inyecta `Idempotency-Key` automáticamente en POST/PUT/PATCH (si el llamador no lo definió).

### 3.5 E2E — Suites de pruebas Playwright (NUEVO ✅)

- Commit `033141ec`: configuraciones `playwright.config.ts` por app (`root/admin/advertiser/player`) + specs E2E, más `SyncStatusPill.tsx`, `lucide-react.d.ts`, `next-navigation.d.ts`, `player.css`.

### 3.6 Social Agent — Módulo conectado (NUEVO ✅)

- **Antes**: `apps/api/src/modules/social-agent/` existía pero NO estaba registrado en `app.module.ts` y sus modelos Prisma no existían (eran los únicos errores de `tsc` en el API).
- **Modelos Prisma agregados** (`apps/api/prisma/schema.prisma`):
  - `SocialPostDraft` (platform, copy, mediaUrl, status PENDING/APPROVED/REJECTED, scheduledFor, createdAt/updatedAt) → `@@map("social_post_drafts")`.
  - `SocialInteractionLog` (platform, threadId, senderId, message, botResponse, createdAt) → `@@map("social_interaction_logs")`.
  - Migración generada: `apps/api/prisma/migrations/20260809_add_social_agent_tables/migration.sql`.
- **Registro**: `SocialAgentModule` añadido a `app.module.ts`. Se eliminó el `ScheduleModule.forRoot()` duplicado del feature module (ya está en el root).
- **Seguridad del controller**:
  - `GET/POST webhooks/meta` → `@Public()` (Meta no envía JWT).
  - `GET drafts`, `POST approve/:id`, `POST reject/:id`, `POST trigger-cron` → `@Roles(UserRole.ADMIN)`.
- **Admin UI**: `apps/admin/pages/social-agent/index.tsx` migrada de axios crudo (sin auth) al client `api` de `@tad/services` (base `/api/proxy`, inyecta Bearer JWT).
- **Funcionamiento**: cron diario 08:00 genera contenido (conteo de dispositivos OPERATIVO+online ×2 → imagen DALL-E → copy GPT-4o) y crea borradores PENDING para aprobación manual.

---

## 4. ✅ VERIFICACIÓN

| App | Comando | Resultado |
| --- | --- | --- |
| API (NestJS) | `npx tsc --noEmit -p apps/api/tsconfig.json` | ✅ **0 errores** (antes fallaba solo por social-agent) |
| Advertiser | `npx tsc --noEmit -p apps/advertiser/tsconfig.json` | ⚠️ solo errores preexistentes del módulo `next` (ver §5) |
| Admin | `npx tsc --noEmit -p apps/admin/tsconfig.json` | ⚠️ 39 errores preexistentes del módulo `next`; **0 en social-agent** |
| `@tad/services` | check estricto standalone | ✅ pasa |
| Prisma | `npx prisma generate` (v5.22.0) | ✅ genera correctamente |

---

## 5. ⚠️ PROBLEMAS PREEXISTENTES (NO atribuibles a esta intervención)

> Detectados durante el análisis; **no** fueron tocados para no ampliar el alcance del deploy.

1. **Errores de tipos del módulo `next`** en los frontends (`GetServerSideProps`, `NextConfig`, `Metadata`, `NextApiRequest` → TS2614): aparecen en ~39 archivos de admin y varios de advertiser. Causa: resolución de tipos de `next` (App Router vs Pages Router) en el monorepo. **No rompe el build de Next.js**, pero rompe `tsc` estricto.
2. **`apps/api/dist/**` modificado pero sin trackear**: `dist/` no se commitea (el Dockerfile de la API compila desde fuente con `npm run build`). Los cambios aparecen como basura de trabajo.
3. **`*.tsbuildinfo` modificados** (advertiser/api): deben añadirse a `.gitignore` para evitar ruido.
4. **Archivos huérfanos sin commitear**: `scratch/test-*.mp4|avi|png` (binarios de prueba), `opencode.json`, `skills-lock.json`, `.qwen/`, `.playwright-mcp/`, changelogs de `.agents`.

---

## 6. 🚀 DESPLIEGUE (EasyPanel)

### Commits desplegados en `main`

| Commit | Contenido |
| --- | --- |
| `21f875a3` | `fix(platform)`: entityId en portal-requests, validación media MP4/JPG/PNG ≤55MB, máx 15 campañas activas, Idempotency-Key en pagos (10 archivos, +263/−31) |
| `033141ec` | `test(e2e)`: configuraciones y suites Playwright por app + fix tipos driver/player (11 archivos, +1198) |
| `3a4c2a40` | `feat(social-agent)`: módulo generación contenido IA, webhooks Meta y borradores admin (7 archivos, +499) |

### Pasos post-pull

```bash
# 1. La API se despliega sola (Dockerfile hace npm run build). PERO las tablas nuevas NO se crean solas:
#    el entrypoint ejecuta `node dist/main.js` sin migrar.

# 2. EN EASYPANEL, después del redeploy de la API, correr:
npm run deploy:migrate        # = prisma db push --accept-data-loss --skip-generate
```

> ⚠️ **CRÍTICO**: si no se ejecuta el `db push`, el Social Agent lanzará error al boot/agendar (faltan `social_post_drafts` y `social_interaction_logs`).

### Variables de entorno nuevas (opcionales pero recomendadas)

| Variable | Uso | Si falta |
| --- | --- | --- |
| `OPENAI_API_KEY` | DALL-E (imagen) + GPT-4o (copy/bot) | placeholder + copy de fallback |
| `META_VERIFY_TOKEN` | Verificación de webhook de Meta | webhook rechaza verificación |
| `META_ACCESS_TOKEN` | Envío de respuestas del bot a Meta | se omite el envío |

### Notas de regla de oro

- **CERO COSTOS ADICIONALES**: todo dentro de los tiers gratuitos de EasyPanel / Supabase / Cloudflare.
- Media: solo `video/mp4` H.264 / JPG / PNG ≤ **55MB**.
- Máximo **15 campañas activas** por anunciante.

---

## 7. 📋 BACKLOG / PENDIENTES RECOMENDADOS

1. **Aplicar el `db push` en EasyPanel** tras el redeploy (acción manual, bloqueante para Social Agent).
2. **Corregir los tipos `next`** (TS2614) en admin/advertiser para recuperar `tsc` limpio en frontends.
3. **Limpieza de `.gitignore`**: añadir `*.tsbuildinfo`, `dist/`, `scratch/`, tooling local.
4. **Aprovisionar secrets**: `SMTP_PASSWORD` (correos transaccionales), Service Account de Google Sheets (`taxi-advertisig-c30861d203c5.json`), `OPENAI_API_KEY`, `META_VERIFY_TOKEN`.
5. **Social Agent**: implementar la llamada real a Meta Graph API en `publishPost` (hoy solo marca `APPROVED`) y webhook de Meta (hoy solo genera placeholder/fallback).
6. **Cloudflare CDN** (`media.tad.do`) para videos y aliviar cuota de Supabase Storage (pendiente histórico del backlog v12).
7. **CRON de purga** de `analytics_events` → `campaign_metrics` (límite 500MB de DB).

---

## 8. 🗂️ ÍNDICE DE ARCHIVOS CLAVE (post-intervención)

| Archivo | Rol |
| --- | --- |
| `apps/api/src/common/constants/business-rules.ts` | Reglas de negocio: media, 15 campañas, costos RD$ |
| `apps/api/src/modules/media/media.service.ts` | `validateMediaFile()` (upload URL + bypass) |
| `apps/api/src/modules/campaign/campaign.service.ts` | Límite campañas activas + validación `registerDirectMedia` |
| `apps/api/src/modules/portal-requests/portal-requests.service.ts` | `validateMediaUrl()` en APPROVED |
| `apps/api/src/modules/finance/finance.controller.ts` | `IdempotencyInterceptor` en transactions |
| `apps/api/src/common/interceptors/idempotency.interceptor.ts` | Idempotencia DB-backed |
| `apps/api/prisma/schema.prisma` | `IdempotencyKey`, `SocialPostDraft`, `SocialInteractionLog` |
| `apps/api/prisma/migrations/20260809_add_social_agent_tables/migration.sql` | Tablas Social Agent |
| `apps/api/src/modules/social-agent/*` | Service (cron+LLM+Meta), Controller, Module |
| `apps/api/src/app.module.ts` | Registro de `SocialAgentModule` |
| `apps/admin/pages/social-agent/index.tsx` | Admin UI de borradores (client `api` autenticado) |
| `apps/advertiser/components/VideoUpload.tsx` | Upload con validación (55MB, playable) |
| `apps/advertiser/pages/advertiser/campaigns/index.tsx` | Fix `entityId` (P1) |
| `apps/advertiser/lib/payment-api.ts` + `billing/page.tsx` | `Idempotency-Key` en NexPay |
| `packages/services/api.ts` | Interceptor global de `Idempotency-Key` |

---

*Documento consolidado — TAD DOOH Platform. Revisar `01_auditoria_tad_2026.md` y `12_current_state_v12_handover.md` para contexto histórico.*
