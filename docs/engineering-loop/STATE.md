# Creative Motion V2 — intervención actual

Fecha: 2026-11-02, America/La_Paz. Rama `codex/creative-motion-v2-20261102`. Base actual: `06e611e7383511fb1ff131da7d80fc3b620944c8`, main verificado tras #180. El baseline visual se capturó en `0df24484`; #180 solo cambió API/Auth y sus docs/tests, incorporado por fast-forward sin conflicto. Los archivos UI del baseline no cambiaron entre ambos commits.

El usuario pidió continuar e indicó que no veía cambios notables. Se implementa la experiencia V2 sobre la base actual, preservando los cambios de tarifas y calculadores. El checkout principal y sus cambios de skill quedan intactos; se reutiliza el worktree adjunto con rama nueva. El [estado previo](history/state-at-0df24484-before-creative-v2.md) es historia; sus migraciones propuestas y resultados no son instrucciones ni verificaciones actuales.

## Alcance y aceptación

| Tarjeta | Aceptación | Estado |
| --- | --- | --- |
| A1 | Hero Anunciante con tres ejemplos seleccionables, transferencia a tablet y replay, SSR y movimiento reducido | VERIFICADO EN EL ALCANCE |
| A2 | Crear/Programar/Reproducir/Medir, controles reversibles, escena contextual y eventos existentes | VERIFICADO EN EL ALCANCE |
| A3 | Studio con motor compartido, producción OFF→ON→OFF, visualización opt-in, foco y salida estables | VERIFICADO EN EL ALCANCE |
| A4 | Rango de impacto y supuestos de la proyección compartida, sin métricas reales inventadas | VERIFICADO EN EL ALCANCE |
| D1 | Taxi/tablet Driver con demo y restablecer | VERIFICADO EN EL ALCANCE |
| D2 | Quince slots vinculados a slider y ejemplo mensual | VERIFICADO EN EL ALCANCE |
| D3 | Tres vías seleccionables, contadores persistentes y distinción mensual/eventos | VERIFICADO EN EL ALCANCE |
| D4 | Compartir/Registro/Validación/Activación/Bono, avance/retroceso y condición de aprobación | VERIFICADO EN EL ALCANCE |

Sin cambios a tarifas reales, API/Auth, esquema, datos, registro público, Player/SW, ledger, wallets o payouts. Sin merge ni despliegue. Correcciones numéricas y consentimiento existentes se preservan; no se adopta un tope comercial de ventas/referidos por un rango visual.

## Baseline ejecutado antes de editar UI

- 54 pruebas Node: **51 PASS / 3 FAIL**. Las tres fallidas reproducen eventos de ciudad/objetivo/producción con el valor anterior, reintroducidos después de #177.
- Navegador Chromium en desarrollo loopback, cuatro anchos320/390/768/1440, perfiles móviles emulados con DPR2; hero/full por landing y no-JS390. Las ocho respuestas raíz son200, sin overflow global en esa captura.
- Anunciante sin JS: H1 con opacidad efectiva0. Driver:1. Se observa contenido pequeño:23 elementos p/small/label de Anunciante <12px,19 en Driver móvil; es una señal para revisión, no una certificación completa de tipografía.
- Las capturas de primer render usan800ms tras DOMContentLoaded: algunas muestran HTML antes de hidratar. No confundirlas con una sesión estable; la prueba no-JS confirma ocultación inicial del H1 independientemente del tiempo.
- Driver primera visita muestra banner de cookies que ocupa una parte importante del viewport; verificar por separado primera visita y rechazo de opcionales. No cambiar consentimiento para disimularlo.
- En Anunciante se bloquearon solicitudes POST del overlay de desarrollo a __nextjs_original-stack-frames; no se registran consultas de API privada en raíces. La inspección posterior en sesión estable no produjo pageerror y H1 llegó a opacidad1.

## Motion y dependencias

[Mapa del sistema y decisiones](../ux-landing/motion-system-v2.md). Se adapta TextMorph de Motion Primitives en packages/ui con SHA exacto, licencia MIT y notices conservados. Usa Framer Motion existente y fallback idéntico de SSR/primer render de hidratación. No se instala otro runtime Motion.

GSAP/ScrollTrigger se evalúa como candidato de narrativa; esta iteración usa pasos controlados por botones y timelines finitas existentes. No se justificó añadir motor/instalación a node_modules compartidos para resolver esas transiciones. La alternativa debe demostrarse en navegador; no se afirma uso de GSAP. No se modifica lockfile ni manifiestos.

## Seguridad conocida y límites

Triage de solo lectura: el Security Audit histórico de #177 contó dos rutas de un mismo advisory crítico Next, GHSA-2464-fhr4-w9xw. Next15.5.24 continúa en rango auditado; el lock resuelve sharp0.35.5, workaround indicado por el aviso. Las imágenes declaradas usan Alpine/musl y no habilitan SVG; no se inspecciona artefacto productivo ni se prueba un exploit. Esto no impide QA local con fixtures; sí impide certificar seguridad global o publicación. La actualización a Next15.5.28 y su auditoría debe ir en intervención propia, sin confundir estas mitigaciones con un gate aprobado. Fuentes: [aviso oficial](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw), [job histórico](https://github.com/tadtaxiadvertising/tad-dooh-platform/actions/runs/41371642211/job/125043170531).

La tabla final más abajo acredita checks, matriz táctil/reduced/noJS/landscape, revisión visual y builds de esta iteración. Los resultados remotos se registrarán en el PR para el SHA final. No se atribuyen verificaciones de #177 a este diff.

## Artefactos y reanudación

Carpeta externa del chat: creative-motion-v2-20261102. before/baseline.json y PNGs conservan el estado0df24484. Los servidores de QA usan3413 Anunciante/3414 Driver con API/Supabase loopback ficticios, sin .env copiado. La evidencia final debe registrar SHA más diff, resultados exactos y límites; detener procesos propios al concluir salvo vista previa solicitada.


## Verificación final local — 2026-11-02

| Gate | Resultado | Límite |
| --- | --- | --- |
| Node lógica/regresión | 57/57 PASS | Modelos, consentimiento, SSR, fuentes e interacciones aisladas; sin DB/sesión real |
| Nuevo navegador V2 | 28/28 escenarios PASS | Chromium desarrollo: diez viewports por portal +390 reducido +noJS320/390/1440. Emulación touch/DPR2, no teléfono físico |
| Smoke existente Anunciante | 13/13 PASS | Incluye contrato calculadora, consentimiento/revocación, foco, normal/reduce, cinco anchos, noJS y Slow3G. HMR exacto local permitido explícitamente |
| Smoke existente Driver | 11/11 PASS | Fixture107500, quince slots, teclado y foco, gates y cero consultas privadas/SW/remotos; HMR local explícito |
| Máximos y ampliación visual | 4/4 escenarios PASS | Máximos de controles a320 y CSS zoom2 a1440; estrés de layout, no equivale a probar zoom del navegador/dispositivo físico |
| Tipado focalizado | PASS ambos portales | Incluye shared TextMorph y todos los componentes de landing importados |
| Tipado global Driver | PASS | Ejecución nueva, no se reutiliza el fallo histórico Buffer/BodyInit |
| Tipado global Anunciante | FAIL previo | @playwright/test ausente en playwright.config.ts y tests/e2e/advertiser.spec.ts; archivos y dependencias sin cambios |
| Lint | PASS componentes de ambos portales y TextMorph | Scope explícito, cero warnings. El componente compartido se ejecutó desde raíz para no ignorarlo por base path |
| Prettier | PASS19 archivos TSX/CSS/scripts del cambio | LandingAnalytics previo fuera del diff conserva advertencia de formato; no se afirma formato global |
| Build Anunciante | PASS17 páginas estáticas, raíz61.3kB/164kB First Load | Build VE5ipJ6dkqIOsXIsXehkZ; tipos/lint separados porque Next los omite por configuración previa |
| Build Driver | PASS | Build6R8N77jXScvWtQEkG0HK5; warnings existentes Sentry/PWA/webpack. Cinco hashes PWA restaurados; outputs nuevos preservados fuera de Git |
| JS inicial gzip | Anunciante164045 bytes; Driver215052 bytes | Unión de assets /layout+/page de app manifest, y /_app+/ de Pages; gzip9. Sin baseline compilado comparable0df: no se afirma delta/budget de incremento |
| Revisión independiente | Hallazgo focoP2 corregido | Anterior/Siguiente de historia usan aria-disabled con guard de índices; nuevo navegador prueba foco y límites. No equivale a auditoría global |
| Seguridad y fuentes económicas | Sin cambios en API/locks/precios/helpers financieros | diff contra06e611e7 vacío en esas superficies. El riesgo Next y gates generales se mantienen visibles |
| Lighthouse/CrUX/RUM/WCAG completo | NO EJECUTADO | No se certifican p75 real, INP de campo ni conformidad completa. Navegador usa desarrollo, no runtime compilado |

La revisión detectó y corrigió hidratación de title/desc SVG (un único texto en lugar de children segmentados), tipos derivados del wrapper vigente (sin asany), foco al llegar a extremos y las tres regresiones de analítica de la base. La prueba de animación observa animationstart real para no competir con una animación finita ya terminada por carga del runner. No se aumentaron duraciones/timeouts como arreglo ni se silenciaron gates.

Los smokes existentes se adaptaron a la nueva etiqueta/destino de condiciones, manteniendo la comprobación del ancla local correcta. El nuevo test SSR TextMorph se añadió a CI junto con su filtro de archivo compartido. No se instala ninguna dependencia ni se modifica lockfile.

Artefactos finales: after/creative-qa.json, zoom-max.json, capturas revisadas de hero/demo/lab/referidos; demos WebM en after/demos y su mapa demo-videos.json. Logs unit-final, advertiser/driver-smoke-final, advertiser/driver-build y tipos globales; métricas advertiser-bundle.json/driver-bundle.json. Hay capturas anteriores de intentos fallidos: la aceptación final se acredita con JSON/logs finales, no con un screenshot aislado.

## Entrega y publicación

La rama de entrega es codex/creative-motion-v2-20261102, sobre main06e611e7 e incluyendo la reparación ajena#180. Se preparará PR draft; enlace y checks remotos del HEAD definitivo se registran en su descripción y adjuntos del chat, para evitar atribuir CI de un SHA anterior.

El usuario confirmó que estaba mirando la web publicada. Esta intervención aún no se ha fusionado ni desplegado allí; los artefactos muestran la versión local nueva. La publicación requiere autorización y resolver/aceptar formalmente sus gates y riesgos; el PR no se certifica listo para release por pasar UI. Procesos propios de QA detenidos antes de compilar.

Reversión: revertir el PR acotado tras revisar dependencias; no operaciones de datos, cambios de saldo ni restauración de una rama completa. El programa global (sesiones reales, staging, SW instalado y finanzas) sigue fuera de esta validación.
