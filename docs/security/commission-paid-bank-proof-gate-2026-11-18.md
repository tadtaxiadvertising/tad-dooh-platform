# Pagos de comisiones: transición PAID bloqueada sin evidencia bancaria

**Fecha:** 2026-11-18  
**Incidente:** [#338](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/338)  
**Estado:** corrección aislada, pendiente de pruebas reales y despliegue.

## Evidencia

La ruta `CommissionService.paySettlementBatch()` permanece suspendida hasta contar con confirmación externa de pagos. No obstante, `markCommissionPaid(commissionId, paidAt)` podía cambiar directamente una comisión de APPROVED a PAID con `paidAt`, sin prueba de transferencia y sin entrada de reconciliación por beneficiario.

La búsqueda en el repositorio solo localizó la definición de ese método y pruebas; no se identificó una llamada activa desde el controlador. El riesgo es un *bypass interno potencial*, no un desembolso fraudulento confirmado.

## Corrección mínima

Mantener la firma pública y el contrato de excepción del método, pero devolver `ConflictException` inmediatamente y sin operaciones Prisma. Esto impide que futuros llamadores internos declaren comisiones pagadas sin un protocolo autorizado. `paySettlementBatch` y los procedimientos offline/ledger se mantienen sin cambios.

No sustituir la función por una transición silenciosa ni crear registros `COMPLETED` como si fueran una respuesta del banco. Una futura función de payout deberá verificar al menos: identidad del beneficiario, monto exacto, moneda, consentimiento/cuenta validada, identificador único del proveedor, confirmación criptográficamente autenticada, idempotencia con control transaccional, ledger inmutable y reconciliación entre lotes/comisiones, sin exponer secretos.

## Pruebas antes de fusionar

```bash
pnpm --filter api exec jest --runInBand src/modules/commission/commission-atomic-ledger.spec.ts
pnpm --filter api exec jest --runInBand src/modules/commission/commission-settlement-approval.spec.ts
pnpm --filter api run build
```

Casos previstos: rechazar PENDING, APPROVED, PAID, REVOKED; rechazar `paidAt` introducido por el llamador; comprobar cero lecturas/escrituras Prisma, wallet o ledger y que el endpoint de pago de lotes sigue devolviendo conflicto.

**Limitación:** se requieren pruebas ejecutadas por CI (actualmente bloqueada, #147), revisión de compatibilidad y staging PostgreSQL para demostrar que ningún flujo legítimo depende de la función. La prueba aislada del cuerpo de la función no reemplaza esas verificaciones.

Este PR debe coordinarse con el PR #337, que modifica otro método del mismo servicio y el mismo archivo de pruebas. No mezclar los cambios automáticamente sin revisar el diff.

## Bloqueos operativos

Rotación de credenciales comprometidas (#244), reconciliación de esquema e identidad del entorno productivo (#217), restauración de CI (#147) y control de despliegues (#313). Railway permanece fijado a un SHA anterior; este cambio no desbloquea el servicio.

No se ejecutaron pagos ni SQL de escritura durante la preparación.
