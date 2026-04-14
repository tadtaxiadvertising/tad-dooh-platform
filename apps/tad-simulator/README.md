# TAD Simulator (Microservice)

## Objetivo

Microservicio independiente dentro del ecosistema TAD DOOH v10.0.0. Este sistema actúa como un **Simulation Engine** capaz de replicar una operación real completa, inyectando flujos de datos de choferes, operaciones de campañas y eventos de telemetría a la `tad-api`, permitiendo testear límites, reglas de negocio y performance.

---

## 1. Blueprint de Archivos de Aplicación

Estructura construida para separar la lógica de simulación (`SimulationEngine`) de la interfaz gráfica (`SimulationUI`), utilizando **Next.js 15** y **Tailwind 4** (Premium Dark Mode + Glassmorphism).

```text
/apps/tad-simulator
│── /src
│   │── /app
│   │   │── layout.tsx               # Root layout "Premium Dark Mode" (#0a0a0a, acentos #FFD400)
│   │   │── page.tsx                 # Control Center UI principal
│   │   │── globals.css              # Glassmorphic utilities y base Tailwind 4
│   │   │── /api
│   │       │── /metrics/route.ts    # Polling interno de latencias y métricas
│   │── /components
│   │   │── /dashboard
│   │   │   │── ControlPanel.tsx     # Inputs: driverCount, activeCampaigns, errorRate, telemetryFreq
│   │   │   │── LiveMap.tsx          # Canvas/Map para "Virtual Drivers" (WebSockets/Supabase Realtime)
│   │   │   │── PerformanceChart.tsx # Gráfico de latencias (Inyecciones vs Tiempo, alerta > 200ms)
│   │   │   │── ScenarioUploader.tsx # Uploader drag-drop para JSON/CSV
│   │── /engine
│   │   │── SimulationNode.ts        # Clase core que maneja el ciclo de vida (Start/Stop)
│   │   │── /modules
│   │   │   │── drivers.ts           # Perfiles Faker.js (Dominican Republic) / GPS batching (10pts/30s)
│   │   │   │── finance.ts           # Emisión de eventos `playback_complete` (RD$500 per ad)
│   │   │   │── subscription.ts      # "Debtor Mode" trigger -> HTTP 402 watcher
│   │   │   │── inventory.ts         # Regla dura: 15 slots por tablet
│   │   │── /scenarios
│   │       │── parser.ts            # Conversor de CSV/JSON a jobs del engine
│   │── /lib
│   │   │── supabase.ts              # Realtime subscriptions
│   │   │── logger.ts                # Tracking de latencia vs Prisma
│── prisma/
│   │── schema.prisma                # Esquema de persistencia local del simulador
│── tailwind.config.ts               # Design tokens (#0a0a0a, #FFD400)
│── package.json
│── Dockerfile                       # Configurado para max 1GB RAM
```

---

## 2. Esquema de Base de Datos de Simulación (Prisma)

El simulador lleva sus propias métricas para la UI y control de escenarios, independiente del cluster principal TAD, aunque la data generada viaje hacia `tad-api`.

```prisma
// /apps/tad-simulator/prisma/schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("SIMULATOR_DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model SimulationScenario {
  id                String   @id @default(uuid())
  name              String   // Ej. "Día de lluvia en Santiago", "Tráfico en la 27 de febrero"
  driverCount       Int
  activeCampaigns   Int
  errorRateTarget   Float    // Ratio para testear 402 simulation
  telemetryFreq     Int      // Segundos entre batches
  createdAt         DateTime @default(now())

  sessions          SimulationSession[]
}

model SimulationSession {
  id                String   @id @default(uuid())
  scenarioId        String?
  scenario          SimulationScenario? @relation(fields: [scenarioId], references: [id])
  
  status            String   // 'INITIALIZING', 'RUNNING', '402_HALTED', 'STOPPED'
  startTime         DateTime @default(now())
  endTime           DateTime?
  
  totalPlaybacks    Int      @default(0) // Control de los RD$500
  generatedRevenue  Float    @default(0) 

  metrics           PerformanceMetric[]
}

model PerformanceMetric {
  id                String   @id @default(uuid())
  sessionId         String
  timestamp         DateTime @default(now())
  
  apiLatencyMs      Int      // Latencia real medida hacia tad-api
  isBottleneck      Boolean  @default(false) // Trigger si apiLatencyMs > 200ms
  activeDrivers     Int
  failedRequests    Int      // Conteo de HTTP 402/500
  
  session           SimulationSession @relation(fields: [sessionId], references: [id])
}
```

---

## 3. Plan de Despliegue en EasyPanel (Límite 1GB RAM)

El simulador se construye bajo un modelo _Standalone_ de Next.js, con restricciones en las variables de Node para asegurar que no exceda el gigabyte de RAM configurado en EasyPanel.

**Configuración EasyPanel:**
- **App Service:** Node.js / Docker
- **Build Method:** Dockerfile
- **Resources:**
  - CPU Limit: 0.5 Cores
  - RAM Limit: `1024 MB`

**Dockerfile operativo:**

```dockerfile
FROM node:20-alpine AS base

# Dependencias - Se omiten herramientas pesadas
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Runner optimizado
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# [IMPORTANTE] Limitar el Garbage Collector para respetar el 1GB de RAM en EasyPanel
ENV NODE_OPTIONS="--max-old-space-size=768"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
# Usar output standalone para menor consumo de disco/RAM
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```
