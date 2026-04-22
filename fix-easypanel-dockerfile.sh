#!/bin/bash
# fix-easypanel-dockerfile.sh
# Script para diagnosticar y reparar problemas de Dockerfile en EasyPanel

set -e

echo "🔧 TAD DOOH Platform - EasyPanel Dockerfile Fixer"
echo "=================================================="
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir secciones
print_section() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# 1. Verificar Dockerfiles locales
print_section "1️⃣  Verificando Dockerfiles locales"

declare -A SERVICES=(
    ["tad-api"]="apps/api/Dockerfile"
    ["tad-admin"]="apps/admin/Dockerfile"
    ["tad-advertiser"]="apps/advertiser/Dockerfile"
    ["tad-driver"]="apps/driver/Dockerfile"
    ["tad-player"]="apps/tablet-player/Dockerfile"
    ["tad-simulator"]="apps/tad-simulator/Dockerfile"
    ["tad-remotion"]="apps/tad-remotion/Dockerfile"
)

MISSING_COUNT=0

for service in "${!SERVICES[@]}"; do
    dockerfile="${SERVICES[$service]}"
    if [ -f "$dockerfile" ]; then
        echo -e "${GREEN}✓${NC} $service: $dockerfile"
    else
        echo -e "${RED}✗${NC} $service: $dockerfile ${RED}(NO ENCONTRADO)${NC}"
        ((MISSING_COUNT++))
    fi
done

echo ""
if [ $MISSING_COUNT -eq 0 ]; then
    echo -e "${GREEN}✅ Todos los Dockerfiles están presentes${NC}"
else
    echo -e "${RED}❌ Faltan $MISSING_COUNT Dockerfile(s)${NC}"
    exit 1
fi

echo ""

# 2. Mostrar configuración esperada en EasyPanel
print_section "2️⃣  Configuración esperada en EasyPanel"

echo "Para cada servicio, establece:"
echo ""

for service in "${!SERVICES[@]}"; do
    dockerfile="${SERVICES[$service]}"
    echo -e "${YELLOW}$service:${NC}"
    echo "  Build Method: Dockerfile"
    echo "  Dockerfile Path: $dockerfile"
    echo "  Working Directory: . (raíz del repositorio)"
    echo ""
done

# 3. Verificar que es un monorepo
print_section "3️⃣  Verificando estructura de monorepo"

if [ -d "apps" ]; then
    APP_COUNT=$(find apps -maxdepth 1 -type d | wc -l)
    echo -e "${GREEN}✓${NC} Estructura de monorepo detectada"
    echo "  Directorio 'apps/' encontrado con $(($APP_COUNT - 1)) subdirectorios"
else
    echo -e "${RED}✗${NC} No se encuentra el directorio 'apps/'"
    exit 1
fi

# 4. Mostrar instrucciones de EasyPanel
print_section "4️⃣  Instrucciones para EasyPanel"

cat << 'EOF'
📋 PASOS EN EL DASHBOARD DE EASYPANEL:

1. Navega a: https://ibusiness.com.do/projects/proyecto_ia
2. Selecciona el servicio que falla (e.g., tad-api)
3. Click en "Settings" o "Configuration"
4. Busca el campo "Dockerfile Path"
5. Cambia el valor a la ruta correcta (ver tabla arriba)
6. Click en "Save" o "Update"
7. Click en "Force Redeploy" para reconstruir

⚠️ IMPORTANTE:
   - No uses "/Dockerfile"
   - No uses "Dockerfile.api"
   - Usa: "apps/api/Dockerfile" (para tad-api)
   - Usa: "apps/admin/Dockerfile" (para tad-admin)
   - etc.

EOF

# 5. Mostrar configuración Docker local
print_section "5️⃣  Para construir localmente (testing)"

cat << 'EOF'
Para verificar que tu Dockerfile funciona antes de subir a producción:

# Build local
docker build -f apps/api/Dockerfile -t tad-api:test .
docker build -f apps/admin/Dockerfile -t tad-admin:test .

# Run
docker run -p 3000:3000 tad-api:test
docker run -p 3001:3000 tad-admin:test

EOF

# 6. Crear archivo de referencia
print_section "6️⃣  Creando archivos de referencia"

DOCKERFILE_PATHS_FILE="DOCKERFILE_PATHS.txt"

{
    echo "# Rutas de Dockerfile para EasyPanel"
    echo "# Generado: $(date)"
    echo ""
    for service in "${!SERVICES[@]}"; do
        dockerfile="${SERVICES[$service]}"
        echo "Service: $service"
        echo "Dockerfile Path: $dockerfile"
        echo ""
    done
} > "$DOCKERFILE_PATHS_FILE"

echo -e "${GREEN}✓${NC} Archivo creado: $DOCKERFILE_PATHS_FILE"

# 7. Resumen
print_section "✅ Resumen"

cat << 'EOF'
PRÓXIMOS PASOS:

1. ✅ Asegúrate de que todos los Dockerfiles existen (ver arriba)
2. ✅ Ve a EasyPanel Dashboard
3. ✅ Para cada servicio, establece la ruta correcta en "Dockerfile Path"
4. ✅ Click en "Force Redeploy"
5. ✅ Monitorea los logs de build

Si aún hay problemas, verifica:
- $ git status (asegúrate de que todo está committed)
- $ git log -1 (verifica el commit más reciente)
- EasyPanel > Services > Build Logs (busca errores específicos)

Documentación: docs/DEPLOY_EASYPANEL.md
EOF

echo ""
