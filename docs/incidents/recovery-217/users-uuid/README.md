# #217 — UUID de perfiles de aplicación y creadores de campaña

Estado: candidato; producción sin DDL.

El ensayo del #547 dejó users pendiente porque campaigns.created_by ya es UUID y User.id aún se declaraba TEXT en Prisma. Este cambio añade @db.Uuid a User.id y Campaign.createdById; no cambia los valores almacenados en campañas. El uuid() existente continúa generándose en el cliente.

public.users contiene perfiles/roles de aplicación. Supabase Auth sigue autenticando la sesión. Un UUID del perfil no se convierte automáticamente en el ID de Auth: login resuelve el rol con búsquedas explícitas, y el mantenimiento solo actualiza identidades Auth previamente existentes. No se ejecuta mantenimiento ni aprovisionamiento en esta intervención. La correspondencia de identidades, las rutas de perfil y la provisión individual siguen necesitando verificación antes de un release funcional.

F-users.sql crea la tabla vacía en un clon restaurado después de las cinco familias del #547. Preserva las columnas actuales del modelo, incluida la contraseña heredada; no copia contraseñas, identidades ni claims de Auth. Tampoco agrega una FK sobre las campañas existentes ni inventa perfiles para sus creadores. Esas comprobaciones de procedencia e integridad quedan separadas del ajuste de tipos.

El SQL exige base restored, socket Unix y marcador de ensayo. Verifica el tipo UUID de campaigns.created_by, conserva propietarios y filas existentes, aplica RLS ENABLE/FORCE y revoca permisos generales. Los privilegios de aplicación deben diseñarse y probarse aparte. Ningún archivo se añade a prisma/migrations ni al entrypoint.

manifest.json referencia las cinco familias previas mediante rutas relativas a docs/incidents/recovery-217 y sus SHA-256 originales. Añade la sexta familia y la huella LF del schema candidato. No sustituye ni modifica la evidencia histórica del lote de 22 tablas.

Verificación prevista: regresión de tipos con catálogo UUID, rechazo de una tabla users TEXT, consultas SQL con UUID válido/inválido y join de creador, Prisma 5.22 validate/generate en directorio privado, TypeScript, contratos y pruebas de API; después restauración real con fingerprints de las 70 tablas originales, tablas nuevas vacías, roles y metadatos preservados por familia. Los resultados finales se registran en verification.json.

Persisten 31 columnas ausentes, seis relaciones incompatibles y GPS/PostGIS. El catálogo completo, los permisos por rol/tenant, los flujos Auth, el replay offline, la carga y la recuperación de configuración/custodia deben verificarse antes de un despliegue de esquema. Reversión del ensayo: eliminar solo el clon propio; un revert de código no revierte una base activa.

Resultado del ensayo restaurado: 23 → 20 → 16 → 10 → 2 → 1 → 0 tablas ausentes, con 52/52 modelos presentes y las 70 tablas originales intactas. Persisten 31 columnas, seis relaciones y dos problemas GPS/PostGIS. El ensayo sintético pasó 276 denegaciones, tres rechazos de idempotencia y las comprobaciones específicas UUID. Limpieza del clon y de la llave cifrada temporal verificada.

Validación de aplicación completada: Prisma 5.22 validate/generate y TypeScript pasaron; 60 contratos y 99 suites/873 pruebas de API pasaron con cliente aislado y variables sintéticas. El cliente Prisma compartido se conserva. Antes de DDL, el ajuste de código puede revertirse sin cambios de datos; si en una futura etapa se crea users.id UUID, cualquier versión de retorno debe conservar ese tipo compatible.
