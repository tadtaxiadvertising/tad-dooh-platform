# 🚢 Guía de Despliegue en EasyPanel (Tier Gratuito)

Esta guía detalla los pasos para desplegar y mantener la plataforma TAD DOOH en un VPS propio usando **EasyPanel**.

## 🏗️ Requisitos del Proyecto
EasyPanel gestionará dos servicios principales en un mismo proyecto:
1. **tad-api** (Backend NestJS)
2. **tad-dashboard** (Frontend Next.js)

---

## 🔧 Configuración del API (Backend)

### 1. Aplicación
- **Origen:** GitHub (vinculado a la rama `main`).
- **Dockerfile:** Seleccionar el archivo `backend/Dockerfile`.

### 2. Variables de Entorno (Environment)
| Variable | Descripción |
| :--- | :--- |
| `PORT` | `3000` |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | URL de Supabase (Puerto 6543) |
| `DIRECT_URL` | URL de Supabase (Puerto 5432 - Dejar vacío si no hay migraciones pendientes) |
| `SUPABASE_URL` | URL oficial del proyecto Supabase |
| `SUPABASE_KEY` | ANON KEY |
| `SUPABASE_SERVICE_ROLE_KEY` | SERVICE ROLE KEY (JWT Oficial) |

---

## 🔧 Configuración del Dashboard (Frontend)

### 1. Aplicación
- **Origen:** GitHub (vinculado a la rama `main`).
- **Build Command:** `npm run build`
- **Install Command:** `npm install`
- **Output Directory:** `.next`

### 2. Variables de Entorno (Runtime)
Estas variables son leídas por el **Proxy Interno** en tiempo de ejecución.

| Variable | Descripción |
| :--- | :--- |
| `BACKEND_INTERNAL_URL` | **CRÍTICO:** `http://api:3000` (Nombre del servicio backend en EasyPanel) |
| `NEXT_PUBLIC_API_URL` | URL pública del API (Ej: `https://tu-api.easypanel.host`) |

---

## 🛡️ Hardening y Límites (TAD Security)

Para el tier gratuito en VPS de bajos recursos, aplica estos límites en la pestaña **Resources** de EasyPanel para cada servicio:

- **CPU:** 0.5 cores.
- **Memory:** 512MB (Límite estricto).
- **Reservation:** 256MB.

> [!CAUTION]
> No exceder los 512MB de reserva si el VPS tiene 1GB de RAM total, ya que el sistema operativo y Traefik necesitan espacio para operar.

## 🔄 Solución de Problemas Comunes

### Error 502 / 504 (Gateway Timeout)
- Verifica que el contenedor del API esté corriendo en el puerto 3000.
- Asegúrate de que `BACKEND_INTERNAL_URL` coincida exactamente con el nombre asignado al servicio backend en la interfaz de EasyPanel.

### Error 401 (Unauthorized)
- Verifica que la `SUPABASE_SERVICE_ROLE_KEY` en el backend sea el JWT correcto y no la API Key de administración.
- El proxy debe reenviar el Header `Authorization: Bearer <token>`.

### Inyectar Cambios
Todo cambio subido a la rama `main` disparará un auto-deploy. Si el API no refleja los cambios, usa el botón **Force Redeploy** en EasyPanel para purgar la caché de Docker.
