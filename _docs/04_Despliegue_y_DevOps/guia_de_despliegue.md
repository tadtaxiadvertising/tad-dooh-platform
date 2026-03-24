---
title: Guía de Despliegue y DevOps
status: REVISIÓN CONCLUIDA
updated: 2026-03-24
---

# 🚀 Guía de Despliegue y DevOps (EasyPanel)

Esta guía documenta los protocolos de infraestructura, monitoreo y despliegue del proyecto TAD DOOH (Platform).

## 🌍 Entorno de Producción 

La plataforma web y las API se alojan utilizando un entorno de despliegue sobre Docker orquestado mediante **EasyPanel**. El proveedor de base de datos oficial es **Supabase** (PostgreSQL + S3 Storage).

### URL Oficiales
- **Front-End / Dashboard:** Despliegue en EasyPanel (o Vercel como fallback).
- **Backend API:** `https://proyecto-ia-tad-api.rewvid.easypanel.host`
- **Supabase Dashboard:** Administrado por la cuenta principal de TAD.

---

## 🏗️ Protocolo Antigravity V1 (Estándar SRE)

Implementamos configuraciones estrictas para prevenir colapsos del servidor Node.js (VPS de EasyPanel):

1. **Límites de RAM Restrictivos (Docker):**
   - Límite absoluto de contenedor dictado en `easypanel-spec.yaml`: 512MB RAM.
   - Variable de entorno inyectada: `NODE_OPTIONS="--max-old-space-size=400"`. Obliga a Node a reciclar la memoria basura antes de crashear.
   
2. **Prisma Supabase Pooler (Puertos 6543):**
   - El motor de Prisma **debe** estar configurado para usar el Transaction Pooler.
   - La cadena en EasyPanel debe ser: `DATABASE_URL="postgresql://[USER]:[PASS]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?connection_limit=5"`
   - Esto evita que reinicios asincrónicos abran infinitos hilos de base de datos que destruyan el límite de la cuenta gratuita de Supabase.

3. **Bypass de Ingesta Multimedia (RAM Shield):**
   - Archivos de video pesados (ej. > 200MB) **JAMÁS** tocan el backend de Node.js en NestJS.
   - El *Upload Bypass* funciona generando una `Signed Upload URL` (`/api/media/upload-url`) y el Dashboard frontend ejecuta un `PUT` directo al balde `ads-videos` de Supabase Storage.

---

## 📜 Pasos para Redespliegue Manual (Backend)

1. Ingresa al Dashboard de tu VPS mediante EasyPanel.
2. Navega al "Service" llamado `tad-api` (Backend).
3. Asegurate de que los "Environment Variables" estén seteados correctamente.
4. Presiona el botón verde **Deploy** en la esquina superior derecha. 
5. Observa el Logger. Cuando indique `[NestApplication] Nest application successfully started`, la flota está de vuelta en línea.

## 💾 Purga de Base de Datos Segura

Si la plataforma necesita limpiarse (Reset para nueva flota), no se borra manualmente por consola a menos de ser necesario. Existe un "Botón de pánico":

- **Ruta:** `POST /api/drivers/purge-all`
- **Autenticación (Header):** `x-admin-secret: TAD_CLEAN_2026`
- **Mecanismo:** El script borra *en cascada inversa* (Device Analytics -> Media Tracking -> PayRoll -> Subscriptions -> Devices -> Drivers) para no disparar colapsos de Prisma ForeignKey constraints (`P2003`). 
