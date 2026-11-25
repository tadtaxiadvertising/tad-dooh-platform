# Prisma drift — estado de remediación del #217

Este documento sustituye el diagnóstico preliminar local. No autoriza DDL ni despliegues.

El respaldo cifrado y su restauración aislada fueron verificados. En el snapshot auditado, las 23 migraciones registradas estaban finalizadas y sus checksums coincidían; los mensajes históricos de error no demostraban corrupción del ledger. No editar ni borrar _prisma_migrations, reescribir migraciones históricas ni repetir migraciones para intentar corregir el arranque.

El código candidato conserva las protecciones recientes de main y valida el schema del cliente generado, los tipos nativos, el contrato GPS/PostGIS y los tipos escalares. Media.mimeType utiliza la columna existente mime_type y conserva el alias de respuesta. Los cambios de IDs y mappings ya incorporados a main deben medirse con un cliente recién generado; no reutilizar como diagnóstico actual los recuentos anteriores de 23 tablas, 33 columnas, 14 IDs y seis relaciones.

La ejecución anterior del candidato aislado aprobó 44 suites/228 pruebas de API y 19 contratos. Esta publicación incorpora main más reciente y cambios pendientes de Driver; su validación se registra por separado.

Para cerrar el incidente hacen falta el error real de arranque, la imagen/SHA efectivos y configuración de EasyPanel. La API pública seguía en 502 en la última comprobación. Los comentarios históricos sobre TAD_EXPECTED_SUPABASE_PROJECT_REF no prueban el valor efectivo actual.

Toda expansión de esquema requiere restauración comprobada, contratos de identidad y permisos, comprobaciones de datos originales y reversión. No desplegar cambios de esquema como sustituto de ese análisis. Los controles de seguridad y de publicación pendientes deben revisarse antes del despliegue.
