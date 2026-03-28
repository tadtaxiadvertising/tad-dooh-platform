# 🛡️ TAD Platform: Manifest de Monitoreo & Salud (Obsidian Sync)

Este documento es la **Fuente Única de Verdad** sobre el estado de salud, monitoreo y analítica de la plataforma TAD. Está diseñado para persistir entre sesiones de agentes (Antigravity) y proporcionar acceso rápido a las consolas de datos.

---

## 🛠️ Herramientas de Monitoreo Configuradas

### 1. 🐞 Sentry (Errores en Tiempo Real)
*   **Propósito**: Captura de bugs en Dashboard y Backend.
*   **Consola**: [sentry.io](https://sentry.io/)
*   **DSN (Dashboard)**: `https://b786a0fa94eec198afb9e35ce84d16ea@o4511114332143616.ingest.us.sentry.io/4511114334633984`
*   **Alertas**: Configurado para enviar correos inmediatos al administrador ante crasheos.

### 2. 📊 Umami (Analítica Web)
*   **Propósito**: Métricas de uso, clics y retención de usuarios.
*   **Consola**: [cloud.umami.is](https://cloud.umami.is/)
*   **Website ID (Dashboard)**: `2a7c0085-87e5-473c-b959-8854ba785e87`
*   **Embed**: Integrado en `admin-dashboard/pages/monitoring/index.tsx` (Requiere Share Link activo).

### 3. ⚡ Supabase (Persistencia & Telemetría)
*   **Propósito**: Base de Datos operacional y almacenamiento de evidencia.
*   **Consola**: [supabase.com](https://supabase.com/dashboard/project/ltdcdhqixvbpdcitthqf)
*   **Storage**: Folder `/campaign-media` para videos de anuncios.

### 4. 🐳 EasyPanel (Infraestructura)
*   **Host DASHBOARD**: [proyecto-ia-tad-dashboard.rewvid.easypanel.host](https://proyecto-ia-tad-dashboard.rewvid.easypanel.host)
*   **Host API**: [tad-api.proyecto_ia.ibusiness.com.do](https://tad-api.proyecto_ia.ibusiness.com.do)
*   **Webhook Deploy**: Configurado para auto-despliegue tras cada `git push`.

---

## 🧬 Guía para Futuros Agentes (TAD AI)

Si estás leyendo esto en una sesión futura para corregir un error:
1.  **Check de Sentry**: Primero revisa la consola de Sentry para ver el stack trace exacto. No intentes adivinar el error.
2.  **Check de Logs**: Usa `npm run dev` para monitorizar logs locales o revisa la consola de EasyPanel para logs de Node.js en producción.
3.  **Check de Red**: El dashboard usa un **Proxy API** interno (`/api/proxy`) para evitar errores CORS en producción. Verifica `admin-dashboard/services/api.ts` si hay fallos de red.
4.  **Check de Datos**: La telemetría llega a `playback_events` y `analytics_events` en Supabase. Si las métricas no aparecen en el Dashboard, verifica que las tablets estén enviando los POST correctamente a `/api/analytics/ingest`.

---

> [!NOTE]
> Este archivo es una **Extensión de la Memoria (Obsidian)** de TAD. Cualquier cambio en DSNs o URLs debe reflejarse aquí de inmediato.
