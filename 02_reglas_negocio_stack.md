# 🔐 02 — REGLAS DE NEGOCIO, STACK TÉCNICO Y CREDENCIALES

> **Propósito**: Referencia rápida de credenciales, URLs, stack y las reglas que el agente debe respetar.
> **Última Actualización**: 2026-03-25T03:40:00-04:00

---

## 🌐 URLS DE PRODUCCIÓN

| Recurso | URL |
| :--- | :--- |
| **Dashboard (Frontend)** | <https://tad-dashboard.vercel.app> |
| **API (Backend)** | <https://tad-api.vercel.app> |
| **Supabase Dashboard** | <https://supabase.com/dashboard/project/ltdcdhqixvbpdcitthqf> |
| **GitHub Repo** | <https://github.com/tadtaxiadvertising/tad-dooh-platform> |
| **Swagger API Docs** | <https://tad-api.vercel.app/docs> (requiere servidor local) |

---

## 🔑 CREDENCIALES

### Login del Dashboard Admin

```text
Email:    admin@tad.do
Password: TadAdmin2026!
```

- Autenticación vía **Supabase Auth** (signInWithPassword).
- El backend valida el JWT de Supabase en cada request (excepto rutas `@Public()`).

### Supabase Project

```text
PROJECT_ID:    ltdcdhqixvbpdcitthqf
Region:        us-west-2 (AWS)
SUPABASE_URL:  https://ltdcdhqixvbpdcitthqf.supabase.co
SUPABASE_KEY:  (ver archivo .env del backend → SUPABASE_KEY)
SERVICE_ROLE:  (ver archivo .env del backend → SUPABASE_SERVICE_ROLE_KEY)
💡 IMPORTANTE: La SERVICE_ROLE key debe ser el JWT del proyecto, NO la sb_secret management key.
```

### Base de Datos PostgreSQL

```text
# Pooled Connection (para app/queries — puerto 6543)
DATABASE_URL=(ver archivo backend/.env → DATABASE_URL)

# Direct Connection (para migraciones/DDL — puerto 5432)
DIRECT_URL=(ver archivo backend/.env → DIRECT_URL)
```

> ⚠️ Las credenciales reales están en `backend/.env`. NO commitear al repo.

---

## 🏗️ STACK TÉCNICO

### Frontend (admin-dashboard)

| Layer | Tecnología | Versión |
| :--- | :--- | :--- |
| Framework | Next.js (Pages Router) | 15.1.7 |
| UI Library | React | 19.0.0 |
| Styling | Tailwind CSS + PostCSS | 4.0.0 |
| Icons | lucide-react | Latest |
| HTTP Client | Axios | Latest |
| Utilities | clsx, date-fns | Latest |
| Deployment | Vercel (Git integration) | Auto-deploy on push to `main` |

### Backend (backend)

| Layer | Tecnología | Versión |
| :--- | :--- | :--- |
| Framework | NestJS | 10.x |
| ORM | Prisma Client | 5.22.0 |
| Auth Guard | Custom `SupabaseAuthGuard` | — |
| File Upload | Direct-to-Supabase Storage (Browser) | — |
| Validation | `class-validator` + `ValidationPipe` | — |
| Rate Limiting | `@nestjs/throttler` (100 req/min) | — |
| CORS | Configured in `main.ts` + `api/index.ts` | — |
| Deployment | Vercel Serverless (`api/index.ts`) | — |

### Infraestructura

| Service | Provider | Propósito |
| :--- | :--- | :--- |
| Database | Supabase PostgreSQL | Persistencia de datos |
| File Storage | Supabase Storage (`campaign-videos`) | Videos de campañas |
| Authentication | Supabase Auth | Login email/password |
| Hosting | Vercel (Hobby plan) | Frontend + Backend serverless |
| Git | GitHub | Control de versiones |

---

## ⚡ REGLA DE ORO

> **CERO COSTOS ADICIONALES**. Todo el stack utiliza tiers gratuitos (Vercel Hobby, Supabase Free). No se deben integrar servicios de pago (AWS S3, SendGrid Pro, etc.) sin autorización explícita del usuario.

---

## 🔧 COMANDOS DE DESARROLLO

```bash
# Instalar dependencias
npm install                              # Raíz (workspaces)

# Backend local
cd backend
npm run start:dev                        # http://localhost:3000

# Dashboard local  
cd admin-dashboard
npm run dev                              # http://localhost:3001

# Prisma
cd backend
npx prisma generate                      # Genera el client
npx prisma db push                       # Sincroniza schema → DB
npx prisma studio                        # GUI para inspeccionar datos

# Deploy (automático on push)
git add . && git commit -m "msg" && git push origin main
```

---

## 🚨 VARIABLES DE ENTORNO EN VERCEL

### Proyecto: tad-api (Backend)

| Variable | Valor |
| :--- | :--- |
| `DATABASE_URL` | (copiar de `backend/.env` → DATABASE_URL) |
| `DIRECT_URL` | (copiar de `backend/.env` → DIRECT_URL) |
| `SUPABASE_URL` | `https://ltdcdhqixvbpdcitthqf.supabase.co` |
| `SUPABASE_KEY` | (copiar de `backend/.env` → SUPABASE_KEY) |
| `SUPABASE_SERVICE_ROLE_KEY` | (copiar de `backend/.env` → SUPABASE_SERVICE_ROLE_KEY) |
| `NODE_ENV` | `production` |

### Proyecto: tad-dashboard (Frontend)

| Variable | Valor |
| :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `https://tad-api.vercel.app/api` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ltdcdhqixvbpdcitthqf.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (copiar de `admin-dashboard/.env.local` → NEXT_PUBLIC_SUPABASE_ANON_KEY) |

> ⚠️ Si `NEXT_PUBLIC_API_URL` no está configurado en Vercel, el frontend usará el fallback hardcodeado en `services/api.ts` → `https://tad-api.vercel.app/api`.

---

## 🛡️ SEGURIDAD — PUNTOS CLAVE

1. **Auth Global**: `SupabaseAuthGuard` (APP_GUARD) protege todas las rutas.
2. **Rutas Públicas**: Decorador `@Public()` en controladores de tablet/player.
3. **CORS**: Whitelist explícita en `main.ts` y `api/index.ts` (solo dominios de Vercel + localhost dev).
4. **Rate Limiting**: 100 requests/min via `@nestjs/throttler`.
5. **Validation**: `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`.
6. **Supabase Storage**: Bucket `campaign-videos` con acceso via Service Role Key.

---

## 📐 CONVENCIONES DE CÓDIGO

- **Idioma de UI**: Español (frontend en español para el mercado dominicano).
- **Idioma de código**: Inglés (variables, funciones, clases).
- **Prisma Maps**: Todos los modelos usan `@@map("snake_case")` para compatibilidad SQL.
- **API Prefix**: Todas las rutas bajo `/api/` (configurado globalmente).
- **Frontend routing**: Next.js Pages Router (NO App Router).
- **Estilos**: Tailwind 4 con color personalizado `tad-yellow` (#fad400).

---

## 📍 REGLAS: SISTEMA DE TRACKING Y GATEWAY

1. **Arquitectura Gateway**: La tablet (offline) vincula al chofer vía QR. El celular del chofer (4G) actúa como puente (Mobile Gateway) enviando datos al servidor.
2. **GPS Batching**: Para optimizar batería y nube, los datos se agrupan:
   - Envío cada **10 coordenadas acumuladas**.
   - Envío forzado cada **60 segundos** (si hay menos de 10 puntos).
3. **Bloqueo RD$6,000**: Si la suscripción anual del dispositivo no está `ACTIVE`/Pagada, el endpoint `/fleet/track-batch` devuelve **402 Payment Required**.
4. **Validación de Identidad**: El chofer debe estar autenticado en la PWA. No se permiten reportes de GPS para un `deviceId` que no tenga asignado en la base de datos.
5. **Cálculo de Comisión**: El pago de RD$500/mes para el chofer se desbloquea tras alcanzar 75% de "Attendance" (días con tracking activo durante horario laboral).
6. **Restricción de Formato (Codecs)**: En el módulo de Multimedia (`/media`), se bloquea cualquier carga que no sea `video/mp4`. Esto garantiza compatibilidad nativa con el motor de renderizado de las tablets STI.
7. **Broadcast de Sincronización**: La consola de administración (`/fleet`) tiene la capacidad de emitir un `WAKE_UP_CALL` vía el canal `fleet_sync` de Supabase Realtime para forzar una actualización inmediata de contenido en toda la flota activa.
8. **Comisiones por Referidos (Advertiser Referral)**: Los conductores (TAD DRIVERS) que refieran marcas o anunciantes a la plataforma reciben una comisión de **RD$ 500.00** mensuales, calculada y liquidada automáticamente por el módulo de Inteligencia Financiera.
9. **Transmisión Dinámica (Selective Targeting)**: Las campañas pueden ser asignadas globalmente, por ciudad o a dispositivos/conductores específicos. El motor de sincronización (`SyncModule`) orquesta los manifiestos JSON individuales para cada tablet basándose en estas reglas de segmentación.
10. **Auditoría de Cumplimiento**: La plataforma genera un reporte de auditoría en tiempo real para cada conductor, desglosando la Comisión Fija (RD$500), Bono por Transmisión (RD$500/ad), Referidos de Socios (RD$500/driver) y Referidos de Anunciantes (RD$500/brand).
