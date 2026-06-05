# 🗄️ 13 — PRISMA SCHEMA REFERENCE & DATABASE ARCHITECTURE

> **Versión**: 13.0.0 (v12.1.2 Idempotency & Financial Core)
> **Última Actualización**: 2026-06-05
> **Audiencia**: Backend Developers, DBA, Arquitectos
> **Fuente de Verdad**: `apps/api/prisma/schema.prisma`

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

## 2. MODELOS DEL SCHEMA (32 Modelos)

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
| `subscriptionPaid` | `Boolean` | Estado de pago RD$6,000/año |
| `subscriptionEnd` | `DateTime?` | Fecha de vencimiento |
| `status` | `SystemStatus` | `OPERATIVO` | `PENDIENTE_PAGO` | `BLOQUEADO` |
| `onboardingStatus` | `String` | Default: `"PENDING_AGREEMENT"` |
| `walletBalance` | `Float` | Balance en RD$ |
| `referralCode` | `String @uuid @unique` | Código QR para referidos |
| `bankAccount` | `Json?` | Datos bancarios (offline-first) |
| `wallet` | `Wallet?` | Relación 1:1 |
| `devices` | `Device[]` | Tablets vinculadas |
| `commissions` | `Commission[]` | Bonos por referidos/ventas |
| `activeAds` | `ActiveAd[]` | Anuncios activos en su tablet |
| `reconciliationReports` | `ReconciliationReport[]` | Reportes mensuales |

**Relaciones clave:**
- `referredBy` → self-reference `Driver` (árbol de referidos)
- `referredAdvertisers` → `Advertiser[]` (anunciantes captados)
- `subscriptions` → `Subscription[]` (historial de pagos)

**Reglas de Negocio:**
- `subscriptionPaid = false` → Kill-Switch 402
- `status = BLOQUEADO` → Rechazo en `/drivers/:id/check-in`
- Compensación: `min(Active_Ads, 15) × RD$500 + Commissions × RD$500`

---

#### `Device` — Tablets Android (FullyKiosk)
| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | `String @uuid` | PK |
| `deviceId` | `String @unique` | Hardware identifier |
| `taxiNumber` | `String?` | Vinculación STI-XXX |
| `city` | `String?` | Santiago, Santo Domingo, etc. |
| `status` | `SystemStatus` | Estado operativo |
| `isOnline` | `Boolean` | Última conexión < 5 min |
| `batteryLevel` | `Int` | 0-100% |
| `lastLat` / `lastLng` | `Float?` | Última coordenada GPS |
| `driverId` | `String?` | FK → `Driver` |
| `connectivityStatus` | `String` | `"ONLINE" | "STALE" | "WARNING" | "CRITICAL"` |
| `playerStatus` | `String?` | `"PLAYING" | "IDLE" | "ERROR" | "OFFLINE"` |
| `lastSyncHash` | `String?` | ETag del último manifiesto |
| `isSimulated` | `Boolean` | Flag para load testing |

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
| `status` | `String` | `"PENDING_PAYMENT" | "ACTIVE" | "PAUSED" | "COMPLETED"` |
| `startDate` / `endDate` | `DateTime` | Vigencia |
| `isGlobal` | `Boolean` | Todas las tablets |
| `targetCities` | `String` | JSON array: `["Santiago","SDQ"]` |
| `targetFleets` | `String` | JSON array de fleet IDs |
| `targetImpressions` | `Int` | Meta de impresiones |
| `budget` | `Float` | Presupuesto en RD$ |
| `priority` | `Int` | Orden en playlist (mayor = primero) |

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
| `availableBalance` | `Float` | RD$ disponibles para retiro |
| `pendingWithdrawal` | `Float` | RD$ en proceso de retiro |
| `bankInfo` | `Json?` | `{ bank, account, type }` |

**Relación:** `driver` → `Driver` (1:1, `onDelete: Cascade`)

---

#### `Commission` — Bonos por Referidos y Ventas
| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | `String @uuid` | PK |
| `driverId` | `String` | FK → `Driver` |
| `amount` | `Float` | Default: `500.0` |
| `sourceType` | `String` | `"ADVERTISER_SALE" | "DRIVER_REFERRAL"` |
| `status` | `String` | `"PENDING" | "APPROVED" | "PAID"` |

**Regla de Negocio:**
- `DRIVER_REFERRAL`: Se crea cuando un referido (vía `referralCode`) cierra su primera campaña pagada.
- `ADVERTISER_SALE`: Bono por venta directa de anunciante (futuro).

---

#### `PayrollPayment` — Nómina Mensual del Conductor
| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | `String @uuid` | PK |
| `driverId` | `String` | FK → `Driver` |
| `amount` | `Float` | RD$ calculados |
| `month` / `year` | `Int` | Período de pago |
| `status` | `String` | `"PENDING" | "PAID"` |
| `activeAds` | `Int` | Promedio de anuncios activos |
| `gpsPoints` | `Int` | Puntos de GPS válidos |
| `transmissionHours` | `Float` | Horas de transmisión |
| `penaltyApplied` | `Boolean` | Penalización por bajo rendimiento |

**Única:** `@@unique([driverId, month, year])`

**Fórmula de Cálculo:**
```
amount = (min(activeAds, 15) × 500) + (commissions × 500)
if gpsPoints < threshold → penaltyApplied = true, amount *= (1 - penaltyPercentage)
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
| `reference` | `String @unique` | Referencia única de transacción |

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

#### `Subscription` — Suscripción Anual del Conductor (RD$6,000)
| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | `String @uuid` | PK |
| `driverId` | `String` | FK → `Driver` |
| `deviceId` | `String?` | FK → `Device` (opcional) |
| `amount` | `Float` | Default: `6000.0` |
| `status` | `String` | `"PENDING" | "ACTIVE" | "EXPIRED"` |
| `startDate` | `DateTime` | Inicio de cobertura |
| `dueDate` | `DateTime` | Fecha límite de pago |
| `validUntil` | `DateTime` | Fin de cobertura |
| `paidAt` | `DateTime?` | Fecha de pago real |
| `isSimulated` | `Boolean` | Load testing |

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
| `referredBy` | `String?` | FK → `Driver` (árbol de referidos) |
| `password` | `String?` | Hash bcrypt |
| `category` | `String` | `"General" | "Restaurante" | "Servicios"` |
| `websiteUrl` / `whatsapp` / `facebook` / `instagram` | `String?` | Redes sociales |
| `productsData` | `String` | JSON array de productos |

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
| `advertiserId` / `driverId` / `campaignId` | `String?` | FKs opcionales |
| `type` | `String` | Tipo de solicitud |
| `status` | `String` | `"PENDING" | "APPROVED" | "REJECTED"` |
| `title` / `description` | `String` | Contenido |
| `data` | `String` | JSON payload |
| `adminNotes` | `String?` | Notas del admin |

---

#### `ContractAcceptance` — Aceptación Legal de Conductores
| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | `String @uuid` | PK |
| `driverId` | `String` | FK → `Driver` |
| `version` | `String` | Versión del contrato |
| `ipAddress` / `userAgent` | `String?` | Auditoría |
| `timestamp` | `DateTime` | Fecha de aceptación |

**Uso:** Compliance legal. Cada conductor debe aceptar contrato y seguro antes de `status = OPERATIVO`.

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

## 8. GLOSARIO DE TÉRMINOS

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
