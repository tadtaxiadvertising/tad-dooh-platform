---
type: implementation-review
status: implemented-pending-verification
date: 2026-11-01
scope: [advertiser-landing, driver-landing, driver-onboarding]
---

# Landing Experience V5 — Auditoría, cambios y verificaciones pendientes

## Objetivo y resultado inicial

Separar definitivamente dos páginas públicas, cada una centrada en su audiencia, con
calculadoras educativas integradas con el **mismo código de cálculo** que utiliza
el onboarding oficial del portal.

**No tocar producción**, RBAC, wallets, commission approval, payout, Prisma,
Service Workers, Player ni operaciones offline. Todo cambio debe pasar por PR.

## Evidencia y decisión

| Área | Evidencia en `main` antes de V5 | Cambio aplicado |
| --- | --- | --- |
| Advertiser public | `LandingPage.tsx` incluye tab y simulador Driver | Eliminación de selector/experiencia Driver en la landing principal |
| Advertiser onboarding | `includeProduction: true` inicial en `pages/advertiser/onboarding.tsx` | `false` inicial; usuario debe activar producción |
| Advertiser estimator | La landing utilizaba slider RD$ arbitrario, onboarding usa `estimateCampaign` | Landing consume `estimateCampaign` y `estimateCampaignDetailed` desde `simulatorPricing.ts` |
| Driver onboarding | 100 campañas disponibles y fórmula `campaigns * 500` sin límite | Helper compartido `apps/driver/lib/earningsPreview.ts` limita anuncios a 15 |
| Driver sales | Ausente de onboarding y landing | Añadidas ventas aprobadas de ejemplo × RD$500 |
| Driver referrals | Se suma como recurrente sin calificar activación | Se muestran por separado bonos por conductores activados; no recurrentes por defecto |
| Driver public | Página principalmente editorial | Laboratorio móvil con 3 controles, 15 slots y desglose |
| Driver ROI | Basado en estimación anual simplificada y cuota RD$6,000 | Eliminado de pantalla de simulación para no prometer rendimiento |
| Motion UX | Hero y tarjetas con pocos estados vinculados a la interacción | Motion local suave, feedback por slots y totales; respeta movimiento reducido |

## Reglas que se respetan

- **Anunciante:** producción creativa **opcional y desactivada por defecto**.
  Tarifa del estimador compartido: RD$2,500/pantalla/mes y RD$2,500 por producción,
  sujeta a **conciliación** con `BUSINESS_RULES.ADVERTISER_COST_PER_CAMPAIGN_RD=1500`
  y configuraciones comerciales reales. Los rangos de impacto son solo benchmarks
  internacionales sin calibración propia dominicana. Se muestran las advertencias
  de `calculateImpact`.
- **Conductor:** `min(anuncios,15)*500 + ventasAprobadas*500 +
  conductoresActivados*500` como **simulación educativa de un período**.
  No implica que los tres componentes sean todos mensuales: solo anuncios
  tienen escenario mensual recurrente; comisiones/bonos no se repiten por defecto.
- **Nunca** mostrar un preview como `walletBalance`, `availableBalance`,
  nómina pagada o cifra contractual garantizada.
- **Onboarding:** registro real permanece condicionado por
  `NEXT_PUBLIC_LANDING_SIGNUP_ENABLED` y por el servidor, nunca hay accesos Admin.
- **Datos privados:** sin acceso anónimo a `simulate-budget`, telemetría, ledger,
  cuentas bancarias ni datos personales desde una landing.

## Bloqueadores técnicos encontrados (separar PRs)

1. **P1, pricing:** `@tad/impact-calculator` usa RD$2,500 mientras backend
   `BUSINESS_RULES` usa RD$1,500 y `system_settings.slotPrice` RD$500.
   No sustituir silenciosamente precios de producción. Resolver contrato comercial,
   ITBIS, versiones y cotización en PR financiero independiente.
2. **P1, persistencia advertiser:** el frontend envía `campaignMonths` e
   `includeProduction`, pero `OnboardAdvertiserDto` no declara ambos;
   `OnboardingService` crea campaña de un mes y su
   `targetImpressions = expectedScreens * 12500` no comparte las métricas del
   estimador. Corregir con DTO validado, tests y estrategia expand/migrate/contract
   cuando se confirme el contrato.
3. **P1, comisiones:** `CommissionSourceType` enumera `ADVERTISER_SALE` y
   `DRIVER_REFERRAL`, pero `ReferralService` también emite
   `ADVERTISER_REFERRAL` y otras rutas de Lead/PaymentEvidence generan eventos
   similares. Investigar doble acreditación y establecer una fuente de eventos
   económicos idempotente antes de tocar wallets/pagos.
4. **P1, integridad liquidación:** `approveSettlementBatch` marca comisiones
   `PAID` antes de `paySettlementBatch`; revisar separación estados y reintentos.
5. **P1, IDOR posible:** `CommissionController.getCommissionHistory` y
   `getPendingCommissions` reciben `driverId` en URL con `@Roles(DRIVER)`,
   pero sin validación visible de ownership en controlador; validar guardas
   transversales y añadir tests de acceso entre conductores.
6. **P1, wallet display:** `DriverWalletCard.calculateWalletTotal` suma anuncios
   sin tope y conteos desde `localStorage`; `Wallet.availableBalance`
   del servidor representa saldo autoritativo. No reemplazar balance real
   por cálculos locales ni alterar el offline-first.
7. **P2, enlaces referidos:** `ReferralService.getMyCode` da URL Driver
   `/onboarding?ref=`, mientras la landing pública usa `/register`;
   el flujo correcto y la transferencia `ref` requieren pruebas end-to-end.

## Motion UX y accesibilidad

- Animaciones de entrada cortas; `opacity` y `transform` antes que filtros caros.
- Control visible y reversible, inputs de rango nativos, foco y labels, feedback
  inmediato y totales tabulares sin shifts.
- `useReducedMotion` evita entradas animadas en personas que lo requieren;
  CSS detiene transiciones/animaciones de decoración.
- Sin mapas, vídeos obligatorios, WebGL, SDKs de tracking ni dependencias nuevas.
- Hero editorial SSR y CTAs legibles incluso sin JavaScript.

## Validación obligatoria del PR

```bash
pnpm install --frozen-lockfile
node --test scripts/landing.test.cjs scripts/driver-landing.test.cjs
node --test scripts/cookie-management.test.cjs
pnpm --filter @tad/advertiser build
pnpm --filter driver build
pnpm exec tsc --noEmit --project apps/advertiser/tsconfig.landing.json
# revisar script de tsconfig/lint de Driver antes de ejecutar gates concretos
# Servidores de desarrollo/staging aislados, sin API real:
LANDING_BASE_URL=http://127.0.0.1:3003 node scripts/landing-v3-smoke.cjs
DRIVER_LANDING_BASE_URL=http://127.0.0.1:3004 node scripts/driver-landing-smoke.cjs
```

**No se ejecutaron** builds, pruebas de navegador ni tests CI desde esta
intervención remota. Sí se inspeccionaron fuentes y se validó sintaxis
JavaScript de scripts por un parser aislado; eso **no equivale a PASS de QA**.

Antes de publicar: screenshots 320/390/768/1440, contraste, teclado, lector
de pantalla, cookie consent, reduced motion, no-JS, performance/Lighthouse,
rutas del signup y reconciliación de pricing/commission, más CI verde.

## Reversión

Revertir exclusivamente los commits del PR V5 en orden de dependencias.
El helper es de preview y no participa en saldos reales; la reversión no
reconfigura API, DB, wallet, pagos, offline ni producción. Volver a ejecutar
los tests de rutas y onboarding originales después del rollback.

**Estado: IMPLEMENTADO, PENDIENTE DE VERIFICACIÓN.**
