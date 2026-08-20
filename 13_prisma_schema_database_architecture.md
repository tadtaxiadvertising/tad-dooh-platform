# 🗄️ 13 — PRISMA SCHEMA REFERENCE & DATABASE ARCHITECTURE

> **Versión**: 13.2.0 (v12.3.0 — Social Agent Models Added)
> **Última Actualización**: 2026-08-19
> **Audiencia**: Backend Developers, DBA, Arquitectos
> **Fuente de Verdad**: `apps/api/prisma/schema.prisma`
> **Complementos**: `apps/api/prisma/views.sql`, `apps/api/prisma/migrations/`

---

## 1. VISIÓN GENERAL DEL SCHEMA

### 1.1 Configuración del Datasource

```prisma
generator client {
  provider = "prisma-client-js"
  binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")     // Pooler: puerto 6543
  directUrl = env("DIRECT_URL")       // Direct: puerto 5432 (migraciones)
}
```

**Notas de Infraestructura:**
- `DATABASE_URL` debe apuntar al **Connection Pooler** de Supabase (puerto 6543) con `?pgbouncer=true&connection_limit=5` para evitar agotar el pool de conexiones.
- `DIRECT_URL` es la conexión directa (puerto 5432) usada exclusivamente para `prisma migrate` y `prisma db push`.
- `binaryTargets` incluye `linux-musl-openssl-3.0.x` para compatibilidad con contenedores Alpine en EasyPanel.

---

## 2. MODELOS DEL SCHEMA (38 Modelos + 1 Enum = 39 Declaraciones)

### 2.0 Enum: SystemStatus — Estado Operativo del Sistema

| Valor | Significado | Usado En |
| --- | --- | --- |
| `OPERATIVO` | Entidad activa y funcional | `Device`, `Driver` |
| `PENDIENTE_PAGO` | Esperando pago de suscripción RD$6,000 | `Driver` (onboarding) |
| `BLOQUEADO` | Bloqueado por mora — Kill-Switch activo | `Driver` (suscripción vencida) |

> **⚠️ Migración Histórica:** Los valores originales eran strings en inglés (`ACTIVE`, `PENDING`, `SUSPENDED`). La migración `20260424_v12_schema_sync` los convirtió al enum español. El campo `status` en `Campaign` y `Advertiser` sigue siendo `String` (no enum) porque sus estados son más variados (`PENDING_PAYMENT`, `ACTIVE`, `PAUSED`, `COMPLETED`, etc.).

### Registro Completo de Modelos

| # | Modelo | Tabla PostgreSQL | Sección Doc |
| --- | --- | --- | --- |
| 1 | `User` | `users` | 2.1 |
| 2 | `Driver` | `drivers` | 2.1 |
| 3 | `Device` | `devices` | 2.1 |
| 4 | `Campaign` | `campaigns` | 2.1 |
| 5 | `Playlist` | `playlists` | 2.5 |
| 6 | `PlaylistItem` | `playlist_items` | 2.5 |
| 7 | `DeviceCampaign` | `device_campaigns` | 2.5 |
| 8 | `Fleet` | `fleets` | 2.5 |
| 9 | `Advertiser` | `advertisers` | 2.7 |
| 10 | `AdvertiserSubscription` | `advertiser_subscriptions` | 2.3 |
| 11 | `PortalRequest` | `portal_requests` | 2.7 |
| 12 | `ContractAcceptance` | `contract_acceptances` | 2.7 |
| 13 | `AnalyticsEvent` | `analytics_events` | 2.2 |
| 14 | `CampaignMetric` | `campaign_metrics` | 2.2 |
| 15 | `PlaybackEvent` | `playback_events` | 2.2 |
| 16 | `Telemetry` | `telemetry` | 2.2 |
| 17 | `DriverLocation` | `driver_locations` | 2.5 |
| 18 | `DeviceHeartbeat` | `device_heartbeats` | 2.5 |
| 19 | `DeviceCommand` | `device_commands` | 2.5 |
| 20 | `Wallet` | `wallets` | 2.3 |
| 21 | `FinancialTransaction` | `financial_transactions` | 2.3 |
| 22 | `PayrollPayment` | `payroll_payments` | 2.3 |
| 23 | `Subscription` | `subscriptions` | 2.3 |
| 24 | `Commission` | `commissions` | 2.3 |
| 25 | `Invoice` | `invoices` | 2.3 |
| 26 | `ActiveAd` | `active_ads` | 2.3 |
| 27 | `Media` | `media` | 2.4 |
| 28 | `MediaAsset` | `media_assets` | 2.4 |
| 29 | `Video` | `videos` | 2.4 |
| 30 | `BiDashboardSnapshot` | `bi_dashboard_snapshots` | 2.6 |
| 31 | `ReconciliationReport` | `reconciliation_reports` | 2.6 |
| 32 | `Notification` | `notifications` | 2.8 |
| 33 | `SystemSetting` | `system_settings` | 2.8 |
| 34 | `SystemError` | `system_errors` | 2.8 |
| 35 | `CampaignIntent` | `campaign_intents` | 2.8 |
| 36 | `IdempotencyKey` | `idempotency_keys` | 2.8 |
| 37 | `SocialPostDraft` | `social_post_drafts` | 2.9 |
| 38 | `SocialInteractionLog` | `social_interaction_logs` | 2.9 |

### 2.1 Core Entities

#### `User` — Usuarios Admin del Sistema
| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | `String @uuid` | PK |
| `email` | `String @unique` | Login credential |
| `password` | `String` | Hash bcrypt |
| `role` | `String` | Default: `"ADMIN"` |
| `campaigns` | `Campaign[]` | Campañas creadas |

> **Uso**: Solo administradores internos. No confundir con `Driver` o `Advertiser`.

---

#### `Driver` — Conductores / Dueños de Tablets
| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | `String @uuid` | PK |
| `fullName` | `String` | Nombre completo |
| `cedula` | `String @unique` | ID fiscal dominicano |
| `phone` | `String @unique` | Teléfono (login credential) |
| `taxiPlate` | `String @unique` | Placa del vehículo |
| `taxiNumber` | `String?` | Número de taxi (STI-XXX) |
| `licensePlate` | `String?` | Licencia de conducir |
| `password` | `String?` | Hash bcrypt (login portal conductor) |
| `subscriptionPaid` | `Boolean` | Estado de pago RD$6,000/año |
| `subscriptionEnd` | `DateTime?` | Fecha de vencimiento |
| `status` | `SystemStatus` | `OPERATIVO` | `PENDIENTE_PAGO` | `BLOQUEADO` |
| `onboardingStatus` | `String` | Default: `"PENDING_AGREEMENT"` |
| `onboardedAt` | `DateTime` | Timestamp de registro |
| `blockedAt` | `DateTime?` | Timestamp de bloqueo |
| `level` | `String` | Default: `"BASE"` — Sistema de niveles/tier |
| `consecutiveMonthsUnderGoal` | `Int` | Default: `0` — Penalización escalada |
| `walletBalance` | `Float` | Balance en RD$ (columna directa en drivers) |
| `referralCode` | `String @uuid @unique` | Código QR para referidos |
| `bankAccount` | `Json?` | `{ banco, cuenta, tipo, cedula, ownerName? }` (offline-first) |
| `identidadVehicular` | `Json?` | Datos del vehículo (marca, modelo, año) |
| `hardwareConfig` | `Json?` | Config de hardware/tablet (modelo, RAM, storage) |
| `referredBy` | `String?` | FK → `Driver` (self-ref `DriverReferrals`) |
| **Legal Compliance** | | |
| `insuranceAccepted` | `Boolean` | Default: `false` — Seguro aceptado |
| `insuranceAcceptedAt` | `DateTime?` | Timestamp de aceptación |
| `contractAccepted` | `Boolean` | Default: `false` — Contrato aceptado |
| `contractAcceptedAt` | `DateTime?` | Timestamp de firma |
| `agreementVersion` | `String?` | Versión del contrato aceptado |

**Relaciones clave:**
- `wallet` → `Wallet?` (1:1, **onDelete: RESTRICT** — no se puede borrar driver con wallet)
- `devices` → `Device[]` (1:N)
- `commissions` → `Commission[]` (1:N, **onDelete: RESTRICT**)
- `activeAds` → `ActiveAd[]` (1:N, **onDelete: RESTRICT**)
- `reconciliationReports` → `ReconciliationReport[]` (1:N, onDelete: Cascade)
- `payrollPayments` → `PayrollPayment[]` (1:N, onDelete: Cascade)
- `subscriptions` → `Subscription[]` (1:N, onDelete: Cascade)
- `contractAcceptances` → `ContractAcceptance[]` (1:N, onDelete: Cascade)
- `portalRequests` → `PortalRequest[]` (1:N, onDelete: Cascade)
- `campaigns` → `Campaign[]` (via `CampaignToDriver` relation)
- `telemetryLogs` → `Telemetry[]` (via `DriverTelemetry` named relation, **onDelete: RESTRICT**)
- `referredByDriver` → `Driver?` (self-ref, `DriverReferrals`)
- `referrals` → `Driver[]` (self-ref, `DriverReferrals`)
- `referredAdvertisers` → `Advertiser[]` (`AdvertiserReferrals`)
- `locations` → `DriverLocation[]` (1:N)

**Índices:**
```prisma
@@index([status])
@@index([phone])
@@map("drivers")
```

**⚠️ Legal Compliance Gate (CRITICAL Business Rule):**
```
Driver can ONLY transition to status = OPERATIVO if:
  insuranceAccepted = true AND contractAccepted = true AND subscriptionPaid = true
Otherwise: status remains PENDIENTE_PAGO or BLOQUEADO
```

**⚠️ onDelete Contradiction (CRITICAL SRE Risk):**
The schema.prisma declares `onDelete: Cascade` on many Driver relations (PayrollPayment, Subscription, ContractAcceptance, ReconciliationReport, ActiveAd), but the `20260424_v12_schema_sync` migration SQL uses `ON DELETE RESTRICT` for ActiveAd, Commission, Wallet, and Telemetry. This means:
- **Prisma will attempt CASCADE** but the **DB will reject** due to RESTRICT constraints.
- Deleting a Driver with a Wallet, Commission, ActiveAd, or Telemetry will **FAIL**.
- This is an intentional safety mechanism — financial data cannot be accidentally destroyed.

**Reglas de Negocio:**
- `subscriptionPaid = false` → Kill-Switch 402
- `status = BLOQUEADO` → Rechazo en `/drivers/:id/check-in`
- Compensación: `min(Active_Ads, 15) × RD$500 + Commissions × RD$500`
- `level = "BASE"` → Nivel base. Futuros tiers: `SILVER`, `GOLD` (bonos adicionales)
- `consecutiveMonthsUnderGoal` → Si > threshold, `penaltyPercentage` aumenta en payroll

---

#### `Device` — Tablets Android (FullyKiosk)
| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | `String @uuid` | PK |
| `deviceId` | `String @unique` | Hardware identifier |
| `name` | `String?` | Nombre descriptivo |
| `taxiNumber` | `String?` | Vinculación STI-XXX |
| `city` | `String?` | Santiago, Santo Domingo, etc. |
| `fleet` | `String?` | Flota asignada |
| `status` | `SystemStatus` | Estado operativo |
| `isOnline` | `Boolean` | Última conexión < 5 min |
| `connectivityStatus` | `String` | `"ONLINE" | "STALE" | "WARNING" | "CRITICAL"` |
| `batteryLevel` | `Int` | 0-100% |
| `lastLat` / `lastLng` | `Float?` | Última coordenada GPS |
| `lastSync` | `DateTime?` | Última sincronización completa |
| `lastSyncAt` | `DateTime?` | Timestamp del último sync request |
| `lastSyncSuccess` | `Boolean?` | Flag de sync exitoso (monitoring) |
| `lastSyncHash` | `String?` | ETag del último manifiesto |
| `lastHeartbeat` | `DateTime?` | Último heartbeat recibido |
| `lastSeen` | `DateTime?` | Última actividad detectada |
| `lastOnline` | `DateTime?` | Último momento online confirmado |
| `lastPlayback` | `DateTime?` | Última reproducción de anuncio |
| `playerStatus` | `String?` | `"PLAYING" | "IDLE" | "ERROR" | "OFFLINE"` |
| `appVersion` | `String?` | Versión de la PWA (OTA updates) |
| `authToken` | `String?` | Token de autenticación de tablet |
| `storageUsed` | `BigInt?` | Bytes usados en tablet |
| `storageTotal` | `BigInt?` | Bytes total en tablet |
| `storageFree` | `String?` | Espacio disponible (formato legible) |
| `driverId` | `String?` | FK → `Driver` |
| `isSimulated` | `Boolean` | Flag para load testing |
| `createdAt` / `updatedAt` | `DateTime` | Timestamps de auditoría |

**Relaciones clave:**
- `events` → `AnalyticsEvent[]` (telemetría cruda)
- `campaignMetrics` → `CampaignMetric[]` (agregaciones)
- `campaigns` → `DeviceCampaign[]` (many-to-many con Campaign)
- `playbackEvents` → `PlaybackEvent[]` (proof-of-play)
- `subscriptions` → `Subscription[]` (historial por dispositivo)

**Índices:**
```prisma
@@index([status])
@@index([lastSync])
@@index([city])
@@index([lastSeen])
@@index([driverId])
@@index([connectivityStatus])
```

---

#### `Campaign` — Campañas Publicitarias
| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | `String @uuid` | PK |
| `name` | `String` | Nombre de campaña |
| `advertiser` | `String` | Nombre de marca |
| `advertiserId` | `String?` | FK → `Advertiser` |
| `description` | `String?` | Descripción detallada |
| **Dual-Status System** | | |
| `status` | `String` | `"PENDING_PAYMENT" | "ACTIVE" | "PAUSED" | "COMPLETED"` |
| `active` | `Boolean` | Default: `true` — Flag independiente de `status` |
| **Targeting Modes (5 canales)** | | |
| `isGlobal` | `Boolean` | Todas las tablets (legacy) |
| `targetAll` | `Boolean` | Todas las tablets con suscripción activa |
| `targetCity` | `String` | Ciudad única: `"Santiago"` |
| `targetCities` | `String` | JSON array: `["Santiago","SDQ"]` (requiere índice GIN) |
| `targetFleets` | `String` | JSON array de fleet IDs |
| **Finanzas** | | |
| `priority` | `Int` | Orden en playlist (mayor = primero) |
| `targetImpressions` | `Int` | Meta de impresiones |
| `budget` | `Float` | Presupuesto en RD$ |
| `targetUrl` | `String?` | URL de destino (QR scan) |
| **Social/Delivery Links** | | |
| `whatsapp` | `String?` | WhatsApp de la marca |
| `facebook` | `String?` | Facebook de la marca |
| `instagram` | `String?` | Instagram de la marca |
| `websiteUrl` | `String?` | Sitio web |
| `pedidosYaUrl` | `String?` | PedidosYa link |
| `uberEatsUrl` | `String?` | UberEats link |
| **Metadata** | | |
| `category` | `String?` | `"General" | "Restaurante" | "Servicios"` |
| `version` | `Int` | Default: `1` — Versioning incremental |
| `hasSeenTutorial` | `Boolean` | Default: `false` — UX tracking |
| `createdById` | `String?` | FK → `User` (admin que creó) |
| `startDate` / `endDate` | `DateTime` | Vigencia |
| `createdAt` / `updatedAt` | `DateTime` | Timestamps |

**Relaciones clave:**
- `media` → `Media[]` (archivos multimedia)
- `metrics` → `CampaignMetric[]` (KPIs agregados)
- `devices` → `DeviceCampaign[]` (tablets asignadas)
- `playlists` → `Playlist[]` (listas de reproducción)
- `targetDrivers` → `Driver[]` (segmentación manual)

**Índices:**
```prisma
@@index([active])
@@index([status])
@@index([startDate, endDate])
```

**Nota SRE:** `targetCities` y `targetFleets` son strings JSON. Para queries de filtrado, usar índices GIN en PostgreSQL (ver sección 4).

---

### 2.2 Telemetry & Analytics

#### `AnalyticsEvent` — Eventos Crudos de Telemetría
| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | `String @uuid` | PK |
| `deviceId` | `String` | FK → `Device` |
| `campaignId` | `String?` | FK → `Campaign` |
| `eventType` | `String` | `"play_confirm" | "sync" | "gps" | "qr_scan"` |
| `eventData` | `String?` | Payload JSON |
| `lat` / `lng` | `Float?` | Coordenadas GPS |
| `occurredAt` | `DateTime` | Timestamp real del evento (client-side) |
| `receivedAt` | `DateTime` | Timestamp de recepción (server-side) |
| `processed` | `Boolean` | Flag para CRON de agregación |
| `isSimulated` | `Boolean` | Load testing data |

**Índices:**
```prisma
@@index([deviceId])
@@index([campaignId])
@@index([eventType])
@@index([occurredAt])
@@index([processed])
```

**Regla CRÍTICA:** Nunca sobreescribir `occurredAt` con `Date.now()`. El backend debe respetar el timestamp original del cliente para mantener la integridad de las analíticas mensuales.

**Volumen estimado:** ~50K rows/día por 100 tablets. Purgar registros `processed = true` > 90 días vía CRON.

---

#### `CampaignMetric` — Agregaciones Diarias por Campaña
| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | `BigInt @autoincrement` | PK ( BigInt por volumen) |
| `campaignId` | `String` | FK → `Campaign` |
| `deviceId` | `String?` | FK → `Device` (opcional) |
| `date` | `DateTime` | Fecha de agregación |
| `city` | `String?` | Ciudad de origen |
| `totalImpressions` | `Int` | Reproducciones totales |
| `totalCompletions` | `Int` | Reproducciones completas (>80%) |
| `totalErrors` | `Int` | Fallos de playback |
| `uniqueDevices` | `Int` | Tablets únicas |
| `avgCompletionRate` | `Float?` | % promedio de completitud |

**Única:** `@@unique([campaignId, date, city])`

**Índices:**
```prisma
@@index([campaignId])
@@index([date])
```

**Fuente de datos:** Generado por CRON diario desde `AnalyticsEvent` (agregación `GROUP BY campaign_id, date, city`). Esta tabla es la **fuente primaria** para el BI Dashboard — no consultar `analytics_events` directamente para KPIs.

---

#### `PlaybackEvent` — Proof-of-Play Verificado
| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | `String @uuid` | PK |
| `deviceId` | `String` | FK → `Device` |
| `eventType` | `String` | Tipo de evento de playback |
| `videoId` | `String` | ID del video reproducido |
| `lat` / `lng` | `Float?` | GPS al momento del play |
| `timestamp` | `DateTime` | Momento de reproducción |
| `isSimulated` | `Boolean` | Load testing |
| `verified` | `Boolean` | Validado por backend |

**Única:** `@@unique([deviceId, videoId, timestamp])`

**Índices:**
```prisma
@@index([deviceId])
@@index([timestamp])
@@index([videoId])
@@index([verified])
@@index([deviceId, timestamp(sort: Desc)])
@@index([eventType, verified, timestamp])
@@index([videoId, eventType])
```

**Regla de Negocio:** Solo eventos `verified = true` cuentan para facturación de anunciantes y compensación de conductores.

---

#### `Telemetry` — GPS con PostGIS
| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | `String @uuid` | PK |
| `driverId` | `String` | FK → `Driver` |
| `coords` | `Unsupported("geography(Point, 4326)")` | PostGIS point |
| `speed` | `Float` | Velocidad en km/h |
| `battery` | `Int` | Nivel de batería |
| `network` | `String` | `"4G" | "WIFI" | "OFFLINE"` |
| `timestamp` | `DateTime` | Momento de captura |

**Nota:** Usa `Unsupported()` porque Prisma no soporta nativamente PostGIS. Acceder via `$queryRaw`:
```typescript
const result = await prisma.$queryRaw`
  SELECT ST_Distance(coords, ST_MakePoint(${lng}, ${lat})::geography) as distance
  FROM telemetry
  WHERE driver_id = ${driverId}
`;
```

---

### 2.3 Financial Core

#### `Wallet` — Billetera Digital del Conductor
| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | `String @uuid` | PK |
| `driverId` | `String @unique` | FK → `Driver` (1:1) |
| `availableBalance` | `Float` | RD$ disponibles para retiro (default: `0.0`) |
| `pendingWithdrawal` | `Float` | RD$ en proceso de retiro (default: `0.0`) |
| `bankInfo` | `Json?` | `{ bank, account, type }` |
| `createdAt` | `DateTime` | Timestamp |

**⚠️ CRITICAL: `onDelete: RESTRICT` (NOT Cascade!)**
> El doc anterior erroneamente indicaba `onDelete: Cascade`. La migración SQL `20260424_v12_schema_sync` usa `ON DELETE RESTRICT`. **No se puede borrar un Driver si tiene Wallet asociada** — esto es una protección de datos financieros. El schema.prisma no declara `onDelete` explícito, pero la DB migration establece RESTRICT.

**⚠️ VULN #7 Divergencia:** El `walletBalance` se almacena directamente en `Driver.wallet_balance` (columna real), NO en `Wallet.availableBalance`. El modelo `Wallet` existe en Prisma pero **está desactualizado** — el servicio `wallet.service.ts` opera sobre `drivers.wallet_balance` usando `$queryRaw SELECT FOR UPDATE`. Ver sección 6.4.

---

#### `Commission` — Bonos por Referidos y Ventas
| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | `String @uuid` | PK |
| `driverId` | `String` | FK → `Driver` (**onDelete: RESTRICT**) |
| `amount` | `Float` | Default: `500.0` (RD$500 por referido) |
| `sourceType` | `String` | `"ADVERTISER_SALE" | "DRIVER_REFERRAL"` |
| `status` | `String` | `"PENDING" | "APPROVED" | "PAID"` |
| `createdAt` | `DateTime` | Timestamp |

**Regla de Negocio:**
- `DRIVER_REFERRAL`: Se crea cuando un referido (vía `referralCode`) cierra su primera campaña pagada.
- `ADVERTISER_SALE`: Bono por venta directa de anunciante (futuro).

---

#### `PayrollPayment` — Nómina Mensual del Conductor
| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | `String @uuid` | PK |
| `driverId` | `String` | FK → `Driver` (onDelete: Cascade) |
| `amount` | `Float` | RD$ calculados |
| `month` / `year` | `Int` | Período de pago |
| `status` | `String` | `"PENDING" | "PAID"` |
| `activeAds` | `Int` | Promedio de anuncios activos |
| `gpsPoints` | `Int` | Puntos de GPS válidos |
| `transmissionHours` | `Float` | Horas de transmisión |
| `penaltyApplied` | `Boolean` | Penalización por bajo rendimiento |
| `penaltyPercentage` | `Float` | Default: `0` — % de penalización escalada |
| `referenceNum` | `String?` | Número de referencia bancaria |
| `paidAt` | `DateTime?` | Timestamp de pago ejecutado |
| `createdAt` | `DateTime` | Timestamp |

**Índices:**
```prisma
@@unique([driverId, month, year])
@@index([driverId])
@@index([status])
@@map("payroll_payments")
```

**Fórmula de Cálculo:**
```
base = (min(activeAds, 15) × 500) + (commissions × 500)
if gpsPoints < threshold → penaltyApplied = true
penaltyPercentage = consecutiveMonthsUnderGoal × penaltyStep  (from Driver model)
amount = base × (1 - penaltyPercentage)
```

---

#### `FinancialTransaction` — Ledger General
| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | `String @uuid` | PK |
| `type` | `String` | `"INCOMING" | "OUTGOING"` |
| `category` | `String` | `"PUBLICIDAD" | "SUSCRIPCION" | "NOMINA" | "REFERRAL"` |
| `amount` | `Float` | Monto bruto |
| `netAmount` | `Float` | Después de impuestos |
| `taxAmount` | `Float` | ITBIS 18% |
| `status` | `String` | `"PENDING" | "COMPLETED" | "FAILED"` |
| `entityId` | `String?` | ID de entidad relacionada |
| `reference` | `String? @unique` | Referencia idempotente (**nullable** — no todas las transacciones tienen ref) |
| `note` | `String?` | Nota manual |
| `createdAt` / `updatedAt` | `DateTime` | Timestamps |

**Índices:**
```prisma
@@index([type])
@@index([category])
@@index([status])
@@index([createdAt])
@@index([category, createdAt(sort: Desc)])
```

**Uso:** Libro mayor para conciliación financiera y auditoría. Cada entrada debe tener `reference` único para idempotencia.

---

#### `Subscription` — Suscripción Anual del Conductor
| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | `String @uuid` | PK |
| `driverId` | `String` | FK → `Driver` (onDelete: Cascade) |
| `deviceId` | `String?` | FK → `Device` (onDelete: Cascade) |
| `plan` | `String` | **REQUIRED** — Nombre del plan (`"ANUAL_6000"`, futuro: `"MENSUAL_500"`, `"PREMIUM"`) |
| `amount` | `Float` | Default: `6000.0` — RD$6,000/año (ITBIS incluido) |
| `paymentMethod` | `String?` | `"BANK_TRANSFER" | "CASH" | "CARD"` |
| `status` | `String` | `"PENDING" | "ACTIVE" | "EXPIRED"` |
| `startDate` | `DateTime` | Inicio de cobertura |
| `dueDate` | `DateTime` | Fecha límite de pago |
| `validUntil` | `DateTime` | Fin de cobertura |
| `paidAt` | `DateTime?` | Fecha de pago real |
| `notes` | `String?` | Notas administrativas |
| `isSimulated` | `Boolean` | Load testing |
| `createdAt` / `updatedAt` | `DateTime` | Timestamps |

**Índices:**
```prisma
@@index([driverId])
@@index([deviceId])
@@index([status])
@@index([dueDate])
```

**Kill-Switch:** Si `status != "ACTIVE"` o `validUntil < now()` → dispositivo recibe 402.

---

#### `Invoice` — Facturas de Anunciantes
| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | `String @uuid` | PK |
| `advertiserId` | `String` | FK → `Advertiser` |
| `issueDate` | `DateTime` | Fecha de emisión |
| `dueDate` | `DateTime` | Fecha límite de pago |
| `subtotal` | `Float` | Antes de ITBIS |
| `taxAmount` | `Float` | ITBIS 18% |
| `totalAmount` | `Float` | Total a pagar |
| `status` | `String` | `"PENDING" | "PAID" | "OVERDUE"` |
| `pdfUrl` | `String?` | URL del PDF en Supabase Storage |

**Índices:**
```prisma
@@index([advertiserId])
@@index([status])
@@index([dueDate])
```

---

#### `AdvertiserSubscription` — Suscripción Mensual de Anunciantes
| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | `String @uuid` | PK |
| `advertiserId` | `String` | FK → `Advertiser` |
| `numberOfScreens` | `Int` | Tablets asignadas |
| `monthlyRate` | `Float` | Default: `1500.0` por pantalla |
| `taxRate` | `Float` | Default: `0.18` (ITBIS) |
| `status` | `String` | `"ACTIVE" | "CANCELLED"` |
| `nextBillingDate` | `DateTime` | Próximo cobro |

---

### 2.4 Content & Media

#### `Media` — Archivos Multimedia de Campañas
| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | `String @uuid` | PK |
| `filename` | `String?` | Nombre en Supabase Storage |
| `originalFilename` | `String?` | Nombre original del upload |
| `mimeType` | `String?` | Debe ser `video/mp4` |
| `fileSize` | `BigInt?` | Bytes |
| `durationSeconds` | `Int?` | Duración del video |
| `storageKey` | `String?` | Key en Supabase Storage |
| `url` | `String?` | URL pública |
| `cdnUrl` | `String?` | URL de Cloudflare CDN |
| `hash` / `hashMd5` / `hashSha256` | `String?` | Checksums para validación |
| `status` | `String` | `"READY" | "PROCESSING" | "ERROR"` |
| `qrUrl` | `String?` | URL del QR de campaña |

**Índices:**
```prisma
@@index([status])
```

**Validación:** Máximo 55MB, solo `video/mp4` H.264. Validar en `MediaAsset.validationError`.

---

#### `MediaAsset` — Assets Procesados con Validación
| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | `String @uuid` | PK |
| `campaignId` | `String` | FK → `Campaign` |
| `type` | `String` | `"VIDEO" | "IMAGE" | "HTML"` |
| `filename` | `String` | Nombre del archivo |
| `url` | `String` | URL de descarga |
| `fileSize` | `Int` | Bytes |
| `checksum` | `String` | Hash de integridad |
| `duration` | `Int?` | Duración en segundos |
| `version` | `Int` | Default: `1` |
| `processingStatus` | `String` | `"ACTIVE" | "PROCESSING" | "FAILED"` |
| `validationError` | `String?` | Error de validación |

**Índices:**
```prisma
@@index([campaignId])
```

---

#### `Video` — Videos de Campaña (Legacy)
> **Nota:** Este modelo está siendo reemplazado por `Media` + `MediaAsset`. Mantener para backward compatibility.

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | `String @uuid` | PK |
| `campaignId` | `String` | FK → `Campaign` |
| `title` | `String` | Título del video |
| `url` | `String` | URL del video |
| `duration` | `Int` | Segundos |
| `qrUrl` | `String?` | QR de tracking |

---

### 2.5 Fleet & Sync

#### `Fleet` — Flotas de Taxis
| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | `String @uuid` | PK |
| `name` | `String @unique` | Nombre de la flota |
| `city` | `String?` | Ciudad base |

---

#### `DeviceCommand` — Comandos Push a Tablets
| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | `String @uuid` | PK |
| `deviceId` | `String` | FK → `Device` |
| `commandType` | `String` | `"WAKE_UP_CALL" | "KILL_SWITCH" | "UPDATE_PLAYLIST" | "REBOOT"` |
| `commandParams` | `String?` | Payload JSON |
| `status` | `String` | `"PENDING" | "EXECUTED" | "FAILED" | "EXPIRED"` |
| `expiresAt` | `DateTime?` | TTL del comando |
| `executedAt` | `DateTime?` | Fecha de ejecución |
| `result` | `String?` | Resultado JSON |

**Índices:**
```prisma
@@index([deviceId])
@@index([status])
```

**Uso:** Comandos enviados vía Supabase Realtime al canal `fleet_sync`. La tablet escucha y ejecuta.

---

#### `DriverLocation` — Historial de GPS
| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | `String @uuid` | PK |
| `driverId` | `String` | FK → `Driver` |
| `deviceId` | `String` | FK → `Device` |
| `latitude` / `longitude` | `Float` | Coordenadas |
| `speed` | `Float` | km/h |
| `timestamp` | `DateTime` | Momento de captura |
| `isSimulated` | `Boolean` | Load testing |

**Índices:**
```prisma
@@index([deviceId, timestamp])
@@index([driverId, timestamp])
@@index([driverId, timestamp(sort: Desc)], map: "driver_locations_driver_id_timestamp_desc_idx")
@@index([driverId])
@@index([timestamp])
```

**Volumen:** ~288 puntos/día/driver (cada 5 min). Purgar > 30 días o agregar a `CampaignMetric` antes de borrar.

---

### 2.6 BI & Reconciliation

#### `BiDashboardSnapshot` — Snapshot Diario de KPIs
| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | `String @uuid` | PK |
| `snapshotDate` | `DateTime @unique` | Fecha del snapshot |
| `mrr` | `Float` | Monthly Recurring Revenue |
| `totalDevices` / `onlineDevices` / `offlineDevices` | `Int` | Estado de flota |
| `criticalDevices` | `Int` | Offline > 24h |
| `activeCampaigns` | `Int` | Campañas activas |
| `totalImpressionsMtd` | `Int` | Impresiones mes actual |
| `deliveryRateAvg` | `Float` | % promedio de entrega |
| `syncHealthRate` | `Float` | % de sync exitoso |
| `yieldPerScreen` | `Float` | Ingreso promedio por tablet |
| `arpu` | `Float` | Average Revenue Per User |
| `churnRate` | `Float` | Tasa de cancelación |
| `projectedRevenue` | `Float` | Proyección mensual |

**Uso:** Generado por CRON diario a las 00:05. Fuente primaria para el BI Dashboard — evitar queries en tiempo real sobre tablas grandes.

---

#### `ReconciliationReport` — Reporte de Conciliación Financiera
| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | `String @uuid` | PK |
| `period` | `String` | `"YYYY-MM"` |
| `driverId` | `String` | FK → `Driver` |
| `deviceId` | `String?` | FK → `Device` |
| `subscriptionStatus` | `String` | `"ACTIVE" | "EXPIRED" | "MISSING"` |
| `subscriptionAmount` | `Float` | RD$6,000 o proporcional |
| `totalPlaybacks` | `Int` | Reproducciones del período |
| `activeCampaigns` | `Int` | Campañas activas del período |
| `revenueContracted` | `Float` | Ingreso esperado |
| `revenueReceived` | `Float` | Ingreso real recibido |
| `payrollDue` / `payrollPaid` | `Float` | Nómina pendiente/pagada |
| `hasDiscrepancy` | `Boolean` | Flag de discrepancia |
| `discrepancyType` | `String` | `"OK" | "UNPAID_SUBSCRIPTION" | "MISSING_PAYMENT" | "LOW_DELIVERY" | "PAYROLL_PENDING"` |
| `discrepancyAmount` | `Float` | RD$ de diferencia |

**Única:** `@@unique([period, driverId])`

**Uso:** Generado por CRON el día 2 de cada mes a las 08:00. Comparar `revenueContracted` vs `revenueReceived` para detectar fugas.

---

### 2.7 Authentication & Legal

#### `Advertiser` — Anunciantes B2B
| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | `String @uuid` | PK |
| `companyName` / `contactName` | `String` | Datos de empresa |
| `email` | `String @unique` | Login credential |
| `phone` | `String?` | Teléfono de contacto |
| `password` | `String?` | Hash bcrypt |
| `status` | `String` | Default: `"ACTIVE"` — `"ACTIVE" | "SUSPENDED" | "PENDING"` |
| `referredBy` | `String?` | FK → `Driver` (`AdvertiserReferrals`) |
| `category` | `String` | `"General" | "Restaurante" | "Servicios"` |
| `websiteUrl` / `whatsapp` / `facebook` / `instagram` | `String?` | Redes sociales |
| `pedidosYaUrl` / `uberEatsUrl` | `String?` | Links de delivery |
| `productsData` | `String` | JSON array de productos (requiere índice GIN) |
| `createdAt` / `updatedAt` | `DateTime` | Timestamps |

**Relaciones clave:**
- `campaigns` → `Campaign[]` (1:N, named `advertiserRef`)
- `portalRequests` → `PortalRequest[]` (1:N, onDelete: Cascade)
- `subscriptions` → `AdvertiserSubscription[]` (1:N, onDelete: Cascade)
- `invoices` → `Invoice[]` (1:N, onDelete: Cascade)
- `referrer` → `Driver?` (FK, `AdvertiserReferrals`) — conductor que refirió al anunciante

**Índices:**
```prisma
@@index([status])
@@index([category])
```

---

#### `PortalRequest` — Solicitudes de Portales
| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | `String @uuid` | PK |
| `advertiserId` | `String?` | FK → `Advertiser` (onDelete: Cascade) |
| `driverId` | `String?` | FK → `Driver` (onDelete: Cascade) |
| `campaignId` | `String?` | FK opcional |
| `type` | `String` | `"CAMPAIGN_CHANGE" | "BILLING_ISSUE"` etc. |
| `status` | `String` | `"PENDING" | "APPROVED" | "REJECTED"` |
| `title` / `description` | `String` | Contenido |
| `data` | `String` | JSON payload |
| `adminNotes` | `String?` | Notas del admin |
| `createdAt` / `updatedAt` | `DateTime` | Timestamps |

**Índices:**
```prisma
@@index([advertiserId])
@@index([driverId])
@@index([status])
@@index([type])
@@map("portal_requests")
```

---

#### `ContractAcceptance` — Aceptación Legal de Conductores
| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | `String @uuid` | PK |
| `driverId` | `String` | FK → `Driver` (onDelete: Cascade) |
| `version` | `String` | Versión del contrato (`"v12.1"`) |
| `ipAddress` / `userAgent` | `String?` | Auditoría |
| `timestamp` | `DateTime` | Fecha de aceptación |

**Índice:**
```prisma
@@index([driverId])
@@map("contract_acceptances")
```

**⚠️ Legal Compliance Gate:** Este modelo complementa los flags booleanos en `Driver` (`contractAccepted`, `insuranceAccepted`). Ambos deben ser `true` para que `Driver.status` pueda ser `OPERATIVO`. Ver sección 8.1.

---

### 2.8 System & Infrastructure

#### `Notification` — Notificaciones del Sistema
| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | `String @uuid` | PK |
| `title` / `message` | `String` | Contenido |
| `type` | `String` | `"INFO" | "WARNING" | "ERROR"` |
| `category` | `String` | `"SYSTEM" | "FINANCIAL" | "FLEET" | "CAMPAIGN"` |
| `read` | `Boolean` | Leída por usuario |
| `entityId` | `String?` | Entidad relacionada |

---

#### `SystemSetting` — Configuración Dinámica
| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | `String @uuid` | PK |
| `key` | `String @unique` | Clave de configuración |
| `value` | `String` | Valor (parsear según `type`) |
| `type` | `String` | `"STRING" | "NUMBER" | "BOOLEAN" | "JSON"` |
| `group` | `String` | `"GENERAL" | "FINANCIAL" | "FLEET" | "SYSTEM"` |

**Uso:** Cambiar configuraciones sin redeploy. Ejemplo: `COMPENSATION_PER_AD = "500"`.

---

#### `SystemError` — Registro de Errores Operacionales
| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | `String @uuid` | PK |
| `source` | `String` | `"EMAIL" | "WALLET" | "TELEMETRY" | "DEVICE" | "SYNC"` |
| `severity` | `String` | `"INFO" | "WARNING" | "ERROR" | "CRITICAL"` |
| `message` | `String` | Mensaje de error |
| `details` | `String?` | Stack trace o JSON payload |
| `entityId` | `String?` | ID de entidad relacionada |
| `retryCount` | `Int` | Intentos de reintento |
| `resolved` | `Boolean` | Resuelto |
| `resolvedAt` | `DateTime?` | Fecha de resolución |

**Índices:**
```prisma
@@index([source])
@@index([severity])
@@index([resolved])
@@index([createdAt])
```

**Protocolo SRE:** Todo fallo de email, wallet, o sync DEBE registrarse aquí para auditoría y retry.

---

#### `CampaignIntent` — Intenciones de Campaña (Pre-pago)
| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | `String @uuid` | PK |
| `brandName` | `String` | Nombre de marca |
| `budget` | `Float` | Presupuesto esperado |
| `expectedScreens` | `Int` | Tablets deseadas |
| `status` | `String` | `"PENDING_PAYMENT" | "CONFIRMED" | "CANCELLED"` |
| `fileMetadata` | `Json?` | Datos del upload de medios |

**Uso:** Flujo de pre-registro de anunciantes antes de que paguen y se conviertan en `Campaign` real.

---

#### `IdempotencyKey` — Idempotencia Persistente (v12.1.2)
| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | `String @cuid` | PK |
| `key` | `String @unique` | Header `Idempotency-Key` |
| `driverId` | `String?` | Conductor solicitante |
| `path` | `String` | Ruta del endpoint |
| `method` | `String?` | HTTP method |
| `response` | `String?` | JSON de respuesta cacheada |
| `isLocked` | `Boolean` | Request en progreso |
| `expiresAt` | `DateTime` | TTL de la key |

**Índices:**
```prisma
@@index([createdAt])
@@index([expiresAt])
```

**Uso:** Reemplaza el `Map` en memoria del `IdempotencyInterceptor`. Sobrevive a OOM kills y scaling horizontal. CRON de limpieza borra keys expiradas cada hora.

---

#### `ActiveAd` — Anuncios Activos por Conductor
| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | `String @uuid` | PK |
| `driverId` | `String` | FK → `Driver` |
| `campaignId` | `String` | FK → `Campaign` |
| `status` | `String` | `"ACTIVE" | "INACTIVE"` |

**Única:** `@@unique([driverId, campaignId])`

**Uso:** Vista rápida de qué anuncios están activos en cada tablet. Usado en cálculo de nómina: `count(activeAds)`.

---

#### `Playlist` / `PlaylistItem` — Asignación de Campañas a Tablets
| Campo | Tipo | Descripción |
| --- | --- | --- |
| `Playlist.campaignId` | `String` | FK → `Campaign` |
| `Playlist.name` | `String` | Nombre de la playlist |
| `Playlist.loopType` | `String` | `"SEQUENTIAL" | "RANDOM" | "WEIGHTED"` |
| `PlaylistItem.campaignId` + `PlaylistItem.deviceId` | PK compuesta | Asignación many-to-many |

**Uso:** `PlaylistItem` es la tabla de unión que determina qué campañas se reproducen en qué tablets.

---

#### `DeviceHeartbeat` — Historial de Salud de Dispositivos
| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | `String @uuid` | PK |
| `deviceId` | `String` | FK → `Device` |
| `batteryLevel` | `Int?` | % de batería |
| `storageFree` | `String?` | Espacio disponible |
| `timestamp` | `DateTime` | Momento del heartbeat |

**Volumen:** ~288 heartbeats/día/dispositivo (cada 5 min). Purgar > 7 días.

---

### 2.9 Social Agent (Meta Integration)

#### `SocialPostDraft` — Borradores de Posts para Redes Sociales
| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | `String @cuid` | PK |
| `platform` | `String` | `"IG" | "FB"` — Plataforma destino |
| `copy` | `String` | Texto del post |
| `mediaUrl` | `String` | URL del archivo multimedia |
| `status` | `String` | `"PENDING" | "APPROVED" | "REJECTED"` (default: `"PENDING"`) |
| `scheduledFor` | `DateTime` | Fecha programada de publicación |
| `createdAt` | `DateTime` | Timestamp de creación |
| `updatedAt` | `DateTime` | Timestamp de última actualización |

**Índices:**
```prisma
@@index([status])
@@map("social_post_drafts")
```

**Uso:** Borradores generados por el Social Agent (bot Meta) que requieren aprobación manual del admin antes de publicar. Flujo: `PENDING` → Admin aprueba (`POST /social-agent/approve/:id`) → `APPROVED` → Publicación en IG/FB.

---

#### `SocialInteractionLog` — Log de Interacciones Bot (Meta Messenger/IG DM)
| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | `String @cuid` | PK |
| `platform` | `String` | `"IG" | "FB"` — Plataforma origen |
| `threadId` | `String` | ID del hilo de conversación |
| `senderId` | `String` | ID del usuario que envió el mensaje |
| `message` | `String` | Mensaje recibido del usuario |
| `botResponse` | `String` | Respuesta generada por el bot |
| `createdAt` | `DateTime` | Timestamp de la interacción |

**Índices:**
```prisma
@@map("social_interaction_logs")
```

**Uso:** Registro de todas las interacciones del bot de redes sociales (Meta Messenger e Instagram DM). El Social Agent recibe mensajes, genera respuestas, y las almacena aquí para auditoría y análisis de calidad.

**Integración:** El módulo `social-agent` en NestJS recibe webhooks de Meta (`POST /social-agent/webhooks/meta`), genera contenido con IA, y lo almacena en `SocialPostDraft` para aprobación.

---

## 3. RELACIONES CLAVE (Diagrama Conceptual)

```
User 1──N Campaign N──N Device (via DeviceCampaign)
                    |
Advertiser 1──N Campaign
                    |
Driver 1──1 Wallet  |
  |                 |
  ├──N Device ──────┘
  ├──N Commission
  ├──N PayrollPayment
  ├──N ActiveAd ──── Campaign
  └──N ReconciliationReport

Campaign N──N Device (via DeviceCampaign)
  |
  ├──N Media
  ├──N MediaAsset
  ├──N Video
  ├──N Playlist N──N Device (via PlaylistItem)
  ├──N CampaignMetric
  └──N AnalyticsEvent

Device N──N PlaybackEvent
  |
  ├──N DeviceCommand
  ├──N DeviceHeartbeat
  ├──N DriverLocation
  └──N Subscription

Advertiser N──N Invoice
  |
  ├──N AdvertiserSubscription
  └──N PortalRequest

FinancialTransaction (ledger independiente)
IdempotencyKey (infraestructura)
SystemError (observabilidad)
SystemSetting (configuración dinámica)
SocialPostDraft (social-agent: borradores para Meta)
SocialInteractionLog (social-agent: log de interacciones bot)
```

---

## 4. ÍNDICES Y OPTIMIZACIONES DE PERFORMANCE

### 4.1 Índices GIN para JSONB (Requeridos)

`targetCities` y `targetFleets` en `Campaign` son strings JSON. Para queries de filtrado eficientes, agregar:

```sql
-- Ejecutar en Supabase SQL Editor
CREATE INDEX idx_campaigns_target_cities_gin ON campaigns
  USING GIN (jsonb(target_cities));

CREATE INDEX idx_campaigns_target_fleets_gin ON campaigns
  USING GIN (jsonb(target_fleets));

-- Query de ejemplo:
SELECT * FROM campaigns
WHERE jsonb(target_cities) ? 'Santiago';
```

### 4.2 Índices Compuestos para Queries de BI

```sql
-- CampaignMetrics por fecha y campaña
CREATE INDEX idx_campaign_metrics_date_campaign
  ON campaign_metrics (date DESC, campaign_id);

-- PlaybackEvents verificados por período
CREATE INDEX idx_playback_verified_date
  ON playback_events (timestamp DESC)
  WHERE verified = true;

-- DriverLocations por driver y fecha (descendente)
-- Ya existe: driver_locations_driver_id_timestamp_desc_idx
```

### 4.3 Vistas Materializadas (Ver Doc 09)

```sql
-- REFRESH cada 5 min sin bloqueo
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_fleet_health;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_campaign_performance;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_mrr_summary;
```

---

## 5. MIGRACIONES Y CICLO DE VIDA DEL SCHEMA

### 5.1 Comandos de Migración

```bash
# Generar migración tras cambios en schema.prisma
cd apps/api
npx prisma migrate dev --name add_new_field

# Aplicar migración en producción
npx prisma migrate deploy

# Generar cliente Prisma (requerido tras cada migración)
npx prisma generate

# Ver estado de migraciones
npx prisma migrate status
```

### 5.2 Reglas de Evolución del Schema

1. **NUNCA** renombrar o eliminar campos sin migración explícita.
2. **NUNCA** cambiar tipos de datos sin backup previo.
3. **SIEMPRE** agregar `@@index` en FKs nuevas.
4. **SIEMPRE** usar `@map("snake_case")` para columnas en PostgreSQL.
5. **SIEMPRE** probar migraciones en staging antes de production.
6. **SIEMPRE** agregar `@@unique` en campos que lo requieran para idempotencia.

### 5.3 Rollback de Migraciones

```bash
# Ver historial de migraciones
npx prisma migrate resolve --rolled-back <migration_name>

# Revertir última migración (solo en dev)
npx prisma migrate reset
```

> **ADVERTENCIA:** `prisma migrate reset` borra TODOS los datos. Solo usar en desarrollo.

---

## 6. PATRONES DE QUERY CRÍTICOS

### 6.1 Idempotencia en Transacciones Financieras

```typescript
const result = await prisma.$transaction(async (tx) => {
  // 1. Verificar idempotencia
  const existingKey = await tx.idempotencyKey.findUnique({
    where: { key: idempotencyKey }
  });
  if (existingKey?.response) {
    return JSON.parse(existingKey.response); // Caché
  }

  // 2. Ejecutar transacción
  const wallet = await tx.wallet.update({
    where: { driverId },
    data: { availableBalance: { increment: amount } }
  });

  // 3. Registrar transacción
  const transaction = await tx.financialTransaction.create({
    data: { type: 'INCOMING', category: 'NOMINA', amount, status: 'COMPLETED' }
  });

  // 4. Cache de idempotencia
  await tx.idempotencyKey.create({
    data: { key: idempotencyKey, response: JSON.stringify(wallet), expiresAt: new Date(Date.now() + 86400000) }
  });

  return wallet;
});
```

### 6.2 Batch Insert de Telemetría

```typescript
await prisma.analyticsEvent.createMany({
  data: events.map(e => ({
    deviceId: e.deviceId,
    eventType: e.eventType,
    occurredAt: new Date(e.timestamp), // RESPETAR timestamp original
    lat: e.lat,
    lng: e.lng
  })),
  skipDuplicates: true // Vital para retries
});
```

### 6.3 Query de Nómina con Filtros

```typescript
const payroll = await prisma.driver.findMany({
  where: { status: 'OPERATIVO' },
  include: {
    activeAds: { where: { status: 'ACTIVE' } },
    commissions: { where: { status: 'APPROVED' } },
    wallet: true
  },
  select: {
    id: true,
    fullName: true,
    activeAds: { _count: true },
    commissions: { _sum: { amount: true } },
    wallet: { select: { availableBalance: true } }
  }
});
```

---

## 7. NOTAS DE INFRAESTRUCTURA

### 7.1 Connection Pooling (Supabase)

```
DATABASE_URL=postgresql://user:pass@db.ltdcdhqixvbpdcitthqf.supabase.co:6543/postgres?pgbouncer=true&connection_limit=5
DIRECT_URL=postgresql://user:pass@db.ltdcdhqixvbpdcitthqf.supabase.co:5432/postgres
```

- **Pooler (6543)**: Usar para runtime (Prisma).
- **Direct (5432)**: Usar solo para migraciones.
- `connection_limit=5`: Limitar a 5 conexiones por instancia de Prisma.

### 7.2 Límites de Supabase (Free Tier)

| Recurso | Límite | Estrategia |
| --- | --- | --- |
| **Database Size** | 500MB | Purgar `analytics_events` > 90 días, `driver_locations` > 30 días |
| **Bandwidth** | 5GB/mes | Cloudflare CDN para videos (`media.tad.do`) |
| **API Requests** | Ilimitado (PostgreSQL directo) | Batching 10:1 en telemetría |
| **Realtime** | 200 concurrent connections | Usar solo para `fleet_sync` |

### 7.3 Prisma Memory Management

```typescript
// En apps/api/src/main.ts
app.enableShutdownHooks();

// En apps/api/src/prisma/prisma.service.ts
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

> **Regla de Oro:** Cerrar conexiones de Prisma en shutdown hooks para evitar conexiones huérfanas en Supabase.

---

## 7. MATERIALIZED VIEW: mv_active_campaigns — El Query Más Crítico del Sistema

> **Fuente:** `apps/api/prisma/views.sql` + `apps/api/src/modules/sync/sync.service.ts`
> **Frecuencia:** Cada heartbeat de tablet (~60s por device) consulta esta vista.

### 7.1 Definición de la Vista

```sql
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_active_campaigns AS
SELECT
    c.id as campaign_id, c.name, c.status, c.active,
    c.start_date, c.end_date, c.target_all, c.target_city,
    c.target_cities, c.target_fleets, c.priority, c.updated_at,
    a.id as advertiser_id, a.company_name,
    COALESCE(
      (SELECT jsonb_agg(dc.device_id) FROM device_campaigns dc WHERE dc.campaign_id = c.id),
      '[]'::jsonb
    ) as assigned_device_uuids,
    COALESCE(
      (SELECT jsonb_agg(pi.device_id) FROM playlist_items pi WHERE pi.campaign_id = c.id),
      '[]'::jsonb
    ) as assigned_hw_ids,
    COALESCE(
      (SELECT jsonb_agg(ctd."B") FROM "_CampaignToDriver" ctd WHERE ctd."A" = c.id),
      '[]'::jsonb
    ) as assigned_driver_ids
FROM campaigns c LEFT JOIN advertisers a ON c.advertiser_id = a.id
WHERE c.active = true AND c.status = 'ACTIVE' AND c.end_date >= NOW();

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_campaign_id ON mv_active_campaigns (campaign_id);
```

**Nota:** El unique index es **obligatorio** para `REFRESH MATERIALIZED VIEW CONCURRENTLY` (no bloquea lecturas durante refresh).

### 7.2 Sync Manifest Query (5-Channel Targeting)

```sql
SELECT campaign_id FROM mv_active_campaigns
WHERE active = true
  AND start_date <= NOW()
  AND end_date >= NOW()
  AND (
    target_all = true                                      -- Canal 1: Global
    OR target_city = ${city}                               -- Canal 2: Ciudad exacta
    OR target_cities::text LIKE ${`%${city}%`}             -- Canal 3: Array de ciudades
    OR assigned_device_uuids::jsonb @> ${[device.id]}::jsonb  -- Canal 4: Device UUID
    OR assigned_hw_ids::jsonb @> ${[deviceId]}::jsonb       -- Canal 5: HW ID
    OR (assigned_driver_ids::jsonb @> ${[driver?.id]}::jsonb
        AND ${!!isDriverActive})                            -- Canal 6: Driver (condicional)
  )
```

**Canal de targeting detallado:**

| Canal | Campo | Fuente de Datos | Descripción |
| --- | --- | --- | --- |
| Global | `target_all` | `Campaign.targetAll` | Todas las tablets con suscripción activa |
| City Exact | `target_city` | `Campaign.targetCity` | Match exacto de ciudad (`"Santiago"` → Santiago) |
| City Array | `target_cities` | `Campaign.targetCities` (JSON) | JSONB contains check (`LIKE %city%`) |
| Device UUID | `assigned_device_uuids` | `DeviceCampaign` junction | Tabletas explícitamente asignadas |
| HW ID | `assigned_hw_ids` | `PlaylistItem` junction | Hardware ID de FullyKiosk |
| Driver | `assigned_driver_ids` | `_CampaignToDriver` (Prisma implicit) | Conductores específicos (solo si suscripción activa) |

### 7.3 Refresh de la Vista

```typescript
// prisma.service.ts — ejecutado en startup y después de cambios de campaign
async refreshActiveCampaignsView() {
  try {
    await this.$executeRawUnsafe('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_active_campaigns;');
  } catch {
    // Fallback: primera vez requiere refresh non-concurrent
    await this.$executeRawUnsafe('REFRESH MATERIALIZED VIEW mv_active_campaigns;');
  }
}
```

**⚠️ SRE:** La vista se refresh automáticamente al inicio del server (`prisma.service.ts` lee `views.sql`). Después de crear/editar/eliminar campañas, el admin dashboard debe invocar `refreshManifestView()` para que los tablets vean la campaña en el próximo heartbeat.

---

## 8. ROW LEVEL SECURITY (RLS) — 8 Tablas, 17 Políticas

> **Fuente:** `apps/api/v12_supabase_schema.sql` + `apps/api/src/modules/supabase/migrations/`

### 8.1 Catálogo Completo de RLS

| # | Policy | Tabla | Op | Condición |
| --- | --- | --- | --- | --- |
| 1 | `profiles_select_own` | `profiles` | SELECT | `auth.uid() = id OR role = ADMIN` |
| 2 | `profiles_update_own` | `profiles` | UPDATE | `auth.uid() = id OR role = ADMIN` |
| 3 | `drivers_select_own` | `drivers` | SELECT | `auth.uid() = id OR role = ADMIN` |
| 4 | `drivers_update_own` | `drivers` | UPDATE | `auth.uid() = id OR role = ADMIN` |
| 5 | `drivers_insert_public` | `drivers` | INSERT | `WITH CHECK (true)` — signup público |
| 6 | `devices_select_own` | `devices` | SELECT | `driver_id = auth.uid() OR role = ADMIN` |
| 7 | `devices_update_own` | `devices` | UPDATE | `driver_id = auth.uid() OR role = ADMIN` |
| 8 | `campaigns_select_own` | `campaigns` | SELECT | `advertiser_id = auth.uid() OR role = ADMIN` |
| 9 | `campaigns_insert_own` | `campaigns` | INSERT | `advertiser_id = auth.uid() OR role = ADMIN` |
| 10 | `campaigns_update_own` | `campaigns` | UPDATE | `advertiser_id = auth.uid() OR role = ADMIN` |
| 11 | `campaigns_delete_own` | `campaigns` | DELETE | `advertiser_id = auth.uid() OR role = ADMIN` |
| 12 | `financial_tx_select_own` | `financial_transactions` | SELECT | `entity_id = auth.uid() OR role = ADMIN` |
| 13 | `financial_tx_insert_admin` | `financial_transactions` | INSERT | `WITH CHECK role = ADMIN` (service_role) |
| 14 | `allow_anon_insert_analytics` | `analytics_events` | INSERT | `WITH CHECK (true)` — tablets sin auth |
| 15 | `allow_authenticated_read_analytics` | `analytics_events` | SELECT | `USING (true)` |
| 16 | `driverlocations_admin_select` | `"DriverLocations"` | SELECT | `role in ('ADMIN', 'SUPER_ADMIN')` |
| 17 | `driverlocations_advertiser_select` | `"DriverLocations"` | SELECT | `EXISTS (SELECT 1 FROM mv_active_campaigns WHERE driver_id = "DriverLocations"."driverId" AND advertiser_id = auth.jwt().entityId AND is_active = true)` |

**Role check universal:** `(auth.jwt() -> 'app_metadata' ->> 'role')::text = 'ADMIN'::text`

### 8.2 Tablas con RLS Enabled

| Tabla | RLS Source | Notas |
| --- | --- | --- |
| `profiles` | `v12_supabase_schema.sql` | Supabase Auth integration |
| `drivers` | `v12_supabase_schema.sql` | + signup público |
| `devices` | `v12_supabase_schema.sql` | Driver-owned devices |
| `campaigns` | `v12_supabase_schema.sql` | Advertiser-owned |
| `financial_transactions` | `v12_supabase_schema.sql` | Admin-only insert |
| `analytics_events` | `fix_analytics_events_rls.sql` | Anon insert (tablets) |
| `"DriverLocations"` | `20260526_driverlocations_realtime_rls.sql` | Realtime + advertiser visibility |
| `spatial_ref_sys` | `enable-rls.sql` | PostGIS metadata lockdown |

### 8.3 ⚠️ Advertiser Geofence Policy (#17)

Policy #17 (`driverlocations_advertiser_select`) es la más compleja — permite a anunciantes ver ubicaciones de conductores **solo si** tienen una campaña activa asignada a ese conductor. Usa `mv_active_campaigns` como subquery, creando un dependency cycle: RLS → MV → Campaign.

**SRE Risk:** Si `mv_active_campaigns` no está refreshada, los anunciantes no pueden ver ubicaciones en el mapa del portal.

---

## 9. SHADOW INDEXES & PRODUCTION-ONLY SQL

> **Fuente:** `apps/api/prisma/migrations/v12_2_5_indexes_and_cleanup.sql` + `add_is_simulated_columns.sql`

### 9.1 Production Performance Indexes (Phase 4.2)

Estos indexes existen en la DB pero **NO están en schema.prisma**:

| Index | Tabla | Columnas | Propósito |
| --- | --- | --- | --- |
| `idx_telemetry_driver_time` | `telemetry` | `(driver_id, "timestamp" DESC)` | Timeline del conductor (fleet dashboard) |
| `idx_playback_device_video_time` | `playback_events` | `(device_id, video_id, date_trunc('minute', "timestamp"))` | Deduplicación de playback (ON CONFLICT) |

Ambos se crearon con `CREATE INDEX CONCURRENTLY IF NOT EXISTS` — zero-lock deployment.

### 9.2 Simulation Filter Indexes (Phase 4.1)

| Index | Tabla | Columna | Propósito |
| --- | --- | --- | --- |
| `idx_drivers_is_simulated` | `drivers` | `is_simulated` | Separar datos de load testing |
| `idx_devices_is_simulated` | `devices` | `is_simulated` | Filtrar devices simulados |
| `idx_analytics_events_is_simulated` | `analytics_events` | `is_simulated` | Filtrar analytics simulados |
| `idx_playback_events_is_simulated` | `playback_events` | `is_simulated` | Filtrar playback simulados |
| `idx_subscriptions_is_simulated` | `subscriptions` | `is_simulated` | Filtrar suscripciones simuladas |
| `idx_driver_locations_is_simulated` | `driver_locations` | `is_simulated` | Filtrar ubicaciones simuladas |

### 9.3 Simulation Cleanup Procedure

```sql
-- v12_2_5_indexes_and_cleanup.sql — ejecutar después de load testing
DELETE FROM playback_events WHERE is_simulated = true;
DELETE FROM telemetry WHERE driver_id LIKE 'SIM-%';
DELETE FROM "DriverLocations" WHERE "isSimulated" = true OR "driverId" LIKE 'SIM-%';
DELETE FROM devices WHERE "isSimulated" = true OR device_id LIKE 'SIM-TAB-%';
DELETE FROM drivers WHERE is_simulated = true;
UPDATE devices SET status = 'OPERATIVO'
  WHERE status = 'BLOQUEADO' AND "isSimulated" = true;
```

**⚠️ CERO COSTOS:** Ejecutar solo en ventanas de mantenimiento. Las simulaciones se borran permanentemente.

---

## 10. RAW SQL QUERY PATTERNS — Wallet, Analytics, Health

### 10.1 Wallet: SELECT FOR UPDATE (Double-Spend Protection)

```typescript
// wallet.service.ts — VULN #5 patch
await tx.$queryRaw`
  SELECT id, wallet_balance, bank_account
  FROM drivers WHERE id = ${driverId}
  FOR UPDATE  -- Row-level exclusive lock previene double-spend
`;

// Atomic deduction:
await tx.$executeRaw`
  UPDATE drivers SET wallet_balance = wallet_balance - ${amount}
  WHERE id = ${driverId}
`;

// Safety net verification:
const result = await tx.$queryRaw`
  SELECT wallet_balance FROM drivers WHERE id = ${driverId}
`;
// If balance < 0 → emergency rollback:
await tx.$executeRaw`
  UPDATE drivers SET wallet_balance = wallet_balance + ${amount}
  WHERE id = ${driverId}
`;
```

**Isolation:** `ReadCommitted` + `SELECT FOR UPDATE` (row-level exclusivity). Timeout: 10s.

### 10.2 Analytics: Hourly Aggregation

```sql
SELECT
  EXTRACT(HOUR FROM "timestamp") as "hour",
  COUNT(id)::int as "plays"
FROM "playback_events"
WHERE "timestamp" >= ${last24h}
  AND "video_id" IN (${Prisma.join(videoIds)})
GROUP BY 1
```

**Heatmap:** Uses Prisma ORM `findMany` (NOT raw SQL) — `take: 10000`, 30s cache.

### 10.3 Health Check: Connection Pool Monitor

```sql
SELECT count(*) as active_connections
FROM pg_stat_activity
WHERE datname = current_database()
```

**PrismaService SRE Config:**
- Auto-injects `connection_limit=5` if missing in DATABASE_URL
- Auto-injects `pool_timeout=10` if missing
- Logs warning if `connection_limit > 10`

---

## 11. MIGRATION HISTORY & ROLLBACK PROCEDURES

### 11.1 Historial de Migraciones

| Migration | Fecha | Descripción | Tipo |
| --- | --- | --- | --- |
| `20260309_add_drivers_and_subscriptions` | 2026-03-09 | Creación de Driver/Subscription | Schema |
| `20260424_v12_schema_sync` | 2026-04-24 | SystemStatus enum, Wallet, ActiveAd, Commission, PostGIS, missing columns | Major sync |
| `add_is_simulated_columns.sql` | 2026-04-14 | `is_simulated` flags + 6 filter indexes | Feature |
| `20260521_add_media_asset_processing_fields` | 2026-05-21 | MediaAsset processing/validation fields | Feature |
| `20260522_enable_rls_on_spatial_ref_sys` | 2026-05-22 | RLS on `spatial_ref_sys` (PostGIS security) | Security |
| `20260526_driverlocations_realtime_rls` | 2026-05-26 | RLS + Realtime CDC on DriverLocations | Security |
| `v12_2_5_indexes_and_cleanup.sql` | 2026-06-05 | Production indexes + simulation cleanup | Performance |

### 11.2 Zero-Downtime Migration Strategy

```bash
# Standard deploy (no schema changes):
prisma migrate deploy  # Applies pending migrations at startup

# Migration with schema changes (requires care):
# 1. Create reversible migration:
prisma migrate dev --name my_feature --create-only
# 2. Review the generated SQL — add DOWN migration manually
# 3. For GIN indexes on JSON columns (table-locking):
#    Use CREATE INDEX CONCURRENTLY instead of Prisma's default
# 4. Test on staging first
prisma migrate deploy  # Production deploy
```

### 11.3 Production Rollback Procedure

```bash
# Option A: Mark migration as rolled-back (preserve history):
prisma migrate resolve --rolled-back "migration_name"

# Option B: Restore from Supabase backup (PITR):
# 1. Go to Supabase Dashboard → Database → Backups
# 2. Select timestamp before migration
# 3. Restore to new branch (no data loss)
# 4. Verify schema, then promote branch

# Option C: Manual SQL rollback (risky):
# 1. Write inverse SQL (DROP INDEX, ALTER TABLE DROP COLUMN, etc.)
# 2. Execute via Supabase SQL Editor
# 3. Run prisma migrate resolve --rolled-back
```

**⚠️ NEVER use `prisma migrate reset` in production** — deletes all data.

### 11.4 PostGIS Extension Lifecycle

```sql
-- New environment setup:
CREATE EXTENSION IF NOT EXISTS postgis;

-- Security requirement (Supabase linting):
ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;

-- Insert PostGIS data:
-- Via $executeRaw in Prisma:
await prisma.$executeRaw`
  UPDATE driver_locations
  SET location = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
  WHERE id = ${id}
`;
```

---

## 12. ONDELETE BEHAVIOR MAP — Complete Reference

> **⚠️ CRITICAL:** Prisma schema declarations and DB migration constraints **disagree** on some relations. The DB constraints are the actual enforcement.

### 12.1 Cascade Deletions (Parent deletion removes children)

| Parent → Child | Schema Declaration | DB Constraint | Effective |
| --- | --- | --- | --- |
| Campaign → Playlist | `onDelete: Cascade` | `ON DELETE CASCADE` | ✅ Cascade |
| Campaign → PlaylistItem | `onDelete: Cascade` | `ON DELETE CASCADE` | ✅ Cascade |
| Campaign → DeviceCampaign | `onDelete: Cascade` | `ON DELETE CASCADE` | ✅ Cascade |
| Campaign → CampaignMetric | `onDelete: Cascade` | `ON DELETE CASCADE` | ✅ Cascade |
| Campaign → MediaAsset | `onDelete: Cascade` | `ON DELETE CASCADE` | ✅ Cascade |
| Campaign → Video | `onDelete: Cascade` | `ON DELETE CASCADE` | ✅ Cascade |
| Device → PlaylistItem | `onDelete: Cascade` | `ON DELETE CASCADE` | ✅ Cascade |
| Device → DeviceCampaign | `onDelete: Cascade` | `ON DELETE CASCADE` | ✅ Cascade |
| Device → DeviceCommand | `onDelete: Cascade` | `ON DELETE CASCADE` | ✅ Cascade |
| Device → DeviceHeartbeat | `onDelete: Cascade` | `ON DELETE CASCADE` | ✅ Cascade |
| Device → PlaybackEvent | `onDelete: Cascade` | `ON DELETE CASCADE` | ✅ Cascade |
| Device → DriverLocation | `onDelete: Cascade` | `ON DELETE CASCADE` | ✅ Cascade |
| Device → Subscription | `onDelete: Cascade` | `ON DELETE CASCADE` | ✅ Cascade |
| Driver → PayrollPayment | `onDelete: Cascade` | `ON DELETE CASCADE` | ✅ Cascade |
| Driver → Subscription | `onDelete: Cascade` | `ON DELETE CASCADE` | ✅ Cascade |
| Driver → ContractAcceptance | `onDelete: Cascade` | `ON DELETE CASCADE` | ✅ Cascade |
| Driver → ReconciliationReport | `onDelete: Cascade` | `ON DELETE CASCADE` | ✅ Cascade |
| Advertiser → AdvertiserSubscription | `onDelete: Cascade` | `ON DELETE CASCADE` | ✅ Cascade |
| Advertiser → Invoice | `onDelete: Cascade` | `ON DELETE CASCADE` | ✅ Cascade |
| Advertiser → PortalRequest | `onDelete: Cascade` | `ON DELETE CASCADE` | ✅ Cascade |

### 12.2 Restrict Deletions (Cannot delete parent if children exist)

| Parent → Child | Schema Declaration | DB Constraint | Effective | SRE Risk |
| --- | --- | --- | --- | --- |
| Driver → Wallet | *No explicit onDelete* | `ON DELETE RESTRICT` | ❌ Restrict | **HIGH** — Cannot delete driver with wallet |
| Driver → Commission | *No explicit onDelete* | `ON DELETE RESTRICT` | ❌ Restrict | **HIGH** — Cannot delete driver with commissions |
| Driver → ActiveAd | `onDelete: Cascade` | `ON DELETE RESTRICT` | ❌ Restrict overrides | **CRITICAL** — Prisma will attempt cascade, DB rejects |
| Driver → Telemetry | `onDelete: Cascade` | `ON DELETE RESTRICT` | ❌ Restrict overrides | **CRITICAL** — Prisma will attempt cascade, DB rejects |

> **SRE Implication:** Deleting a Driver with financial data (Wallet, Commission, ActiveAd, Telemetry) will **FAIL at DB level**. This is intentional — financial data is immutable. To delete a driver, first manually archive/nullify their financial records.

---

## 13. GENERATED CLIENT STALENESS RISK

> **⚠️ SRE:** The embedded Prisma client (`apps/api/prisma/client/index.js`) contains an `inlineSchema` that differs from the actual `schema.prisma` in multiple ways:

| Field | In schema.prisma | In embedded client | Impact |
| --- | --- | --- | --- |
| `Campaign.status` default | `"DRAFT"` | `"PENDING_PAYMENT"` | New campaigns get wrong status |
| `PlaybackEvent.verified` | Present | **Missing** | No verification tracking |
| `PlaybackEvent @@unique` | Present | **Missing** | No dedup constraint |
| `MediaAsset.processingStatus` | Present | **Missing** | No processing workflow |
| `MediaAsset.validationError` | Present | **Missing** | No error tracking |

**Fix:** Run `npx prisma generate` before every deploy. The embedded client is a snapshot from an earlier schema version and will cause runtime errors if not regenerated.

---

## 14. @@MAP CONVENTION — Prisma ↔ PostgreSQL Naming

Every Prisma model uses `@@map("snake_case")` to map to PostgreSQL table names. When writing raw SQL (`$queryRaw`, `$executeRaw`), **always use the mapped table name**, not the Prisma model name:

| Prisma Model | SQL Table Name | Note |
| --- | --- | --- |
| `AnalyticsEvent` | `analytics_events` | Use in raw SQL |
| `PlaybackEvent` | `playback_events` | Use in raw SQL |
| `DriverLocation` | `"DriverLocations"` | **Quoted!** Case-sensitive in migration |
| `DeviceCampaign` | `device_campaigns` | Use in raw SQL |
| `PlaylistItem` | `playlist_items` | Use in raw SQL |
| `FinancialTransaction` | `financial_transactions` | Use in raw SQL |
| `PayrollPayment` | `payroll_payments` | Use in raw SQL |
| `ContractAcceptance` | `contract_acceptances` | Use in raw SQL |
| `PortalRequest` | `portal_requests` | Use in raw SQL |
| `BiDashboardSnapshot` | `bi_dashboard_snapshots` | Use in raw SQL |
| `ReconciliationReport` | `reconciliation_reports` | Use in raw SQL |
| `AdvertiserSubscription` | `advertiser_subscriptions` | Use in raw SQL |
| `_CampaignToDriver` | `_CampaignToDriver` | Prisma implicit junction (quoted) |

---

## 15. GLOSARIO DE TÉRMINOS

| Término | Definición |
| --- | --- |
| **Proof-of-Play** | Evento verificado de reproducción de anuncio (`PlaybackEvent.verified = true`) |
| **Kill-Switch** | Bloqueo automático de dispositivo por falta de pago (HTTP 402) |
| **Wake-up Call** | Comando push vía Supabase Realtime para forzar sync en tablets |
| **Batching** | Acumulación de eventos GPS en lotes de 10:1 para reducir carga |
| **Debounce 5min** | Intervalo mínimo entre envíos de telemetría para ahorrar batería |
| **Idempotencia** | Garantía de que repetir una solicitud no duplica el efecto |
| **MRR** | Monthly Recurring Revenue (ingreso mensual recurrente) |
| **ARPU** | Average Revenue Per User (ingreso promedio por usuario) |
| **Churn Rate** | Tasa de cancelación de anunciantes o conductores |
| **Yield Per Screen** | Ingreso promedio generado por cada tablet |

---

*Este documento es la fuente de verdad para el schema de base de datos. Mantener actualizado tras cada migración.*
