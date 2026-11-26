# Transición productiva #217 — requisitos y reversión

## GOAL / PLAN / LOOP / STOP

Estado: **PARCIAL; DDL PRODUCTIVO NO EJECUTADO**. Esta tarjeta documenta la diferencia entre el ensayo aceptado y el destino productivo. Publica una consulta de solo lectura; el adaptador de DDL productivo y su ensayo con el rol administrado siguen pendientes. No conecta SQL de recuperación al arranque ni autoriza una promoción.

## Línea base, permisos y alcance

Código inspeccionado: main `48b777cad18194b22207cdcfad3dcdefe987bfe2`, con el PR #554 fusionado. Su imagen pasó el ensayo nativo sobre el respaldo restaurado: 52 modelos, cero diferencias declaradas y `/health`, `/health/ready`, `/health/full` con 200. Esa prueba utilizó un login local READ ONLY y no certificó proveedores, escrituras funcionales ni producción.

La conexión autenticada de Supabase confirma el destino esperado, PostgreSQL 17.6 y estado ACTIVE_HEALTHY. La consulta exacta [preflight.sql](preflight.sql) se ejecutó el 26-nov-2026 a las 02:15 UTC en una transacción REPEATABLE READ READ ONLY, terminada con ROLLBACK. Devuelve metadatos y booleanos; no devuelve registros de aplicación, contraseñas ni mensajes de logs. Su hash y resultados están en [verification.json](verification.json).

Para repetirla, seleccionar el proyecto de TAD por su referencia esperada **independientemente del SQL** en la conexión autenticada, ejecutar el archivo completo y exigir `readOnly=on`. Un nombre de base `postgres` o una referencia escrita como literal dentro de una consulta no prueban el destino. Un error, timeout o resultado parcial no satisface la comprobación; cerrar/revertir la transacción y diagnosticar antes de repetir.

## Evidencia y matriz de riesgo

| Comprobación                                                                       | Resultado productivo                                                                  |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Tablas públicas / modelos presentes                                                | 33 / 29 de 52; cuatro tablas quedan fuera de esos modelos                             |
| Modelos ausentes                                                                   | 23                                                                                    |
| Columnas ausentes en modelos existentes                                            | 39: 31 de dominio + cinco referencias canónicas + tres bindings enum                  |
| GPS                                                                                | Falta telemetry.coords y la extensión PostGIS                                         |
| Enum                                                                               | Falta public.SystemStatus; los bindings ausentes se contabilizan como columnas        |
| PK / tipos escalares incompatibles detectados                                      | 0 / 0                                                                                 |
| Relaciones incompatibles detectadas                                                | 0 entre extremos presentes; las columnas canónicas ausentes impiden evaluar las demás |
| Drivers, devices, driver_locations, campaign_expirations, subscriptions, telemetry | Las seis tablas están vacías                                                          |
| Códigos monetarios existentes                                                      | Sin NULL ni códigos fuera de DOP/USD/EUR; no se modificaron importes                  |
| Historial Prisma                                                                   | 23 terminadas, cero sin resolver, cero revertidas                                     |

**El historial terminado y los contadores de incompatibilidad en cero no acreditan paridad.** Las tablas/columnas ausentes siguen bloqueando el arranque. No repetir migraciones históricas, editar su ledger ni relajar el gate de esquema para evitar el error.

El rol conectado es `postgres`, con BYPASSRLS, sin SUPERUSER y sin capacidad de `SET ROLE supabase_admin`. PostGIS 3.3.7 está disponible y figura en `supautils.privileged_extensions`, con `supabase_admin` configurado como ejecutor interno. Esto es evidencia de configuración, **no una prueba de instalación**. El ensayo J usa una sesión bootstrap y `SET ROLE supabase_admin`; ese comando no se puede trasladar al destino. Supabase documenta la creación de PostGIS en `extensions`, y supautils permite operaciones acotadas a roles administrados sin conceder SUPERUSER. El adaptador debe ensayar esa ruta y comprobar propietarios/ACL reales antes de promoverla. Fuentes: [PostGIS en Supabase](https://supabase.com/docs/guides/database/extensions/postgis), [supautils](https://github.com/supabase/supautils).

Los logs de PostgreSQL entre 01:00 y 02:09 UTC solo devolvieron severidad LOG/SQLSTATE 00000 en la agregación inspeccionada. No son los logs del contenedor Nest ni prueban su arranque. El asesor informa nueve tablas con RLS sin políticas, dos funciones con search_path mutable y una advertencia de protección de contraseñas filtradas. No se inventaron políticas ni se cambiaron esos objetos.

Un ensayo sintético separado terminó PASS a las 02:16:49 UTC: en la imagen PostgreSQL fijada por digest, un login `postgres` sin SUPERUSER ni capacidad de asumir `supabase_admin`, miembro de los roles administrado y de lectura de settings observados, cargó `supautils` y ejecutó la creación de PostGIS 3.3.7 en `extensions` sin `SET ROLE supabase_admin`. La extensión conservó propietario `supabase_admin`. Se comprobó geography(Point,4326), 2D, NOT NULL y una inserción sintética revertida. Red interna, root de solo lectura, tmpfs, cero puertos/montajes y logs desactivados; limpieza verificada. Esta prueba acota la ruta de instalación administrada: no ensaya todas las familias, el catálogo/ACL productivos ni el adaptador completo. Las dos primeras preparaciones del harness fallaron al inspeccionar settings protegidos; el fixture se corrigió con la membresía de lectura que ya existe en producción. No se concedieron permisos productivos.

## Procedimiento mínimo y aceptación pendiente

1. **Recuperación y configuración (P0).** Conservar el respaldo cifrado verificado y una captura reciente antes del cambio. Completar la custodia independiente de la contraseña maestra de KeePass: su protección actual depende de este Windows. Preservar cifrados la configuración esencial de EasyPanel, volúmenes, dominios, límites, nombres de variables y digest anterior; nunca publicar valores. Un respaldo de DB no cubre automáticamente archivos Storage, contraseñas de roles ni toda la configuración del servicio. Véase [alcance de backups](https://supabase.com/docs/guides/platform/backups).
2. **Adaptador productivo (P0/P1; NOT RUN).** Preparar un lote separado de los SQL del clon. Mantener las definiciones ensayadas A–E → users UUID → referencias canónicas → enums → columnas → GPS. Sustituir únicamente la guardia del clon y la instalación privilegiada por contratos revisados para el destino confirmado. Fijar hashes de código, SQL, catálogo y respaldo; abortar ante cambios. Revalidar ausencia, propietario, tipos, unicidad, códigos monetarios y tablas vacías dentro de los locks de cada transacción. Mantener lock_timeout 5s y statement_timeout 30s; un timeout exige diagnóstico, sin incrementarlo a ciegas. Registrar cada familia confirmada y no repetir una familia parcialmente aplicada. El ensayo actual no acredita este adaptador.
3. **Acceso y conservación (P0/P1; NOT RUN).** Conservar columnas/índices/vistas originales y compatibilidad de escritura; verificar fingerprints y funciones/ACL por familia. No copiar usuarios de Auth, convertir identidades históricas, ajustar dinero, añadir permisos amplios ni tocar spatial_ref_sys. Ensayar el lote con el rol no-superusuario y la configuración administrada equivalente; comprobar las rutinas PostGIS contra la instalación limpia aceptada. RLS que deniega todo no certifica permisos funcionales por tenant/rol. Preparar y revisar la operación concreta y su reversión antes de ejecutar DDL productivo.
4. **Imagen y runtime (P0/P1; NOT RUN).** Resolver la contención/rotación coordinada de #244 y comprobar los controles de promoción de #313. Obtener acceso autenticado de EasyPanel, conservar su configuración y verificar el SHA/digest desplegado. Construir sin credenciales productivas y promocionar una imagen inmutable. Tras el cambio revisado, comprobar el mismo catálogo y entrypoint, salud/readiness/full 200, DB/vista listas, 401 sin sesión y permisos positivos/negativos de los roles. Incluir proveedores, Auth, player offline→reconexión→sync idempotente y carga 10× antes de declarar el release completo. El build verde o main fusionado no prueban el digest activo.

## Reversión por capa y STOP

- **Esta tarjeta:** revertir los archivos publicados; la base no ha cambiado.
- **Familia SQL aún no confirmada:** ROLLBACK y conservar evidencia saneada. Las familias previas requieren una inspección nueva antes de continuar.
- **Expansión ya confirmada:** conservar tablas/columnas y datos nuevos; usar una versión compatible o un roll-forward revisado. No borrar objetos poblados ni restaurar todo el respaldo para deshacer un cambio de código. La restauración total exige evaluar RPO, escrituras posteriores y ventana operativa.
- **Aplicación/configuración:** volver al digest compatible previamente conservado y a configuración validada. No restaurar secretos comprometidos ni promover una imagen incompatible con el catálogo.
- **Secretos/sesiones:** rotación coordinada con #244, dependencias y colas offline; no reutilizar llaves revocadas como rollback.

STOP ante destino no probado, filas nuevas en tablas que debían estar vacías, cambio de fingerprints, objetos parciales, permisos inesperados, fallo de lock, ausencia de respaldo/custodia independiente o falta de evidencia de configuración/digest. Conservar #217 abierto hasta verificar el destino productivo. Esta tarjeta no cambia protecciones de rama ni resuelve #244/#313 por inferencia.
