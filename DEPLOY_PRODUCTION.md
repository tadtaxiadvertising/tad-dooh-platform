# TAD DOOH Platform v10.0 - Production Deployment Handbook

> **Monorepo Architecture Overview:** Este documento define los protocolos operacionales para desplegar la red TAD DOOH global, ajustada a la arquitectura de microservicios (apps/*) y límites de asfixia.

> ⚠️ **IMPORTANTE:** Cada servicio tiene su propia clave SSH. Ver [SSH_KEY_MANAGEMENT.md](docs/SSH_KEY_MANAGEMENT.md) para guía completa de gestión de claves.

---

## 1. Topología del Sistema v10.0

El ecosistema se apoya en 7 servicios independientes, cada uno con su propia clave SSH:

### Core Services (EasyPanel VPS)
1. **Backend Integration Matrix** → `api.tad.do` (NestJS / Prisma PostgreSQL) → **SSH Key: `S1-api-<hash>`**
2. **Video Render Engine** → `remotion.tad.do` (Remotion Chromium) → **SSH Key: `S1-remotion-<hash>`**
3. **Device Simulator** → `simulator.tad.do` (Node.js) → **SSH Key: `S1-simulator-<hash>`**

### Frontend Services (Vercel / EasyPanel)
4. **Admin Intelligence** → `admin.tad.do` (Next.js) → **SSH Key: `S1-admin-<hash>`**
5. **Advertiser BI** → `advertiser.tad.do` (Next.js) → **SSH Key: `S1-advertiser-<hash>`**
6. **Mobile Gateway** → `driver.tad.do` (PWA Next.js) → **SSH Key: `S1-driver-<hash>`**
7. **Tablet Player** → `player.tad.do` (Next.js Kiosk) → **SSH Key: `S1-player-<hash>`**

---

## 2. SSH Key Management

### ⚠️ CRÍTICO: Cada servicio tiene su clave SSH independiente

Todas las operaciones remotas requieren la clave SSH correspondiente:

```bash
# Acceder al backend API
ssh -i ~/.ssh/tad-api easypanel@your-host

# Acceder al admin console
ssh -i ~/.ssh/tad-admin easypanel@your-host

# Ver logs del Remotion
ssh -i ~/.ssh/tad-remotion easypanel@your-host "docker logs tad-remotion"

# Ejecutar comando en simulator
ssh -i ~/.ssh/tad-simulator easypanel@your-host "docker exec tad-simulator npm run check"
```

**Para guía completa:** → [docs/SSH_KEY_MANAGEMENT.md](docs/SSH_KEY_MANAGEMENT.md)

---

## 3. Variables de Entorno Globales (Environment Variables)

### Backend (`apps/api` - EasyPanel)

```env
# Infrastructure Storage
DATABASE_URL="postgresql://user:password@aws-host.com:6543/tad_db?connection_limit=5"
DIRECT_URL="postgresql://user:password@aws-host.com:5432/tad_db"
SUPABASE_URL="https://<your-project>.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="<your-service-key>"
SUPABASE_JWT_SECRET="<your-jwt-secret>"
PORT=3000
NODE_ENV=production
NODE_OPTIONS="--max_old_space_size=256"  # TAD-OPS-911
```

### Video Render Engine (`apps/tad-remotion` - EasyPanel)

```env
PORT=3000
NODE_ENV=production
API_URL="http://tad-api:3000"
NODE_OPTIONS="--max_old_space_size=512"  # Chromium requiere más memoria
```

### Frontends (`apps/admin`, `apps/advertiser`, `apps/driver`, `apps/tablet-player`)

```env
NEXT_PUBLIC_API_URL="https://api.tad.do/api"
NEXT_PUBLIC_SUPABASE_URL="https://<your-project>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<your-anon-key>"
BACKEND_INTERNAL_URL="http://tad-api:3000"  # Para SSR en EasyPanel
```

---

## 4. Protocolo de Despliegue Paso a Paso

### A. Core Services (EasyPanel)

**Orden crítico:**
1. Primero: `tad-api` (Backend - dependen todos)
2. Luego: `tad-remotion` (Render engine)
3. Finalmente: Frontends

**Setup Básico:**

```bash
# 1. Crear proyecto en EasyPanel
#    - Project Name: proyecto_ia
#    - GitHub repo: tu-repo-github

# 2. Para cada servicio backend:
#    - Crea aplicación nueva
#    - Selecciona Build Method: Dockerfile
#    - Configura Dockerfile Path (e.g., apps/api/Dockerfile)
#    - Registra clave SSH correspondiente

# 3. Configura variables de entorno
#    - Ve a Service > Environment
#    - Pega todas las variables del paso anterior
```

### B. Frontend Services

```bash
# Opción 1: Deploy en Vercel (Recomendado)
#   - Conecta repo GitHub a Vercel
#   - Crea proyecto separado por cada servicio
#   - Root Directory: apps/admin, apps/advertiser, etc.
#   - Vercel auto-detectará Next.js

# Opción 2: Deploy en EasyPanel
#   - Mismo proceso que backend
#   - Build Command: npm run build
#   - Output Directory: .next
```

---

## 5. Solución de Problemas Comunes

### ERROR: `failed to read dockerfile: open Dockerfile: no such file or directory`

Ver → [docs/DEPLOY_EASYPANEL.md - Solución de Problemas](docs/DEPLOY_EASYPANEL.md#solución-de-problemas-comunes)

**Quick Fix:**
```bash
# Verificar que el Dockerfile existe
ls -la apps/api/Dockerfile

# Forzar resincronización en EasyPanel
ssh -i ~/.ssh/tad-api easypanel@your-host \
    "cd /etc/easypanel/projects/proyecto_ia/tad-api/code && git pull origin main"

# Force redeploy en EasyPanel UI
```

### ERROR: 502 Bad Gateway

Ver → [docs/DEPLOY_EASYPANEL.md - ERROR 502](docs/DEPLOY_EASYPANEL.md#error-502-bad-gateway--504-gateway-timeout)

### ERROR: Connection refused (SSH)

Ver → [docs/SSH_KEY_MANAGEMENT.md - Troubleshooting](docs/SSH_KEY_MANAGEMENT.md#-troubleshooting-ssh)

---

## 6. Validación del Sistema

1. **Verificar Backend:**
   ```bash
   curl -H "Authorization: Bearer YOUR_JWT" https://api.tad.do/health
   # Esperado: { "status": "ok" }
   ```

2. **Validar Admin Console:**
   ```bash
   curl https://admin.tad.do/
   # Esperado: HTML de Next.js
   ```

3. **Revisar Consumo de Recursos:**
   ```bash
   ssh -i ~/.ssh/tad-api easypanel@your-host "docker stats --no-stream"
   ```

4. **Revisar Logs:**
   ```bash
   ssh -i ~/.ssh/tad-api easypanel@your-host "docker logs tad-api | tail -100"
   ```

✅ **TAD PLATFORM V10.0 ESTÁ OFICIALMENTE EN PRODUCCIÓN.**

---

## 📚 Documentación Relacionada

- [docs/DEPLOY_EASYPANEL.md](docs/DEPLOY_EASYPANEL.md) - Guía completa de EasyPanel
- [docs/SSH_KEY_MANAGEMENT.md](docs/SSH_KEY_MANAGEMENT.md) - Gestión de claves SSH por servicio
- [DEVOPS_AUTODEPLOY.md](DEVOPS_AUTODEPLOY.md) - Automatización con CI/CD
- [DEPLOY_STATUS.md](DEPLOY_STATUS.md) - Estado actual de deployments
