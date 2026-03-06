# 🏗️ TAD DOOH Platform - Arquitectura del Sistema

**Taxi Advertising Distribution - Digital Out-Of-Home Network**

---

## 📋 TABLA DE CONTENIDOS

1. [Visión General](#visión-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Componentes Principales](#componentes-principales)
4. [Flujo de Sincronización Diaria](#flujo-de-sincronización-diaria)
5. [Modelo de Datos](#modelo-de-datos)
6. [API Endpoints](#api-endpoints)
7. [Estrategias de Optimización](#estrategias-de-optimización)
8. [Seguridad](#seguridad)
9. [Deploy y Infraestructura](#deploy-y-infraestructura)

---

## 👁️ VISIÓN GENERAL

### Problema a Resolver

Gestionar **miles de tablets Android** instaladas en taxis que reproducen contenido publicitario, con las siguientes restricciones:

| Restricción | Impacto |
|-------------|---------|
| **1 conexión diaria** | Todo debe funcionar offline |
| **Datos móviles limitados** | Minimizar transferencia de datos |
| **Conectividad inestable** | Sistema debe ser tolerante a fallos |
| **Escala masiva** | 100 → 10,000 dispositivos |
| **Costo startup** | Tecnologías open-source y low-cost |

### Solución Propuesta

**Arquitectura Offline-First** con sincronización diaria:

```
DÍA TÍPICO EN UN TAXI:

05:00 AM - Taxi inicia turno
  │
  ├─▶ Driver enciende tablet
  ├─▶ Tablet conecta a WiFi/móvil (5-10 min)
  ├─▶ Sincroniza con servidor TAD
  │   ├─ Descarga campañas nuevas
  │   ├─ Sube analytics del día anterior
  │   └─ Recibe comandos remotos
  │
  └─▶ Tablet vuelve a offline

05:10 AM - 11:00 PM - Taxi en operación
  │
  ├─▶ Reproduce videos OFFLINE todo el día
  ├─▶ Registra eventos localmente
  └─▶ Sin consumo de datos

11:00 PM - Fin del turno
  │
  └─▶ Tablet en standby hasta próximo turno
```

---

## 🏛️ ARQUITECTURA DEL SISTEMA

### Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────────────┐
│                         TAD DOOH PLATFORM                           │
│                         (Cloud - AWS/DigitalOcean)                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    FRONTEND DASHBOARD                         │  │
│  │                   (Next.js + React)                           │  │
│  │                                                               │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐             │  │
│  │  │  Campaigns  │ │   Devices   │ │  Analytics  │             │  │
│  │  │  Manager    │ │  Management │ │  Dashboard  │             │  │
│  │  └─────────────┘ └─────────────┘ └─────────────┘             │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              │                                      │
│                              ▼                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                      API GATEWAY                              │  │
│  │                    (NestJS + Express)                         │  │
│  │                                                               │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐             │  │
│  │  │   Auth      │ │Rate Limiting│ │   Logging   │             │  │
│  │  │   Middleware│ │  Middleware │ │  Middleware │             │  │
│  │  └─────────────┘ └─────────────┘ └─────────────┘             │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              │                                      │
│         ┌────────────────────┼────────────────────┐                │
│         ▼                    ▼                    ▼                │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐        │
│  │  Campaign   │      │   Device    │      │   Media     │        │
│  │   Service   │      │   Service   │      │   Service   │        │
│  │             │      │             │      │             │        │
│  │ - CRUD      │      │ - Registry  │      │ - Upload    │        │
│  │ - Schedule  │      │ - Health    │      │ - Storage   │        │
│  │ - Targeting │      │ - Commands  │      │ - CDN       │        │
│  └──────┬──────┘      └──────┬──────┘      └──────┬──────┘        │
│         │                    │                    │                │
│         └────────────────────┼────────────────────┘                │
│                              │                                      │
│         ┌────────────────────┼────────────────────┐                │
│         ▼                    ▼                    ▼                │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐        │
│  │  Analytics  │      │   Command   │      │   Sync      │        │
│  │   Service   │      │   Service   │      │   Service   │        │
│  │             │      │             │      │             │        │
│  │ - Ingestion │      │ - Push      │      │ - Daily     │        │
│  │ - Metrics   │      │ - Remote    │      │ - Package   │        │
│  │ - Reports   │      │ - Control   │      │ - Delta     │        │
│  └──────┬──────┘      └──────┬──────┘      └──────┬──────┘        │
│         │                    │                    │                │
│         └────────────────────┼────────────────────┘                │
│                              │                                      │
│         ┌────────────────────┼────────────────────┐                │
│         ▼                    ▼                    ▼                │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐        │
│  │ PostgreSQL  │      │    Redis    │      │  S3/MinIO   │        │
│  │  (Primary)  │      │   (Cache)   │      │  (Storage)  │        │
│  └─────────────┘      └─────────────┘      └─────────────┘        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS (1x día)
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      TABLET EN TAXI (Android)                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              Fully Kiosk Browser (App Android)                │  │
│  │                                                               │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │           TAD Tablet Player (Progressive Web App)      │  │  │
│  │  │                                                         │  │  │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │  │  │
│  │  │  │   Playlist   │  │  Video       │  │   Analytics  │  │  │  │
│  │  │  │   Manager    │  │  Player      │  │   Recorder   │  │  │  │
│  │  │  └──────────────┘  └──────────────┘  └──────────────┘  │  │  │
│  │  │                                                         │  │  │
│  │  │  ┌──────────────┐  ┌──────────────┐                    │  │  │
│  │  │  │   Sync       │  │   Watchdog   │                    │  │  │
│  │  │  │   Client     │  │   Monitor    │                    │  │  │
│  │  │  └──────────────┘  └──────────────┘                    │  │  │
│  │  │                                                         │  │  │
│  │  │  Local Storage (IndexedDB + FileSystem Access API)      │  │  │
│  │  │  - Campaign packages                                    │  │  │
│  │  │  - Video files                                          │  │  │
│  │  │  - Event queue                                          │  │  │
│  │  │  - Configuration                                        │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  Hardware: Tablet Android (4GB RAM, 64GB storage, WiFi/4G)          │
│  Power: 12V USB car charger (continuous power)                       │
│  Network: WiFi hotspot del driver o plan de datos compartido         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 COMPONENTES PRINCIPALES

### 1. Backend API (NestJS)

**Responsabilidades:**
- Autenticación de dispositivos
- Gestión de campañas
- Distribución de contenido
- Ingesta de analytics
- Comandos remotos

**Estructura de servicios:**

```
backend/
├── src/
│   ├── campaigns/
│   │   ├── campaigns.controller.ts
│   │   ├── campaigns.service.ts
│   │   ├── campaigns.module.ts
│   │   ├── dto/
│   │   └── entities/
│   ├── devices/
│   │   ├── devices.controller.ts
│   │   ├── devices.service.ts
│   │   ├── devices.module.ts
│   │   ├── dto/
│   │   └── entities/
│   ├── media/
│   │   ├── media.controller.ts
│   │   ├── media.service.ts
│   │   ├── media.module.ts
│   │   └── storage/
│   ├── analytics/
│   │   ├── analytics.controller.ts
│   │   ├── analytics.service.ts
│   │   ├── analytics.module.ts
│   │   └── metrics/
│   ├── commands/
│   │   ├── commands.controller.ts
│   │   ├── commands.service.ts
│   │   └── commands.module.ts
│   └── sync/
│       ├── sync.controller.ts
│       ├── sync.service.ts
│       └── sync.module.ts
├── tests/
├── docker/
└── package.json
```

### 2. Frontend Dashboard (Next.js)

**Páginas principales:**

```
frontend/
├── src/
│   ├── pages/
│   │   ├── index.tsx              # Login
│   │   ├── dashboard/             # Vista general
│   │   ├── campaigns/             # Gestión de campañas
│   │   │   ├── index.tsx          # Lista de campañas
│   │   │   ├── create.tsx         # Crear campaña
│   │   │   └── [id].tsx           # Detalle campaña
│   │   ├── devices/               # Gestión de dispositivos
│   │   │   ├── index.tsx          # Lista de tablets
│   │   │   ├── [id].tsx           # Detalle tablet
│   │   │   └── map.tsx            # Mapa en vivo
│   │   ├── analytics/             # Analytics
│   │   │   ├── index.tsx          # Dashboard métricas
│   │   │   ├── campaigns.tsx      # Por campaña
│   │   │   ├── devices.tsx        # Por dispositivo
│   │   │   └── export.tsx         # Exportar reportes
│   │   └── settings/              # Configuración
│   ├── components/
│   │   ├── CampaignCard.tsx
│   │   ├── DeviceStatus.tsx
│   │   ├── MetricsChart.tsx
│   │   └── VideoUploader.tsx
│   └── services/
│       ├── api.ts
│       ├── campaigns.ts
│       └── devices.ts
```

### 3. Tablet Player (PWA)

**Características clave:**

| Feature | Implementación |
|---------|----------------|
| **Offline-first** | Service Worker + IndexedDB |
| **Video playback** | HTML5 Video API |
| **Analytics local** | IndexedDB queue |
| **Sync diario** | Background Sync API |
| **Watchdog** | Heartbeat monitor |
| **Kiosk mode** | Fully Kiosk Browser |

**Estructura:**

```
tablet-player/
├── src/
│   ├── index.html
│   ├── app.js                 # Main application
│   ├── player.js              # Video player logic
│   ├── playlist.js            # Playlist manager
│   ├── sync.js                # Sync client
│   ├── analytics.js           # Event recorder
│   ├── watchdog.js            # Health monitor
│   ├── storage.js             # Local storage wrapper
│   └── sw.js                  # Service worker
├── assets/
│   └── placeholder.mp4
├── manifest.json
└── package.json
```

### 4. Analytics Engine

**Pipeline de datos:**

```
Tablet Events (10,000 devices)
        │
        ▼
┌───────────────────┐
│  Event Ingestion  │  ← REST API endpoint
│  (Batch upload)   │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  Event Queue      │  ← Redis/Bull
│  (Buffer)         │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  Event Processor  │  ← Validate, transform
│  (Worker)         │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  PostgreSQL       │  ← Store events
│  (Events table)   │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  Metrics Aggregator│ ← Hourly job
│  (Cron)           │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  Metrics Tables   │  ← Pre-computed metrics
│  (Fast queries)   │
└───────────────────┘
```

**Eventos trackeados:**

| Evento | Campos | Frecuencia |
|--------|--------|------------|
| `video_started` | device_id, campaign_id, video_id, timestamp | ~500K/día |
| `video_completed` | device_id, campaign_id, video_id, timestamp, duration | ~500K/día |
| `video_error` | device_id, video_id, error_code, timestamp | ~1K/día |
| `device_heartbeat` | device_id, status, battery, storage, timestamp | 10K/día |
| `sync_completed` | device_id, downloaded_bytes, uploaded_bytes, timestamp | 10K/día |

---

## 🔄 FLUJO DE SINCRONIZACIÓN DIARIA

### Secuencia Detallada

```
┌─────────────┐                              ┌─────────────┐
│   TABLET    │                              │   SERVER    │
│  (Android)  │                              │   (Cloud)   │
└──────┬──────┘                              └──────┬──────┘
       │                                            │
       │  1. Driver enciende tablet                 │
       │  ─────────────────────────────────────────►│
       │                                            │
       │  2. Tablet conecta a internet              │
       │  (WiFi hotspot del driver)                 │
       │                                            │
       │  3. POST /api/sync/init                    │
       │     { device_id, token, last_sync }        │
       │  ─────────────────────────────────────────►│
       │                                            │
       │                                            │ ◄── Valida token
       │                                            │ ◄── Calcula delta
       │                                            │
       │  4. Response: sync_package                 │
       │     {                                      │
       │       campaigns: [...],                    │
       │       commands: [...],                     │
       │       config: {...}                        │
       │     }                                      │
       │  ◄─────────────────────────────────────────│
       │                                            │
       │  5. Descarga paquetes de campañas          │
       │     (solo diferencias - delta sync)        │
       │  ─────────────────────────────────────────►│
       │                                            │
       │  6. Sube analytics del día anterior        │
       │     POST /api/analytics/batch              │
       │     { events: [...] }                      │
       │  ─────────────────────────────────────────►│
       │                                            │
       │                                            │ ◄── Procesa eventos
       │                                            │ ◄── Actualiza métricas
       │                                            │
       │  7. Response: { success: true }            │
       │  ◄─────────────────────────────────────────│
       │                                            │
       │  8. Ejecuta comandos pendientes            │
       │     (restart, update, clear_cache)         │
       │                                            │
       │  9. Tablet vuelve a offline                │
       │                                            │
       │  10. Reproduce contenido OFFLINE todo el día│
       │                                            │
```

### Optimizaciones de Datos

| Estrategia | Ahorro | Implementación |
|------------|--------|----------------|
| **Delta sync** | 80-90% | Solo descarga campañas nuevas/modificadas |
| **Compresión** | 60-70% | Gzip para JSON, H265 para videos |
| **Batch upload** | 90% | Analytics en lote (1 request vs 1000) |
| **Cache CDN** | 50% | Videos desde Cloudflare CDN |
| **Deduplicación** | 30% | Videos compartidos entre campañas |

**Estimado de datos por tablet/día:**

| Operación | Sin optimizar | Con optimización |
|-----------|---------------|------------------|
| Download campaigns | 500 MB | 50 MB |
| Upload analytics | 10 MB | 1 MB |
| **Total** | **510 MB** | **51 MB** |

**Costo mensual estimado (1000 tablets):**
- Plan de datos: 50 MB × 1000 × 30 días = 1.5 TB
- Costo RD: ~RD$3,000-5,000/mes (plan empresarial)

---

## 📊 MODELO DE DATOS

### PostgreSQL Schema

```sql
-- ============================================
-- DISPOSITIVOS
-- ============================================

CREATE TABLE devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255),
    taxi_number VARCHAR(50),
    city VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active', -- active, inactive, offline, error
    last_sync TIMESTAMP,
    last_heartbeat TIMESTAMP,
    battery_level INTEGER,
    storage_used BIGINT,
    storage_total BIGINT,
    app_version VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_devices_status ON devices(status);
CREATE INDEX idx_devices_last_sync ON devices(last_sync);
CREATE INDEX idx_devices_city ON devices(city);

-- ============================================
-- CAMPAÑAS
-- ============================================

CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'draft', -- draft, active, paused, completed
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    target_cities TEXT[], -- Array de ciudades
    target_fleets TEXT[], -- Array de flotas
    priority INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_dates ON campaigns(start_date, end_date);

-- ============================================
-- PLAYLISTS
-- ============================================

CREATE TABLE playlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    loop_type VARCHAR(20) DEFAULT 'sequential', -- sequential, random, weighted
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE playlist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE,
    media_id UUID REFERENCES media(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    duration_seconds INTEGER,
    weight INTEGER DEFAULT 1, -- Para weighted random
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- MEDIA (VIDEOS/IMÁGENES)
-- ============================================

CREATE TABLE media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255),
    mime_type VARCHAR(100),
    file_size BIGINT,
    duration_seconds INTEGER, -- Para videos
    width INTEGER,
    height INTEGER,
    storage_key VARCHAR(512), -- S3 key
    cdn_url VARCHAR(512),
    hash_md5 VARCHAR(32), -- Para verificación de integridad
    hash_sha256 VARCHAR(64),
    status VARCHAR(20) DEFAULT 'processing', -- processing, ready, error
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_media_status ON media(status);

-- ============================================
-- ANALYTICS EVENTS
-- ============================================

CREATE TABLE analytics_events (
    id BIGSERIAL PRIMARY KEY,
    device_id UUID REFERENCES devices(id),
    campaign_id UUID REFERENCES campaigns(id),
    media_id UUID REFERENCES media(id),
    event_type VARCHAR(50) NOT NULL, -- video_started, video_completed, etc.
    event_data JSONB, -- Datos adicionales del evento
    occurred_at TIMESTAMP NOT NULL,
    received_at TIMESTAMP DEFAULT NOW(),
    processed BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_events_device ON analytics_events(device_id);
CREATE INDEX idx_events_campaign ON analytics_events(campaign_id);
CREATE INDEX idx_events_type ON analytics_events(event_type);
CREATE INDEX idx_events_occurred ON analytics_events(occurred_at);
CREATE INDEX idx_events_unprocessed ON analytics_events(processed) WHERE processed = FALSE;

-- ============================================
-- MÉTRICAS PRE-COMPUTADAS
-- ============================================

CREATE TABLE campaign_metrics (
    id BIGSERIAL PRIMARY KEY,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    city VARCHAR(100),
    total_impressions INTEGER DEFAULT 0,
    total_completions INTEGER DEFAULT 0,
    total_errors INTEGER DEFAULT 0,
    unique_devices INTEGER DEFAULT 0,
    avg_completion_rate DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(campaign_id, date, city)
);

CREATE INDEX idx_metrics_campaign ON campaign_metrics(campaign_id);
CREATE INDEX idx_metrics_date ON campaign_metrics(date);

-- ============================================
-- COMANDOS REMOTOS
-- ============================================

CREATE TABLE device_commands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    command_type VARCHAR(50) NOT NULL, -- restart, sync, reboot, etc.
    command_params JSONB,
    status VARCHAR(20) DEFAULT 'pending', -- pending, executed, failed, expired
    created_at TIMESTAMP DEFAULT NOW(),
    executed_at TIMESTAMP,
    result JSONB,
    expires_at TIMESTAMP
);

CREATE INDEX idx_commands_device ON device_commands(device_id);
CREATE INDEX idx_commands_status ON device_commands(status);
```

---

## 🔌 API ENDPOINTS

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | Login admin |
| `POST` | `/api/auth/device` | Auth dispositivo (token) |
| `POST` | `/api/auth/refresh` | Refresh token |

### Devices

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/devices` | Lista de dispositivos |
| `GET` | `/api/devices/:id` | Detalle dispositivo |
| `GET` | `/api/devices/:id/health` | Health status |
| `GET` | `/api/devices/:id/history` | Historial de actividad |
| `POST` | `/api/devices/:id/command` | Enviar comando remoto |
| `PUT` | `/api/devices/:id` | Actualizar dispositivo |
| `DELETE` | `/api/devices/:id` | Eliminar dispositivo |

### Campaigns

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/campaigns` | Lista de campañas |
| `GET` | `/api/campaigns/:id` | Detalle campaña |
| `GET` | `/api/campaigns/:id/metrics` | Métricas de campaña |
| `POST` | `/api/campaigns` | Crear campaña |
| `PUT` | `/api/campaigns/:id` | Actualizar campaña |
| `DELETE` | `/api/campaigns/:id` | Eliminar campaña |
| `POST` | `/api/campaigns/:id/publish` | Publicar campaña |

### Media

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/media` | Lista de archivos |
| `POST` | `/api/media/upload` | Upload archivo |
| `GET` | `/api/media/:id` | Detalle archivo |
| `DELETE` | `/api/media/:id` | Eliminar archivo |
| `GET` | `/api/media/:id/url` | URL firmada (CDN) |

### Sync

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/sync/init` | Iniciar sync diario |
| `GET` | `/api/sync/package/:id` | Descargar paquete |
| `POST` | `/api/sync/complete` | Completar sync |

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/analytics/batch` | Upload batch de eventos |
| `GET` | `/api/analytics/summary` | Resumen general |
| `GET` | `/api/analytics/campaigns` | Por campañas |
| `GET` | `/api/analytics/devices` | Por dispositivos |
| `GET` | `/api/analytics/export` | Exportar datos |

---

## 📦 ESTRATEGIAS DE OPTIMIZACIÓN

### 1. Delta Sync

**Problema:** Descargar 500 MB diarios por tablet es inviable.

**Solución:** Solo descargar lo que cambió.

```javascript
// Tablet envía:
{
  device_id: "taxi-001",
  last_sync: "2026-03-05T22:00:00Z",
  known_campaigns: ["camp-1", "camp-2"],
  known_media: ["video-1", "video-2"],
  known_hashes: {
    "video-1": "abc123...",
    "video-2": "def456..."
  }
}

// Server responde solo con diferencias:
{
  new_campaigns: [
    {
      id: "camp-3",
      name: "Promo Marzo",
      media: ["video-3", "video-4"],
      priority: 1
    }
  ],
  updated_campaigns: [],
  removed_campaigns: ["camp-1"],
  new_media: [
    {
      id: "video-3",
      url: "https://cdn.tad.do/videos/video-3.mp4",
      hash: "ghi789...",
      size: 5242880
    }
  ]
}
```

### 2. Campaign Packaging

**Problema:** Muchas requests HTTP = más datos + más tiempo.

**Solución:** Empaquetar campañas en un solo archivo.

```
campaign-package-001.zip
├── manifest.json          # Metadata de la campaña
├── playlist.json          # Orden de reproducción
├── videos/
│   ├── video-1.mp4
│   └── video-2.mp4
├── images/
│   └── banner-1.jpg
└── checksums.json         # Hashes para verificación
```

**Beneficios:**
- 1 request HTTP en lugar de 10
- Mejor compresión (ZIP vs archivos individuales)
- Verificación de integridad simplificada

### 3. Video Compression

**Codecs recomendados:**

| Codec | Compresión | Compatibilidad | Uso |
|-------|------------|----------------|-----|
| **H.264** | 1x | 100% | Fallback universal |
| **H.265 (HEVC)** | 2x | 80% (Android 5+) | Primary |
| **AV1** | 2.5x | 60% (Android 10+) | Futuro |

**Configuración FFmpeg:**

```bash
# H.265 optimizado para tablets
ffmpeg -i input.mp4 \
  -c:v libx265 -preset medium -crf 28 \
  -c:a aac -b:a 128k \
  -vf "scale=1280:720" \
  -pix_fmt yuv420p \
  output_h265.mp4

# Resultado: 10 MB → 5 MB (50% reducción)
```

### 4. Analytics Batching

**Problema:** 1000 eventos × 1000 tablets = 1M requests/día.

**Solución:** Batch de 100 eventos por request.

```javascript
// Tablet acumula eventos en IndexedDB
const eventQueue = await db.events.toArray();

// Cada 100 eventos o cada hora, envía batch
if (eventQueue.length >= 100 || timeSinceLastSync > 3600000) {
  await fetch('/api/analytics/batch', {
    method: 'POST',
    body: JSON.stringify({
      device_id: DEVICE_ID,
      events: eventQueue.slice(0, 100),
      sync_timestamp: new Date().toISOString()
    })
  });
  
  // Remover eventos enviados
  await db.events.bulkDelete(eventQueue.slice(0, 100).map(e => e.id));
}
```

**Reducción:** 1,000,000 requests → 10,000 requests (99% menos)

---

## 🔐 SEGURIDAD

### 1. Device Authentication

**Token-based auth con rotación:**

```
1. Tablet se registra → recibe device_token
2. Token se guarda en Secure SharedPreferences
3. Cada request incluye: Authorization: Bearer <token>
4. Token rota cada 30 días
5. Token revocable desde dashboard
```

### 2. Media Integrity

**Verificación de archivos:**

```javascript
// Server genera hash al upload
const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

// Tablet verifica al descargar
const downloadedHash = await calculateSHA256(downloadedFile);
if (downloadedHash !== expectedHash) {
  throw new Error('Integrity check failed');
}
```

### 3. API Security

| Protección | Implementación |
|------------|----------------|
| **Rate limiting** | 100 requests/min por dispositivo |
| **CORS** | Orígenes específicos |
| **HTTPS** | TLS 1.3 obligatorio |
| **Input validation** | Zod/Joi schemas |
| **SQL injection** | Parameterized queries |
| **XSS** | Sanitización de inputs |

---

## 🚀 DEPLOY Y INFRAESTRUCTURA

### Stack Recomendado (Startup-Friendly)

| Componente | Tecnología | Costo Estimado |
|------------|------------|----------------|
| **Cloud** | DigitalOcean Droplet | $40/mes |
| **Database** | Managed PostgreSQL (DO) | $30/mes |
| **Storage** | DigitalOcean Spaces (S3) | $5/mes + $0.02/GB |
| **CDN** | Cloudflare (free tier) | $0/mes |
| **Cache** | Redis (self-hosted) | $0/mes (incluido en droplet) |
| **Total** | | **~$75-100/mes** |

### Docker Compose (Development)

```yaml
version: '3.8'

services:
  api:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/tad
      - REDIS_URL=redis://redis:6379
      - STORAGE_ENDPOINT=nyc3.digitaloceanspaces.com
      - STORAGE_KEY=${STORAGE_KEY}
      - STORAGE_SECRET=${STORAGE_SECRET}
    depends_on:
      - db
      - redis

  frontend:
    build: ./frontend
    ports:
      - "3001:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:3000

  db:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=tad
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### Production Deployment

```bash
# 1. Crear droplet en DigitalOcean
doctl compute droplet create tad-platform \
  --size s-2vcpu-4gb \
  --region nyc3 \
  --image ubuntu-22-04-x64

# 2. Instalar Docker
ssh root@<droplet-ip>
curl -fsSL https://get.docker.com | sh

# 3. Clonar repositorio
git clone https://github.com/tadtaxiadvertising/tad-dooh-platform.git
cd tad-dooh-platform

# 4. Configurar variables de entorno
cp .env.example .env
nano .env  # Editar con credenciales reales

# 5. Deploy con Docker Compose
docker-compose -f docker-compose.prod.yml up -d

# 6. Configurar nginx como reverse proxy
# 7. Configurar SSL con Let's Encrypt
# 8. Configurar Cloudflare CDN
```

---

## 📈 ESCALABILIDAD

### Crecimiento por Fases

| Fase | Dispositivos | Infraestructura | Costo/mes |
|------|--------------|-----------------|-----------|
| **Piloto** | 10-50 | 1 droplet small | $50 |
| **Launch** | 50-500 | 2 droplets + managed DB | $150 |
| **Growth** | 500-2000 | Load balancer + 3 droplets | $400 |
| **Scale** | 2000-10000 | Microservicios + Kubernetes | $1,500+ |

### Optimizaciones por Escala

**100-500 dispositivos:**
- Monolito NestJS
- PostgreSQL single instance
- Redis para cache

**500-2000 dispositivos:**
- Separar servicios (campaigns, devices, analytics)
- PostgreSQL con read replicas
- Redis cluster

**2000-10000 dispositivos:**
- Kubernetes cluster
- Database sharding por ciudad
- Message queue (Kafka/RabbitMQ)
- CDN para todo el contenido

---

## 📝 PRÓXIMOS PASOS

### Fase 1: MVP (2-3 semanas)

- [ ] Backend API básico (NestJS)
- [ ] Database schema implementado
- [ ] Tablet player PWA (offline playback)
- [ ] Sync diario básico
- [ ] Dashboard admin simple

### Fase 2: Production Ready (4-6 semanas)

- [ ] Analytics engine completo
- [ ] Comandos remotos
- [ ] Health monitoring
- [ ] CDN integration
- [ ] Security hardening

### Fase 3: Scale (8-12 semanas)

- [ ] Delta sync optimizado
- [ ] Campaign packaging
- [ ] Video transcoding pipeline
- [ ] Advanced analytics
- [ ] Multi-city support

---

**Documentación creada:** 6 de Marzo, 2026  
**Autor:** Senior DOOH Distributed Systems Architect (AI)  
**Versión:** 1.0.0
