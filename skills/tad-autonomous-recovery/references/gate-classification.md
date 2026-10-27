# Clasificación de puertas de acceso y prioridades (P0/P1/P2/P3)

Tabla de decisión para priorizar los bloques de la plataforma TAD y clasificar la ejecución de pruebas.

## Prioridades

| Nivel | Tipo | Criterios |
|---|---|---|
| **P0** | Crítico | Secretos expuestos, acceso no autorizado, corrupción de datos, fraude financiero, pérdida irreversible. |
| **P1** | Alto | Producción caída, autenticación rota, API inaccesible, base de datos desconectada, despliegues incorrectos, pérdida de sincronización de dispositivos. |
| **P2** | Medio | Errores de TypeScript, builds, CI, Docker, tests, migraciones incompatibles o funcionalidades principales defectuosas. |
| **P3** | Bajo | Rendimiento, observabilidad, documentación, mantenibilidad y deuda técnica. Features nuevas y refactors cosméticos al final. |

> Regla: una feature nueva nunca debe esconder un bloqueo P0/P1 verificable.

## Clasificación de pruebas

| Etiqueta | Significado | ¿Cuándo usar |
|---|---|---|
| **PASS** | Prueba ejecutada y aprobada. Evidencia reciente real. | Siempre que se haya ejecutado y salido 0. |
| **FAIL** | Prueba ejecutada y falló. | Registrar el fallo y la causa. |
| **BLOCKED** | Imposible comprobar por una limitación externa. | Sin Docker/PostgreSQL/credenciales/instancia remota. Registrar el blocker y la alternativa local. |
| **NOT RUN** | Aún no ejecutado. | No marcar como PASS. No marcar como BLOCKED hasta que se intente. |

## Clasificación final del proyecto

Solo se declara terminado cuando todos los gates relevantes estén registrados:

| Categoría | Significado |
|---|---|
| `COMPLETADO Y VERIFICADO` | Todos los gates críticos ejecutados y aprobados, sin bloqueos. |
| `FUNCIONAL LOCALMENTE, PRODUCCIÓN BLOQUEADA` | Puertas funcionales locales (builds, tests, typecheck, prisma) pasan; puertas de producción (Docker, DB, dominio, secretos) BLOCKED por falta de herramientas/credenciales. |
| `PARCIAL, BLOQUEOS IDENTIFICADOS` | Algunos gates críticos aún no pasan o no han podido ejecutarse; bloqueos de pila abiertos. |
| `DETENIDO POR RIESGO DE SEGURIDAD O INTEGRIDAD` | Se ha detectado una vulnerabilidad de alto impacto que no se puede mitigar localmente; se requiere intervención humana. |

## Reglas de aplicación

- `PASS` exige salida real de comando, no suposición. "Se compiló" no es "verificado".
- `BLOCKED` no se convierte en `PASS` ni en `NOT RUN` — se registra el blocker y la alternativa local.
- Si un mismo bloqueo falla dos veces con la misma causa, no se vuelva a repetir: cambia el diagnóstico o se registra bloqueado.
- Solo se clasifica como `COMPLETADO Y VERIFICADO` cuando todos los gates de la matriz (uninstall, typecheck, lint, prisma, tests, builds, Docker, healthcheck, RBAC, offline, financial idempotency, secrets, DSL, ports, rollback) están resueltos.
