# Regression Tests — Recovery 2026-10-14

## Pruebas de Regresión Añadidas

| Fichero | Defecto Prevenido |
|---------|-------------------|
| `apps/api/jest.config.js` | Mapeo de `@tad/impact-calculator` ilegal; ts-jest warn con `dist/`; harness personalizado que destruye el worker |
| `packages/impact-calculator/__tests__/index.test.ts` | `process.exit()` que rompe el worker de Jest |

## Defectos Prevenidos

| Defecto | Hallazgo Original | Corrección |
|---------|-------------------|------------|
| Módulo `@tad/impact-calculator` no encontrado | `campaign.service.spec.ts` fallaba por `moduleNameMapper` apuntando a `apps/api/packages/` | `<rootDir>/../../packages/$1` |
| ts-jest transformando JS en `dist/` | Advertencias ts-jest sobre `index.js` en `packages/impact-calculator/dist/` | `transformIgnorePatterns` añadido |
| Worker de Jest se estrellaba | `process.exit(0)` en harness personalizado (`index.test.ts`) | Removido `process.exit()`; `throw new Error` |
| ESLint 9 flaky | `eslint.config.mjs` declarado en api, ESLint 8 instalado | Archivo eliminado; `.eslintrc.js` heredado |

## Métrica de Calidad

- **Intentos de regresión:** 4 suites críticas (verified-metrics, qr-scan, conversation, commission)
- **Resultados:** 4/4 pasan ahora
- **Pruebas de regresión demostrables:** sí (fallaban pre-fixes, pasan post-fixes)

## Suits de Cobertura Restante

| Flujo | Prueba Pendiente |
|-------|------------------|
| A. Driver onboarding | Prueba unitaria de KYC/identidad |
| B. Campaign creation | Pruebas de asignación de inventario |
| C. Tablet/player startup | E2E o unitario de inicialización |
| D. Playback telemetry | Prueba verificada de impresión |
| E. Offline event queue | Prueba de sincronización y reenvío |
| F. Wallet ledger | Reintento idempotente de webhook |
| G. Auth/ownership | Prueba de acceso no autorizado |
| H. Reporting | Consistencia con eventos fuente |
