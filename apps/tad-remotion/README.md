# tad-remotion — Motor Dinámico de Rendereo AI (v1.0.0)

> **Clasificación SRE:** Tier-2 (Generación Creativa On-Demand)
> **Última auditoría:** 2026-04-13
> **Estado:** Fase de Pruebas (BETA)

---

## Resumen Ejecutivo

`tad-remotion` es un microservicio autónomo construido con **Remotion** y **Express** que permite generar anuncios de video (MP4) de manera programática en el backend. 

Este servicio está diseñado para funcionar en contenedores Docker estándar (Debian Bullseye) instalando todas las dependencias necesarias de Chromium en tiempo de ejecución. Está optimizado para entornos de bajo recurso (EasyPanel VPS) limitando la concurrencia y cacheando los bundles de webpack.

Además, cuenta con una integración a la API de **Gemini** (AI Architect) para auto-diseñar estructuras de anuncios basados en un prompt de texto.

---

## Arquitectura de Generación

### Flujo de Trabajo (Endpoint `/api/render`)

1. **Recepción del Payload:** El servidor recibe un `campaignId` y las `props` del componente React (colores, texto, URLs).
2. **Bundle Caching:** Para evitar agotar la RAM del VPS (512MB-1GB), *comprime y cachea* el template de React con Webpack SOLO la primera vez (`cachedBundleUrl`).
3. **Renderizado en Chromium:** Utiliza `@remotion/renderer` para renderizar secuencialmente en formato JPEG (más rápido y menos intensivo que PNG). Configurado a `1500k` bitrate para pantallas DOOH locales.
4. **Respuesta Transaccional:** Transmite el `.mp4` resultante vía HTTP directo al solicitante y elimina el archivo del servidor local para evitar agotar el disco (`/tmp/tad-videos`).
5. **Periodic Cleanup:** Un CRON interno corre cada 30 minutos purjando renders huérfanos con más de 10 minutos de antigüedad.

---

## Puntos de Integración (API)

| Endpoint | Método | Descripción / Uso |
|----------|--------|-------------------|
| `/` | `GET` | **TAD Remotion Control Center.** Interfaz web nativa para pruebas manuales de IA y renderizado sin pasar por el portal de administrador. |
| `/api/render` | `POST` | Genera y retorna el archivo `.mp4`. Requisitos: `{ campaignId: string, props: { logoUrl, bgUrl, brandColor, primaryText, secondaryText } }` |
| `/api/ai-generate` | `POST` | AI Architect. Recibe `{ prompt: string }` y retorna la configuración recomendada de colores/textos generada por Gemini-1.5-Flash. |
| `/health` | `GET` | Probe de OK Liveness. |

---

## Stack Tecnológico y Requerimientos

| Capa | Tecnología | Detalles |
|------|-----------|----------|
| **Framework** | Express + Node.js 20 | Microservicio ligero |
| **Engine Video** | Remotion v4.0.446 | `@remotion/bundler` y `@remotion/renderer` |
| **Generative AI** | `@google/generative-ai` | Integración Gemini 1.5 Flash |
| **Browser Runtime** | Puppeteer Chromium | Múltiples librerías dinámicas (`libxss1`, `libnss3`, etc) requeridas en el Dockerfile (`node:20-bullseye`). |

### Entorno y Variables

* `PORT=8000`
* `REMOTION_CONCURRENCY=1` (Obligatorio en VPS pequeño para evitar colapso de RAM)
* `GEMINI_API_KEY`: Requerida para el endpoint de AI Architect.

---

## Comportamiento Docker & EasyPanel

El **Dockerfile.remotion** utiliza una técnica de "Fallback de Binarios" en la etapa `builder`:
```dockerfile
RUN /app/node_modules/.bin/remotion browser ensure \
    || /app/apps/tad-remotion/node_modules/.bin/remotion browser ensure \
    || node -e "require('@remotion/renderer').ensureBrowser().then(...) "
```
Esto garantiza que la versión aislada de Chromium sea descargada *antes* de transferir los artefactos al runtime de producción. En el `runner`, el directorio `/root/.cache` es copiado para persistir Chromium.
