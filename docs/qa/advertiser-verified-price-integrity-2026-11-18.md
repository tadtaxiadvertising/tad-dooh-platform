# QA de continuidad: precio base, códigos simulados y recomendaciones

**Fecha:** 2026-11-18  
**Módulos:** API CampaignService, API OnboardingService, simulador de impacto y descuento del conductor.

## Evidencia → causa raíz

1. La PR #285 consolidó la cotización del registro: **RD$2,500 por pantalla/mes** y **40 % de descuento (RD$1,500)** con un código de conductor encontrado en PostgreSQL.
2. Sin embargo, `CampaignService.simulateImpact()` continuaba usando `BUSINESS_RULES.ADVERTISER_COST_PER_CAMPAIGN_RD = 1500` como si todos los anunciantes tuvieran un código, sin recibir ni validar uno. Con RD$3,000 ofrecía **2 pantallas**, cuyo precio base verdadero es **RD$5,000**.
3. El validador `OnboardingService.verifiedOffer()` consultaba un conductor por `referralCode` pero no distinguía registros `isSimulated`. Un conductor de pruebas aún presente en la BD podía desbloquear un descuento comercial.

## Cambios mínimos

- `CampaignService.simulateImpact` obtiene el precio desde `calculateAdvertiserOffer({ screens:1, months:1, includeProduction:false, verifiedDriverCode:false })`, sin modificar la tarifa histórica que aún usan BI y facturación. Rechaza presupuestos no finitos y negativos antes de consultar dispositivos.
- La validación del código en onboarding comprueba `isSimulated`; los registros simulados reciben el mismo error de código inválido que los inexistentes, sin exponer datos del conductor y sin crear una identidad Supabase.
- Tests Jest: `campaign-pricing.spec.ts` cubre RD$0, RD$1,500, RD$2,500, RD$3,000, RD$5,000, límite de inventario y presupuestos inválidos; `onboarding.service.spec.ts` cubre los códigos de prueba simulados.
- `scripts/advertiser-offer-local-gate.sh` ejecuta tests Node/Jest, build compartido, API, TS estricto del anunciante y build Next con URL de fixture. No ejecuta consultas a la BD real ni depende de GitHub Actions.

### Flujo alternativo de registro legacy

La ruta pública `POST /advertisers` también resuelve `referralCode` y atribuye `referredBy` en `AdvertisersService.create`. No calcula descuentos directamente, pero una atribución simulada podría participar después en comisiones de referidos. Se aplica la misma exclusión `isSimulated` a este flujo, con prueba dedicada `advertisers-referral.spec.ts`.

## Resultados observados y limitaciones

Se ejecutaron sobre las **fuentes reales de la rama** 10 escenarios de lógica aislada (0 fallos): 4 casos de verificación por código (sin código, válido, simulado, inexistente) y 6 importes de simulación. Son controles de comportamiento puntuales, no sustituyen los tests Jest ni un build de la aplicación.

Para certificar este PR desde un checkout con dependencias:

```bash
bash -n scripts/advertiser-offer-local-gate.sh
bash scripts/advertiser-offer-local-gate.sh
```

No afirmar `verificado` hasta obtener evidencia del paso anterior y el smoke API→advertiser, ejecutados sin credenciales de producción.

## Riesgo pendiente fuera del alcance

La tarifa histórica de RD$1,500 aparece también en reportes, BI, facturación retrospectiva y servicios de campañas. **No sustituirla globalmente**: podría alterar importes de contratos existentes. La incidencia #218 sigue abierta para conciliación versionada y snapshots auditables de precios y descuentos, impuestos, facturas y renovaciones.

La duración comercial del descuento (toda la campaña, primera campaña o primer mes) tampoco se ha cerrado explícitamente. Hasta su confirmación, no automatizar cargos con reglas deducidas de un modelo ilustrativo. Todas las campañas de nuevo onboarding permanecen en estado pendiente de revisión/pago.

**Estado:** implementado en rama, pendiente de verificación integral y de aprobación de merge.


## Regresión de contrato editorial tras merge #285/#286

El test de renderizado SSR `scripts/advertiser-onboarding-presentation.test.cjs` seguía exigiendo la cadena `conciliación` en el componente `SimulatorStep`. Desde #285 el texto visible explica la **tarifa comercial confirmada RD$2,500**, la exigencia de verificación del código del conductor, la separación de creatividad y el carácter no contractual del simulador. El componente **ya no incluye** la cadena anterior. Por tanto, esa aserción antigua habría rechazado el HTML correcto.

En la rama de corrección, el test exige cinco afirmaciones presentes en el componente real: tarifa base, `sin ITBIS`, verificación por servidor, producción opcional y ausencia de contratación/cobro automático. Se verificó la existencia de cada cadena en el componente GitHub actualizado, su presencia como aserción y la sintaxis JavaScript de la prueba (**5/5 comprobaciones de contrato PASS**). No se ejecutó React SSR/Jest/TS completo: falta checkout con dependencias; no marcar el test E2E como aprobado.

**No se modifica el cálculo, API, tarifa, descuento, ledger, facturación ni el diseño visual.**