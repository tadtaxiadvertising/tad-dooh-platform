# 📝 DOCUMENTO DE AUDITORÍA TAD 2026 — RESUMEN EJECUTIVO DEL PROYECTO

Este documento centraliza el estado actual, las reglas de negocio implementadas y la arquitectura técnica del ecosistema **TAD DOOH PLATFORM** para permitir la continuidad del trabajo con cualquier agente o desarrollador externo.

---

## 🏗️ 1. ESTADO DE LA ARQUITECTURA GENERAL

| Componente | Estado | Tecnología | Responsabilidad |
| :--- | :--- | :--- | :--- |
| **Backend** | ✅ 95% | NestJS + Prisma | Gestión de campañas, flotas, sincronización y auditoría de eventos. |
| **Dashboard** | ✅ 90% | Next.js 15 (v19) | Panel administrativo con monitoreo en vivo (Fleet) y gestión multimedia. |
| **Tablet Player**| ✅ 100% | Vanilla JS (PWA) | Kiosk-mode player con caché offline, auto-registro e identidad dinámica. |

---

## 🎯 2. REGLAS DE NEGOCIO CRÍTICAS (Core Logic)

### A. REGLA DE LOS 15 SLOTS (Control de Inventario)
- **Implementación**: `CampaignModule` (Backend) y `DeviceSlotsInfo` (Frontend).
- **Lógica**: Se impide la asignación de más de 15 anuncios/activos a un solo dispositivo. Esto previene el colapso de la memoria DRAM en las tablets.
- **Error**: El backend retorna `400 Bad Request ("Pantalla llena")` si se intenta forzar un slot número 16.

### B. IDENTIDAD DINÁMICA Y AUTO-REGISTRO
- **Anterior**: ID de prueba "Mendy" hardcodeado.
- **Actual**: El reproductor detecta si no tiene ID e interactúa con el endpoint `/api/device/register` para generar una identidad única persistente vinculada al hardware (usando Fully Kiosk Device ID si está disponible).
- **Limpieza**: Si una tablet se queda sin campañas activas, detiene el reproductor y muestra el **Logo TAD NODE** (Estado 'Wait for Content').

### C. AUDITORÍA DE REPRODUCCIÓN (Playback Tracking)
- **Endpoint**: `/api/media/:id/status`.
- **Lógica**: Cruzamos la base de datos de `playback_events` para determinar en tiempo real qué taxis están visualizando un video específico.
- **Visibilidad**: El administrador ve un indicador **"EN VIVO"** junto a una lista de taxis activos en la biblioteca multimedia.

### D. DISTRIBUCIÓN A VOLUNTAD (Asignación Directa)
- **Implementación**: Modelo `PlaylistItem` en DB (Backend) y Selector Múltiple de Dispositivos ("A Voluntad") en Modal Carga (Frontend).
- **Lógica**: Se envía una lista explícita de `device_ids` a `/api/campaigns/:id/assign` para mapear directamente en la BD qué pantalla corre qué video. Al sincronizar (`getActiveSyncVideos`), el nodo busca contenido que le corresponda. 
- **Prevención**: La interfaz lee `getDeviceSlots` por taxi, deshabilitando automáticamente la asignación en pantallas llenas.

---

## 🛠️ 3. RECURSOS Y ENDPOINTS CLAVE

- **Sincronización de Tablets**: `GET /api/device/sync?device_id=...`
- **Registro de Hardware**: `POST /api/device/register`
- **Confirmación de Playback**: `POST /api/device/playback` (Registra el evento en `playback_events`).
- **Estado de Inventario**: `GET /api/device/:id/slots`

---

## 📋 4. PRÓXIMOS PASOS (BACKLOG AGENTE SIGUIENTE)
1. **Reportes Financieros**: Implementar la lógica de cálculo de "Paga Estimada" basada en `playback_events` por cada taxi.
2. **Gestión de Zonas**: Refinar el geo-fencing (targetCities) para que los anuncios se activen solo en perímetros específicos de GPS.
3. **Admin Alerts**: Notificación automática al dashboard si una tablet reporta menos de 15% de batería.

---
**Última Actualización**: 2026-03-09
**Status de Build**: ✅ Estable en Vercel
