#!/usr/bin/env bash
# ============================================================================
# verify-deployment.sh — Verificación post-deploy TAD DOOH Platform
# Portable: funciona desde cualquier checkout, sin rutas locales hardcodeadas.
# Uso: bash verify-deployment.sh
# ============================================================================
set -uo pipefail

# Target only the advertiser, or all TAD domains by default.
if (( $# > 1 )); then
  echo "Uso: bash verify-deployment.sh [--advertiser-only]" >&2
  exit 2
fi
MODE="${1:-all}"
case "$MODE" in
  all|--advertiser-only) ;;
  *) echo "Uso: bash verify-deployment.sh [--advertiser-only]" >&2; exit 2 ;;
esac


GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ENV_ROOT="${ENV_ROOT:-$ROOT_DIR/apps}"
API_URL="${API_URL:-https://tad.api.ibusiness.com.do}"
DRIVER_URL="${DRIVER_URL:-https://tad.driver.ibusiness.com.do}"
DRIVE_URL="${DRIVE_URL:-https://tad.drive.ibusiness.com.do}" # Optional alias for the driver portal
PLAYER_URL="${PLAYER_URL:-https://tad.player.ibusiness.com.do}"
ADMIN_URL="${ADMIN_URL:-https://tad.adm.ibusiness.com.do}"
ADVERTISER_URL="https://tad.anunciante.ibusiness.com.do" # Canonical release fingerprint is intentionally fixed

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
  if [[ "$code" =~ ^2[0-9][0-9]$ ]]; then
    pass "$name responde correctamente por HTTPS (HTTP $code)"
  else
    fail "$name no responde correctamente por HTTPS" "URL: $url; HTTP: $code"
  fi
}
 
check_cors_origin() {
  local origin="$1"
  local response code allowed_origin
  response="$(curl --silent --show-error --max-time 10 --dump-header - --output /dev/null \
    --write-out '|%{http_code}' --request OPTIONS \
    --header "Origin: $origin" \
    --header "Access-Control-Request-Method: POST" \
    --header "Access-Control-Request-Headers: authorization,content-type" \
    "${API_URL%/}/api/v1/auth/login" 2>/dev/null)" || response='|000'
  code="$(printf '%s' "$response" | tail -n 1 | sed 's/.*|//')"
  allowed_origin="$(printf '%s\n' "$response" | awk 'tolower($1) == "access-control-allow-origin:" { gsub("\r", "", $2); print $2; exit }')"
  if [[ "$code" =~ ^2[0-9][0-9]$ && "$allowed_origin" == "$origin" ]]; then
    pass "CORS permite $origin (HTTP $code)"
  else
    fail "CORS no permite $origin" "HTTP: $code; Access-Control-Allow-Origin: ${allowed_origin:-ausente}"
  fi
}

check_advertiser_release() {
  if ! command -v node >/dev/null 2>&1; then
    fail "No se verificó la versión del anunciante" "Node.js es obligatorio; no se puede aprobar el release sin él."
    return
  fi
  if [[ ! -f "$ROOT_DIR/scripts/advertiser-release-drift.cjs" ]]; then
    fail "No se verificó la versión del anunciante" "Falta scripts/advertiser-release-drift.cjs en este checkout."
    return
  fi
  node "$ROOT_DIR/scripts/advertiser-release-drift.cjs"
  local release_status=$?
  case "$release_status" in
    0) pass "Advertiser entrega TAD Motion V6 en el dominio público" ;;
    2) fail "Advertiser entrega HTML anterior o no reconocido" "Revisa EasyPanel tad-advertiser: rama main, Dockerfile.advertiser, commit activo y proxy. No reinicies API/Player." ;;
    *) fail "No se pudo verificar la versión pública del anunciante" "Revisa DNS, TLS, HTTP y logs de tad-advertiser. No implica una versión antigua." ;;
  esac
}

check_result() {
  echo
  printf 'Resumen: OK: %s | Fallos: %s | Advertencias: %s\n' "$PASSED" "$FAILED" "$WARNINGS"
  if (( FAILED > 0 )); then
    echo "Resultado: verificación fallida."
    exit 1
  fi
  echo "Resultado: sin fallos detectados en las comprobaciones ejecutadas."
}

if [[ "$MODE" == "--advertiser-only" ]]; then
  echo "TAD Advertiser — verificación de despliegue"
  check_domain "Advertiser" "$ADVERTISER_URL"
  if command -v curl >/dev/null 2>&1; then
    check_https "Advertiser" "$ADVERTISER_URL"
  else
    fail "No se verificó HTTPS del anunciante" "curl es obligatorio."
  fi
  check_advertiser_release
  check_result
  exit 0
fi

echo
echo "TAD DOOH Platform — verificación de despliegue"
echo "Raíz del repositorio: $ROOT_DIR"
echo

echo "1. DNS"
check_domain "API" "$API_URL"
check_domain "Admin" "$ADMIN_URL"
check_domain "Advertiser" "$ADVERTISER_URL"
check_domain "Driver (canónico)" "$DRIVER_URL"
check_domain "Drive (alias)" "$DRIVE_URL"
check_domain "Player" "$PLAYER_URL"
echo

echo "2. HTTPS / respuesta HTTP"
if command -v curl >/dev/null 2>&1; then
  check_https "API health" "${API_URL%/}/api/health"
  check_https "Admin" "$ADMIN_URL"
  check_https "Advertiser" "$ADVERTISER_URL"
  check_https "Driver (canónico)" "$DRIVER_URL"
  check_https "Drive (alias)" "$DRIVE_URL"
  check_https "Player health" "${PLAYER_URL%/}/health"
  echo
  echo "3. CORS de los portales"
  check_cors_origin "$ADMIN_URL"
  check_cors_origin "$DRIVER_URL"
  check_cors_origin "$DRIVE_URL"
  check_cors_origin "$PLAYER_URL"
  check_cors_origin "$ADVERTISER_URL"
else
  fail "No se verificó HTTPS" "curl es obligatorio para validar la publicación."
fi
echo

echo "4. Versión pública del anunciante (verificación semántica, no basta HTTP 200)"
check_advertiser_release
echo

echo "5. Configuración local (solo archivos existentes)"
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

check_result
