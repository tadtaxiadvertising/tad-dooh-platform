# Comisiones asociadas a lotes: revocación segura — 2026-11-18

**Incidente:** [#336](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/336)  
**Estado:** corrección propuesta; sin cambios productivos ni migraciones.

## Causa raíz

La generación de un lote guarda un snapshot JSON de comisiones, referentes y totales financieros. El lote conserva `status=DRAFT` para revisión manual y puede pasar a `APPROVED`; no es una estructura de lectura dinámica. Antes de la corrección, `revokeCommission` podía cambiar el estado de una comisión ya enlazada y aplicar la reversión a la wallet sin reparar ese snapshot, creando incoherencias contables.

La exclusión de comisiones revocadas al generar el lote no evita una revocación posterior. Además, una transacción PostgreSQL READ COMMITTED no impide una carrera entre una lectura y un UPDATE si los predicados del UPDATE no incluyen el vínculo del lote.

## Cambio mínimo

- Ante `settlementBatchId != null`, bloquear la revocación automática con `409 Conflict` y una instrucción de conciliación.
- En el compare-and-set existente, exigir `{id, status: commission.status, settlementBatchId: null}`. La generación del lote ya utiliza la condición recíproca `status=APPROVED, settlementBatchId=null` para reclamar miembros.
- No alterar las validaciones de importes ni el CAS de `wallet.availableBalance >= commission.amount`. La comisión PENDING sin lote continúa siendo revocable sin débito.
- No editar el lote, borrar la relación, ajustar importes ni crear créditos/deudas implícitos en esta ruta. Los pagos bancarios siguen suspendidos.

**Limitación:** una comisión ya incluida en un lote deberá pasar por un flujo posterior y explícito de controversia, anulación/reconstrucción del lote o compensación contable verificada por un operador autorizado. Este cambio no implementa ese flujo.

## Verificación

```bash
pnpm --filter api exec jest --runInBand src/modules/commission/commission-atomic-ledger.spec.ts
pnpm --filter api exec jest --runInBand src/modules/commission/commission-settlement-claim.spec.ts
pnpm --filter api run build
```

La lógica exacta del método candidato, con anotaciones TypeScript eliminadas solo en la evaluación aislada, pasó **12/12 escenarios V8** sintéticos. Esto **no** acredita ejecución real de Jest, TypeScript, Docker, PostgreSQL ni rollback.

### Prueba obligatoria en staging

1. En PostgreSQL desechable con el esquema Prisma correcto, crear comisiones de prueba APPROVED, source ledger y wallet. Iniciar transacción de generación y otra de revocación; coordinar los puntos de lectura y CAS en ambos órdenes.
2. El ganador puede vincular el lote **o** revocar el evento, nunca los dos. La operación perdedora debe devolver conflicto y revertir sus escrituras dentro de su propia transacción.
3. Verificar con consultas de solo lectura tras cada commit: estado de la comisión, `settlement_batch_id`, JSON del lote, `commissions_count`, totales, reversión contable y balance disponible; nunca deben divergir los miembros y el snapshot.
4. Revocar una comisión con lote DRAFT/APPROVED/PAID debe devolver 409 sin crear ledger ni debitar wallet. Ejecutar las pruebas de solicitudes repetidas y de aprobación de lotes.
5. Ensayar una restauración de snapshot y reconciliar los importes; no habilitar la ruta bancaria por esta corrección.

## Bloqueos vigentes

GitHub Actions sigue fallando antes de ejecutar pasos (#147); la identidad de la base productiva de EasyPanel es desconocida y el proyecto Supabase conectado tiene divergencia (#217); se requiere rotación de secretos históricos (#244). Railway permanece fijado a un SHA antiguo y no debe desbloquearse por esta corrección (#313).

No usar `prisma db push`, migraciones destructivas, cambios monetarios reales ni datos de clientes para probar.
