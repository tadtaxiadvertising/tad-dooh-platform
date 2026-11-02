# Contratos comerciales y matriz de riesgo

Referencia del paquete, inspeccionada el **2026-11-01, America/La_Paz**, sobre la base `63c807eba7b2c016411337f14345ae8c1ae5901d`, merge #176 posterior a #173, #174 y #175. Describe fuentes leídas, no pruebas de ejecución, tarifas comerciales aprobadas ni estado de producción. Revalidar la fila pertinente en el checkout actual antes de actuar. Los importes siguientes son valores observados en código y ejemplos.

## Entradas y recorridos

| Superficie | Fuentes desde la raíz del repo | Hecho inspeccionado y límite |
| --- | --- | --- |
| Advertiser pública | `apps/advertiser/app/page.tsx`, `app/layout.tsx`, `components/landing/LandingPage.tsx` | App Router monta una experiencia para anunciantes. No crear `pages/index.tsx` duplicado ni recuperar el selector de tres perfiles de V3 |
| Driver pública | `apps/driver/pages/index.tsx`, `components/landing/DriverLandingPage.tsx` | Pages Router monta la landing del conductor con laboratorio propio; no incluirla dentro de Advertiser |
| Entrada sin sesión | `apps/advertiser/middleware.ts`, `apps/driver/middleware.ts`, configs Next | Las ramas de `/` permiten visitante; rol esperado conserva redirect al dashboard. La lectura estática no prueba firma de sesión ni autorización real |
| Signup | `apps/advertiser/lib/landing/model.ts`, `apps/driver/components/landing/DriverLandingPage.tsx` | `NEXT_PUBLIC_LANDING_SIGNUP_ENABLED === "true"` controla captación pública; el backend conserva su autorización. No activar el gate como parte de un ajuste visual |
| Onboarding | `apps/advertiser/pages/advertiser/onboarding.tsx`, `apps/driver/pages/driver/onboarding.tsx` | Reutilizar flujos oficiales; la landing no confirma aprobación, alta de identidad, reserva ni cobro |
| CTA Driver | `apps/driver/pages/register.tsx`, `apps/api/src/modules/referral/referral.service.ts` | El destino público usa `/register`; el servicio conserva un enlace `/onboarding?ref=`. Verificar el recorrido y preservación del referido, sin dar por equivalentes las rutas |

El informe `docs/ux-landing/06-v5-creative-financial-audit.md` conserva el contexto de V5 y sus límites. Su hallazgo de ownership debe contrastarse con la reparación posterior: no repetirlo como vulnerabilidad abierta solo por leer el documento.

## Estimación de anunciante

- Landing y onboarding importan `estimateCampaign` desde `apps/advertiser/components/advertiser/simulatorPricing.ts`. La landing también usa `estimateCampaignDetailed`; ambas funciones delegan a `packages/impact-calculator`.
- `includeProduction` inicia en `false` en ambos consumidores. Verificar el ciclo apagado → encendido → apagado y que producción sea un concepto separado, sin crear cargos.
- `simulatorPricing.ts` y `packages/impact-calculator/sources.ts` contienen ejemplos de RD$2,500 por pantalla/mes y por producción; `apps/api/src/common/constants/business-rules.ts` contiene `ADVERTISER_COST_PER_CAMPAIGN_RD = 1500`, y `modules/system-settings/system-settings.service.ts` inicializa `slotPrice` en 500.
- Estos conceptos y unidades no se vuelven equivalentes por compartir moneda. Confirmar qué compra cada importe, vigencia, ITBIS, descuentos, duración e inventario antes de unificar. No elegir una cifra ni modificar cobros por coincidencia de nombres.
- Las fuentes de impacto contienen benchmarks e incertidumbre; impresiones estimadas, reproducciones aceptadas y personas únicas no son la misma métrica. Conservar warnings y no afirmar calibración local demostrada.
- El frontend envía `campaignMonths` e `includeProduction`; #175 ya los incorporó al DTO `apps/api/src/modules/onboarding/dto/onboard-advertiser.dto.ts` y a la creación de campaña en `onboarding.service.ts`. El servicio usa `campaignMonths ?? 1`, calcula `endDate` con esos meses y guarda `includeProduction ?? false`. No volver a implementar la ausencia histórica de esos campos.
- La presencia de un tipo TypeScript no acredita validación de entrada ni persistencia real. Inspeccionar decoradores, transformación y pruebas del DTO; el servicio conserva `targetImpressions = expectedScreens * 12500`. Verificar contrato y destino aislado antes de cambiar su cálculo, esquema o cobros. El checkpoint de #176 menciona una migración pendiente: es evidencia histórica, no autorización para ejecutarla.

## Preview Driver y dinero real

`apps/driver/lib/earningsPreview.ts` exporta `previewDriverEarnings` y `DRIVER_PREVIEW_RATES_RD`. Landing y onboarding lo consumen. Su contrato educativo inspeccionado:

| Concepto | Normalización y valor de ejemplo | Interpretación |
| --- | --- | --- |
| Anuncios | Finito, entero, mínimo cero, máximo 15; × RD$500 | Escenario mensual por anuncios elegibles; no ingreso garantizado |
| Ventas | Finito, entero, mínimo cero; #176 eliminó el cap de 100 del helper; × RD$500 | Evento de venta aprobada, no clic ni lead ni comisión mensual automática |
| Conductores referidos | Finito, entero, mínimo cero; #176 eliminó el cap de 100 del helper; × RD$500 | Evento de activación elegible aprobado, no formulario enviado |

En esta base el laboratorio usa controles visuales de 0 a 100 para ventas/referidos; ese rango de interacción no es un límite contractual. No restaurar el antiguo cap de 100 del helper como corrección numérica. Comprobar cifras extremas, precisión y overflow con pruebas independientes; una entrada finita no garantiza que su multiplicación o suma lo sea. Si se requiere un límite técnico, justificarlo y comunicarlo sin presentarlo como regla comercial.

Los resultados separan `recurringMonthlyExampleRD`, `oneTimeEventsExampleRD` e `illustrativeTotalRD`; ninguno es `Wallet.availableBalance`, nómina, payout ni saldo disponible.

Antes de tocar dinero, seguir el evento hasta guardas, servicio, comisión, transacción y ledger. No convertir el helper de demo en fuente contable ni sustituir saldos por `localStorage`.

## Riesgos a investigar, con comprobación antes de corregir

| Tema | Evidencia en la base | Próxima prueba y límite |
| --- | --- | --- |
| Ownership comisiones | `commission/commission.controller.ts` llama `assertDriverAccess` desde historial y pendientes; permite ADMIN o DRIVER cuyo `entityId` coincide | Ejecutar specs aislados para propio/ajeno, entidad ausente y admin. La guarda está presente; no reimplementar el antiguo hallazgo de V5 ni declarar runtime verificado |
| Tipos de comisión | `commission.service.ts` enumera fuentes; `referral/referral.service.ts` genera `ADVERTISER_REFERRAL` con referencia propia | Trazar evento y deduplicación con fixtures; no renombrar fuentes persistidas ni acreditar saldos por intuición |
| Liquidación | `approveSettlementBatch` marca comisiones PAID; `paySettlementBatch` gestiona el paso posterior del lote | Verificar contrato de estados y reintentos en tests aislados. Un nombre o comentario no demuestra pago bancario |
| Onboarding/pricing | #175 añadió duración y producción opcional a DTO/servicio; persisten unidades y tarifas distintas entre fuentes | Revalidar entrada, cálculo, persistencia y errores con fixtures; no repetir el arreglo ya fusionado. Resolver contrato comercial antes de cambiar cobros o esquema |
| Preview Driver | #176 mantiene anuncios hasta 15, elimina cap del helper en ventas/referidos y cambia los sliders a 100 | Probar negativos, no finitos, decimales, más de 100 y extremos numéricos. Distinguir rango visual, seguridad aritmética y regla comercial |
| Referral | Destinos distintos `/register` y `/onboarding?ref=` | Prueba local de rutas y transferencia permitida de `ref`; no iniciar registros reales |
| Wallet UI | El informe V5 identifica cálculos locales en `DriverWalletCard` | Revalidar la fuente actual y su uso; no declarar saldo ni cambiar liquidación como arreglo de copy |

Las prioridades se asignan por impacto demostrado; una diferencia inspeccionada no certifica incidente productivo.

## Alcance y aceptación por clase de cambio

- **Copy/visual/demo:** fuentes de cifras visibles, labels educativos, motion/reduced motion y accesibilidad. Verificación local del flujo cambiado, sin mutaciones económicas.
- **Bug de contrato local autorizado:** reproducción y test observable, API/DTO/consumer coherentes, estados de error y compatibilidad. Separar del rediseño si cambia datos, permisos o cálculos reales.
- **Auth/ownership:** fixture propio/ajeno, rol equivocado, entidad ausente, falla cerrada y ruta autorizada. Mantener aislamiento por tenant. No usar credenciales de respaldo ni datos remotos.
- **Dinero:** autorización explícita del alcance sensible, atomicidad, deduplicación/idempotencia, transición de estados y compensación verificadas. No editar saldos productivos ni tratar migración como consecuencia del frontend.
- **Esquema:** comprobar necesidad y contrato; seguir las instrucciones de base de datos disponibles y estrategia compatible de migración. Este paquete no ejecuta migraciones.

La evidencia por check registra fecha/zona, SHA, archivos, entorno/destino, comando, exit code, resultado y límite. Estados: PASS, FAIL, OMITIDO o NO EJECUTADO. Usar el checkpoint de la intervención y enlazar las pruebas; no copiar el estado histórico del informe V5.
