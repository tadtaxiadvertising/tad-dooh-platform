# Resultados de Auditoria Autonoma TAD DOOH

> Este archivo es la fuente central de recoleccion de errores HTTP (4xx/5xx)
> capturados de forma autonoma durante la ejecucion E2E secuencial de la suite
> `tests/e2e-autonomous-audit.spec.ts` contra los portales desplegados.
>
> - **Modo:** serial (concurrencia cero, 1 worker) para proteger el pooler Prisma :6543 y evitar OOM en contenedores de 512MB.
> - **Portales:** Admin, Advertiser, Driver.
> - **Reglas respetadas:** R1 (offline-first / debounce GPS 300s), R3 (sin mutaciones financieras / Kill-Switch 402), R7 (sin subida multimedia por API), R8 (sin mutaciones sin Idempotency-Key).

- [2026-08-11T08:35:07.216Z] ERROR HTTP 401 en: https://proyecto-ia-tad-dashboard.rewvid.easypanel.host/api/proxy/auth/login
- [2026-08-11T08:35:36.174Z] TEST: Admin Portal - Validacion de Monitoreo de Flota => FAILED (37996ms)

## Registro de Flujo E2E

### Portal Administrativo: Monitoreo de Flota
*   **Objetivo:** Verificar la integridad visual del centro de comando y la carga del mapa Leaflet.
*   **Disparador:** Inicio de sesion exitoso por el Administrador Maestro.
*   **Pasos:** Rellenar credenciales, enviar formulario, navegar a la ruta de monitoreo GPS (Mapa / admin/dashboard/realtime).
*   **Resultado Esperado:** Transicion al dashboard y visibilidad del contenedor .leaflet-container.
*   **Solucion de problemas:** Si el contenedor responde con latencia, verificar estado del microservicio Prisma en panel Easypanel antes de intentar despliegue manual.

### Portal Anunciante: Simulacion de Presupuesto (Planner)
*   **Objetivo:** Validar el calculo client-side de proyeccion/impacto del presupuesto sin mutaciones financieras.
*   **Disparador:** Acceso del anunciante al planificador de campanas.
*   **Pasos:** Iniciar sesion, navegar a Planner, ajustar el control deslizante de presupuesto y seleccionar la ciudad objetivo.
*   **Resultado Esperado:** Renderizado de la proyeccion de impacto (Impactos Estimados) en tiempo real.
*   **Solucion de problemas:** Si la proyeccion no se actualiza, verificar que no se interrumpa el JS client-side y revisar consola del navegador.

### Portal Conductor: Autenticacion Mobile Gateway
*   **Objetivo:** Confirmar el acceso fluido mediante interacciones tactiles y visualizacion de billetera V12.
*   **Disparador:** Inicio de turno del conductor en la PWA (Tablet/Celular).
*   **Pasos:** Tocar input de telefono, ingresar credenciales, tocar boton de ingreso.
*   **Resultado Esperado:** Redireccion exitosa y renderizado de ingresos bajo formula V12.
*   **Solucion de problemas:** Si ocurre timeout, revisar logs de tad-api por posible fallo de base de datos debido a desconexion del pooler o verificar localStorage para modo offline.
- [2026-08-11T08:54:56.657Z] TEST: Admin Portal - Validacion de Monitoreo de Flota => FAILED (33613ms)
- [2026-08-11T09:03:03.530Z] TEST: Admin Portal - Validacion de Monitoreo de Flota => FAILED (36577ms)
- [2026-08-11T09:11:19.668Z] TEST: Admin Portal - Validacion de Monitoreo de Flota => FAILED (37576ms)
- [2026-08-11T09:51:27.780Z] TEST: Admin Portal - Validacion de Monitoreo de Flota => FAILED (10237ms)
- [2026-08-11T09:56:52.564Z] TEST: Admin Portal - Validacion de Monitoreo de Flota => PASSED (26715ms)
- [2026-08-11T09:58:33.907Z] TEST: Admin Portal - Validacion de Monitoreo de Flota => PASSED (15687ms)
- [2026-08-11T09:58:49.449Z] TEST: Advertiser Portal - Simulacion de Presupuesto => FAILED (13480ms)
- [2026-08-11T10:01:43.388Z] TEST: Advertiser Portal - Simulacion de Presupuesto => PASSED (15709ms)
- [2026-08-11T10:03:10.138Z] TEST: Admin Portal - Validacion de Monitoreo de Flota => PASSED (13354ms)
- [2026-08-11T10:03:24.860Z] TEST: Advertiser Portal - Simulacion de Presupuesto => PASSED (10585ms)
- [2026-08-11T10:03:29.180Z] TEST: Driver Portal - Mobile Gateway UI => FAILED (3449ms)
- [2026-08-11T10:05:52.958Z] TEST: Driver Portal - Mobile Gateway UI => FAILED (9768ms)
- [2026-08-11T10:08:14.140Z] TEST: Admin Portal - Validacion de Monitoreo de Flota => PASSED (18947ms)
- [2026-08-11T10:08:31.074Z] TEST: Advertiser Portal - Simulacion de Presupuesto => PASSED (10238ms)
- [2026-08-11T10:08:42.514Z] TEST: Driver Portal - Mobile Gateway UI => PASSED (10891ms)
