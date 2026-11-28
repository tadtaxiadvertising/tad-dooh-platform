# Auditoría de reversión de comisiones — TAD DOOH

**Fecha:** 19 de noviembre de 2026  
**Incidente:** [#348](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/348)  
**Estado:** propuesta en rama aislada; sin consultas a importes de clientes ni escrituras productivas.

## Evidencia y causa raíz

El flujo `revokeCommission()` genera una compensación de ledger `OPEX_COMMISSION_REVERSAL` por referencia exacta `REV-${commission.reference}` cuando revoca una comisión previamente aprobada. El ledger es `INCOMING`, estado `COMPLETED`, misma cuenta/driver, valor bruto/neto igual a la comisión, impuesto cero, moneda DOP. La misma transacción exige saldo suficiente antes de reducir `wallet.availableBalance`. Para una comisión PENDING nunca acreditada, la revocación no emite ese movimiento.

El reconciliador mensual examina comisiones según su `createdAt`, pero no buscaba las entradas de reversión, por lo que podía declarar `isClean: true` a una comisión REVOKED que ya había concedido dinero a una wallet y carecía de su compensación. Filtrar la compensación por el mes de creación también sería defectuoso: se puede revocar meses después.

## Cambio mínimo seguro

- Se añade `approvedAt` a las columnas consultadas para saber si una comisión REVOKED fue previamente aprobada. Las comisiones históricas con datos inconsistentes se reportan como discrepancias, no se reparan.
- Se consultan `financial_transactions` con `category: OPEX_COMMISSION_REVERSAL` usando coincidencia exacta de `reference`, sin ventana de fecha, y se agrupan en llamadas de hasta 500 referencias para evitar listas SQL ilimitadas.
- Para una REVOKED con `approvedAt`, el reconciliador exige reversión presente, mismo conductor, `INCOMING`, `COMPLETED`, moneda `DOP`, importes bruto y neto correctos, e impuesto cero.
- Si una comisión nunca se aprobó, el ledger fuente debe continuar `PENDING` y no puede tener una compensación. Si ya se había aprobado, su fuente debe permanecer `COMPLETED` y estar compensada. Una reversión inesperada en una comisión no REVOKED también se informa.
- El contrato de lectura `period/summary/discrepancies/isClean` no cambia. Tampoco se ejecutan writes, pagos, mutaciones de saldos o cambios de autorización.

**Límite importante:** un asiento de reversión presente no prueba por sí solo que el saldo actual de la wallet es correcto, ni la confirmación de un banco. El método no busca todas las reversals huérfanas de toda la base; su ámbito es el conjunto de comisiones del período solicitado. Es un control adicional, no una conciliación contable integral.

## Verificación

```bash
pnpm --filter api exec jest --runInBand src/modules/commission/commission-reconciliation-integrity.spec.ts
pnpm --filter api run build
```

La simulación aislada del método extraído del código candidato pasó **15/15 casos** con datos sintéticos, incluidas compensaciones meses posteriores al crédito, compensación faltante, pagos no verificados y reversión con dueño, importe, moneda o estado erróneo. La suite Jest incluye además una prueba de consultas por lotes de 500/1 referencias.

**Esta evidencia no demuestra** ejecución de Jest, TypeScript strict, Docker ni PostgreSQL de staging. GitHub Actions #147 sigue fallando antes de ejecutar los jobs.

### Staging obligatorio antes de fusionar

1. Confirmar identidad del proyecto PostgreSQL de staging; no inferir que el proyecto Supabase conectado es la base productiva EasyPanel (#217).
2. Con backup/restore ensayados, crear comisiones y wallets *sintéticos*, aprobar una, revocarla el mes siguiente y verificar que origen y compensación aparecen correctamente en la conciliación del mes de creación.
3. Simular eliminación de un asiento en staging, referencias equivocadas, propietario erróneo, reversión de una PENDING y pago PAID sin confirmación bancaria: todos deben producir discrepancias.
4. Ejecutar controles de rendimiento con volúmenes 10x y revisar el plan de índice único para `reference`.
5. Verificar que no cambia el balance durante la consulta, que el marcado PAID y los pagos bancarios siguen bloqueados y que no se leen datos de otro tenant.

**Bloqueos operativos:** CI sin runners ejecutando pasos (#147), secretos históricos aún sin rotación confirmada (#244), divergencia de esquema e identidad desconocida (#217), despliegues Railway congelados en SHA anterior (#313). No levantar estos controles por este PR.
