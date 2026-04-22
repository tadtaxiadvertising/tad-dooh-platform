# 🔐 SSH Key Management - TAD DOOH Platform

Guía completa para gestionar claves SSH en EasyPanel. Cada uno de los 7 servicios tiene su propia clave SSH independiente para acceso remoto, automatización y webhooks.

---

## 📋 Servicios y Sus Claves SSH

| Servicio | Clave SSH | Descripción | Acceso |
|----------|-----------|-------------|--------|
| **tad-api** | `~/.ssh/tad-api` | Backend NestJS + Prisma | Puertos: 3000 |
| **tad-admin** | `~/.ssh/tad-admin` | Admin Console (Next.js) | Puerto: 80/443 |
| **tad-advertiser** | `~/.ssh/tad-advertiser` | BI Dashboard (Next.js) | Puerto: 80/443 |
| **tad-driver** | `~/.ssh/tad-driver` | Mobile Gateway PWA | Puerto: 80/443 |
| **tad-player** | `~/.ssh/tad-player` | Tablet Kiosk UI | Puerto: 80/443 |
| **tad-simulator** | `~/.ssh/tad-simulator` | Device Simulator | Puerto: 3001 |
| **tad-remotion** | `~/.ssh/tad-remotion` | Video Render Engine | Puerto: 3000 |

---

## 🔑 Generar Claves SSH

### 1. Generar Par de Claves para Cada Servicio

```bash
# Crear directorio de claves
mkdir -p ~/.ssh/tad-keys
cd ~/.ssh

# Generar todas las claves (RSA 4096-bit)
for service in api admin advertiser driver player simulator remotion; do
    ssh-keygen -t rsa -b 4096 \
        -f "tad-$service" \
        -C "tad-$service@easypanel" \
        -N ""  # Sin passphrase para automatización
done

# Verificar que se crearon
ls -la tad-*
# Esperado: 14 archivos (7 públicos .pub + 7 privados)
```

### 2. Configurar Permisos

```bash
# Las claves privadas deben tener permisos 600
chmod 600 tad-*
chmod 644 tad-*.pub

# Verificar
ls -la tad-* | grep -v ".pub"
# Esperado: -rw------- (600)
```

### 3. Guardar Fingerprints para Auditoría

```bash
# Generar fingerprints (útil para verificación)
for service in api admin advertiser driver player simulator remotion; do
    echo "=== tad-$service ==="
    ssh-keygen -l -f tad-$service.pub
done > ~/.ssh/tad-fingerprints.txt

# Guardar backup de la lista de claves
ls -la tad-* > ~/.ssh/tad-keys-backup.txt
```

---

## 📲 Registrar Claves en EasyPanel

### 1. Acceder al Dashboard de EasyPanel

1. Navega a tu panel de EasyPanel
2. Selecciona tu **Proyecto** (e.g., `proyecto_ia`)
3. Selecciona el **Servicio** (e.g., `tad-api`)

### 2. Agregar Clave SSH por Servicio

**Para cada servicio:**

1. Navega a **Settings > SSH Keys**
2. Click en **Add SSH Key**
3. Copia el contenido de la clave **pública** (`.pub`):
   ```bash
   cat ~/.ssh/tad-[servicio].pub
   ```
4. Pega en el campo **Public Key**
5. Asigna un label descriptivo:
   ```
   S1-[service]-prod-backup
   # Ejemplo: S1-api-prod-backup
   ```
6. Click **Save**

**Repite para todos los 7 servicios.**

### 3. Verificar Registro

```bash
# Desde tu máquina local, intenta conectar
ssh -i ~/.ssh/tad-api easypanel@your-easypanel-host

# Esperado: Acceso exitoso al servidor
# Comando de prueba:
ssh -i ~/.ssh/tad-api easypanel@your-easypanel-host "docker ps"
```

---

## 🔄 Operaciones Comunes con SSH

### Conectarse a un Servicio

```bash
# Conexión básica
ssh -i ~/.ssh/tad-api easypanel@your-easypanel-host

# Ejecutar comando único
ssh -i ~/.ssh/tad-api easypanel@your-easypanel-host "curl http://tad-api:3000/health"

# Con verbose para debuggear
ssh -v -i ~/.ssh/tad-api easypanel@your-easypanel-host
```

### Copiar Archivos (SCP)

```bash
# Descargar logs del servidor
scp -i ~/.ssh/tad-api easypanel@your-host:/var/log/docker/tad-api.log ./logs/

# Subir archivo de configuración
scp -i ~/.ssh/tad-api ./config.env easypanel@your-host:/app/config/
```

### Ver Logs del Servicio

```bash
# Ver últimos 100 líneas
ssh -i ~/.ssh/tad-api easypanel@your-host "docker logs tad-api | tail -100"

# Seguir logs en tiempo real (streaming)
ssh -i ~/.ssh/tad-api easypanel@your-host "docker logs -f tad-api"

# Ver logs con timestamp
ssh -i ~/.ssh/tad-api easypanel@your-host "docker logs --timestamps tad-api | tail -50"
```

### Restart de un Contenedor

```bash
# Reiniciar un servicio específico
ssh -i ~/.ssh/tad-[service] easypanel@your-host "docker restart tad-[service]"

# Reiniciar todos los servicios
ssh -i ~/.ssh/tad-api easypanel@your-host "docker restart tad-{api,admin,driver,player}"
```

### Verificar Estado de Recursos

```bash
# Ver consumo de CPU/RAM en tiempo real
ssh -i ~/.ssh/tad-api easypanel@your-host "docker stats --no-stream"

# Ver estado de un contenedor
ssh -i ~/.ssh/tad-api easypanel@your-host "docker ps -a | grep tad-"

# Ver inspección detallada
ssh -i ~/.ssh/tad-api easypanel@your-host "docker inspect tad-api"
```

---

## 🔧 Automatizar Deployments con SSH

### Script: Deploy Multi-Servicio

Crea `deploy-all-services.sh`:

```bash
#!/bin/bash

set -e  # Salir si hay error

SERVICES=("api" "admin" "advertiser" "driver" "player" "simulator" "remotion")
EASYPANEL_HOST="${1:-your-easypanel-host}"
SSH_KEY_DIR="$HOME/.ssh"
LOG_FILE="./deploy-$(date +%Y%m%d-%H%M%S).log"

echo "🚀 TAD DOOH Platform - Multi-Service Deploy"
echo "Host: $EASYPANEL_HOST"
echo "Log: $LOG_FILE"
echo "========================================"

# Función para ejecutar comando SSH con retry
ssh_exec() {
    local service=$1
    local command=$2
    local retries=3
    local count=0
    
    while [ $count -lt $retries ]; do
        if ssh -i "$SSH_KEY_DIR/tad-$service" "easypanel@$EASYPANEL_HOST" "$command"; then
            return 0
        fi
        count=$((count + 1))
        if [ $count -lt $retries ]; then
            echo "⚠️  Reintentando $service (intento $count/$retries)..."
            sleep 5
        fi
    done
    
    return 1
}

# Deployar en orden crítico
DEPLOY_ORDER=("api" "remotion" "admin" "advertiser" "driver" "player" "simulator")

for service in "${DEPLOY_ORDER[@]}"; do
    echo ""
    echo "📦 Deployando: $service"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # 1. Git pull
    echo "  1️⃣  Git pull..."
    if ! ssh_exec "$service" "cd /etc/easypanel/projects/proyecto_ia/tad-$service/code && git pull origin main"; then
        echo "  ❌ Error en git pull para $service" | tee -a "$LOG_FILE"
        continue
    fi
    
    # 2. Docker build
    echo "  2️⃣  Docker build..."
    if ! ssh_exec "$service" "cd /etc/easypanel/projects/proyecto_ia/tad-$service/code && docker buildx build --network host -f Dockerfile -t easypanel/$service:latest ."; then
        echo "  ❌ Error en build para $service" | tee -a "$LOG_FILE"
        continue
    fi
    
    # 3. Docker restart
    echo "  3️⃣  Restarting container..."
    if ! ssh_exec "$service" "docker restart tad-$service"; then
        echo "  ❌ Error en restart para $service" | tee -a "$LOG_FILE"
        continue
    fi
    
    # 4. Healthcheck
    echo "  4️⃣  Health check..."
    sleep 3  # Esperar que el contenedor inicie
    if ssh_exec "$service" "docker exec tad-$service curl -s http://localhost:3000/health > /dev/null"; then
        echo "  ✅ $service deployado correctamente" | tee -a "$LOG_FILE"
    else
        echo "  ⚠️  $service sin respuesta de health (puede estar iniciando)" | tee -a "$LOG_FILE"
    fi
    
    sleep 10  # Esperar entre servicios
done

echo ""
echo "✅ Deploy completado"
echo "📋 Revisa: $LOG_FILE"
```

### Usar el Script

```bash
# Dar permisos de ejecución
chmod +x deploy-all-services.sh

# Ejecutar deploy
./deploy-all-services.sh your-easypanel-host

# Con logging
./deploy-all-services.sh your-easypanel-host | tee deploy.log
```

---

## 🛡️ Seguridad de Claves SSH

### Mejores Prácticas

1. **Nunca commits claves privadas**
   ```bash
   # Agregar a .gitignore
   echo "tad-*" >> ~/.ssh/.gitignore
   echo "~/.ssh/tad-*" >> .gitignore
   ```

2. **Guardar backup encriptado**
   ```bash
   # Crear backup encriptado
   tar czf tad-keys-backup.tar.gz ~/.ssh/tad-*
   gpg --symmetric tad-keys-backup.tar.gz
   
   # Restaurar desde backup
   gpg --decrypt tad-keys-backup.tar.gz.gpg | tar xz -C ~/
   ```

3. **Rotar claves regularmente**
   - Cada 90 días es recomendado
   - Eliminar claves antiguas de EasyPanel
   - Generar nuevas y actualizar scripts

4. **Usar SSH Config para simplificar**
   ```bash
   # ~/.ssh/config
   Host easypanel-tad-api
       HostName your-easypanel-host
       User easypanel
       IdentityFile ~/.ssh/tad-api
       StrictHostKeyChecking accept-new
   
   Host easypanel-tad-admin
       HostName your-easypanel-host
       User easypanel
       IdentityFile ~/.ssh/tad-admin
   
   # ... repetir para otros servicios
   ```
   
   Luego conectar así:
   ```bash
   ssh easypanel-tad-api
   ```

---

## 🔍 Troubleshooting SSH

### Conexión Rechazada

```bash
# Verificar la clave SSH
ssh-keygen -l -f ~/.ssh/tad-api.pub

# Verificar conectividad básica
ping your-easypanel-host

# Intentar con verbose
ssh -vvv -i ~/.ssh/tad-api easypanel@your-host
```

### Permiso Denegado

```bash
# Verificar permisos de clave privada
ls -la ~/.ssh/tad-api
# Debe ser: -rw------- (600)

# Arreglar permisos
chmod 600 ~/.ssh/tad-api
chmod 644 ~/.ssh/tad-api.pub

# Verificar clave en EasyPanel
# Copiar la clave pública de nuevo y registrar
```

### Timeout

```bash
# Aumentar timeout en SSH
ssh -i ~/.ssh/tad-api \
    -o ConnectTimeout=30 \
    -o ServerAliveInterval=60 \
    -o ServerAliveCountMax=5 \
    easypanel@your-host

# O configurar en ~/.ssh/config
Host *
    ServerAliveInterval 60
    ServerAliveCountMax 5
    ConnectTimeout 30
```

---

## 📊 Auditoría de Claves

### Verificar Claves Registradas

```bash
# Listar todas las claves SSH
for service in api admin advertiser driver player simulator remotion; do
    echo "=== tad-$service ==="
    ssh -i ~/.ssh/tad-$service easypanel@your-host "grep 'SSH.*Key' /var/log/auth.log | tail -5"
done

# Buscar intentos fallidos
ssh -i ~/.ssh/tad-api easypanel@your-host \
    "grep 'Authentication failed' /var/log/auth.log | tail -20"
```

### Generar Reporte de Claves

```bash
#!/bin/bash

echo "TAD DOOH Platform - SSH Key Audit Report"
echo "Generated: $(date)"
echo "=================================================="

for service in api admin advertiser driver player simulator remotion; do
    KEY_PATH="$HOME/.ssh/tad-$service"
    if [ -f "$KEY_PATH" ]; then
        echo ""
        echo "Service: $service"
        echo "Key Path: $KEY_PATH"
        echo "Permissions: $(ls -l $KEY_PATH | awk '{print $1}')"
        echo "Fingerprint: $(ssh-keygen -l -f $KEY_PATH.pub 2>/dev/null | awk '{print $2}')"
        echo "Created: $(stat -c %y $KEY_PATH 2>/dev/null | cut -d' ' -f1)"
    fi
done
```

---

## 📚 Referencias

- **SSH Man Pages:** `man ssh`, `man ssh-keygen`
- **EasyPanel Docs:** https://docs.easypanel.io/
- **Best Practices:** https://stribny.name/blog/2015/01/ssh-keys/
