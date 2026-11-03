# Plantilla de revisión de implementación

Copiar/adaptar solo para un PR autorizado o su checkpoint; esta plantilla no crea un PR ni ejecuta acciones. Sustituir los campos por evidencia real y eliminar filas ajenas al alcance. No marcar esta plantilla sin completar como resultado de QA.

## Problema y comportamiento resultante

Describir usuario, disparador, comportamiento anterior y resultado esperado. Indicar alcance, exclusiones, base/HEAD, entorno y fecha/zona. Para bug: reproducción y causa confirmada o hipótesis; para diseño nuevo: aceptación observable.

## Motion UX review

| Componente / blueprint | Propósito | Inicial → input → resultado → reversión | Motor/propiedad/duración | Reduced motion y no-JS | Evidencia y estado |
| --- | --- | --- | --- | --- | --- |
| Completar con componentes del diff | Explicación o feedback que aporta | Incluir foco y reversión | Un dueño por propiedad | Alternativa equivalente | Artefacto revisado; IMPLEMENTADO o VERIFICADO |

Para el rediseño completo: cobertura acumulada A1–A4 y D1–D4, enlazando PRs previos sin atribuirse trabajo no inspeccionado. Para un arreglo menor, indicar únicamente la cobertura relevante.

## Móvil y accesibilidad

Registrar viewports/perfiles emulados, navegador, DPR, touch/teclado, foco, landscape, zoom200%, contraste, reduced motion, carga/error/slow y primer HTML. Enlazar antes/después y vídeo o evidencia de interacción equivalente. Explicar resultados geométricos y revisión visual, distinción emulado/físico, pruebas no ejecutadas y límites de cobertura WCAG.

## Librerías y rendimiento

Indicar componente real, procedencia URL permanente/version/SHA, licencia/notices y dependencias; ADOPTADO, DESCARTADO con alternativa demostrada o PENDIENTE. Separar motor UI de narrativa. Registrar bundle antes/después (assets, método gzip y delta), entorno y métricas de laboratorio comparables; datos de campo solo si existen. No inferir p75 ni INP de un screenshot/Lighthouse.

## Verificaciones

| Gate / comando o escenario | SHA y entorno | Resultado/exit code | Evidencia | Límite o pendiente |
| --- | --- | --- | --- | --- |
| Completar con ejecución real | Base/HEAD pertinente | PASS / FAIL / OMITIDO / NO EJECUTADO | Log o artefacto sanitizado | Razón concreta |

Distinguir pruebas de cálculo/contrato, tipos focalizados/globales, lint, build, navegador y CI sobre el HEAD exacto. No presentar build con ignoreBuildErrors como prueba de tipos. Fallos de seguridad/otros workspaces permanecen visibles; clasificar sin silenciar gates.

## Contratos, riesgos y reversión

Explicar producción opt-in, tarifas/supuestos, mensual/eventos Driver y prueba de consistencia con onboarding cuando cambien. Indicar efectos sobre consentimiento, CTA y permisos; no certificar DB, auth real, offline del Player o finanzas solo por UI. Registrar riesgos y mitigaciones, reversión por commit/PR y dependencias. Ninguna operación de datos como rollback visual.

## Pendientes y entrega

Estado: IMPLEMENTADO, PENDIENTE DE VERIFICACIÓN o VERIFICADO EN EL ALCANCE. Enlazar checkpoint, PR draft autorizado y CI del SHA exacto. Indicar bloqueos/siguiente acción; detener procesos propios y no prometer trabajo fuera de sesión. Sin merge/deploy por defecto.
