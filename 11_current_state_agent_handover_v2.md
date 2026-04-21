# 🧠 11 — ESTADO ACTUAL Y HANDOVER (10 Abril 2026)

> **Documento de Sincronización para Próximo Agente AI**
> **Última actualización**: 10 de Abril de 2026 (v10.1)
> **Objetivo**: Proveer un resumen determinista e hiper-actualizado del código base, la infraestructura, las reglas de negocio recientes y los siguientes pasos para la plataforma TAD DOOH.

---

## 1. 🏗️ Arquitectura de Microservicios & Video Engine (v10.0)

- **Desacoplamiento TAD Remotion**: Se migró el motor de generación de video de la API principal a un microservicio independiente (`apps/tad-remotion`). Esto resuelve problemas de agotamiento de recursos (RAM/CPU) en la API principal al aislar los procesos de Chromium/FFMPEG.
- **Infraestructura de Renderizado**: El nuevo servicio corre sobre `node:18-bullseye` con todas las dependencias nativas de Linux para renderizado estable. Cuenta con una landing page Premium (Glassmorphism) para monitoreo de estado visual.
- **Renderizado Distribuido**: Refactorizado `VideoGeneratorService` en la API para actuar como cliente HTTP del nuevo microservicio, delegando la carga pesada y recibiendo el binario final.

## 2. 🔐 Autenticación & Onboarding Premium (v10.0)

- **RolesGuard Public Bypass**: Se corrigió un bug crítico donde rutas marcadas como `@Public()` (como login y registro) eran bloqueadas con 403 Forbidden si el controlador tenía roles definidos a nivel de clase.
- **Advertiser Password Reset**: Implementado el flujo completo de recuperación (`recover-password`) y establecimiento de contraseña (`reset-password`). Esto profesionaliza el onboarding de anunciantes.
- **Advertiser Route Stabilization**: Corregidos todos los errores 404 en el portal de anunciantes mediante la implementación de las rutas `billing`, `network`, `insights` y `bi-v6`.
- **Driver Portal Tools**: Implementados los módulos de Soporte Técnico y Referidos dentro del dashboard del conductor, integrados con `/portal-requests`.

## 3. 📦 Monorepo & Dependencias (v10.0)

- **Alineación React 19**: Se actualizó todo el monorepo para usar tipos de React 19, eliminando conflictos de tipado (`ReactNode` / `bigint`) entre los paquetes de UI y el motor de Remotion.
- **EasyPanel Optimization**: Configuración de recursos Dockerizada ajustada: 1GB RAM para `remotion` y 512MB para `api` y `dashboard`.

## 4. 🚀 PRÓXIMAS ACCIONES (Backlog Crítico)

1. **E2E Video Test**: Realizar una prueba real desde el portal de anunciantes para verificar que el video se renderiza en el microservicio y se guarda correctamente en Supabase.
2. **KYC Automático**: Integrar validación básica de documentos para anunciantes que se registran de forma pública.
3. **Optimización de Bitrate**: Implementar perfiles de renderizado en Remotion para optimizar el peso de los archivos según la red (4G vs WiFi).

> ✅ **Nota de estilo UI:** Mantener la estética _Premium Dark Mode_ (#0a0a0a y #FFD400). Todo servicio nuevo debe incluir una vista de estado con efecto Glassmorphic.

---

### FIN DEL REPORTE - ESTADO LISTO PARA DESARROLLO (v10.0)
