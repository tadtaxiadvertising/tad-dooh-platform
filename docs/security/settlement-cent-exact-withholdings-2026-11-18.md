# Liquidaciones mensuales: precisión de retenciones en centavos

**Fecha:** 2026-11-18  
**Incidente:** [#342](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/342)  
**Estado:** rama aislada, pendiente de pruebas oficiales y revisión financiera.

## Hallazgo y causa raíz

`CommissionService.generateMonthlySettlement()` calculaba la retención así:

```ts
Math.round(ref.grossAmount * BUSINESS_RULES.REFERRAL_RETENTION_RATE)
```

La tasa centralizada sigue siendo **10 %**. El defecto era redondear a **pesos enteros** en vez de centavos, pese a permitir comisiones con dos decimales. Un importe de RD$1.25 retenía erróneamente RD$0.00 en vez de RD$0.13; RD$0.29 retenía RD$0.00 en vez de RD$0.03. La suma de montos `Float` también podía arrastrar residuos binarios a los datos de liquidación.

No hay evidencia aquí de pagos incorrectos reales. La base Supabase conectada no contiene todas las tablas de comisiones y lotes y no se ha verificado como la base productiva de EasyPanel (#217).

## Cambio más pequeño y seguro

- Validar cada comisión APPROVED que será liquidada: importe positivo, finito, con centavos exactos y representable en enteros seguros. Rechazar importes históricos incorrectos antes de cualquier escritura.
- Mantener el agrupamiento **por conductor referente** y la regla actual de redondear una vez **por referente**, pero operar con enteros de centavos.
- Convertir a RD$ únicamente al crear los campos de lote y JSON: `grossAmount`, `withholding`, `netAmount`, `grossTotal`, `withholdings`, `netTotal`.
- Verificar desbordamiento de acumuladores, sin redondear silenciosamente comisiones erróneas ni alterar retrospectivamente lotes aprobados.
- Conservar la transacción, la validación de membresía `status=APPROVED && settlementBatchId=null` y los métodos de pago suspendidos. Desde el PR #341, un período sin comisiones APPROVED **devuelve 409** sin generar un lote vacío ni aprobarlo automáticamente, de modo que las comisiones aprobadas después puedan liquidarse.

### Ejemplos de comprobación

| Bruto RD$ | Retención 10 % RD$ | Neto RD$ |
| ---: | ---: | ---: |
| 0.29 | 0.03 | 0.26 |
| 1.25 | 0.13 | 1.12 |
| 500.00 | 50.00 | 450.00 |

Con dos referentes: `0.10+0.20+0.29=0.59`, retención `0.06`; y `1.25+500=501.25`, retención `50.13`. Total bruto `501.84`, retención `50.19`, neto `451.65`.

## Verificación requerida

```bash
pnpm --filter api exec jest --runInBand src/modules/commission/commission-settlement-cents.spec.ts
pnpm --filter api exec jest --runInBand src/modules/commission/commission-settlement-claim.spec.ts
pnpm --filter api run build
```

El método candidato original se ejercitó en una evaluación aislada de JavaScript con transacciones sintéticas: **12/12 escenarios pasaron** sobre la rama de entonces. Después, la fusión del PR #341 introdujo una modificación intencional del caso de período vacío: ahora **rechaza** su generación. La prueba de la suite de centavos debe comprobar dicho rechazo y ninguna escritura. La evaluación aislada original **no** equivale a Jest, TypeScript estricto, Docker o PostgreSQL y no cubre automáticamente todas las fusiones posteriores.

Antes de fusionar, usar PostgreSQL desechable de staging con el esquema exacto de Prisma y datos ficticios. Verificar `grossTotal=netTotal+withholdings` al centavo y que la suma de subtotales por referente coincide con la del lote. Ejecutar escenarios de 10x volumen y concurrencia de la generación de lotes. Verificar ledger original y snapshot de cada comisión sin alterar wallets.

Los lotes **ya aprobados** no se deben corregir automáticamente mediante UPDATE: cualquier ajuste histórico requiere conciliación autorizada, ledger compensatorio e informe auditable.

## Bloqueos

GitHub Actions #147 falla antes del runner; credenciales históricas #244 requieren rotación, y la identidad del DB operativo #217 sigue sin verificarse. Railway mantiene un commit fijado para impedir despliegues automáticos sin CI (#313). Esta corrección no altera infraestructura, payout, datos productivos ni estado offline de tablets.
