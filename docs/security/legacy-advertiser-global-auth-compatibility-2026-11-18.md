# P1 — La sesión de contraseña del anunciante es rechazada por el guard global

**Fecha:** 18 de noviembre de 2026. **Ámbito:** API NestJS / `SupabaseAuthGuard`, sin migraciones ni operaciones financieras.

## Evidencia → causa raíz

La PR #289 introdujo en la API `GET /api/v1/advertisers/session` para la verificación de la sesión legacy utilizada por el middleware Next.js. Ese endpoint es `@Public` y valida el JWT mediante `AdvertisersService.verifyAdvertiserSession`.

No obstante, los endpoints privados (por ejemplo, `GET /api/v1/advertisers/:id/portal`) siguen detrás de `SupabaseAuthGuard`, que exige una sesión de Supabase con `aud=authenticated`, `role=authenticated` y `session_id`.

`AdvertisersService.login` devuelve un JWT HS256 firmado por la API con `sub=advertiser.id`, `role=ADVERTISER`, `app_metadata.role=ADVERTISER`, `app_metadata.entityId=advertiser.id`, y `email`. **Este JWT no contiene** `session_id` ni `aud=authenticated`. El guard global lo rechaza y la consulta alternativa a `supabase.auth.getUser(token)` también lo rechaza al no ser un token Supabase.

Por tanto, una sesión puede superar el middleware Next.js y recibir HTTP 401 en los endpoints privados. El fallo está sustentado por los contratos del código; **no se ha capturado todavía una respuesta 401 de una cuenta real en producción**.

## Corrección mínima segura

El guard global detecta la forma de una sesión legacy **solo como pista de enrutamiento de la verificación** (no como autorización). Para tokens con `role=ADVERTISER`, `app_metadata.role=ADVERTISER` y sin `session_id`, solicita **exclusivamente** `AdvertisersService.verifyAdvertiserSession(token)`:

- Verificación criptográfica de firma HS256 y expiración, usando el mismo secreto configurado con el que firma `login`.
- Verificación de `sub` y `app_metadata.entityId` contra la identidad del anunciante en Prisma.
- Corroboración de email y estado actual. Solo `ACTIVE` y `PENDING_REVIEW`; las cuentas suspendidas, inexistentes y tokens falsificados se rechazan.
- Una vez verificado, se establece `request.user = { id, email, role, entityId }` con `entityId` **derivado del ID verificado**, nunca de una reclamación cliente no validada.
- En fallo no hay fallback a Supabase, caché, impersonación ni bypass de desarrollo. El camino actual de tokens Supabase (JWT con `session_id`, validación local/a través de GoTrue) continúa igual.
- El guard deja el token legacy en modo público sin autocompletar `request.user`; el endpoint público `/advertisers/session` lo verifica una sola vez en su controller (evita dos consultas por navegación).
- Se mantiene el rechazo previo de tokens de emparejamiento de dispositivos, aun si su payload intenta fingir `ADVERTISER`.

**Trade-off:** la capa de autorización depende de `AdvertisersService` para identidades legacy y requiere una lectura PostgreSQL por petición protegida. A 10× tráfico, medir p95 de auth, consultas DB y 401/503; no cachear sesiones de cuentas suspendidas sin diseñar revocación verificable.

## Verificación

Tests modificados: `apps/api/src/modules/auth/guards/supabase-auth.guard.spec.ts`, ahora con mock del verificador de anunciantes inyectado. Cubren: JWT legacy válido, firma falsa, usuario suspendido, email ausente, endpoint `@Public` sin doble DB lookup y rechazo de pairing JWT, sin perder las pruebas existentes para Supabase.

El gate `scripts/advertiser-offer-local-gate.sh` incluye estas suites junto con `advertisers-session.spec.ts`.

**Ejecutado en esta sesión:** 8/8 escenarios aislados del bloque real de selección/autorización del guard, con verificador aislado y contexto simulado (firma/DB verificadas por la suite `advertisers-session.spec.ts`, aún pendiente de ejecución real); comprobación estructural de export de `AdvertisersService` desde `AdvertisersModule` y de `AdvertisersModule` en `AppModule`.

**No ejecutado:** Jest de NestJS, compilación TS, build de API/advertiser, navegador/portal real, ni verificación en EasyPanel. No confundir análisis estático y pruebas aisladas con E2E o con despliegue confirmado.

## Publicación segura

1. Ejecutar pruebas en un checkout autorizado sin credenciales reales:
```bash
bash scripts/advertiser-offer-local-gate.sh
pnpm --filter api exec jest --runInBand \
  src/modules/auth/guards/supabase-auth.guard.spec.ts \
  src/modules/advertisers/advertisers-session.spec.ts
```
2. En un entorno de pruebas, iniciar sesión como anunciante con email/contraseña y comprobar que `GET /api/v1/advertisers/:id/portal` devuelve 200 **solo para el mismo :id**, mientras otros `:id` reciben 401/403.
3. Confirmar que un token tamperado, uno expirado, cuentas suspendidas, `role=DRIVER` y pairing JWT son rechazados.
4. Verificar OAuth Supabase y la ruta `/advertisers/session` existentes antes/después del cambio.
5. Desplegar API antes del siguiente build de advertiser, preservando rollback; no aplicar cambios a tablets, base de datos, wallets o facturación.

**Estado:** corrección en rama separada; pendiente de QA integral, aprobación y despliegue.


## Seguimiento de coherencia del inicio de sesión — 18 de noviembre de 2026

**Evidencia adicional:** `AdvertisersService.verifyAdvertiserSession()` admite únicamente anunciantes `ACTIVE` y `PENDING_REVIEW`. Sin embargo, `AdvertisersService.login()` seguía firmando y devolviendo un JWT válido tras comprobar la contraseña **sin verificar el estado actual del anunciante**. Una cuenta `SUSPENDED` recibía el token, pero la navegación y la API lo rechazaban inmediatamente; esto genera una falsa sesión iniciada.

Se añadió un control de estado **después de verificar contraseña y antes de firmar el JWT**, para aceptar solamente `ACTIVE` y `PENDING_REVIEW`. Se conserva el error genérico de credenciales ante contraseña incorrecta (no revelar el estado con una clave inválida). No cambian el emisor del token, las cookies, la estrategia OAuth, la RBAC ni las rutas públicas.

Nueva prueba Jest `apps/api/src/modules/advertisers/advertisers-login-status.spec.ts`: login de ambos estados permitidos, comprobación de token firmado/aceptado por el validador actual y denegación de estados suspendidos/desconocidos, contraseña incorrecta y cuenta inexistente. El gate local de QA incluye la suite.

**Verificación hecha:** 7/7 escenarios ejecutados sobre el cuerpo real del método TS (anotaciones eliminadas, hashing y firma simulados), incluyendo la condición «token no firmado» para los cinco casos de rechazo. **No equivale a ejecutar Jest, bcrypt/jwt reales, NestJS ni el despliegue.** No se deben emitir afirmaciones de verificación integral hasta ejecutar `bash scripts/advertiser-offer-local-gate.sh`.

**Dependencia operativa separada:** el servicio Railway `tad-dooh-platform` no cuenta con variables de seguridad y se encuentra sin réplicas funcionales. Incidente #260; no confundirlo con EasyPanel ni aprovisionar secretos de forma improvisada.
