# 07. Backlog de remediación

## P1 — Alta prioridad

### TAD-QA-001: 59 errores de tipo en apps/api
- **Descripción:** Errores de TypeScript que impiden `tsc --noEmit` y `nest build`
- **Impacto:** Build falla, no se puede desplegar
- **Status:** Pendiente de corrección
- **Criterio de aceptación:** `tsc --noEmit` exitoso en apps/api

## P2 — Prioridad media

### TAD-QA-002: Timeout en lint
- **Descripción:** `pnpm lint` no termina en 180s
- **Impacto:** No se puede verificar calidad estática
- **Status:** Pendiente de ejecución en background

### TAD-QA-003: Build falla por errores de tipo
- **Descripción:** Build falla porque typecheck falla
- **Impacto:** No se puede desplegar
- **Status:** Pendiente de corregir errores de tipo

---

**Verificado:** 2026-10-17
