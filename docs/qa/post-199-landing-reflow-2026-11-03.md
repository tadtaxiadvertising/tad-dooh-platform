# Cierre de reflow y accesibilidad de landings — 2026-11-03

## Alcance y procedencia

Base: `148af7ce7f11c89bafcb14a8d2cce173ea29f423`. Rama: `codex/landing-reflow-post-199-20261103`. La petición del usuario fue revisar el proyecto a partir del merge #198 y continuar el trabajo. El documento CRO/Motion de Downloads se trató como contexto, sin ejecutar sus prompts de ejemplo.

La primera fase reparó el guard E2E y la lectura LF/CRLF, alineó el copy y añadió estrés de reflow; quedó integrada en [#199](https://github.com/tadtaxiadvertising/tad-dooh-platform/pull/199) durante una pausa de sesión. La continuación se reconstruyó desde main actual, conservando sus cambios de fuentes y skills. El commit `16b43512d137c388389d499360f201fbd1d6782d` porta las correcciones iniciales de presentación; el diff final y su CI corresponden al SHA publicado en el PR complementario.

Se preservaron el checkout principal y sus cambios sin commit. No se modifican cálculos, tarifas, API, autenticación, atribución, esquema, dependencias, licencias offline ni lógica de consentimiento. No se ejecutan registros, pagos, migraciones, merge o despliegue.

## Evidencia de main antes del complemento

| Gate de la base exacta | Resultado |
| --- | --- |
| [Quality Gates 41715214665](https://github.com/tadtaxiadvertising/tad-dooh-platform/actions/runs/41715214665) | FAIL; Tests, TypeScript y Prisma PASS |
| [Format & Lint 126193313663](https://github.com/tadtaxiadvertising/tad-dooh-platform/actions/runs/41715214665/job/126193313663) | Prettier FAIL en LandingPage.tsx; ESLint SKIPPED. Los 231 warnings históricos de Admin no son un conteo actualizado |
| [Security Audit 126193314402](https://github.com/tadtaxiadvertising/tad-dooh-platform/actions/runs/41715214665/job/126193314402) | FAIL: 64 hallazgos = 18 high + 38 moderate + 8 low; observado 20:44:57 UTC. No son CVE únicos |
| [Browser de landing 126193314211](https://github.com/tadtaxiadvertising/tad-dooh-platform/actions/runs/41715214802/job/126193314211) | FAIL: H1 Advertiser a CSS zoom 200%, 390×844, contenido 270px en caja 159px. Nueve checks anteriores PASS; restantes NOT RUN |
| [Docker independiente 41715214861](https://github.com/tadtaxiadvertising/tad-dooh-platform/actions/runs/41715214861) | PASS: api, admin, driver y player |

Estas ejecuciones no verifican el SHA nuevo ni el estado de producción.

## Fallos reproducidos y correcciones

1. **Cabeceras y palabras largas:** ambos H1 y el acceso Driver se recortaban con ancho efectivo reducido. Se permite wrap de cabecera/navegación y de palabras; las alturas mínimas conservan la composición normal.
2. **Presupuesto Advertiser:** el número y las parejas etiqueta/importe no cabían en tarjetas muy estrechas. La cifra se ajusta al contenedor sin partir sus dígitos; por debajo de 220 CSS px el desglose se apila. La opción de producción envuelve su texto y conserva foco al alternar OFF/ON/OFF.
3. **Laboratorio Driver:** la revisión visual detectó un recorte que el smoke anterior no alcanzaba. A 390×844 con CSS zoom2, sección/layout ocupaban x32–358, pero controles/nota/resultado llegaban a x399,77, sin desplazamiento horizontal. El mínimo intrínseco del track `1fr` excedía su contenedor; el clip exterior ocultaba el sobrante mientras los rangos y total sí cabían. Se eliminan esos mínimos con `minmax(0,...)`/`min-width:0`; los contenedores estrechos apilan títulos y desglose, y el total ajusta su tipografía sin partir la cifra. La regresión nueva verifica cajas, fragmentos de texto, etiquetas/importes y 15/100/100 → RD$107,500, con restauración por teclado. `driver-lab-reflow-red.log` conserva el fallo; `driver-lab-candidate.log` acredita tres escenarios ampliados y ocho anchos normales con el candidato inyectado, sin confundirlo con el smoke del compilado final.
4. **Nombres y enlaces accesibles:** el gráfico de slots Driver recibe `role="img"` con su nombre dinámico; sus marcas siguen decorativas y los controles quedan fuera. El enlace de marca Advertiser incluye el texto visible Taxi Advertising. La regla de enlaces de la landing respeta la clase de subrayado del enlace de política de cookies.
5. **Lint/formato Advertiser:** se elimina únicamente un `stateRef` sin usos. El formato se verifica sobre los componentes modificados.

Las regresiones conservan la matriz de ocho anchos, no-JS, movimiento reducido/normal y los guards de red, API, SW, errores y foco. No se suben umbrales ni se suprimen comprobaciones. CSS zoom200% es estrés reproducible; no certifica el zoom nativo del navegador.

## Verificación local

Entorno: Windows, Node 22.20.0, pnpm 10.34.0, Next 15.5.28, Playwright Chromium 156. Las dependencias se instalaron con lock congelado; no se cambió el lockfile. Los builds usan signup OFF, Supabase ficticio y destinos API loopback. El build de Next omite lint/tipos por configuración existente: esos gates se ejecutan por separado.

Estado funcional local: **PASS dentro del alcance de landing**. Mediciones y revisión final completadas; la certificación global sigue bloqueada por gates independientes.

| Comprobación | Resultado y evidencia |
| --- | --- |
| Contratos Node | PASS, 75/75, exit0, 18.36 s; `post-199/contracts-accepted.log`. Los nueve archivos se enumeran en el reporte post-198 |
| Tipos estrictos de landing | PASS de Advertiser y Driver, dos exit0 ejecutados independientemente del build |
| Lint del alcance | PASS con `--max-warnings 0`; Advertiser usa el binario ESLint de Driver con cwd/config Advertiser |
| Prettier del alcance TSX | PASS, Prettier 3.8.5; no acredita el formatter global |
| Builds aceptados | PASS, dos exit0. Advertiser `6wa-xAsjGj98IwRD3tIqg`, `advertiser-build-accepted.log`; Driver `glWt2kofhnLMu9vwoSQ8_`, `driver-build-final.log` |
| Browser aceptado | PASS, dos exit0: Advertiser 15/15, `advertiser-smoke-accepted.log`; Driver 13/13, `driver-smoke-accepted.log` |
| Capturas y revisión visual | PASS del alcance: ocho anchos con/sin JS por portal, tres escenarios ampliados y capturas de detalle Driver en `driver-*-accepted-*.png`. Nota y ejemplo máximo completos; hero normal conserva composición. No equivale a WCAG completa |
| Revisión independiente del diff | APPROVE: reflow inicial, delta de accesibilidad Advertiser y delta final Driver; revisión de solo lectura, sin sustituir ejecución de pruebas |
| CI del SHA final | Registrar en la descripción del PR después del push, sin crear otro SHA solo para actualizar su resultado |

La comprobación global de Prettier local se interrumpió tras avisos masivos fuera del diff, en un checkout Windows con autocrlf/CRLF. No se determinó por separado la causa de cada aviso: el resultado global local es INCOMPLETE. Se conserva `prettier-global.log`; no se cuenta como PASS ni se reformatea el monorepo para acomodar el entorno. La ejecución Linux del PR es la referencia del gate global.

Un primer intento de build usó el filtro inexistente `@tad/driver`: pnpm no seleccionó proyectos y devolvió exit0. No se cuenta como compilación; se conserva en `driver-build-accepted.log`. La ejecución efectiva se lanzó dentro de `apps/driver` y se registra en `driver-build-final.log`.

## Mediciones Lighthouse

Se ejecutan muestras locales individuales con Lighthouse 13.6.0 sobre los builds compilados: emulación móvil predeterminada y `--preset=desktop`. No son datos de campo, mediana de varias pasadas, INP/p75 ni comparación de mejora respecto a un baseline equivalente. Las muestras móviles advierten que la CPU anfitriona es más lenta de lo esperado; se conserva esa advertencia.

| Artefacto final / modo | Performance | Accesibilidad | Best practices | SEO | LCP ms | CLS | TBT ms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Advertiser móvil | 67 | 100 | 96 | 92 | 2320.26 | 0 | 2264 |
| Advertiser escritorio | 99 | 100 | 96 | 92 | 459.69 | 0 | 108.5 |
| Driver móvil | 72 | 100 | 100 | 92 | 1637.74 | 0 | 1804.5 |
| Driver escritorio | 81 | 100 | 100 | 92 | 461.00 | 0 | 421 |

Archivos `*-lighthouse-*-accepted.json`, exit0 y sin `runtimeError`. Las muestras Advertiser coinciden con la compilación Driver en el anfitrión; el perfil no está aislado y el móvil advierte CPU lenta. No se certifica un presupuesto de rendimiento con estos valores. Las muestras previas se conservan y no se selecciona una pasada verde para ocultar un fallo. Antes de la corrección, Advertiser desktop obtuvo accesibilidad97: nombre visible de marca ausente en aria-label y enlace de cookies sin subrayado efectivo. Driver ya mostró accesibilidad100 tras el rol del gráfico.

## Límites y seguimiento

- La deuda de dependencias mantiene el gate de seguridad rojo. El [triage](../security/post-198-dependency-triage-2026-11-03.md) describe tarjetas de compatibilidad separadas; aquí no se implementaron upgrades major ni overrides.
- El lint global requiere su propio inventario. No se interpreta un ESLint SKIPPED como PASS ni se reutiliza el conteo histórico como resultado actual.
- Lighthouse local observa trabajo de JavaScript elevado en móvil, `robots.txt` no válido y favicon Advertiser ausente. No se cambia middleware, autenticación ni política de indexación para elevar una puntuación. Corresponden a seguimiento específico.
- No se acreditan sesiones/RBAC, envío de registro, atribución de referidos, pagos, datos reales, staging, WCAG completa, dispositivo físico, SW instalado, Player ni rendimiento de campo.

El complemento se entrega como PR revisable. Los fallos globales impiden certificar la plataforma o recomendar despliegue. La remediación de dependencias y el lint global son las siguientes tarjetas independientes.

## Evidencia y reversión

Logs y capturas externos al repositorio: `C:/Users/Arismendy/.codex/visualizations/2026/11/03/01a1a16d-39e3-7ae0-bed9-073a22bff88c/post-199`; la primera fase se conserva en `post-198`. No contienen archivos de entorno ni credenciales. Los artefactos de CI del PR aportan evidencia remota adicional.

Revertir solo los commits del complemento después de revisar el diff. No hay cambios de datos que revertir; no restaurar el checkout principal completo. Mantener el aislamiento E2E de #198 y las reparaciones integradas en #199. Los dos servidores locales creados para esta comprobación quedaron cerrados. Los archivos PWA generados durante el build se respaldaron fuera del repositorio y se retiraron del diff de entrega.
