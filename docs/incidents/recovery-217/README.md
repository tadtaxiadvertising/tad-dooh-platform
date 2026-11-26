# #217 — expansión de tablas en clon aislado

Estado: BORRADOR PARA REVISIÓN; ejecución en producción no realizada.

El runtime de EasyPanel proporcionado el 25-nov-2026 rechaza el arranque por paridad de esquema. Su SHA-256 del schema LF (c519f00738b0486bff98174d35fd240f724c72e5bfe391126a4406f10ad7e49c) coincide con main 098f10e0c2015ed412d588a70bc1f835e4013287. Los PR #545/#546 no cambiaron el árbol 229ced6f2f6cd5f36874968593a81bdd5dd8ea24. Un build correcto no modifica la base de datos.

La consulta de catálogo del 25-nov-2026 18:22 UTC usó una transacción READ ONLY con verificación efectiva: 33 tablas públicas, 346 columnas, 23 tablas de modelos ausentes, 31 columnas ausentes, cero diferencias de PK/tipos escalares, seis relaciones incompatibles y dos problemas GPS/PostGIS.

Este borrador añade 22 de las 23 tablas ausentes, sus 64 índices declarados, 17 FKs y la secuencia de campaign_metrics. Conserva el contrato Prisma 5.22 del código aprobado. No rellena tablas, copia identidades Auth, crea usuarios, ejecuta pagos ni modifica columnas, filas, políticas o permisos existentes. Los tipos monetarios del schema se preservan; no se aprovecha la recuperación para cambiar unidades o precisión.

## Orden del ensayo

| Familia    | Tablas | Índices declarados | FKs |
| ---------- | -----: | -----------------: | --: |
| A-identity |      3 |                  6 |   3 |
| B-ingest   |      4 |                  9 |   5 |
| C-crm      |      6 |                 24 |   2 |
| D-finance  |      8 |                 24 |   7 |
| E-bi       |      1 |                  1 |   0 |

Cada familia usa una transacción propia, exige que todas sus tablas estén ausentes y verifica propietario, tipo y unicidad de sus padres existentes. Un intento repetido se rechaza sin efectos; no usa IF NOT EXISTS para aceptar formas parciales. El ensayo solo admite la base restored, conexión por socket Unix y el marcador de sesión tad.recovery_scope=isolated-clone-217. Estas comprobaciones limitan errores operativos; no sustituyen la autenticación ni la revisión del destino.

Las tablas nuevas pertenecen a postgres, con RLS ENABLE/FORCE y cero políticas. Se revocan permisos de PUBLIC, anon, authenticated y service_role; la secuencia nueva recibe la misma restricción. Privilegios por defecto inesperados abortan la familia. Los accesos privilegiados, incluidos superusuarios y miembros de postgres, conservan sus capacidades. Los permisos de aplicación, tenant y rol requieren una etapa independiente; denegar todo no prueba que los flujos funcionales estén autorizados correctamente.

Estos archivos permanecen fuera de prisma/migrations y no están conectados al entrypoint ni a un workflow. No se debe copiar este lote a producción o al historial de migraciones. No edita _prisma_migrations ni repite SQL histórico.

## Verificación y límites

Los resultados del ensayo se documentan en verification.json cuando concluyan. El respaldo real se restaura únicamente en tmpfs, sin puertos, bind mounts ni salida a Internet, con logs de contenedor desactivados. Los fingerprints de las 70 tablas originales, sus metadatos y roles deben seguir iguales después de cada familia. Las nuevas tablas deben quedar vacías. El ensayo de datos sintéticos verifica rechazos de permisos, claves de idempotencia y abortos atómicos.

La expansión deja pendientes users, las 31 columnas, seis relaciones y GPS/PostGIS. Los valores históricos de consentimiento, suscripción, simulación e identidad no se infieren mediante defaults. La configuración esencial de recuperación y custodia independiente de la llave siguen pendientes. No acredita salud de API ni readiness de producción.

Reversión del ensayo: destruir exclusivamente el clon y verificar su ausencia. No borrar tablas activas ni restaurar producción como sustituto de una transición revisada. Antes de un release hacen falta contratos de acceso, transición de identidades, pruebas de API/player offline e idempotencia y un plan de operación y reversión para el destino confirmado.

La prueba de carga 10× y la cobertura adicional de índices FK de playlists.campaign_id y campaign_metrics.device_id están pendientes. El borrador reproduce los índices declarados por Prisma; su ensayo de catálogo no acredita rendimiento de producción.

## Tabla de usuarios separada del lote

El primer ensayo restaurado detectó una séptima relación incompatible al crear users.id como TEXT: campaigns.created_by ya es UUID. El comparador solo puede cotejar tipos cuando ambos extremos existen; la ausencia previa de users ocultaba esta arista. Por eso se excluye users de este candidato. Deben resolverse la autoridad de identidad respecto a Supabase Auth y el contrato UUID de User/Campaign antes de preparar esa tabla. No convertir campaigns.created_by ni copiar identidades para reducir el contador. El borrador original de 23 tablas no superó el ensayo real y no se publica como aceptado.

Resultado final del 25-nov-2026: PASS sintético (264 rechazos de permisos; tres duplicados rechazados) y PASS sobre restauración real. Se añaden 22 tablas vacías; los fingerprints y metadatos de las 70 originales y los roles siguen iguales por familia. Tablas ausentes en el clon: 23 → 20 → 16 → 10 → 2 → 1. Se verificó la limpieza del clon y del archivo de llave cifrada temporal. No hay escrituras en producción. Véase verification.json.

## Continuación: contrato UUID de users

La prueba de 22 tablas descrita arriba se conserva como evidencia histórica. La continuación en [users-uuid/README.md](users-uuid/README.md) añade las anotaciones UUID del perfil y creador de campaña y ensaya la sexta familia: 23 tablas recuperadas en el clon, cero tablas de modelos ausentes, con los datos originales intactos. No equivale a un cambio de esquema en producción ni a paridad completa.

## Continuación: dispositivo GPS con UUID interno

La tarjeta [gps-device-identity/README.md](gps-device-identity/README.md) corrige la relación de DriverLocation con Device.id y los cinco consumidores que mezclaban UUID y hardware. Una consulta Prisma real de solo lectura verifica esa unión; el catálogo del candidato conserva 23 tablas y 31 columnas ausentes, cinco relaciones incompatibles y dos problemas GPS/PostGIS. No ejecuta migraciones ni declara recuperado el runtime.

## Continuación: referencias compatibles con la vista del player

La tarjeta [identity-relations/README.md](identity-relations/README.md) conserva las columnas originales y mv_active_campaigns, y añade cinco referencias canónicas con compatibilidad de escritura. El ensayo restaurado conserva los valores de las 70 tablas, roles e índices y verifica esas relaciones; quedan 31 columnas y GPS/PostGIS. Una consulta READ ONLY confirmó además el contrato SystemStatus ausente que el comparador todavía no cubre. No hay DDL productivo ni salud de runtime acreditada.

## Continuación: enums fuera del comparador anterior

La tarjeta [enum-preflight/README.md](enum-preflight/README.md) amplía la inspección READ ONLY y el gate CLI para detectar tipos, bindings y labels de enums. Verifica cuatro problemas reales que antes no se contabilizaban, incluidos SystemStatus y Currency. No cambia datos ni acredita reparación de esos contratos.

## Continuación: columnas nativas para enums

La tarjeta [enum-storage/README.md](enum-storage/README.md) conserva las columnas TEXT y añade bindings nativos para SystemStatus/Currency. El SQL exige tablas de estados vacías y códigos de moneda exactos; los defaults efectivos pasan a triggers que rechazan pares contradictorios. La prueba sintética verifica Prisma real, 11 guardas, 10 escrituras inválidas y 42 denegaciones. El resultado del ensayo restaurado queda en su verification.json. No es DDL productivo ni paridad completa de la API.

## Continuación: 31 columnas bajo guardas de tablas vacías

La tarjeta [missing-columns/README.md](missing-columns/README.md) recupera las 31 columnas y ocho índices sin interpretar filas históricas. El ensayo cifrado conserva las 70 tablas originales y los objetos fuera del cambio: cero tablas/columnas/enums/relaciones declaradas ausentes o incompatibles; quedan dos problemas GPS/PostGIS. Prisma lee los 52 modelos (una fila como máximo por modelo) y verifica altas locales de Driver/Device/Subscription/DriverLocation revertidas en una transacción. No acredita salud productiva, todos los valores históricos, permisos funcionales ni el arranque completo de la API.

## Continuación: GPS/PostGIS y coordenadas válidas

La tarjeta [gps-postgis/README.md](gps-postgis/README.md) califica el SQL GPS y exige geography(Point,4326) de dos dimensiones, NOT NULL, en extensions. Rechaza lotes con coordenadas inválidas antes de escribir. El ensayo cifrado concluido el 26-nov-2026 01:26 UTC conserva los datos originales, verifica los 52 modelos mediante Prisma nativo y alcanza cero diferencias de catálogo, incluidos enums y GPS. Las 744 rutinas/agregados nuevos se comparan con una instalación limpia de PostGIS 3.3.7 y sus ACL con los privilegios por defecto existentes; no se modifican funciones o permisos originales ni objetos espaciales administrados. Es evidencia de un clon aislado, con rollback de las filas futuras y limpieza verificada; producción y los controles de release siguen pendientes.

## Continuación: transición al destino productivo

La tarjeta [production-transition/README.md](production-transition/README.md) publica el preflight READ ONLY ejecutado el 26-nov-2026 02:15 UTC: producción conserva 23 tablas y 39 columnas ausentes, SystemStatus y GPS pendientes, aunque las 23 migraciones del ledger estén terminadas. Distingue el rol administrado del bootstrap del clon y documenta los requisitos y la reversión por capa. No ejecuta DDL productivo ni conecta el SQL del clon al arranque.

## Continuación: inicialización del módulo de configuración

Después de superar el gate de esquema, el primer ensayo de la imagen detectó que el guard local de SystemSettingsController no podía resolver AdvertisersService en ese módulo. El controlador ahora utiliza la autenticación y RBAC globales ya registrados en AppModule; mantiene ADMIN en GET y PUT. La regresión carga el AppModule real y usa JWT y guards reales: sin sesión se rechaza configuración y BI con 401; DRIVER recibe 403 y ADMIN obtiene 200 en GET/PUT de configuración, con una sola ejecución de autenticación por petición. Solo se sustituyen los límites de I/O de Prisma, Supabase, Sheets y correo. La validación posterior del entrypoint y HTTP sobre el respaldo restaurado se documenta en el PR de esta continuación; los proveedores externos y las operaciones financieras siguen fuera de esa prueba de arranque.
