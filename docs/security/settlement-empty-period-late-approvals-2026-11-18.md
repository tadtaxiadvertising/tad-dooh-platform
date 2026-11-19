# Liquidaciones mensuales: periodos vacíos y aprobaciones tardías

**Incidente:** [#340](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/340)  
**Estado:** cambio aislado, pendiente de Jest/TypeScript y PostgreSQL de staging. Ninguna operación financiera real.

## Hallazgo

El servicio de liquidación mensual creaba automáticamente un lote `APPROVED` por RD$0 cuando no existían comisiones aprobadas en el periodo. La clave `period` es única. Si posteriormente se aprobaba una comisión que había estado pendiente, la siguiente generación devolvía ese lote vacío y dejaba la comisión fuera. El mismo problema afectaba a lotes no vacíos que recibieran comisiones aprobadas tardíamente. `reconcileCommissions()` detecta `APPROVED` sin lote, pero no ejecuta una conciliación automática segura.

## Decisión / cambio mínimo

- **No crear ni aprobar automáticamente** un lote sin comisiones `APPROVED`. Devolver `409 Conflict` y permitir volver a generar después de que existan comisiones elegibles.
- Cuando ya existe un lote, contar las comisiones `APPROVED` del periodo con `settlementBatchId=null`. Si existe alguna, **no devolver el lote como si estuviera actualizado**; devolver 409 y exigir conciliación explícita.
- Preservar generación no vacía, control atómico de membresía, aprobación manual de DRAFT y suspensión de pagos bancarios.
- No recalcular históricos, borrar lotes, alterar `APPROVED`, pagar automáticamente ni tocar saldos.

**Compatibilidad:** las operaciones que esperaban un lote `APPROVED` de cero al generar un mes vacío ahora reciben 409. Esto es intencional para impedir un cierre financiero falso. Un futuro cierre administrativo explícito de un mes vacío puede diseñarse con cutoff, auditoría y conciliación; no debe confundirse con la generación.

**Limitación histórica:** los lotes vacíos APPROVED previamente creados no cambian. Si aparecen comisiones aprobadas y no vinculadas, el nuevo control informa el conflicto, pero no reescribe ese lote. Asimismo, una aprobación que se confirme inmediatamente *después* del COUNT no será capturada por esa lectura: deben mantenerse conciliación periódica, fecha de corte y un futuro protocolo de cierre serializado.

## Verificación necesaria

```bash
pnpm --filter api exec jest --runInBand src/modules/commission/commission-settlement-claim.spec.ts
pnpm --filter api exec jest --runInBand src/modules/commission/commission-settlement-approval.spec.ts
pnpm --filter api run build
```

En PostgreSQL de staging desechable y con backup de recuperación:
1. Generar periodo con solo comisiones PENDING: debe devolver 409 y no dejar fila en `settlement_batches`.
2. Aprobar esa comisión y reintentar: debe crear un único lote DRAFT con membresía, totales y referencias correctas.
3. Generar lote con comisiones existentes; después aprobar otra del mismo periodo: siguiente generación debe devolver 409 y no modificar el lote existente.
4. Verificar reapertura solo mediante procedimiento de conciliación autorizado, no `db push` ni `DELETE` destructivo.
5. Simular múltiples generadores concurrentes, ventanas de fechas y la lógica de reconciliación; pagos bancarios permanecen bloqueados.

No fusionar ni desplegar hasta ejecución real de GitHub Actions (#147), validación de la base productiva (#217), rotación de secretos (#244) y revisión de integridad financiera. Railway sigue fijado a un SHA anterior (#313).
