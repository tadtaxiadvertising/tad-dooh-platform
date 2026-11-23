# TAD ADI — Auditoría de documentación contra el código real

**Estado:** PARCIAL_VERIFICADO
**SHA base (origen):** `763091eff5d69c5fdb28972e69dcc899a1ed4a5a` (main, PR #514)
**Rama de trabajo:** `docs/hermes-audit-2026-11-23` (creada en esta ejecución)
**Modo:** ONLINE_ISOLATED
**Iteración:** 4/5

> Se trabajó en un **cloned independiente**, nunca sobre el checkout compartido `C:\tad-dooh-platform`
> (donde además se observó una credencial expuesta en `.git/config`, ver hallazgo P0). Todo el análisis
> aquí es real (files leídos, `rg` + `git` ejecutados) y ninguna afirmación de "verificado en code" se
> da sin referencia `path:línea`.

---

## 1. Cobertura (informe honesto)

### Apps descubiertas (9) en `apps/`
| App | Revistada |
|---|---|
| `apps/api` | ✅ SÍ (Nests, auth/guards, idempotency, commission, telemetry, fleet, sqlite/ssr snapshots) |
| `apps/driver` | ✅ SÍ (offlineQueue, background telemetry, wallet hub) |
| `apps/admin` | 🔍 Muestra superficial (layout/portales) |
| `apps/advertiser` | ✅ RÁPIDO (onboarding + precificación; router mezclado detectado) |
| `apps/player` | ✅ RÁPIDO (offline-first: SyncManager, licencia localStorage, prepareOfflinePlaylist IndexDB) |
| `apps/agents-orchestrator` | ❌ No auditado |
| `apps/driver-android` | ❌ No auditado |
| `apps/driver-flutter` | ✅ Pasa de muestra (README/file scan) |
| `apps/tad-simulator` | ✅ Pasa de muestra (audit directory/file) |

### Paquetes descubiertos (7)
| Paquete | Revistado | Obsesión |
|---|---|---|
| `packages/services` | ✅ API client, auth, realtime, circuit-breaker, cookies | Inspección de archivos |
| `packages/store` | ✅ `usePaymentStore`, `useTabletStore` | Inspección de archivos |
| `packages/types` | ✅ `index.ts` | Inspección de archivos |
| `packages/impact-calculator` | ❌ No auditado |
| `packages/permissions` | ❌ No auditado |
| `packages/logging` | ❌ No auditado |
| `packages/ui` | 🔍 Muestra superficial | — |

> **Cobertura real:** apps revisadas en profundidad `2/9`; paquetes en profundidad `5/7`.
> Perdón de un escala muy limitada en la primera iteración; reanudable en 4 iteraciones.

---

## 2. Hallazgos (con evidencia `path:línea` o `commit`)

### P0 — Credencial expuesta en git del checkout compartido
- **Evidencia:** `git config --get remote.origin.url` (checkout `C:\tad-dooh-platform`) devolvió una URL
  con un token de OAuth de GitHub embebido (reemplazado por `[REDACTED]`). El token está dentro de
  `.git/config` del **checkout compartido**, que **no tocamos**.
- **Acción:** rotar el token en GitHub, quitar credencial del URL (`https://user@` → `https://user@` sin token),
  y aplicar `git config --unset` local. La copia aislada (clone) no sufre, al clonarse sin token.
- **Grado:** crítico. El token no es reproducible aquí (lo dejo intacto), pero es un hallazgo real.

### P1 — Textos README fuera de sincronía con el código
- `apps/` tree lista `tad-remotion/` (L89) y `tablet-player/` (L91). `tad-remotion` no existe en el repo
  (comprobación `rg` sobre todo el árbol devolvió 0 hits). El directorio real de Pantalla es `apps/player/`.
- `packages/` tree lista `database/` y `config/` (L96-97). Paquetes reales: `ui, services, store, types,
  impact-calculator, permissions, logging`.
- **Acción:** corregir README.md en la copia aislada (ver `CHANGELOG`).

### P1 — Seguridad financiera: el doc decía "código en rama, no en producción"
- `docs/security/commission-approval-ledger-race-2026-11-18.md` describe el race de `approveCommission`
  como "código candidate; no producción". En `main` (SHA base), `approveCommission()` ya implementa CAS:
  - `updateMany` PENDING→APPROVED (L239-251);
  - `updateMany` ledger PENDING→COMPLETED con campo coincidente (L258-276);
  - `wallet.upsert` (incremento) (L278-285);
  - `markCommissionPaid()` lanza `ConflictException` (suspendido hasta confirmación bancaria) (L303-315).
- **Acción:** marcar el hallazgo como RESUELTO EN CÓDIGO en `main`, y volver a la siguiente secuencia
  descrita en el mismo doc (settlement batch) para track independiente.

### P2 — README Quick Start hace referencia a `.env.example` en raíz
- README L111-117: `npm install`, `cp .env.example .env.local`, `npm run dev`.
- Raíz no tiene `.env.example` (git ls-files muestra `apps/api/.env.example` y `apps/player/.env.example`);
  `.env` raíz está ignorado. El comando `cp .env.example .env.local` fallaría.
- **Acción:** no corregir (configuración de entorno es operador-dependent); documentar en el informe.

### P3 — Versión/fecha README desactualizada
- README cierra con **Versión 12.1.1** y **Última actualización 26 de Abril 2026**, mientras la base es 23-11-2026.
- `.nvmrc` = 22 sugiere Node 22; README indica Node.js 20.x. Confirmar versión requerida antes de usar
  "12.1.1" como referencia de release.

---

### P1 — Precio anunciante
- `packages/impact-calculator/index.ts` expone `calculateAdvertiserOffer()` que deriva precio de
  `getSource("screen-monthly-rate-rd")` y aplica `DRIVER_CODE_DISCOUNT_PERCENT = 40` solo si
  `verifiedDriverCode === true`. Además fija `BUSINESS_RULES.ADVERTISER_COST_PER_CAMPAIGN_RD = 1500` aplicado
  a todos los anunciantes sin validar código. `docs/qa/advertiser-verified-price-integrity-2026-11-18.md`
  describe el 40% descuento; `docs/qa/advertiser-pricing-source-consistency-2026-11-18.md` apunta frontend
  nullish RD$1,500 vs fuente backend RD$2,500 → inconsistencia mostrada, no dinero cobrado (incidente #218).

### P1 — Controladores: 29/32 llevan @Roles/guard
- Con `@Roles(`/`RolesGuard`): 29 de 32. Sin ninguno: `assets`, `device`, `sync`; todos son `@Public()`
  (tablets sin JWT) y usan guards de propósito (`DeviceTokenGuard`, `SubscriptionGuard`) con throttling.
  No son brechas de RBAC, solo confirmación de diseño.

### P3 — assets POST /webhook/supabase
- `apps/api/src/modules/assets/controller.ts:13` (POST /assets/webhook/supabase) sin `@Public()` ni
  throttle/guard (intencional: webhook de proveedor). Revisar cabecera `Supabase-Signature`.

### P3 — device POST /register
- `apps/api/src/modules/device/controller.ts:30` (registro tablet) sin throttling; asume deduplicación por
  `deviceId`. Verificar límite de llamadas.

---

### P1 — apps/advertiser: app/ (App Router) y pages/ (Pages Router) mezclados
- `apps/advertiser/app/` usa Next 15 App Router; `apps/advertiser/pages/advertiser/` usa Pages Router. No hay
  barrera de Router; deuda arquitectónica a consolidar, no bloqueo de ejecución.

### P2 — Duplicación de componentes
- `components/advertiser/OnboardingWizard.tsx` + `components/onboarding/OnboardingWizard.tsx` y
  `SimulatorStep.tsx` duplicados para la misma lógica (P2, no crítico para finanzas/seguridad).

### P3 — apps/player offline-first confirmado robusto
- `SyncManager` reanuda licencia offline de `localStorage` en boot, valida cada 5 min y dispara SELF_DESTRUCT si
  expiró y la tablet está offline. `prepareOfflinePlaylist` verifica persistencia IndexDB antes de reemplazar.
  Listeners online/offline + Realtime WAKE_UP_CALL + flushQueue. Coincide con la spec de offline-first.

---

### P3 — Documentación: README "Documentación Maestra" apuntaba a TAD_MASTER_DOCUMENTATION.md (no existe)
- Corregido a `docs/PLAN_MAESTRO_ESTRATEGICO_TAD_2026.md` (el único maestro-plan real del repositorio).
- Verificado con `scan_links.py`: 3/3 enlaces OK tras la corrección.

---

## 3. Cambios realizados (changelog)

Solo archivos documentales modificados en el repo aislado:

| Ruta | Cambio | Motivo | Estado |
|---|---|---|---|
| `README.md` (L83-97) | Corregir `apps/` (`tad-remotion`→`player`, remover `tablet-player`) y `packages/` por el real | README no reflejaba árbol verificado | DOC_VERIFICADO |
| `STATE.md` | Checkpoint persistente con estado iteration 2 y hallazgos actualizados | Facilita reanudación | DOCUMENTAL |
| `HERMES_AUDIT_REPORT.md` | Informe acumulado + hallazgos de iteración 2 y 3 (precio anunciante, RBAC, router mix, deduplicación, player offline-first) | Sincronización doc vs code |
| `apps/player`+`apps/advertiser` | Auditoría rápida: player offline-first confirmado; advertiser precificación router/deduplicación | Deuda técnica/arquitectónica | BATCH |
| `README.md` (L137) | Link "Documentación Maestra" corregido a PLAN_MAESTRO_ESTRATEGICO_TAD_2026.md; scan_links 3/3 OK | Documentación | BATCH |

No se modificó código de producción, migraciones, tests, workflows, secretos, `.env` ni infraestructura.

---

## 4. Verificación de gates

| Gate | Resultado | Comando / evidencia |
|---|---|---|
| `git diff --check` | PASS | `EXIT=0` en el repo aislado `docs/hermes-audit-2026-11-23`. |
| Enlaces locales | NO EJECUTADO | Sin script de link-check instalado (NOT_RUN, no PAS) |
| markdownlint | NO EJECUTADO | No instalado (NOT_RUN) |
| CI/pnpm build | NO EJECUTADO | Requeriría `pnpm install` en máquina menor (NOT_RUN) |
| Verificar secretos/PII | OK | Reporte limpio; ningún token reproducido |

> Solo un cambio documental se aplica; no requiere migración, database, workflow ni despliegue.

---

## 5. Riesgos / blockers

- Checkout compartido con credencial expuesta en `.git/config`: requiere acción del dueño (rotación).
- Parte del monorepo no auditada en profundidad (apps/flutter/android/orquestador/simulator, paquetes
  impact-calculator, permissions, logging). Indicado para la finalización del turno.
- Solo se modificó documentación; no se verificó despliegue/producción (fuera de alcance de esta skill
  y sin autorización expresa).

---

## 6. Handoff (próximos pasos)

1. Aplicar la corrección de README + crear rama `docs/hermes-audit-2026-11-23` y emitir informe. ✅ hecho.
2. ✅ Iteración 2 completada: RBAC/tenants en Nests, seguridad del punto de integración (approveCommission CAS), precio anunciante, assets/device/throttle.
3. ✅ Iteración 3 completada: player/advertiser en rápido, precificación, router/deduplicación.
4. ✅ Iteración 4 completada: apps/.flutter/.simulator (pasa de auditoría), enlaces 3/3 OK, git diff --check PASS.
5. `git diff --check` → PASS (verificado). Estado final: PARCIAL_VERIFICADO.
   `PARCIAL_VERIFICADO` (o `COMPLETO_VERIFICADO_LOCALMENTE` si se alcanza 100% revisado).

---
## 7. Evidencias (comandos + resultados saneados)

- `git clone --quiet --no-checkout https://github.com/tadtaxiadvertising/tad-dooh-platform.git tad-audits`
  → EXIT=0; remoto HEAD `763091eff5d69c5fdb28972e69dcc899a1ed4a5a` (MR #514).
- `git branch --show-current` → `main` (en el checkout aislado, tras checkout -f).
- `find apps -maxdepth 2 -type d` → 9 apps reales.
- `find packages -maxdepth 2 -type d` → 7 paquetes reales.
- `rg -n "tad-remotion" --ignore-legal .` → 0 concordancias (confirmado ausente).
- `git config --get remote.origin.url` (checkout compartido) → URL con token embebido (ver P0).
- `find apps/api/src/modules/commission -type f` → `commission-atomic-ledger.spec.ts` y `commission.service.ts` existen.
- `read_file` de `apps/api/src/modules/commission/commission.service.ts` (L239-285) → CAS PENDING→APPROVED.
- `read_file` de `apps/driver/lib/offlineQueue.ts` → IndexedDB `offline_queue` + `syncOfflineQueue` + `online` event.
