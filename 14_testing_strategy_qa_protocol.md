# 🧪 14 — TESTING STRATEGY & QA PROTOCOL

> **Versión**: 14.0.0 (v12.1.2)
> **Última Actualización**: 2026-06-05
> **Audiencia**: QA Engineers, Backend/Frontend Developers
> **Framework**: Playwright (E2E), Jest (Unit), Supabase Local (Integration)

---

## 1. FILOSOFÍA DE TESTING TAD

### 1.1 Pirámide de Testing

```
                    /\
                   /  \
                  / E2E \        ← Playwright (flujos críticos UI)
                 /--------\
                / Integration\   ← Supabase Local + NestJS TestModule
               /--------------\
              /    Unit Tests   \  ← Jest (servicios, utilidades, validadores)
             /------------------\
            /   Static Analysis  \  ← TypeScript strict, ESLint, Prisma validate
           /----------------------\
```

### 1.2 Principios

1. **Testear comportamiento, no implementación**: Los tests deben sobrevivir a refactorizaciones internas.
2. **Offline-first en tests**: Simular pérdida de red como condición normal, no edge case.
3. **Financial integrity first**: Cualquier cambio en lógica de pagos/nómina requiere test explícito.
4. **No mocks innecesarios**: Usar Supabase Local para integration tests reales, no mocks de Prisma.
5. **Determinismo**: Tests deben ser reproducibles. Usar `seed` de datos y limpiar estado entre tests.

---

## 2. E2E TESTS (Playwright)

### 2.1 Estructura de Archivos

```
apps/driver/tests/
├── antigravity.spec.ts           # Smoke test básico
├── critical-flow.spec.ts         # Login admin + Kill-Switch 402
├── e2e/
│   ├── auth-kiosk-flow.spec.ts   # Auth y sesiones Kiosk
│   ├── final-audit-2026.spec.ts  # Auditoría completa de flujos
│   ├── gps-batch-sync.spec.ts    # Sincronización GPS en lotes
│   └── offline-resilience.spec.ts # Resiliencia offline (PWA/SW)
```

### 2.2 Tests Críticos Implementados

#### `critical-flow.spec.ts` — Kill-Switch y Branding

| Test | Qué Valida | Severidad |
| --- | --- | --- |
| `login de admin y mostrar Dashboard` | Autenticación funciona | 🔴 CRÍTICO |
| `Kill-Switch si backend devuelve 402` | Bloqueo por mora RD$6,000 | 🔴 CRÍTICO |
| `UI respeta Branding (TAD Yellow)` | Color `#fad400` en botones | 🟡 MEDIO |

**Credenciales de test:**
- Email: `admin@tadtaxi.do` (seed script)
- Password: `tad12345` (seed script)
- **Production admin:** `admin@tad.do` / `TadAdmin2026!` (manually created, NOT from seed)

---

#### `offline-resilience.spec.ts` — PWA Offline

| Test | Qué Valida | Error Detectado |
| --- | --- | --- |
| `1.1 — App Shell carga desde caché SW` | Service Worker funciona offline | `SW_001`, `SW_002`, `SW_003` |
| `1.2 — Player reproduce videos desde caché` | IndexedDB + video playback offline | `SW_004` |
| `1.3 — Sin fugas de memoria DOM` | No acumula elementos `<video>` | `MEM_001` (memory leak) |

**Códigos de Error:**
- `SW_001`: Service Worker no pre-cachea assets de video
- `SW_002`: App shell no sobrevive hard-refresh offline
- `SW_003`: UI muestra "Network Error" visible (no graceful degradation)
- `SW_004`: Reproductor pausa si URL no está en caché
- `MEM_001`: Fuga de elementos `<video>` en bucle (más de 3 en DOM)

---

#### `gps-batch-sync.spec.ts` — Telemetría en Lotes

| Test | Qué Valida |
| --- | --- |
| Batch de GPS se envía cada 5 min | Debounce correcto |
| Datos se acumulan offline en localStorage | Offline-first |
| Sincronización automática al reconectar | navigator.onLine detection |

---

### 2.3 Ejecutar Tests E2E

```bash
# Ejecutar todos los tests E2E
npx playwright test

# Ejecutar un test específico
npx playwright test offline-resilience

# Ejecutar en modo UI (interactivo)
npx playwright test --ui

# Ejecutar en headed mode (ver browser)
npx playwright test --headed

# Generar reporte HTML
npx playwright test --reporter=html
```

### 2.4 Configuración de Playwright (Actual)

```typescript
// apps/driver/playwright.config.ts — CONFIGURACIÓN REAL
export default defineConfig({
  testDir: './tests/e2e',              // NOT './tests' — 2 specs fuera de testDir
  fullyParallel: false,                 // NOT true — tests run sequentially
  forbidOnly: !!process.env.CI,
  retries: 2,                           // NOT conditional — always 2 retries
  workers: 1,                           // NOT conditional — always 1 worker
  timeout: 120_000,                     // 2min timeout (tablet ops are slow)
  expect: { timeout: 30_000 },          // 30s assertion timeout
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3004',    // NOT 3002 — driver app runs on 3004
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'es-DO',
    timezoneId: 'America/Santo_Domingo',
    geolocation: { latitude: 19.45, longitude: -70.69 },
  },
  webServer: {
    command: 'npm run dev',
    port: 3004,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'android-kiosk',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
        userAgent: 'Mozilla/5.0 (Linux; Android 12; Kiosk) FullyKiosk/1.0',
      },
    },
    {
      name: 'admin-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'offline-resilience',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
        offline: true,
      },
    },
  ],
});
```

**⚠️ Specs Outside testDir:** `antigravity.spec.ts` and `critical-flow.spec.ts` are in `./tests/` (root), NOT in `./tests/e2e/`. They will NOT be discovered by `npx playwright test`. Run them explicitly: `npx playwright test tests/antigravity.spec.ts`.

---

## 3. UNIT TESTS (Jest)

### 3.1 Estructura Propuesta

```
apps/api/src/
├── modules/
│   ├── wallet/
│   │   ├── wallet.service.ts
│   │   └── wallet.service.spec.ts        # Tests de billetera
│   ├── telemetry/
│   │   ├── telemetry.service.ts
│   │   └── telemetry.service.spec.ts     # Tests de batching GPS
│   ├── referral/
│   │   ├── referral.service.ts
│   │   └── referral.service.spec.ts      # Tests de referidos
│   └── sync/
│       ├── sync.service.ts
│       └── sync.service.spec.ts          # Tests de manifiesto
```

### 3.2 Tests Obligatorios por Módulo

#### Financial Modules (wallet, payroll, commissions)

| Test | Descripción |
| --- | --- |
| `should credit RD$500 per active ad` | Compensación por anuncio |
| `should cap at 15 ads maximum` | Límite de 15 slots |
| `should apply ITBIS 18% correctly` | Cálculo de impuestos |
| `should not double-credit on retry` | Idempotencia |
| `should reject negative balances` | Integridad financiera |

#### Telemetry Module

| Test | Descripción |
| --- | --- |
| `should batch 10 GPS points into 1 insert` | Batching 10:1 |
| `should respect original timestamp` | No sobreescribir con Date.now() |
| `should skip duplicates on retry` | skipDuplicates: true |
| `should not crash on empty batch` | Graceful handling |

#### Referral Module

| Test | Descripción |
| --- | --- |
| `should generate unique referral code` | UUID por conductor |
| `should attribute advertiser to referrer` | Vinculación QR |
| `should create commission on first paid campaign` | Bono RD$500 |

#### Sync Module

| Test | Descripción |
| --- | --- |
| `should return 304 if manifest hash unchanged` | ETag optimization |
| `should include killSwitch flag if subscription expired` | Kill-Switch |
| `should limit to 15 campaigns per device` | Inventory validation |

### 3.3 Ejemplo de Unit Test (Wallet)

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { WalletService } from './wallet.service';
import { PrismaService } from '../prisma/prisma.service';

describe('WalletService', () => {
  let service: WalletService;
  let prisma: PrismaService;

  const mockPrisma = {
    wallet: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    financialTransaction: {
      create: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(mockPrisma)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('creditAdCompensation', () => {
    it('should credit RD$500 per active ad', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue({
        id: 'wallet-1',
        driverId: 'driver-1',
        availableBalance: 0,
      });
      mockPrisma.wallet.update.mockResolvedValue({
        availableBalance: 500,
      });

      await service.creditAdCompensation('driver-1', 1);

      expect(mockPrisma.wallet.update).toHaveBeenCalledWith({
        where: { driverId: 'driver-1' },
        data: { availableBalance: { increment: 500 } },
      });
    });

    it('should cap at 15 ads maximum', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue({
        id: 'wallet-1',
        driverId: 'driver-1',
        availableBalance: 0,
      });
      mockPrisma.wallet.update.mockResolvedValue({
        availableBalance: 7500,
      });

      await service.creditAdCompensation('driver-1', 20); // 20 ads

      expect(mockPrisma.wallet.update).toHaveBeenCalledWith({
        where: { driverId: 'driver-1' },
        data: { availableBalance: { increment: 7500 } }, // 15 * 500, not 20 * 500
      });
    });

    it('should create financial transaction record', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue({
        id: 'wallet-1',
        driverId: 'driver-1',
        availableBalance: 0,
      });

      await service.creditAdCompensation('driver-1', 1);

      expect(mockPrisma.financialTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'INCOMING',
            category: 'NOMINA',
            amount: 500,
          }),
        })
      );
    });
  });
});
```

### 3.4 Ejecutar Unit Tests

```bash
# Ejecutar todos los tests unitarios
npm run test

# Ejecutar en watch mode (desarrollo)
npm run test:watch

# Ejecutar con coverage
npm run test:cov

# Ejecutar un archivo específico
npm run test -- wallet.service.spec.ts
```

---

## 4. INTEGRATION TESTS (Supabase Local)

### 4.1 Setup de Supabase Local

```bash
# Iniciar Supabase Local (requiere Docker)
npx supabase start

# Aplicar migraciones
npx supabase db push

# Ejecutar seeds
npx ts-node apps/api/prisma/seed.ts
```

### 4.2 Tests de Integración Propuestos

#### Financial Flow Integration

```typescript
describe('Financial Flow Integration', () => {
  it('should complete full payroll cycle without data loss', async () => {
    // 1. Create driver with subscription
    // 2. Assign 10 active campaigns
    // 3. Simulate 30 days of playback events
    // 4. Run payroll calculation
    // 5. Verify wallet balance = 10 * 500 = 5000
    // 6. Verify financial transaction created
    // 7. Verify reconciliation report generated
  });

  it('should handle concurrent wallet updates atomically', async () => {
    // 1. Start with balance = 0
    // 2. Fire 10 concurrent credit requests of RD$500
    // 3. Verify final balance = 5000 (not 4500 or 5500)
    // 4. Verify 10 financial transactions created
  });

  it('should rollback on payment failure', async () => {
    // 1. Start withdrawal transaction
    // 2. Simulate bank API failure
    // 3. Verify balance unchanged
    // 4. Verify transaction status = FAILED
  });
});
```

#### Telemetry Integration

```typescript
describe('Telemetry Integration', () => {
  it('should batch GPS points and deduplicate on retry', async () => {
    // 1. Send 10 GPS points
    // 2. Send same 10 points again (retry)
    // 3. Verify only 10 records in DB (skipDuplicates: true)
  });

  it('should handle offline accumulation and sync on reconnect', async () => {
    // 1. Accumulate 50 GPS points in localStorage (offline)
    // 2. Simulate reconnection
    // 3. Verify batch upload to /fleet/track-batch
    // 4. Verify localStorage cleared after 200 OK
    // 5. Verify DB has exactly 50 new records
  });
});
```

### 4.3 Ejecutar Integration Tests

```bash
# Requiere Supabase Local corriendo
npm run test:integration

# Ejecutar con seed limpio
npm run test:integration -- --seed
```

---

## 5. LOAD TESTING (Load Simulator)

### 5.1 Simulador de Carga de Flota

El módulo `apps/api/src/modules/simulation` permite simular flotas de tablets para testing de carga.

```bash
# Iniciar escenario de simulación (default Santiago, 50 nodes)
curl -X POST http://localhost:3000/api/v1/simulation/scenario \
  -H "Content-Type: application/json" \
  -d '{"name": "Santiago Default", "activeNodes": 50, "centerLat": 19.4517, "centerLng": -70.6970, "radiusKm": 8}'

# Detener simulación (NO purga datos)
curl -X POST http://localhost:3000/api/v1/simulation/stop

# Ver estado actual de simulación
curl http://localhost:3000/api/v1/simulation/state

# Purgar todos los datos de simulación (isSimulated=true)
curl -X DELETE http://localhost:3000/api/v1/simulation/purge
```

**⚠️ Port Correct:** API runs on port `3000`, NOT `3001`. All simulation endpoints are `@Public` + `@SkipThrottle` — no auth required.

### 5.2 Métricas a Monitorear Durante Load Test

| Métrica | Límite Acceptable | Herramienta |
| --- | --- | --- |
| **API Latency (p95)** | < 500ms | Grafana / EasyPanel |
| **DB Connection Pool** | < 80% utilizado | Supabase Dashboard |
| **Memory Usage (API)** | < 400MB | Docker stats |
| **Memory Usage (DB)** | < 400MB | Supabase Dashboard |
| **Batch Insert Rate** | > 100 records/sec | API logs |
| **Error Rate** | < 1% | SystemError table |

### 5.3 Escenarios de Load Test

| Escenario | Dispositivos | Duración | Objetivo |
| --- | --- | --- | --- |
| **Pilot Santiago** | 50 | 1 hora | Validar setup actual |
| **City Expansion** | 200 | 4 horas | Scaling a ciudad completa |
| **National Scale** | 1000 | 24 horas | Prueba de estrés máxima |

---

## 6. TEST DATA & SEEDING

### 6.1 Seed Script

```typescript
// apps/api/prisma/seed.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // 1. Create admin user
  await prisma.user.upsert({
    where: { email: 'admin@tad.do' },
    update: {},
    create: {
      email: 'admin@tad.do',
      password: '$2b$10$...', // TadAdmin2026!
      name: 'Admin TAD',
      role: 'ADMIN',
    },
  });

  // 2. Create test driver with active subscription
  const driver = await prisma.driver.upsert({
    where: { phone: '+18095551234' },
    update: {},
    create: {
      fullName: 'Conductor Test',
      cedula: '001-0000000-0',
      phone: '+18095551234',
      taxiPlate: 'TEST-001',
      taxiNumber: 'STI-001',
      subscriptionPaid: true,
      subscriptionEnd: new Date('2027-01-01'),
      status: 'OPERATIVO',
      walletBalance: 0,
      referralCode: 'test-referral-code',
    },
  });

  // 3. Create test device
  await prisma.device.upsert({
    where: { deviceId: 'test-device-001' },
    update: {},
    create: {
      deviceId: 'test-device-001',
      name: 'Tablet Test',
      taxiNumber: 'STI-001',
      city: 'Santiago',
      status: 'OPERATIVO',
      isOnline: true,
      batteryLevel: 85,
      driverId: driver.id,
    },
  });

  // 4. Create test campaign
  const campaign = await prisma.campaign.create({
    data: {
      name: 'Campaña Test',
      advertiser: 'Marca Test',
      status: 'ACTIVE',
      active: true,
      startDate: new Date(),
      endDate: new Date('2026-12-31'),
      targetImpressions: 10000,
      budget: 15000,
      priority: 1,
    },
  });

  console.log('✅ Seed completed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### 6.2 Ejecutar Seed

```bash
cd apps/api
npx prisma db seed
```

---

## 7. QA CHECKLIST PRE-DEPLOY

### 7.1 Critical Path (Obligatorio antes de cada deploy)

- [ ] Login admin funciona (`admin@tad.do` / `TadAdmin2026!`)
- [ ] Dashboard carga sin errores de consola
- [ ] Kill-Switch 402 se activa correctamente
- [ ] GPS batch endpoint acepta 10+ puntos
- [ ] Wallet balance se actualiza atómicamente
- [ ] Referral QR genera código único
- [ ] PWA carga offline (Service Worker activo)
- [ ] Player reproduce videos sin memory leaks
- [ ] No hay errores 5xx en logs de API
- [ ] Prisma migrations aplicadas correctamente

### 7.2 Financial Integrity (Obligatorio tras cambios en lógica de pagos)

- [ ] Compensación = `min(activeAds, 15) * 500`
- [ ] Commissions = `referrerCount * 500`
- [ ] ITBIS 18% aplicado correctamente
- [ ] No double-credit en retries (idempotencia)
- [ ] Reconciliation report generado sin discrepancias
- [ ] FinancialTransaction ledger completo

### 7.3 Performance (Obligatorio tras cambios en telemetría o queries)

- [ ] API latency p95 < 500ms
- [ ] DB connection pool < 80%
- [ ] Memory usage API < 400MB
- [ ] Batch insert rate > 100 records/sec
- [ ] No N+1 queries en endpoints críticos

---

## 8. BUG REPORT TEMPLATE

Cuando se encuentra un bug, registrar en `SystemError` y documentar:

```markdown
### BUG: [Nombre corto]
- **Severidad**: 🔴 CRÍTICO / 🟡 MEDIO / 🟢 BAJO
- **Módulo**: Wallet / Telemetry / Sync / Campaign / Driver / Advertiser
- **Descripción**: Qué sucede y qué se esperaba
- **Pasos para reproducir**:
  1. Ir a `/ruta`
  2. Hacer clic en X
  3. Observar Y
- **Evidencia**: Screenshot, log, o video
- **Impacto**: Cuántos usuarios/dispositivos afectados
- **Workaround**: Si existe solución temporal
```

---

## 9. CONTINUOUS TESTING EN CI/CD

### 9.1 Estado Actual — SIN Pipeline CI

> **⚠️ REALITY:** No CI/CD pipeline exists. The `.github/workflows/` directory is empty. All tests are run **manually** before deploy. EasyPanel auto-builds on push to `main` with **zero test gates**.

**Current deploy flow:**
```
Developer → git push main → EasyPanel auto-build → Production
            (NO lint, NO test, NO coverage gate)
```

**Risk:** Code with failing tests, lint errors, or type mismatches can reach production without any automated validation.

### 9.2 Recommended GitHub Actions Pipeline (TODO)

```yaml
# .github/workflows/test.yml — TO BE IMPLEMENTED
name: TAD Quality Gate
on: [push, pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx prisma generate
      - run: npm run lint            # Gate 1: 0 ESLint errors
      - run: npm run build           # Gate 2: TypeScript compiles
      - run: npm run test            # Gate 3: Unit tests pass (when they exist)
      - run: npm run test:e2e        # Gate 4: E2E critical path
        env:
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
          DIRECT_URL: ${{ secrets.TEST_DIRECT_URL }}
```

### 9.3 Gates de Deploy (Recommended)

| Gate | Requisito | Bloquea Deploy Si | Status |
| --- | --- | --- | --- |
| **Lint** | 0 errores ESLint | Hay errores de sintaxis | ❌ Not enforced |
| **Build** | Next.js + NestJS compilados | Errores de compilación | ❌ Not enforced |
| **Unit Tests** | 100% pass rate | Alguna prueba falla | ❌ No tests exist |
| **E2E Tests** | Critical path pass | Login o Kill-Switch falla | ❌ Not enforced |
| **Coverage** | > 60% financial modules | Lógica de pagos sin tests | ❌ No coverage |

---

## 10. MÉTRICAS DE CALIDAD

### 10.1 KPIs de QA

| Métrica | Meta Actual | Estado |
| --- | --- | --- |
| **E2E Tests Passing** | 100% | ⚠️ 4/6 (2 specs outside testDir) |
| **Unit Test Coverage (Financial)** | > 80% | ❌ 0% — No unit tests exist |
| **Unit Test Coverage (Telemetry)** | > 70% | ❌ 0% — No unit tests exist |
| **CI Pipeline** | Auto-enforced | ❌ Not configured |
| **Bug Resolution Time** | < 24h CRÍTICO | 📊 Sin tracking |
| **Deploy Failure Rate** | < 5% | 📊 Sin tracking |

### 10.2 Deuda de Testing

| Área | Estado | Prioridad |
| --- | --- | --- |
| Wallet Service tests | ⚠️ Sin unit tests | 🔴 ALTA |
| Telemetry Anti-Fraud tests | ⚠️ Sin tests | 🔴 ALTA (REVENUE SHIELD) |
| SubscriptionGuard tests | ⚠️ Driver stub vs Device enforced | 🔴 ALTA (security gap) |
| ReferralService tests | ⚠️ Sin unit tests | 🟡 MEDIA |
| SyncService tests | ⚠️ Sin unit tests | 🟡 MEDIA |
| Advertiser Portal E2E | ⚠️ Sin tests | 🟡 MEDIA |
| Admin Dashboard E2E | ⚠️ Parcial | 🟢 BAJA |
| Playwright testDir coverage | ⚠️ 2 specs outside scope | 🟢 BAJA |

---

*Este documento debe actualizarse tras cada nuevo test añadido o bug crítico encontrado.*
