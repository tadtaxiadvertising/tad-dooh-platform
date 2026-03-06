# 📱 TAD Tablet Player

**Progressive Web App para reproducción offline de contenido publicitario en taxis**

---

## 🎯 Descripción

Reproductor de video offline-first diseñado para tablets Android en taxis. Funciona **99% del tiempo sin internet** y se sincroniza una vez al día.

---

## ✨ Características

- ✅ **Offline-first** - Todo el contenido se almacena localmente
- ✅ **Sync diario** - 5-10 minutos de conexión al inicio del turno
- ✅ **Analytics local** - Registra eventos y los sube en batch
- ✅ **Watchdog** - Monitoreo automático de salud
- ✅ **Fully Kiosk compatible** - Funciona con Fully Kiosk Browser
- ✅ **Auto-recovery** - Se recupera si falla el playback
- ✅ **Comandos remotos** - Restart, sync, clear cache desde el servidor

---

## 🚀 Quick Start

### Opción 1: Vercel Deploy (Recomendado)

```bash
# El player ya está configurado para deploy automático
# Solo necesitas hacer push a GitHub
```

1. Haz fork/clona este repo
2. Push a GitHub
3. Conecta Vercel al repo
4. Deploy automático en segundos

**URL resultante:** `https://tad-tablet-player.vercel.app`

### Opción 2: Local Testing

```bash
# Usar Python HTTP server
cd tablet-player
python -m http.server 8080

# Abrir en browser
http://localhost:8080
```

### Opción 3: Fully Kiosk Browser

1. Instala **Fully Kiosk Browser** en tu tablet Android
2. Abre Fully Kiosk → Settings → Web Content
3. URL: `https://tad-tablet-player.vercel.app`
4. Enable: "Start on Boot", "Keep Screen On"
5. Kiosk mode activado

---

## 📱 Configuración en Fully Kiosk

### Paso 1: Instalar Fully Kiosk

**Descarga:** https://www.fully-kiosk.de/

**Costo:** ~$8 USD por licencia (una vez)

### Paso 2: Configurar

```
Settings → Web Content:
├─ Start URL: https://tad-tablet-player.vercel.app
├─ Load URL on App Start: ON
└─ Enable JavaScript: ON

Settings → Kiosk Mode:
├─ Start on Boot: ON
├─ Keep Screen On: ON
├─ Disable Status Bar: ON
└─ Disable Navigation: ON

Settings → Remote Administration:
├─ Enable Remote Administration: ON
└─ Password: [tu-password]
```

### Paso 3: Integración con TAD API

Fully Kiosk tiene API HTTP local en `http://localhost:2323`

**Comandos disponibles:**

```bash
# Reboot device
curl http://localhost:2323/reboot -d password=TU_PASSWORD

# Load URL
curl http://localhost:2323/loadURL -d password=TU_PASSWORD -d url="https://..."

# Screenshot
curl http://localhost:2323/screenshot -d password=TU_PASSWORD
```

---

## 🔧 Configuración del Player

### Variables de Entorno (en el código)

```javascript
const CONFIG = {
    // URL del servidor TAD
    SERVER_URL: 'https://tad-dooh-platform.vercel.app',
    
    // Sync settings
    SYNC_INTERVAL: 24 * 60 * 60 * 1000, // 24 horas
    SYNC_WINDOW: 10 * 60 * 1000, // 10 minutos
    
    // Analytics
    ANALYTICS_BATCH_SIZE: 100,
    HEARTBEAT_INTERVAL: 5 * 60 * 1000 // 5 minutos
};
```

### Cambiar Server URL

Edita `tablet-player/index.html` línea ~280:

```javascript
SERVER_URL: 'https://TU-SERVIDOR.com',
```

---

## 📊 Eventos Trackeados

| Evento | Cuándo se dispara |
|--------|-------------------|
| `video_started` | Cuando inicia un video |
| `video_completed` | Cuando termina un video |
| `video_error` | Cuando falla la reproducción |
| `device_heartbeat` | Cada 5 minutos |
| `sync_completed` | Después de sync diario |

---

## 🗄️ Almacenamiento Local

### IndexedDB

- **campaigns**: Videos y metadatos de campañas
- **events**: Eventos de analytics pendientes de upload

### LocalStorage

- `tad_device_id`: ID único del dispositivo
- `tad_auth_token`: Token de autenticación
- `tad_last_sync`: Timestamp del último sync

---

## 🔄 Flujo de Sync Diario

```
┌─────────────────────────────────────────┐
│  1. Driver enciende tablet              │
│  2. Tablet conecta a WiFi/móvil         │
│  3. POST /api/sync/init                 │
│  4. Descarga campañas nuevas            │
│  5. Sube analytics pendientes           │
│  6. Ejecuta comandos remotos            │
│  7. Tablet vuelve a offline             │
│  8. Reproduce contenido todo el día     │
└─────────────────────────────────────────┘
```

**Duración estimada:** 5-10 minutos  
**Datos consumidos:** ~50 MB

---

## 🐛 Debugging

### Debug Panel

Presiona el botón **Debug** en el footer (visible si habilitas header/footer) o edita:

```javascript
// En index.html, busca esta línea:
<header id="header" class="hidden ...">
<!-- Cambia "hidden" por "" -->
<header id="header" class="...">
```

### Console Logs

Abre Chrome DevTools en tu computadora:

1. Chrome → `chrome://inspect/#devices`
2. Conecta tu tablet por USB
3. Click "Inspect" en la tablet
4. Ver console logs

### Comandos desde Console

```javascript
// Forzar sync
await sync.performSync()

// Reiniciar player
player.restart()

// Subir analytics
await analytics.uploadAll()

// Ver estado
player.updateDebugInfo()

// Limpiar cache
await sync.clearCache()
```

---

## 🔌 API del Servidor

### Endpoints Requeridos

| Endpoint | Método | Propósito |
|----------|--------|-----------|
| `/api/sync/init` | POST | Iniciar sync diario |
| `/api/analytics/batch` | POST | Upload de eventos |
| `/api/devices/:id/heartbeat` | POST | Heartbeat |

### Ejemplo: Sync Init

**Request:**
```json
POST /api/sync/init
{
  "deviceId": "taxi-001",
  "lastSync": "2026-03-05T22:00:00Z"
}
```

**Response:**
```json
{
  "campaigns": [
    {
      "id": "camp-123",
      "name": "Promo Marzo",
      "playlist": [
        { "id": "video-1", "url": "https://..." },
        { "id": "video-2", "url": "https://..." }
      ]
    }
  ],
  "commands": []
}
```

---

## 📈 Métricas de Rendimiento

| Métrica | Objetivo |
|---------|----------|
| **Startup time** | < 3 segundos |
| **Video load time** | < 2 segundos |
| **Sync duration** | 5-10 minutos |
| **Data usage** | < 50 MB/día |
| **Battery impact** | < 10%/hora |

---

## 🔐 Seguridad

- ✅ **HTTPS obligatorio** en producción
- ✅ **Token-based auth** para cada dispositivo
- ✅ **CSP headers** para prevenir XSS
- ✅ **Input sanitization** en todos los datos
- ✅ **Hash verification** para integridad de videos

---

## 🚨 Troubleshooting

### Problema: Video no carga

**Solución:**
1. Verifica conexión a internet
2. Fuerza sync: `await sync.performSync()`
3. Limpia cache: `await sync.clearCache()`

### Problema: Sync falla

**Solución:**
1. Verifica SERVER_URL correcto
2. Verifica token de autenticación
3. Revisa logs del servidor

### Problema: Pantalla se apaga

**Solución:**
1. En Fully Kiosk: Settings → Screen → Keep Screen On: ON
2. Verifica que el tablet esté conectado a corriente

### Problema: Analytics no se suben

**Solución:**
1. Verifica conexión a internet
2. Revisa tamaño del batch: `CONFIG.ANALYTICS_BATCH_SIZE`
3. Verifica endpoint del servidor

---

## 📦 Build & Deploy

### No requiere build!

Este player usa **React + Tailwind vía CDN**, no hay proceso de build.

**Ventajas:**
- ✅ Deploy instantáneo
- ✅ 0 dependencias npm
- ✅ Actualizaciones automáticas
- ✅ Fácil debugging

### Deploy en Vercel

1. Crea repo en GitHub
2. Push del código
3. Ve a https://vercel.com/new
4. Importa tu repo
5. Deploy automático

**URL:** `https://tu-repo.vercel.app`

---

## 📞 Soporte

**Documentación completa:** `../docs/ARQUITECTURA-COMPLETA.md`

**Issues:** Reportar en GitHub

**Contacto:** tad.taxiadvertising@gmail.com

---

**Creado:** 6 de Marzo, 2026  
**Versión:** 0.1.0  
**Licencia:** Propietario - TAD Dominicana
