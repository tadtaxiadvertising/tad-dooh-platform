# Fase 01 — Design system

## Objetivo

Crear la mínima capa reutilizable para formularios y estados de proceso sin
reconstruir la UI existente ni añadir dependencias.

## Archivos modificados

- packages/ui/components/TadButton.tsx
- packages/ui/components/TadInput.tsx
- packages/ui/components/TadCard.tsx
- packages/ui/components/TadProgress.tsx
- packages/ui/components/index.ts

## Cambios aplicados

- TadButton: variantes, tamaños táctiles de al menos 44 px, loading con
  aria-busy, foco visible y motion-reduce.
- TadInput: label asociado, generación segura de id, hint/error con
  aria-describedby y aria-invalid.
- TadCard: superficies stitched, padding explícito y activación por teclado
  cuando se usa como interacción.
- TadProgress: barra semántica con valores normalizados, aria-valuenow y
  etiqueta opcional.
- Se reutiliza StatusSemaphore existente; no se duplicaron badges, toasts ni
  dependencias.

## Evidencia

- TypeScript estricto focalizado sobre las cuatro primitivas: PASS.
- ESLint desde la configuración Driver no lintó archivos fuera de su base path;
  se registró como evidencia no aplicable, no como PASS.
- git diff --check: PASS.
- Los errores de TypeScript global de packages/ui siguen siendo los del
  baseline en AuthCallback, AuthProvider, PortalAuth, PortalRequestCenter,
  TopTaxis y UpdatePassword.

## Commit

10ad717a — feat(ui): add accessible shared primitives

## Riesgos remanentes

Las primitivas todavía no se usan en una pantalla de producción. Fase 02 y
Fase 03 deben probarlas en Driver y Advertiser, respectivamente, antes de
considerarlas estabilizadas.

## Estado

IMPLEMENTED_PENDING_VERIFICATION — pendiente de integración en los portales y
de builds frescos después de su consumo.
