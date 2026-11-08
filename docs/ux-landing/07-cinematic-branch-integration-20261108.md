# Integración de la rama cinematográfica — 2026-11-08

## Objetivo y punto de partida
Rama: `feat/tad-cinematic-landing-20261108`. Base de la rama antes de la intervención: `41204fdde8bdd4c2b50281883bb1b84bab405426` (1 commit propio). `main` observado: `1de1e121aa0981c9134e873fda830579df93ff80` (164 commits por delante del ancestro común). No había PR de esta rama.

Se preserva la historia mediante **commit de integración con dos padres**, sin force-push y sin modificar `main`. El árbol de la integración parte del `main` inspeccionado, incorporando selectivamente los cambios compatibles de la rama. Las mejoras ya incorporadas desde noviembre en la landing actual no se sobrescriben.

## Hallazgos y resoluciones
| Prioridad | Evidencia en origen | Acción |
| --- | --- | --- |
| P1 despliegue | La rama comentaba `output: "standalone"` y cambiaba el start a `next start`, mientras la CI actual arranca `.next/standalone/apps/driver/server.js`. | Preservar la pareja `output: "standalone"` y el script de arranque de `main`. |
| P2 build portable | La ruta de trazado dependía del directorio actual de ejecución. | Usar `path.join(__dirname, "../..")` como raíz estable del monorepo; requiere confirmación en compilación real. |
| P2 accesibilidad | El acceso directo de anunciantes apunta a `#main-content`, con el destino no enfocabilizable explícitamente. | Hacer `<main>` programáticamente enfocabilizable; mantener IDs y rutas vigentes. |
| P2 SEO | Metadata pública de robots incompleta y canonical ausente en Driver. | Robots explícitos y enlace canonical público de conductores. |
| P3 contrato UI | El commit original agregaba un identificador de componente al simulador Driver. | Retener `data-slot="driver-earnings-lab"` sin alterar tasas, cálculos ni estados de pago. |

## Pruebas y evidencias
- Se añade una cobertura de regresión aislada a `scripts/landing-cinematic.test.cjs` para anchors, metadatos y paridad standalone de CI.
- Ejecutar en GitHub Actions el workflow **Landing V5 Focused Gates** en el PR: tests Node, comprobación TS específica de ambas landings, builds de producción y Chromium local-only con capturas.
- No se han ejecutado pruebas de navegador, mediciones CWV ni builds en el entorno de esta intervención; no se declaran PASS hasta conocer el resultado del workflow. Revisar screenshots en los artefactos CI para 320/375/390/768/1024/1440 px y zoom 200%.
- Sin instalaciones nuevas, multimedia, dependencias o modificaciones a API/Auth/DB/RLS/pagos/offline.
- Skills consultadas: skill adjunta `tad-cinematic-landing-director`, `.agents/skills/tad-frontend-dev`, `tad-ui-ux` y `tad-autonomous-engineering-motion-ux`. HyperFrames, Remotion, Emil Kowalski, Taste, Impeccable y UI/UX Pro Max no ejecutadas en este entorno: no se atribuye uso sin verificación.

## Riesgos y pendientes
1. Validar compatibilidad del `next.config.ts` con Next 15/standalone en CI.
2. Revisar capturas reales, Core Web Vitals, teclado, 200% de zoom, formularios, comparativas móviles y reducido movimiento antes del merge.
3. Discrepancias comerciales de pricing/bonos/commission conservan el estado advertido en `docs/ux-landing/06-v5-creative-financial-audit.md`: no alterar importes contractuales sin decisión de negocio.
4. La ejecución de esta intervención no incluye despliegue, aprobación ni merge.

## Reversión
Revertir en el PR los cambios a los 5 archivos de app, test y este documento; conservar el historial y los commits recientes de `main`. Verificar nuevamente el workflow aislado antes de una eventual publicación.

**Estado al escribir:** IMPLEMENTADO, PENDIENTE DE VERIFICACIÓN.
