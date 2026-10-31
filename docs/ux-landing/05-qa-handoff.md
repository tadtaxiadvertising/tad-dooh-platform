---
type: evidence
status: implemented
reviewed: 2026-10-31
area: frontend
tags: [tad/reference, tad/area/frontend]
---

# Verificación y continuidad de Landing Experience V3

[Alcance y baseline](00-baseline.md) · [Rutas](01-adr-public-routing.md) · [Storyboard](02-storyboard.md) · [Diseño](03-design-system.md) · [Componentes](04-component-selection.md)

## Entorno y superficie

Windows, Node 22.20.0, TypeScript 5.9.3, ESLint 9.39.5, Next 15.5.24. Integración local en base `ee148dda42221fee8feb5e51c37e46b6509ed40d`, con diff de trabajo; publicación preparada desde `main` remoto `a55d987a78e494503e0a887b09c874ffa2037f5b` en `codex/landing-experience-v3`. Las fuentes previas relevantes de los dos portales y cookies se compararon por blob con ese main; coinciden. No se arrastran los commits anteriores ni la refactorización documental ajena.

Superficies: entrada, metadata y middleware públicos de Advertiser; componentes/modelo de landing; entrada y shell público de Driver; scripts de verificación; skill V3 y estos seis documentos. API, DB, finanzas, player, paquetes y lockfile no cambian. La landing propia del taxista se conserva y se incluye en el PR de producto.

El paquete de skill conserva las instrucciones del usuario. Único ajuste de empaquetado posterior a su instalación: seis saltos Markdown de dos espacios finales pasan a barra inversa, con igual significado, para superar la revisión de espacios finales de Git. La copia instalada se sincroniza, el adjunto no se edita y `quick_validate` vuelve a pasar.

## Resultados ejecutados

| Gate | Procedimiento | Resultado y límite |
| --- | --- | --- |
| Regresión de lógica/rutas | `node --test scripts/landing.test.cjs scripts/driver-landing.test.cjs` | PASS 24/24, sin omisiones; middleware ejecutado con SDK/red sintéticos. Incluye límites 0/15/100, entradas inválidas y transferencia acotada de `ref`. |
| Cookies existente | `node --test scripts/cookie-management.test.cjs` | PASS 14/14; no autentica cuentas reales. El warning del SDK de fixture no demuestra una sesión válida. |
| Lint Advertiser | Desde app: `node ../../node_modules/eslint/bin/eslint.js --config eslint.config.mjs app/page.tsx app/layout.tsx components/landing lib/landing middleware.ts --max-warnings 0` | PASS. |
| Tipado estricto landing | Desde app: `node node_modules/typescript/bin/tsc --noEmit --project tsconfig.landing.json` | PASS, sin alterar el tsconfig general. Incluye fuentes de la landing y dependencias compartidas importadas. |
| Árbol aislado del PR | Repetir 38 tests, lint y tipado estricto desde `main` más los archivos acotados | PASS 38/38, lint Advertiser sin warnings; Driver PASS con warning `any` previo en `next.config.ts:35`. Dependencias locales enlazadas, sin instalación ni `.env` copiados. |
| Tipado completo Advertiser | `tsc --noEmit --incremental false --project tsconfig.json` | FAIL previo: TS2307 en `playwright.config.ts` y `tests/e2e/advertiser.spec.ts`; falta `@playwright/test`. |
| Tipado completo Driver | Mismo comando desde Driver | FAIL previo: TS2322 en `pages/api/proxy/[...path].ts:193`, Buffer/BodyInit. |
| Build final Advertiser | Next build desde el árbol aislado, destinos loopback y registro/analítica desactivados | PASS, raíz estática 16.3 kB propios / 119 kB First Load JS. Primer intento falló por junctions de dependencias compartidas ausentes; se completaron y el segundo pasó. Warnings de strings grandes de caché webpack. Next omite tipos y lint, por eso se ejecutan aparte. |
| Build final Driver | Next build desde el árbol aislado y configuración loopback | PASS, 13 páginas estáticas; `/` 12.6 kB propios / 167 kB First Load JS. Build `XPhOxhh1NfUZhYpuDyynw`; unión inicial del manifiesto 166,840 bytes gzip. Warnings previos de Sentry/caché y PWA manual. Sin sesión real; outputs PWA generados no forman parte del cambio de producto. |
| Navegador V3 | `LANDING_ALLOW_DEV_HMR=true LANDING_BASE_URL=http://127.0.0.1:3003 node scripts/landing-v3-smoke.cjs` (variables configuradas en PowerShell) | PASS 14/14 en desarrollo: 320/390/768/1440, teclado, movimiento reducido, sin JS, metadata, roles, demos, consentimiento/revocación y red lenta 400 ms/50 KBps/CPU×4. Cero llamadas privadas/remotas/SW; solo HMR local permitido. No valida servidor compilado ni sesiones. |
| Inspección visual | Capturas de cuatro anchos y recortes hero/laboratorio/flota | PASS visual: sin recortes ni desbordamiento; CTA a 320 px termina en y=609 dentro de 800 px. Contrastes puntuales opacos 10.24:1–18.13:1; no se midieron exactamente gradientes/transparencias ni WCAG completo. |
| Coste de JavaScript | `landing-v3-measure.cjs`, build aislado `PSVrmF-Mdh833lNTn5SxF`, gzip nivel 9 por asset | PASS de presupuesto: 119,048 bytes iniciales, 16,344 exclusivos de la ruta; baseline inicial 112,877 → +6,171 bytes (6.03 KiB), inferior a +60 KiB. CSS inicial 28,259 bytes gzip. Método de chunks de manifiesto; sin headers de transporte, polyfill opcional ni lazy chunks. |
| Muestras de rendimiento | 3 contextos Chromium nuevos, localhost desarrollo, 150 ms / 200 KBps / CPU×4 | LCP 2,184 / 2,380 / 3,252 ms; mediana 2,380 ms. CLS 0 / 0 / 0. `runtimeMatchesBuild=false` explícito: el gzip usa build aislado y el navegador usa desarrollo. No certifica umbral productivo, Lighthouse, INP o p75 de campo. |
| Documentación local | `knowledge-view.cjs render/check`, `docs-tool.cjs generate/check`, `git diff --check` | PASS: 30 documentos mantenidos, 1 Canvas, 17 nodos, 96 relaciones. Los seis documentos UX son referencias de esta entrega; no se copian los inventarios/documentos ajenos al PR. |

Publicación del PR: pendiente al actualizar esta nota. Las capturas y logs detallados están fuera de Git bajo la carpeta de evidencias `landing-v3`; informes `landing-v3-smoke.log`, `landing-v3-final-measure.json` y `landing-v3-final-bundle-provenance.json`. No atribuir el gzip compilado al checkout del navegador: cada informe conserva su procedencia.

## Reproducir sin servicios reales

Usar dependencias existentes directamente; pnpm 11 local intenta reinstalar y no se utilizó para mutar módulos. Configurar API/Supabase únicamente en loopback con fixtures públicos, `NEXT_TELEMETRY_DISABLED=1`, `NEXT_PUBLIC_UMAMI_ID` vacío y `NEXT_PUBLIC_LANDING_SIGNUP_ENABLED=false`. No copiar `.env` ni credenciales. No iniciar API/DB.

El smoke exige `LANDING_BASE_URL` loopback y bloquea llamadas privadas, métodos de escritura, sockets operativos, service workers y recursos remotos. `LANDING_ALLOW_DEV_HMR=true` admite exclusivamente el socket HMR del servidor local y etiqueta el resultado como desarrollo. `LANDING_SCREENSHOT_DIR` debe estar fuera del repositorio. No navega hacia login ni crea registros.

El medidor suma assets iniciales únicos de manifiestos comprimidos por separado con gzip nivel 9. `LANDING_MEASURE_BUNDLE_ONLY=true` mide build sin servidor; `LANDING_BASELINE_REPORT` permite delta contra el informe previo. Sin servidor de producción autorizado las muestras del navegador son de desarrollo: no certifican rendimiento de producción. No hay Lighthouse/axe instalados; no se les atribuye puntuación.

## Pendientes y reversión

- Tipado completo de ambos portales: fallos previos descritos arriba, sin ocultarlos con exclusiones generales.
- Registro e identidad real, aprobación y sesión en staging antes de activar el CTA de registro. La landing no da de alta usuarios. `ref` se admite solo como código alfanumérico/guion/guion bajo de 1–64 caracteres y se transfiere a rutas constantes; sin almacenamiento ni evento de analítica. La transferencia requiere JS; las rutas de registro existentes conservan sus contratos.
- Revisar SW/cachés de Driver ya instalados, compatibilidad de host, HTTPS y tráfico real antes de liberar. Un navegador nuevo no acredita actualización PWA.
- No se cambió el motor offline ni el contrato financiero. No se verificó RBAC contra backend ni una liquidación.
- Reversión: revertir el commit acotado del PR tras revisar dependencias. Conservar cambios ajenos y no restaurar toda la rama. Sin migraciones ni operaciones de datos que revertir.

No hubo despliegue ni merge. La revisión automática rechazó previamente ejecutar `next start` para el artefacto Advertiser compilado; no se reintentó por otro lanzador. La comprobación de navegador utiliza desarrollo y mantiene explícita esta limitación.

Driver: una orden agrupada de restauración PWA fue rechazada por revisión automática. Se completó una operación aceptada y reversible: copia de cuatro snapshots previos verificados y traslado de dos outputs nuevos al backup externo, sin eliminación. Los cuatro hashes originales y el service worker manual quedaron intactos; `public` no tiene diferencias Git.
