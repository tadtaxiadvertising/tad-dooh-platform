#!/bin/bash
# ============================================================================
#  monitor-deployment.sh — Monitoreo continuo de servicios TAD DOOH
#  Uso: ./monitor-deployment.sh [--interval 30] [--once]
# ============================================================================

set -euo pipefail

INTERVAL=30
ONCE=false

# Parseear argumentos
while [[ $# -gt 0 ]]; do
  case "$1" in
    --interval)
      INTERVAL="$2"
      shift 2
      ;;
    --once)
      ONCE=true
      shift
      ;;
    *)
      echo "Uso: $0 [--interval 30] [--once]"
      exit 1
      ;;
  esac
done

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${CYAN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"; }

error() { echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] [ERROR]${NC} $1"; }
warn() { echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] [WARN]${NC} $1"; }
success() { echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] [OK]${NC} $1"; }

declare -A SERVICES=(
  ["tad.adm.ibusiness.com.do"]="Admin"
  ["tad.api.ibusiness.com.do"]="API"
  ["tad.driver.ibusiness.com.do"]="Driver"
  ["tad.player.ibusiness.com.do"]="Player"
)

declare -A HEALTH_ENDPOINTS=(
  ["tad.api.ibusiness.com.do"]="/api/v1/health"
  ["tad.player.ibusiness.com.do"]="/health"
  ["tad.driver.ibusiness.com.do"]="/"
  ["tad.adm.ibusiness.com.do"]="/admin/login"
)

declare -A EXPECTED_CODES=(
  ["tad.api.ibusiness.com.do"]="200"
  ["tad.player.ibusiness.com.do"]="200"
  ["tad.driver.ibusiness.com.do"]="301"
  ["tad.adm.ibusiness.com.do"]="301"
)

declare -A ERRORS=0

log "Iniciando monitoreo de servicios TAD DOOH..."

while true; do
  clear
  echo "══════════════════════════════════════════════════"
  echo "  📊 Monitoreo TAD DOOH Platform"
  echo "  Última verificación: $(date '+%Y-%m-%d %H:%M:%S')"
  echo "  Intervalo: ${INTERVAL}s"
  echo "══════════════════════════════════════════════════"
  echo ""

  for domain in "${!SERVICES[@]}"; do
    service=${SERVICES[$domain]}
    health_endpoint=${HEALTH_ENDPOINTS[$domain]}
    expected_code=${EXPECTED_CODES[$domain]}

    response=$(curl -sk -o /dev/null -w "%{http_code}" --max-time 5 "https://${domain}${health_endpoint}" 2>/dev/null)

    if [[ "$response" == "$expected_code" ]]; then
      success "  ${service} (${domain}) → HTTP ${response}"
    else
      error "  ${service} (${domain}) → HTTP ${response} (esperado ${expected_code})"
      ((ERRORS++))
    fi
  done

  echo ""
  echo "────────────────────────────"
  if [[ $ERRORS -eq 0 ]]; then
    success "Todos los servicios operativos ✓"
  else
    warn "${ERRORS} servicio(s) con errores"
  fi
  echo "────────────────────────────"
  echo ""

  if [[ "$ONCE" == true ]]; then
    break
  fi

  sleep $INTERVAL
done
