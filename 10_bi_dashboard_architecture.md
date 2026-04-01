# 🧠 09 — ARQUITECTURA BI DASHBOARD TAD DOOH

> **Versión**: 1.0 | **Fecha**: 2026-04-01 | **Sprint**: 4 — Business Intelligence  
> **Audiencia**: Arquitecto Senior / Desarrollador asignado al módulo `/bi`  
> **Prerequisito**: Leer `01_auditoria_tad_2026.md` para contexto de stack y reglas de negocio.

---

## ÍNDICE

1. [Visión General y Filosofía de Diseño](#1-visión-general)
2. [Extensiones del Schema Prisma](#2-extensiones-del-schema-prisma)
3. [Estrategia de Queries Pesadas (Vistas Materializadas + CRON)](#3-estrategia-de-queries-pesadas)
4. [Arquitectura de API — NestJS BI Module](#4-arquitectura-de-api--nestjs-bi-module)
5. [Arquitectura UI — Next.js Dashboard Maestro](#5-arquitectura-ui--nextjs-dashboard-maestro)
6. [Lógica Semafórica (KPI Status)](#6-lógica-semafórica-kpi-status)
7. [Flujo de Conciliación Financiera Automática](#7-flujo-de-conciliación-financiera-automática)
8. [Flujo de Drill-Down por Taxi Crítico](#8-flujo-de-drill-down-por-taxi-crítico)
9. [Plan de Implementación por Fases](#9-plan-de-implementación-por-fases)

---

## 1. Visión General

### El Problema Central

TAD opera con datos financieros y operativos **completamente desvinculados**:

| Fuente de Datos | Qué Sabe | Qué Ignora |
| --- | --- | --- |
| `subscriptions` | Quién pagó RD$6,000 | Si la tablet estuvo online ese mes |
| `playback_events` | Cuántas reproducciones hubo | Si el anunciante ya fue cobrado |
| `financial_transactions` | Transacciones manuales | Correlación con impresiones reales |
| `device_heartbeats` | Estado de batería/conectividad | Si ese taxi tiene suscripción activa |

### La Solución: "Truth Bridge" — Modelo de Conciliación Cruzada

```text
[Subscriptions] <——> [Playback Events] <——> [Financial Transactions]
        ^                    ^                         ^
        └──────────── ReconciliationReport ────────────┘
                   (Tabla de Verdad Unificada)
```

### Reglas de Negocio que el BI debe hacer cumplir

| Regla | Valor | Disparador de Alerta |
| --- | --- | --- |
| Suscripción Chofer | RD$6,000/año | `subscriptionEnd < now() + 15 días` → 🟡 |
| Pago Chofer por Ad | RD$500/campaña activa | `payrollPayment.status === PENDING > 30 días` → 🔴 |
| Ingreso por Anunciante | RD$1,500/bloque de 30s | `financialTransaction` correlacionado |
| Tablet Offline | Sin heartbeat | `lastHeartbeat > 24h` → 🔴 |
| Batería Baja | < 20% | `batteryLevel < 20` → 🟡 |
| Sincronización GPS | Batch cada 5 min | `lastSync > 60 min sin GPS` → 🟡 |

---

## 2. Extensiones del Schema Prisma

Las siguientes extensiones son **aditivas** — no rompen el schema existente.

### 2.1 `TabletHealthLog` — Historial de Salud de Hardware

> **Propósito**: Snapshot periódico del estado de cada tablet para detectar degradación gradual. Generado por CRON cada hora. No reemplaza `DeviceHeartbeat` (raw), sino que agrega datos para BI.

```prisma
model TabletHealthLog {
  id              String   @id @default(uuid())
  deviceId        String   @map("device_id")
  snapshotAt      DateTime @default(now()) @map("snapshot_at")

  // Conectividad
  isOnline        Boolean  @default(false) @map("is_online")
  lastHeartbeatAt DateTime? @map("last_heartbeat_at")
  offlineHours    Float    @default(0) @map("offline_hours")

  // Hardware
  batteryLevel    Int?     @map("battery_level")
  batteryStatus   String   @default("UNKNOWN") @map("battery_status")
  // "OK" (>40%), "LOW" (<40%), "CRITICAL" (<15%), "UNKNOWN"

  // Software
  appVersion      String?  @map("app_version")
  playerStatus    String?  @map("player_status")
  // "PLAYING", "IDLE", "ERROR", "OFFLINE"

  // GPS
  lastGpsAt       DateTime? @map("last_gps_at")
  gpsStaleHours   Float    @default(0) @map("gps_stale_hours")
  networkType     String?  @map("network_type") // "WIFI", "4G", "OFFLINE"
  syncSuccess     Boolean  @default(false) @map("sync_success")

  device          Device   @relation(fields: [deviceId], references: [deviceId], onDelete: Cascade)

  @@map("tablet_health_logs")
  @@index([deviceId, snapshotAt])
  @@index([isOnline])
  @@index([batteryStatus])
  @@index([snapshotAt])
}
```

> **Agregar en `Device`**: `tabletHealthLogs    TabletHealthLog[]`

---

### 2.2 `ReconciliationReport` — Tabla de Verdad Financiera

> **Propósito**: Resultado del proceso de conciliación cruzado (Subscripción vs. Impresiones vs. Transferencia recibida). Generado mensualmente vía CRON o manualmente.

```prisma
model ReconciliationReport {
  id                    String   @id @default(uuid())
  period                String   // "2026-03" (YYYY-MM)
  generatedAt           DateTime @default(now()) @map("generated_at")
  generatedBy           String   @default("SYSTEM") @map("generated_by")

  // Dimensión: Chofer / Dispositivo
  driverId              String?  @map("driver_id")
  deviceId              String?  @map("device_id")

  // Suscripción
  subscriptionStatus    String   @map("subscription_status")
  // "ACTIVE", "EXPIRED", "MISSING"
  subscriptionDueDate   DateTime? @map("subscription_due_date")
  subscriptionPaidAt    DateTime? @map("subscription_paid_at")
  subscriptionAmount    Float    @default(0) @map("subscription_amount")

  // Actividad Operativa
  onlineDays            Int      @default(0) @map("online_days")
  totalPlaybacks        Int      @default(0) @map("total_playbacks")
  totalPlaybackMinutes  Float    @default(0) @map("total_playback_minutes")

  // Campaña / Ingresos
  activeCampaigns       Int      @default(0) @map("active_campaigns")
  contractedImpressions Int      @default(0) @map("contracted_impressions")
  deliveredImpressions  Int      @default(0) @map("delivered_impressions")
  deliveryRate          Float    @default(0) @map("delivery_rate")

  // Finanzas
  revenueContracted     Float    @default(0) @map("revenue_contracted")
  revenueReceived       Float    @default(0) @map("revenue_received")
  payrollDue            Float    @default(0) @map("payroll_due")
  payrollPaid           Float    @default(0) @map("payroll_paid")

  // Discrepancias (Flags Automáticos)
  hasDiscrepancy        Boolean  @default(false) @map("has_discrepancy")
  discrepancyType       String?  @map("discrepancy_type")
  // "UNPAID_SUBSCRIPTION" | "MISSING_PAYMENT" | "LOW_DELIVERY" | "PAYROLL_PENDING" | "OK"
  discrepancyAmount     Float    @default(0) @map("discrepancy_amount")
  notes                 String?

  driver                Driver?  @relation(fields: [driverId], references: [id])
  device                Device?  @relation(fields: [deviceId], references: [id])

  @@map("reconciliation_reports")
  @@unique([period, driverId])
  @@index([period])
  @@index([hasDiscrepancy])
  @@index([discrepancyType])
  @@index([driverId])
}
```

> **Agregar en `Driver`**: `reconciliationReports ReconciliationReport[]`  
> **Agregar en `Device`**: `reconciliationReports ReconciliationReport[]`

---

### 2.3 `BiDashboardSnapshot` — Snapshot Diario de KPIs

> **Propósito**: Pre-calcular los KPIs principales una vez al día para servir el dashboard sin queries en tiempo real sobre tablas grandes.

```prisma
model BiDashboardSnapshot {
  id                    String   @id @default(uuid())
  snapshotDate          DateTime @unique @map("snapshot_date")

  // Financiero
  mrr                   Float    @default(0)
  burnRate              Float    @default(0) @map("burn_rate")
  netProjection         Float    @default(0) @map("net_projection")
  pendingSubscriptions  Int      @default(0) @map("pending_subscriptions")
  overdueSubscriptions  Int      @default(0) @map("overdue_subscriptions")
  totalRevenueMtd       Float    @default(0) @map("total_revenue_mtd")

  // Flota
  totalDevices          Int      @default(0) @map("total_devices")
  onlineDevices         Int      @default(0) @map("online_devices")
  offlineDevices        Int      @default(0) @map("offline_devices")
  criticalDevices       Int      @default(0) @map("critical_devices")
  lowBatteryDevices     Int      @default(0) @map("low_battery_devices")
  syncHealthRate        Float    @default(0) @map("sync_health_rate")

  // Campañas
  activeCampaigns       Int      @default(0) @map("active_campaigns")
  totalImpressionsMtd   Int      @default(0) @map("total_impressions_mtd")
  deliveryRateAvg       Float    @default(0) @map("delivery_rate_avg")

  generatedAt           DateTime @default(now()) @map("generated_at")

  @@map("bi_dashboard_snapshots")
  @@index([snapshotDate])
}
```

---

## 3. Estrategia de Queries Pesadas

### Solución A: Vistas Materializadas en PostgreSQL

```sql
-- Vista: MRR + Suscriptores Activos (Refresco diario)
CREATE MATERIALIZED VIEW mv_mrr_summary AS
SELECT
  COUNT(*) FILTER (WHERE subscription_paid = true AND status = 'ACTIVE') AS active_subscribers,
  COUNT(*) FILTER (WHERE subscription_paid = false) AS delinquent_subscribers,
  COUNT(*) FILTER (WHERE subscription_end < NOW()) AS expired_subscribers,
  COUNT(*) FILTER (WHERE subscription_end BETWEEN NOW() AND NOW() + INTERVAL '15 days') AS expiring_soon,
  SUM(6000) FILTER (WHERE subscription_paid = true AND status = 'ACTIVE') AS mrr
FROM drivers;
CREATE UNIQUE INDEX ON mv_mrr_summary ((1));

-- Vista: Rendimiento de Campañas por Período
CREATE MATERIALIZED VIEW mv_campaign_performance AS
SELECT
  c.id AS campaign_id,
  c.name AS campaign_name,
  c.status,
  c.start_date,
  c.end_date,
  c.target_impressions,
  COUNT(pe.id) AS delivered_impressions,
  COUNT(pe.id) * 100.0 / NULLIF(c.target_impressions, 0) AS delivery_rate,
  COUNT(DISTINCT pe.device_id) AS unique_devices
FROM campaigns c
LEFT JOIN media m ON m.campaign_id = c.id
LEFT JOIN playback_events pe ON pe.video_id = m.id
  AND pe.event_type = 'play_confirm'
GROUP BY c.id, c.name, c.status, c.start_date, c.end_date, c.target_impressions;
CREATE UNIQUE INDEX ON mv_campaign_performance (campaign_id);

-- Vista: Estado de Flota (Semáforo)
CREATE MATERIALIZED VIEW mv_fleet_health AS
SELECT
  d.id, d.device_id, d.taxi_number, d.city,
  d.battery_level, d.last_heartbeat, d.is_online, d.app_version,
  EXTRACT(EPOCH FROM (NOW() - d.last_heartbeat)) / 3600 AS hours_offline,
  CASE
    WHEN d.last_heartbeat > NOW() - INTERVAL '5 minutes' THEN 'ONLINE'
    WHEN d.last_heartbeat > NOW() - INTERVAL '1 hour' THEN 'STALE'
    WHEN d.last_heartbeat > NOW() - INTERVAL '24 hours' THEN 'WARNING'
    ELSE 'CRITICAL'
  END AS connectivity_status,
  CASE
    WHEN d.battery_level >= 40 THEN 'OK'
    WHEN d.battery_level >= 15 THEN 'LOW'
    ELSE 'CRITICAL'
  END AS battery_status,
  dr.full_name AS driver_name,
  dr.phone AS driver_phone,
  dr.subscription_paid,
  dr.subscription_end
FROM devices d
LEFT JOIN drivers dr ON dr.id = d.driver_id;
CREATE UNIQUE INDEX ON mv_fleet_health (id);

-- Comandos de refresco (sin bloqueo de lecturas):
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_mrr_summary;
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_campaign_performance;
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_fleet_health;
```

### Solución B: CRON Jobs en NestJS

| Frecuencia | Tarea |
| --- | --- |
| Cada 5 min | Refrescar `mv_fleet_health` |
| Cada hora | Snapshot de `TabletHealthLog` por dispositivo activo |
| Cada día 00:00 | Refrescar `mv_mrr_summary` + `mv_campaign_performance` |
| Cada día 00:05 | Generar `BiDashboardSnapshot` del día anterior |
| Cada mes día 1 | `triggerMonthlyBilling()` automáticamente |
| Cada mes día 2 | `generateReconciliationReport()` del mes anterior |
| Cada semana | Purgar `analytics_events` > 90 días |

---

## 4. Arquitectura de API — NestJS BI Module

### 4.1 Estructura de archivos

```text
backend/src/modules/bi/
├── bi.module.ts
├── bi.controller.ts
├── bi.service.ts
├── bi.scheduler.ts
├── dto/
│   ├── bi-filters.dto.ts
│   └── reconciliation.dto.ts
└── interfaces/
    └── bi-kpi.interface.ts
```

### 4.2 BI Controller — Pseudocódigo

```typescript
// bi.controller.ts
@Controller('api/bi')
@UseGuards(SupabaseAuthGuard)
export class BiController {

  // KPI MASTER — todos los KPIs del dashboard en una llamada
  // Cache: 5 min | Fuente: BiDashboardSnapshot + fallback en tiempo real
  @Get('kpis')
  getMasterKpis(@Query() filters: BiFiltersDto) { ... }

  // FLOTA — usa mv_fleet_health (vista materializada)
  @Get('fleet-health')
  getFleetHealth(@Query('city') city?: string, @Query('status') status?: string) { ... }

  // DRILL-DOWN — perfil 360° de un taxi: GPS, batería, pagos, campañas
  @Get('fleet-health/:deviceId/drill-down')
  getTaxiDrillDown(@Param('deviceId') deviceId: string) { ... }

  // MRR — usa mv_mrr_summary (refresh diario)
  @Get('finance/mrr')
  getMrrSummary() { ... }

  // LEDGER — libro mayor paginado con filtros
  @Get('finance/ledger')
  getLedger(@Query('category') category?: string, @Query('status') status?: string) { ... }

  // CONCILIACIÓN — genera o retorna el reporte de un período
  @Post('reconciliation/generate')
  generateReconciliation(@Body() dto: { period: string }) { ... }

  @Get('reconciliation/:period')
  getReconciliation(@Param('period') period: string) { ... }

  @Get('reconciliation/:period/discrepancies')
  getDiscrepancies(@Param('period') period: string) { ... }

  @Get('reconciliation/:period/export')
  exportReconciliationCsv(@Param('period') period: string) { ... }

  // CAMPAÑAS — usa mv_campaign_performance
  @Get('campaigns/performance')
  getCampaignPerformance() { ... }

  @Get('campaigns/:campaignId/roi')
  getCampaignRoi(@Param('campaignId') campaignId: string) { ... }
}
```

### 4.3 `getTaxiDrillDown()` — Pseudocódigo

```typescript
async getTaxiDrillDown(deviceId: string) {
  const [device, lastHeartbeats, lastLocations, activePayroll, subscription] =
    await Promise.all([
      // 1. Perfil del dispositivo con chofer y última suscripción
      this.prisma.device.findUnique({
        where: { deviceId },
        include: {
          driver: {
            include: {
              subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 }
            }
          }
        }
      }),
      // 2. Últimos 10 heartbeats (gráfica de batería)
      this.prisma.deviceHeartbeat.findMany({
        where: { deviceId }, orderBy: { timestamp: 'desc' }, take: 10
      }),
      // 3. Últimas 5 ubicaciones GPS
      this.prisma.driverLocation.findMany({
        where: { deviceId }, orderBy: { timestamp: 'desc' }, take: 5
      }),
      // 4. Nómina pendiente del mes actual
      this.prisma.payrollPayment.findFirst({
        where: {
          driver: { devices: { some: { deviceId } } },
          status: 'PENDING',
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear()
        }
      }),
      // 5. Suscripción activa
      this.prisma.subscription.findFirst({
        where: { device: { deviceId }, status: 'ACTIVE' },
        orderBy: { dueDate: 'desc' }
      })
    ]);

  const hoursOffline = device?.lastHeartbeat
    ? (Date.now() - device.lastHeartbeat.getTime()) / 3600000 : 999;

  return {
    device: { id, deviceId, taxiNumber, city, appVersion, playerStatus },
    connectivity: {
      status: hoursOffline < 0.083 ? 'ONLINE'
             : hoursOffline < 1   ? 'STALE'
             : hoursOffline < 24  ? 'WARNING'
             : 'CRITICAL',
      lastHeartbeat: device?.lastHeartbeat,
      hoursOffline: Math.round(hoursOffline * 10) / 10
    },
    battery: {
      current: device?.batteryLevel,
      status: (device?.batteryLevel ?? 0) >= 40 ? 'OK'
             : (device?.batteryLevel ?? 0) >= 15 ? 'LOW' : 'CRITICAL',
      history: lastHeartbeats.map(h => ({ ts: h.timestamp, level: h.batteryLevel }))
    },
    gps: {
      lastLat: device?.lastLat, lastLng: device?.lastLng,
      lastKnownLocations: lastLocations,
      googleMapsUrl: lastLocations[0]
        ? `https://maps.google.com/?q=${lastLocations[0].latitude},${lastLocations[0].longitude}`
        : null
    },
    financials: {
      subscriptionStatus: subscription?.status ?? 'MISSING',
      subscriptionEnd: subscription?.dueDate,
      daysUntilExpiry: subscription?.dueDate
        ? Math.ceil((subscription.dueDate.getTime() - Date.now()) / 86400000)
        : null,
      payrollPending: activePayroll
        ? { amount: activePayroll.amount, since: activePayroll.createdAt }
        : null
    },
    driver: {
      name: device?.driver?.fullName,
      phone: device?.driver?.phone,
      subscriptionPaid: device?.driver?.subscriptionPaid
    }
  };
}
```

### 4.4 `generateReconciliationReport()` — Pseudocódigo

```typescript
async generateReconciliationReport(period: string) {
  const [year, month] = period.split('-').map(Number);
  const periodStart = new Date(year, month - 1, 1);
  const periodEnd   = new Date(year, month, 0, 23, 59, 59);

  const drivers = await this.prisma.driver.findMany({
    include: {
      devices: true,
      subscriptions: {
        where: { startDate: { lte: periodEnd }, dueDate: { gte: periodStart } }
      },
      payrollPayments: { where: { month, year } }
    }
  });

  const results = await Promise.all(drivers.map(async (driver) => {
    const device       = driver.devices[0];
    const subscription = driver.subscriptions[0];

    // Impresiones entregadas en el período
    const deliveredImpressions = device
      ? await this.prisma.playbackEvent.count({
          where: {
            deviceId: device.deviceId,
            eventType: 'play_confirm',
            timestamp: { gte: periodStart, lte: periodEnd }
          }
        })
      : 0;

    // Ingresos RECIBIDOS en el período
    const revenueAgg = await this.prisma.financialTransaction.aggregate({
      where: {
        type: 'INCOMING', status: 'COMPLETED', category: 'PUBLICIDAD',
        createdAt: { gte: periodStart, lte: periodEnd }
      },
      _sum: { amount: true }
    });

    const payrollDue  = driver.payrollPayments.reduce((a, p) => a + p.amount, 0);
    const payrollPaid = driver.payrollPayments
      .filter(p => p.status === 'PAID')
      .reduce((a, p) => a + p.amount, 0);

    const activeCampaigns   = await /* query de campañas activas del dispositivo */ 0;
    const revenueContracted = activeCampaigns * 1500;
    const revenueReceived   = revenueAgg._sum?.amount ?? 0;
    const discrepancyAmount = revenueContracted - revenueReceived;

    // Evaluación de discrepancia
    let discrepancyType = 'OK';
    let hasDiscrepancy  = false;
    if (subscription?.status !== 'ACTIVE') {
      discrepancyType = 'UNPAID_SUBSCRIPTION'; hasDiscrepancy = true;
    } else if (discrepancyAmount > 0) {
      discrepancyType = 'MISSING_PAYMENT'; hasDiscrepancy = true;
    } else if (payrollDue > payrollPaid) {
      discrepancyType = 'PAYROLL_PENDING'; hasDiscrepancy = true;
    }

    return this.prisma.reconciliationReport.upsert({
      where: { period_driverId: { period, driverId: driver.id } },
      create: {
        period, driverId: driver.id, deviceId: device?.id,
        subscriptionStatus: subscription?.status ?? 'MISSING',
        subscriptionDueDate: subscription?.dueDate,
        subscriptionAmount: subscription?.amount ?? 0,
        totalPlaybacks: deliveredImpressions,
        activeCampaigns, revenueContracted, revenueReceived,
        payrollDue, payrollPaid,
        hasDiscrepancy, discrepancyType, discrepancyAmount
      },
      update: { /* mismos campos */ }
    });
  }));

  return {
    period,
    totalRecords: results.length,
    discrepancies: results.filter(r => r.hasDiscrepancy).length
  };
}
```

### 4.5 BI Scheduler — CRON Jobs

```typescript
@Injectable()
export class BiScheduler {

  // mv_fleet_health cada 5 minutos (sin lock)
  @Cron('*/5 * * * *')
  async refreshFleetHealth() {
    await this.prisma.$executeRaw`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_fleet_health`;
  }

  // TabletHealthLog snapshot cada hora
  @Cron('0 * * * *')
  async generateTabletHealthSnapshot() {
    // Itera sobre todos los dispositivos ACTIVE
    // y crea un TabletHealthLog con estado actual de conectividad, batería y GPS
  }

  // BiDashboardSnapshot diario a media noche
  @Cron('5 0 * * *')
  async generateDailyBiSnapshot() {
    const summary = await this.biService.buildDailySnapshot();
    const today   = new Date(); today.setHours(0, 0, 0, 0);
    await this.prisma.biDashboardSnapshot.upsert({
      where: { snapshotDate: today },
      create: { snapshotDate: today, ...summary },
      update: summary
    });
  }

  // Conciliación automática el día 2 del mes a las 8 AM
  @Cron('0 8 2 * *')
  async monthlyReconciliation() {
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    await this.biService.generateReconciliationReport(period);
  }

  // Purga de analytics_events > 90 días (domingos 3 AM)
  @Cron('0 3 * * 0')
  async purgeOldEvents() {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 90);
    await this.prisma.analyticsEvent.deleteMany({
      where: { occurredAt: { lt: cutoff }, processed: true }
    });
  }
}
```

---

## 5. Arquitectura UI — Next.js Dashboard Maestro

### 5.1 Nueva sección `/bi`

```text
admin-dashboard/pages/bi/
├── index.tsx                  # Dashboard Principal (KPIs + filtros globales)
├── fleet.tsx                  # Monitor de Flota con semáforo
├── finance.tsx                # Ledger + MRR + proyecciones
├── campaigns.tsx              # Rendimiento de Campañas + ROI
├── reconciliation/
│   └── [period].tsx           # Reporte de Conciliación mensual
└── components/
    ├── BiKpiCard.tsx           # Card de KPI con estado semafórico
    ├── GlobalFilters.tsx       # Filtros globales persistentes
    ├── FleetHealthTable.tsx    # Tabla semafórica de tablets
    ├── TaxiDrillDown.tsx       # Panel lateral de drill-down
    ├── MrrChart.tsx            # Gráfica MRR histórica (Recharts)
    ├── ReconciliationTable.tsx # Tabla de discrepancias
    └── SemaphoreIndicator.tsx  # 🟢🟡🔴 Indicador reutilizable
```

### 5.2 Layout del Dashboard Maestro (`/bi/index.tsx`)

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ "BI Command Center" │ [Date Range] [Ciudad ▾] [Estado ▾] [Campaña ▾]       │
├─────────────────────────────────────────────────────────────────────────────┤
│  [MRR: RD$X,XXX]  [Flota: XX/100 🟢]  [Impresiones: X,XXX/Y,XXX]  [3 🔴]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────┐  ┌─────────────────────────────┐  │
│  │ TABLA: Fleet Health (Semáforo)       │  │ TaxiDrillDown Panel         │  │
│  │ Taxi   │Bat│Conn│Sub        │Acción  │  │ Abre al hacer clic en fila  │  │
│  │ STI001 │🟢 │🟢  │🟢 ACTIVE  │[→]     │  │                             │  │
│  │ STI002 │🟡 │🟡  │🟡 Vence 3d│[→]     │  │ GPS ← último ping           │  │
│  │ STI003 │🔴 │🔴  │🔴 VENCIDA │[→]     │  │ Batería ← gráfica           │  │
│  └──────────────────────────────────────┘  │ Finanzas ← suscripción/nómina│  │
│                                             │ [WhatsApp] [Marcar Pago]    │  │
│  ┌───────────────────────────────────────┐  └─────────────────────────────┘  │
│  │ AreaChart: MRR histórico 12 meses    │                                    │
│  └───────────────────────────────────────┘                                    │
│                                                                               │
│  ┌──────────────────────────────┐  ┌──────────────────────────────────────┐  │
│  │ BarChart: ROI Campañas       │  │ Feed de Alertas (Notifications)      │  │
│  │ Contratado vs. Entregado     │  │ 🔴 STI-003 offline 26h             │  │
│  │                              │  │ 🟡 Juan Pérez: suscripción vence 5d│  │
│  └──────────────────────────────┘  └──────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Lógica Semafórica (KPI Status)

### 6.1 `lib/semaphore.ts`

```typescript
type SemaphoreColor = 'GREEN' | 'YELLOW' | 'RED';

const SEMAPHORE_RULES = {
  // Horas offline
  connectivity: { green: (h: number) => h < 0.083, yellow: (h: number) => h < 24 },
  // % de batería
  battery:      { green: (b: number) => b >= 40,   yellow: (b: number) => b >= 15 },
  // Días hasta vencimiento de suscripción
  subscription: { green: (d: number) => d > 15,    yellow: (d: number) => d > 0  },
  // % de entrega de impresiones
  deliveryRate: { green: (r: number) => r >= 90,   yellow: (r: number) => r >= 60 },
  // Horas sin ping GPS
  gpsStale:     { green: (h: number) => h < 1,     yellow: (h: number) => h < 6  }
};

export function getSemaphoreStatus(
  metric: keyof typeof SEMAPHORE_RULES,
  value: number
): SemaphoreColor {
  const rule = SEMAPHORE_RULES[metric];
  if (rule.green(value))  return 'GREEN';
  if (rule.yellow(value)) return 'YELLOW';
  return 'RED';
}

export const SEMAPHORE_COLORS = {
  GREEN:  { bg: 'bg-emerald-500', text: 'text-emerald-500', glow: 'shadow-[0_0_12px_#10b981]' },
  YELLOW: { bg: 'bg-amber-400',   text: 'text-amber-400',   glow: 'shadow-[0_0_12px_#fbbf24]' },
  RED:    { bg: 'bg-red-500',     text: 'text-red-500',     glow: 'shadow-[0_0_12px_#ef4444]'  },
};
```

---

## 7. Flujo de Conciliación Financiera Automática

```text
[INICIO: Día 2 del mes, 08:00 AM — BiScheduler]
        │
        ▼
BiService.generateReconciliationReport("YYYY-MM")
        │
   Para CADA Driver:
        │
        ├─► [1] Subscription.status en el período  → subscriptionStatus
        ├─► [2] PlaybackEvent.count (play_confirm) → deliveredImpressions
        ├─► [3] FinancialTransaction SUM(INCOMING) → revenueReceived
        ├─► [4] PayrollPayment SUM vs. PAID        → payrollDue / payrollPaid
        └─► [5] Campaign.count activas             → activeCampaigns
                │
                ▼
        EVALUACIÓN DE DISCREPANCIA:
        ├── IF sub.status != 'ACTIVE'     → "UNPAID_SUBSCRIPTION" 🔴
        ├── IF revenueContracted > recv   → "MISSING_PAYMENT"     🔴
        ├── IF payrollDue > payrollPaid   → "PAYROLL_PENDING"     🟡
        └── ELSE                         → "OK"                  🟢
                │
                ▼
        ReconciliationReport.upsert() → DB
                │
        hasDiscrepancy = TRUE?
        │               │
       YES              NO
        │
        ▼
Notification.create(type: 'CRITICAL', category: 'FINANCE')
"Discrepancia: {driverName} | Tipo: {type} | Monto: RD${amount}"
        │
        ▼
[Dashboard muestra badge 🔴 en /bi/reconciliation]
```

### 7.1 Pantalla de Conciliación en Dashboard

```text
/bi/reconciliation/2026-03

Conciliación: Marzo 2026    [▶ Regenerar]   [⬇ Exportar CSV]
──────────────────────────────────────────────────────────────
Resumen: 13 choferes | 3 discrepancias 🔴 | 2 suscripciones vencidas 🔴
──────────────────────────────────────────────────────────────
Chofer       │ Suscripción │ Impresiones  │ Ingreso      │ Nómina │ Estado
─────────────┼─────────────┼──────────────┼──────────────┼────────┼───────
Juan Pérez   │ 🟢 ACTIVE   │ 1,200/1,500  │ ✅ RD$12,000 │ ✅PAID │ 🟢 OK
María López  │ 🔴 EXPIRED  │ 0/1,500      │ ❌ RD$0      │ ❌PND  │ 🔴 CRIT
Carlos Marte │ 🟡 Vence 3d │ 900/1,500    │ ⚠️ RD$6,000  │ ✅PAID │ 🟡 WARN
                                           [Clic → Drill-Down]
```

---

## 8. Flujo de Drill-Down por Taxi Crítico

**Escenario**: Admin ve `STI-003` en rojo en la tabla de flota.

```text
PASO 1: Admin en /bi → Tabla de Flota
        STI-003 | 🔴 8% bat | 🔴 Offline 26h | 🔴 Sub. Vencida
                                   [CLIC en la fila]
                                        │
PASO 2: Se abre Panel TaxiDrillDown     ▼
        GET /api/bi/fleet-health/TADSTI-003/drill-down

        ┌──────────────────────────────────────┐
        │ 🚕 TADSTI-003 / Placa: A123456       │
        │ Chofer: Carlos Marte | 📞 809-XXX    │
        │                                      │
        │ 📡 CONECTIVIDAD: 🔴 CRÍTICO          │
        │    Offline: 26.3h                    │
        │    Último ping: 31/03 03:41 AM        │
        │                                      │
        │ 🔋 BATERÍA: 🔴 8% CRÍTICO            │
        │    [Gráfica batería últimas 10h]      │
        │                                      │
        │ 📍 GPS: Última pos. hace 28h         │
        │    18.4748, -69.9306                 │
        │    [Abrir en Google Maps ↗]          │
        │                                      │
        │ 💳 FINANZAS                          │
        │    Suscripción: 🔴 VENCIDA (3 días)  │
        │    Nómina Pendiente: RD$1,500        │
        │                                      │
        │ 📱 SOFTWARE                          │
        │    App: v2.1.0 ⚠️ (v2.3.0 dispon.)  │
        │    Player: OFFLINE                   │
        │                                      │
        │ [📤 WhatsApp] [⚡ Cmd Remoto]        │
        │ [💸 Marcar Pago] [🔒 Kill-Switch]   │
        └──────────────────────────────────────┘

PASO 3: Admin → [💸 Marcar Pago]
        Modal: "Confirmar Pago RD$6,000"
        Input: Número de referencia bancaria
        POST /api/finance/subscription/{driverId}/mark-paid
        → Subscription.status = 'ACTIVE'
        → subscriptionPaid = true
        → FinancialTransaction registrada automáticamente
        → Panel actualizado: 🟢 ACTIVE

PASO 4: Notification generada:
        "✅ Pago de Carlos Marte confirmado: RD$6,000"
        → Aparece en feed de alertas del dashboard
```

---

## 9. Plan de Implementación por Fases

### Fase 1 — Base de Datos y Scheduler (Semana 1)

- [ ] Agregar `TabletHealthLog`, `ReconciliationReport`, `BiDashboardSnapshot` a `schema.prisma`
- [ ] `npx prisma migrate dev --name bi_intelligence`
- [ ] Crear las 3 vistas materializadas en Supabase SQL Editor
- [ ] Instalar `@nestjs/schedule` en backend
- [ ] Crear `bi.scheduler.ts` con CRONs básicos

### Fase 2 — API BI Module (Semana 1-2)

- [ ] Crear `bi.module.ts`, `bi.controller.ts`, `bi.service.ts`
- [ ] Implementar `getTaxiDrillDown()` (5 sub-queries paralelos)
- [ ] Implementar `generateReconciliationReport()` con cruce de datos
- [ ] Implementar `getMasterKpis()` (snapshot + fallback calculado)
- [ ] Cache in-memory de 5 min para `/api/bi/kpis`
- [ ] Agregar `BiModule` a `AppModule`

### Fase 3 — UI Dashboard BI (Semana 2-3)

- [ ] `lib/semaphore.ts` con `getSemaphoreStatus()`
- [ ] `components/bi/SemaphoreIndicator.tsx`
- [ ] `components/bi/BiKpiCard.tsx`
- [ ] `components/bi/GlobalFilters.tsx` + `hooks/useBiFilters.ts`
- [ ] `pages/bi/index.tsx` — Dashboard Maestro con 4 KPI cards
- [ ] `pages/bi/fleet.tsx` — Tabla semafórica con drill-down
- [ ] `components/bi/TaxiDrillDown.tsx`
- [ ] `pages/bi/reconciliation/[period].tsx`

### Fase 4 — Acciones y Alertas (Semana 3)

- [ ] Botón "Marcar pago suscripción" en drill-down
- [ ] Integración de WhatsApp desde drill-down
- [ ] Feed de alertas en tiempo real en sidebar BI
- [ ] Exportar CSV de conciliación

### Fase 5 — Optimización (Semana 4)

- [ ] Índices compuestos adicionales según análisis de slow queries
- [ ] Cache Redis si in-memory no es suficiente
- [ ] Configurar purga automática de logs antiguos
- [ ] Actualizar `01_auditoria_tad_2026.md` con nuevos módulos

---

> [!IMPORTANT]
> **Correlación Estricta**: `generateReconciliationReport()` es la pieza central. Debe ejecutarse ANTES de cualquier decisión de cobro o pago. El campo `hasDiscrepancy` actúa como flag de auditoría para filtrar casos sin revisar los 100 choferes manualmente.

<!-- -->

> [!WARNING]
> **VPS Limitado**: Las vistas materializadas usan `CONCURRENTLY` para no bloquear lecturas. El CRON de `mv_fleet_health` (cada 5 min) es el más frecuente. Si el VPS tiene < 1GB RAM libre, aumentar el intervalo a 10 min.

<!-- -->

> [!TIP]
> **No duplicar lógica**: `BiService.getMrrFromMaterializedView()` debe leer de `mv_mrr_summary` y SOLO hace fallback a `FinanceService.getFinancialSummary()` si la vista no está disponible. Evitar queries paralelas redundantes sobre las mismas tablas.

<!-- -->

> [!NOTE]
> **Extensibilidad**: El campo `notes` en `ReconciliationReport` es libre. Úsalo para razonamiento automático (ej: "Tablet offline 26h el día 15, posible pérdida de 180 impresiones"). Facilita auditorías externas y disputas con anunciantes.
