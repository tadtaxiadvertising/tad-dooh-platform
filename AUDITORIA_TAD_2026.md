# 📝 DOCUMENTO DE AUDITORÍA TAD 2026 — RESUMEN EJECUTIVO DEL PROYECTO

Este documento centraliza el estado actual, las reglas de negocio implementadas y la arquitectura técnica del ecosistema **TAD DOOH PLATFORM** para permitir la continuidad del trabajo con cualquier agente o desarrollador externo.

## 🏗️ 1. ESTADO DE LA ARQUITECTURA GENERAL

| Componente | Estado | Tecnología | Responsabilidad |
| :--- | :--- | :--- | :--- |
| `CampaignModule` | `/api/campaigns` | ✅ Funcional | CRUD completo (Corregido Upload y Delete) |
| `FleetModule` | `/api/fleet` | ✅ Funcional | CRUD de nodos y visualización de perfil |
| **Dashboard** | ✅ 95% | Next.js 15 (v19) | Panel con monitoreo en vivo (Fleet C2), Live Activity Feed y gestión multimedia. |
| Tablet Player | PWA activa | Workbox/HLS.js | ✅ PWA real con Service Worker y Cache API (`index.html` + `sw.js`) |

### Estado de Vistas del Dashboard (Next.js)

| Vista / Ruta | Propósito | Estado Real |
| --- | --- | --- |
| `/campaigns` | Gestión de campañas y medios | ✅ Funcional |
| `/fleet` | Monitoreo de dispositivos en tiempo real | ✅ Funcional |
| `/finance` | Ingresos y pagos | ✅ Funcional (Simulador Activo) |
| `/drivers` | **NUEVO:** Gestión de choferes y suscripciones | ✅ Funcional (Data Real DB) |
| `/devices` | **NUEVO:** Inventario técnico de hardware | 🏗️ UI en desarrollo (Mockup) |
| `/advertisers` | **NUEVO:** Base de datos de clientes y portal de solicitudes | ✅ Funcional (Data Real DB + Sistema de Solicitudes) |
| `/analytics` | Inteligencia de red y propagaciones (Heatmaps) | ✅ Funcional (Optimizado con Leaflet.Heat) |

---

## 🚀 2. ESTADO DE LOS MÓDULOS VITALES (Pilot Ready)

| Módulo | Funcionalidad | Estado |
| --- | --- | --- |
| **Media** | Subida, Hash (MD5) y Preview en Dashboard | ✅ 100% Funcional |
| **Asignación (Targeting)** | Multi-Segmentación (`isGlobal` vs ID de Taxi) | ✅ 100% Funcional |
| **Onboarding** | Eliminado ID Hardcodeado; registro dinámico de nodos activo | ✅ 100% Funcional |

### Riesgos Mitigados

- [x] **Riesgo 2:** `FORCE_DEVICE_ID` eliminado. Las tablets ahora se identifican solas vía UUID dinámico.

### Progreso del Backend (Sprint 2 - Choferes y Anunciantes)

| Módulo (NestJS) | Lógica de Negocio Integrada | Estado | Riesgo / Dependencia |
| --- | --- | --- | --- |
| `Prisma Schema` | Modelos `Driver` y `Advertiser` con relaciones | ✅ Código Generado | Requiere `npx prisma db push` |
| `DriversModule` | Bloqueo de tablet si `subscriptionPaid == false` | ✅ Código Generado | Requiere integración con PWA/FullyKiosk para accionar el `LOCK_SCREEN` |
| `DriversModule` | Cálculo RD$500/mes por campaña activa | ✅ Código Generado | Depende de conexión real con vistas de Finanzas en el dashboard |

---

## 🎯 3. REGLAS DE NEGOCIO CRÍTICAS (Core Logic)

### A. REGLA DE LOS 15 SLOTS (Control de Inventario)

- **Implementación**: `CampaignModule` (Backend) y `DeviceSlotsInfo` (Frontend).
- **Lógica**: Se impide la asignación de más de 15 anuncios/activos a un solo dispositivo.
- **Visualización**: El monitor de flota muestra una barra de capacidad por taxi (0/15 slots).

### B. COMANDOS REMOTOS (C2 - Fleet Management)

- **Implementación**: `deviceCommand` (Backend), `sendCommand` (Dashboard API), `executeRemoteCommand` (Player).
- **Comandos Soportados**:
  - `REBOOT`: Fuerza la recarga completa de la aplicación en la tablet.
  - `CLEAR_CACHE`: Purga el `localStorage` y reinicia el estado de datos.
  - `FORCE_SYNC`: Ignora el intervalo de 5min y fuerza una descarga inmediata de contenido.
- **Feedback Loop**: El player envía un `ACK` (Acknowledge) tras ejecutar el comando, actualizando el estado en la base de datos.

### C. ANALÍTICA Y FINANZAS (Revenue Model)

- **Cobros Anunciantes**: Tarifa fija **RD$1,500/mes** por anuncio de 30s.
- **Capacidad de Inventario**: Máximo 15 anuncios (slots) por taxi. Validado en Backend.
- **Distribución**: Consulta de taxis por campaña (Reverse Lookup) implementada para auditoría de clientes.
- **Propósito**: Asegurar que cada anunciante "alquila" un espacio real en la rotación.

---

## 🛠️ 3. RECURSOS Y ENDPOINTS CLAVE

- **Sincronización & C2**: `GET /api/device/sync?device_id=...` (Retorna campañas + comandos pendientes).
- **Acknowledge de Comandos**: `POST /api/device/command/:id/ack`.
- **Envió de Comandos (Admin)**: `POST /api/fleet/:id/command`.
- **Feed de Analítica**: `GET /api/analytics/recent-plays`.

---

## 🔧 4. ESTADO REAL DEL SISTEMA (Post-Fleet Upgrade)

| Aspecto | Estado Anterior | Estado Actual |
| :--- | :--- | :--- |
| **Fleet Monitoring** | ⚠️ Lista estática simple | ✅ Monitor con **Buscador**, **Filtros (Online/Offline)** y **Quick Actions (C2)** |
| **Analytics Feed** | ❌ Solo gráficos históricos | ✅ **Propagaciones Recientes** (Live Log de 20 eventos) |
| **Player C2** | ❌ No existía control remoto | ✅ Motor de ejecución de comandos `REBOOT/SYNC/WIPE` funcional |
| **Build Stability** | ❌ Errores de Turbopack/JSX | ✅ **Estabilizado**. Dashboard renderiza sin errores tras fix de estructura |
| **Finance Engine** | ⚠️ Mock data | ✅ Integrado con **RD$1,500/slot** para cálculo de ingresos fijos |

---

## 💰 5. MÉTRICAS FINANCIERAS (PROYECTADAS)

- **Ingreso por Taxi (Full):** 15 slots × RD$1,500 = **RD$22,500 / mes brutos**.
- **Costo Chofer:** RD$500 × 15 anuncios = **RD$7,500 / mes**.
- **Margen Operativo por Taxi:** RD$15,000 / mes (antes de costos de red/gestión).

---

## ⚠️ 5. RIESGOS IDENTIFICADOS

| Riesgo | Severidad | Mitigación |
| :--- | :--- | :--- |
| **DB en Supabase remota** | 🟡 Media | Configurar SQLite o usar DATABASE_URL local. |
| **Sin S3/Storage real** | 🟡 Media | Implementar presigned URLs antes de producción. |
| **JWT_SECRET genérica** | 🔴 Alta | Rotar inmediatamente con secret de 64+ caracteres. |
| **No hay HTTPS en local** | 🟡 Media | Usar `mkcert` o `ngrok` para staging. |
| **Env expuesto local** | 🟡 Media | Asegurar que `.env.local` está en `.gitignore`. |
| **Connection pooling** | 🔴 Alta | Mitigado con `onModuleDestroy`. |
| **IndexedDB Videos** | 🟢 Baja | Resuelto: Migrado a Cache API. |

---

### 🗄️ ACTUALIZACIÓN DE SCHEMA Y GESTIÓN GRANULAR (v2.1)

- ✅ **DeviceCampaign (device_campaigns)**: Nueva tabla pivote UUID-based para vinculación explícita.
- ✅ **Gestión de Inventario**: Implementado motor de remoción granular de anuncios por taxi.

| Componente Adicional | Endpoint Añadido | Estado |
| :--- | :--- | :--- |
| **Device Admin** | `GET /api/devices/:id/campaigns` / `DELETE /api/devices/:id/campaigns/:id` | ✅ Funcional – Dashboard Control |
| **Campaign Admin** | `GET /api/campaigns/:id/devices` | ✅ Funcional – Reporte de Cobertura |

---

## 📋 7. PLAN DE DESARROLLO FASEADO — ROADMAP TAD 2026

### 🚨 Sprint 1: ESTABILIDAD (Semanas 1-3)

#### Dashboard / Frontend

- [x] Reparar subida de videos a Supabase Storage (`/campaigns/:id`)
- [x] Habilitar borrado de campañas y videos en cascada
- [x] Implementar borrado de nodos en `/fleet`
- [x] Crear vista de Perfil de Nodo enlazada a choferes y anuncios activos

#### Tablet Player

- [x] Reemplazar blob storage por Cache API + Service Worker para persistencia entre reinicios

Con esto implementado, la memoria RAM de las tablets respirará mucho mejor y los videos sobrevivirán a cualquier reinicio forzado o pérdida de señal 4G.

#### Backend

- [x] Agregar `prisma.$disconnect()` + `onModuleDestroy` para Vercel serverless (Evita fugas de conexiones).
- [x] Implementar relación explícita y granular entre campañas y dispositivos (Control de Inventario).
- [x] **Revenue Protector**: Lógica de 15 slots máximos por hardware.
- [x] **Mapa de Calor**: Visualizador de distribución y revenue por campaña.

#### Próximos Pasos

- [ ] **Generador de Facturas**: Exportar PDF mensual para anunciantes basado en los taxis asignados.
- [x] **Heatmap Master**: Implementar visualización de calor para pauta masiva.
- [x] **Portal Requests**: Módulo administrativo para aprobación de cambios de anunciantes.
- 🔲 **Gestión de Zonas GPS**: Refinar geo-fencing real usando el stream de coordenadas del player.
- 🔲 **Admin Alerts**: Notificación visual persistente si una tablet reporta batería < 15%.

---
---

## 6. ESTADO DE DESPLIEGUE (CI/CD)

| Entorno | URL | Estado | Último Cambio |
| :--- | :--- | :--- | :--- |
| **Producción** | <https://proyecto-ia-tad-dashboard.rewvid.easypanel.host/> | ✅ Operativo | Estabilización v6.5.5 |

--- NOTA DE CTO ---
"El Sprint 1 y la base del Sprint 2 están oficialmente LIVE. El dashboard es capaz de gestionar campañas, videos, marcas y flota (choferes) remotamente. El pipeline de CI/CD está validado y la plataforma es estable en producción."

---
**Última Actualización**: 2026-04-03T14:00:00-04:00
**Status de Build**: ✅ Estable - Producción Operativa (v6.5.5)
**Player Version**: v2.1.5-HeatmapSupport
**Agente Responsable**: Antigravity Principal Architect

### 🛡️ 8. LOG DE AUDITORÍA RECIENTE (Marzo - Abril 2026)

- **Stabilización BI v6.5.5**: Implementada lógica de "Graceful Fallback" en `BiService`. El sistema ahora calcula métricas en tiempo real si las tablas de snapshot no existen, eliminando errores 500 en producción. (03/Abr/2026)
- **Corrección de Rutas API**: Estandarizados los controladores de BI para eliminar redundancia de prefijos (`api/v1/bi/kpis`), resolviendo errores 404 en el proxy del dashboard. (03/Abr/2026)
- **Optimización de Build (SRE)**: Dockerfile de Backend migrado a `npm ci` con limpieza agresiva de capas. Configurado `max-old-space-size=850` para aprovechar la expansión a 1GB RAM en el VPS, asegurando despliegues exitosos y mayor performance en tiempo de ejecución. (02/Abr/2016)
- **Resiliencia de Componentes UI**: Hardened `AntigravityButton` con lazy-loading de Supabase para evitar fallos de inicialización en el bundle de producción. (02/Abr/2016)
- **Portal de Solicitudes de Anunciantes**: Desplegado el motor de `PortalRequests` para automatizar peticiones de pauta. (01/Abr/2026)
- **Optimización de Telemetría (Heatmaps)**: Migración a `Leaflet.heat` para soportar visualización de miles de puntos de impacto sin latencia. (01/Abr/2026)
- **WhatsApp Automation**: Conexión de reportes de performance con el API de mensajería para entrega instantánea. (31/Mar/2026)

### ESTADO REAL - ACTUALIZACIÓN FINAL

- **BI Command Center:** ✅ FUNCIONAL (v6.5.5). Resiliencia ante fallos de DB integrada.
- **Subida de Media:** ✅ FUNCIONAL. Integración directa con Supabase Storage (Bucket: `campaign-videos`). Preview local antes de subida.
- **Targeting por Chofer:** ✅ IMPLEMENTADO. Relación Many-to-Many entre `Campaign` y `Driver`.
- **Sync Selectivo:** ✅ IMPLEMENTADO. El endpoint `/api/campaigns/tablet/:deviceId/playlist` filtra los videos en base al `driverId` asignado.
- **Seguridad de Dashboard:** ✅ INTEGRADO. Autenticación migrada a Supabase Auth. Backend protegido vía `SupabaseAuthGuard`.

### Gaps Técnicos

| Fecha | Incidencia | Resolución | Estado |
| :--- | :--- | :--- | :--- |
| 03/Abr/2026 | Error 500 BI KPIs | Implementado fallback resiliente en BiService | ✅ Resuelto |
| 03/Abr/2026 | Error 404 BI Proxy | Corregido prefijo en BiController | ✅ Resuelto |
| 02/Abr/2026 | ReferenceError AntigravityButton | Lazy-load Supabase en useTADAction | ✅ Resuelto |
| 10/Mar/2026 | Error de visualización en Choferes | Se corrigieron los filtros para incluir estados `INACTIVE`/`SUSPENDED` | ✅ Resuelto |
| 10/Mar/2026 | Date Picker UX en Campañas | Estilos mejorados y validación reforzada | ✅ Resuelto |
| 09/Mar/2026 | Error 500 JSON `BigInt` | Conversión implícita de `fileSize` a `Number` | ✅ Resuelto |

1. **Dashboard Operativo**: <https://proyecto-ia-tad-dashboard.rewvid.easypanel.host/>
2. **API Operativa**: <https://proyecto-ia-tad-api.rewvid.easypanel.host/api/v1/>
3. **Credenciales**: `admin@tad.do` / `TadAdmin2026!`
