# TAD Cinematic Landing Director — implementación y evidencia

**Fecha:** 2026-11-06. **Base revisada:** `main@01d22cec2b1216156457dfed8e4f1f68d19ac58f`.  
**Rama:** `feat/tad-cinematic-landing-2026-11-06`. **Estado inicial:** implementado, verificación en CI pendiente.  
**Alcance:** únicamente las páginas públicas de `apps/advertiser` y `apps/driver`, pruebas browser y gate específico de landing. Sin deploy, cambios financieros, backend, DB, RLS, cookies, autenticación, player offline, ni merge.

## GOAL / Dirección creativa

Prolongar el sistema existente **TAD Cinema / TAD Night Shift** sin sustituir las landings V4 previamente implementadas. Conservar el negro `#08090b`, el amarillo `#ffd400`, los encabezados editoriales y las escenas vectoriales ligeras que no dependen de assets remotos, mientras cada hero muestra una interacción intencional, reversible y compatible con teclado. Reutilizar el reproductor visual, el estudio de presupuesto, el recorrido didáctico y el laboratorio de ingresos existentes.

- **Anunciantes:** controles de Santo Domingo/Santiago en el hero; la escena urbana y el selector del presupuesto utilizan el mismo estado `city`. El recorrido de cuatro pasos y el simulador siguen operativos. La producción creativa continúa desactivada inicialmente y requiere acción explícita.
- **Conductores:** tres capítulos seleccionables, Pantalla/Ventas/Referidos, con respuesta visual y texto didáctico diferenciado; conserva el estimador para hasta quince campañas simultáneas y las otras dos vías aprobadas, sin crear ganancias ni saldos.
- **Motion:** estados estáticos útiles como punto de partida; cambios con CSS transform/opacity y el Framer Motion ya incluido; foco visible y `prefers-reduced-motion`. Ningún video, shader, WebGL o runtime audiovisual agregado.
- **Responsive:** diseño en flex/wrap, controles con altura mínima de 46 px y reglas para 370/380 px. **Esto describe el código, no constituye prueba visual**; la matriz de navegador se comprueba por CI.

## Rutas y componentes afectados

| Surface | Archivos | Contratos preservados |
| --- | --- | --- |
| Anunciantes | `apps/advertiser/components/landing/{LandingPage.tsx,CityScene.tsx,landing.module.css}` | `estimateCampaign`, `estimateCampaignDetailed`, enlace de onboarding y producción opt-in `false` |
| Conductores | `apps/driver/components/landing/{DriverLandingPage.tsx,driver-landing.module.css}` | `DriverEarningsLab`, `previewDriverEarnings`, tres vías y gate `NEXT_PUBLIC_LANDING_SIGNUP_ENABLED` |
| QA | `scripts/landing-cinematic.test.cjs`, `scripts/landing-v3-smoke.cjs`, `scripts/driver-landing-smoke.cjs`, `.github/workflows/landing-v5-checks.yml` | Tests existentes y producción de capturas conservados |

## Skills externos — procedencia y estado real

Las fuentes oficiales se inspeccionaron en GitHub/documentación pública. **No se ejecutó `npx skills add` en el checkout de Codex**: el acceso actual es la API de GitHub, no una terminal y sistema de archivos de trabajo enlazado a ese checkout. No se declara instalación ni ejecución efectiva de skills externas. Lecturas de referencias y principios sirvieron para tomar decisiones; los checks especializados de esas herramientas quedan pendientes.

| Skill | Fuente de instalación | Decisión sobre este cambio |
| --- | --- | --- |
| UI/UX Pro Max | `nextlevelbuilder/ui-ux-pro-max-skill` | Principios de responsive, contraste, componentes con semántica y foco. Instalación pendiente. |
| frontend-design | `anthropics/skills`, `frontend-design` | Mantener identidad expresiva sin introducir layouts genéricos. Instalación pendiente. |
| Taste | `Leonxlnx/taste-skill`, `design-taste-frontend` | Evitar reconstrucción estilo plantilla y métricas comerciales inventadas. Instalación y auditoría automatizada pendientes. |
| Impeccable | `pbakaus/impeccable` | Fases de crítica/adaptación/pulido propuestas; comandos no ejecutados. |
| Emil Kowalski | `emilkowalski/skills`, `improve-animations`, `animate`, `review-animations` | Distinción entre auditoría, implementación y revisión; herramientas de auditoría no ejecutadas. |
| HyperFrames | `heygen-com/hyperframes` | Producción de video opcional; no instalada ni utilizada. No hay video que justifique nuevo peso al hero. |
| Remotion | `remotion-dev/skills`, `remotion-best-practices` | No instalada ni utilizada; no se creó una composición de video. |

**Ruta de instalación para una sesión local de Codex:** auditar versión, contenido `SKILL.md`, referencias, licencia y scripts de cada fuente; ejecutar las instalaciones precisas del encargo en checkout aislado, mediante `npx skills add <repo> --skill <nombre>` donde la fuente confirme el nombre actual. Confirmar las skills con el CLI; no copiar scripts ejecutables a producción sin revisión. HyperFrames documenta una instalación del conjunto core por separado (`npx skills add heygen-com/hyperframes`); no asumir que su skill `hyperframes` es un paquete JS en runtime.

## Plan de aceptación QA reproducible

CI existente: `.github/workflows/landing-v5-checks.yml`, disparado por PR de ambas aplicaciones. El PR ejecuta `pnpm install --frozen-lockfile`, `node --test` de la suite de landing con `scripts/landing-cinematic.test.cjs`, TypeScript aislado, builds equivalentes a producción con fixtures y smoke local con Chromium (`scripts/landing-v3-smoke.cjs` y `scripts/driver-landing-smoke.cjs`). Capturas publicadas como artifact `tad-public-landings-responsive`, si el job llega a ese paso.

| Prueba | Anunciante | Conductor | Evidencia al redactar |
| --- | --- | --- | --- |
| Interacción de capítulo, pulsación teclado y reversión | Ciudad sincronizada con selector de presupuesto | Tres canales y escena exclusiva | Test en Git, ejecución pendiente |
| Negocio sin cambio de cálculo ni opt-in involuntario | Producción OFF inicial | Ingresos segregados, simulador intacto | Revisión estática, ejecución pendiente |
| Breakpoints 320/375/390/768/1024/1440 + extras del smoke | Cubierto por harness existente | Cubierto por harness existente | Capturas CI pendientes |
| Zoom 200%, foco, links, reduced motion, no-JS | Cubierto por harness existente | Cubierto por harness existente | CI pendiente |
| Build y TypeScript por aplicación | Workflow existente | Workflow existente | CI pendiente |
| Lighthouse/Core Web Vitals reales | No ejecutado | No ejecutado | No inventar puntuaciones |

## Riesgos y reversión

1. **P1 — QA browser no observada:** aunque los tests se han añadido, hasta que ejecuten en el SHA de la rama no se certifica responsive, movimiento ni accesibilidad.
2. **P2 — escenas orientativas:** ciudad y canales cambian la ilustración y el texto educativo, **no** representan cobertura geográfica real, campaña vendida ni ingreso aprobado.
3. **P2 — dependencias externas:** ninguna skill de tercero fue instalada en el checkout; no atribuirle una ejecución o un render.
4. **P2 — trabajo existente:** evitar merges automáticos y revisar otras ramas/PR antes de incorporar cambios en `main`.

**Reversión:** revertir commits de esta rama o cerrar el PR sin merge. Los cambios se limitan a frontend público, scripts y documentación; no se requiere rollback de esquemas, pagos o secrets. Revisar el estado del PR y CI del SHA exacto antes de declarar `VERIFICADO`.

## Checkpoint

**EVIDENCIA BASE:** contenido fuente en GitHub, base `01d22cec`, documentos `docs/ux-landing/creative-reframe-v3.md`, pruebas y workflow existentes.  
**SIGUIENTE PRIORIDAD:** comprobar ejecutado `node --test` + tipos/build/Playwright del SHA exacto, revisar screenshots (incluido 200% zoom), corregir cualquier regresión y completar la instalación externa donde exista terminal Codex aprobada.  
**ESTADO:** IMPLEMENTADO, PENDIENTE DE VERIFICACIÓN.
