#!/bin/bash
# ============================================================================
#  alert-monitor.sh — Monitoreo con alertas automáticas
#  Uso: ./alert-monitor.sh [--interval 60] [--once]
# ============================================================================

set -euo pipefail

INTERVAL=60
ONCE=false
EMAIL_ENABLED=true

while [[ $# -gt 0 ]]; do
  case "$1" in
    --interval) INTERVAL="$2"; shift 2;;
    --once) ONCE=true; shift;;
    --no-email) EMAIL_ENABLED=false; shift;;
    *) echo "Uso: $0 [--interval 60] [--once] [--no-email]"; exit 1;;
  esac
done

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${CYAN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"; }
error() { echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] [ERROR]${NC} $1"; }

services=(
  "tad.adm.ibusiness.com.do|/admin/login|301|Admin"
  "tad.api.ibusiness.com.do|/api/v1/health|200|API"
  "tad.driver.ibusiness.com.do|/driver/login|200|Driver"
  "tad.player.ibusiness.com.do|/health|200|Player"
)

declare -A last_error
declare -A alert_sent

while true; do
  clear
  echo "══════════════════════════════════════════════════"
  echo "  📊 Monitoreo TAD DOOH with Alertas"
  echo "  Intervalo: ${INTERVAL}s | Alertas: ${EMAIL_ENABLED}"
  echo "══════════════════════════════════════════════════"
  echo ""

  for service_config in "${services[@]}"; do
    IFS='|' read -r domain path expected status <<< "$service_config"

    response=$(curl -sk -o /dev/null -w "%{http_code}" --max-time 5 "https://${domain}${path}" 2>/dev/null)

    if [[ "$response" == "$expected" ]]; then
      success "  ${service_config#*|} (${domain}) → HTTP ${response}"
    else
      error "  ${service_config#*|} (${domain}) → HTTP ${response} (esperado ${expected})"
      # Enviar alerta
      if [[ "$EMAIL_ENABLED" == true ]] && [[ "${alert_sent[$domain]}" != "sent" ]]; then
        log "Enviando alerta por correo..."
        ./alert-email.sh "${service_config#*|}" "FALLIDO" "HTTP ${response} (esperado ${expected})"
        alert_sent[$domain]="sent"
      fi
    fi
  done

  if [[ "$ONCE" == true ]]; then
    break
  fi

  sleep $INTERVAL
done
