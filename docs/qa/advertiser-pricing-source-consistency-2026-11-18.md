# QA / Riesgo comercial — precio unitario ilustrativo vs contrato del backend

Fecha: 18 de noviembre de 2026. Ámbito: landing y onboarding del anunciante.

## Evidencia verificable

El cliente `apps/advertiser/components/advertiser/simulatorPricing.ts` publicaba dos constantes de presentación de **RD$1,500**:

- `SCREEN_MONTHLY_RATE = 1500`
- `PRODUCTION_FEE = 1500`

Los dos componentes de simulación del anunciante usan esas constantes para rotular precios unitarios, pero calculan subtotales usando `estimateCampaign()`, que delega a `@tad/impact-calculator`. Las fuentes actuales de este paquete fijan **RD$2,500/pantalla/mes y RD$2,500 por producción creativa**. Por ejemplo, 3 pantallas × 2 meses: el resultado es RD$15,000 y el rótulo anterior describía RD$9,000. Es una inconsistencia de información comercial, no una prueba de dinero cobrado.

**IMPORTANTE: no hay aún contrato tarifario consolidado.** El backend usa `BUSINESS_RULES.ADVERTISER_COST_PER_CAMPAIGN_RD = 1500`; `system_settings.slotPrice` tiene otra configuración histórica documentada en [issue #218](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/218). NO asumir que el modelo educativo es la tarifa aprobada, ni sustituir precios de producción, contratos, ledger o facturas.

## Cambio mínimo propuesto

1. Derivar los rótulos unitarios del **mismo origen** `getSource('screen-monthly-rate-rd')` y `getSource('creative-production-fee')` usado por `calculateImpact()`. Rechazar fuentes faltantes o no numéricas para evitar un fallback financiero ficticio.
2. Calcular advertencias de vencimiento **sobre las fuentes realmente usadas** por la estimación; `reach-per-screen-legacy`, marcada como obsoleta para auditoría histórica, no debería generar una advertencia en el modelo vigente.
3. Mantener la indicación de `Tarifas ilustrativas pendientes de conciliación` en onboarding y las advertencias de la landing. No alterar importes, impuestos ni el contrato real.
4. Añadir prueba de regresión que usa los **archivos TypeScript reales** con `typescript.transpileModule` y dependencias permitidas: compara unidad × pantallas × meses con subtotal, prueba producción opcional y fuente vencida/activa.

## Riesgos abiertos (no cubiertos por este PR)

- P1: aprobar tarifa única y unidad comercial por parte de Product/Finance; reconciliar RD$500 / RD$1,500 / RD$2,500 y tratamiento de ITBIS antes de habilitar cotización real.
- P1: verificar que frontend y backend validan meses, producción creativa y persistencia con la misma versión de contrato; el archivo `06-v5-creative-financial-audit.md` ya advierte divergencia del DTO de onboarding.
- P1: ninguna operación de cobro, payout o comisión debe depender de un precio de simulación.

## Verificación y cierre

```bash
node --test scripts/advertiser-estimate-pricing.test.cjs \
  scripts/advertiser-onboarding-presentation.test.cjs
pnpm exec tsc --noEmit --project apps/advertiser/tsconfig.landing.json
bash scripts/advertiser-motion-v6-local-qa.sh
```

Desde esta sesión se ejecutaron **5 controles de lógica fuente con los archivos GitHub actualizados**, incluidos cálculo de las constantes derivadas y advertencias de fuente histórica versus vencida. **No equivalen** al build Next ni a los tests completos del monorepo: ejecutar el bloque anterior desde un checkout con dependencias antes de fusionar.

La incidencia de conciliación tarifaria permanece abierta y es un **gate comercial separado**. No se autoriza merge de cambios de cobro, esquema, billeteras ni facturación sin su propio análisis financiero.

Estado: **corrección de presentación implementada, pendiente de verificación integral**.
