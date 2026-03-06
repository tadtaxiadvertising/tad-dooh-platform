# 🚀 TAD DOOH Platform - Guía de Inicio Rápido

**Para desarrolladores que quieren empezar a trabajar inmediatamente**

---

## 📋 Prerrequisitos

- Node.js 20.x
- Docker + Docker Compose
- Git
- PostgreSQL 15+ (o usar Docker)

---

## ⚡ Quick Start (5 minutos)

### 1. Clonar y Configurar

```bash
# Clonar repositorio
cd "/root/.openclaw/workspace/TAD DOOH Platform"

# Copiar variables de entorno
cp backend/.env.example backend/.env

# Editar .env con tus credenciales
nano backend/.env
```

### 2. Iniciar con Docker

```bash
# Desde la raíz del proyecto
cd "/root/.openclaw/workspace/TAD DOOH Platform"

# Iniciar todos los servicios
docker-compose up -d

# Ver logs
docker-compose logs -f
```

### 3. Instalar Dependencias

```bash
# Backend
cd backend
npm install
npx prisma generate
npx prisma migrate dev

# Frontend (cuando esté listo)
cd ../frontend
npm install
```

### 4. Acceder

| Servicio | URL | Credenciales |
|----------|-----|--------------|
| **API** | http://localhost:3000 | - |
| **Swagger Docs** | http://localhost:3000/docs | - |
| **Frontend** | http://localhost:3001 | admin@tad.do / password |
| **PostgreSQL** | localhost:5432 | postgres / password |

---

## 📁 Estructura de Archivos

```
TAD DOOH Platform/
├── backend/                    # API NestJS
│   ├── src/
│   │   ├── devices/           # ✅ Creado
│   │   ├── campaigns/         # ✅ Creado
│   │   ├── media/             # ⏳ Pendiente
│   │   ├── analytics/         # ⏳ Pendiente
│   │   ├── commands/          # ⏳ Pendiente
│   │   └── sync/              # ⏳ Pendiente
│   ├── prisma/
│   │   └── schema.prisma      # ✅ Database schema
│   └── package.json           # ✅ Dependencies
│
├── frontend/                   # Dashboard Next.js
│   └── (pendiente)
│
├── tablet-player/              # PWA para tablets
│   └── (pendiente)
│
└── docs/
    ├── ARQUITECTURA-COMPLETA.md  # ✅ Arquitectura detallada
    └── QUICKSTART.md             # ✅ Este archivo
```

---

## 🔧 Comandos Útiles

### Backend

```bash
# Desarrollo (auto-reload)
cd backend
npm run start:dev

# Build production
npm run build

# Tests
npm run test
npm run test:e2e

# Database
npx prisma studio              # GUI de database
npx prisma migrate dev         # Crear migración
npx prisma migrate deploy      # Deploy a production
npx prisma db seed             # Seed data
```

### Docker

```bash
# Iniciar servicios
docker-compose up -d

# Detener servicios
docker-compose down

# Ver logs
docker-compose logs -f api
docker-compose logs -f db

# Reiniciar servicio
docker-compose restart api

# Ver estado
docker-compose ps
```

---

## 🗄️ Database Setup

### Conexión Local

```bash
# Conectar con psql
psql -h localhost -U postgres -d tad

# O con Docker
docker-compose exec db psql -U postgres -d tad
```

### Ver Tablas

```sql
\dt                    # Listar tablas
\d devices             # Ver estructura de devices
SELECT * FROM devices LIMIT 10;
```

---

## 🔌 API Endpoints Principales

### Devices

```bash
# Listar dispositivos
curl http://localhost:3000/api/devices

# Crear dispositivo
curl -X POST http://localhost:3000/api/devices \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "taxi-001",
    "name": "Taxi Santiago 1",
    "city": "Santiago"
  }'

# Enviar comando
curl -X POST http://localhost:3000/api/devices/taxi-001/command \
  -H "Content-Type: application/json" \
  -d '{
    "commandType": "sync",
    "commandParams": {}
  }'
```

### Campaigns

```bash
# Listar campañas
curl http://localhost:3000/api/campaigns

# Crear campaña
curl -X POST http://localhost:3000/api/campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Promo Marzo 2026",
    "description": "Campaña de lanzamiento",
    "startDate": "2026-03-15T00:00:00Z",
    "endDate": "2026-03-31T23:59:59Z",
    "targetCities": ["Santiago", "Santo Domingo"]
  }'
```

### Sync (Tablet)

```bash
# Iniciar sync diario
curl -X POST http://localhost:3000/api/sync/init \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "taxi-001",
    "token": "device-auth-token",
    "lastSync": "2026-03-05T22:00:00Z"
  }'

# Upload analytics
curl -X POST http://localhost:3000/api/analytics/batch \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "taxi-001",
    "events": [
      {
        "eventType": "video_started",
        "campaignId": "camp-123",
        "mediaId": "video-456",
        "occurredAt": "2026-03-05T14:30:00Z"
      }
    ]
  }'
```

---

## 🐛 Debugging

### Ver Logs de la API

```bash
# Docker logs
docker-compose logs -f api

# O en desarrollo
npm run start:dev
```

### Testear Database

```bash
# Conectar a PostgreSQL
docker-compose exec db psql -U postgres -d tad

# Ver dispositivos
SELECT * FROM devices;

# Ver eventos recientes
SELECT * FROM analytics_events ORDER BY occurred_at DESC LIMIT 10;
```

### Testear API con Swagger

1. Abre http://localhost:3000/docs
2. Explora los endpoints
3. Click en "Authorize" para login
4. Testea cada endpoint desde el browser

---

## 📊 Seed Data (Datos de Ejemplo)

```bash
# Ejecutar seed
cd backend
npx prisma db seed
```

Esto creará:
- 1 usuario admin (admin@tad.do)
- 10 dispositivos de ejemplo
- 3 campañas de ejemplo
- 20 archivos de media de ejemplo

---

## 🚀 Deploy a Production

### 1. Configurar Variables

```bash
# Production .env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@prod-db:5432/tad
JWT_SECRET=tu-secret-key-muy-larga-y-segura
STORAGE_KEY=your-s3-key
STORAGE_SECRET=your-s3-secret
```

### 2. Build y Deploy

```bash
# Build
docker-compose -f docker-compose.prod.yml build

# Deploy
docker-compose -f docker-compose.prod.yml up -d

# Ver logs
docker-compose logs -f
```

### 3. Migraciones

```bash
# Ejecutar migraciones
docker-compose exec api npx prisma migrate deploy
```

---

## 📞 Soporte

**Documentación completa:** `docs/ARQUITECTURA-COMPLETA.md`

**Issues:** Reportar en GitHub

**Contacto:** tad.taxiadvertising@gmail.com

---

**Última actualización:** 6 de Marzo, 2026  
**Versión:** 0.1.0
