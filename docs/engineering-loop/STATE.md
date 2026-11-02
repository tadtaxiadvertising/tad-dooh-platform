# Estado de Engineering + Motion UX después de #176

Fecha: 2026-11-01, America/La_Paz. Rama `codex/motion-ux-post-176`. Base confirmada: `63c807eba7b2c016411337f14345ae8c1ae5901d`, merge #176. Este checkpoint describe esta intervención, no la salud global de la plataforma.

El usuario autorizó revisar/adoptar la skill nueva y aplicar mejoras, conservando #176. Se creó un worktree dedicado; el checkout principal y el worktree anterior con cambios sin commit se preservan. El [estado anterior](history/state-at-63c807e.md) es evidencia histórica, incluidos sus resultados y propuestas de migración; no una instrucción ejecutable ni una comprobación de producción.

## Alcance y tarjetas

1. **Paquete:** sustituir V3 por Engineering + Motion UX, con referencias contrastadas contra #175/#176. [Registro](skill-adoption-2026-11-01.md).
2. **P2, presentación/consentimiento:** mantener hero y controles legibles en SSR/sin JS, feedback del importe solo al cambiar, preferencia de movimiento reducido y foco; corregir eventos de ciudad/objetivo/producción que usaban el estado anterior. Retirar cifras/garantías y urgencia no verificadas de los pasos educativos de onboarding.
3. **P3, aritmética educativa:** impedir Infinity/importes sin precisión segura sin reinstalar el cap comercial de ventas/referidos. El helper sigue compartido por landing y onboarding.
4. **Verificación y entrega:** pruebas, tipos, lint, builds, navegador con cinco anchos, capturas, revisión Motion UX y PR draft sobre el SHA exacto.

Exclusiones: API, esquema/migraciones, RBAC, identidad, tarifas reales, wallets/ledger, liquidaciones, pagos, Player y lógica offline/SW. Registro público no se activa. No hay despliegue ni merge.

## Hallazgos, causa y corrección

| Hallazgo | Evidencia y reproducción | Corrección y aceptación |
| --- | --- | --- |
| P2: contenido inicial oculto | Hero Advertiser `motion.h1` y controles Driver con `opacity:0` en SSR; Wizard también ocultaba sus children. Prueba de composición de Wizard: 4 PASS / 3 FAIL antes de corregir | HTML inicial visible; sin animación de entrada que oculte información. Importes y cambio de paso usan transform de 180 ms tras interacción, con cancelación y reduced motion. Test de composición: 7/7 PASS |
| P2: analítica con dato anterior | `setCity`/`setObjective`/`setIncludeProduction` y lectura del closure en el mismo handler | `recordPreview(next)` recibe el valor seleccionado. Pruebas ejecutan handlers, consentimiento, revocación y deduplicación; no se transfieren datos personales |
| P2: promesas sin evidencia | Benefits contenía 3.4X/500K+/120+, atención garantizada; Simulator mencionaba inversión media y reserva urgente | Hitos de planificación, revisión y estimaciones ilustrativas. Mismo motor de cálculo y producción OFF, navegación preservada |
| P3: overflow del preview | `(15, Number.MAX_VALUE, 1)` producía Infinity; valores seguros individuales podían sumar un importe inseguro. Regresión inicial 1 PASS / 3 FAIL | Productos, subtotal y total deben ser enteros seguros; en caso contrario RangeError explícito. 101/1000 ventas/referidos siguen admitidos; ads mantiene cap15, negativos/nofinitos/truncamiento previos |
| P2: smoke desfasado de #176 | La prueba Driver esperaba rangos20 y los fixtures no ejercitaban100 | Rangos100 como demo, fixture independiente 15+100+100 → 107500, mensual7500/eventos100000. No se modifica el contrato de ventas/referidos sin tope |

## Motion UX review

- **Propósito:** relacionar el cambio de pantalla/duración/producción y las tres vías Driver con su total; orientar el avance/retroceso entre pasos educativos.
- **Estado inicial:** contenido/importe opaco y estático en SSR, sin feedback al montar. Acción: cambio de importe/paso. Resultado: número o contenido actualizado inmediatamente y desplazamiento breve; reversión con el mismo control. `output` no se remonta al cambiar y el slider conserva foco.
- **Movimiento:** Web Animations API existente, transform de 3 px para importes y 12 px direccional en Wizard, 180 ms; cancelación en cleanup. Sin opacity0, autoplay, dependencias nuevas ni movimiento de layout. Se conserva estático cuando la preferencia de movimiento todavía es desconocida o reducida.
- **Accesibilidad:** etiquetas/rangos nativos, foco visible, botón atrás con nombre, progreso semántico con `aria-current`. El máximo100 describe la interacción de demo, no una regla comercial. El cambio de copy no implica alta, aprobación, reserva ni ingreso garantizado.
- **Límite onboarding:** se verifican los pasos educativos y su composición con Wizard; no se acredita registro real, formulario bancario, sesión ni ruta completa sin JS. Las pruebas de navegador públicas no envían formularios ni entran a portales.
- **Navegador real:** las landings pasan con/sin JS en 320/390/768/1024/1440 px. La animación de importe es una sola de180 ms después de cambiar; cero al montar o con movimiento reducido, con foco retenido. Los pasos educativos se recorrieron también en navegador, producción OFF→ON→OFF y atrás; se observaron dos transiciones direccionales180 ms en modo normal y cero en modo reducido. No se introdujeron datos personales ni se avanzó al registro.
- **Visual:** capturas revisadas de hero/laboratorios y dos pasos de onboarding a390 px; vistas completas a cinco anchos. En320 px CTA termina eny533 en Advertiser y eny480 en Driver (viewport800), sin overflow. El botón flotante de preferencias y el indicador de desarrollo aparecen en las capturas; no se consideran contenido nuevo de la landing.
- **Coste:** build Advertiser:117659 bytes gzip de JS inicial,14955 exclusivos de ruta; Driver:169099 bytes gzip iniciales (unión /_app+/). Compresión nivel9 por asset, sin polyfills opcionales/headers/lazy chunks. No existe un baseline V5 equivalente capturado antes de editar; no se infiere delta contra V2 ni se certifica presupuesto de incremento. Lighthouse, INP y p75 de campo NO EJECUTADOS; el navegador usa desarrollo, no el artefacto compilado.

## Verificaciones ejecutadas

Entorno local: Windows, Node22.20.0, Next15.5.24, dependencias existentes enlazadas al checkout; sin `.env` copiado ni instalaciones. Destinos de builds/servidores únicamente loopback con fixtures públicos; signup OFF y analítica externa sin ID.

| Gate | Resultado | Límite |
| --- | --- | --- |
| Baseline en63c807e | 38/38 PASS en landing, Driver y cookies | SDK/red sintéticos; no sesiones reales |
| Suites finales | 54/54 PASS: `landing.test.cjs`, `driver-landing.test.cjs`, `cookie-management.test.cjs`, `driver-preview-arithmetic.test.cjs`, `advertiser-onboarding-presentation.test.cjs` | Real React/Motion SSR para presentación; handlers y modelos aislados para cálculo/analítica |
| Lint del alcance | PASS en ambos portales, cero warnings | No es lint global |
| Tipado estricto | PASS en los dos `tsconfig.landing.json`, incluye Wizard y pasos educativos | No sustituye el gate global |
| Skill | Validador oficial PASS en proyecto e instalación; cinco hashes coincidentes | No evalúa todos los futuros usos de la skill |
| Prettier del alcance | PASS en siete archivos TS/TSX/JSON modificados | No es formato global; el último cambio fue solo normalización de estilo |
| Build Advertiser | PASS,17 páginas; `/`15 kB /117 kB FirstLoadJS; build21nXZlnhaRhO0-TWwj-gc | Next omite tipos/lint por configuración previa; se comprobaron aparte. Warnings de strings grandes de caché |
| Build Driver | PASS,13 páginas; `/`15.1 kB /169 kB FirstLoadJS; buildKS3Bst5Hj3bv8sdLcNhJy | Warnings previos Sentry/PWA/caché. Cinco hashes PWA originales restaurados y outputs nuevos conservados fuera de Git; public sin diff |
| Navegador Advertiser | PASS13 comprobaciones; incluye consentimiento, valores actuales, producción opt-in, teclado, cinco anchos, no-JS y Slow3G400ms/50KBps/CPU×4 | Desarrollo loopback. Sin API/recursos remotos/SW; solo HMR de desarrollo permitido |
| Navegador Driver | PASS11 comprobaciones; incluye fixture107500, foco y feedback real, movimiento reducido, cinco anchos y no-JS | Desarrollo loopback; sin API/SW/datos privados ni recursos remotos |
| Onboarding educativo en navegador | PASS2 escenarios (normal/reducido), cinco anchos, avanzar/volver y producción reversible | Proveedores Pages existentes intentaron fuente Google y Realtime contra fixture local; bloqueados antes de red. No equivale a auditoría de privacidad de esa ruta |
| Ownership comisiones de#174 | Jest aislado:5/5 PASS, propio/ajeno/sin entidad/sin sesión/admin | Controlador y servicio mock; sin DB, no valida JWT contra servidor real |
| Tipado global Advertiser | FAIL previo: TS2307 en playwright.config.ts y tests/e2e/advertiser.spec.ts | Falta @playwright/test en ese workspace. No se oculta ni instala para esta intervención |
| Tipado global Driver | FAIL previo: TS2322 en pages/api/proxy/[...path].ts:193, Buffer/BodyInit | No se cambió el proxy como parte de UI |
| PR | [#177 en borrador](https://github.com/tadtaxiadvertising/tad-dooh-platform/pull/177), producto `c0d17a82bd0e9de6e43b1d00a8c3628ce0e45f9f`, padre63c807e | 24 archivos, incluidos checkpoint y registro de regresiones en CI; sin cambios ajenos |
| CI | Workflows iniciados en dd5ac91f; revalidar el SHA posterior al registro de pruebas | La gate focalizada incorpora los dos scripts nuevos y sus filtros de paths; no se desactiva ninguna gate global |

Artefactos fuera de Git: carpeta `after-176-2026-11-01` de evidencias del chat, con `advertiser-smoke.log`, `driver-smoke.log`, `advertiser-bundle.json`, `driver-bundle.json`, `visual-snapshots.json`, `onboarding-presentation-browser.json` y capturas. Las pruebas corresponden a63c807e más el diff de producto, no a producción. Las dos muestras de onboarding son una prueba puntual del recorrido educativo, distinta de los smokes públicos versionados.

## Pendientes y límites

- Contrato comercial: los importes observados de1500/2500/500 pueden tener unidades distintas; no se eligió una tarifa ni se cambiaron cobros. Requiere conciliación comercial y pruebas de contrato específicas.
- #175 modificó el esquema; la necesidad/aplicación de una migración debe contrastarse en entorno aprobado, sin ejecutar `migrate dev` sobre DB compartida por seguir un documento.
- Ownership de comisiones de#174 ya está presente. No se vuelve a declarar abierto el hallazgo histórico ni se altera su guarda sin reproducción actual.
- P2 observado: onboarding Pages intenta cargar Google Fonts y una suscripción Realtime aun en su fase educativa. La prueba bloqueó ambos y la UI siguió operativa. La raíz App Router y la landing Driver no hicieron esas solicitudes. Auditar sus proveedores en una tarjeta separada antes de afirmar privacidad de toda la incorporación.
- El programa general no se certifica completo. Quedan gates de staging, sesiones, actualización de SW instalado, rendimiento de campo y flujos financieros fuera de esta intervención.
- Reversión: revertir únicamente el commit/PR acotado, tras revisar dependencias; el helper es educativo. No restaurar toda la rama ni tocar datos productivos.

Entrega: [PR #177](https://github.com/tadtaxiadvertising/tad-dooh-platform/pull/177), rama `codex/motion-ux-post-176`. Los procesos propios de desarrollo se detuvieron. Los resultados remotos deben leerse para el SHA exacto y distinguir código, runner y cuenta. No se promete trabajo en segundo plano.
