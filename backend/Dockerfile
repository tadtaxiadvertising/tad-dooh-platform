# ============================================
# TAD DOOH Backend - Robust Single-Stage Docker
# Optimized for EasyPanel Free Tier Stability
# ============================================
FROM node:20-alpine

# Dependencias del sistema (Prisma necesita openssl)
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# 1. Copia de dependencias para caching
COPY package*.json ./
COPY prisma ./prisma/

# 2. Instalación (Incluye devDeps para compilar TS)
RUN npm install

# 3. Copia de código fuente
COPY . .

# 4. Generación estratégica (Prisma -> Build)
RUN npx prisma generate
RUN npm run build

# 5. Optimización (Limpieza de dependencias innecesarias tras construcción)
RUN npm prune --production

# --- Configuración de Runtime ---
ENV NODE_ENV=production
ENV NODE_OPTIONS=--max-old-space-size=512
ENV PORT=3000

EXPOSE 3000

# Punto de entrada corregido (Verificado: Nest compila a dist/src/main.js)
CMD ["node", "dist/src/main"]
