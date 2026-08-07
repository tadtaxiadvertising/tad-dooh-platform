#!/bin/sh
set -e

# Usar PORT del entorno (Easypanel pasa 80) o default 3000
PORT="${PORT:-3000}"

# Ejecutar con --port explícito para que Next.js use el puerto correcto
exec node apps/driver/server.js --port "$PORT"