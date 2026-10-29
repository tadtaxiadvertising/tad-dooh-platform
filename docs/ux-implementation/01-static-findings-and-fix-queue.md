# Hallazgos de implementación UX/UI — revisión estática

Fecha: 2026-10-29. Rama: `docs/ux-parallel-contract-audit-20261029`. Sin pruebas runtime.

## P1 — Doble contrato de registro de conductor
- `apps/driver/pages/register.tsx`: `POST /api/proxy/auth/driver/register`, campos `name,phone,password,vehicleModel,licensePlate`.
- `apps/driver/pages/driver/onboarding.tsx`: `api.post("/drivers")`, campos `fullName,phone,cedula,taxiPlate,password,contractAccepted,agreementVersion,subscriptionPaid,representativeAccepted,hardwareLiabilityAccepted,membershipAccepted`.
- Impacto: refactorizar ambos como un único wizard puede romper DTOs, aprobación y condiciones legales.
- Acción: rastrear `@tad/services`, endpoints NestJS, DTOs y middleware; definir flujo canónico con evidencia antes de cambiar la UI. Probar cada ruta de forma independiente.

## P1 — Finalización de onboarding anunciante sin comprobar HTTP
- `apps/advertiser/pages/advertiser/onboarding.tsx`, `handleOnboardingComplete`: espera `fetch` pero no comprueba `response.ok`; luego borra `tad_adv_pending_onboarding_id`. El `catch` es silencioso y la navegación ocurre incluso si el servidor devuelve 4xx/5xx.
- Impacto: el usuario puede interpretar onboarding completado cuando backend lo rechazó; pérdida de referencia local para reintento.
- Acción propuesta: comprobar respuesta HTTP, conservar ID en fallos, mostrar error y permitir retry, sin reejecutar registro ni duplicar entidades. Verificar idempotencia del endpoint antes de automatizar retries.

## P2 — Simulación de flota no respaldada por inventario vivo
- `apps/advertiser/pages/advertiser/planner.tsx`: `simulateImpactDetailed(budget, city, city === "Santo Domingo" ? 120 : 45)`.
- Impacto: los valores 120/45 pueden parecer unidades reales; la página dice que utiliza datos históricos de telemetría.
- Acción: comprobar fuente y contrato de simulación. Si no hay fuente verificable, etiquetar explícitamente como supuesto ilustrativo; no describir unidades como disponibles ni prometer alcance.

## P2 — CTA sin comportamiento
- `apps/advertiser/pages/advertiser/planner.tsx`: botón “Comenzar Campaña Ahora” sin `onClick` ni enlace.
- Acción: verificar destino autorizado (ruta de creación de campaña), usar `next/link` con destino real y test de navegación. No inventar ruta.

## P2 — Build ignora TS/ESLint
- `apps/driver/next.config.ts` y `apps/advertiser/next.config.js` configuran `ignoreBuildErrors: true` e `ignoreDuringBuilds: true`.
- Acción: gates explícitos de typecheck y lint. No cambiar configuración global hasta medir baseline y resolver bloqueos.

## Próxima iteración segura
1. Leer DTOs y endpoints reales del API.
2. Localizar ruta canónica de creación de campañas.
3. Preparar tests de regresión de error HTTP en `/complete`.
4. Proponer PR pequeño para corrección de `handleOnboardingComplete` después de confirmar semántica backend.

## Estado
Hallazgos confirmados mediante lectura de código; impacto potencial, no reproducido en producción. No se ha aplicado fix.
