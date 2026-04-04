# 🚀 TAD DOOH Platform - Guía de Deploy (v6.7.0)

## VPS Deploy vía EasyPanel + Tablets Santiago Pilot

---

## 📋 Resumen de Infraestructura

| Componente | Plataforma | URL de Producción |
| :--- | :--- | :--- |
| **Dashboard Admin** | EasyPanel (Docker) | <https://proyecto-ia-tad-dashboard.rewvid.easypanel.host> |
| **API Backend** | EasyPanel (Docker) | <https://proyecto-ia-tad-api.rewvid.easypanel.host/api/v1> |
| **Database** | Supabase | <https://ltdcdhqixvbpdcitthqf.supabase.co> |
| **PWA Portals** | Static Hosting | Hosteado en bucket de Supabase / EasyPanel |

---

## 🎯 PASO 1: Preparación del Servidor (VPS)

1. **Instalar EasyPanel** en un VPS limpio (Ubuntu 22.04+, 1GB RAM min):

   ```bash
   curl -sSL https://get.easypanel.io | sh
   ```

2. **Configurar el proyecto** TAD en el dashboard de EasyPanel.
3. **Mapear dominios** y configurar certificados SSL automáticos.

## 🎯 PASO 2: Deploy del Backend (NestJS)

1. **Crear Service** tipo "App" en EasyPanel.
2. **Source:** Vincular con el repo de GitHub (rama `main`).
3. **Build Pack:** Dockerfile (ubicado en `backend/Dockerfile`).
4. **Environment Variables:** Copiar desde `backend/.env` (DATABASE_URL, SUPABASE_KEY, etc.).
5. **Resource Limits:** Configurar `850MB` de RAM para el proceso Node.

## 🎯 PASO 3: Deploy del Dashboard (Next.js)

1. **Crear Service** tipo "App".
2. **Build Pack:** Dockerfile (ubicado en `admin-dashboard/Dockerfile`).
3. **Configuración Vercel (Opcional):** El Dashboard también puede ser desplegado en Vercel si se prefiere offload de tráfico.

## 🎯 PASO 4: Configurar Dispositivos (Santiago Pilot STI)

1. **Fully Kiosk Config:** Apuntar la Start URL al PWA de la tablet.
2. **Sincronización Inicial:** Ejecutar un `FORCE_SYNC` desde el panel administrativo para descargar el primer paquete de medios.
3. **Validación de Pago:** Asegurar que el Driver tenga el estatus `ACTIVE` en DB para que el `SubscriptionGuard` permita el paso de tráfico.

---

## 📱 Testing & Troubleshooting

### Checklist de Salud

- [x] Backend responde en `/api/v1/health`
- [x] Dashboard carga y permite login con `admin@tad.do`
- [x] Tablets devuelven `200 OK` en el heartbeat

### Solución de Errores Comunes (SRE)

- **401 Unauthorized en API**: Revisar `SUPABASE_SERVICE_ROLE_KEY` (debe ser el JWT, no el management secret).
- **OOM (Out of Memory)**: Aumentar el límite de RAM en EasyPanel o configurar `max-old-space-size=850`.
- **404 en Analytics**: Verificar que la URL del player tenga el prefijo `/api/v1`.

---

**Última Actualización:** 04 de Abril, 2026
**Versión:** 6.7.0 (Stable Pilot Phase)
