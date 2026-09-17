# 📊 TAD DOOH Platform — MASTER FINANCIAL SYSTEM DOCUMENTATION
**Versión**: 1.0 | **Fecha**: 2026-09-15 | **Estado**: Producción (v12.1.2)

---

## 1. ARQUITECTURA FINANCIERA GENERAL

### 1.1 Tres Capas de Datos
| Capa | Tablas/Modelos | Propósito |
|------|----------------|-----------|
| **Operativa (Tiempo Real)** | `Driver.wallet_balance`, `PayrollPayment`, `Subscription` | Balance, nóminas mensuales, suscripciones RD$6,000/año |
| **Contable (Libro Mayor)** | `FinancialTransaction`, `Commission`, `Invoice`, `AdvertiserSubscription` | Trazabilidad completa, ITBIS 18%, auditoría |
| **Conciliación (BI/Cross-check)** | `ReconciliationReport`, `BiDashboardSnapshot`, Vistas Materializadas | Cierre mensual, detección de fugas, KPIs ejecutivos |

---

## 2. FLUJOS FINANCIEROS CRÍTICOS

### 2.1 Nómina Conductor (Payroll) — Fórmula V12
```typescript
// En FinanceService.calculateMonthlyPayroll()
base = min(activeAds, 15) × RD$500 + commissions × RD$500
if gpsPoints < threshold → penaltyApplied = true
penaltyPercentage = consecutiveMonthsUnderGoal × penaltyStep
amount = base × (1 - penaltyPercentage)
```

**Paradigma PoP (Proof of Play)**: Solo se paga por anuncios **transmitidos y verificados** (`verified: true`), no solo asignados.

### 2.2 Billetera Digital (Wallet) — Protección Double-Spend
```sql
-- En WalletService.withdraw()
SELECT wallet_balance FROM drivers WHERE id = $1 FOR UPDATE;
-- Verificar balance >= amount
UPDATE drivers SET wallet_balance = wallet_balance - $2 WHERE id = $1;
-- Verificar post-deducción (safety net)
SELECT wallet_balance FROM drivers WHERE id = $1;
-- Si < 0 → ROLLBACK + alerta CRITICAL
```

**Isolation**: `ReadCommitted` + `SELECT FOR UPDATE` (10s timeout)

### 2.3 Conciliación Mensual — Truth Bridge (Día 2, 08:00)
```typescript
// BiService.generateReconciliationReport(period)
Subscription.status + PlaybackEvent.count(verified) + FinancialTransaction.SUM + PayrollPayment = ReconciliationReport

Flags: UNPAID_SUBSCRIPTION | MISSING_PAYMENT | LOW_DELIVERY | PAYROLL_PENDING | OK
```

---

## 3. CONSTANTES DE NEGOCIO (Fuente Única)

```typescript
// apps/api/src/common/constants/business-rules.ts
BUSINESS_RULES = {
  DRIVER_RATE_PER_CAMPAIGN_RD: 500,       // RD$ por ad activo/mes
  DRIVER_RATE_PER_AD_PLAY_RD: 1.25,       // RD$ por playback verificado
  DRIVER_REFERRAL_BONUS_RD: 500,          // RD$ por conductor referido
  ADVERTISER_REFERRAL_BONUS_RD: 500,      // RD$ por anunciante referido
  STARTER_KIT_ANNUAL_FEE_RD: 6000,        // Suscripción anual
  ADVERTISER_COST_PER_CAMPAIGN_RD: 1500,  // RD$/campaña/mes (30s block)
  ITBIS_RATE: 0.18,                       // 18%
  MAX_CAMPAIGNS_PER_DRIVER: 15,           // Cap de slots
  AD_SLOT_DURATION_SECONDS: 30,           // Rotación fija
}
```

---

## 4. MODELOS PRISMA CLAVE (Esquema Financiero)

### 4.1 Driver (con finanzas embebidas)
```prisma
model Driver {
  walletBalance    Float   @default(0)   // VULN #7: balance REAL aquí
  subscriptionPaid Boolean @default(false)
  subscriptionEnd  DateTime?
  status           SystemStatus          // OPERATIVO | PENDIENTE_PAGO | BLOQUEADO
  commissions      Commission[]
  payrollPayments  PayrollPayment[]
  subscriptions    Subscription[]
  wallet           Wallet?   // onDelete: RESTRICT — PROTECCIÓN
}
```

### 4.2 PayrollPayment
```prisma
model PayrollPayment {
  driverId         String
  amount           Float
  month / year     Int
  status           String       // PENDING | PAID
  activeAds        Int
  gpsPoints        Int
  penaltyApplied   Boolean
  penaltyPercentage Float
  referenceNum     String?      // Referencia bancaria
  paidAt           DateTime?
  @@unique([driverId, month, year])
}
```

### 4.3 FinancialTransaction (Ledger)
```prisma
model FinancialTransaction {
  type        String       // INCOMING | OUTGOING
  category    String       // PUBLICIDAD | SUSCRIPCION | NOMINA | REFERRAL | OPEX_*
  amount      Float
  netAmount   Float
  taxAmount   Float        // ITBIS 18%
  status      String       // PENDING | COMPLETED | FAILED
  entityId    String?
  reference   String? @unique  // Idempotencia
  @@index([category, createdAt(sort: Desc)])
}
```

### 4.4 ReconciliationReport
```prisma
model ReconciliationReport {
  period              String   // "YYYY-MM"
  driverId            String
  subscriptionStatus  String
  totalPlaybacks      Int
  revenueContracted   Float    // Esperado
  revenueReceived     Float    // Real
  payrollDue          Float
  payrollPaid         Float
  hasDiscrepancy      Boolean
  discrepancyType     String?  // UNPAID_SUBSCRIPTION | MISSING_PAYMENT | LOW_DELIVERY | PAYROLL_PENDING
  discrepancyAmount   Float
  @@unique([period, driverId])
}
```

### 4.5 BiDashboardSnapshot
```prisma
model BiDashboardSnapshot {
  snapshotDate          DateTime @unique
  mrr                   Float
  burnRate              Float
  netProjection         Float
  totalDevices          Int
  onlineDevices         Int
  offlineDevices        Int
  criticalDevices       Int
  activeCampaigns       Int
  totalImpressionsMtd   Int
  deliveryRateAvg       Float
  syncHealthRate        Float
  yieldPerScreen        Float
  arpu                  Float
  churnRate             Float
  projectedRevenue      Float
}
```

---

## 5. ENDPOINTS API FINANCIEROS

### 5.1 Finance Module (`/finance`)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/payroll?month&year` | Nómina calculada para todos los drivers |
| POST | `/payroll/pay` | Procesar pago (Idempotency-Key) |
| POST | `/payroll/trigger` | Generar nómina masiva del mes |
| GET | `/report/campaigns` | Facturación anunciantes por impresiones |
| GET | `/invoice/:campaignId` | Factura HTML profesional |
| GET | `/export/payroll.csv` | Export CSV nómina |
| POST | `/transactions` | Registrar transacción manual |
| GET | `/summary` | MRR, Burn Rate, Net Projection |
| GET | `/investor-metrics` | CAC, LTV, EBITDA, Payback |
| GET | `/ledger` | Últimas 50 transacciones |

### 5.2 BI Module (`/bi`)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/kpis` | Dashboard maestro (cached 5 min) |
| GET | `/fleet-health` | Estado de flota (usa vista materializada) |
| GET | `/fleet-health/:deviceId/drill-down` | Perfil 360° de taxi |
| POST | `/reconciliation/generate` | Ejecutar conciliación manual |
| GET | `/reconciliation/:period` | Reporte paginado |
| GET | `/hotspots` | Heatmap GPS (Admin + Advertiser) |

### 5.3 Wallet Module (`/wallet` - Driver)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/balance` | Balance + desglose earnings |
| POST | `/withdraw` | Solicitud retiro (atomic, FOR UPDATE) |
| POST | `/bank` | Actualizar datos bancarios |

---

## 6. CRON JOBS AUTOMÁTICOS

| Frecuencia | Tarea | Servicio |
|------------|-------|----------|
| Día 1, 00:00 | `triggerMonthlyBilling()` | BI Scheduler |
| Día 2, 08:00 | `generateReconciliationReport()` | BiScheduler |
| Diario 00:00 | `getMasterKpis()` → BiDashboardSnapshot | BiScheduler |
| Diario 02:00 | Conciliación período actual | BiScheduler |
| Diario 03:00 | `checkHighDelinquency()` (Kill-Switch) | FinanceService |
| Diario 04:00 | Limpieza IdempotencyKey expiradas | BiScheduler |
| Cada 5 min | `REFRESH mv_fleet_health` | BiScheduler |
| Domingos 03:00 | Purga `analytics_events` > 90 días | BiScheduler |

---

## 7. Vistas Materializadas (PostgreSQL - Supabase)

```sql
-- MRR + Suscriptores
CREATE MATERIALIZED VIEW mv_mrr_summary AS
SELECT COUNT(*) FILTER (WHERE subscription_paid = true) AS active_subscribers,
       SUM(6000) FILTER (WHERE subscription_paid = true) AS mrr
FROM drivers;
CREATE UNIQUE INDEX ON mv_mrr_summary ((1));

-- Campañas Performance
CREATE MATERIALIZED VIEW mv_campaign_performance AS
SELECT c.id, c.name, c.target_impressions, COUNT(pe.id) AS delivered
FROM campaigns c
LEFT JOIN media m ON m.campaign_id = c.id
LEFT JOIN playback_events pe ON pe.video_id = m.id AND pe.verified = true
GROUP BY c.id;

-- Fleet Health (cada 5 min)
CREATE MATERIALIZED VIEW mv_fleet_health AS
SELECT d.*, dr.full_name, dr.subscription_paid,
       EXTRACT(EPOCH FROM (NOW() - d.last_heartbeat))/3600 AS hours_offline,
       CASE WHEN d.last_heartbeat > NOW() - INTERVAL '5 min' THEN 'ONLINE'
            WHEN d.last_heartbeat > NOW() - INTERVAL '1 hour' THEN 'STALE'
            WHEN d.last_heartbeat > NOW() - INTERVAL '24 hours' THEN 'WARNING'
            ELSE 'CRITICAL' END AS connectivity_status
FROM devices d LEFT JOIN drivers dr ON dr.id = d.driver_id;
CREATE UNIQUE INDEX ON mv_fleet_health (id);
```

**Refresh**: `REFRESH MATERIALIZED VIEW CONCURRENTLY` (no bloquea lecturas)

---

## 8. PDF GENERATION (InvoiceService)

| Tipo | Método | Uso |
|------|--------|-----|
| Liquidación Chofer | `generateDriverSettlementPDF()` | Nómina pagada |
| Factura Morosidad | `generateDebtInvoicePDF()` | Kill-Switch RD$6,000 |
| Certificado Exhibición | `generateCampaignProofOfPlayPDF()` | Anunciantes (POP) |
| Inventario Flota | `generateFleetStatusPDF()` | Admin técnico |
| Recibo Transacción | `generateTransactionReceiptPDF()` | Ledger entry |
| Reporte Semanal | `generateWeeklyPerformancePDF()` | Anunciantes semanal |
| Factura Proforma | `generateProformaPDF()` | Borrador ITBIS |

---

## 9. RIESGOS IDENTIFICADOS Y MITIGACIONES

| # | Riesgo | Ubicación | Mitigación |
|---|--------|-----------|------------|
| **VULN #7** | `walletBalance` en `Driver` NO en `Wallet` | `13_prisma_schema_database_architecture.md:412` | `wallet.service.ts` usa `$queryRaw SELECT FOR UPDATE` |
| **OnDelete Mismatch** | Prisma `Cascade` vs DB `RESTRICT` (Wallet, Commission, ActiveAd, Telemetry) | `13_prisma_schema_database_architecture.md:169` | Intencional: datos financieros inmutables |
| **Client Stale** | Prisma Client embebido difiere de schema.prisma | `13_prisma_schema_database_architecture.md:1577` | `npx prisma generate` obligatorio antes de deploy |
| **RLS Cycle** | Policy #17 depende de `mv_active_campaigns` | `13_prisma_schema_database_architecture.md:1350` | Refresh vista obligatorio tras cambios de campaña |

---

## 10. IMPLEMENTACIÓN PENDIENTE (Roadmap)

### 10.1 ✅ Completado (Análisis)
- [x] Auditoría completa del código financiero
- [x] Mapeo de todos los endpoints, modelos, flujos
- [x] Identificación de riesgos VULN #5, #7

### 10.2 🔄 En Progreso
- [ ] **Dashboard KPIs**: Conectar BiDashboardSnapshot + vistas materializadas
- [ ] **Nómina automatizada**: Verificar `triggerMonthlyBilling()` + penalizaciones GPS
- [ ] **Wallet/Retiros**: Flujo balance → meta RD$5,000 → retiro → FinancialTransaction
- [ ] **Facturación anunciantes**: Invoice generation, AdvertiserSubscription billing
- [ ] **Impact Calculator**: Calibrar `sources.ts` con datos ONE/DIGESETT (tier C→A/B)
- [ ] **Migración Schema**: Arreglar `walletBalance` duplicado, índices GIN

---

## 11. COMANDOS DE DESARROLLO

```bash
# En apps/api/
npx prisma generate           # Regenerar client (OBLIGATORIO tras schema changes)
npx prisma db push            # Push schema a dev.db (SQLite local)
npx prisma migrate dev --name <name>  # Migración con nombre
npx prisma migrate deploy     # Deploy a producción

# Seed datos de prueba
npm run seed                  # o: npx ts-node prisma/seed.ts
npm run simulate              # o: npx ts-node prisma/simulate-data.ts
```

---

## 12. URLS DE PRODUCCIÓN (EasyPanel)

| Recurso | URL |
|---------|-----|
| **Dashboard Admin** | https://tad-dashboard.rewvid.easypanel.host |
| **API Gateway** | https://tad-api.rewvid.easypanel.host/api/v1 |
| **Video Engine** | https://tad-remotion.rewvid.easypanel.host |
| **Portal Anunciante** | https://tad-advertiser.rewvid.easypanel.host |
| **Portal Conductor** | https://tad-driver.rewvid.easypanel.host |
| **Supabase Project** | https://supabase.com/dashboard/project/ltdcdhqixvbpdcitthqf |

---

*Documento generado automáticamente tras análisis exhaustivo del repositorio tad-dooh-platform*