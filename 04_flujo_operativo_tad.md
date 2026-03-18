# TAD DOOH Platform: Flujo Operativo Estándar (SOP)
**Versión:** 1.0 (Refactorización 2026)
**Estado:** Documentación Técnica Operativa

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

## 4. Operación en Calle (On-Street Operation)
1. **Mobile Gateway:** El celular del conductor captura puntos GPS cada 10-30 segundos.
2. **Batching:** Los puntos se acumulan localmente y se envían en lotes (batches) de 10 posiciones al backend para optimizar batería y datos.
3. **Telemetría:** La tablet informa su estado (Batería, Almacenamiento, Conexión) cada 30 segundos. El dashboard refleja esto en tiempo real mediante el `SyncChannel`.
4. **Reproducción:** La tablet reproduce el mix publicitario localmente. Si detecta que el conductor no tiene suscripción activa (`SUSPENDED`), bloquea la pantalla.

## 5. Cierre Financiero y Liquidación (Financial Settlement)
1. **Auditoría de Emisión:** El sistema calcula las impresiones y tiempo de exposición basado en los logs de GPS y reproducción.
2. **Liquidación de Nómina:** En Gestión Económica (/finance), se genera la nómina mensual. Cada conductor recibe RD$500 por cada campaña activa que haya transmitido satisfactoriamente.
3. **Pago:** El administrador registra el pago con una referencia bancaria, cerrando el ciclo mensual.

---
**TAD Advertising Systems — 2026**
