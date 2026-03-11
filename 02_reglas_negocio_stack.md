# 🔐 02 — REGLAS DE NEGOCIO, STACK TÉCNICO Y CREDENCIALES

> **Propósito**: Referencia rápida de credenciales, URLs, stack y las reglas que el agente debe respetar.
> **Última Actualización**: 2026-03-10T23:40:00-04:00

---

## 🌐 URLS DE PRODUCCIÓN

| Recurso | URL |
|---|---|
| **Dashboard (Frontend)** | https://tad-dashboard.vercel.app |
| **API (Backend)** | https://tad-api.vercel.app |
| **Supabase Dashboard** | https://supabase.com/dashboard/project/ltdcdhqixvbpdcitthqf |
| **GitHub Repo** | https://github.com/tadtaxiadvertising/tad-dooh-platform |
| **Swagger API Docs** | https://tad-api.vercel.app/docs (requiere servidor local) |

---

## 🔑 CREDENCIALES

### Login del Dashboard Admin
```
Email:    admin@tad.do
Password: TadAdmin2026!
```
- Autenticación vía **Supabase Auth** (signInWithPassword).
- El backend valida el JWT de Supabase en cada request (excepto rutas `@Public()`).

### Supabase Project
```
Project ID:    ltdcdhqixvbpdcitthqf
Region:        us-west-2 (AWS)
SUPABASE_URL:  https://ltdcdhqixvbpdcitthqf.supabase.co
SUPABASE_KEY:  (ver archivo .env del backend → SUPABASE_KEY)
SERVICE_ROLE:  (ver archivo .env del backend → SUPABASE_SERVICE_ROLE_KEY)
```

### Base de Datos PostgreSQL
```
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
|---|---|---|
| Framework | Next.js (Pages Router) | 15.1.6 |
| UI Library | React | 19.0.0 |
| Styling | Tailwind CSS + PostCSS | 4.0.0 |
| Icons | lucide-react | Latest |
| HTTP Client | Axios | Latest |
| Utilities | clsx, date-fns | Latest |
| Deployment | Vercel (Git integration) | Auto-deploy on push to `main` |

### Backend (backend)
| Layer | Tecnología | Versión |
|---|---|---|
| Framework | NestJS | 10.x |
| ORM | Prisma Client | 5.22.0 |
| Auth Guard | Custom `SupabaseAuthGuard` | — |
| File Upload | `@nestjs/platform-express` + Multer | — |
| Validation | `class-validator` + `ValidationPipe` | — |
| Rate Limiting | `@nestjs/throttler` (100 req/min) | — |
| CORS | Configured in `main.ts` + `api/index.ts` | — |
| Deployment | Vercel Serverless (`api/index.ts`) | — |

### Infraestructura
| Service | Provider | Propósito |
|---|---|---|
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
|---|---|
| `DATABASE_URL` | (copiar de `backend/.env` → DATABASE_URL) |
| `DIRECT_URL` | (copiar de `backend/.env` → DIRECT_URL) |
| `SUPABASE_URL` | `https://ltdcdhqixvbpdcitthqf.supabase.co` |
| `SUPABASE_KEY` | (copiar de `backend/.env` → SUPABASE_KEY) |
| `SUPABASE_SERVICE_ROLE_KEY` | (copiar de `backend/.env` → SUPABASE_SERVICE_ROLE_KEY) |
| `NODE_ENV` | `production` |

### Proyecto: tad-dashboard (Frontend)
| Variable | Valor |
|---|---|
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
