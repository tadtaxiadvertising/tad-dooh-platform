# Secuencia completa con rol administrado — #217

## GOAL / PLAN / LOOP / STOP

Esta tarjeta adapta las diez familias aceptadas para ensayarlas como `postgres` sin SUPERUSER ni capacidad de asumir `supabase_admin`. Mantiene el destino restringido a un clon propio `restored`, socket Unix y marcador de ensayo. **No contiene un modo productivo, no ejecuta DDL en Supabase y no resuelve por sí sola la transición productiva.** El cierre y los resultados del ensayo se registran en `verification.json` cuando terminan; una ejecución incompleta conserva su estado y error.

## Línea base, permisos y alcance

Base: main `e3e041ebc20cd9d98bc2877e788c98f52acc6b61`, después del PR #555. Las familias originales permanecen intactas. [manifest.json](manifest.json) fija su orden A–J, rutas, hashes SHA256 de texto normalizado a LF y cada sentencia de cambio de rol que puede retirarse.

[compile.py](compile.py) valida todos los archivos antes de escribir resultados. Solo sustituye la guarda del clon por la del llamador administrado, retira los cambios de rol enumerados y actualiza el comentario explicativo de PostGIS. Conserva las definiciones de tablas, índices, funciones, triggers, comprobaciones, locks, timeouts y límites BEGIN/COMMIT. La instalación J se ejecuta por la ruta `supautils`, sin `SET ROLE supabase_admin`.

La guarda exige `session_user=current_user=postgres`, rol no-superusuario con BYPASSRLS, herencia del rol privilegiado y de lectura de settings, carga de `supautils` y ausencia de capacidad de asumir `supabase_admin`, además del destino local. La pertenencia a esos roles reproduce las capacidades observadas; no se conceden permisos en producción ni se cambia la autoridad de las tablas espaciales. La configuración acotada de `supautils` se prepara únicamente en el clúster efímero del ensayo.

## Invariantes y matriz de riesgo

| Riesgo                       | Comprobación                                                                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| SQL distinto al revisado     | Hash por familia, orden fijo, rechazo de rutas externas y role switches nuevos                                                       |
| Conexión o llamador erróneo  | Rechazos de bootstrap, base incorrecta y marcador ausente sin efectos                                                                |
| Pérdida de datos o contratos | Verificadores originales por familia: proyecciones de las 70 tablas, roles, metadatos y objetos fuera del cambio                     |
| Privilegios PostGIS          | Instalación administrada; rutinas y agregados contra el oráculo limpio PostGIS 3.3.7; ACL contra los defaults existentes             |
| Contrato de aplicación       | Comparador de paridad actual, Prisma nativo, modelos y operaciones futuras revertidas                                                |
| Fuga del respaldo            | Descifrado en memoria/tmpfs, red interna, sin puertos/montajes host; logs desactivados en el ensayo restaurado y limpieza verificada |

Los verificadores originales se reutilizan mediante adaptadores en memoria; sus archivos y evidencia aceptada no se reescriben. El DDL se envía a sesiones `postgres` y se registran familia, exit code y SQLSTATE, sin filas ni mensajes sensibles. Las comprobaciones de inventario y dump siguen usando el bootstrap local de lectura para conservar su cobertura, no para ejecutar las familias. Los probes Prisma usan el login administrado con una contraseña local nueva.

## Procedimiento y evidencia

Desde la raíz del repositorio:

```text
python -B -m unittest discover -s docs/incidents/recovery-217/managed-transition -p test_compile.py -v
python -B docs/incidents/recovery-217/managed-transition/compile.py --out <directorio-nuevo-del-ensayo>
```

La salida siempre contiene las guardas del clon; cambiar la URL no habilita producción. El directorio de salida debe ser nuevo. Las seis pruebas offline comprueban conservación exacta del cuerpo salvo las transformaciones declaradas y rechazan SQL modificado, una ruta externa, otro orden, un role switch no previsto y modo producción. No instalan paquetes ni requieren credenciales.

El ensayo privado ejecuta primero los fixtures sintéticos de A–F, G, H, I y J con los verificadores aceptados. Luego restaura el paquete cifrado validado y aplica A–J en una única secuencia, con los controles originales por familia. Los hashes de fuentes, compilador, manifest y harness se fijan antes y después; una mutación invalida la evidencia correspondiente. Los resultados públicos omiten inventarios de filas, credenciales, rutas privadas y contenidos del respaldo.

Resultado del 26-nov-2026: **PASS** sintético a las 03:08:09 UTC y **PASS** de la secuencia restaurada con API a las 03:11:34 UTC. Las diez familias se ejecutaron como el login administrado; los 15 rechazos sintéticos de destino/llamador y 276 denegaciones de A–F pasaron, además de los verificadores de G/H/I/J. El respaldo restaurado conserva las 70 tablas originales, suma 23, alcanza cero diferencias declaradas y pasa lecturas READ ONLY de los 52 modelos. Las 744 rutinas/agregados PostGIS y sus ACL coinciden con los oráculos aceptados.

La imagen real de la API arrancó después de esa secuencia: target y schema verificados, Nest escuchando, health/readiness/full 200, DB y vista listas en full; conductores/configuración/BI 401 sin sesión. La inicialización no pudo escribir mediante el login READ ONLY. Se verificaron datos, catálogo y roles tras apagarla, y la limpieza del clon y llave temporal. Es una prueba de arranque, no de proveedores o de todos los flujos funcionales. Véase [verification.json](verification.json).

La lectura productiva de las 03:03:46 UTC volvió a comprobar TARGET_MATCH y READ ONLY mediante la conexión local configurada, después de que el conector devolviera un error de permisos: 23 tablas y 39 columnas ausentes y SystemStatus pendiente. Esa lectura de catálogo no ejecutó DDL/DML ni recuperó registros de aplicación; producción no recibió esta expansión.

## Reversión por capa y pendientes

Cada familia conserva su transacción y su rechazo de repetición. Un fallo antes de COMMIT revierte esa familia; no implica revertir las familias previas. El ensayo completo se elimina al finalizar y se verifica la ausencia de recursos y llave temporal. Revertir este código documental no revierte una base externa.

Antes de producir un lote para el destino real falta una guarda productiva revisada y ligada a la conexión confirmada, catálogo/backup reciente, prerrequisitos operativos y una operación concreta de reversión o roll-forward. No sustituir las guardas manualmente ni copiar el SQL del clon a Supabase. Mantener las columnas originales y la vista del player; no inferir consentimientos, identidades o reglas económicas históricas, ni repetir el ledger Prisma.

La captura cifrada de seis páginas de EasyPanel y su copia privada de Drive están verificadas como captura de UI; no acreditan una restauración completa de configuración, contenido de volúmenes ni digest activo. La custodia independiente de la contraseña maestra, la contención/rotación coordinada #244, las promociones/proveedores #313 y las pruebas funcionales/Auth/player offline/carga siguen siendo requisitos de publicación. Véase [transición productiva](../production-transition/README.md).

STOP ante fuente/hash cambiado, caller privilegiado inesperado, catálogo parcial, filas en tablas que debían estar vacías, fingerprint distinto, timeout o limpieza incompleta. Conservar el fallo y diagnosticarlo antes de otra ejecución. Estado de release: **PENDIENTE**.
