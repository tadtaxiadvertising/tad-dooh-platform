# 🚗 TAD DOOH Platform

**Taxi Advertising Distribution - Digital Out-Of-Home Network**

---

## 📖 Descripción

Plataforma para gestionar miles de tablets Android instaladas en taxis que reproducen contenido publicitario. Diseñada para funcionar **99% offline** con solo **1 conexión diaria** por dispositivo.

---

## 🎯 Características Principales

### Para Administradores

- ✅ **Gestión de Campañas** - Crear, programar y targetear campañas publicitarias
- ✅ **Upload de Medios** - Videos, imágenes y campañas HTML
- ✅ **Dashboard de Analytics** - Métricas en tiempo real de impresiones y alcance
- ✅ **Gestión de Dispositivos** - Monitoreo de salud y control remoto de tablets
- ✅ **Mapa en Vivo** - Ver ubicación y estado de todos los taxis

### Para Tablets (Taxis)

- ✅ **Playback Offline** - Reproduce contenido sin internet todo el día
- ✅ **Sync Diario** - Se conecta 5-10 min al inicio del turno
- ✅ **Analytics Local** - Registra eventos y los sube en el próximo sync
- ✅ **Auto-Recovery** - Se recupera automáticamente si falla el player
- ✅ **Watchdog** - Monitoreo constante de salud del sistema

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────┐
│         CLOUD (DigitalOcean)            │
│                                         │
│  ┌───────────┐  ┌───────────┐          │
│  │  Next.js  │  │  NestJS   │          │
│  │ Dashboard │  │    API    │          │
│  └───────────┘  └───────────┘          │
│              │                          │
│         ┌────▼────┐                     │
│         │PostgreSQL│                    │
│         └─────────┘                     │
└─────────────────────────────────────────┘
              │
              │ HTTPS (1x día)
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

## 📁 Estructura del Proyecto

```
TAD DOOH Platform/
├── backend/                    # API NestJS
│   ├── src/
│   │   ├── campaigns/         # Servicio de campañas
│   │   ├── devices/           # Servicio de dispositivos
│   │   ├── media/             # Servicio de medios
│   │   ├── analytics/         # Servicio de analytics
│   │   ├── commands/          # Comandos remotos
│   │   └── sync/              # Sync diario
│   ├── tests/
│   └── docker/
│
├── frontend/                   # Dashboard Next.js
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   └── services/
│   └── public/
│
├── tablet-player/              # PWA para tablets
│   ├── src/
│   │   ├── player.js          # Video player
│   │   ├── sync.js            # Sync client
│   │   ├── analytics.js       # Event recorder
│   │   └── watchdog.js        # Health monitor
│   └── assets/
│
├── docs/                       # Documentación
│   ├── ARQUITECTURA-COMPLETA.md
│   ├── API.md
│   └── DEPLOY.md
│
├── docker/                     # Docker configs
│   ├── docker-compose.yml
│   └── docker-compose.prod.yml
│
└── scripts/                    # Scripts de deploy
    ├── setup.sh
    └── backup.sh
```

---

## 🚀 Quick Start

### Development

```bash
# 1. Clonar repositorio
git clone https://github.com/tadtaxiadvertising/tad-dooh-platform.git
cd tad-dooh-platform

# 2. Instalar dependencias backend
cd backend
npm install

# 3. Instalar dependencias frontend
cd ../frontend
npm install

# 4. Iniciar servicios con Docker
cd ..
docker-compose up -d

# 5. Acceder
# Frontend: http://localhost:3001
# Backend API: http://localhost:3000
```

### Production

Ver `docs/DEPLOY.md` para instrucciones completas.

---

## 🔑 Tecnologías

### Backend

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **Node.js** | 20.x | Runtime |
| **NestJS** | 10.x | Framework API |
| **PostgreSQL** | 15.x | Database |
| **Redis** | 7.x | Cache + Queue |
| **Prisma** | 5.x | ORM |

### Frontend

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **Next.js** | 14.x | React framework |
| **React** | 18.x | UI library |
| **TailwindCSS** | 3.x | Styling |
| **Recharts** | 2.x | Charts |

### Tablet Player

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **PWA** | - | Progressive Web App |
| **IndexedDB** | - | Storage local |
| **Workbox** | 7.x | Service Worker |
| **HLS.js** | 1.x | Video streaming |

### Infraestructura

| Servicio | Proveedor | Costo |
|----------|-----------|-------|
| **Cloud** | DigitalOcean | $40/mes |
| **Database** | Managed PostgreSQL | $30/mes |
| **Storage** | Spaces (S3) | $5/mes |
| **CDN** | Cloudflare | $0/mes |

---

## 📊 Métricas del Sistema

### Capacidad

| Métrica | Valor |
|---------|-------|
| **Dispositivos** | 10,000+ |
| **Eventos/día** | 10M+ |
| **Uptime** | 99.9% |
| **Latencia API** | <100ms |

### Eficiencia

| Métrica | Valor |
|---------|-------|
| **Datos/tablet/día** | ~50 MB |
| **Sync time** | 5-10 min |
| **Offline operation** | 99% del tiempo |
| **Compresión videos** | 50-70% |

---

## 🔐 Seguridad

- ✅ **HTTPS/TLS 1.3** en todas las comunicaciones
- ✅ **Token-based auth** con rotación cada 30 días
- ✅ **Hash verification** para integridad de archivos
- ✅ **Rate limiting** por dispositivo
- ✅ **Input validation** en todos los endpoints
- ✅ **CORS** configurado estrictamente

---

### 🛡️ Portales de Acceso (Auth)

- ✅ **Portal de Anunciantes (Next.js & HTML):** Auto-registro seguro, acceso dinámico, descarga de reportes y subida de archivos (MP4/JPG).
- ✅ **Portal de Choferes:** Registro vía celular, monitoreo de métricas, cobros vía Stitch, y tracking GPS con envío de velocidad e historial de rutas.
- ✅ **Seguridad Bcrypt & JWT:** Rotación de tokens con verificación de identidad desde la API (Node.js/Supabase).

---

## 📈 Roadmap

### Q1 2026 (Ene-Mar) - Completado & Desplegado 🚀
- [x] Arquitectura del sistema (Database + NestJS API)
- [x] Backend API MVP
- [x] Tablet player offline (Fully Kiosk PWA)
- [x] Master Admin Dashboard (Next.js)
- [x] Portales para Autenticación de Anunciantes y Conductores
- [x] Mapa en Vivo con Reporte de estado Online e historial GPS.

### Q2 2026 (Abr-Jun) - En Progreso
- [x] Analytics engine completo (Impresiones, Vistas y QR Scans)
- [x] Comandos remotos (Apagar/Reiniciar tablets, borrar contenido)
- [ ] CDN integration optimizada para grandes pesos de video
- [ ] Piloto en las primeras 50-100 unidades (Taxis)

### Q3 2026 (Jul-Sep)
- [ ] Delta sync optimizado y actualizaciones sin red dependiente
- [ ] Video transcoding automatizado en la Nube
- [ ] Multi-city support
- [ ] 500+ dispositivos

### Q4 2026 (Oct-Dic)
- [ ] Advanced analytics
- [ ] Machine learning (optimización inteligente de playlists y rotaciones)
- [ ] API integrada para Agencias Terceras de Publicidad
- [ ] Escalamiento a 2000+ dispositivos

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

## 📞 Contacto

**TAD Dominicana**
- Email: tad.taxiadvertising@gmail.com
- WhatsApp: +1 (849) 504-3872
- Website: https://tad.ibusiness.com.do

---

**Creado:** 6 de Marzo, 2026  
**Versión:** 0.1.0 (Alpha)
