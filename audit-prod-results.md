# Resultados de auditoría E2E de producción

> Generado por tests/audit-prod.spec.ts — 2026-08-10

| Check | Estado | Detalle | Tiempo (ms) |
| --- | --- | --- | --- |
| admin-login | ✅ OK | final URL: https://proyecto-ia-tad-dashboard.rewvid.easypanel.host/admin/login | 3863 |
| admin-nav-dashboard | ✅ OK |  | 5502 |
| admin-nav-fleet | ✅ OK |  | 6879 |
| admin-js-errors | ❌ FAIL | [TAD_REALTIME][ADMIN] Suscripción Broadcast rechazada o cerrada {status: CLOSED, error: undefined, channel: fleet_tracki | 6879 |
| advertiser-login | ✅ OK | final URL: https://proyecto-ia-tad-advertiser.rewvid.easypanel.host/advertiser/dashboard | 4710 |
| advertiser-dashboard | ✅ OK |  | 14613 |
| advertiser-js-errors | ❌ FAIL | Failed to load resource: the server responded with a status of 403 () | 14613 |
| advertiser-http-4xx-5xx | ❌ FAIL | 403 https://proyecto-ia-tad-advertiser.rewvid.easypanel.host/api/proxy/fleet/summary | 14613 |
| driver-login-page | ✅ OK | final URL: https://proyecto-ia-tad-driver.rewvid.easypanel.host/driver/login | 3028 |
| driver-js-errors | ✅ OK |  | 3028 |