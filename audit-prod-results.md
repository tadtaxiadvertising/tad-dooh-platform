# Resultados de auditoría E2E de producción

> Generado por tests/audit-prod.spec.ts — 2026-08-10
> Re-ejecución post-deploy `dcbfd6e0` (fix Fleet Health): **3 passed**, `advertiser-http-4xx-5xx` ✅ OK.

| Check | Estado | Detalle | Tiempo (ms) |
| --- | --- | --- | --- |
| admin-login | ✅ OK | final URL: https://proyecto-ia-tad-dashboard.rewvid.easypanel.host/admin/login | 6603 |
| admin-nav-dashboard | ✅ OK |  | 8083 |
| admin-nav-fleet | ✅ OK |  | 9752 |
| admin-js-errors | ❌ FAIL | [TAD_REALTIME][ADMIN] Suscripción Broadcast rechazada o cerrada {status: CLOSED, error: undefined, channel: fleet_tracki | 9752 |
| advertiser-login | ✅ OK | final URL: https://proyecto-ia-tad-advertiser.rewvid.easypanel.host/advertiser/dashboard | 4501 |
| advertiser-dashboard | ✅ OK |  | 14588 |
| advertiser-js-errors | ✅ OK |  | 14588 |
| advertiser-http-4xx-5xx | ✅ OK |  | 14588 |
| driver-login-page | ✅ OK | final URL: https://proyecto-ia-tad-driver.rewvid.easypanel.host/driver/login | 3979 |
| driver-js-errors | ✅ OK |  | 3979 |