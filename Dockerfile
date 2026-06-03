# TAD DOOH Platform - Root Dockerfile Router
# Este archivo referencia el Dockerfile específico del servicio
# En monorepos, usar: docker build -f apps/[servicio]/Dockerfile .

# ⚠️ IMPORTANTE: Usa el Dockerfile específico de tu servicio:
# - Backend: docker build -f apps/api/Dockerfile -t tad-api .
# - Admin: docker build -f apps/admin/Dockerfile -t tad-admin .
# - Remotion: docker build -f apps/tad-remotion/Dockerfile -t tad-remotion .

# Para EasyPanel, configura correctamente:
# Build Method: Dockerfile
# Dockerfile Path: apps/api/Dockerfile (o el servicio correspondiente)

# No uses este archivo directamente
# Ver documentación: docs/DEPLOY_EASYPANEL.md

FROM busybox:latest
RUN echo "ERROR: Usa el Dockerfile específico de tu servicio en apps/[servicio]/Dockerfile"
