# TAD DOOH Platform v10.0 - Production Deployment Handbook
> **Monorepo Architecture Overview:** Este documento define los protocolos operacionales para desplegar la red TAD DOOH global, ajustada a la arquitectura de microservicios (apps/*) y límites de asfixia.

---

## 1. Topología del Sistema v10.0
El ecosistema se apoya en servicios separados para escalabilidad y contención de costos:

1. **Backend Integration Matrix** -> `api.tad.do` (NestJS / Prisma PostgreSQL) -> **EasyPanel VPS**
2. **Video Render Engine** -> `remotion.tad.do` (Remotion) -> **EasyPanel VPS**
3. **Admin Intelligence** -> `admin.tad.do` (Next.js) -> **Vercel**
4. **Advertiser BI** -> `advertiser.tad.do` (Next.js) -> **Vercel**
5. **Mobile Gateway** -> `driver.tad.do` (PWA Next.js) -> **Vercel**
6. **Tablet Player** -> `player.tad.do` (Next.js Kiosk) -> **Vercel**

---

## 2. Variables de Entorno Globales (Environment Variables)

### Backend (`apps/api` - EasyPanel)
```env
# Infrastructure Storage
DATABASE_URL="postgresql://user:password@aws-host.com:6543/tad_db?connection_limit=5"
SUPABASE_URL="https://<your-project>.supabase.co"
SUPABASE_SERVICE_KEY="<your-service-key>"
PORT=3000
```

### Frontends (`apps/admin`, `apps/advertiser`, `apps/driver`, `apps/tablet-player` - Vercel)
```env
NEXT_PUBLIC_API_URL="https://api.tad.do/api"
NEXT_PUBLIC_SUPABASE_URL="https://<your-project>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<your-anon-key>"
```

---

## 3. Protocolo de Despliegue Paso a Paso

### A. Core Services (EasyPanel)
1. En tu panel de EasyPanel, crea un nuevo proyecto e importa tu repositorio GitHub.
2. Crea una aplicación para el **Backend API**:
   - **Build Method:** Dockerfile
   - **Dockerfile Path:** `Dockerfile.api`
   - **Limits:** RAM=512MB
   - **Env Vars:** Pega las variables de Backend (incluyendo Supabase).
3. Crea una aplicación para **TAD Remotion**:
   - **Build Method:** Dockerfile
   - **Dockerfile Path:** `Dockerfile.remotion`
   - **Limits:** RAM=1024MB (Requerido por Chromium Puppeteer).

### B. Ecosistema Frontend o Portales (Vercel)
Dado que es un Monorepo, debes crear 4 proyectos separados en Vercel apuntando al mismo repositorio GitHub:

1. **Admin Console (`apps/admin`)**
   - **Framework:** Next.js
   - **Root Directory:** `apps/admin`
   - Aplica variables de entorno frontend.
2. **Advertiser Hub (`apps/advertiser`)**
   - **Framework:** Next.js
   - **Root Directory:** `apps/advertiser`
   - Aplica variables de entorno frontend.
3. **Driver Mobile Gateway (`apps/driver`)**
   - **Framework:** Next.js
   - **Root Directory:** `apps/driver`
   - Aplica variables de entorno frontend.
4. **Tablet Player (`apps/tablet-player`)**
   - **Framework:** Next.js
   - **Root Directory:** `apps/tablet-player`
   - Aplica variables de entorno frontend.

---

## 4. Validación del Sistema
1. **Verificar Asfixia:** Accede a EasyPanel y valida que el consumo de CPU/RAM de `tad-remotion` no sobrepase el GB en su render.
2. **Validar Heatmap:** Inicia sesión en el Admin Console o Advertiser Hub y verifica la capa térmica en el `/network` map.
3. **Validar Telemetría Background:** Loguéate en la app de Conductor, minimiza la web y vuelve a ella tras 2 minutos observando si los paquetes estancados detonan el Flush (`test:e2e:gps`).

✅ **TAD PLATFORM V10.0 ESTÁ OFICIALMENTE EN PRODUCCIÓN.**
