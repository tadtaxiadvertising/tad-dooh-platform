# E2E Automation — TAD DOOH Platform (v12)

Suite de pruebas Playwright de extremo a extremo contra los tres portales
desplegados (Admin, Advertiser, Driver), con foco en el flujo `offline-first`
del portal Driver.

## Estructura

```
tests/e2e/
├── playwright.config.ts        # Config (1 worker, projects por portal, ENV_URLS)
├── README.md
└── v12/
    ├── admin.spec.ts           # ADM_01 login + ADM_02 crear conductor
    ├── advertiser.spec.ts      # ADV_01 login + ADV_02 solicitar campaña
    ├── driver.spec.ts          # DRV_01 contrato + DRV_02 banco offline-first
    └── lib/
        ├── paths.ts            # Rutas compartidas (root, reporte, snapshots, estado)
        ├── global-setup.ts     # Limpieza previa a la corrida
        ├── report.ts           # E2EReporter → e2e-report.md (raíz del repo)
        ├── storage.ts          # Estado compartido entre specs (workers=1)
        ├── helpers.ts          # snapshot(), randomPhone(), password por defecto
        ├── admin-helpers.ts    # loginAsAdmin()
        ├── advertiser-helpers.ts  # loginAsAdvertiser()
        └── driver-helpers.ts   # login, onboarding, wizard bancario, offline/online
```

## Requisitos de entorno

Los portales Admin y Advertiser autentican contra Supabase, por lo que
requieren credenciales reales vía variables de entorno. Sin ellas, los casos
se marcan como **SKIP** (no fallan).

| Variable | Default | Portal |
| --- | --- | --- |
| `TAD_ADMIN_URL` | `https://proyecto-ia-tad-dashboard.rewvid.easypanel.host` | admin |
| `TAD_ADVERTISER_URL` | `https://proyecto-ia-tad-advertiser.rewvid.easypanel.host` | advertiser |
| `TAD_DRIVER_URL` | `https://proyecto-ia-tad-driver.rewvid.easypanel.host` | driver |
| `TAD_ADMIN_EMAIL` | `admin@tad.do` | admin |
| `TAD_ADMIN_PASSWORD` | *(vacío → SKIP)* | admin |
| `TAD_ADVERTISER_EMAIL` | *(vacío → SKIP)* | advertiser |
| `TAD_ADVERTISER_PASSWORD` | *(vacío → SKIP)* | advertiser |

Los casos de Driver (`DRV_01`, `DRV_02`) dependen de `ADM_02`, que crea un
conductor nuevo (teléfono aleatorio) y lo comparte vía
`tests/e2e/v12/.auth/shared-state.json`. Si `ADM_02` se salta o falla, los
casos de Driver se marcan **SKIP**.

## Casos

| Caso | Flujo |
| --- | --- |
| `ADM_01` | Login admin (`/admin/login`) → verifica "Command Center" en `/admin/dashboard`. |
| `ADM_02` | `/admin/drivers` → "Nuevo Socio" → registra conductor con teléfono aleatorio. |
| `ADV_01` | Login advertiser (`/advertiser/login`) → verifica el dashboard BI. |
| `ADV_02` | `/advertiser/campaigns` → "Nueva campaña" → "Solicitar Aprobación" (portal-requests). |
| `DRV_01` | Login por teléfono (`/driver/login`) → acepta el contrato V2 → etapa "bank". |
| `DRV_02` | Acepta contrato → desconecta red (`context.setOffline(true)`) → llena el wizard bancario → verifica "Guardado sin conexión" y la clave `tad_driver_bank_pending_*` → reconecta → espera el `PUT /wallet/bank` → recarga y verifica "Cuenta registrada y confirmada por el backend". |

## Cómo correr

```bash
# Primera vez: instalar browsers
npx playwright install chromium

# Ejecutar la suite completa (proyectos admin → advertiser → driver)
npx playwright test

# Solo un portal
npx playwright test --project=admin
npx playwright test --project=driver

# Con credenciales
$env:TAD_ADMIN_PASSWORD="..."          # PowerShell
$env:TAD_ADVERTISER_EMAIL="..."
$env:TAD_ADVERTISER_PASSWORD="..."
npx playwright test
```

> `workers=1` es intencional: encadena `ADM_02 → DRV_*` vía estado compartido y
> respeta los límites de conexión de los contenedores del backend.

## Artefactos

- `e2e-report.md` — reporte consolidado en la raíz del repo (por caso: pasos,
  llamadas API, errores de consola, snapshots, resumen global).
- `playwright-report/` — reporte HTML de Playwright + snapshots de cada caso
  en `playwright-report/e2e-snapshots/`.
- `test-results/` — artefactos de fallos (trace/video/screenshot).

## Notas de implementación (contratos verificados en el código)

- Login Driver = **teléfono + contraseña** (`POST /api/proxy/drivers/login`);
  guarda `tad_driver_token` y redirige a `/driver/dashboard`.
- La contraseña por defecto de un conductor creado por Admin es
  `Tad-{dígitos-del-teléfono}!` (`drivers.service.ts`).
- El orden de onboarding es `contract → bank → payment → ready`
  (`getDriverOnboardingStage`). El banco queda "pendiente de sincronización"
  (`tad_driver_bank_pending_{driverId}=1`) mientras `bankAccountConfigured`
  sea falso.
- El wizard de `BankForm` tiene 5 pasos y valida: cuenta de 10–20 dígitos,
  cédula de 11 dígitos, banco con nombre de ≥3 caracteres (por eso el caso usa
  `Banco Popular Dominicano` = `BPD`).
- El sync automático ocurre en el evento `online` del navegador
  (`offlineQueue.ts`) y reenvía `PUT /api/proxy/wallet/bank` con el token
  guardado; el test lo verifica esperando esa respuesta y luego con un reload.
