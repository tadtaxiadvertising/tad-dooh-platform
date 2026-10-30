# Gestión de cookies y almacenamiento de los portales TAD

Fecha: 2026-10-30, America/La_Paz. Alcance: Admin, Anunciante y Driver web. Implementación compartida en `packages/services` y `packages/ui`.

## Contrato y decisiones

- Necesarias siempre disponibles para sesión, seguridad y funcionamiento solicitado. Rechazar opciones adicionales nunca autoriza bloquear registro, inicio de sesión ni sincronización operativa.
- Preferencias adicionales, analítica y marketing: desactivadas por defecto. La analítica del sitio se distingue de la medición contractual, facturación, auditoría de seguridad y telemetría operativa de dispositivos.
- Aceptar, rechazar y personalizar tienen controles equivalentes. Cambiar un interruptor no guarda nada: solo una acción explícita confirma la selección completa en una escritura.
- `tad_cookie_preferences` usa localStorage del origen, no una cookie compartida entre subdominios. No incluye identificadores personales, tokens ni cuenta. Formato v2 con versión de política, categorías, fecha y caducidad.
- Conservación elegida para el producto: 180 días tanto para aceptar como para rechazar. Una política nueva, formato viejo/corrupto o plazo vencido pide elegir de nuevo y bloquea opciones adicionales mientras tanto.
- Una preferencia pertenece al navegador y portal donde se eligió. Las pestañas del mismo origen reciben los cambios mediante eventos; al vencer el plazo o recuperar el foco se revisa el estado.
- GPC o DNT desactivan analítica y marketing incluso con una autorización guardada. Las necesarias no se pueden apagar en el selector.
- Almacenamiento bloqueado: la elección se aplica en memoria en la pestaña y la interfaz avisa de que no se conservará. Recargar puede volver a preguntar. No se finge persistencia.
- El botón permanente «Configuración de cookies» permite revisar o retirar el permiso. Cerrar sin guardar no acepta nada. Las páginas legales son accesibles sin sesión.

## Evidencia inicial y tarjetas de trabajo

Preguntas que condicionaron el diseño: qué código se ejecuta en los tres portales; qué almacenamiento corresponde a sesión; qué integraciones opcionales realmente se cargan; qué elimina logout; qué rutas permiten consultar la política sin autenticarse.

| Hallazgo | Evidencia inicial | Impacto y prioridad | Corrección y prueba |
| --- | --- | --- | --- |
| Solo se podía aceptar; cada cambio guardaba el estado anterior | `CookieBanner.tsx`, cuatro llamadas a `updatePreference` con cierre sobre estado previo | P2: decisión incorrecta y controles ausentes | Selección atómica, rechazo/personalización/reapertura; pruebas de persistencia y navegador |
| Basta cualquier cadena para ocultar el aviso | `_app.tsx` de cada portal, `!!stored` | P2: preferencias inválidas aceptadas indefinidamente | Validación de formato/versión/fechas y vencimiento |
| Driver inserta Umami en el HTML inicial | `apps/driver/pages/_document.tsx` | P2: analítica previa a elegir | Carga exclusivamente después de permiso, sin auto-tracking, compuerta por envío |
| Sesión canónica no usa prefijo del SDK, falla Unicode y supera el límite de cookie | `session-cookies.ts`, `btoa` sin chunks | P1: riesgo de perder/restaurar mal la sesión | Codificación y fragmentos del SDK; 3 regresiones fallaron antes del parche |
| Logout solo elimina la cookie legacy en varias rutas | `Layout`, `api`, `auth.service`, dashboard Driver | P2: fragmentos canónicos persistentes | Limpieza común de cookies de autenticación y verifier, sin borrar preferencias/colas |
| Las rutas legales no estaban expresamente públicas en middleware | Tres `middleware.ts` | P2: política inaccesible desde fuera | Lista exacta compartida, sin ampliar rutas privadas |

Tarjetas ejecutadas en orden: (1) contrato de consentimiento, persistencia y UI; (2) bloqueo de medición opcional e integración en portales; (3) formato/lectura/limpieza de cookies de sesión y páginas legales; (4) pruebas, verificación visual y documentación. Se conserva el contrato de JWT/API y el funcionamiento sin conexión; no hay cambios de base de datos ni proveedores.

## Sesión y seguridad

- `sb-access-token` y `sb-<ref>-auth-token[.<n>]`: cookies host-only, `Path=/`, `SameSite=Lax`, `Secure` en HTTPS, conservación de 7 días renovable. El tiempo de almacenamiento no sustituye `exp`, validación de firma, roles o controles del backend.
- Se usa el formato `base64-` y chunking de `@supabase/ssr` 0.12.7; el lector conserva compatibilidad con la cookie canónica anterior sin prefijo y el token legacy. Solo busca la referencia configurada cuando existe.
- Al disminuir el tamaño de sesión se retiran fragmentos sobrantes. Logout limpia todas las piezas presentes, incluso si hay huecos, y los verificadores del proyecto configurado.
- Renovar la sesión actualiza las cookies sin depender del consentimiento opcional. Cambiar/rechazar consentimiento no llama a logout ni borra colas, cachés o IndexedDB.
- El diseño actual necesita cookies legibles por JavaScript y tokens locales para el cliente híbrido. **No son HttpOnly**. Convertirlos en sesiones BFF/HttpOnly requiere otra arquitectura para OAuth, llamadas directas y operaciones offline; este parche no afirma que exista ni debilita esos atributos para simularla.
- La eliminación de cookies no revoca por sí sola un JWT ya emitido. La revocación y expiración se gobiernan en el proveedor/backend. No se cambiaron sus ajustes ni la autorización de API.
- Sentry del navegador Driver conserva su desactivación previa en producción. En desarrollo no activa replay, trazas ni sesiones automáticas; los errores opcionales se filtran por consentimiento. La observabilidad del servidor conserva su configuración.

## Analítica y contenido publicado

`ConsentAnalytics` monta Umami solo cuando `NEXT_PUBLIC_UMAMI_ID` existe y la decisión vigente autoriza analítica. Usa `NEXT_PUBLIC_UMAMI_URL` o el script oficial de Umami, `data-auto-track=false` y envíos explícitos mediante helpers que vuelven a revisar el consentimiento. Se omiten query, fragmento, título y referrer. No se registran pageviews de callbacks OAuth.

La retirada elimina el elemento script y bloquea nuevos eventos/pageviews; no puede recuperar peticiones ya enviadas o en vuelo ni borrar datos del proveedor. Los eventos opcionales de `PortalAuth`, `AuthCallback` y `useTADAction` pasan por la compuerta. No se envía el texto bruto de errores en la telemetría opcional de acciones.

No se añade ningún píxel de marketing ni integración funcional nueva. Esas categorías reservan la elección; un nuevo proveedor o finalidad exige actualizar inventario y versión de política antes de activarlo. La política compartida explica la implementación real y sustituye listas anteriores de proveedores no presentes. No constituye una certificación de cumplimiento normativo.

## Verificación y reproducción

- `node --test scripts/cookie-management.test.cjs`: **14/14, exit 0** en la versión final. Tres regresiones de cookies habían fallado contra la implementación anterior. Se cubren Unicode, fragmentos grandes/sobrantes, lectura real con el SDK SSR instalado, compatibilidad legacy, alcance de proyecto, atributos, limpieza selectiva, formato/fechas, escritura atómica, GPC/DNT, almacenamiento bloqueado, retirada y sanitización de pageviews.
- `node node_modules/typescript/bin/tsc -p apps/driver/tsconfig.json --noEmit --incremental false`: pasó después de inferir los tipos reales del SDK en recuperación/actualización de contraseña.
- Los primeros intentos de invocar pnpm activaron una reinstalación automática del entorno que abortó por falta de TTY; se detuvieron y se ejecutaron los binarios locales directamente. El lockfile solo añade la referencia al SDK SSR ya resuelto; no se actualizaron versiones existentes.
- Verificación complementaria con la API de TypeScript: incluir expresamente `apps/driver/middleware.ts` e `instrumentation-client.ts`, que el tsconfig habitual no incluye: **0 diagnósticos**. Detectó y permitió corregir una opción de Sentry retirada del SDK actual; se desactivan las integraciones automáticas mediante su opción soportada `defaultIntegrations: false`.
- Anunciante: fuentes de producción comprobadas con las opciones de su tsconfig, sin raíz de pruebas E2E ni `playwright.config.ts`: **0 diagnósticos**. El comando global mantiene diagnósticos TS2307 por falta de `@playwright/test` en ese workspace. La prueba filtrada no se presenta como aprobación de su suite E2E.
- Admin: el chequeo global mantiene **5 diagnósticos** en `MapView.tsx` (3) y `pages/api/proxy/[...path].ts` (2), archivos que `git diff --quiet` confirmó sin cambios. No se modificaron mapas ni tipos de proxy para este trabajo. La aprobación global de tipado de Admin queda pendiente.
- No se desactivaron comprobaciones para ocultar errores: los tres `next.config` ya omiten tipado/lint durante build antes de este trabajo. Un build correcto prueba empaquetado y prerender, no sustituye las comprobaciones anteriores.

| Compilación con Next.js 15.5.24 | Resultado final |
| --- | --- |
| `apps/advertiser`: `node node_modules/next/dist/bin/next build` | exit 0; 17 páginas estáticas generadas |
| `apps/admin`: mismo comando desde su workspace | exit 0; 10 páginas estáticas generadas |
| `apps/driver`: mismo comando desde su workspace | exit 0; 12 páginas estáticas generadas, PWA y middleware compilados |

La primera compilación de Driver se detuvo antes de acabar para incluir la corrección del diagnóstico Sentry detectada por el chequeo ampliado; el resultado final corresponde a la segunda compilación completa del código corregido. Persisten avisos previos de import de `withSentryConfig`, configuración de instrumentación Admin y caché webpack. No se consideran fallos nuevos de cookies ni prueba de que toda la plataforma esté libre de avisos.

### Navegador real y fixture local

Chrome, sin cuenta autenticada ni datos reales. Los tres portales sirvieron `/politica-de-cookies` con HTTP 200 y el inventario nuevo. Se comprobaron en la interfaz:

1. Anunciante, primera visita: botones de rechazo/personalización/aceptación; fixture **0 cargas, 0 envíos**.
2. Rechazar y recargar: sin aviso inicial; configuración reabrible, todas las opcionales desmarcadas; sigue sin cargar analítica.
3. Marcar una categoría y cerrar sin guardar: al reabrir permanece la decisión anterior.
4. Autorizar solo analítica y guardar: una carga y una visita; funcionales/marketing siguen desmarcadas.
5. Otra pestaña con query y fragmento de prueba: visita registrada solo como `/politica-de-cookies`, título y referrer vacíos.
6. Retirar en la primera pestaña: la segunda refleja las categorías desactivadas; al recargar no añade cargas ni envíos. Contador permanece en 2/2.
7. Driver mantiene una decisión independiente: muestra el aviso inicial; después de rechazar permite llegar a `/driver/login` con los controles de acceso normales.
8. Admin mantiene una decisión independiente: muestra el aviso; aceptar activa todas las opciones en el selector; rechazar y recargar vuelve a mantener solo las necesarias. Contador final de la fixture: 3 cargas, 3 visitas saneadas, `invalidAutoTrack: false`.

Se guardó una captura del aviso y la política para revisión. Los retardos iniciales de compilación provocaron timeouts de navegación; se comprobó el servidor y la interfaz una vez compilados. Las pestañas temporales y los cuatro servidores de QA se cerraron al terminar.

El caso del SDK SSR usa `getSession()` únicamente para comprobar serialización, sin red ni autorización: el SDK avisa correctamente de que ese método no autentica al usuario. El primer harness conservaba un entorno de navegador artificial y dejaba un BroadcastChannel abierto; se corrigió para probar SSR sin `window/document` y la ejecución final terminó normalmente. La comprobación de tipos de producción de Anunciante también corrigió un error del harness (`incremental` sin ruta de build info), sin cambiar el producto.

Fixture de analítica para QA local: `node scripts/cookie-qa-tracker.cjs`, escucha solo en `127.0.0.1:3199`. Su `/status` cuenta cargas y envíos. Usar credenciales públicas de prueba, `NEXT_PUBLIC_UMAMI_ID=cookie-qa`, `NEXT_PUBLIC_UMAMI_URL=http://127.0.0.1:3199/script.js` y backend/DSN locales al levantar los portales. **No usar esta configuración en producción.** Permite comprobar el contrato de carga/envío sin mandar datos a un proveedor real.

## Entrega, reversión y límites

Reconstruir y desplegar los tres portales para publicar estos cambios compartidos. Mantener las variables reales ya configuradas; no añadir IDs de medición si no se desea usar analítica. Los artefactos locales se generaron con configuración ficticia de QA y no deben distribuirse como imagen de producción. No hace falta ejecutar migraciones ni desplegar API/player. Verificar en el dominio publicado rechazo, recarga, personalización, retirada, rutas legales y login/logout con una cuenta de prueba autorizada.

Reversión: revertir el commit de esta función y reconstruir los tres portales; no eliminar almacenamiento operativo del usuario ni datos de base de datos. La decisión v2 quedará guardada, pero una reversión al aviso antiguo perdería los controles y bloqueos nuevos, por lo que se prefiere corregir hacia delante. Se conserva `.worktrees/main1` con sus cambios ajenos.

**Estado: IMPLEMENTADO, PENDIENTE DE VERIFICACIÓN.** Función comprobada en QA local, no desplegada en producción. Quedan la comprobación en dominios publicados con una sesión real y los diagnósticos globales ajenos a esta función señalados arriba. No se afirma una aprobación completa de tipado/E2E de Admin y Anunciante. Los service workers generados por la compilación local se excluyen del cambio fuente.

Fuentes técnicas: [MDN, cookies y atributos](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies), [Supabase, sesiones](https://supabase.com/docs/guides/auth/sessions), [Supabase, signOut](https://supabase.com/docs/reference/javascript/auth-signout), [Umami, desactivar auto-tracking](https://docs.umami.is/docs/tracker-configuration). Se revisó el changelog de Supabase y el SDK instalado antes de cambiar el formato.
