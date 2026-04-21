# tad-player — Motor de Reproducción Offline (v1.0.0)

> **Clasificación SRE:** Tier-0 (Core de Entrega de Contenido)
> **Última auditoría:** 2026-04-13
> **Mantenedor:** Equipo TAD Dominicana

---

## Resumen Ejecutivo

`tad-player` es el punto final de la plataforma TAD: la aplicación que corre en las tablets de los taxis para mostrar anuncios. Está diseñado bajo una arquitectura **Strictly Offline-First**, garantizando que los conductores no consuman datos móviles repetitivos y que el contenido nunca se detenga en zonas sin cobertura.

El servicio es una SPA (Single Page Application) estática compilada con **Vite**, servida por **Nginx** dentro de un contenedor Docker ligero.

---

## Arquitectura de Resiliencia

### 1. Sistema de Caché Inteligente (`VideoCache`)

En lugar de depender de la red, el reproductor utiliza la **Cache API** del navegador (Persistente) para almacenar blobs de video de más de 50MB.
- **Pre-fetching:** Al detectar una nueva campaña, descarga todos los activos *antes* de iniciar la rotación.
- **Integridad:** Verifica `hasMissingAssets` en cada arranque para reconstruir la caché si el navegador purga archivos.
- **Fallback URL:** Si un activo falla, tiene un pool interno de videos genéricos (`TAD_GENERIC_LOOP`) para no mostrar una pantalla en negro.

### 2. Proof-of-Play (PoP) & Event Queue

Cada vez que un anuncio termina, se registra un evento de reproducción.
- **Offline Buffer:** Si no hay internet, el evento se guarda en `localStorage` (via `EventQueue`).
- **Auto-Flush:** Al detectar el evento `window.ononline`, el reproductor vacía la cola de eventos hacia el backend (`POST /api/device/playback`).

### 3. Watchdog & Auto-Recuperación

Cuenta con un monitor interno de 120 segundos. Si el video no emite un evento de "playing" en ese tiempo (ej. video colgado o decodificación fallida), el Watchdog fuerza el salto al siguiente anuncio o al loop de fallback.

---

## Flujo de Pantalla (Intermission Logic)

El reproductor alterna entre anuncios y una pantalla de "Intermisión":
1. **Anuncio (10s-30s):** Reproducción de video MP4.
2. **Intermisión (5s):**
   - Muestra el nombre del anunciante.
   - Genera un **QR Dinámico** al vuelo usando `qrcode.react`.
   - El QR redirige al **Hub del Anunciante** (`/p?ref=ID`) para que el pasajero escanee y vea ofertas.
   - Barra de progreso visual (Timer Bar) de 5 segundos.

---

## Puntos de Monitoreo (Heartbeat)

Cada 5 minutos, el reproductor emite un pulso de salud al backend con:
- **Identidad:** `deviceId` (persistido en `localStorage`).
- **Batería:** Capacidad actual de la tablet (%) vía `navigator.getBattery()`.
- **Almacenamiento:** Espacio libre en el disco de la tablet (GB) vía `navigator.storage.estimate()`.
- **Status:** Estado actual del motor (`playing`, `error`, `stopped`).
- **GPS:** Última coordenada conocida capturada en el momento del pulso.

---

## Variables de Entorno (ARGs / Environment)

Al ser una app Vite, las variables deben prefijarse con `VITE_`.

| Variable | Descripción |
|----------|-------------|
| `VITE_API_URL` | URL del backend TAD API. |
| `VITE_DASHBOARD_URL` | URL del portal (usada para generar los links de los QR). |

---

## Despliegue

### Dockerización

El `Dockerfile.player` es multi-stage:
1. **Build:** Node:20-alpine corre `npm run build`.
2. **Servidor:** Nginx:alpine sirve la carpeta `/dist`.
   - Configurado con una regla `try_files` para soportar ruteo de SPA.

```bash
# Comandos útiles
npm run dev      # Desarrollo local
npm run build    # Genera carpeta /dist
```

### Identidad del Dispositivo

El reproductor busca su ID en este orden:
1. Parámetro URL: `?deviceId=TAX_001`
2. `localStorage`: `tad_device_id`
3. Generación aleatoria: `taxi-xxxxxx` (y se persiste automáticamente).

---

## Componentes Técnicos Clave

| Módulo | Archivo | Responsabilidad |
|--------|---------|-----------------|
| **VideoEngine** | `player/video-engine.ts` | Control del DOM `<video>`, manejo de errores y transiciones. |
| **Scheduler** | `scheduler/daily-sync.ts` | Orquestación de sincronización diaria y latidos (heartbeats). |
| **VideoCache** | `storage/video-cache.ts` | Gestión de la Cache API y descarga de activos pesados. |
| **EventQueue** | `storage/event-queue.ts` | Persistencia local de eventos de reproducción offline. |
| **Sync API** | `api/sync.ts` | Comunicación con `GET /api/device/sync`. |
