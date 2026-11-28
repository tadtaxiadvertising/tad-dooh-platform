# #217 — expansión compatible de cinco referencias

BORRADOR DE ENSAYO; corte productivo no preparado. SQL fuera de prisma/migrations, sin enlace al entrypoint ni workflows. Exige restored, socket Unix y marcador de clon.

La restauración rechazó el primer candidato de conversión directa. El catálogo real confirmó que mv_active_campaigns depende de device_campaigns.device_id; una reproducción sintética obtuvo SQLSTATE 0A000 sin efectos. Se descartó aquel SQL y se conserva aquí únicamente la expansión que mantiene las columnas, tipos y vista originales.

Se añade device_campaigns.device_uuid_217 UUID y driver_id_text_217 TEXT en devices, driver_locations, telemetry y wallets. Prisma mapea las relaciones a estas columnas; Driver.id TEXT, auth_user_id y el hardware público se conservan. El backfill de driver exige coincidencia exacta con drivers.id y nunca usa Auth. Para asignaciones se exige un único dispositivo entre hardware y UUID y se rechazan aliases duplicados de dispositivo/campaña.

Las columnas canónicas obligatorias mantienen NOT NULL y la unicidad necesaria; se añaden seis índices. Las tres columnas UUID legacy obligatorias pasan a nullable para admitir nuevas claves TEXT no UUID, conservando sus valores originales. Dos funciones trigger SECURITY INVOKER mantienen ambas representaciones al insertar o cambiar una referencia. Claves simultáneas inconsistentes, padres inexistentes e identidades ambiguas se rechazan. Las claves TEXT con forma de UUID deben conservar su representación canónica para evitar colisiones al reflejarlas en el UUID legacy. Los roles de aplicación no reciben EXECUTE en estas funciones ni nuevos permisos. No se crean FKs o cascadas ni se cambian RLS/ACL de tablas.

Wallet y telemetría consultan la misma clave canónica que Prisma. Se conservan cálculos, SELECT FOR UPDATE, transacciones, identidad de los eventos y deduplicación por segundo. El índice único antiguo de telemetría permanece; la nueva unicidad por conductor canónico protege también claves TEXT no UUID. Los endpoints de asignación siguen aceptando hardware/UUID y resuelven el dispositivo antes de consultar la relación UUID; playlist_items sigue usando hardware.

Las columnas legacy continúan siendo compatibles mediante triggers; no son backups congelados y no se eliminan en esta tarjeta. mv_active_campaigns sigue leyendo su columna original; su definición, índices y permisos deben conservarse y su refresh verificarse. El cliente nuevo requiere estas columnas antes de superar paridad. La coexistencia no acredita compatibilidad de todas las versiones antiguas del API ni todos los escritores externos.

Locks ACCESS EXCLUSIVE con lock_timeout=5s y statement_timeout=30s: el ensayo no acredita tiempos sobre un destino futuro poblado. Se rechazan estados parciales, tipos/propietarios distintos, triggers/FKs inesperados y privilegios de funciones no previstos. No se repite SQL histórico ni se edita _prisma_migrations.

Reversión del ensayo: destruir el clon y verificar su limpieza. El corte futuro debe conservar columnas y triggers, y usar una versión compatible o roll-forward. No borrar referencias ni intentar una conversión inversa de claves TEXT a UUID como rollback automático. Eliminar compatibilidad o columnas legacy exige una fase CONTRACT separada.

La consulta READ ONLY efectiva del 25-nov-2026 19:45 UTC encontró vacías las ocho tablas afectadas. Antes de cualquier corte deben repetirse la validación bajo locks y el cotejo de respaldo vigente. Permanecen pendientes las 31 columnas, GPS/PostGIS, integridad de FKs frente a borrados de padres, permisos/RLS funcionales, configuración esencial, custodia y controles de release/secretos. Resultados del ensayo en verification.json al concluir.

## Resultado del ensayo

PASS sintético y PASS sobre restauración real del 25-nov-2026: las 70 tablas originales conservan exactamente su proyección de valores; tipos originales, índices, roles y esquema ajeno se mantienen. Se ensayaron las 23 tablas vacías y esta expansión: cinco columnas canónicas, seis índices y tres relajaciones de nulabilidad legacy. La vista de sincronización se conservó y refrescó. Limpieza del clon y llave cifrada temporal verificada. No se escribió producción.

Con el cliente candidato, el clon queda con cero tablas de modelos ausentes, 31 columnas pendientes, cero diferencias ID/nativas escalares comprobadas, cero diferencias en las relaciones declaradas y dos problemas GPS/PostGIS. Antes de G faltaban también las cinco columnas canónicas (36 en total); cero relaciones comparables no demostraba compatibilidad mientras faltaban esos extremos.

Una prueba independiente READ ONLY real encontró otro contrato que el comparador actual no cubre: Device.status y Driver.status se almacenan como TEXT, mientras Prisma declara SystemStatus y el tipo PostgreSQL esperado no existe. La consulta tipada de estado falló con 42704. Esta tarjeta no declara reparado ese contrato ni salud de API; la siguiente etapa debe ampliar la detección de enums y alinear el almacenamiento sin cambiar estados históricos.
