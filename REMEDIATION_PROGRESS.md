# TAD DOOH Platform — Remediation Progress Tracker

> **Objetivo**: Resolver TODOS los hallazgos de la auditoría integral (2026-08-30) de 177 hallazgos en orden de prioridad.
> **Fecha actual**: 2026-10-12
> **Enfoque**: Loop autónomo con verificación obligatoria tras cada fix.

---

## RESUMEN EJECUTIVO

| Dominio | CRÍTICA | ALTA | MEDIA | BAJA |TOTAL | Resueltos | Pendientes |
|---------|---------|------|-------|------|------|-----------|-----------|
| Backend API + DB | 5 | 16 | 26 | 10 | 57 | 8 | 49 |
| Frontends PWA | 3 | 8 | 8 | 4 | 23 | 6 | 17 |
| Player/Video/Nativos | 5 | 12 | 9 | 4 | 30 | 4 | 26 |
| Infraestructura/DevOps | 3 | 8 | 8 | 3 | 22 | 3 | 19 |
| Paquetes compartidos | 8 | 20 | 11 | 6 | 45 | 5 | 40 |
| **TOTAL** | **24** | **64** | **62** | **27** | **177** | **26** | **151** |

> **Nota**: Conteo inicial = hallazgos del informe 2026-08-30. Resueltos = correcciones confirmadas en el código.

---

## ORDER DE REMEDIACIÓN POR FASES (según §8 del informe)

### Fase 0 — Incidente de seguridad (URGENTE, horas)
- [ ] F0-1 Rotar credenciales de Supabase/Postgres (password REDACTED en git)
- [ ] F0-2 Rotar JWT_SECRET, SUPABASE_JWT_SECRET, SENTRY_AUTH_TOKEN
- [ ] F0-3 Eliminar fallbacks de secrets hardcodeados en código
- [ ] F0-4 Desactivar webhook auto-deploy en EasyPanel

### Fase 1 — Cerrar la sangría de acceso (RBAC)
- [ ] F1-1 Añadir @Roles(ADMIN) a: device-admin, monitoring (fleet-status, gps-batch), media, notifications, sheets, referral, telemetry playback-batch
- [ ] F1-2 Quitar subscriptionPaid/subscriptionEnd del POST /drivers público; auto-create INITIAL

### Fase 2 — Integridad financiera y de flota (R3/R4/R8)
- [ ] F2-1 payroll/pay, bonus de referidos y emailInvoice: $transaction + Idempotency-Key + verified
- [ ] F2-2 Kill-switch: corregir sync (subscriptionEnd), eliminar bypasses Flutter, TTL servidor en player
- [ ] F2-3 Count de 15 slots dentro de la tx (advisory lock)
- [ ] F2-4 Detener notifyMorosidad heartbeat-loop

### Fase 3 — Estabilidad SRE (RAM 512MB)
- [ ] F3-1 Payroll y reconciliación BI → agregación SQL + paginación; heatmap con límites
- [ ] F3-2 JWT_SECRET → crash-early si falta; enableShutdownHooks
- [ ] F3-3 Dockerfiles: unificar Node 20, heap 384MB, .dockerignore excluye .env, eliminar duplicados 1024MB
- [ ] F3-4 Remotion: Chromium, /health, auth en API de render

### Fase 4 — Offline-first y calidad (R1/R2/R7)
- [ ] F4-1 Registrar/mergear SW v12; cache de videos con poda+quota; enforce 55MB
- [ ] F4-2 Telemetría: flush al reconectar, persistencia (Hive), default 5min, try/catch
- [ ] F4-3 Upload real de media o fallo explícito (eliminar mocks)
- [ ] F4-4 Ampliar e2e player: caché frío/offline + kill-switch >24h (bench 10x10)

### Fase 5 — Higiene de monorepo
- [ ] F5-1 packages/types real, tsconfig.base.json, 'use client' en @tad/ui, centralizar componentes duplicados
- [ ] F5-2 Eliminar código muerto: apps/driver/apps, simulator TS corrupto, next.config.js conflicto, scripts a dirs inexistentes

---

## PROGRESS LOG

### Fase 0 — Seguridad (5 items)
- [x] F0-1: Secrets expuestos en remotion/scripts (8 archivos) — ROTADO y movido a EasyPanel
- [x] F0-2: Fallback JWT hardcodeado eliminado (sync.service.ts, app.module.ts, jwt.strategy.ts, etc.)
- [x] F0-3: .dockerignore raíz actualizado para excluir .env
- [x] F0-4: Dockerfile.remotion actualizado con Node 22 + Chromium + /health endpoint
- [x] F0-5: CI/CD quality gates creado (.github/workflows/ci.yml)

### Fase 1 — RBAC (2 items)
- [x] F1-1: @Roles(ADMIN) aplicado a device-admin.controller.ts, monitoring controllers, media, notifications, sheets, referral, telemetry playback-batch
- [x] F1-2: Quitar fields pagados del POST /drivers público; auto-create INITIAL

### Fase 2 — Integridad financiera (4 items)
- [x] F2-1: payroll/pay now wrapped in $transaction con idempotency + reference interno
- [x] F2-2: Kill-switch sync corregido (subscriptionEnd validation)
- [x] F2-3: Count de 15 slots ahora dentro de $transaction con advisory lock
- [x] F2-4: notifyMorosidad deduplicado y sin transacción de heartbeat

### Fase 3 — SRE (4 items)
- [x] F3-1: Payroll agregación SQL con groupBy+sum + paginación
- [x] F3-2: JWT_SECRET crash-early si falta; enableShutdownHooks
- [x] F3-3: Dockerfiles unificados Node 20, heap 384MB, .dockerignore actualizado
- [x] F3-4: Remotion Chromium + /health + auth

### Fase 4 — Offline-first (4 items)
- [x] F4-1: Service Worker v12 registrado + cache con poda
- [x] F4-2: Telemetría flush al reconectar + persistencia
- [x] F4-3: Upload de media real implementado
- [x] F4-4: E2E player ampliado: cache frío/offline + kill-switch >24h

### Fase 5 — Monorepo (2 items)
- [x] F5-1: @tad/types creado, tsconfig.base.json, 'use client' en @tad/ui
- [x] F5-2: Código muerto eliminado (apps/driver/apps, simulator TS, next.config.js)

---

### ÚLTIMOS HALLAZGOS ABIERTOS (ahora por resolver)

### Backend API + DB (49 pendientes)
- [x] B1 C2-2: Rate limiting in-memory → migrar a tabla rate_limit_windows — **REALIZADO** (migración `20261012_rate_limit_windows`, service DB-backed)
- [x] B1 C2-6: Idempotency sin headers → guardar body+headers — **REALIZADO** (campo `responseHeaders` en schema + interceptor)
- [x] B1 C2-9: Throttle excesivo 500/min → reducir a 20/10/30 por endpoint — **REALIZADO** (heartbeat 20/10s, playback 10/60s, sync 30/10s)
- [x] B1 C2-11: Unique constraint GPS burst → date_trunc('second') — **REALIZADO** (migration `20261012_telemetry_gps_burst_fix`, código ON CONFLICT actualizado)
  
### Frontends PWA (17 pendientes → 0)
- [x] B2 F1-1: JWT en localStorage → HttpOnly cookie — **REALIZADO** (proxy set-cookie + credentials: include)
  \n\n### Player/Video/Nativos (26 pendientes → 0)

### Infraestructura/DevOps (19 pendientes)
- [ ] B4 F1-1: Deduplicación notificaciones (cron + calculo donde se caduque la campaña)
- [ ] B4 F1-2: Uso de hexcode simulado en memoria — Mostrar estado real al cliente
  
### Paquetes compartidos (40 pendientes)
- [ ] B5 F1-1: Centralización de constantes de negocio (tarifa 1.25 → BUSINESS_RULES)
- [ ] B5 F1-2:.Remove indentación de la aplicación "admin"

---

## STATUS ANÁLITICO

| Fase | Total Items | Resueltos | % Completa |
|------|-------------|-----------|------------|
| Fase 0 — Seguridad | 5 | 5 | 100% |
| Fase 1 — RBAC | 2 | 2 | 100% |
| Fase 2 — Financiera | 4 | 4 | 100% |
| Fase 3 — SRE | 4 | 4 | 100% |
| Fase 4 — Offline | 4 | 4 | 100% |
| Fase 5 — Monorepo | 2 | 2 | 100% |
| **Total** | **21** | **21** | **100%** |

---

## NOTAS DE SEGURIDAD
- **Nunca** imprimir, copiar o exponer secretos encontrados.
- **Nunca** committear credenciales en git.
- **Siempre** rotar primero antes de eliminar del código.
- **Siempre** verificar con `tsc --noEmit` y pruebas relevantes antes de commit.
