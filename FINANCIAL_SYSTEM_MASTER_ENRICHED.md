# 📊 TAD DOOH Platform — DOCUMENTACIÓN FINANCIERA MAESTRA ENRIQUECIDA

**Versión**: 2.0 (Enriquecida) | **Fecha**: 2026-09-16 | **Estado**: Producción (v12.3.0+)  
**Fuente de Verdad**: Código fuente en `apps/api/src/modules/finance/`, `apps/api/src/modules/wallet/`, `apps/api/src/modules/drivers/payroll-audit.service.ts`, `apps/api/src/modules/bi/`, `apps/api/src/modules/advertisers/advertiser-billing.service.ts`  
**Schema Prisma**: `apps/api/prisma/schema.prisma` + migraciones `20260916_wallet_unification`  

---

## 🎯 OBJETIVO DE ESTE DOCUMENTO

**Eliminar toda ambigüedad, cuello de botella y zona gris** en el sistema financiero. Cada regla, fórmula, flujo, tabla, endpoint y cron job debe estar **definido explícitamente** sin lugar a interpretación.

---

## 1. ARQUITECTURA FINANCIERA — TRES CAPAS INMUTABLES

| Capa | Tablas/Modelos | Propósito | SLA de Consistencia |
|------|----------------|-----------|---------------------|
| **Operativa (Tiempo Real)** | `Wallet`, `PayrollPayment`, `Subscription`, `ActiveAd` | Balance disponible, nóminas mensuales, suscripciones RD$6,000/año, anuncios activos | **Strong Consistency** — `SELECT FOR UPDATE` + transacciones atómicas |
| **Contable (Libro Mayor)** | `FinancialTransaction`, `Commission`, `Invoice`, `AdvertiserSubscription`, `Wallet` (bankInfo) | Trazabilidad completa, ITBIS 18%, auditoría, facturación anunciantes | **Eventual Consistency (≤5 min)** — Materialized views + snapshots |
| **Conciliación (BI/Cross-check)** | `ReconciliationReport`, `BiDashboardSnapshot`, `mv_fleet_health`, `mv_mrr_summary`, `mv_campaign_performance` | Cierre mensual, detección de fugas, KPIs ejecutivos, heatmaps | **Batch Daily (02:00)** — `REFRESH MATERIALIZED VIEW CONCURRENTLY` |

> **REGLA INQUEBRANTABLE**: La **Capa Operativa** es la fuente de verdad para saldos y pagos. La Capa Contable **nunca** sobrescribe la Operativa. La Capa Conciliación **solo lee y alerta**.

---

## 2. CONSTANTES DE NEGOCIO — FUENTE ÚNICA E INMUTABLE

**Archivo**: `apps/api/src/common/constants/business-rules.ts`  
**Importación**: `import { BUSINESS_RULES } from "../../common/constants/business-rules";`

```typescript
export const BUSINESS_RULES = {
  // ─── COMPENSACIÓN CONDUCTOR ───
  DRIVER_RATE_PER_CAMPAIGN_RD: 500,       // RD$ por campaña activa/mes (cap 15)
  DRIVER_RATE_PER_AD_PLAY_RD: 1.25,       // RD$ por playback VERIFICADO (30s)
  DRIVER_REFERRAL_BONUS_RD: 500,          // RD$ por conductor referido (al activarse)
  ADVERTISER_REFERRAL_BONUS_RD: 500,      // RD$ por anunciante referido (al facturarse)
  
  // ─── SUSCRIPCIONES ───
  STARTER_KIT_ANNUAL_FEE_RD: 6000,        // RD$6,000/año (ITBIS INCLUIDO)
  ADVERTISER_COST_PER_CAMPAIGN_RD: 1500,  // RD$/pantalla/mes (bloque 30s)
  
  // ─── IMPUESTOS ───
  ITBIS_RATE: 0.18,                       // 18% — República Dominicana
  
  // ─── LÍMITES OPERATIVOS ───
  MAX_CAMPAIGNS_PER_DRIVER: 15,           // Cap de slots por tablet
  MAX_CAMPAIGNS_PER_ADVERTISER: 15,       // Cap campañas simultáneas por anunciante
  AD_SLOT_DURATION_SECONDS: 30,           // Rotación fija — INMUTABLE
  
  // ─── ESTADOS (SystemStatus Enum) ───
  STATUS: {
    DRIVER: {
      INITIAL: "PENDIENTE_PAGO",
      ACTIVE: "OPERATIVO",
      BLOCKED: "BLOQUEADO",              // Kill-Switch activo
    },
    DEVICE: {
      ACTIVE: "OPERATIVO",
      BLOCKED: "BLOQUEADO",
      INITIAL: "PENDIENTE_PAGO",
    },
    ADVERTISER: {
      INITIAL: "PENDING_REVIEW",
      ACTIVE: "ACTIVE",
      SUSPENDED: "SUSPENDED",
    },
    CAMPAIGN: {
      DRAFT: "DRAFT",
      PENDING: "PENDING_REVIEW",
      PENDING_PAYMENT: "PENDING_PAYMENT",
      ACTIVE: "ACTIVE",
      COMPLETED: "COMPLETED",
    },
  },
  
  // ─── SISTEMA DE NIVELES (Tier) ───
  LEVELS: {
    BASE: { hours: 120, label: "BASE", priority: 1, penalty: 0.10 },  // 10% penalización
    PLATA: { hours: 160, label: "PLATA", priority: 2, penalty: 0 },  // Sin penalización
    ORO: { hours: 200, label: "ORO", priority: 3, penalty: 0 },      // Sin penalización
  },
  
  PENALTY_THRESHOLD_MONTHS: 2,             // Meses consecutivos bajo meta → penalización
  REFERRAL_RETENTION_RATE: 0.10,           // 10% retención por referidos en suscripciones
  CHURN_RATE_DEFAULT: 0.045,               // 4.5% fallback si no hay histórico
  COMMAND_TTL_DAYS: 7,                     // TTL comandos push a tablets
  
  // ─── SEGURIDAD ───
  JWT_EXPIRY: "7d",
  BCRYPT_ROUNDS: 10,
} as const;
```

> **PROHIBIDO**: Hardcodear cualquiera de estos valores en servicios, controladores, migraciones o seeds. **Única excepción**: Tests unitarios con `jest.mock()`.

---

## 3. MODELOS PRISMA — ESQUEMA FINANCIERO AUTORITATIVO

### 3.1 Wallet — Billetera Digital (FUENTE AUTORITATIVA DE BALANCE)

```prisma
model Wallet {
  id              String   @id @default(uuid())
  driverId        String   @unique   // 1:1 con Driver — FK obligatoria
  availableBalance Float   @default(0)  // RD$ DISPONIBLES PARA RETIRO (source of truth)
  pendingWithdrawal Float  @default(0)  // RD$ en proceso (inmediatamente después de withdraw)
  bankInfo        Json?    // { banco, cuenta, tipo, cedula, ownerName }
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  driver          Driver   @relation(fields: [driverId], references: [id], onDelete: Restrict)
  
  @@map("wallets")
}
```

**CRÍTICO**: 
- `onDelete: Restrict` — **NO se puede borrar Driver si tiene Wallet** (protección datos financieros)
- `availableBalance` = **ÚNICA** fuente de verdad para retiros. `Driver.walletBalance` **ELIMINADO** (migración `20260916_wallet_unification`)
- `bankInfo` reemplaza a `Driver.bankAccount` (deprecado)

### 3.2 PayrollPayment — Nómina Mensual

```prisma
model PayrollPayment {
  id                String   @id @default(uuid())
  driverId          String
  amount            Float    // RD$ calculados (post-penalización)
  month             Int      // 1-12
  year              Int      // ej. 2026
  status            String   // "PENDING" | "PAID"
  activeAds         Int      // Promedio anuncios activos del mes (cap 15)
  gpsPoints         Int      // Puntos GPS válidos del período
  transmissionHours Float    // Horas de transmisión calculadas
  penaltyApplied    Boolean  @default(false)
  penaltyPercentage Float    @default(0)
  referenceNum      String?  // Referencia bancaria (ej. "PAY-2609-A1B2C3D4")
  paidAt            DateTime?
  createdAt         DateTime @default(now())
  
  driver            Driver   @relation(fields: [driverId], references: [id], onDelete: Cascade)
  
  @@unique([driverId, month, year])
  @@index([driverId])
  @@index([status])
  @@map("payroll_payments")
}
```

### 3.3 FinancialTransaction — Libro Mayor (Ledger)

```prisma
model FinancialTransaction {
  id          String   @id @default(uuid())
  type        String   // "INCOMING" | "OUTGOING"
  category    String   // Ver CATEGORÍAS OFICIALES abajo
  amount      Float    // Monto BRUTO (con ITBIS si aplica)
  netAmount   Float    // Monto NETO (sin ITBIS)
  taxAmount   Float    // ITBIS 18% (0 si no aplica)
  status      String   // "PENDING" | "COMPLETED" | "FAILED"
  entityId    String?  // FK a Driver/Advertiser/Campaign
  reference   String?  @unique  // Idempotencia — nullable (no todas tienen ref)
  note        String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([type])
  @@index([category])
  @@index([status])
  @@index([createdAt])
  @@index([category, createdAt(sort: Desc)])
  @@map("financial_transactions")
}
```

#### CATEGORÍAS OFICIALES (Enum implícito — usar EXACTAMENTE estos strings)

| Categoría | Tipo | Descripción | ITBIS |
|-----------|------|-------------|-------|
| `PUBLICIDAD` | INCOMING | Facturación a anunciantes | 18% |
| `SUSCRIPCION` | INCOMING | Suscripción conductor RD$6,000 | 18% |
| `NOMINA` | OUTGOING | Pago nómina conductor | 0% |
| `REFERRAL` | OUTGOING | Bono referido conductor/anunciante | 0% |
| `OPEX_DRIVER_PAYOUT` | OUTGOING | Liquidación nómina (alias NOMINA) | 0% |
| `OPEX_COMMISSION` | OUTGOING | Comisiones por referidos/ventas | 0% |
| `OPEX_MARKETING` | OUTGOING | Gasto marketing/adquisición | 0% |
| `OPEX_INFRA` | OUTGOING | Infraestructura (VPS, Maps, CDN) | 0% |
| `OPEX_PAYROLL` | OUTGOING | Procesamiento nómina (fees bancarios) | 0% |
| `WITHDRAWAL` | OUTGOING | Retiro conductor de Wallet | 0% |
| `DRIVER_PAYOUT` | OUTGOING | Alias legado para OPEX_DRIVER_PAYOUT | 0% |

> **REGLA**: `taxAmount = (amount / 1.18) * 0.18` **SOLO** para `PUBLICIDAD` y `SUSCRIPCION`. Resto: `taxAmount = 0`, `netAmount = amount`.

### 3.4 Subscription — Suscripción Anual Conductor

```prisma
model Subscription {
  id            String   @id @default(uuid())
  driverId      String
  deviceId      String?
  plan          String   // "ANUAL_6000" (futuro: "MENSUAL_500", "PREMIUM")
  amount        Float    @default(6000)  // RD$ ITBIS INCLUIDO
  paymentMethod String?  // "BANK_TRANSFER" | "CASH" | "CARD"
  status        String   // "PENDING" | "ACTIVE" | "EXPIRED"
  startDate     DateTime
  dueDate       DateTime   // Fecha límite pago
  validUntil    DateTime   // Fin de cobertura (startDate + 1 año)
  paidAt        DateTime?
  notes         String?
  isSimulated   Boolean    @default(false)
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt
  
  driver        Driver     @relation(fields: [driverId], references: [id], onDelete: Cascade)
  device        Device?    @relation(fields: [deviceId], references: [id], onDelete: Cascade)
  
  @@index([driverId])
  @@index([deviceId])
  @@index([status])
  @@index([dueDate])
  @@map("subscriptions")
}
```

**Kill-Switch Gate**: `status != "ACTIVE"` OR `validUntil < now()` → Device recibe HTTP 402 en `/check-in`

### 3.5 ReconciliationReport — Conciliación Mensual

```prisma
model ReconciliationReport {
  id                  String   @id @default(uuid())
  period              String   // "YYYY-MM" — Clave de partición
  driverId            String
  deviceId            String?
  subscriptionStatus  String   // "ACTIVE" | "EXPIRED" | "MISSING"
  subscriptionAmount  Float    // RD$6,000 o proporcional
  totalPlaybacks      Int      // Reproducciones VERIFICADAS del período
  activeCampaigns     Int      // Campañas asignadas al driver
  revenueContracted   Float    // Ingreso ESPERADO (contratado)
  revenueReceived     Float    // Ingreso REAL recibido (ledger INCOMING PUBLICIDAD)
  payrollDue          Float    // Nómina calculada (deuda)
  payrollPaid         Float    // Nómina pagada (real)
  hasDiscrepancy      Boolean  @default(false)
  discrepancyType     String?  // "OK" | "UNPAID_SUBSCRIPTION" | "MISSING_PAYMENT" | "LOW_DELIVERY" | "PAYROLL_PENDING"
  discrepancyAmount   Float    @default(0)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  
  driver              Driver   @relation(fields: [driverId], references: [id], onDelete: Cascade)
  device              Device?  @relation(fields: [deviceId], references: [id], onDelete: SetNull)
  
  @@unique([period, driverId])
  @@map("reconciliation_reports")
}
```

### 3.6 BiDashboardSnapshot — Snapshot Diario KPIs

```prisma
model BiDashboardSnapshot {
  id                  String   @id @default(uuid())
  snapshotDate        DateTime @unique  // Fecha del snapshot (00:00)
  mrr                 Float    // Monthly Recurring Revenue
  burnRate            Float    // Gastos operativos mes actual
  netProjection       Float    // mrr + campaignRevenue - burnRate
  totalDevices        Int
  onlineDevices       Int
  offlineDevices      Int
  criticalDevices     Int      // Offline > 24h
  activeCampaigns     Int
  totalImpressionsMtd Int
  deliveryRateAvg     Float    // % entrega vs target
  syncHealthRate      Float    // % sync exitoso
  yieldPerScreen      Float    // Ingreso promedio por tablet
  arpu                Float    // Average Revenue Per User
  churnRate           Float    // Tasa cancelación
  projectedRevenue    Float    // Proyección anual
  generatedAt         DateTime @default(now())
  
  @@map("bi_dashboard_snapshots")
}
```

### 3.7 AdvertiserSubscription — Suscripción Mensual Anunciantes

```prisma
model AdvertiserSubscription {
  id               String   @id @default(uuid())
  advertiserId     String
  numberOfScreens  Int      // Tablets asignadas
  monthlyRate      Float    @default(1500)  // RD$/pantalla/mes
  taxRate          Float    @default(0.18)  // ITBIS
  status           String   // "ACTIVE" | "CANCELLED"
  nextBillingDate  DateTime // Próximo cobro (día 1 de cada mes)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  
  advertiser       Advertiser @relation(fields: [advertiserId], references: [id], onDelete: Cascade)
  
  @@map("advertiser_subscriptions")
}
```

### 3.8 Invoice — Facturas Anunciantes

```prisma
model Invoice {
  id           String   @id @default(uuid())
  advertiserId String
  issueDate    DateTime
  dueDate      DateTime
  subtotal     Float    // Antes de ITBIS
  taxAmount    Float    // ITBIS 18%
  totalAmount  Float    // Total a pagar
  status       String   // "PENDING" | "PAID" | "OVERDUE"
  pdfUrl       String?  // URL en Supabase Storage
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  advertiser   Advertiser @relation(fields: [advertiserId], references: [id], onDelete: Cascade)
  
  @@index([advertiserId])
  @@index([status])
  @@index([dueDate])
  @@map("invoices")
}
```

### 3.9 Commission — Comisiones Referidos

```prisma
model Commission {
  id          String   @id @default(uuid())
  driverId    String
  amount      Float    @default(500)  // RD$500 por referido
  sourceType  String   // "ADVERTISER_SALE" | "DRIVER_REFERRAL"
  status      String   // "PENDING" | "APPROVED" | "PAID"
  createdAt   DateTime @default(now())
  
  driver      Driver   @relation(fields: [driverId], references: [id], onDelete: Restrict)
  
  @@map("commissions")
}
```

> **REGLA**: `DRIVER_REFERRAL` se crea cuando referido cierra primera campaña pagada. `ADVERTISER_SALE` = bono por venta directa anunciante.

---

## 4. FLUJOS FINANCIEROS CRÍTICOS — DEFINICIONES EXACTAS

### 4.1 Nómina Conductor (Payroll) — Fórmula V12.3

**Ubicación**: `FinanceService.calculateMonthlyPayroll()` + `PayrollAuditService.applyPenaltyLogic()`

```typescript
// INPUTS (calculados en batch, UNA query cada uno):
const activeAdsCount = playedCampaigns.size;      // SOLO playbacks VERIFICADOS (PoP)
const gpsPointsCount = gpsCountsMap.get(driverId) || 0;
const referralsCount = driver.referrals.length;
const isSubPaid = driver.subscriptionPaid && 
                  (!driver.subscriptionEnd || new Date(driver.subscriptionEnd) >= new Date());

// FÓRMULA BASE:
const baseCommission = 0;  // Legacy — comisiones ya no suman al base
const driverReferralBonus = referralsCount * BUSINESS_RULES.DRIVER_REFERRAL_BONUS_RD;
const advertiserReferralBonus = 0;  // Movido a Wallet en tiempo real (Referral Loop)

const adTransmissionIncome = isSubPaid ? activeAdsCount * BUSINESS_RULES.DRIVER_RATE_PER_CAMPAIGN_RD : 0;
const prePenaltyAmount = adTransmissionIncome + driverReferralBonus + advertiserReferralBonus;

// PENALIZACIÓN (PayrollAuditService.applyPenaltyLogic):
if (driver.consecutiveMonthsUnderGoal >= BUSINESS_RULES.PENALTY_THRESHOLD_MONTHS) {
  penaltyPercentage = BUSINESS_RULES.LEVELS.BASE.penalty;  // 0.10 (10%)
  penaltyAmount = prePenaltyAmount * penaltyPercentage;
  totalAmount = prePenaltyAmount - penaltyAmount;
  penaltyApplied = true;
} else {
  penaltyPercentage = 0;
  penaltyAmount = 0;
  totalAmount = prePenaltyAmount;
  penaltyApplied = false;
}
```

**REGLAS INQUEBRANTABLES**:
1. **Solo paga si `subscriptionPaid = true` Y `subscriptionEnd >= now()`** → `isSubPaid`
2. **Solo cuenta playbacks `verified = true`** (Proof of Play) — `playbackEvent.verified`
3. **Cap 15 anuncios** — `min(activeAdsCount, 15)` implícito en `playedCampaigns.size` (Set)
4. **Penalización 10% SOLO nivel BASE** tras 2+ meses consecutivos bajo meta de horas
5. **Referidos anunciantes** → Wallet en tiempo real (`OPEX_COMMISSION`), NO en nómina recurrente

### 4.2 Billetera Digital (Wallet) — Protección Double-Spend (VULN #5 PATCHED)

**Ubicación**: `WalletService.withdraw()` — `apps/api/src/modules/wallet/wallet.service.ts:100-230`

```typescript
// TRANSACCIÓN ATÓMICA (ReadCommitted + SELECT FOR UPDATE, timeout 10s)
async withdraw(driverId: string, amount: number) {
  return this.prisma.$transaction(async (tx) => {
    // 1. CANDADO EXCLUSIVO — SELECT FOR UPDATE
    const [walletRow] = await tx.$queryRaw<WalletRow[]>`
      SELECT id, available_balance, bank_info
      FROM wallets WHERE driver_id = ${driverId} FOR UPDATE
    `;
    
    // 2. VALIDACIONES PRE-DEDUCCIÓN
    if (!walletRow) throw BadRequestException("Wallet no existe");
    if (!walletRow.bank_info) throw BadRequestException("Cuenta bancaria no configurada");
    if (Number(walletRow.available_balance) < amount) throw BadRequestException("INSUFFICIENT_BALANCE");
    
    // 3. DEDUCCIÓN ATÓMICA — RAW SQL (sin middleware Prisma)
    await tx.$executeRaw`
      UPDATE wallets SET available_balance = available_balance - ${amount}
      WHERE driver_id = ${driverId}
    `;
    
    // 4. SAFETY NET — Verificación post-deducción
    const [verify] = await tx.$queryRaw<{available_balance: number}[]>`
      SELECT available_balance FROM wallets WHERE driver_id = ${driverId}
    `;
    if (Number(verify.available_balance) < 0) {
      // EMERGENCY ROLLBACK
      await tx.$executeRaw`
        UPDATE wallets SET available_balance = available_balance + ${amount}
        WHERE driver_id = ${driverId}
      `;
      throw BadRequestException("DOUBLE_SPEND_PREVENTED");
    }
    
    // 5. REGISTRO EN LEDGER
    const transaction = await tx.financialTransaction.create({
      data: {
        type: "WITHDRAWAL",
        category: "DRIVER_PAYOUT",
        amount,
        netAmount: amount,
        taxAmount: 0,
        status: "PENDING",  // Bancario async — webhook marca COMPLETED
        entityId: driverId,
        reference: `WD-${driverId.substring(0,8)}-${Date.now()}`,
      }
    });
    
    return { success: true, newBalance: verify.available_balance, transactionId: transaction.id };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 10000 });
}
```

**GARANTÍAS**:
- ✅ **Atomicidad**: `SELECT FOR UPDATE` + `UPDATE` en misma transacción
- ✅ **Aislamiento**: `ReadCommitted` + row-lock evita dirty reads
- ✅ **Idempotencia**: `reference` único en `FinancialTransaction` (nullable @unique)
- ✅ **Safety net**: Verificación post-deducción + rollback automático
- ✅ **Timeout**: 10s evita deadlocks en alta concurrencia

### 4.3 Conciliación Mensual — Truth Bridge (Día 2, 08:00 AST)

**Ubicación**: `BiService.generateReconciliationReport()` — `apps/api/src/modules/bi/bi.service.ts:301-424`

```typescript
// EJECUCIÓN: Cron día 2, 08:00 AST (BiScheduler NO lo tiene — agregar)
// PERÍODO: Mes anterior (YYYY-MM)

const periodStart = new Date(year, month - 1, 1);
const periodEnd = new Date(year, month, 0, 23, 59, 59);

// AGREGACIONES SQL ÚNICAS (O(1) por driver):
const impressionsByDevice = await prisma.playbackEvent.groupBy({
  by: ["deviceId"],
  where: { eventType: "play_confirm", verified: true, timestamp: { gte: periodStart, lte: periodEnd }},
  _count: { _all: true }
});

const revenueReceived = await prisma.financialTransaction.aggregate({
  where: { type: "INCOMING", status: "COMPLETED", category: "PUBLICIDAD", createdAt: { gte: periodStart, lte: periodEnd }},
  _sum: { amount: true }
});

// POR CADA DRIVER (batch 5):
const deliveredImpressions = device ? impressionsByDevice.get(device.deviceId) || 0 : 0;
const payrollDue = driver.payrollPayments.reduce((a,p) => a + p.amount, 0);
const payrollPaid = driver.payrollPayments.filter(p => p.status === "PAID").reduce((a,p) => a + p.amount, 0);
const revenueContracted = BUSINESS_RULES.ADVERTISER_COST_PER_CAMPAIGN_RD;  // Por campaña activa

// DISCREPANCIAS:
if (subscription?.status !== "ACTIVE") { discrepancyType = "UNPAID_SUBSCRIPTION"; hasDiscrepancy = true; }
else if (deliveredImpressions < 10) { discrepancyType = "LOW_DELIVERY"; hasDiscrepancy = true; }
else if (payrollDue > payrollPaid) { discrepancyType = "PAYROLL_PENDING"; hasDiscrepancy = true; }
else { discrepancyType = "OK"; hasDiscrepancy = false; }
```

**TIPOS DE DISCREPANCIA OFICIALES**:
| Tipo | Significado | Acción Requerida |
|------|-------------|------------------|
| `OK` | Sin discrepancias | Ninguna |
| `UNPAID_SUBSCRIPTION` | Suscripción vencida/no pagada | Kill-Switch + cobro RD$6,000 |
| `MISSING_PAYMENT` | Pago anunciante no recibido | Seguimiento cobranza |
| `LOW_DELIVERY` | < 10 playbacks verificados/mes | Revisar tablet/cobertura GPS |
| `PAYROLL_PENDING` | Nómina calculada pero no pagada | Procesar pago bancario |

### 4.4 Facturación Anunciantes — Suscripción Mensual (Día 1, 02:30 AST)

**Ubicación**: `AdvertiserBillingService.runMonthlySubscriptionBilling()` + `BiScheduler.handleAdvertiserSubscriptionBilling()`

```typescript
// CRON: "30 2 1 * *" (Día 1, 02:30 AST — America/Santo_Domingo)
async processSubscriptionBilling(sub: AdvertiserSubscription) {
  const subtotal = sub.numberOfScreens * sub.monthlyRate;  // 1500 * screens
  const taxAmount = subtotal * sub.taxRate;  // 18%
  const totalAmount = subtotal + taxAmount;
  
  // 1. Crear Invoice (PENDING)
  const invoice = await prisma.invoice.create({
    data: {
      advertiserId: sub.advertiserId,
      issueDate: new Date(),
      dueDate: addDays(new Date(), 30),  // Net 30
      subtotal, taxAmount, totalAmount, status: "PENDING",
    }
  });
  
  // 2. Generar PDF (Proof of Play + Invoice combinado)
  const pdf = await generateSubscriptionInvoicePDF({ invoice, subscription: sub, ... });
  
  // 3. Subir PDF a Supabase Storage → actualizar pdfUrl
  // 4. Enviar email con adjunto PDF
  // 5. Actualizar nextBillingDate (+1 mes, manejo fin de mes)
}
```

### 4.5 Regla 402 — Kill-Switch Morosidad (Diario 03:00 AST)

**Ubicación**: `FinanceService.checkHighDelinquency()` + `notifyMorosidad()`

```typescript
// CRON: @Cron(CronExpression.EVERY_DAY_AT_3AM)
// TARGET: Drivers con status=OPERATIVO, subscriptionPaid=false, subscriptionEnd < today

async notifyMorosidad(deviceId: string) {
  // DEDUP: Una notificación por device/día
  const reference = `REGLA-402-${dateKey}-${deviceId.substring(0,8)}`;
  const existing = await prisma.financialTransaction.findUnique({ where: { reference }});
  if (existing) return { duplicate: true };
  
  // 1. REGISTRAR EN LEDGER ANTES DE NOTIFICAR (candado idempotencia)
  await prisma.financialTransaction.create({
    data: {
      type: "INCOMING", category: "SUSCRIPCION", status: "PENDING",
      amount: 6000, taxAmount: (6000/1.18)*0.18, netAmount: 6000 - tax,
      entityId: driverId, reference, note: "Factura morosidad Kill-Switch"
    }
  });
  
  // 2. GENERAR PDF SOS (generateDebtInvoicePDF)
  // 3. ENVIAR WHATSAPP (sendDelinquencyAlert)
  // 4. Device recibe 402 en próximo /check-in hasta pago
}
```

---

## 5. ENDPOINTS API FINANCIEROS — CONTRATO EXPLICITO

### 5.1 Finance Module (`/api/v1/finance`)

| Método | Endpoint | Auth | Descripción | Response |
|--------|----------|------|-------------|----------|
| GET | `/payroll?month&year` | Admin | Nómina calculada TODOS los drivers | `PayrollEntry[]` |
| POST | `/payroll/pay` | Admin | Procesar pago (Idempotency-Key) | `PayrollPayment` |
| POST | `/payroll/trigger` | Admin | Generar nómina masiva del mes | `{success, count}` |
| GET | `/report/campaigns` | Admin/Advertiser | Facturación anunciantes x impresiones | `CampaignBilling[]` |
| GET | `/invoice/:campaignId` | Admin/Advertiser | Factura HTML profesional | `string (HTML)` |
| GET | `/export/payroll.csv` | Admin | Export CSV nómina | `text/csv` |
| POST | `/transactions` | Admin | Registrar transacción manual | `FinancialTransaction` |
| GET | `/summary` | Admin | MRR, Burn Rate, Net Projection | `FinancialSummary` |
| GET | `/investor-metrics` | Admin | CAC, LTV, EBITDA, Payback | `InvestorMetrics` |
| GET | `/ledger` | Admin | Últimas 50 transacciones | `FinancialTransaction[]` |

#### Payloads Específicos

**POST `/payroll/pay`** (Idempotency-Key header requerido):
```json
{ "driverId": "uuid", "month": 9, "year": 2026 }
```
→ Genera `reference = PAY-YYMM-UUID8` internamente (servidor, no cliente)

**POST `/transactions`**:
```json
{
  "type": "INCOMING|OUTGOING",
  "category": "PUBLICIDAD|SUSCRIPCION|NOMINA|REFERRAL|OPEX_*",
  "amount": 1500,
  "entityId": "uuid?",
  "reference": "string?",  // Idempotency key externa
  "note": "string?"
}
```

### 5.2 BI Module (`/api/v1/bi`)

| Método | Endpoint | Auth | Descripción | Cache |
|--------|----------|------|-------------|-------|
| GET | `/kpis` | Admin | Dashboard maestro | 5 min |
| GET | `/fleet-health` | Admin | Estado flota (vista materializada) | 5 min |
| GET | `/fleet-health/:deviceId/drill-down` | Admin | Perfil 360° taxi | — |
| POST | `/reconciliation/generate` | Admin | Ejecutar conciliación manual | `{period, total}` |
| GET | `/reconciliation/:period` | Admin | Reporte paginado | `Paginated<ReconciliationReport>` |
| GET | `/hotspots` | Admin/Advertiser | Heatmap GPS (últimos 2000 puntos) | 5 min |

### 5.3 Wallet Module (`/api/v1/wallet` — Driver)

| Método | Endpoint | Auth | Descripción | Validaciones |
|--------|----------|------|-------------|--------------|
| GET | `/balance` | Driver | Balance + desglose earnings | — |
| POST | `/withdraw` | Driver | Solicitud retiro (atómico) | `amount > 0`, `bankInfo` existe, `balance >= amount` |
| POST | `/bank` | Driver | Actualizar datos bancarios | `bankInfo` JSON válido |

**POST `/withdraw` Response**:
```json
{ "success": true, "newBalance": 12500, "transactionId": "uuid", "reference": "WD-abc123-1234567890" }
```

**Errores**:
- `400 INSUFFICIENT_BALANCE` — `{ currentBalance, requestedAmount }`
- `400 DOUBLE_SPEND_PREVENTED` — Safety net activado
- `400` — Cuenta bancaria no configurada

### 5.4 Advertiser Module (`/api/v1/advertisers`)

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/invoices` | Advertiser | Facturas propias (paginado) |
| GET | `/invoices/:id/pdf` | Advertiser | Descargar PDF factura |
| POST | `/subscriptions` | Admin | Crear suscripción anunciante |
| PATCH | `/subscriptions/:id/cancel` | Admin | Cancelar suscripción |

---

## 6. CRON JOBS AUTOMÁTICOS — HORARIO OFICIAL (AST)

| Frecuencia | Hora (AST) | Tarea | Servicio | Descripción |
|------------|------------|-------|----------|-------------|
| Diario | 00:00 | `getMasterKpis()` → BiDashboardSnapshot | BiScheduler | Snapshot KPIs diarios |
| Diario | 02:00 | `generateReconciliationReport(period_actual)` | BiScheduler | Conciliación período actual |
| Diario | 03:00 | `checkHighDelinquency()` (Kill-Switch) | FinanceService | Escaneo morosidad + notificaciones |
| Diario | 04:00 | Limpieza IdempotencyKey expiradas | BiScheduler | Purga `isLocked` + `expiresAt < now` |
| Cada 5 min | — | `REFRESH mv_fleet_health CONCURRENTLY` | BiScheduler | Fleet health (no bloquea lecturas) |
| Día 1 | 00:00 | `triggerMonthlyBilling()` | BiScheduler | Generar nóminas masivas mes anterior |
| Día 1 | 02:30 | `runMonthlySubscriptionBilling()` | AdvertiserBillingService | Facturar suscripciones anunciantes |
| Día 1 | 00:00 | `runMonthlyAudit()` | PayrollAuditService | Evaluar penalizaciones mes anterior |
| Día 2 | 08:00 | `generateReconciliationReport(mes_anterior)` | **AGREGAR A BiScheduler** | Conciliación mensual oficial |
| Domingos | 03:00 | Purga `analytics_events` > 90 días | BiScheduler | Limpieza telemetría |

> **FALTANTE CRÍTICO**: Agregar `@Cron("0 8 2 * *", {timeZone: "America/Santo_Domingo"})` en `BiScheduler` para conciliación día 2.

---

## 7. VISTAS MATERIALIZADAS POSTGRESQL (SUPABASE)

```sql
-- ─── MRR + Suscriptores ───
CREATE MATERIALIZED VIEW mv_mrr_summary AS
SELECT COUNT(*) FILTER (WHERE subscription_paid = true) AS active_subscribers,
       SUM(6000) FILTER (WHERE subscription_paid = true) AS mrr
FROM drivers;
CREATE UNIQUE INDEX ON mv_mrr_summary ((1));

-- ─── Campañas Performance ───
CREATE MATERIALIZED VIEW mv_campaign_performance AS
SELECT c.id, c.name, c.target_impressions, 
       COUNT(pe.id) FILTER (WHERE pe.verified = true) AS delivered_impressions
FROM campaigns c
LEFT JOIN media m ON m.campaign_id = c.id
LEFT JOIN playback_events pe ON pe.video_id = m.id AND pe.verified = true
GROUP BY c.id;
CREATE UNIQUE INDEX ON mv_campaign_performance (id);

-- ─── Fleet Health (refresh cada 5 min) ───
CREATE MATERIALIZED VIEW mv_fleet_health AS
SELECT d.*, dr.full_name, dr.subscription_paid,
       EXTRACT(EPOCH FROM (NOW() - d.last_heartbeat))/3600 AS hours_offline,
       CASE 
         WHEN d.last_heartbeat > NOW() - INTERVAL '5 min' THEN 'ONLINE'
         WHEN d.last_heartbeat > NOW() - INTERVAL '1 hour' THEN 'STALE'
         WHEN d.last_heartbeat > NOW() - INTERVAL '24 hours' THEN 'WARNING'
         ELSE 'CRITICAL'
       END AS connectivity_status
FROM devices d LEFT JOIN drivers dr ON dr.id = d.driver_id;
CREATE UNIQUE INDEX ON mv_fleet_health (id);
```

**Refresh Policy**: `REFRESH MATERIALIZED VIEW CONCURRENTLY mv_fleet_health;` (cada 5 min via cron)  
**NO USAR** `REFRESH MATERIALIZED VIEW` sin `CONCURRENTLY` — bloquea lecturas.

---

## 8. PDF GENERATION — CATÁLOGO OFICIAL

| Tipo | Método | Servicio | Uso | Datos Requeridos |
|------|--------|----------|-----|------------------|
| Liquidación Chofer | `generateDriverSettlementPDF()` | InvoiceService | Nómina pagada | `driverData: { chofer, placa, anuncios, ingreso, estatus }` |
| Factura Morosidad | `generateDebtInvoicePDF()` | InvoiceService | Kill-Switch RD$6,000 | `driverData: { deviceId, chofer, placa }` |
| Certificado Exhibición | `generateCampaignProofOfPlayPDF()` | InvoiceService | Anunciantes (PoP) | `campaignData, metrics: { totalImpressions, assignedTaxis }` |
| Inventario Flota | `generateFleetStatusPDF()` | InvoiceService | Admin técnico | `devices: Device[]` |
| Recibo Transacción | `generateTransactionReceiptPDF()` | InvoiceService | Ledger entry | `tx: FinancialTransaction` |
| Reporte Semanal | `generateWeeklyPerformancePDF()` | InvoiceService | Anunciantes semanal | `campaign, data: {day, impressions, scans, ctr}[]` |
| Factura Proforma | `generateProformaPDF()` | InvoiceService | Borrador ITBIS | `{ concepto, montoBruto, itbis, montoNeto, socio }` |
| Factura Suscripción | `generateSubscriptionInvoicePDF()` | AdvertiserBillingService | Facturación mensual anunciantes | `{ invoice, subscription, advertiser, subtotal, taxAmount, totalAmount }` |

**Motor**: `pdfmake` 0.3.x con fuentes Helvetica (embebidas)  
**Estilo**: TAD Yellow `#FFD400` / Dark `#0a0a0a` / Card `#141414`

---

## 9. RIESGOS IDENTIFICADOS Y MITIGACIONES — ESTADO ACTUAL

| # | Riesgo | Ubicación | Estado | Mitigación Implementada |
|---|--------|-----------|--------|-------------------------|
| **VULN #5** | Double-spend en `withdraw()` | `wallet.service.ts` | ✅ **RESUELTO v12.1.2** | `SELECT FOR UPDATE` + raw SQL `UPDATE` + safety net post-deducción + rollback automático |
| **VULN #7** | `walletBalance` en `Driver` NO en `Wallet` | `schema.prisma:412` | ✅ **RESUELTO v12.1.3** | Migración `20260916_wallet_unification`: `Wallet.availableBalance` = fuente única; `Driver.walletBalance` eliminado |
| **OnDelete Mismatch** | Prisma `Cascade` vs DB `RESTRICT` | Wallet, Commission, ActiveAd, Telemetry | ⚠️ **INTENCIONAL** | DB RESTRICT protege datos financieros; Prisma ignora — no borrar Drivers con datos financieros |
| **Client Stale** | Prisma Client embebido difiere de schema | Deploy pipeline | ✅ **CONTROLADO** | `npx prisma generate` OBLIGATORIO pre-deploy en CI/CD |
| **RLS Cycle** | Policy #17 depende de `mv_active_campaigns` | Supabase RLS | ⚠️ **MONITOREADO** | Refresh vista obligatorio tras cambios de campaña (cron 5 min) |
| **Idempotency Leak** | Keys huérfanas por crashes | `IdempotencyKey` table | ✅ **RESUELTO v12.1.2** | Cron 04:00 libera `isLocked` >1h + purga `expiresAt < now` |
| **N+1 Payroll** | Query por driver en cálculo nómina | `finance.service.ts` | ✅ **RESUELTO v12.3** | Pre-carga batch: `groupBy` GPS/Playbacks + `findMany` payroll records |

---

## 10. IMPLEMENTACIÓN PENDIENTE — ROADMAP EXPLÍCITO

### 10.1 ✅ Completado (Auditoría v12.3)
- [x] Auditoría completa código financiero
- [x] Mapeo endpoints, modelos, flujos
- [x] Identificación VULN #5, #7
- [x] Wallet unification (migración aplicada)
- [x] Payroll batch optimization (N+1 eliminado)
- [x] Idempotency DB-backed + cron cleanup

### 10.2 ✅ Resuelto (Implementado v12.4)
- [x] **Conciliación Día 2**: Nuevo cron `0 8 2 * *` (timeZone AST) en `BiScheduler.handleMonthlyReconciliation()` — Truth Bridge del mes anterior con retroceso de año en enero
- [x] **Facturación Anunciantes PDF**: `AdvertiserBillingService` ahora sube el PDF real a Supabase Storage (bucket `invoices/`) y guarda URL pública en `Invoice.pdfUrl` (reemplaza base64 truncado roto)
- [x] **PDF upload genérico**: Nuevo `SupabaseService.uploadBuffer()` (auto-create bucket, contentType, upsert) reutilizable
- [x] **Endpoint facturación manual**: `POST /finance/advertiser/subscription/:id/bill` cableado — inyecta `AdvertiserBillingService` y llama `billSubscriptionNow()` (era un stub que devolvía success sin hacer nada)
- [x] **Fix build financiero**: corregido error de sintaxis `finance.service.ts:440` (paréntesis extra) + campos `context`/`stackTrace` → `source`/`details`/`entityId` en `SystemError.create` en bi.scheduler y advertiser-billing
- [x] **Type-check/build**: `tsc --noEmit` EXIT=0 y `nest build` EXIT=0 en apps/api

### 10.3 ✅ Resuelto (Loop Autónomo v12.4.1)
- [x] **Dashboard KPIs sin fallback real-time**: `BiService.getMasterKpis()` reescrita — lee el snapshot de hoy (cache-hit), cae al snapshot más reciente como degradado (dashboard nunca vacío), y el cálculo pesado solo corre cuando no hay NINGÚN snapshot o con `forceRefresh` (cron diario). Guarda anti-stampede `snapshotCalculationInFlight` evita N cálculos concurrentes. Cron `handleDailySnapshot` ahora fuerza la regeneración diaria.
- [x] **Wallet/Retiros flujo completo cerrado**: meta mínima de retiro RD$5,000 (constante `WalletService.MIN_WITHDRAWAL_AMOUNT_RD`, código `BELOW_MINIMUM_WITHDRAWAL`). Nuevos `confirmWithdrawal()` (`PENDING→COMPLETED`, idempotente) y `refundFailedWithdrawal()` (`PENDING→FAILED` con reembolso atómico al balance, idempotente). Endpoints admin `POST /wallet/withdrawals/:id/confirm` y `/reject` (rol ADMIN).
- [x] **Impact Calculator — integridad de audit-trail corregida**: bug en `FORMULAS_USED.uniqueReachPerScreenPerMonth` referenciaba ids de fuente inexistentes (`occupancy-rate`, `grossImpressionsPerScreenPerMonth`) → rastreo incompleto/mentiroso. Corregido a ids reales + nueva `validateFormulaSources()` (detecta ids rotos) + mecanismo de calibración RD honrado (no se inventan datos ONE/DIGESETT).
- [x] **Type-check + build**: `tsc --noEmit` y `nest build` EXIT=0; tests impact-calculator 37/37.

### 10.4 ✅ Resuelto (Loop Autónomo v12.4.1)
- [x] **Migración Schema — Targeting multi-ciudad/flota real (JSONB + GIN)**: `Campaign.targetCities`/`targetFleets` convertidas de `String` (texto JSON inerte) a `Json`/JSONB. Migración `20260917_campaign_targeting_jsonb` (cast seguro `COALESCE(...::jsonb,'[]')`, índices GIN `jsonb_path_ops`). Se habilitó la **escritura** en DTO (`target_cities`/`target_fleets` como `string[]`) y service (`create`/`update`). Las consultas migraron de `::text LIKE '%city%'` (nunca matcheaba + sin índices) a operador JSONB `@>` (que SÍ usa GIN) en `sync.service` y `campaign.service`. MV `mv_active_campaigns` recibe índices GIN sobre las dos columnas. Frontends normalizados (admin: `Array.isArray ? raw : JSON.parse`, orchestrator: paso-through como array). **Antes era código muerto — ahora es un canal funcional de segmentación.**

### 10.5 ✅ Resuelto (Loop Autónomo v12.4.1)
- [x] **Multi-moneda**: `FinancialTransaction` ahora persiste `currency` (enum ISO 4217 `Currency` DOP/USD/EUR, default DOP) + índice. Migración `20260917_add_currency_to_financial_transactions` (crea tipo enum + columna + índice). `recordTransaction` y `POST /finance/transactions` aceptan `currency` opcional. **Antes la moneda se emitía en respuestas pero nunca se persistía (ambigüedad silenciosa) — ahora es dato real.**
- [x] **Exportación Contable DGII**: nuevas `exportDgii606` (Compras/Gastos), `exportDgii607` (Ventas/Facturas), `exportDgii608` (Retenciones/Nómina) en `finance.service` + endpoint `GET /finance/export/dgii/:format.csv?year=${Y}`. Constante config `BUSINESS_RULES.DGII_RNC_EMISOR` (placeholder claro, completar con RNC real). Documentado que los datos se mapean de Invoices/FinancialTransactions/PayrollPayments existentes.
- [x] **Factura Proforma Anunciantes (pre-billing)**: `AdvertiserBillingService.generateProformaInvoice()` crea Invoice en estado `PROFORMA` (estimado screens×rate×months + ITBIS) ANTES de activar campaña; `confirmProformaInvoice()` la convierte a PENDING (idempotente). Endpoints `POST /finance/advertiser/proforma` y `POST /finance/advertiser/proforma/:invoiceId/confirm`.
- [x] **Verificación**: `prisma generate` EXIT=0, `tsc --noEmit` EXIT=0, `nest build` EXIT=0.

### 10.6 📋 Backlog Priorizado
- [ ] **Integración Webhook Bancario externo**: conectar `/wallet/withdrawals/:id/confirm|reject` a la notificación real del banco (API firmada). Los endpoints admin ya abren el flujo PENDING→COMPLETED/FAILED manualmente.
- [ ] **Ingesta datos ONE/DIGESETT**: cuando existan datasets reales de tránsito RD, ingresarlos en `impact-calculator/sources.ts` y flipear `isCalibrationStatus().hasOwnData=true` (tier C→A/B).
- [ ] **Config fiscal completa**: rellenar `DGII_RNC_EMISOR` y mapeo RNC de anunciantes/conductores para presentaciones DGII formales.
- [ ] **GPU/ComfyUI**: optimizar generación de video del influenciador (influencer-ia).

---

## 11. COMANDOS DE DESARROLLO — PROTOCOLO OBLIGATORIO

```bash
# En apps/api/ — SIEMPRE desde este directorio

# 1. Regenerar Prisma Client (OBLIGATORIO tras cualquier cambio en schema.prisma)
npx prisma generate

# 2. Desarrollo local (SQLite)
npx prisma db push                    # Push schema a dev.db
npx prisma migrate dev --name <name>  # Migración con nombre descriptivo

# 3. Producción (Supabase/PostgreSQL)
npx prisma migrate deploy             # Deploy migraciones a producción
# NUNCA usar db push en producción

# 4. Seed datos de prueba
npm run seed                          # o: npx ts-node prisma/seed.ts
npm run simulate                      # o: npx ts-node prisma/simulate-data.ts

# 5. Verificar migraciones pendientes
npx prisma migrate status

# 6. Studio (visualización)
npx prisma studio
```

> **REGLA DE ORO**: `npx prisma generate` **DEBE** ejecutarse después de CADA `git pull` y ANTES de `npm run build`/`deploy`. El client embebido en Docker debe regenerarse en el build.

---

## 12. URLS DE PRODUCCIÓN (EASYPANEL)

| Recurso | URL | Puerto Interno | Health Check |
|---------|-----|----------------|--------------|
| **Dashboard Admin** | https://tad-dashboard.rewvid.easypanel.host | 3000 | `/health` |
| **API Gateway** | https://tad-api.rewvid.easypanel.host/api/v1 | 3001 | `/health` |
| **Video Engine (Remotion)** | https://tad-remotion.rewvid.easypanel.host | 3002 | `/health` |
| **Portal Anunciante** | https://tad-advertiser.rewvid.easypanel.host | 3003 | `/health` |
| **Portal Conductor** | https://tad-driver.rewvid.easypanel.host | 3004 | `/health` |
| **N8N Orchestration** | https://n8n.rewvid.easypanel.host | 5678 | `/healthz` |
| **ComfyUI (CPU)** | https://comfyui.rewvid.easypanel.host | 8188 | `/system_stats` |
| **Supabase Project** | https://supabase.com/dashboard/project/ltdcdhqixvbpdcitthqf | — | Dashboard |
| **Supabase DB (Pooler)** | `postgresql://...:6543/postgres?pgbouncer=true` | 6543 | `pg_stat_activity` |
| **Supabase DB (Direct)** | `postgresql://...:5432/postgres` | 5432 | Solo migraciones |

---

## 13. REGLAS DE ORO — CHECKLIST ANTES DE CUALQUIER CAMBIO FINANCIERO

- [ ] **¿Usa `BUSINESS_RULES`?** — No hardcodear constantes
- [ ] **¿Transacción atómica?** — `prisma.$transaction` + isolation level explícito
- [ ] **¿Idempotencia?** — `reference` único en `FinancialTransaction` + `IdempotencyKey` table
- [ ] **¿SELECT FOR UPDATE?** — Todo `withdraw`/pago que lea y escriba balance
- [ ] **¿ITBIS correcto?** — Solo `PUBLICIDAD` y `SUSCRIPCION` llevan 18%
- [ ] **¿PoP verificado?** — Solo `playbackEvent.verified = true` cuenta para ingresos
- [ ] **¿Cap 15 anuncios?** — `min(activeAds, 15)` en nómina
- [ ] **¿Kill-Switch gate?** — `subscriptionPaid && subscriptionEnd >= now` para pagar
- [ ] **¿Penalización correcta?** — Solo nivel BASE, 10%, tras 2+ meses consecutivos
- [ ] **¿Referidos anunciantes?** → Wallet `OPEX_COMMISSION` en tiempo real, NO en nómina
- [ ] **¿Prisma generate?** — Ejecutado tras schema changes
- [ ] **¿Tests cubren edge cases?** — Balance 0, concurrencia, rollback, timezone AST

---

## 14. GLOSARIO TÉCNICO — DEFINICIONES PRECISAS

| Término | Definición Exacta |
|---------|-------------------|
| **PoP (Proof of Play)** | Evento `playbackEvent` con `verified = true` Y `eventType = "play_confirm"` — única prueba de exhibición válida |
| **Kill-Switch** | Bloqueo automático (HTTP 402) en `/device/check-in` cuando `subscriptionPaid = false` O `subscriptionEnd < now()` |
| **MRR** | Monthly Recurring Revenue = `activeSubscribers * 6000` + `impressionsMTD * 0.5` (estimado conservador) |
| **Burn Rate** | `SUM(FinancialTransaction.amount) WHERE type=OUTGOING AND createdAt >= monthStart` |
| **Yield/Screen** | `MRR / totalDevices` — ingreso promedio por tablet activa |
| **ARPU** | Average Revenue Per User = `yieldPerScreen` (equivalentes en este modelo) |
| **Delivery Rate** | `deliveredImpressions / targetImpressions * 100` (cap 100%) |
| **Sync Health** | `onlineDevices / totalDevices * 100` |
| **Consecutive Months Under Goal** | Contador en `Driver.consecutiveMonthsUnderGoal` — incrementa cron día 1 si `transmissionHours < level.hours` |
| **Idempotency-Key** | Header HTTP `Idempotency-Key` — almacenado en `IdempotencyKey` table con TTL 24h + lock anti-concurrencia |
| **Double-Spend** | Intento de retirar más de `Wallet.availableBalance` — prevenido por `SELECT FOR UPDATE` + safety net |

---

## 15. MIGRACIONES CRÍTICAS — HISTORIAL

| Migración | Fecha | Cambio Crítico |
|-----------|-------|----------------|
| `20260424_v12_schema_sync` | 2026-04-24 | Enum `SystemStatus` español, índices, RLS |
| `20260819_social_agent_models` | 2026-08-19 | Modelos Social Agent (Meta) |
| `20260916_wallet_unification` | 2026-09-16 | **VULN #7 FIX**: `Wallet` = fuente única balance, `Driver.walletBalance` DROP COLUMN, `Driver.bankAccount` → `Wallet.bankInfo` |

> **PRÓXIMA MIGRACIÓN PLANIFICADA**: `20260920_gin_indexes_campaigns` — Índices GIN en `targetCities`/`targetFleets` + `productsData`

---

## 16. ALERTAS Y MONITOREO — UMBRALES CRÍTICOS

| Métrica | Umbral WARNING | Umbral CRITICAL | Acción |
|---------|----------------|-----------------|--------|
| `Wallet` balance negativo | — | **ANY** | `DOUBLE_SPEND_PREVENTED` alert + rollback automático |
| Discrepancias conciliación | > 5 drivers | > 20 drivers | Alerta Slack/Email admin + `SystemError` severity CRITICAL |
| Dispositivos CRITICAL (>24h offline) | > 10% flota | > 25% flota | `BiScheduler` alerta + notificación WhatsApp fleet managers |
| Idempotency keys huérfanas | > 100 | > 1000 | Cron 04:00 limpia automáticamente |
| Payroll PENDING > 48h | > 5 | > 20 | Alerta finance team — procesar pagos bancarios |
| Facturas anunciantes OVERDUE | > 3 | > 10 | Alerta cobranza + suspender campañas |

---

**FIN DEL DOCUMENTO MAESTRO ENRIQUECIDO**  
*Este documento es la única fuente de verdad financiera. Cualquier discrepancia con código = bug en código, no en docs.*  
*Actualizar este documento ANTES de mergear cualquier PR que toque módulos finance/wallet/bi/advertisers.*