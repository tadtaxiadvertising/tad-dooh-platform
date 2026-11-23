# 🚗 TAD DOOH Platform

## Taxi Advertising Distribution - Digital Out-Of-Home Network

---

## 📖 Descripción

Plataforma para gestionar miles de tablets Android instaladas en taxis que reproducen contenido publicitario. Diseñada para funcionar **99% offline** con solo **1 conexión diaria** por dispositivo.

---

## 🎯 Características Principales

### Para Administradores

- ✅ **Gestión de Campañas** - Crear, programar y targetear campañas publicitarias
- ✅ **Upload de Medios** - Videos, imágenes y campañas HTML
- ✅ **Dashboard de Analytics** - Métricas en tiempo real de impresiones y alcance
- ✅ **Mapa Profesional (MAP-SPEC-2026)** - Visualización premium con orientación de vehículos y lógica de estado online/offline.
- ✅ **Gestión de Dispositivos** - Monitoreo de salud y control remoto de tablets
- ✅ **Ecosistema Financiero V12** - Billetera digital, compensación automatizada (RD$500/anuncio) y sistema de referidos.
- ✅ **Telemetría Avanzada** - Tracking GPS con ahorro de batería (5 min debounce) y sincronización por lotes.
- ✅ **Mobile Gateway** - App de conductor rediseñada con Tailwind 4, modo offline-first y gestión bancaria.

### Para Tablets (Taxis)

- ✅ **Playback Offline** - Reproduce contenido sin internet todo el día.
- ✅ **Sync Diario** - Se conecta al inicio del turno para descargar nuevas campañas.
- ✅ **Kill-Switch de Suscripción** - Bloqueo automático de pantallas para conductores morosos.
- ✅ **Watchdog v2** - Monitoreo constante de salud con auto-reinicio de servicios.

---

## 🏗️ Arquitectura

```text
┌─────────────────────────────────────────┐
│         CLOUD (VPS / EasyPanel)         │
│                                         │
│  ┌───────────┐      ┌───────────┐       │
│  │  Next.js  │ ────▶│  NestJS   │       │
│  │ Portals   │ (Proxy)│  API v12  │       │
│  └───────────┘      └───────────┘       │
│        │               │                │
│        │        ┌──────▼──────────┐     │
│        └───────▶│  TAD Remotion   │     │
│        │        │  (Video Engine) │     │
│        │        └─────────────────┘     │
│        │               │                │
│        │        ┌──────▼──────────┐     │
│        └───────▶│  TAD Simulator  │     │
│                 │ (Engine & UI)   │     │
│                 └─────────────────┘     │
│              │            │             │
│         ┌────▼────────────▼────┐        │
│         │      PostgreSQL      │        │
│         └──────────────────────┘        │
└─────────────────────────────────────────┘
              │
              │ HTTPS (Offline-First Sync)
              ▼
┌─────────────────────────────────────────┐
│      TABLET EN TAXI (Android)           │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │   Fully Kiosk Browser           │   │
│  │   ┌─────────────────────────┐   │   │
│  │   │   TAD Player (PWA)      │   │   │
│  │   │   - Offline playback    │   │   │
│  │   │   - Local storage       │   │   │
│  │   │   - Analytics queue     │   │   │
│  │   └─────────────────────────┘   │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

---

## 📁 Estructura del Proyecto (Monorepo)

```text
TAD DOOH Platform/
├── apps/
│   ├── admin/                 # Dashboard Admin (Next.js 15)
│   ├── advertiser/            # Portal de Anunciantes (Next.js 15)
│   ├── driver/                # Portal de Conductores (Next.js 15)
│   ├── api/                   # Backend API (NestJS 10)
│   ├── agents-orchestrator/   # Orquestador de agents
│   ├── driver-android/        # Driver nativo (Android)
│   ├── driver-flutter/        # Driver nativo (Flutter)
│   ├── player/                # Tablet Player (PWA, offline-first)
│   └── tad-simulator/         # Engine de simulación y control
└── packages/
    ├── ui/                    # Componentes compartidos (Tailwind 4)
    ├── services/              # API client, auth, realtime, circuit-breaker, cookies
    ├── store/                 # Stores de estado (payment, tablet)
    ├── types/                 # Tipos y contratos de negocio TypeScript
    ├── impact-calculator/     # Calculadora de impacto publicitario
    ├── permissions/           # Permisos y roles de usuario
    └── logging/               # Logs y observabilidad
└── docs/                      # Documentación Técnica
```

---

## 🚀 Quick Start

### Development

```bash
# 1. Clonar repositorio
git clone https://github.com/tadtaxiadvertising/tad-dooh-platform.git
cd tad-dooh-platform

# 2. Instalar dependencias
npm install

# 3. Configurar entorno
cp .env.example .env.local

# 4. Iniciar servicios
npm run dev

# 5. Acceder
# Admin: http://localhost:3001
# API: http://localhost:3000
```

### Production

🚀 **Guía completa de deployment:** [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

**⚠️ Problema Común en EasyPanel:** 
Si ves `ERROR: failed to read dockerfile`, revisa [DOCKERFILE_ERROR_SOLUTION.md](DOCKERFILE_ERROR_SOLUTION.md).

**Documentación Maestra:** [PLAN_MAESTRO_ESTRATEGICO_TAD_2026.md](docs/PLAN_MAESTRO_ESTRATEGICO_TAD_2026.md)

---

## 🔑 Tecnologías

### Backend

| Tecnología | Versión | Propósito |
| ---------- | ------- | --------- |
| **Node.js** | 20.x | Runtime |
| **NestJS** | 10.x | Framework API |
| **PostgreSQL** | 15.x | Database (Supabase) |
| **Prisma** | 5.x | ORM |

### Frontend

| Tecnología | Versión | Propósito |
| ---------- | ------- | --------- |
| **Next.js** | 15.x | React framework |
| **React** | 19.x | UI library |
| **TailwindCSS** | 4.x | Styling (Utility-First) |

---

## 🔐 Seguridad V12

1. **Kill-Switch de Suscripción:** Bloqueo inmediato de tablets para conductores con facturas vencidas (HTTP 402).
2. **Telemetría Eficiente:** Debounce de 5 min en el tracking GPS para preservar la vida útil de la batería.
3. **Validación Atómica de Wallet:** Transacciones financieras protegidas con locks de base de datos.
4. **Isolación de Roles:** RBAC estricto para Admin, Advertiser y Driver.

---

## 📈 Roadmap 2026

### Q1 2026 - Completado 🚀

- [x] Arquitectura Monorepo.
- [x] Backend API v10.
- [x] Admin Dashboard v5.

### Q2 2026 - Actual (V12) 🎯

- [x] **Financial Ecosystem:** Billetera digital y Payouts.
- [x] **Telemetry V12:** Tracking GPS optimizado.
- [x] **Referral System:** Captación de anunciantes vía QR.
- [ ] CDN Optimizada para videos pesados.

---

## 🤝 Contribuir

1. Fork el repositorio
2. Crea tu feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'feat: Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 Licencia

Propietario - TAD Dominicana, S.R.L.

---

### Propiedad y Autores

- PROPIETARIO: TAD Dominicana, S.R.L.
- WhatsApp: +1 (849) 504-3872
- Website: <https://tad.ibusiness.com.do>

---

**Versión:** 12.1.1 (Ready for Real Tests - Clean State)  
**Última Actualización:** 26 de Abril, 2026 (12:45 PM)  

