# SECURITY GATE — Onboarding de anunciantes

Fecha: 2026-10-29. Estado: **P1 ALTO / potencial P0**, pendiente de evaluar exposición y privilegios de `ACTIVE`. Evidencia: inspección estática del código, sin prueba ofensiva.

## Evidencia
- `apps/api/src/modules/onboarding/onboarding.controller.ts`: `@Public()` en `POST /onboarding/advertiser/:id/complete`. El controlador entrega el parámetro `id` directamente al servicio, sin comprobación visible de identidad, propiedad o rol.
- `apps/api/src/modules/onboarding/onboarding.service.ts`: `completeOnboarding(advertiserId)` busca anunciante y actualiza `status: "ACTIVE"`; no valida pago, revisión o identidad.
- `apps/advertiser/pages/advertiser/onboarding.tsx`: el frontend llama a ese endpoint tras el registro, sin comprobar `response.ok`, elimina el ID pendiente y navega al login aun en fallos HTTP.

## Impacto probable
Cambio no autorizado de estado de terceros mediante identificadores conocidos (IDOR / Broken Function Level Authorization). La gravedad exacta depende de permisos asociados a `ACTIVE` y exposición del endpoint.

## Instrucción de bloqueo para Codex/Hermes
**No implementar el simple retry del frontend ni mantener activación pública por ID.** Primero confirmar semántica de estados y autorización con dueño del producto. No intentar reproducir sobre cuentas reales ni producción.

## Remediación propuesta (requiere revisión de contratos)
1. Definir estado permitido al completar el wizard (por ejemplo, permanecer `PENDING_REVIEW` si requiere aprobación), según reglas reales.
2. Exigir sesión autenticada con ownership verificado o token de onboarding de uso limitado validado en servidor. Si la transición a `ACTIVE` es administrativa, exigir rol administrativo y comprobación de requisitos.
3. Validar transición de estado con máquina de estados en backend; rechazar saltos no autorizados. Preservar idempotencia.
4. Implementar error seguro y retry controlado en frontend solo tras corregir backend.
5. Tests: sin auth 401/403; ID de otro anunciante 403; estado no permitido 409/403; flujo autorizado 2xx; repetición idempotente; auditoría de cambios.
6. Registrar actor, estado anterior, nuevo estado y correlation ID sin datos sensibles.
7. Verificar qué rutas usan `ACTIVE` antes de cambiar su semántica.

## Restricción operativa
No desplegar ni fusionar cambios UX relacionados con finalización de onboarding hasta superar este gate de seguridad.

## Estado
EVIDENCIA CONFIRMADA EN CÓDIGO. Sin fix aplicado; no verificado en runtime.
