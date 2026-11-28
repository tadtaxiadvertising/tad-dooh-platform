# #217 — identidad UUID del dispositivo en GPS

El campo físico driver_locations.device_id es UUID y corresponde a devices.id. Device.deviceId sigue siendo el identificador público de hardware TEXT. La relación Prisma anterior apuntaba al hardware y los flujos de monitoreo, móvil, BI, simulación y eliminación administrativa mezclaban ambas identidades.

Esta continuación declara DriverLocation.deviceId como @db.Uuid y referencia Device.id. Los puntos GPS de monitoreo y móvil guardan el UUID del dispositivo resuelto; BI filtra por el hardware a través de esa relación; la simulación conserva el UUID devuelto por su creación anidada; la transacción administrativa elimina únicamente las ubicaciones del UUID resuelto. Los DTO, guardas, rechazo de identidades ambiguas y autoridad del conductor se conservan. El lote de sincronización y el recorrido reciente ya usaban UUID y sus regresiones siguen pasando.

Se observaron cinco fallos de comportamiento antes de la corrección, sin errores de preparación. Con el cliente Prisma 5.22 generado fuera del checkout compartido pasan ocho suites y 65 pruebas focalizadas, 53 contratos Node y TypeScript sin emisión. Validate y generate también pasan. Los detalles están en verification.json; CI y salud del runtime deben verificarse aparte.

El 25-nov-2026 se comprobó el destino fijado y se ejecutaron el catálogo y una consulta Prisma con identificadores sintéticos sin coincidencias, dentro de transacciones READ ONLY cuyo modo se verificó en la misma conexión. El SQL generado une driver_locations.device_id con devices.id. No se devolvieron filas de aplicación y no hubo DDL, escritura, eliminación o backfill en producción.

Con este candidato, las relaciones incompatibles del catálogo bajan de seis a cinco. Permanecen 23 tablas y 31 columnas ausentes y dos problemas GPS/PostGIS. La relación driver_locations.driver_id con drivers.id continúa pendiente, al igual que la autoridad de identidad histórica. El arranque debe seguir rechazando el esquema incompleto.

Esta tarjeta no añade una migración, FK física ni transformación de datos. Si se revierte el código, se revierte también el contrato Prisma y se regeneran sus artefactos; eso recuperaría la incompatibilidad anterior y no constituye una solución de arranque. La recuperación de tablas ensayada en el clon y las restantes transiciones necesitan su propia verificación antes de cualquier cambio productivo.
