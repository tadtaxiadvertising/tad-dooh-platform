# 🚢 Guía de Despliegue en EasyPanel (Infraestructura TAD DOOH)

Esta guía detalla los pasos para desplegar y mantener la plataforma TAD DOOH en EasyPanel. **Cada servicio tiene su propia clave SSH para acceso remoto y deployments automatizados.**

## 🏗️ Arquitectura de Servicios

EasyPanel gestiona 7 servicios independientes, cada uno con su propia clave SSH dedicada:

| Servicio | Tipo | Puerto | Descripción | SSH Key |
|----------|------|--------|-------------|---------|
| **tad-api** | Backend NestJS | 3000 | API Integration Matrix / Prisma PostgreSQL | `S1-api-<hash>` |
| **tad-admin** | Frontend Next.js | 3000/80 | Admin Intelligence Console | `S1-admin-<hash>` |
| **tad-advertiser** | Frontend Next.js | 3000/80 | Advertiser BI Dashboard | `S1-advertiser-<hash>` |
| **tad-driver** | PWA Next.js | 3000/80 | Mobile Gateway / Driver App | `S1-driver-<hash>` |
| **tad-player** | Next.js Kiosk | 3000/80 | Tablet Player UI | `S1-player-<hash>` |
| **tad-simulator** | Simulator Node | 3001 | Device & Campaign Simulator | `S1-simulator-<hash>` |
| **tad-remotion** | Video Engine | 3000 | Remotion Render Server (Chromium) | `S1-remotion-<hash>` |

---

## 🔐 Gestión de Claves SSH

### Registrar Claves SSH en EasyPanel

Cada servicio requiere una clave SSH independiente para:
- Acceso remoto CLI
- Webhooks automatizados de GitHub
- Comunicación inter-servicios (mTLS)

**Pasos:**

1. **Generar par de claves SSH** (si no tienes):
   ```bash
   ssh-keygen -t rsa -b 4096 -f ~/.ssh/tad-api -C "tad-api@easypanel"
   ssh-keygen -t rsa -b 4096 -f ~/.ssh/tad-admin -C "tad-admin@easypanel"
   # ... repetir para cada servicio
   ```

2. **En EasyPanel Dashboard**:
   - Navega a **Project > Services > [Service Name] > SSH Keys**
   - Click **Add SSH Key**
   - Copia la clave **pública** (`~/.ssh/tad-api.pub`)
   - Asigna un label descriptivo: `S1-api-prod-backup`
   - **Guarda la clave privada** en tu gestor de secretos

3. **Conectar vía SSH a un servicio**:
   ```bash
   # Usando la clave privada correspondiente
   ssh -i ~/.ssh/tad-api easypanel@your-easypanel-host
   
   # Ejecutar comandos remotos
   ssh -i ~/.ssh/tad-api easypanel@your-easypanel-host "cd /app && npm run build"
   ```

---

## 🔧 Configuración Individual de Servicios

### ⚙️ SERVICIO 1: tad-api (Backend NestJS)

**SSH Key:** `S1-api-<hash>`

#### 1. Aplicación
- **Origen:** GitHub (rama `main`)
- **Dockerfile Path:** `apps/api/Dockerfile`
- **Build Args:**
  ```
  NODE_ENV=production
  PORT=3000
  CORS_ORIGIN=true
  ```

#### 2. Variables de Entorno
| Variable | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `PORT` | Puerto interno | `3000` |
| `NODE_ENV` | Entorno | `production` |
| `DATABASE_URL` | Supabase (pgbouncer) | `postgresql://user:pwd@aws-host.pooler.supabase.com:6543/postgres?pgbouncer=true` |
| `DIRECT_URL` | Conexión directa (migraciones) | `postgresql://user:pwd@aws-host.com:5432/postgres` |
| `SUPABASE_URL` | Endpoint Supabase | `https://ltdcdhqixvbpdcitthqf.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | JWT Servicio | `REDACTED` |
| `SUPABASE_JWT_SECRET` | Secret JWT | `REDACTED` |
| `GIT_SHA` | Hash commit actual | Autocompletado por CI/CD |

#### 3. Recursos (Resource Limits)
- **CPU:** 1.0 core
- **Memory:** 512MB (máximo recomendado)
- **Reservation:** 256MB

---

### 🎨 SERVICIO 2: tad-admin (Admin Console)

**SSH Key:** `S1-admin-<hash>`

#### 1. Aplicación
- **Origen:** GitHub (rama `main`)
- **Root Directory:** `apps/admin`
- **Build Command:** `npm run build`
- **Install Command:** `npm install`
- **Output Directory:** `.next`

#### 2. Variables de Entorno (Runtime)
| Variable | Descripción |
| :--- | :--- |
| `NEXT_PUBLIC_API_URL` | URL pública del API backend |
| `BACKEND_INTERNAL_URL` | `http://tad-api:3000` (nombre de servicio EasyPanel) |

#### 3. Recursos
- **CPU:** 0.5 core
- **Memory:** 256MB

---

### 📊 SERVICIO 3: tad-advertiser (Advertiser Dashboard)

**SSH Key:** `S1-advertiser-<hash>`

#### 1. Aplicación
- **Origen:** GitHub (rama `main`)
- **Root Directory:** `apps/advertiser`
- **Build Command:** `npm run build`
- **Output Directory:** `.next`

#### 2. Variables de Entorno (Runtime)
| Variable | Descripción |
| :--- | :--- |
| `NEXT_PUBLIC_API_URL` | URL pública del API backend |
| `BACKEND_INTERNAL_URL` | `http://tad-api:3000` |

#### 3. Recursos
- **CPU:** 0.5 core
- **Memory:** 256MB

---

### 🚗 SERVICIO 4: tad-driver (Mobile Gateway PWA)

**SSH Key:** `S1-driver-<hash>`

#### 1. Aplicación
- **Origen:** GitHub (rama `main`)
- **Root Directory:** `apps/driver`
- **Build Command:** `npm run build`
- **Output Directory:** `.next`

#### 2. Variables de Entorno
| Variable | Descripción |
| :--- | :--- |
| `NEXT_PUBLIC_API_URL` | URL pública del API backend |
| `NEXT_PUBLIC_MAPS_API_KEY` | Google Maps API Key |

#### 3. Recursos
- **CPU:** 0.5 core
- **Memory:** 256MB

---

### 🎬 SERVICIO 5: tad-player (Tablet Kiosk UI)

**SSH Key:** `S1-player-<hash>`

#### 1. Aplicación
- **Origen:** GitHub (rama `main`)
- **Root Directory:** `apps/tablet-player` o `apps/player`
- **Build Command:** `npm run build`
- **Output Directory:** `.next` o `dist`

#### 2. Variables de Entorno
| Variable | Descripción |
| :--- | :--- |
| `NEXT_PUBLIC_API_URL` | URL pública del API backend |
| `NEXT_PUBLIC_DEVICE_ID` | Puede inyectarse en HTML inline |

#### 3. Recursos
- **CPU:** 0.5 core
- **Memory:** 256MB

---

### 🔧 SERVICIO 6: tad-simulator (Device & Campaign Simulator)

**SSH Key:** `S1-simulator-<hash>`

#### 1. Aplicación
- **Origen:** GitHub (rama `main`)
- **Dockerfile Path:** `Dockerfile.simulator`
- **Port:** 3001

#### 2. Variables de Entorno
| Variable | Descripción |
| :--- | :--- |
| `API_URL` | URL interna del API (`http://tad-api:3000`) |
| `SIMULATOR_PORT` | `3001` |
| `NODE_ENV` | `production` |

#### 3. Recursos
- **CPU:** 0.5 core
- **Memory:** 512MB

---

### 🎥 SERVICIO 7: tad-remotion (Video Render Engine)

**SSH Key:** `S1-remotion-<hash>`

> ⚠️ **CRÍTICO:** Requiere Chromium + Puppeteer. Consumo de RAM puede ser alto durante renders.

#### 1. Aplicación
- **Origen:** GitHub (rama `main`)
- **Dockerfile Path:** `Dockerfile.remotion`
- **Port:** 3000

#### 2. Variables de Entorno
| Variable | Descripción |
| :--- | :--- |
| `PORT` | `3000` |
| `API_URL` | `http://tad-api:3000` |
| `NODE_OPTIONS` | `--max_old_space_size=512` (TAD-OPS-911) |

#### 3. Recursos (Muy Importante)
- **CPU:** 1.0 core **MÍNIMO**
- **Memory:** 1024MB (1GB)
- **Reservation:** 768MB

---

## 🛡️ Hardening y Límites de Recursos

Para un VPS de bajos-a-medianos recursos, aplica estos límites estrictos:

```
tad-api       → 1.0 CPU, 512MB RAM   (Backend crítico)
tad-admin     → 0.5 CPU, 256MB RAM   (Admin portal)
tad-advertiser→ 0.5 CPU, 256MB RAM   (BI dashboard)
tad-driver    → 0.5 CPU, 256MB RAM   (Mobile app)
tad-player    → 0.5 CPU, 256MB RAM   (Kiosk display)
tad-simulator → 0.5 CPU, 512MB RAM   (Device simulator)
tad-remotion  → 1.0 CPU, 1024MB RAM  (Render engine - CRÍTICO)
─────────────────────────────────────────────────────
TOTAL RECOMENDADO: 6.0 CPU cores, 3.5GB RAM
```

> [!CAUTION]
> **No exceder los recursos del VPS.** Si tu VPS tiene 4GB de RAM, reserva 512MB para el SO y Traefik.
> Cada servicio puede ser escalado individualmente bajo demanda.

---

## 🔄 Solución de Problemas Comunes

### ⚠️ PROBLEMA COMÚN: ERROR "failed to read dockerfile"

**Síntomas:**
```
ERROR: failed to build: failed to solve: failed to read dockerfile: open Dockerfile: no such file or directory
```

**Causa:**
EasyPanel está configurado para buscar el Dockerfile en la raíz (`/Dockerfile`), pero en tu monorepo está en `apps/[servicio]/Dockerfile`.

**Solución Rápida:**
1. Ve a **EasyPanel Dashboard → Services → [Service] → Settings → Build**
2. Busca **Dockerfile Path**
3. Cambia de: `Dockerfile` → a: `apps/api/Dockerfile` (o según el servicio)
4. Click **Save**
5. Click **Force Redeploy**

**Guía completa:** [../DOCKERFILE_ERROR_SOLUTION.md](../DOCKERFILE_ERROR_SOLUTION.md)

---

### ❌ ERROR: `failed to read dockerfile: open Dockerfile: no such file or directory`

**Causa:** El repositorio clonado en EasyPanel no tiene la rama sincronizada o falta el Dockerfile.

**Solución:**
1. **Verificar que el Dockerfile existe en tu repo:**
   ```bash
   ls -la apps/api/Dockerfile
   # Debe existir: apps/api/Dockerfile (no Dockerfile.api)
   ```

2. **Fuerza una resincronización en EasyPanel:**
   - Ve a **Project > Services > [Service] > Git**
   - Click **Resync** o **Force Redeploy**
   - Verifica la rama (`main` vs `develop`)

3. **Asegúrate que el path es correcto:**
   - Si tu Dockerfile está en `apps/api/Dockerfile`, usa: `apps/api/Dockerfile`
   - No uses rutas relativas como `./Dockerfile` o `Dockerfile.api`

4. **Verifica la clave SSH:**
   - Accede vía SSH al servicio problemático:
     ```bash
     ssh -i ~/.ssh/tad-api easypanel@your-host
     cd /path/to/project && git status
     ```

---

### ❌ ERROR: 502 Bad Gateway / 504 Gateway Timeout

**Causa:** El contenedor no está respondiendo en el puerto correcto o hay timeout de conexión.

**Solución:**
1. Verifica que el puerto está configurado correctamente:
   ```bash
   ssh -i ~/.ssh/[service-name] easypanel@your-host
   docker ps | grep tad-api  # Busca el contenedor
   docker logs [container-id] | tail -50  # Revisa logs
   ```

2. Asegúrate que `BACKEND_INTERNAL_URL` coincide con el nombre del servicio:
   - En EasyPanel, los servicios se comunican internamente por nombre: `http://tad-api:3000`
   - No usar `localhost` o direcciones IP internas

3. Aumenta el memory limit si hay Out-of-Memory:
   ```bash
   # Revisa el estado de memoria
   ssh -i ~/.ssh/[service] easypanel@your-host
   docker stats
   ```

---

### ❌ ERROR: 401 Unauthorized / Authentication Failed

**Causa:** Claves o variables de entorno incorrectas para Supabase o JWT.

**Solución:**
1. Valida la variable `SUPABASE_SERVICE_ROLE_KEY`:
   ```bash
   # Debe comenzar con 'eyJ' (base64 JWT)
   echo "SUPABASE_SERVICE_ROLE_KEY" | head -c 10
   ```

2. Confirma que es el JWT correcto y no una API Key de administración:
   - En Supabase Dashboard > Settings > API > Service Role Key (JWT)

3. Revisa que la clave SSH del servicio tiene permisos de ejecución:
   ```bash
   ssh -i ~/.ssh/tad-api easypanel@your-host "curl http://tad-api:3000/health"
   ```

---

### ❌ ERROR: Connection refused a través de SSH

**Causa:** La clave SSH no está registrada o tiene permisos incorrectos.

**Solución:**
1. Verifica la clave SSH privada:
   ```bash
   chmod 600 ~/.ssh/tad-api
   ssh-keygen -l -f ~/.ssh/tad-api.pub  # Valida fingerprint
   ```

2. Confirma que la clave pública está en EasyPanel:
   - **Project > Services > [Service] > SSH Keys**
   - Verifica que la clave coincide: `ssh-keygen -l -f ~/.ssh/tad-api.pub`

3. Si fallá, regenera la clave:
   ```bash
   ssh-keygen -t rsa -b 4096 -f ~/.ssh/tad-api -C "tad-api@easypanel" -N ""
   # Copia la nueva clave pública a EasyPanel
   cat ~/.ssh/tad-api.pub
   ```

---

### ⚠️ WARNING: Servicios Inter-dependientes

Algunos servicios dependen de otros para funcionar correctamente:

```
tad-admin ─┐
tad-driver ├─> requieren ──> tad-api (Backend)
tad-player ┤
tad-admin  └─> puede usar ──> tad-remotion (Render)
```

**Orden recomendado de deployment:**
1. Primero: `tad-api` (Backend)
2. Luego: `tad-remotion` (Render Engine)
3. Finalmente: Los frontends (`tad-admin`, `tad-driver`, `tad-player`, etc.)

Si despliega frontends antes que el backend, obtendrás errores de conexión refusada.

---
### ✅ Cambios Automáticos (CI/CD Webhook)

Todo cambio subido a la rama `main` disparará automáticamente un re-build en EasyPanel:

1. **GitHub Push** → Webhook dispara EasyPanel
2. **EasyPanel Re-clone** → `git pull origin main`
3. **Docker Build** → Ejecuta el Dockerfile
4. **Deploy** → Reinicia el contenedor

Si el cambio no se refleja después de 5 minutos:
- Navega a **Project > Services > [Service] > Build Logs**
- Revisa si hay errores en el build
- Click **Force Redeploy** manualmente para forzar un re-build

---

## ✅ Validación Post-Deployment

Una vez que todos los servicios estén deployados, ejecuta estos tests:

### 1. Verifica Conectividad de Backend
```bash
# Desde cualquier cliente remoto
curl -H "Authorization: Bearer YOUR_JWT" \
  https://your-easypanel-domain.com/api/health
  
# Esperado: { "status": "ok", "timestamp": "2026-04-22T..." }
```

### 2. Verifica Admin Console
```bash
curl https://admin.your-easypanel-domain.com/
# Esperado: HTML de Next.js
```

### 3. Verifica Comunicación Inter-Servicios (SSH)
```bash
ssh -i ~/.ssh/tad-api easypanel@your-host

# Dentro del contenedor:
docker exec tad-api curl http://tad-remotion:3000/health
# Esperado: { "status": "ok" }
```

### 4. Revisa Consumo de Recursos
```bash
ssh -i ~/.ssh/tad-api easypanel@your-host
docker stats --no-stream
# Verifica que ningún servicio exceda sus límites
```

### 5. Valida Logs Centralizados
```bash
ssh -i ~/.ssh/tad-api easypanel@your-host

# Ver logs del API
docker logs tad-api | tail -100

# Ver logs del Admin
docker logs tad-admin | tail -50

# Ver logs del Remotion (busy)
docker logs tad-remotion | tail -50
```

---

## 📋 Checklist Pre-Producción

- [ ] Todas 7 instancias creadas en EasyPanel
- [ ] Cada servicio tiene su clave SSH registrada
- [ ] Variables de entorno completadas y validadas
- [ ] Límites de recursos configurados
- [ ] Backend (`tad-api`) pasa health check
- [ ] Admin console accesible vía HTTPS
- [ ] Webhook de GitHub funcionando (Force Redeploy probado)
- [ ] Backups de Supabase configurados
- [ ] Monitoreo y alertas activas
- [ ] Plan de rollback documentado

---

## 🚀 Deploy Rápido (Script Helper)

Crea un script `deploy-easypanel.sh` para automatizar deployments:

```bash
#!/bin/bash

SERVICES=("tad-api" "tad-admin" "tad-advertiser" "tad-driver" "tad-player" "tad-simulator" "tad-remotion")
EASYPANEL_HOST="your-easypanel-host"
SSH_KEYS_DIR="$HOME/.ssh"

echo "🚀 TAD DOOH Platform - EasyPanel Deploy"
echo "========================================"

for service in "${SERVICES[@]}"; do
    echo ""
    echo "Deployando $service..."
    
    # Usar clave SSH específica del servicio
    ssh -i "$SSH_KEYS_DIR/tad-$service" \
        "easypanel@$EASYPANEL_HOST" \
        "cd /etc/easypanel/projects/proyecto_ia/$service/code && \
         git pull origin main && \
         docker buildx build --network host -f Dockerfile -t easypanel/$service:latest . && \
         docker restart $service"
    
    if [ $? -eq 0 ]; then
        echo "✅ $service deployado correctamente"
    else
        echo "❌ Error al desplegar $service"
        exit 1
    fi
    
    sleep 5  # Espera 5s antes de siguiente servicio
done

echo ""
echo "✅ Todos los servicios han sido deployados"
```

Uso:
```bash
chmod +x deploy-easypanel.sh
./deploy-easypanel.sh
```

---

## 📞 Soporte y Escalabilidad

- **Documentación EasyPanel:** https://docs.easypanel.io/
- **Soporte TAD OPS:** Contactar equipo de infraestructura
- **Escalado Vertical:** Aumentar CPU/RAM de un servicio específico
- **Escalado Horizontal:** Replicar un servicio en otro VPS (requiere load balancer Traefik)