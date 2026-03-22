# 💸 07 — AUDITORÍA DE SEGURIDAD Y OPTIMIZACIÓN DE COSTOS (SRE)

> **Autor**: Senior Software Architect / SRE Auditor
> **Contexto**: Despliegue en VPS limitado (Easypanel)
> **Fecha de Emisión**: 21 de Marzo, 2026

---

## 🛑 EL RIESGO DE FUGAS DE RECURSOS EN VPS

Next.js 15 y NestJS 10 corriendo sobre Docker/Easypanel son monstruos devoradores de memoria si no se estrangulan a nivel configuración. No estamos en Vercel Serverless (donde la RAM se recicla). Estamos en contenedores persistentes.

En nuestro escenario (100 tablets enviando GPS 24/7 + Backend Express/Prisma + Frontend SSR), si V8 decide hacer cache infinito de páginas o queries de BD, el OOM (Out-of-Memory Killer) de Linux matará al contenedor de `tad-api` en medio del cobro de una suscripción. Esto corrompe datos y pierde registros de reproducciones que el cliente paga.

---

## 🔥 PLAN DE RESTRICCIÓN AGRESIVA DE MEMORIA (RAM LIMITS)

### Frontend: Next.js (`tad-dashboard`)

Next.js (React Server Components, Telemetría y su App Router o `pages/api`) deja cientos de Megabytes en RAM tras compilaciones y peticiones.

**Plan de Ejecución:**

1. Apaga la telemetría de Vercel/Next: `NEXT_TELEMETRY_DISABLED=1`.
2. Asfixia la JVM subyacente de Node (`v8` / `max_old_space_size`) a un techo forzado de 256MB.
3. El `package.json` **DEBE** ejecutarse con `NODE_ENV=production` y `next start`. Nunca en dev form.

### Backend: NestJS (`tad-api`)

Express/NestJS no pierde memoria por defecto, pero **Prisma sí lo hace** si generas sentencias sueltas o si la conexión asíncrona se traba con un `Promise.all` descontrolado (ej. iterando sobre 1,000 puntos de GPS sin chunking).

**Plan de Ejecución:**

1. Establece un estrangulamiento de 256MB en el Heap de V8: `NODE_OPTIONS="--max_old_space_size=256"`.
2. Cierra las conexiones de Prisma cuando Easypanel mate el contenedor por un rediseploy:

```typescript
// backend/src/main.ts - MANDATORIO
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './modules/prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Esto previene que una redolpicacion en Easypanel deje 20 conexiones huérfanas en Supabase
  app.enableShutdownHooks(); 
  
  // Captura el Hook SIGTERM que emite Docker al matar el contenedor
  const prismaService = app.get(PrismaService);
  await prismaService.enableShutdownHooks(app);

  await app.listen(3000);
}
```

---

## 🔒 PRISMA CONNECTION POOLING (MÁXIMA OPTIMIZACIÓN)

El Pooler de Supabase está en el puerto `6543`. Sin embargo, si 100 tablets se despiertan a las 8:00 AM y mandan sus datos (Thundering Herd Problem), el backend NestJS abrirá conexiones hasta reventar las 512MB RAM del VPS.

En el archivo `backend/.env` utilizado en Easypanel (Y en `schema.prisma`), el endpoint **debe finalizar en `?pgbouncer=true&connection_limit=5`**.

Esto obliga a Prisma a usar un máximo de 5 conexiones al Pooler de Supabase, distribuyendo la carga de los 100 taxis sin abrir cientos de procesos en la BD remota TCP.

---

## 🛡️ VULNERABILIDADES FINANCIERAS (UPLOADS Y BANDA ANCHA)

El mayor costo oculto está en la red de Supabase/VPS por subida de videos.

Si un agente publicitario sube un MP4 de 200MB, y pasa a través de NestJS (ruta Express convencional de `multer`), consumimos 200MB de RAM en el VPS, 200MB de banda ancha de VPS (al recibir el request) y otros 200MB para mandarlo a Supabase (400MB totales por video). Esto ahoga la red del servidor.

### REGLA DE ARQUITECTURA SRE

**PROHIBIDO** pasar archivos multimedia grandes vía el backend de NestJS.
Cualquier carga de `FileInterceptor` en `admin-dashboard` debe inyectarse directamente al Bucket de Supabase Storage mediante "Signed URLs" o "Standard Supabase JS Client" (en el frontend del browser).

El servidor de Easypanel/NestJS solo debe recibir la URL o `CUID` del Supabase Bucket **después** de que el video ya haya sido subido exitosamente.

### Límites Físicos (Easypanel Conf)

```bash
docker update --memory 512m --memory-swap 1g tad-api
docker update --memory 512m --memory-swap 1g tad-dashboard
```

(Asegurar estos valores en la topología de la pestaña "Configuración Avanzada" de Easypanel). No comprometan la RAM. Ninguno de estos servicios justifica más de 500MB de consumo continuo a menos que exista una fuga de datos masiva en variables globales.
