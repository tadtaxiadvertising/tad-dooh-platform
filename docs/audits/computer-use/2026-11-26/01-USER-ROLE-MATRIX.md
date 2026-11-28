# Roles y permisos

Fecha local: 26 de noviembre de 2026, America/La_Paz. Ejecución: TAD-CUA-20261126-01.

Fuente: `01fb2e0f9507e1c0e3a696c11e76960fa9b56f9a`, rama `codex/computer-use-current-20261126`, worktree `C:/tad-audit-current-20261126`. SHA desplegado: **desconocido**.

Roles humanos confirmados en `apps/api/src/modules/auth/decorators/roles.decorator.ts`: ADMIN, ADVERTISER y DRIVER. No se halló un rol humano independiente FINANCE/OPERATIONS en ese enum. Visitante, pasajero y dispositivo son actores, no roles humanos de ese enum.

| Actor | Autorización esperada / evidencia | Ejecutado | Pendiente |
| --- | --- | --- | --- |
| Visitante | Landings y login públicos | 18 casos responsive; tres redirecciones privadas a login | Registro, recuperación de email real |
| ADMIN | Administración y finanzas; sesión con rol autorizado | Login público; guard de dispositivos y contratos sintéticos | CRUD real, aprobación, auditoría, soporte |
| ADVERTISER | Recursos del advertiser autenticado | TenantGuard rechaza identidades ajenas en unitarias | Dos tenants reales, campañas, cargas, facturación |
| DRIVER | Perfil y GPS del entityId firmado | TenantGuard, wallet sintético, login y referidos | Onboarding, documentos, vehículo y retiros sandbox |
| Dispositivo | Credencial DEVICE_AUTH y alcance de deviceId | Guard rechaza propósito/firma/expiración/identidad incorrectos | Emparejamiento, renovación, API real de PoP |
| Pasajero | QR público con datos mínimos | Inspección del relato público; no se atribuyó conversión | Decodificación QR, prueba física y atribución en sandbox |
| Finanzas/operaciones | Módulos administrativos; no rol independiente confirmado | Wallet y PoP con adaptadores sintéticos | Concurrencia PostgreSQL, conciliación, webhooks y pagos sandbox |

Un botón oculto o una redirección no acreditan autorización server-side. Las políticas RLS desplegadas no se consultaron en esta ejecución.
