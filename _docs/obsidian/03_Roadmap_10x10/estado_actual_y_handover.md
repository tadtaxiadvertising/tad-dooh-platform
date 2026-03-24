---
title: HANDOVER - ANTIGRAVITY PROTOCOL V1
status: ACTIVE
updated: 2026-03-24
author: Antigravity AI
---

# 🤖 Protocolo de Relevo (Handover) para Siguiente Agente

Saludos, homólogo. He dejado la infraestructura de la **TAD DOOH Platform** blindada y purgada bajo el estándar **Antigravity Protocol V1**, lista para la prueba en firme "10x10" (10 conductores vivos / 20 pantallas).

## 📊 Estado Actual del Sistema

1. **Datos de Producción (Purga Completada)**
   - El endpoint privado `/api/drivers/purge-all` (protegido por `x-admin-secret: TAD_CLEAN_2026`) fue ejecutado con éxito total aplicando un orden de eliminación estricto mediante prisma (Tablas Hijas Cascading -> Update FK -> Delete Drivers -> Delete Devices).
   - **Contadores de Plataforma:** 0 Conductores, 0 Pantallas publicitarias en cola. DB inmaculada.

2. **Backend SRE (Site Reliability Engineering) - [EASYPANEL PROTEGIDO]**
   - **Prisma Connection Pooler:** Forzado sobre el puerto `:6543` del pooler en Supabase (transaction mode). Mitiga colapso por `too many connections`.
   - **Upload Bypass:** El controlador `POST /media/upload` del FrontEnd ahora NO inyecta el blob al servidor de NestJS. Obtiene una URL Firmada temporal (`/api/media/upload-url`) y guarda en Supabase, luego notifica al servidor (`POST /media/register-bypassed`).
   - **Límites Docker:** Se configuró un `easypanel-spec.yaml` limitando RAM explícitamente a 512M en Node.

3. **Frontend Tablet (Resiliencia Cache-First)**
   - Engine modificado: `useSyncEngine.ts` cachea la playlist al instante en `localStorage`.
   - Modos Sin Red (Zonas muertas / Santiago). El sistema sobrevive un apagón 4G sin detener loops.
   - Alerting Interno: Si el gateway de cobros lanza HTTP 402, un dispatch `TAD_UI_TOAST` aparece visualmente en la tablet del taxi como "Suscripción Vencida".

## 🎯 Órdenes para el Nuevo Agente (Next Steps)

El usuario (Arismendy) está iniciando ahora mismo el registro manual de su flotilla de prueba de 10 conductores vía Dashboard Web y encendiendo las tablets. Tus tareas exclusivas serán:

- **Soporte de Monitoreo:** Mantente atento a cualquier error en consola cuando Arismendy te indique que va haciendo registros.
- **Flujo de Asignación de QR:** Comprueba si los escaneos o actualizaciones locales en campañas fluyen de tablero a endpoint eficientemente.
- **Frontend / Diseño:** Si el usuario decide que ahora requiera de otra capa de pintura estética, tienes un entorno seguro donde maniobrar porque el Backend no colapsará. 

> **Claves Secretas / Endpoints Operativos:** 
> Backend Deploy: `https://proyecto-ia-tad-api.rewvid.easypanel.host`
> BD Hard Reset Auth: `x-admin-secret: TAD_CLEAN_2026`

🚀 Continúa iterando veloz. El entorno está a prueba de balas.
