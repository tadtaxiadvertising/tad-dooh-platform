#!/bin/sh
set -e

echo "Iniciando TAD Player (Next.js Standalone)..."
# Inicia el player en segundo plano
node /app/server.js &

echo "Iniciando Nginx para proxy y health checks..."
# Inicia Nginx en primer plano para mantener el contenedor vivo
# y que Easypanel pueda monitorizar el proceso PID 1
nginx -g 'daemon off;'
