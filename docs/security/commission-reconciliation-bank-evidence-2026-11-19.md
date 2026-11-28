# TAD: conciliación de comisiones sin falsos positivos — 2026-11-19

**Incidente:** [#346](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/346)  
**Estado:** candidato aislado; sin escritura en PostgreSQL, wallets, payouts, secrets o tablets.

## Evidencia → causa raíz

El reconciliador anterior comparaba la comisión con su asiento `OPEX_COMMISSION` únicamente por la referencia y el importe. Podía dar `isClean=true` a una entrada `INCOMING`, otra moneda, un beneficiario incorrecto o un asiento `PENDING` para una comisión ya aprobada, porque esos atributos no se comprobaban.

Para comisiones `PAID`, una búsqueda por `payout.reference.includes(driverId.slice(0,8))` aparentaba validar la transferencia sin confirmar titularidad, banco, monto ni liquidación. Las rutas de marcado `PAID` y pago sin banco ya están desactivadas (#338, #309); el informe histórico debe conservar la misma política.

## Decisión y modificación mínima

Se conservan exactamente las propiedades de respuesta `period`, `summary`, `discrepancies`, `isClean`, y se mantienen las consultas de solo lectura.

- Recuperar los campos del asiento financiero `type`, `netAmount`, `taxAmount` y `currency`, además de referencia, monto, beneficiario y estado.
- Exigir `entityId === commission.driverId`, `type=OUTGOING`, `currency=DOP`, `netAmount=commission.amount` y `taxAmount=0`, junto con importe y referencia exactos. La retención de la liquidación mensual es un cálculo separado, no un impuesto del asiento fuente.
- Exigir `PENDING` para comisión pendiente y `COMPLETED` para comisión aprobada o marcada pagada. Otros estados históricos quedan fuera de esta comparación específica, sin asumir cuándo fueron acreditados.
- Un `PAID` histórico **siempre se señala como pendiente de evidencia bancaria independiente**. La existencia de un asiento `OPEX_COMMISSION_PAYOUT` con estado COMPLETED o una referencia similar no constituye confirmación. El total de payouts sigue reportándose, pero sin convertirlo en prueba.
- Indexar comisión y ledger por referencia exacta con `Map`, evitando búsquedas anidadas de costo cuadrático cuando el volumen crece 10x.
- No escribir ni auto-reparar balances o estados.

**Compatibilidad:** `isClean` podrá cambiar de verdadero a falso en registros previamente considerados correctos. Es un cambio intencional de seguridad en la auditoría, no una mutación financiera. Los operadores deben revisar los motivos sin automatizar pagos. Si una integración bancaria verificada se añade en el futuro, exigir validación por beneficiario/referencia/proveedor, protección contra replay y ledger antes de relajar la alerta.

## Verificación requerida

```bash
pnpm --filter api exec jest --runInBand src/modules/commission/commission-reconciliation-integrity.spec.ts
pnpm --filter api run build
```

Se evaluó el método real del candidato con anotaciones TypeScript eliminadas únicamente para pruebas sintéticas: **14/14 casos aislados correctos**; adicionalmente hay prueba Jest en el repositorio. Eso **no** sustituye Jest/TypeScript/Docker y PostgreSQL staging, ni demuestra que la fuente bancaria/ledger de EasyPanel esté alineada. Los runners GitHub Actions siguen bloqueados en #147.

### Plan staging, solo con base identificada

1. Verificar la identidad de la base del entorno staging y respaldo, no usar credenciales comprometidas (#244).
2. Insertar únicamente datos de prueba: ledger normal, beneficiario erróneo, estado erróneo, moneda errónea y payout sin confirmación; consultar endpoint con autenticación de ADMIN, verificar errores e independencia entre tenants.
3. Probar volumen 10x y medir duración de consultas e informe; el ahorro en las búsquedas del código no compensa una consulta sin índices.
4. Confirmar que los informes históricos de `REVOKED`, `REJECTED` y payouts anteriores son revisados manualmente; este PR no verifica aún asientos `OPEX_COMMISSION_REVERSAL` ni transferencias fuera del mes. Abrir tarea separada antes de considerar conciliación integral.
5. Registrar resultado y solo permitir fusión/despliegue si los checks ejecutables pasan realmente.

**Sin nuevos pagos, migraciones, escrituras, cambios de autorización o reactivación de Railway.** La base Supabase conectada aún no está confirmada como destino productivo (#217); el release freeze #313 sigue vigente.
