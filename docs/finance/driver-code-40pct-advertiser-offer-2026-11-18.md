# Regla comercial TAD: tarifa de pantallas y código de conductor

Fecha: 18 de noviembre de 2026. Fuente: confirmación explícita del responsable del producto.

## Regla confirmada

- Tarifa base: **RD$2,500 por pantalla/mes**, antes de ITBIS.
- Código auténtico de conductor TAD: **40 % de descuento** sobre el importe de **pantallas**. Tarifa efectiva: **RD$1,500 por pantalla/mes**.
- La creatividad opcional conserva la tarifa separada de la fuente actual del simulador (`creative-production-fee = RD$2,500`); no se descuenta sin aprobación comercial explícita.
- El alcance del descuento a todos los meses de una campaña es una **interpretación operativa** a confirmar con Finanzas. En este cambio, el cálculo se aplica a `screens * months` y solo afecta a **nuevas solicitudes**.

| Caso | Pantallas | Meses | Pantallas base | Descuento | Producción | Subtotal antes de ITBIS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Sin código | 1 | 1 | RD$2,500 | RD$0 | RD$0 | RD$2,500 |
| Código validado | 1 | 1 | RD$2,500 | RD$1,000 | RD$0 | RD$1,500 |
| Sin código | 3 | 2 | RD$15,000 | RD$0 | RD$0 | RD$15,000 |
| Código validado | 3 | 2 | RD$15,000 | RD$6,000 | RD$0 | RD$9,000 |
| Código + creatividad | 3 | 2 | RD$15,000 | RD$6,000 | RD$2,500 | RD$11,500 |

## Evidencia / causa raíz

1. En `packages/impact-calculator/sources.ts`, el tarifario ilustrativo ya contiene RD$2,500 por pantalla/mes y RD$2,500 de producción.
2. `apps/api/src/common/constants/business-rules.ts` define `ADVERTISER_COST_PER_CAMPAIGN_RD=1500` sin verificar `referredBy`; es una cifra legacy aplicada indistintamente, no el precio base real confirmado.
3. La página `/advertiser/onboarding` capturaba el `ref` desde URL/sessionStorage y enviaba `referralCode`, pero el DTO `OnboardAdvertiserDto` no lo declaraba y `OnboardingService` no lo utilizaba. El presupuesto procedía del navegador y el backend lo persistía sin recalcular.
4. `ReferralService.getMyCode` generaba `/register?ref=`, una ruta que no existe en las Pages del anunciante.

## Diseño propuesto en esta rama

- Cotización compartida pura `calculateAdvertiserOffer` (paquete `@tad/impact-calculator`), versionada con `TAD-2026-11-18-DRIVER40`. Moneda DOP, entero RD, subtotal sin ITBIS, descuento solo a pantallas.
- `POST /api/v1/onboarding/advertiser/quote` público con `Throttle`; el servidor comprueba el código en la tabla `drivers`, sin devolver identidad del conductor. La validez es una búsqueda en BD, **no** presencia de un parámetro URL. No interpreta `verifiedDriverCode` enviado por el cliente.
- `POST /api/v1/onboarding/advertiser` vuelve a verificar el código antes de crear la identidad Supabase Auth y persiste en la transacción el `Advertiser.referredBy` y `Campaign.budget` calculado en el servidor. El valor `budget` recibido se valida por compatibilidad pero **no se utiliza como presupuesto autoritativo**.
- UI muestra descuento y total solo al recibir una cotización verificada compatible con pantallas, meses y creatividad seleccionados; no guarda nombres/códigos en analytics. Un código inválido o una API caída no generan descuento falso.
- QR nuevos van a `/advertiser/onboarding?ref=`; `/register?ref=` antiguos se redirigen sin perder parámetros.
- No se alteran facturas existentes, suscripciones con monthlyRate guardada, liquidaciones, comisiones, wallets ni offline state.

## Compatibilidad, riesgos y despliegue

**Gate P1 aún abierto: #218.** Los cálculos históricos de `BUSINESS_RULES.ADVERTISER_COST_PER_CAMPAIGN_RD` usan RD$1,500 como tarifa universal y los ajustes admin `slotPrice` tienen otro valor. Es incorrecto cambiar esta constante global silenciosamente: afectaría reportes retrospectivos y simulaciones de campañas no referidas. Se requiere una reconciliación versionada de cotizaciones/facturación antes de considerar el tarifario completamente consolidado.

**Orden de despliegue seguro:**

1. Ejecutar pruebas de módulo de precios, DTO, onboarding y controlador en checkout autorizado con datos simulados, sin tocar Supabase real. Ejecutar typecheck y build de API y anunciante.
2. Desplegar **API** con endpoint de cotización verificada, comprobar que responde por proxy con código de prueba *autorizado*. No hacer pruebas de altas reales con identidades de producción.
3. Desplegar **advertiser** y validar que el nuevo presupuesto se actualiza con y sin código, y que devuelve base si no hay código. El sistema debe bloquear la solicitud cuando se introduce un código y la verificación falla.
4. Verificar código QR existente, redirección, móvil y lector de pantalla. Si alguna versión falla, revertir solamente esa capa.
5. Antes de automatizar cobros reales: definir snapshot auditable del precio y porcentaje aplicados (versión, origen y fecha), impuestos, duración de elegibilidad y tratamiento de renovación. **Los valores de `Campaign.budget` de nuevas solicitudes NO equivalen a facturas ni autorizan cobros automáticos.**

## Verificación sugerida (sin GitHub Actions)

```bash
node --test scripts/advertiser-driver-offer.test.cjs scripts/advertiser-onboarding-presentation.test.cjs
pnpm --filter api exec jest --runInBand \
  src/modules/onboarding/onboarding.service.spec.ts \
  src/modules/onboarding/onboarding.controller.spec.ts \
  src/modules/onboarding/dto/onboard-advertiser.dto.spec.ts
pnpm --filter @tad/impact-calculator build
pnpm exec tsc --noEmit --project apps/advertiser/tsconfig.landing.json
pnpm --filter api build
pnpm --filter @tad/advertiser build
```

**Estado:** implementación en rama separada; pruebas ejecutables integrales pendientes. No fusionar ni redeplegar sin comprobar los gates de API y frontend, especialmente el flujo de registro con referral.
