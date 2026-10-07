#!/usr/bin/env bash
# =============================================================================
# TAD DOOH Platform — Post-Deploy Verification Script
# =============================================================================
# Uso: ./scripts/verify-deploy.sh
# Requiere: curl, jq, dig
# =============================================================================

set -euo pipefail

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Dominios de producción
DOMAINS=(
    "tad.api.ibuisiness.com.do"
    "tad.adm.ibuisiness.com.do"
    "tad.anunciante.ibuisiness.com.do"
    "tad.driver.ibuisiness.com.do"
    "tad.player.ibuisiness.com.do"
    "tad.remotion.ibuisiness.com.do"
    "tad.simulator.ibuisiness.com.do"
)

API_BASE="https://tad.api.ibuisiness.com.do"

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  TAD DOOH Platform — Verificación Post-Deploy${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Función para verificar HTTP status
check_http() {
    local url=$1
    local expected=${2:-200}
    local name=$3
    
    local code
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000")
    
    if [[ "$code" == "$expected" ]]; then
        echo -e "${GREEN}✅ $name${NC} ($url) — HTTP $code"
        return 0
    else
        echo -e "${RED}❌ $name${NC} ($url) — HTTP $code (esperado: $expected)"
        return 1
    fi
}

# Función para verificar JSON response
check_json() {
    local url=$1
    local jq_filter=$2
    local name=$3
    
    local response
    response=$(curl -s --max-time 10 "$url" 2>/dev/null || echo "{}")
    
    if echo "$response" | jq -e "$jq_filter" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ $name${NC} — JSON válido"
        echo "$response" | jq "$jq_filter"
        return 0
    else
        echo -e "${RED}❌ $name${NC} — JSON inválido o filtro falló"
        echo "$response" | head -c 200
        echo ""
        return 1
    fi
}

# Función para verificar CORS
check_cors() {
    local origin=$1
    local endpoint=$2
    local name=$3
    
    local headers
    headers=$(curl -s -o /dev/null -D - \
        -H "Origin: $origin" \
        -H "Access-Control-Request-Method: POST" \
        -H "Access-Control-Request-Headers: Authorization,Content-Type" \
        -X OPTIONS \
        --max-time 10 \
        "$endpoint" 2>/dev/null || echo "")
    
    if echo "$headers" | grep -qi "access-control-allow-origin: $origin"; then
        echo -e "${GREEN}✅ CORS $name${NC} — Origin permitido: $origin"
        return 0
    else
        echo -e "${RED}❌ CORS $name${NC} — Origin BLOQUEADO: $origin"
        echo "$headers" | grep -i "access-control" || echo "  (sin headers CORS)"
        return 1
    fi
}

# Función para verificar DNS
check_dns() {
    local domain=$1
    local ip
    ip=$(dig +short "$domain" A | head -1)
    
    if [[ -n "$ip" ]]; then
        echo -e "${GREEN}✅ DNS $domain${NC} → $ip"
        return 0
    else
        echo -e "${RED}❌ DNS $domain${NC} — No resuelve"
        return 1
    fi
}

# Contadores
TOTAL=0
PASSED=0
FAILED=0

# =============================================================================
# 1. VERIFICACIÓN DNS
# =============================================================================
echo -e "${BLUE}📡 1. Verificando DNS...${NC}"
for domain in "${DOMAINS[@]}"; do
    ((TOTAL++))
    if check_dns "$domain"; then ((PASSED++)); else ((FAILED++)); fi
done
echo ""

# =============================================================================
# 2. VERIFICACIÓN HEALTH CHECKS
# =============================================================================
echo -e "${BLUE}🏥 2. Verificando Health Checks...${NC}"

((TOTAL++))
if check_http "$API_BASE/health" 200 "API Gateway"; then ((PASSED++)); else ((FAILED++)); fi

((TOTAL++))
if check_json "$API_BASE/health" '.status == "ok"' "API Health JSON"; then ((PASSED++)); else ((FAILED++)); fi

((TOTAL++))
if check_http "https://tad.adm.ibuisiness.com.do/" 200 "Admin Dashboard"; then ((PASSED++)); else ((FAILED++)); fi

((TOTAL++))
if check_http "https://tad.anunciante.ibuisiness.com.do/" 200 "Advertiser Portal"; then ((PASSED++)); else ((FAILED++)); fi

((TOTAL++))
if check_http "https://tad.driver.ibuisiness.com.do/" 200 "Driver Portal"; then ((PASSED++)); else ((FAILED++)); fi

((TOTAL++))
if check_json "https://tad.player.ibuisiness.com.do/health" '.status == "OK"' "Tablet Player"; then ((PASSED++)); else ((FAILED++)); fi

((TOTAL++))
if check_json "https://tad.remotion.ibuisiness.com.do/health" '.status == "ok" or .status == "healthy"' "Video Engine"; then ((PASSED++)); else ((FAILED++)); fi

echo ""

# =============================================================================
# 3. VERIFICACIÓN CORS (Crítico para que los portales funcionen)
# =============================================================================
echo -e "${BLUE}🔒 3. Verificando CORS (API Gateway)...${NC}"

CORS_ORIGINS=(
    "https://tad.adm.ibuisiness.com.do"
    "https://tad.anunciante.ibuisiness.com.do"
    "https://tad.driver.ibuisiness.com.do"
    "https://tad.player.ibuisiness.com.do"
    "https://tad.remotion.ibuisiness.com.do"
    "https://tad.simulator.ibuisiness.com.do"
)

for origin in "${CORS_ORIGINS[@]}"; do
    ((TOTAL++))
    if check_cors "$origin" "$API_BASE/api/v1/auth/login" "$origin"; then ((PASSED++)); else ((FAILED++)); fi
done
echo ""

# =============================================================================
# 4. VERIFICACIÓN SSL/TLS
# =============================================================================
echo -e "${BLUE}🔐 4. Verificando SSL/TLS...${NC}"

for domain in "${DOMAINS[@]}"; do
    ((TOTAL++))
    local cert_info
    cert_info=$(echo | openssl s_client -connect "$domain:443" -servername "$domain" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null || echo "")
    
    if [[ -n "$cert_info" ]]; then
        local not_after
        not_after=$(echo "$cert_info" | grep "notAfter" | cut -d= -f2)
        echo -e "${GREEN}✅ SSL $domain${NC} — Expira: $not_after"
        ((PASSED++))
    else
        echo -e "${RED}❌ SSL $domain${NC} — No se pudo verificar certificado"
        ((FAILED++))
    fi
done
echo ""

# =============================================================================
# 5. VERIFICACIÓN REDIRECTS (Frontends)
# =============================================================================
echo -e "${BLUE}🔄 5. Verificando Redirects...${NC}"

((TOTAL++))
# Admin: / → /login
redirect=$(curl -s -o /dev/null -w "%{redirect_url}" "https://tad.adm.ibuisiness.com.do/" --max-time 10)
if [[ "$redirect" == *"login"* ]]; then
    echo -e "${GREEN}✅ Admin Redirect${NC} / → /login"
    ((PASSED++))
else
    echo -e "${RED}❌ Admin Redirect${NC} / → $redirect (esperado: /login)"
    ((FAILED++))
fi

((TOTAL++))
# Driver: / → /driver/login
redirect=$(curl -s -o /dev/null -w "%{redirect_url}" "https://tad.driver.ibuisiness.com.do/" --max-time 10)
if [[ "$redirect" == *"driver/login"* ]]; then
    echo -e "${GREEN}✅ Driver Redirect${NC} / → /driver/login"
    ((PASSED++))
else
    echo -e "${RED}❌ Driver Redirect${NC} / → $redirect (esperado: /driver/login)"
    ((FAILED++))
fi

((TOTAL++))
# Advertiser: / → /login
redirect=$(curl -s -o /dev/null -w "%{redirect_url}" "https://tad.anunciante.ibuisiness.com.do/" --max-time 10)
if [[ "$redirect" == *"login"* ]]; then
    echo -e "${GREEN}✅ Advertiser Redirect${NC} / → /login"
    ((PASSED++))
else
    echo -e "${RED}❌ Advertiser Redirect${NC} / → $redirect (esperado: /login)"
    ((FAILED++))
fi
echo ""

# =============================================================================
# 6. VERIFICACIÓN API ENDPOINTS CRÍTICOS
# =============================================================================
echo -e "${BLUE}🔌 6. Verificando Endpoints API Críticos...${NC}"

# Sync endpoint (tablets)
((TOTAL++))
if check_http "$API_BASE/api/v1/sync/manifest" 401 "Sync Manifest (401 esperado sin auth)"; then ((PASSED++)); else ((FAILED++)); fi

# Device registration
((TOTAL++))
if check_http "$API_BASE/api/v1/devices/register" 401 "Device Register (401 esperado sin auth)"; then ((PASSED++)); else ((FAILED++)); fi

# Campaigns list
((TOTAL++))
if check_http "$API_BASE/api/v1/campaigns" 401 "Campaigns List (401 esperado sin auth)"; then ((PASSED++)); else ((FAILED++)); fi

# Drivers list
((TOTAL++))
if check_http "$API_BASE/api/v1/drivers" 401 "Drivers List (401 esperado sin auth)"; then ((PASSED++)); else ((FAILED++)); fi

echo ""

# =============================================================================
# RESUMEN FINAL
# =============================================================================
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  RESUMEN DE VERIFICACIÓN${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "Total checks:  $TOTAL"
echo -e "${GREEN}Pasaron:       $PASSED${NC}"
echo -e "${RED}Fallaron:      $FAILED${NC}"

if [[ $FAILED -eq 0 ]]; then
    echo -e "${GREEN}🎉 TODOS LOS CHECKS PASARON — Deploy exitoso${NC}"
    exit 0
else
    echo -e "${RED}⚠️  HAY $FAILED FALLOS — Revisar logs y configuración${NC}"
    echo ""
    echo -e "${YELLOW}Próximos pasos:${NC}"
    echo "  1. Revisar logs en EasyPanel: Container → Logs"
    echo "  2. Verificar variables de entorno en cada servicio"
    echo "  3. Confirmar redeploy después de cambios"
    echo "  4. Verificar DNS y certificados SSL en Cloudflare/EasyPanel"
    exit 1
fi