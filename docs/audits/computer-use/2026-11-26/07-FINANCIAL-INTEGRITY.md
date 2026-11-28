# Integridad financiera

Fecha local: 26 de noviembre de 2026, America/La_Paz. Ejecución: TAD-CUA-20261126-01.

Fuente: `01fb2e0f9507e1c0e3a696c11e76960fa9b56f9a`, rama `codex/computer-use-current-20261126`, worktree `C:/tad-audit-current-20261126`. SHA desplegado: **desconocido**.

Pruebas ejecutadas en memoria: wallet canonical driver identity, Telemetry canonical verified PoP, tenant playback y referidos. Integran las ocho suites/60 pruebas de API. Sin PostgreSQL real, proveedor de pagos, conciliación, saldo productivo ni dinero.

Player: START/ERROR no se convierten en END facturable; los tests de mapping forman parte de las 56 unitarias. En integración local, dos eventos sobrevivieron a HTTP 401 y ACK perdido; el servidor **sintético** deduplicó dos eventos únicos tras reintento. Esto no acredita idempotencia financiera del backend real.

Regla de negocio de compensación documentada: máximo 15 campañas y RD$500 por concepto elegible. La UI es ilustrativa; no se validó una campaña pagada ni descuento/referido a través del negocio completo. Webhooks repetidos, concurrencia PostgreSQL, reembolsos y payouts: NOT_TESTED.

Cambios de esta ejecución no alteran montos, ledger, estados de pago, RLS ni esquemas. No se declara integridad financiera global a partir de mocks.
