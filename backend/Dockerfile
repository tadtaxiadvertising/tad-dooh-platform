# ============================================
# TAD DOOH Backend - Robust Production Build
# ============================================
FROM node:20

# No usamos alpine para descartar problemas de compatibilidad de libc
RUN apt-get update && apt-get install -y openssl

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install
COPY . .

RUN npx prisma generate
RUN npm run build
RUN npm prune --production

# Variables de entorno explícitas para el contenedor
ENV NODE_ENV=production
ENV NODE_OPTIONS=--max-old-space-size=512
ENV PORT=3000
ENV HOST=0.0.0.0

EXPOSE 3000

# Usamos node directamente con la ruta verificada
CMD ["node", "dist/src/main"]
