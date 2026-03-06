# 🚀 TAD DOOH Platform - Guía de Deploy

**Deploy gratuito en Vercel + Configuración de Fully Kiosk**

---

## 📋 Resumen

| Componente | Estado | URL |
|------------|--------|-----|
| **GitHub Repo** | ✅ Creado | https://github.com/tadtaxiadvertising/tad-dooh-platform |
| **Tablet Player** | ⏳ Pendiente deploy | https://tad-tablet-player.vercel.app |
| **Backend API** | ⏳ Pendiente | https://tad-dooh-api.vercel.app |
| **Dashboard** | ⏳ Futuro | https://tad-dashboard.vercel.app |

---

## 🎯 PASO 1: Deploy del Tablet Player (5 minutos)

### Opción A: Vercel Dashboard (Recomendado)

1. **Ve a** https://vercel.com/new
2. **Import Git Repository**
3. **Busca:** `tad-dooh-platform`
4. **Click:** Import
5. **Configure Project:**
   - **Framework Preset:** Other
   - **Root Directory:** `tablet-player`
   - **Build Command:** `echo "No build required"`
   - **Output Directory:** `.`
6. **Click:** Deploy

**URL resultante:** `https://tad-dooh-platform-xxxx.vercel.app`

### Opción B: Vercel CLI

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
cd "/root/.openclaw/workspace/TAD DOOH Platform"
vercel --prod

# URL aparecerá en la consola
```

---

## 🎯 PASO 2: Configurar Fully Kiosk Browser

### 1. Instalar en Tablet Android

**Descarga:** https://www.fully-kiosk.de/#download

**Costo:** ~$8 USD (licencia única por dispositivo)

### 2. Configuración Básica

```
Settings → Web Content:
├─ Start URL: https://tad-dooh-platform-xxxx.vercel.app
├─ Load URL on App Start: ON
├─ Enable JavaScript: ON
└─ Zoom: 100%

Settings → Kiosk Mode:
├─ Start on Boot: ON
├─ Keep Screen On: ON
├─ Disable Status Bar: ON
├─ Disable Navigation: ON
└─ Prevent from Exiting: ON

Settings → Screen:
├─ Screen Timeout: Never
└─ Brightness: 80-100%

Settings → Remote Administration:
├─ Enable Remote Administration: ON
└─ Password: [tu-password-seguro]
```

### 3. Testear

1. Abre Fully Kiosk
2. Debería cargar la URL automáticamente
3. Verifica que el video de placeholder se reproduzca
4. Presiona F12 (en desktop) para ver device ID

---

## 🎯 PASO 3: Configurar Backend API

### Opción A: Vercel Serverless Functions

1. **Crea archivo:** `backend/api/index.js`
2. **Configura:** Variables de entorno en Vercel
3. **Deploy:** Automático con el repo

### Opción B: DigitalOcean Droplet (Recomendado para producción)

```bash
# 1. Crear droplet en DigitalOcean
#    - Size: $6/mes (1GB RAM)
#    - Image: Ubuntu 22.04

# 2. Conectar por SSH
ssh root@<droplet-ip>

# 3. Instalar Docker
curl -fsSL https://get.docker.com | sh

# 4. Clonar repo
git clone https://github.com/tadtaxiadvertising/tad-dooh-platform.git
cd tad-dooh-platform/backend

# 5. Configurar .env
cp .env.example .env
nano .env

# 6. Deploy
docker-compose up -d
```

**URL resultante:** `http://<droplet-ip>:3000`

---

## 🎯 PASO 4: Conectar Player al Backend

### Editar Configuración

En `tablet-player/index.html`, línea ~280:

```javascript
const CONFIG = {
    SERVER_URL: 'https://tad-dooh-api.vercel.app', // ← Tu URL
    // ...
};
```

### Commit y Push

```bash
git add tablet-player/index.html
git commit -m "🔧 Config: actualizar SERVER_URL"
git push
```

Vercel redeployará automáticamente en ~30 segundos.

---

## 🎯 PASO 5: Registrar Dispositivos

### Obtener Device ID

1. Abre el player en la tablet
2. El device ID aparece en la esquina superior derecha
3. O abre debug panel para verlo

**Formato:** `taxi-xxxxxxxxx`

### Registrar en Backend

```bash
curl -X POST https://tad-dooh-api.vercel.app/api/devices \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "taxi-xxxxxxxxx",
    "name": "Taxi Santiago 1",
    "city": "Santiago",
    "taxiNumber": "001"
  }'
```

---

## 📊 Monitoreo

### Ver Logs en Vercel

1. Ve a https://vercel.com
2. Selecciona tu proyecto
3. Click en "Logs"

### Ver Dispositivos

```bash
curl https://tad-dooh-api.vercel.app/api/devices \
  -H "Authorization: Bearer <tu-token>"
```

---

## 🔐 Variables de Entorno (Backend)

Configura en Vercel → Settings → Environment Variables:

| Variable | Valor |
|----------|-------|
| `DATABASE_URL` | `postgresql://...` |
| `JWT_SECRET` | `tu-secret-key` |
| `STORAGE_KEY` | `tu-s3-key` |
| `STORAGE_SECRET` | `tu-s3-secret` |

---

## 📱 Testing en Tablet

### Checklist

- [ ] Fully Kiosk instalado
- [ ] Start URL configurada
- [ ] Kiosk mode activado
- [ ] Video se reproduce
- [ ] Device ID visible
- [ ] Sync funciona (ver logs)
- [ ] Analytics se registran

### Debugging

**Desde computadora:**

1. Abre Chrome
2. Ve a `chrome://inspect/#devices`
3. Conecta tablet por USB
4. Click "Inspect" en la tablet
5. Ver console logs

**Comandos útiles:**

```javascript
// Forzar sync
await sync.performSync()

// Ver estado
player.updateDebugInfo()

// Reiniciar
player.restart()
```

---

## 🚨 Troubleshooting

### Problema: Vercel deploy falla

**Solución:**
1. Verifica que `vercel.json` esté en el repo
2. Revisa logs en Vercel dashboard
3. Intenta deploy local: `vercel --dev`

### Problema: Fully Kiosk no carga

**Solución:**
1. Verifica URL correcta (https://)
2. Chequea conexión a internet
3. Reinstala Fully Kiosk

### Problema: Video no se reproduce

**Solución:**
1. Verifica formato de video (MP4 H.264)
2. Prueba con video de prueba pequeño
3. Revisa console logs

---

## 📈 Próximos Pasos

1. ✅ Deploy del tablet player
2. ⏳ Configurar Fully Kiosk en 1 tablet de prueba
3. ⏳ Deploy del backend API
4. ⏳ Crear dashboard admin
5. ⏳ Subir primera campaña de prueba
6. ⏳ Testear sync diario
7. ⏳ Rollout a más tablets

---

## 📞 Soporte

**Documentación:** `docs/ARQUITECTURA-COMPLETA.md`

**GitHub:** https://github.com/tadtaxiadvertising/tad-dooh-platform

**Contacto:** tad.taxiadvertising@gmail.com

---

**Creado:** 6 de Marzo, 2026  
**Versión:** 0.1.0
