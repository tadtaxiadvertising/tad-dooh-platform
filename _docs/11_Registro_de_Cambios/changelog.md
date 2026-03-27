---
title: Historial de Versiones y Cambios (Changelog)
status: ACTUALIZADO
updated: 2026-03-26
---

## 📜 Historial de Versiones y Evolución TAD DOOH

Este documento registra los hitos técnicos, correcciones de errores y nuevas funcionalidades implementadas en la plataforma, sirviendo como bitácora de ingeniería para el equipo y los Agentes IA.

### 🚀 v5.4 - PWA Driver Portal & Admin Workflow (26 Mar 2026)

#### 📱 Portal de Conductores (PWA)
- **Stitch Pay Integration**: Conexión GraphQL con la pasarela de pagos, permitiendo retiros seguros y retención de estado a prueba de fallos.
- **Telemetría y GPS en Vivo**: Heartbeats integrados a OSM (OpenStreetMap) en el portal, garantizando seguimiento preciso directo al Dashboard.
- **Dashboard del Conductor**: Tracking de ganancias, referidos y un modal "Tactical Deployment" nativo para la experiencia de los drivers.

#### 🏗️ Admin Campaign Workflow
- **Distribución de Hardware Estratégico**: Desacople total de la asignación de hardware durante la subida de multimedia. Las campañas ahora heredan sus pantallas a nivel "Despliegue Táctico" y no por video.
- **Rastreo GPS y Mapa**: Corrección crítica de `react-leaflet` y agregación del endpoint `getDeviceRecentPath` para renderizar estelas en el mapa satelital del admin (dibujando los últimos 60 puntos recorridos).

---

### 🚀 v5.2 - Benchmark 10x10 & Multi-screen Upgrade (24 Mar 2026)

#### 🏗️ Arquitectura de Flota (Scale-Up)

- **Upgrade 1:N (Driver to Devices)**: Refactorización total del esquema Prisma y controladores para permitir que un solo taxista gestione múltiples pantallas (ej: 2 tablets por vehículo) de forma nativa.
- **Relación de Suscripción Centralizada**: Las validaciones de acceso (HTTP 402) ahora se consultan sobre el perfil del conductor, permitiendo una gestión financiera unificada para flotas multi-pantalla.

#### 📊 Validación de Campo (Benchmark 10x10)

- **Inyección Masiva Automatizada**: Registro exitoso de los primeros 10 socios "seed" con 20 dispositivos activos vinculados.
- **Simulación de Tráfico Real**: Generación de heartbeats, coordenadas GPS dinámicas (Santo Domingo) e impresiones publicitarias para estresar el motor de analíticas.
- **Sincronización del Libro Mayor**: Registro de RD$60,000 en ingresos por suscripciones anuales, validando la integridad contable del sistema de nómina.

---

### 🚀 v5.1 - Media Management & Telemetry Fixes (22 Mar 2026)

#### 🎞️ Gestión Multimedia

- **Endpoint DELETE Operativo**: Corrección de la ruta `@Delete(':id')` en el controlador de medios para evitar errores 404 al purgar activos.
- **Desvinculación Inteligente**: Refactorización de `unlinkMediaFromCampaign` para soportar de manera retrocompatible activos en tablas `MediaAsset` (V1) y `Media` (V2).
- **Deep Linking en Modales**: Implementación de parámetros de URL (`?openUpload=true`) para abrir el gestor multimedia con contextos pre-seleccionados de campaña.

#### 🛡️ Estabilidad y Telemetría

- **Fix de Permisos RLS**: Aplicación de scripts SQL en Supabase para permitir que los players (agentes anónimos) inserten eventos de analítica sin errores `403 Forbidden`.
- **Failsafe en useTADAction**: Captura de errores silenciosa para que fallos en logs no bloqueen la interfaz principal del usuario.

---

### 🛰️ v5.0 - Antigravity Sync & Deterministic UI (20 Mar 2026)

#### 🔄 Motor de Sincronización "Antigravity"

- **Real-time Engine**: Implementación de WebSockets vía Supabase Realtime para reflejar cambios en conductores y dispositivos sin refrescar.
- **Cache-First Player**: El reproductor ahora prioriza `localStorage` y la API de caché del Service Worker para operar en zonas de baja cobertura (túneles/carreteras).
- **BroadcastChannel**: Sincronización total entre pestañas abiertas del administrador.

#### 🎨 Interfaz Determinística

- **AntigravityButton**: Estandarización de botones de acción con capas de prioridad (`z-index: 60`) para evitar "clics muertos" bajo overlays.
- **Glow Trails en Mapas**: Implementación de estelas de luz neón (amarillo `#FAD400`) que muestran los últimos 5 puntos de GPS del taxi seleccionado en el mapa de rastreo.

---

### 🛡️ v4.5 - Infraestructura de Medios y Seguridad (20 Mar 2026)

#### 🏗️ Optimización de Backend

- **Timeout Progresivo**: Ajuste de Axios a 5 minutos para permitir cargas de videos 4K de alto peso sin desconexión.
- **DTO Flexibles**: El backend ahora acepta metadatos parciales de video (checksum/size) para acelerar la respuesta del servidor.
- **Extractor JWT Robusto**: Regex custom para limpiar headers `Bearer` duplicados por proxies de red.

#### 📈 Inteligencia Financiera

- **Módulo de Nómina V1**: Activación del Ledger (Libro Mayor) con cálculos automáticos de ITBIS (18%) y retenciones de referidos (10%).
- **Facturación Premium**: Generación de reportes PDF/HTML en Dark Mode para auditoría de anunciantes.

---

### 📜 Versiones Anteriores (Resumen)

- **v4.0**: Implementación inicial de Mapas con Leaflet y Heatmaps de impacto geográfico.
- **v3.0**: Migración a Next.js 14 y NestJS para arquitectura escalable.
- **v2.0**: Integración de Supabase Storage para activos multimedia.
- **v1.0**: MVP Inicial - Registro de conductores y reproducción básica de video.

---

> [!TIP]
> **Nota para Desarrolladores:** Siempre que se realice un commit de infraestructura importante, se debe añadir una entrada en este documento bajo la fecha correspondiente.
