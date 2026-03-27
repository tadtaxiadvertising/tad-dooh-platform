# 🤖 Protocolo de Agente Virtual TAD (Antigravity) 🚗

Este documento define mi configuración como tu **Socio Tecnológico Virtual**. Mi objetivo es llevar la plataforma **TAD DOOH** desde el desarrollo hasta la operación masiva con eficiencia profesional.

---

## 🛠️ Mi Stack de Herramientas (Profesional & Gratuito)

Para maximizar el rendimiento sin costos innecesarios, he configurado y estamos usando:

1.  **Infraestructura:** [EasyPanel](https://easypanel.io/) (Hosting autogestionado en VPS económico para control total).
2.  **Base de Datos & Auth:** [Supabase](https://supabase.com/) (PostgreSQL robusto, Auth con JWT y Storage para videos).
3.  **Monitoreo de Errores:** [Sentry](https://sentry.io/) (Captura de bugs en tiempo real).
4.  **Gestión de Logs:** [BetterStack / Logtail](https://betterstack.com/) (Centralización de eventos técnicos).
5.  **Analítica:** [Umami](https://umami.is/) (Estadísticas de uso del Dashboard y Player).
6.  **Pasarela de Pagos:** [Stitch Pay](https://stitch.money/) (Integración vía GraphQL para conductores).
7.  **Mapas:** [React Leaflet](https://react-leaflet.js.org/) + [OpenStreetMap](https://www.openstreetmap.org/) (Rastreo GPS táctico).

---

## 🎯 Mi Misión contigo (Roadmap hacia la Acción)

He dividido el trabajo restante en fases críticas para que podamos **pasar a la acción** lo antes posible:

### ✅ Fase A: Cimientos & Monitoreo (COMPLETADA)
- [x] Unificación de variables de entorno y limpieza de credenciales.
- [x] Configuración de Sentry, BetterStack y Umami.
- [x] Nuevo flujo de asignación de dispositivos (Macro-gestión por Campaña).
- [x] Tracking GPS con estela de movimiento (`recent-path`).

### 🛠️ Fase B: Estabilización & Pulido (EN CURSO)
- [ ] **Auditoría de UI en Pantallas Reales:** Simular la vista de las tablets para asegurar que los videos cargan sin hipo (buffering).
- [ ] **Validación de Pago Stitch:** Realizar una prueba de retiro/pago simulada en el Driver Portal.
- [ ] **Check de Geocercas:** Verificar que el sistema emite una alerta si un taxi sale de la zona permitida (Ej. Santo Domingo vs Santiago).

### 🧪 Fase C: Pruebas E2E (QA)
- [ ] Ejecutar la suite de **Playwright** para detectar fallos de "Network Resilience" (qué pasa si la tablet pierde internet en un túnel).
- [ ] Verificar el **Kill-Switch**: Bloqueo automático de pantallas si la suscripción de RD$6,000 no se paga.

### 🚀 Fase D: Lanzamiento (PASAR A LA ACCIÓN)
- [ ] Configuración de la flota inicial (100 unidades en Santiago).
- [ ] Inyección de las primeras 5 campañas reales de anunciantes.
- [ ] Apertura del Driver Portal para los primeros choferes.

---

## 📝 Lo que necesito de ti para avanzar:

1.  **Acceso a EasyPanel:** Necesito saber si los builds de ayer terminaron correctamente en producción (puedes pasarme una captura o error si lo ves).
2.  **DSN de Sentry:** Cuando tengas el proyecto creado en Sentry, pásame la `DSN URL` para inyectarla y que empieces a recibir alertas en tu email.
3.  **Identificadores de Sitio Umami:** Pásame el `Website ID` de Umami para el Dashboard y para el Player.

---

> [!IMPORTANT]
> **Desde ahora, mi prioridad absoluta es la "Acción".** Cada línea de código que escriba estará orientada a que el negocio pueda facturar y que las tablets muestren publicidad de manera ininterrumpida.

**¿Empezamos con la Fase B: Auditoría de carga de video en tablets?** Podríamos optimizar el Service Worker para que nunca haya "pantalla negra".
