#!/bin/bash
# ============================================================================
#  alert-email.sh — Alertas de fallos de servicios TAD DOOH
#  Uso: ./alert-email.sh "Servicio X falló" "Detalle del error"
# ============================================================================

set -euo pipefail

# Configuración de SMTP (edita estas variables)
SMTP_HOST="smtp-relay.brevo.com"
SMTP_PORT="587"
SMTP_USER="aa9dec001@smtp-brevo.com"
SMTP_PASSWORD="xsmtps...ILOc"
SENDER_EMAIL="no-reply@tad.do"
RECEIVER_EMAIL="arismendy@tad.do"

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${CYAN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"; }

send_alert() {
  local service="$1"
  local status="$2"
  local details="$3"

  local subject="🔴 [TAD DOOH] ${status} — ${service}"
  local body="Se ha producido un fallo grave en el servicio TAD DOOH.

⏰ Fecha: $(date '+%Y-%m-%d %H:%M:%S')
📧 Servicio: ${service}
📊 Estado: ${status}
📝 Detalles: ${details}

⚠️  Este es un correo automático. Por favor, revisa inmediatamente la configuración en Easypanel.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔗 Enlaces de diagnóstico:
• Easypanel → Services
• Logs del servicio
• Configuración de entorno
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  echo "Enviando alerta a ${RECEIVER_EMAIL}..."
  echo "Asunto: $subject"
  echo "Cuerpo: $body"

  # Enviar correo
  curl -s --ssl-reqd \
    -X POST "${SMTP_HOST}:${SMTP_PORT}/api/v2/emails/send" \
    -u "${SMTP_USER}:${SMTP_PASSWORD}" \
    -H "Accept: application/json" \
    -H "Content-Type: application/json" \
    -d "{
      \"sender\": {\"name\": \"TAD DOOH\", \"email\": \"${SENDER_EMAIL}\"},
      \"to\": [{\"email\": \"${RECEIVER_EMAIL}\", \"name\": \"Admin TAD\"}],
      \"subject\": \"${subject}\",
      \"text\": \"${body}\",
      \"html\": \"<h2>🔴 Alertas de Servicios TAD DOOH</h2>\
        <p><strong>Fecha:</strong> $(date '+%Y-%m-%d %H:%M:%S')</p>\
        <p><strong>Servicio:</strong> ${service}</p>\
        <p><strong>Estado:</strong> ${status}</p>\
        <p><strong>Detalles:</strong> ${details}</p>\
        <hr/>\
        <p>Enlinas de diagnóstico:</p>\
        <ul></ul>\
        <p>Este es un correo automático. Por favor, revisa inmediatamente.</p>\"\
    }" | head -5

  if [[ $? -eq 0 ]]; then
    echo -e "${GREEN}[OK]${NC} Alerta enviada a ${RECEIVER_EMAIL}"
  else
    echo -e "${RED}[ERROR]${NC} Error al enviar alerta"
  fi
}

if [[ $# -lt 2 ]]; then
  echo "Uso: $0 \"Servicio\" \"Estado\" \"Detalles\""
  echo "Ejemplo: $0 \"tad.driver\" \"FALLIDO\" \"Timeout en /health\""
  exit 1
fi

send_alert "$1" "$2" "$3"
