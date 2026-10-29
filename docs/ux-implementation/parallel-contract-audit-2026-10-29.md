# TAD UX/UI — Auditoría paralela de contratos (2026-10-29)

## Alcance y aislamiento
Rama documental independiente `docs/ux-parallel-contract-audit-20261029`. No modificar código de interfaces, contratos API, base de datos, Service Workers ni `main`. Hallazgos basados en lectura estática; no se han ejecutado builds, tests ni llamadas de producción.

## Evidencia confirmada
- `apps/driver/pages/register.tsx` envía `POST /api/proxy/auth/driver/register` con `name`, `phone`, `password`, `vehicleModel` y `licensePlate`. `confirmPassword` es validación local. El formulario bloquea el botón durante la petición y muestra estado pendiente de aprobación/pago.
- `apps/advertiser/pages/advertiser/onboarding.tsx` llama a `/api/proxy/onboarding/advertiser` y a `/api/proxy/onboarding/advertiser/{advertiserId}/complete`. Inspeccionar cuerpos, método HTTP, validación y estados de error antes de refactorizar.
- `apps/driver/pages/driver/onboarding.tsx` importa `@tad/services`; aparece `subscriptionPaid: false`. No sustituir este flujo por una activación UI optimista.
- `apps/advertiser/pages/advertiser/planner.tsx` no muestra llamadas directas `fetch` o `axios` en la inspección inicial; rastrear componentes y cálculos delegados.
- `apps/advertiser/next.config.js` redirige `/` a `/login`, por lo que editar `apps/advertiser/app/page.tsx` no garantiza una landing visible.
- `apps/driver/next.config.ts` mantiene registro PWA deshabilitado en next-pwa para preservar el Service Worker canónico. No cambiar.
- Ambos portales ya utilizan Tailwind v4 con `@theme` en `styles/globals.css`; Framer Motion ya está instalado.
- `packages/ui/components/` contiene piezas existentes como `AntigravityButton`, `ComingSoonScreen`, `PaymentLockOverlay`, `StatusSemaphore` y `TADLogo`. Inspeccionar antes de crear duplicados.

## Riesgos y verificaciones prioritarias
1. **P1 — Contratos de registro:** verificar DTO NestJS y proxy local; probar 400, 409, 500, error de red y doble envío con mocks.
2. **P1 — Onboarding anunciante:** registrar payload exacto de ambos endpoints y verificar idempotencia antes de dividirlo en pasos.
3. **P1 — Activación conductor:** mantener estado pendiente y kill-switch; verificar que el rediseño no cambie `subscriptionPaid` ni lógica de compensación.
4. **P1 — Routing:** capturar matriz de rutas pública/autenticada y verificar middleware antes de alterar redirects.
5. **P2 — UI compartida:** verificar exportaciones desde `packages/ui/components/index.ts` y compatibilidad de ambas apps.
6. **P2 — QA:** typecheck y lint explícitos porque ambos `next.config` ignoran errores de build de TS/ESLint.

## Matriz mínima de pruebas para Codex
| Flujo | Caso | Resultado esperado |
|---|---|---|
| Driver register | Contraseñas distintas | Sin llamada API; error accesible |
| Driver register | Envío doble | Una petición activa |
| Driver register | 400/409/500 | Mensaje seguro; formulario conserva datos |
| Driver register | Éxito | Mensaje pendiente, sin activación automática |
| Driver wizard | Retroceder/avanzar | Datos conservados sin guardar contraseña en localStorage |
| V12 | Ads 0, 1, 15, 16 | Límite efectivo 15 |
| V12 | CPA negativo/no entero | Validación o normalización segura |
| Advertiser onboarding | Error API | Sin marcar onboarding completado |
| Advertiser routing | Ruta raíz y login | Redirecciones acordes con middleware |
| Driver offline | Reconexión | Sin pérdida de cola ni duplicación |
| Shared UI | Cambios de tokens | Sin regresiones en driver/advertiser |

## Handoff
El ejecutor debe inspeccionar los DTOs y componentes reales antes de implementar. Este documento no afirma que los endpoints hayan sido probados. Integrar mediante cherry-pick o copia selectiva de documentación tras revisar conflictos. No hacer merge automático.
