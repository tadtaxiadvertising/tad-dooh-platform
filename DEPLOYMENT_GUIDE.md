# 🚀 Deployment Guides - TAD DOOH Platform

Documentación centralizada para desplegar la plataforma TAD DOOH en producción. Cada servicio tiene su propia clave SSH independiente.

## 📚 Documentos de Deployment

### 🔐 SSH Key Management (START HERE)
**📄 [docs/SSH_KEY_MANAGEMENT.md](docs/SSH_KEY_MANAGEMENT.md)**

Guía completa para generar, registrar y gestionar claves SSH para los 7 servicios.

```
Servicios:
├── tad-api (SSH Key: S1-api-<hash>)
├── tad-admin (SSH Key: S1-admin-<hash>)
├── tad-advertiser (SSH Key: S1-advertiser-<hash>)
├── tad-driver (SSH Key: S1-driver-<hash>)
├── tad-player (SSH Key: S1-player-<hash>)
├── tad-simulator (SSH Key: S1-simulator-<hash>)
└── tad-remotion (SSH Key: S1-remotion-<hash>)
```

**Lo que encontrarás:**
- ✅ Cómo generar pares de claves RSA 4096-bit
- ✅ Cómo registrar claves en EasyPanel
- ✅ Comandos comunes: deploy, logs, health checks
- ✅ Scripts de automatización multi-servicio
- ✅ Troubleshooting de conexiones SSH
- ✅ Mejores prácticas de seguridad

---

### 🚢 EasyPanel Deployment
**📄 [docs/DEPLOY_EASYPANEL.md](docs/DEPLOY_EASYPANEL.md)**

Guía paso-a-paso para desplegar cada servicio en EasyPanel.

**Lo que encontrarás:**
- ✅ Arquitectura de 7 servicios
- ✅ Configuración específica de cada servicio (variables, recursos, puertos)
- ✅ Límites de CPU/RAM recomendados
- ✅ Gestión de claves SSH por servicio
- ✅ Troubleshooting (Dockerfile error, 502 Gateway, SSH issues)
- ✅ Validación post-deployment
- ✅ Checklist pre-producción
- ✅ Scripts helper para deploy automático

---

### 🔧 Production Deployment Handbook
**📄 [DEPLOY_PRODUCTION.md](DEPLOY_PRODUCTION.md)**

Resumen ejecutivo del deployment en producción.

**Lo que encontrarás:**
- ✅ Topología del sistema con claves SSH
- ✅ Orden recomendado de deployment
- ✅ Validación del sistema completo
- ✅ Referencias cruzadas a otros documentos

---

### 🤖 Automated DevOps
**📄 [DEVOPS_AUTODEPLOY.md](DEVOPS_AUTODEPLOY.md)**

Automatización con CI/CD (Railway, Vercel).

**Lo que encontrarás:**
- ✅ Tokens y autenticación
- ✅ Configuración de infraestructura
- ✅ Scripts de deploy automático
- ✅ Configuración DNS (Cloudflare)

---

### 📊 Deployment Status
**📄 [DEPLOY_STATUS.md](DEPLOY_STATUS.md)**

Estado actual y historial de deployments.

---

## 🚀 Quick Start

### 1️⃣ Generar Claves SSH

```bash
# Crear todas las claves para los 7 servicios
for service in api admin advertiser driver player simulator remotion; do
    ssh-keygen -t rsa -b 4096 -f ~/.ssh/tad-$service -C "tad-$service@easypanel" -N ""
done

# Verificar permisos
chmod 600 ~/.ssh/tad-*
```

### 2️⃣ Registrar en EasyPanel

1. Ve a **Project > Services > [Service Name] > SSH Keys**
2. Click **Add SSH Key**
3. Copia la clave pública: `cat ~/.ssh/tad-[service].pub`
4. Pega en EasyPanel
5. Repite para los 7 servicios

### 3️⃣ Verificar Acceso SSH

```bash
# Prueba conexión a cada servicio
for service in api admin advertiser driver player simulator remotion; do
    ssh -i ~/.ssh/tad-$service easypanel@your-host "echo ✅ $service" && \
    echo "✓ $service conectado" || echo "✗ $service falló"
done
```

### 4️⃣ Deploy del Backend (Orden Crítico)

```bash
# 1. Backend API (dependen todos)
ssh -i ~/.ssh/tad-api easypanel@your-host \
    "cd /app && git pull origin main && docker restart tad-api"

# 2. Video Render
ssh -i ~/.ssh/tad-remotion easypanel@your-host \
    "cd /app && git pull origin main && docker restart tad-remotion"

# 3. Frontends (admin, advertiser, driver, player)
ssh -i ~/.ssh/tad-admin easypanel@your-host \
    "cd /app && git pull origin main && docker restart tad-admin"
```

### 5️⃣ Validar

```bash
# Health check
curl -H "Authorization: Bearer YOUR_JWT" https://api.tad.do/health

# Ver logs
ssh -i ~/.ssh/tad-api easypanel@your-host "docker logs tad-api | tail -50"

# Revisar recursos
ssh -i ~/.ssh/tad-api easypanel@your-host "docker stats --no-stream"
```

---

## 🆘 Error Común: "failed to read dockerfile"

### 🔍 Diagnóstico

```bash
# Acceder al servidor
ssh -i ~/.ssh/tad-api easypanel@your-host

# Verificar que el Dockerfile existe
cd /etc/easypanel/projects/proyecto_ia/tad-api/code
ls -la apps/api/Dockerfile

# Ver estado de Git
git status
git log -1 --oneline
```

### ✅ Solución

```bash
# Resincronizar repositorio
git pull origin main

# Limpiar caché de Docker
docker system prune -a

# Force redeploy desde EasyPanel UI o
docker buildx build --network host -f apps/api/Dockerfile -t easypanel/tad-api .
```

**Ver guía completa:** [docs/DEPLOY_EASYPANEL.md#error-failed-to-read-dockerfile](docs/DEPLOY_EASYPANEL.md#error-failed-to-read-dockerfile-open-dockerfile-no-such-file-or-directory)

---

## 📋 Checklist Pre-Producción

- [ ] 7 claves SSH generadas y registradas
- [ ] Conexión SSH probada a todos los servicios
- [ ] Variables de entorno completadas en EasyPanel
- [ ] Límites de CPU/RAM configurados
- [ ] Backend API pasa health check
- [ ] Admin console accesible vía HTTPS
- [ ] Webhook de GitHub funcionando
- [ ] Backups de Supabase configurados
- [ ] Monitoreo y alertas activas
- [ ] Plan de rollback documentado

---

## 🔒 Seguridad

**⚠️ IMPORTANTE:**
1. **Nunca** commitees claves SSH privadas
2. **Backup encriptado** de claves SSH regularmente
3. **Rota** claves cada 90 días
4. **Usa SSH Config** para simplificar conexiones
5. **Audita** intentos de acceso SSH

Ver: [docs/SSH_KEY_MANAGEMENT.md#-seguridad-de-claves-ssh](docs/SSH_KEY_MANAGEMENT.md#-seguridad-de-claves-ssh)

---

## 📞 Soporte

- **Documentación EasyPanel:** https://docs.easypanel.io/
- **SSH Troubleshooting:** [docs/SSH_KEY_MANAGEMENT.md#-troubleshooting-ssh](docs/SSH_KEY_MANAGEMENT.md#-troubleshooting-ssh)
- **Deploy Errors:** [docs/DEPLOY_EASYPANEL.md#-solución-de-problemas-comunes](docs/DEPLOY_EASYPANEL.md#-solución-de-problemas-comunes)

---

## 🗂️ Estructura de Documentos

```
/
├── DEPLOY_PRODUCTION.md           ← Resumen ejecutivo
├── DEVOPS_AUTODEPLOY.md           ← CI/CD automation
├── DEPLOY_STATUS.md               ← Estado actual
│
├── docs/
│   ├── DEPLOY_EASYPANEL.md        ← Guía completa EasyPanel
│   └── SSH_KEY_MANAGEMENT.md      ← Gestión de SSH keys
│
├── apps/
│   ├── api/Dockerfile             ← Backend
│   ├── admin/                      ← Admin console
│   ├── advertiser/                 ← BI Dashboard
│   ├── driver/                     ← Mobile app
│   ├── tablet-player/              ← Kiosk UI
│   ├── tad-simulator/              ← Device simulator
│   └── tad-remotion/               ← Video render
```

---

**Última actualización:** 22 de Abril, 2026  
**Versión:** TAD Platform v10.0  
**Status:** ✅ En Producción
