# Checkpoint actual — 2026-11-03, después de #199

La base de la continuación es `148af7ce7f11c89bafcb14a8d2cce173ea29f423`, que ya incluye #199. El cierre de reflow/accesibilidad se entrega en `codex/landing-reflow-post-199-20261103`, desde un worktree aislado. Evidencia y límites en [QA post-199](../qa/post-199-landing-reflow-2026-11-03.md); [QA post-198](../qa/post-198-completion-2026-11-03.md) conserva la primera fase. El checkout principal y los cambios locales del usuario se preservan.

CI de esa base: Tests/TypeScript/Prisma y cuatro imágenes Docker PASS; browser FAIL por H1 ampliado recortado; formato FAIL en LandingPage.tsx y lint SKIPPED; seguridad FAIL con 64 hallazgos, 18 high. El guard E2E ya está reparado. Consultar el reporte post-199 y el PR del complemento para los resultados de su SHA exacto. No hay autorización de merge/despliegue ni certificación global.

El contenido siguiente se conserva como **historia de #176/#177**, no como lista ejecutable ni estado actual.

# Estado histórico de Engineering + Motion UX después de #176

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

| PR | Título | Estado |
|---|---|---|
| #173 | Landing V5 Financial Motion Fix | ✅ MERGED |
| #174 | Ownership en comisiones Driver | ✅ MERGED |
| #175 | Advertiser onboarding opt-in production + campaignMonths + includeProduction | ✅ MERGED (`origin/main` → `1185c1bd`) |
| #176 | Remove cap on sales and referrals (compensation streams) | ✅ MERGED |

### Cambios aplicados — RESUELTO: conflictos merge (LandingPage.tsx, DriverEarningsLab.tsx, STATE.md)

### 1. Advertiser onboarding (`apps/advertiser/pages/advertiser/onboarding.tsx`)
- `includeProduction: false` por defecto (opcional, desactivado)

### 2. DTO OnboardAdvertiser (`apps/api/src/modules/onboarding/dto/onboard-advertiser.dto.ts`)
- Agregados `campaignMonths: number` (optional, min 1)
- Agregado `includeProduction: boolean` (optional)
- `fileMetadata` mantenido como optional

### 3. Onboarding service (`apps/api/src/modules/onboarding/onboarding.service.ts`)
- Destructura `campaignMonths`, `includeProduction`, `targetCity`
- Usa `campaignMonths` para calcular `endDate` y `campaignMonths` en la campaña
- `includeProduction` se guarda en `includeProduction` del campaign

### 4. Prisma schema (`apps/api/prisma/schema.prisma`)
- Agregado `campaignMonths: Int? @default(1) @map("campaign_months")`
- Agregado `includeProduction: Boolean? @default(false) @map("include_production")`
- Regeneró Prisma client

### 5. Driver earnings preview (`apps/driver/lib/earningsPreview.ts`)
- `eligibleCount` ahora recibe un parámetro opcional `max`
- `ads` sigue siendo capado a 15 (límite contractual)
- `sales` y `referrals` ahora son **sin tope** (sin límite)
- Uso de `max != null ? Math.min(max, v) : v` para distinguir entre "sin límite" y "con límite"

### 6. Driver landing UI (`apps/driver/components/landing/DriverEarningsLab.tsx`)
- `sales` control: `max: 100`, subtítulo: "sin límite"
- `referrals` control: `max: 100`, subtítulo: "sin límite"
- `ads` control: `max: 15` (permanece igual - límite contractual)


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

| Test | Resultado |
|---|---|
| `scripts/landing.test.cjs` | 13/13 ✅ |
| `scripts/driver-landing.test.cjs` | 11/11 ✅ |
| **Total** | **38/38 ✅** |

---

## Prisma migration

- **Pendiente**: `prisma migrate dev` en staging (falta `DATABASE_URL` válido localmente)

---

## Estado del trabajo

- ✅ `includeProduction` ahora por defecto `false`
- ✅ DTO declara `campaignMonths` e `includeProduction`
- ✅ Backend guarda `campaignMonths` y `includeProduction` en el campaign
- ✅ Prisma client actualizado
- ✅ PR #175 mergeado en `origin/main` (`1185c1bd`)
- ✅ PR #176 mergeado en `origin/main` (sales y referrals sin tope)
- ⚠️ Prisma migration aún no aplicada en DB (esquema actualizado, DB no modificado)


- Contrato comercial: los importes observados de1500/2500/500 pueden tener unidades distintas; no se eligió una tarifa ni se cambiaron cobros. Requiere conciliación comercial y pruebas de contrato específicas.
- #175 modificó el esquema; la necesidad/aplicación de una migración debe contrastarse en entorno aprobado, sin ejecutar `migrate dev` sobre DB compartida por seguir un documento.
- Ownership de comisiones de#174 ya está presente. No se vuelve a declarar abierto el hallazgo histórico ni se altera su guarda sin reproducción actual.
- P2 observado: onboarding Pages intenta cargar Google Fonts y una suscripción Realtime aun en su fase educativa. La prueba bloqueó ambos y la UI siguió operativa. La raíz App Router y la landing Driver no hicieron esas solicitudes. Auditar sus proveedores en una tarjeta separada antes de afirmar privacidad de toda la incorporación.
- El programa general no se certifica completo. Quedan gates de staging, sesiones, actualización de SW instalado, rendimiento de campo y flujos financieros fuera de esta intervención.
- Reversión: revertir únicamente el commit/PR acotado, tras revisar dependencias; el helper es educativo. No restaurar toda la rama ni tocar datos productivos.

Entrega: [PR #177](https://github.com/tadtaxiadvertising/tad-dooh-platform/pull/177), rama `codex/motion-ux-post-176`. Los procesos propios de desarrollo se detuvieron. Los resultados remotos deben leerse para el SHA exacto y distinguir código, runner y cuenta. No se promete trabajo en segundo plano.
## Loop v2 checkpoint 2026-11-02
- Branch: feat/landing-v5-financial-motion-fix
- Skill motion-system-v2.md created
- Merge conflicts in STATE.md cleaned
- Next: responsive/mobile QA, then motion scenes

## Driver hero #249 — 2026-11-11 (America/La_Paz)

- Work isolated in `codex/driver-hero-249` from `origin/main` `4905b307`; the original checkout and its pending edits were preserved. PR #247 was already merged, followed by #248.
- User confirmed that the PR #248 image is the approved asset. Extracted its exact bytes into a local WebP and restored the requested hero/SEO copy and copiloto description.
- Scope and verification: [driver-hero-249-verification.md](../ux-landing/driver-hero-249-verification.md). No merge or deployment performed.

## Imagen Driver actualizada — 2026-11-11

- PR #250 ya estaba fusionado. Nueva intervención aislada: `codex/driver-hero-image-update-20261111`, base `3aef4a8c`.
- Nueva imagen horizontal adjunta por el usuario, preservada sin alteraciones; marco 3:2, dimensiones y sizes actualizados.
- Evidencia y límites: [driver-hero-image-update.md](../ux-landing/driver-hero-image-update.md).

## Taxi sin fondo — 2026-11-11

- PR #251 ya fusionado; intervención en `codex/driver-transparent-taxi-20261111`, base `c2b0272c`.
- ImageGen integrado produjo PNG con transparencia real. Se quitó también el marco opaco del hero y se añadió verificación de alfa de la variante entregada por Next.
- Evidencia: [driver-transparent-taxi.md](../ux-landing/driver-transparent-taxi.md).
