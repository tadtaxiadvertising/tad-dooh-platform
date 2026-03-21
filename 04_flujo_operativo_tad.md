# TAD DOOH Platform: Flujo Operativo Estándar (SOP)

**Versión:** 1.2 (Auditoría v4.5)
**Última Actualización:** 20 de Marzo, 2026 (14:00)

## 1. Onboarding de Conductor (Conductor Onboarding)

1. **Registro:** El administrador registra al nuevo conductor en el Dashboard (/drivers).
2. **Validación Comercial:** Se verifica el pago de la cuota anual (RD$6,000). Sin este pago, el conductor permanece en estado `BLOCKED` o `UNPAID`.
3. **PWA Mobile Gateway:** El conductor recibe un enlace (o escanea el QR en la oficina) para abrir `admin-dashboard/pages/check-in.tsx` en su celular personal. Este dispositivo actuará como el Gateway GPS.

## 2. Configuración y Registro de Hardware (Hardware Setup)

1. **Unidad/Tablet:** Se instala una tablet Android en el vehículo.
2. **Vinculación:** En la página de Flota (/fleet), el administrador crea una "Nueva Unidad" vinculando el `device_id` de la tablet con el nombre del conductor y la placa del vehículo.
3. **Emparejamiento:** El conductor escanea el QR generado por la tablet para activar el Mobile Gateway en su celular, vinculando su posición GPS a la unidad.

## 3. Distribución de Contenido (Content Distribution)

1. **Carga de Archivos:** Se suben los videos o imágenes en la sección de Contenido Multimedia (/media) a Supabase Storage.
2. **Creación de Campaña:** Se crea la campaña asignando presupuesto, anunciante y fechas.
3. **Targeting (Distribución):** Se eligen los conductores o zonas donde se emitirá la campaña (Zap Distribuir). Esto envía una notificación vía Supabase Realtime/API a las tablets indicando la actualización de su playlist.
4. **Sincronización de Emergencia (Broadcast):** Si un dispositivo no actualiza su contenido automáticamente, el administrador puede usar el botón "Sync Integridad" desde `/fleet` para forzar un WAKE_UP_CALL masivo a través de Supabase Realtime.

## 4. Operación en Calle (On-Street Operation)

1. **Mobile Gateway:** El celular del conductor captura puntos GPS cada 10-30 segundos.
2. **Batching:** Los puntos se acumulan localmente y se envían en lotes (batches) de 10 posiciones al backend para optimizar batería y datos.
3. **Telemetría:** La tablet informa su estado (Batería, Almacenamiento, Conexión) cada 30 segundos. El dashboard refleja esto en tiempo real mediante el `SyncChannel`.
4. **Reproducción:** La tablet reproduce el mix publicitario localmente. Si detecta que el conductor no tiene suscripción activa (`SUSPENDED`), bloquea la pantalla.

## 5. Cierre Financiero y Comercial (Financial & Commercial Settlement)

1. **Auditoría de Emisión:** El sistema calcula las impresiones y tiempo de exposición basado en los logs de GPS y reproducción para asegurar impactos garantizados.
2. **Facturación a Clientes (Invoice):** El administrador genera la Factura Comercial (Premium HTML) y el Reporte de Pauta (CSV) desde el módulo de finanzas para enviarlos al Cliente final, aplicando el 18% de ITBIS de manera automatizada.
3. **Liquidación de Nómina:** En Gestión Económica (/finance), se aprueba la nómina mensual y se descarga el Reporte de Nómina. Cada conductor activo recibe RD$500 por cada campaña asignada que haya transmitido satisfactoriamente.
4. **Pago y Retenciones:** El administrador procesa y registra los pagos con referencias bancarias. El sistema efectúa automáticamente las retenciones de referidos (10% si aplica) cerrando el ciclo mensual en el Libro Mayor.

## 6. Mantenimiento y Dashboard Responsive

1. **Acceso Multi-Dispositivo:** El Dashboard administrativo está optimizado para dispositivos móviles y tabletas, permitiendo al personal de campo cerrar unidades o sincronizar flotas desde cualquier ubicación sin necesidad de una PC estacionaria.
2. **Auditoría de Salud:** El administrador debe supervisar diariamente los estados "STABLE" y "OS Build" en la cabecera del sistema para garantizar que todos los nodos ejecutan la versión core v4.5.1 de TAD Node OS.

---
TAD Advertising Systems — 2026
