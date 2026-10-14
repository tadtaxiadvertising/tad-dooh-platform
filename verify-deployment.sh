#!/usr/bin/env bash
# ============================================================================
# verify-deployment.sh — Verificación post-deploy TAD DOOH Platform
# Portable: funciona desde cualquier checkout, sin rutas locales hardcodeadas.
# Uso: bash verify-deployment.sh
# ============================================================================
set -uo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ENV_ROOT="${ENV_ROOT:-$ROOT_DIR/apps}"
API_URL="${API_URL:-https://tad.api.ibusiness.com.do}"
DRIVER_URL="${DRIVER_URL:-https://tad.driver.ibusiness.com.do}"
PLAYER_URL="${PLAYER_URL:-https://tad.player.ibusiness.com.do}"
ADMIN_URL="${ADMIN_URL:-https://tad.adm.ibusiness.com.do}"

PASSED=0
FAILED=0
WARNINGS=0

pass() { printf "  ${GREEN}✓${NC} %s\n" "$1"; PASSED=$((PASSED + 1)); }
fail() { printf "  ${RED}✗${NC} %s\n    Detalle: %s\n" "$1" "$2"; FAILED=$((FAILED + 1)); }
warn() { printf "  ${YELLOW}⚠${NC} %s\n" "$1"; WARNINGS=$((WARNINGS + 1)); }

check_domain() {
  local name="$1"
  local url="$2"
  local domain="${url#https://}"
  domain="${domain%%/*}"
  printf "  [%s] DNS %s... " "$name" "$domain"
  if command -v getent >/dev/null 2>&1 && getent hosts "$domain" >/dev/null 2>&1; then
    pass "DNS resuelve para $domain"
  elif command -v dig >/dev/null 2>&1 && [[ -n "$(dig +short "$domain" 2>/dev/null | head -n 1)" ]]; then
    pass "DNS resuelve para $domain"
  else
    fail "DNS no resuelve para $domain" "Verifica el registro DNS y el dominio configurado en EasyPanel."
  fi
}

check_https() {
  local name="$1"
  local url="$2"
  local code
  code="$(curl --silent --show-error --location --max-time 10 --output /dev/null --write-out '%{http_code}' "$url" 2>/dev/null)" || code="000"
  if [[ "$code" =~ ^[2-4][0-9][0-9]$ ]]; then
    pass "$name responde por HTTPS (HTTP $code)"
  else
    fail "$name no responde correctamente por HTTPS" "URL: $url; HTTP: $code"
  fi
}

echo
echo "TAD DOOH Platform — verificación de despliegue"
echo "Raíz del repositorio: $ROOT_DIR"
echo

echo "1. DNS"
check_domain "API" "$API_URL"
check_domain "Admin" "$ADMIN_URL"
check_domain "Driver" "$DRIVER_URL"
check_domain "Player" "$PLAYER_URL"
echo

echo "2. HTTPS / respuesta HTTP"
if command -v curl >/dev/null 2>&1; then
  check_https "API health" "${API_URL%/}/api/health"
  check_https "Admin" "$ADMIN_URL"
  check_https "Driver" "$DRIVER_URL"
  check_https "Player health" "${PLAYER_URL%/}/health"
else
  warn "curl no está instalado; se omiten las comprobaciones HTTPS."
fi
echo

echo "3. Configuración local (solo archivos existentes)"
env_files_found=0
for app in admin driver player; do
  env_file="$ENV_ROOT/$app/.env"
  [[ -f "$env_file" ]] || continue
  env_files_found=$((env_files_found + 1))
  if grep -q "ibuisiness" "$env_file"; then
    fail "Dominio mal escrito en $env_file" "Corrige el hostname y vuelve a compilar el frontend."
  elif grep -Eq '^(NEXT_PUBLIC_API_URL|VITE_API_URL|API_BASE_URL)=' "$env_file"; then
    pass "Variable API presente en $env_file"
  else
    fail "Falta variable de API en $env_file" "Configura la URL correspondiente al tipo de aplicación."
  fi
done
if [[ "$env_files_found" -eq 0 ]]; then
  warn "No se encontraron .env locales bajo $ENV_ROOT; las variables de EasyPanel no pueden verificarse desde este equipo."
fi
echo

echo "4. Resumen"
printf "  OK: %s | Fallos: %s | Advertencias: %s\n" "$PASSED" "$FAILED" "$WARNINGS"
if [[ "$FAILED" -gt 0 ]]; then
  echo "Resultado: verificación fallida."
  exit 1
fi
echo "Resultado: sin fallos detectados en las comprobaciones ejecutadas."
