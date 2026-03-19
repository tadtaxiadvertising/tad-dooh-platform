# ============================================
# TAD DOOH Backend - Ultra-Stable Production
# ============================================
FROM node:20-alpine

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Copia de dependencias
COPY package*.json ./
COPY prisma ./prisma/

# Instalación limpia
RUN npm install
COPY . .

# Construcción y limpieza
RUN npx prisma generate
RUN npm run build
RUN npm prune --production

# Variables de entorno críticas para Docker
ENV NODE_ENV=production
ENV NODE_OPTIONS=--max-old-space-size=256
ENV PORT=3000
ENV HOST=0.0.0.0

EXPOSE 3000

# Punto de entrada verificado con delay de seguridad
CMD ["node", "dist/src/main"]
