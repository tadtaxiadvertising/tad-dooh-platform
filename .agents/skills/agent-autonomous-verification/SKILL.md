---
name: agent-autonomous-verification
description: "Use when executing a structured pipeline to process, schedule, and self-audit complex solutions iteratively, guaranteeing compliance with the platform's technical ecosystem before delivering the final solution. Triggers: deep architecture tasks, cross-microservice refactors (e.g. Backend to PWA), explicit module audits against project standards."
---

# Agent Autónomo de Verificación

Ejecutar un pipeline estructurado para procesar, programar y auto-auditar soluciones complejas de forma iterativa, garantizando el cumplimiento del ecosistema técnico de la plataforma antes de entregar la solución final al humano.

## Cuándo se activa

De manera implícita al recibir tareas de arquitectura profunda, refactorizaciones que cruzan microservicios (ej. Backend a PWA), o cuando el usuario solicita explícitamente auditar un módulo contra los estándares del proyecto.

## Contexto específico

- Arquitectura de microservicios Dockerizados alojados en VPS (Easypanel) con cuotas restrictivas (512MB RAM para APIs, 1024MB para el motor de video).
- Resiliencia Offline-first en los clientes (IndexedDB, Service Workers, JWT validation offline).
- Operaciones financieras que requieren transacciones atómicas seguras en Prisma (`$transaction`) y Supabase.

## Pasos

1. **Descomposición Arquitectónica**: Separar el requerimiento identificando dependencias cruzadas (ej. un cambio en `apps/api` ¿requiere actualizar tipos compartidos en `packages/database` o ejecutar `prisma db push`?).
2. **Generación Táctica**: Redactar la solución en memoria, asegurando identificadores en inglés, documentación en español neutro y cumplimiento de convenciones (Tailwind v4, Leaflet).
3. **Simulación de Pipeline de Integración**: Evaluar mentalmente si los cambios superan las barreras de compilación (`tsc --noEmit`) y respetan la configuración de los Dockerfiles ubicados en la raíz.
4. **Auditoría R1-R9**: Someter la propuesta a una matriz de pruebas contra las reglas de negocio, con especial escrutinio al debounce de telemetría (R2), límite de campañas (R4) y el Kill-Switch (R3).
5. **Autocorrección (Loop)**: En caso de detectar una vulnerabilidad o ineficiencia, descartar el draft en memoria y generar una nueva versión iterada.

## Verificación

- El agente emite el log del bucle (ej. `[Agent Loop: Completado en X iteraciones]`).
- La skill o código final incluye comandos exactos de validación local listos para copiarse (ej. `npm run build --workspace apps/driver`).
- Se incluye un resumen de impacto confirmando qué reglas específicas del R1-R9 se protegieron durante la generación de la respuesta.

## Riesgos / Reglas de negocio en juego (NO VIOLAR)

- **R1 y R2**: Alterar hooks o el Service Worker puede romper la cola de peticiones persistente (IndexedDB), causando pérdida de datos (Proof of Play / Telemetría) al estar offline.
- **SRE & Infraestructura**: Riesgo de introducir pérdidas de memoria (OOM) en producción si se omiten los hooks de apagado seguro (`enableShutdownHooks`) o se excede el tamaño de lote en las consultas de Prisma (`createMany`).
- Riesgo de "alucinación" al mapear directorios, inventar configuraciones de Tailwind v4 (`tailwind.config.js` no existe), o sugerir auto-deploys automatizados cuando deben ser manuales.