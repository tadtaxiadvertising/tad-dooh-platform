# 🔄 MIGRACIÓN ESQUEMA v12.1.3 — WALLET UNIFICATION + GIN INDEXES

**Fecha**: 2026-09-16  
**Versión**: 12.1.3  
**Estado**: Listo para aplicar  

---

## 📋 RESUMEN DE CAMBIOS

### 1. WALLET UNIFICATION (VULN #7 FIX)
**Problema**: Duplicación de balance en `Driver.walletBalance` (tabla `drivers`) y `Wallet.availableBalance` (tabla `wallets`). Causa divergencias, double-spend potential, y confusión en código.

**Solución**: `Wallet` es ahora la **fuente autoritativa única** de balance y datos bancarios.

| Cambio | Antes | Después |
|--------|-------|---------|
| `Driver.walletBalance` | Float @map("wallet_balance") | **ELIMINADO** |
| `Driver.bankAccount` | Json? @map("bank_account") | **DEPRECADO** (comentario + compatibilidad) |
| `Wallet.availableBalance` | Float @default(0) | **FUENTE AUTORITATIVA** |
| `Wallet.bankInfo` | Json? @map("bank_info") | **FUENTE AUTORITATIVA** para datos bancarios |
| `Wallet.driver` relation | Sin onDelete | `@relation(..., onDelete: Cascade)` |
| `Wallet` | Sin índice driverId | `@@index([driverId])` |

**Migración de datos** (`20260916_wallet_unification/migration.sql`):
```sql
-- 1. Crear Wallet para drivers sin wallet (copia balance + bank_account)
-- 2. Sincronizar balances (tomar MAX para evitar pérdida)
-- 3. Copiar bank_account → bank_info donde falte
-- 4. VERIFICAR → ALTER TABLE drivers DROP COLUMN wallet_balance
```

---

### 2. CÓDIGO ACTUALIZADO A WALLET MODEL

| Servicio | Método | Cambio |
|----------|--------|--------|
| `FinanceService.processPayment()` | Incremento balance payroll | `tx.wallet.upsert({ where: { driverId }, update: { availableBalance: { increment: amount } } })` |
| `WalletService.getBalance()` | Lectura balance | `prisma.wallet.findUnique({ where: { driverId }, select: { availableBalance } })` |
| `WalletService.withdraw()` | SELECT FOR UPDATE drivers | `SELECT FOR UPDATE wallets WHERE driver_id` + UPDATE wallets |
| `WalletService.updateBank()` | Update Driver.bankAccount | `prisma.wallet.upsert({ where: { driverId }, update: { bankInfo: accountData } })` |
| `CampaignService.assignCampaignToDevices()` | `tx.wallet.upsert()` | Ya usaba Wallet ✅ |
| `DriversService.hasBankAccountConfigured()` | Sync, recibía `bankAccount` objeto | **Async**, recibe `driverId`, lee `Wallet.bankInfo` |

---

### 3. GIN INDEXES PARA JSONB (Performance)

**Migración** (`20260916_gin_indexes/migration.sql`):

| Tabla | Columna | Índice | Uso típico |
|-------|---------|--------|------------|
| `drivers` | `identidad_vehicular` | `idx_drivers_identidad_vehicular_gin` | `@> '{"marca": "Toyota"}'` |
| `drivers` | `hardware_config` | `idx_drivers_hardware_config_gin` | `@> '{"version": "2.0"}'` |
| `drivers` | `bank_account` (legacy) | `idx_drivers_bank_account_gin` | Compatibilidad |
| `wallets` | `bank_info` | `idx_wallets_bank_info_gin` | Datos bancarios nuevos |
| `campaign_intents` | `file_metadata` | `idx_campaign_intents_file_metadata_gin` | Metadatos archivos |

**Índices parciales adicionales**:
- `idx_devices_online_active` — `(id) WHERE status='OPERATIVO' AND is_online=true`
- `idx_subscriptions_pending` — `(driver_id) WHERE status='PENDING'`
- `idx_campaigns_active` — `(id) WHERE active=true AND status='ACTIVE'`

---

### 4. NUEVOS ÍNDICES COMPUESTOS

| Modelo | Índice | Propósito |
|--------|--------|-----------|
| `Driver` | `@@index([status, onboardingStatus])` | Filtros dashboard admin: choferes por estado+onboarding |

---

## 🚀 CÓMO APLICAR EN PRODUCCIÓN

### Opción A: Con Prisma Migrate (Recomendado)
```bash
cd apps/api

# 1. Generar cliente actualizado
npx prisma generate

# 2. Aplicar migraciones en orden
npx prisma migrate deploy

# 3. Verificar estado
npx prisma migrate status
```

### Opción B: SQL Directo (Si prisma migrate falla)
```bash
# 1. Ejecutar wallet unification PRIMERO
psql $DATABASE_URL -f prisma/migrations/20260916_wallet_unification/migration.sql

# 2. Verificar balances
psql $DATABASE_URL -c "
SELECT d.id, d.full_name, d.wallet_balance, w.available_balance, w.bank_info
FROM drivers d
LEFT JOIN wallets w ON w.driver_id = d.id
ORDER BY d.created_at DESC LIMIT 20;
"

# 3. Si verificación OK, dropear columna
psql $DATABASE_URL -c "ALTER TABLE drivers DROP COLUMN wallet_balance;"

# 4. Ejecutar GIN indexes
psql $DATABASE_URL -f prisma/migrations/20260916_gin_indexes/migration.sql

# 5. Verificar índices
psql $DATABASE_URL -c "
SELECT indexname, indexdef FROM pg_indexes 
WHERE indexname LIKE '%gin%' OR indexname LIKE '%_active' OR indexname LIKE '%_pending'
ORDER BY indexname;
"
```

---

## ✅ CHECKLIST POST-MIGRACIÓN

- [ ] `npx prisma generate` exitoso
- [ ] `Wallet` model accesible via `prisma.wallet`
- [ ] `Driver.walletBalance` **ya no existe** en Prisma Client
- [ ] `Driver.bankAccount` marcado `@deprecated` (solo lectura legacy)
- [ ] Balances migrados correctamente (verificar 10+ drivers aleatorios)
- [ ] Índices GIN creados (`pg_indexes` query)
- [ ] Índices parciales creados
- [ ] Tests de wallet pasan: `getBalance`, `withdraw`, `updateBank`
- [ ] Payroll incrementa `Wallet.availableBalance` correctamente
- [ ] Referral bonus (CampaignService) incrementa `Wallet.availableBalance`

---

## ⚠️ RIESGOS Y MITIGACIÓN

| Riesgo | Mitigación |
|--------|------------|
| Pérdida de datos en migración balance | Usar `GREATEST()` + backup previo + verificación manual |
| Código legacy lee `driver.walletBalance` | Solo 2 ocurrencias en código (ambas actualizadas). Buscar `walletBalance` en codebase = 0 resultados tras migración |
| `bank_account` vs `bank_info` confusión | `DriversService.hasBankAccountConfigured()` ahora lee `Wallet.bankInfo`. `WalletService.updateBank()` escribe en `Wallet.bankInfo`. |
| GIN indexes en tablas grandes | Usar `CONCURRENTLY` (no bloquea writes). Ejecutar en ventana mantenimiento. |

---

## 📁 ARCHIVOS CREADOS/MODIFICADOS

```
NUEVOS:
├── prisma/migrations/20260916_wallet_unification/migration.sql
├── prisma/migrations/20260916_gin_indexes/migration.sql

MODIFICADOS:
├── prisma/schema.prisma (walletBalance removido, Wallet model mejorado, índices)
├── src/modules/finance/finance.service.ts (processPayment usa Wallet.upsert)
├── src/modules/wallet/wallet.service.ts (getBalance/withdraw/updateBank usan Wallet model)
├── src/modules/drivers/drivers.service.ts (hasBankAccountConfigured async + Wallet.bankInfo)

DOCUMENTACIÓN:
├── FINANCIAL_SYSTEM_MASTER.md (actualizado con Wallet como fuente única)
```

---

## 🔗 REFERENCIAS CRUZADAS

- **VULN #5**: Double-spend prevention (SELECT FOR UPDATE) — YA IMPLEMENTADO en `WalletService.withdraw()`
- **VULN #7**: Wallet divergence cleanup — **ESTA MIGRACIÓN LO RESUELVE**
- **BUSINESS_RULES**: `DRIVER_RATE_PER_CAMPAIGN_RD=500`, `STARTER_KIT_ANNUAL_FEE_RD=6000`, `ITBIS_RATE=0.18`