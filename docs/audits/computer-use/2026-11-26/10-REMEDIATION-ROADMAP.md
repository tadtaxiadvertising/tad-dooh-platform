# Remediación y dependencias

Fecha local: 26 de noviembre de 2026, America/La_Paz. Ejecución: TAD-CUA-20261126-01.

Fuente: `01fb2e0f9507e1c0e3a696c11e76960fa9b56f9a`, rama `codex/computer-use-current-20261126`, worktree `C:/tad-audit-current-20261126`. SHA desplegado: **desconocido**.

1. P1 #560: confirmar dominio Player, inspeccionar certificado/proxy y restaurar TLS válido. Acción de infraestructura pendiente; no aplicar bypass. Repetir sondas estrictas y luego reproducción autenticada en sandbox.
2. P2 #561: revisar diff local de recuperación Admin, ocho regresiones, typecheck/lint y navegador. Envío y recepción real de correo más callback/update requieren sandbox; no cerrar por renderizado.
3. Revisar issues existentes #217/#313/#385 y pendientes de credenciales sin duplicar ni repetir cambios productivos históricos. El informe local antiguo b0a9a1df no es fuente del estado vigente.
4. Preparar entorno aislado con ADMIN, dos anunciantes, dos conductores, un dispositivo y proveedor sandbox. Correlacionar todo con TAD-CUA-20261126-01; ejecutar los 23 pasos y aislamiento cruzado, expiración y reconciliación.
5. Ejecutar WCAG, QR digital/físico, video offline completo, reinicio físico y carga 10x únicamente en sandbox.

Rollback del cambio Admin: revertir únicamente el commit de esta rama tras revisión; no hay DB ni efectos financieros que revertir. Revertir código no repara TLS ni revierte correos o credenciales. No merge ni deploy automáticos.
