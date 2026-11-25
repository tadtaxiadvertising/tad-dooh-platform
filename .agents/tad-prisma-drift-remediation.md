# Prisma drift — estado de remediación del #217

Este documento sustituye el diagnóstico preliminar local. No autoriza DDL ni despliegues.

El respaldo cifrado y su restauración aislada fueron verificados. En el snapshot auditado, las 23 migraciones registradas estaban finalizadas y sus checksums coincidían; los mensajes históricos de error no demostraban corrupción del ledger. No editar ni borrar _prisma_migrations, reescribir migraciones históricas ni repetir migraciones para intentar corregir el arranque.

El código candidato conserva las protecciones recientes de main y valida el schema del cliente generado, los tipos nativos, el contrato GPS/PostGIS y los tipos escalares. Media.mimeType utiliza la columna existente mime_type y conserva el alias de respuesta. Los cambios de IDs y mappings ya incorporados a main deben medirse con un cliente recién generado; no reutilizar como diagnóstico actual los recuentos anteriores de 23 tablas, 33 columnas, 14 IDs y seis relaciones.

El PR #542 está fusionado en main (954e361f3463c7b4ee080267f94fc736447b921a). Sus 18 checks y 99 suites/873 pruebas de API pasaron. Los logs aportados después de esa publicación contienen el SHA-256 f288f4ec832effeec7144ae69300c1ae0ccdd48d150f89250adeded2ce0f05e1: coincide con el schema de esa revisión usando finales de línea LF. La diferencia con la huella CRLF local no demuestra una imagen antigua.

El 25-nov-2026 a las 15:48 UTC, una sesión local con destino verificado y default_transaction_read_only=on confirmó 33 tablas públicas, 346 columnas y ausencia de PostGIS. El comparador encontró 23 tablas ausentes, 31 columnas ausentes, cinco diferencias de ID, seis relaciones incompatibles y dos problemas GPS/PostGIS. La API pública respondió 502. Esta medición sustituye los recuentos antiguos como línea base de esta etapa.

La siguiente etapa alinea en Prisma cuatro PK existentes UUID (Advertiser, Campaign, Invoice y Media) y sus once referencias relacionadas. Es un cambio del contrato del cliente, sin DDL, casts, backfill ni conversión de datos. La comparación del candidato con el mismo catálogo reduce las diferencias de ID de cinco a una y no introduce diferencias escalares. Prisma 5.22 validate/generate, TypeScript de API y 55 contratos pasaron con un cliente generado aislado.

Device.id permanece pendiente: DeviceCampaign.device_id es TEXT de transición y el código acepta UUID interno e identificador de hardware, con protección de colisiones. No anotar ambos como UUID por propagación automática. El contrato de dispositivo y las otras cinco relaciones requieren una transición explícita que preserve la sincronización offline. Las 23 tablas, 31 columnas y dos dependencias GPS/PostGIS siguen sin corregirse en producción; este cambio de Prisma por sí solo no permite el arranque.

Continuar por familias: resolver identidad de dispositivo/driver, preparar expansiones aditivas verificadas para las tablas ausentes, acordar los valores históricos de onboarding/legal/simulación y reparar el contrato GPS/PostGIS. Conservar filas, saldos e historial de migraciones. Cada etapa debe medirse con su propio cliente generado y el catálogo identificado; no declarar paridad completa a partir de una prueba parcial de IDs.

Para cerrar el incidente hacen falta el error real de arranque, la imagen/SHA efectivos y configuración de EasyPanel. La API pública seguía en 502 en la última comprobación. Los comentarios históricos sobre TAD_EXPECTED_SUPABASE_PROJECT_REF no prueban el valor efectivo actual.

Toda expansión de esquema requiere restauración comprobada, contratos de identidad y permisos, comprobaciones de datos originales y reversión. No desplegar cambios de esquema como sustituto de ese análisis. Los controles de seguridad y de publicación pendientes deben revisarse antes del despliegue.
