# ============================================
# TAD DOOH Backend - Definitive Production
# ============================================
FROM node:20-slim

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install
COPY . .

RUN npx prisma generate
RUN npm run build
RUN npm prune --production

ENV NODE_ENV=production
ENV NODE_OPTIONS=--max-old-space-size=512
ENV PORT=3000

EXPOSE 3000

# La app escucha en 0.0.0.0:3000 explícitamente (ya configurado en main.ts)
CMD ["node", "dist/src/main"]
