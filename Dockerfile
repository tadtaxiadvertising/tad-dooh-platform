# TAD DOOH Platform - Root Dockerfile Router
# Este archivo NO es una imagen real (busybox de guardia).
# Los Dockerfiles canónicos viven en la RAÍZ del monorepo:
# - Backend:   docker build -f Dockerfile.api -t tad-api .
# - Admin:     docker build -f Dockerfile.admin -t tad-admin .
# - Advertiser: docker build -f Dockerfile.advertiser -t tad-advertiser .
# - Driver:    docker build -f Dockerfile.driver -t tad-driver .
# - Driver App: docker build -f Dockerfile.driver.app -t tad-driver-app .
# - Player:    docker build -f Dockerfile.player -t tad-player .
# - Agents:    docker build -f Dockerfile.agents -t tad-agents .
# - Remotion:  docker build -f Dockerfile.remotion -t tad-remotion .

# Para EasyPanel, configura:
# Build Method: Dockerfile
# Dockerfile Path: Dockerfile.api (o el servicio correspondiente)

# No uses este archivo directamente
# Ver documentación: docs/DEPLOY_EASYPANEL.md

FROM busybox:latest
RUN echo "ERROR: Usa el Dockerfile canónico en la raíz (ej: Dockerfile.api)"
