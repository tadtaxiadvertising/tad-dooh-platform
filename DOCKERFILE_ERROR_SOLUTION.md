# 🐛 Solución: ERROR "failed to read dockerfile" en EasyPanel

## El Problema

EasyPanel intenta construir tu imagen Docker pero **no encuentra el Dockerfile**:

```
ERROR: failed to build: failed to solve: failed to read dockerfile: open Dockerfile: no such file or directory
```

**Línea problemática:**
```bash
docker buildx build -f /etc/easypanel/projects/proyecto_ia/tad-api/code/Dockerfile ...
```

## ¿Por qué sucede?

Tu proyecto es un **monorepo** con estructura:
```
tad-dooh-platform/
├── apps/
│   ├── api/
│   │   └── Dockerfile          ← Aquí está tu Dockerfile
│   ├── admin/
│   │   └── Dockerfile
│   ├── advertiser/
│   ├── driver/
│   ├── tablet-player/
│   ├── tad-simulator/
│   └── tad-remotion/
├── Dockerfile                  ← NO aquí
└── ...
```

EasyPanel está configurado para buscar el Dockerfile en la **raíz del repositorio** (`/Dockerfile`), pero tú lo tienes en `apps/api/Dockerfile` (o en el subdirectorio correspondiente a cada servicio).

## ✅ Soluciones

### Solución 1: Cambiar la Ruta en EasyPanel (RECOMENDADO)

**Pasos:**

1. **Abre EasyPanel Dashboard**
   - URL: https://ibusiness.com.do/projects/proyecto_ia

2. **Selecciona tu servicio**
   - Click en **tad-api** (o el servicio que está fallando)

3. **Accede a Configuración del Build**
   - Click en **Settings** → **Build** → **Dockerfile Path**
   - O busca la sección "Dockerfile Configuration"

4. **Cambia la ruta:**
   ```
   ❌ Incorrecto: Dockerfile
   ❌ Incorrecto: Dockerfile.api
   ✅ Correcto:   apps/api/Dockerfile
   ```

5. **Para cada servicio:**
   | Servicio | Ruta Correcta |
   |----------|---------------|
   | tad-api | `apps/api/Dockerfile` |
   | tad-admin | `apps/admin/Dockerfile` |
   | tad-advertiser | `apps/advertiser/Dockerfile` |
   | tad-driver | `apps/driver/Dockerfile` |
   | tad-player | `apps/tablet-player/Dockerfile` |
   | tad-simulator | `apps/tad-simulator/Dockerfile` |
   | tad-remotion | `apps/tad-remotion/Dockerfile` |

6. **Guarda los cambios**
   - Click en **Save** o **Update**

7. **Force Redeploy**
   - Click en **Force Redeploy** o **Rebuild**
   - EasyPanel volverá a descargar el código y construirá desde la nueva ruta

---

### Solución 2: Crear Dockerfile en la Raíz (Alternativa)

Si prefieres tener Dockerfiles en la raíz para cada servicio, puedes crear symlinks:

```bash
# Crear symlinks desde la raíz
ln -s apps/api/Dockerfile Dockerfile.api
ln -s apps/admin/Dockerfile Dockerfile.admin
ln -s apps/advertiser/Dockerfile Dockerfile.advertiser
ln -s apps/driver/Dockerfile Dockerfile.driver
ln -s apps/tablet-player/Dockerfile Dockerfile.tablet-player
ln -s apps/tad-simulator/Dockerfile Dockerfile.simulator
ln -s apps/tad-remotion/Dockerfile Dockerfile.remotion

# Luego en EasyPanel, usa: Dockerfile.api, Dockerfile.admin, etc.
git add Dockerfile.*
git commit -m "feat: add Dockerfile symlinks for EasyPanel compatibility"
git push origin main
```

> ⚠️ **Nota:** Los symlinks pueden causar problemas en Windows. Se recomienda Solución 1.

---

### Solución 3: Copiar Dockerfile a la Raíz (No Recomendado)

```bash
# Copiar cada Dockerfile (mantener sincronización manual)
cp apps/api/Dockerfile Dockerfile  # Solo si despliegas un servicio por VPS

git add Dockerfile
git commit -m "chore: add root Dockerfile for EasyPanel"
git push origin main
```

> ⚠️ **Problema:** Tendrías que mantener Dockerfiles duplicados sincronizados. Con 7 servicios, es problemático.

---

## 🔍 Diagnóstico Rápido

### Verifica que los Dockerfiles existen:

```bash
# Desde la raíz de tu proyecto
ls -la apps/*/Dockerfile

# Esperado:
# apps/api/Dockerfile
# apps/admin/Dockerfile
# apps/advertiser/Dockerfile
# apps/driver/Dockerfile
# apps/tablet-player/Dockerfile
# apps/tad-simulator/Dockerfile
# apps/tad-remotion/Dockerfile
```

### Ejecuta el script de verificación:

```bash
# Windows (PowerShell)
bash fix-easypanel-dockerfile.sh

# Linux/Mac
./fix-easypanel-dockerfile.sh
```

---

## 📝 Verificación Post-Solución

Después de cambiar la ruta en EasyPanel:

1. **Revisa los Build Logs**
   - EasyPanel → Services → tad-api → Build Logs
   - Debe mostrar: ✅ `DONE 0.0s` (sin errores)

2. **Verifica el Contenedor**
   ```bash
   # Desde tu máquina (si tienes SSH configurado)
   ssh -i ~/.ssh/tad-api easypanel@ibusiness.com.do \
       "docker ps -a | grep tad-api"
   ```

3. **Revisa Health Check**
   ```bash
   curl -H "Authorization: Bearer YOUR_JWT" \
        https://your-easypanel-domain/api/health
   # Esperado: { "status": "ok" }
   ```

---

## 🚀 Para Futuros Deployments

**Configuración recomendada en EasyPanel:**

```
Para cada servicio:
├── Build Method: Dockerfile
├── Dockerfile Path: apps/[servicio]/Dockerfile
├── Build Args:
│   ├── NODE_ENV=production
│   ├── PORT=3000
│   └── GIT_SHA=$(git rev-parse HEAD)
├── Auto-Deploy: On (GitHub webhook)
└── Force Redeploy: Manual (cuando necesites)
```

---

## 📚 Referencias

- [docs/DEPLOY_EASYPANEL.md](../docs/DEPLOY_EASYPANEL.md) - Guía completa
- [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md) - Centro de referencia
- [EasyPanel Docs](https://docs.easypanel.io/) - Documentación oficial

---

## ⏱️ Timeline de Resolución

```
git push → GitHub webhook → EasyPanel detecta push
    ↓
EasyPanel descarga código (git pull)
    ↓
Lee configuración de Build (Dockerfile Path)
    ↓
docker buildx build -f [ruta-correcta] ...
    ↓
✅ Build exitoso
    ↓
Docker restart tad-api
    ↓
✅ Servicio activo en puerto 3000
```

---

**Si aún tienes problemas**, revisa:
1. La rama Git está actualizada: `git status`
2. Los Dockerfiles existen localmente
3. La ruta en EasyPanel coincide exactamente con la estructura
4. Los Build Logs de EasyPanel para mensajes de error específicos
