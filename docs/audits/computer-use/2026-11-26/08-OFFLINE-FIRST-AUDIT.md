# Offline, licencias y recuperación

Fecha local: 26 de noviembre de 2026, America/La_Paz. Ejecución: TAD-CUA-20261126-01.

Fuente: `01fb2e0f9507e1c0e3a696c11e76960fa9b56f9a`, rama `codex/computer-use-current-20261126`, worktree `C:/tad-audit-current-20261126`. SHA desplegado: **desconocido**.

## GOAL / PLAN / LOOP / STOP

GOAL: preservar Proof of Play y distinguir persistencia de entrega. PLAN: unitarias del Player y navegador local con IndexedDB real y servidor ACK sintético. LOOP: fixture online → cola offline → reinicio de página → reconexión → rechazo → ACK perdido → reintento. STOP: no acceder al Player público tras fallo TLS; no emitir credenciales ni emparejar hardware productivo.

| Caso | Estado | Evidencia |
| --- | --- | --- |
| online-durable-enqueue | PASS | offline-browser-results.json |
| offline-durable-enqueue | PASS | offline-browser-results.json |
| offline-delivery-failure-retains-two-proofs | PASS | offline-browser-results.json |
| offline-page-restart-retains-two-proofs | PASS | offline-browser-results.json |
| reconnect-http-401-retains-two-proofs | PASS | offline-browser-results.json |
| lost-ack-retains-queue-after-server-acceptance | PASS | offline-browser-results.json |
| retry-full-ack-drains-queue-synthetic-server-deduplicates | PASS | offline-browser-results.json |

Tras reinicio de página offline había dos registros; HTTP 401 no los eliminó; tras recepción con ACK perdido permanecieron; el reintento con ACK completo dejó cero pendientes y dos eventos únicos en servidor sintético. Reinicio del OS/energía no probado. Reproducción audiovisual/cache del player completo, GPS y backend financiero real no están incluidos en ese fixture.

56 unitarias incluyen commit/abort IndexedDB, ACK concurrente, caché y eventos. TypeScript Player estricto y Vite build: exit 0.

INSTANT ONLINE: NOT_TESTED en dispositivo real. BOUNDED OFFLINE: expiración/licencia en hardware NOT_TESTED. INSTANT OFFLINE: NO GARANTIZABLE por canal remoto sin conectividad. No cambiar TTL ni flags para simular revocación. R1/R2/R3 protegidas por ausencia de cambios al Player, caché, cola y licencias.
