#!/bin/bash
# ============================================================================
#  verify-deployment.sh — Verificación post-deploy TAD DOOH Platform
#  Uso: chmod +x verify-deployment.sh && ./verify-deployment.sh
# ============================================================================

set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  TAD DOOH Platform - Deploy Verification  ║"
echo "╚══════════════════════════════════════════╝"
echo ""

PASSED=0
FAILED=0

pass() { echo -e "  ${GREEN}✓${NC} $1"; ((PASSED++)); }
fail() { echo -e "  ${RED}✗${NC} $1"; echo "    Detalle: $2"; ((FAILED++)); }

echo "── 1. Verificación de Dominios ────────────────"
echo "   (Revisa si los dominios están configurados en Easypanel)"

check_domain() {
  local name="$1"
  local domain="$2"
  local expected="$3"
  
  echo -n "   [?] $name ($domain)... "
  
  # Verificar DNS
  local dns_result
  dns_result=$(dig +short "$domain" 2>/dev/null | head -1)
  
  if [[ -n "$dns_result" ]]; then
    echo -e "${GREEN}✓ DNS resuelta${NC}"
    echo "      IP: $dns_result"
  else
    echo -e "${YELLOW}⚠ DNS NO resuelto${NC}"
    echo "      Añade el dominio en Easypanel → Domains"
  fi
}

check_domain "Driver" "tad.driver.ibusiness.com.do"
check_domain "Player" "tad.player.ibusiness.com.do"
check_domain "Admin" "tad.adm.ibusiness.com.do"
check_domain "API" "tad.api.ibusiness.com.do"

echo ""
echo "── 2. Verificación de Servicios Locales ────────"
echo "   (Solo si tienes los servicios corriendo localmente)"

# Verificar API local
echo -n "   [1/3] API en puerto 3000... "
if curl -s http://localhost:3000/api/v1/health 2>/dev/null | grep -q "OK"; then
  pass "API corriendo en puerto 3000"
else
  fail "API no responde" "ejecuta 'cd apps/api && npm run start'"
fi

# Verificar Driver local (si está en otro puerto)
echo -n "   [2/3] Driver en puerto 3001... "
if curl -s http://localhost:3001/driver/login 2>/dev/null | grep -q "login"; then
  pass "Driver corriendo en puerto 3001"
else
  echo -e "${YELLOW}⚠ Driver no corriendo en 3001${NC}"
  echo "      Inicia con: cd apps/driver && npm run dev"
fi

# Verificar Player local (si está en otro puerto)
echo -n "   [3/3] Player en puerto 3002... "
if curl -s http://localhost:3002/health 2>/dev/null | grep -q "OK"; then
  pass "Player corriendo en puerto 3002"
else
  echo -e "${YELLOW}⚠ Player no corriendo en 3002${NC}"
  echo "      Inicia con: cd apps/player && npm run dev"
fi

echo ""
echo "── 3. Verificación de Configuración ────────────"

# Verificar correcciones de typos
echo -n "   [1/4] Typo 'ibuisiness' corregida en .env... "
if grep -r "ibuisiness" /c/tad-dooh-platform/apps/*/.env 2>/dev/null | grep -q "ibuisiness"; then
  fail "Typo aún presente" "corrige con: sed -i 's/ibuisiness/ibusiness/g' apps/*/.env"
else
  pass "Typo corregida"
fi

echo -n "   [2/4] API URL correcta... "
if grep -r "NEXT_PUBLIC_API_URL" /c/tad-dooh-platform/apps/*/.env 2>/dev/null | grep -q "ibusiness.com.do"; then
  pass "API URL correcta (ibusiness.com.do)"
else
  fail "API URL incorrecta" "correge con: sed -i 's/ibuisiness/ibusiness/g' apps/*/.env"
fi

echo -n "   [3/4] Variables de entorno completas... "
missing=0
for env_file in /c/tad-dooh-platform/apps/{admin,driver,player}/.env; do
  if [[ -f "$env_file" ]] && ! grep -q "NEXT_PUBLIC_API_URL" "$env_file"; then
    ((missing++))
  fi
done
if [[ $missing -eq 0 ]]; then
  pass "Variables completas"
else
  fail "Variables incompletas" "falta(s) $missing"
fi

echo -n "   [4/4] SSL certificates... "
if openssl s_client -connect tad.api.ibusiness.com.do:443 -servername tad.api.ibusiness.com.do </dev/null 2>&1 | grep -q "Verify return code: 0"; then
  pass "SSL válido"
else
  echo -e "${YELLOW}⚠ SSL autofirmado${NC}"
  echo "      Fix: EasyPanel → Caddy/Traefik → Auto-generate SSL"
fi

echo ""
echo "────────────────────────────"
echo -e "  Resultado: ${GREEN}${PASSED} OK${NC} / ${RED}${FAILED} fallidos${NC}"
echo "────────────────────────────"

if [[ $FAILED -gt 0 ]]; then
  echo ""
  echo "❌ Algunos servicios no están completamente configurados."
  echo "   Revisa los logs de Easypanel antes de continuar."
  exit 1
else
  echo "✅ Todos los servicios están verificados."
  exit 0
fi
