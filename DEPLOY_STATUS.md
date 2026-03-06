# 🚀 TAD DOOH Platform - Estado del Deploy

**Última actualización:** 6 de Marzo, 2026 (15:53 UTC)

---

## ✅ COMPLETADO

### 1. Tablet Player PWA

| Item | Estado | URL |
|------|--------|-----|
| **Código** | ✅ Creado | `/tablet-player/index.html` |
| **GitHub** | ✅ Commiteado | https://github.com/tadtaxiadvertising/tad-dooh-platform |
| **Vercel Deploy** | ✅ **EN LÍNEA** | https://tad-tablet-player.vercel.app |
| **Documentación** | ✅ Creada | `docs/FULLY-KIOSK-CONFIG.md` |

**Features:**
- ✅ Offline-first (IndexedDB)
- ✅ Sync diario automático
- ✅ Analytics local con batch upload
- ✅ Watchdog auto-recovery
- ✅ Fully Kiosk compatible
- ✅ Security headers (CSP, X-Frame-Options)

---

## ⏳ PENDIENTE

### 2. Backend API

| Item | Estado | Notas |
|------|--------|-------|
| **Schema Prisma** | ✅ Creado | `backend/prisma/schema.prisma` |
| **NestJS Setup** | ✅ Creado | `backend/src/` |
| **Vercel Deploy** | ⏳ Pendiente | Requiere database |
| **Database** | ⏳ Pendiente | PostgreSQL necesario |

**Próximos pasos:**
1. Configurar PostgreSQL (DigitalOcean o Vercel Postgres)
2. Deploy de funciones serverless
3. Configurar variables de entorno

---

### 3. Fully Kiosk Configuration

| Item | Estado | Notas |
|------|--------|-------|
| **Instalar app** | ⏳ Pendiente | Mendy debe instalar |
| **Configurar URL** | ⏳ Pendiente | https://tad-tablet-player.vercel.app |
| **Activar kiosk** | ⏳ Pendiente | Settings → Kiosk Mode |
| **Testear** | ⏳ Pendiente | Verificar playback |

---

## 📊 RESUMEN DE PROGRESO

```
Proyecto Completo: 40%
├── Tablet Player      ████████████░░░░░░░░ 60%
├── Backend API        ████░░░░░░░░░░░░░░░░ 20%
├── Fully Kiosk        ░░░░░░░░░░░░░░░░░░░░  0%
└── Dashboard Admin    ░░░░░░░░░░░░░░░░░░░░  0%
```

---

## 🎯 PRÓXIMOS PASOS INMEDIATOS

### Para Mendy (Hoy - 30 min):

1. **Instalar Fully Kiosk** en tablet Android
   - Download: https://www.fully-kiosk.de/
   - Costo: ~$8 USD

2. **Configurar URL**
   - Start URL: https://tad-tablet-player.vercel.app

3. **Activar Kiosk Mode**
   - Settings → Kiosk Mode → Start on Boot: ON

4. **Testear**
   - Reiniciar tablet
   - Verificar que cargue el player
   - Anotar device ID

### Para Desarrollo (Esta semana):

1. **Deploy Backend API**
   - Configurar PostgreSQL
   - Deploy en Vercel/DigitalOcean
   - Testear endpoints

2. **Subir Video de Prueba**
   - Crear campaña test
   - Subir video a S3/Spaces
   - Asignar a dispositivo

3. **Testear Sync**
   - Verificar descarga de campañas
   - Verificar upload de analytics

---

## 🔗 URLs IMPORTANTES

| Servicio | URL |
|----------|-----|
| **Tablet Player** | https://tad-tablet-player.vercel.app |
| **GitHub Repo** | https://github.com/tadtaxiadvertising/tad-dooh-platform |
| **Vercel Dashboard** | https://vercel.com/tadtaxiadvertisings-projects/tad-tablet-player |
| **Fully Kiosk** | https://www.fully-kiosk.de/ |
| **Documentación** | `docs/` en GitHub |

---

## 📞 CONTACTO

**Soporte:** tad.taxiadvertising@gmail.com

**Documentación:** Ver carpeta `docs/` en GitHub

---

**Estado:** 🟡 **En Progreso** (Tablet Player ✅ EN LÍNEA)
