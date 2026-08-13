---
name: orquestacion-autonoma-mcp-n8n
description: "Use when implementing autonomous improvement cycles, detecting recurrent errors in Easypanel container logs, or requiring deep refactoring without losing architecture context. Triggers: n8n, MCP, autonomous correction, tsc --noEmit gate, snapshot commits."
---

# Orquestación Autónoma MCP + n8n

Establecer un flujo de trabajo autónomo mediante n8n y herramientas MCP para capturar y mantener el contexto del monorepo de forma permanente, registrando los estados del código con Git y aplicando correcciones autónomas verificadas por compilador.

## Cuándo se activa

Implementación de ciclos de mejora continua, detección de errores recurrentes en los logs de los contenedores en Easypanel, o al requerir refactorización profunda sin perder el contexto de la arquitectura.

## Contexto específico

El monorepo TAD DOOH Platform opera con Next.js 15, NestJS 10 y TurboRepo, con despliegue en Easypanel bajo estrictos límites de memoria (512 MB para API/Frontends, 1024 MB para Remotion). El agente opera bajo la directiva de ejecutar pruebas y mejoras autónomas en los servicios en línea. La orquestación debe mantener el contexto técnico actualizado leyendo los documentos de auditoría y evitar la ejecución autónoma de `prisma db push` en producción para prevenir un crash-loop de base de datos. Toda corrección de código debe pasar la validación estricta del compilador antes de considerarse exitosa.

## Pasos

1. **Activar los MCP correspondientes**: `git` para control de versiones de estado, `filesystem` para indexación del monorepo y el conector API/Webhook de n8n para orquestación de flujos. Verificar que están registrados en `opencode.json` bajo la clave `mcp` (`git`, `filesystem`, `n8n-mcp`) y que el token de n8n (`N8N_MCP_TOKEN`) no devuelve 401 contra `https://proyecto-ia-n8n.rewvid.easypanel.host/mcp-server/http`.

2. **Indexar el contexto permanente mediante el MCP de filesystem**: leer la raíz del repositorio, `package.json`, configuraciones de los workspaces en `apps/*` y los documentos de arquitectura técnica actualizados (`0*.md` en la raíz y `docs/`).

3. **Configurar el flujo en n8n** para interceptar webhooks de error o eventos de commit, extrayendo el volcado de logs y enviándolo al agente como payload estructurado.

4. **Registrar el estado actual del código fuente antes de cualquier intervención** mediante el MCP de Git (`git add .`, `git commit -m "chore: snapshot pre-correccion autonoma"`).

5. **Analizar el fallo de forma autónoma** y aplicar las modificaciones necesarias en el código, respetando el uso de importaciones `@tad/*`, la arquitectura offline-first y omitiendo la alteración de `tailwind.config.js`.

6. **Compilar la aplicación afectada** utilizando `tsc --noEmit` como compuerta de calidad estricta.

7. Si el compilador arroja errores, **iterar el proceso de corrección de forma autónoma** capturando la salida del error; si es exitoso, registrar el estado final en Git (`git commit -m "fix: correccion autonoma aplicada"`).

## Verificación

- Ejecutar el comando `tsc --noEmit` en el workspace modificado para confirmar cero errores de tipado.
- Revisar el flujo en la interfaz de n8n para validar que la ejecución finalizó sin nodos caídos.
- Ejecutar `git log -2` para confirmar que el estado previo y la corrección posterior se registraron correctamente en el historial.

## Riesgos / Reglas de negocio en juego (NO VIOLAR)

- Las alteraciones autónomas pueden romper las reglas de negocio no negociables: **idempotencia financiera (R8)**, el **Kill-Switch (R3)** y la **telemetría de bajo consumo (R2)**.
- La inyección de dependencias pesadas durante la autocorrección puede causar un **Out-Of-Memory (OOM)** en los contenedores de Easypanel, superando el límite de **512MB RAM**.
- Un fallo en el auto-deploy podría dejar los contenedores en un estado intermedio **sin conexión a Supabase**.
- **NUNCA ejecutar `prisma db push` de forma autónoma contra producción** (usar migraciones/`apply_migration` en su lugar). Usar `DIRECT_URL` (puerto 5432) solo para migraciones.
- Toda mutación financiera requiere header `Idempotency-Key` (Protocolo V2026-SHIELD).
