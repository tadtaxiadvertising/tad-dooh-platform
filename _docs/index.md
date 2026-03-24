---
title: TAD DOOH - Hub Central
status: ACTIVE
updated: 2026-03-24
---

## 🚀 TAD DOOH - Comando Central

Bienvenido a la "Bóveda" (Vault) de Obsidian del proyecto **TAD Taxi Advertising D-OOH Platform**. Desde este índice interactivo puedes acceder a toda la documentación técnica, diagramas y próximos pasos construidos por el Agente de Antigravity AI.

## 🗂️ Mapas y Arquitectura

1. 🎯 **[Radar Principal (Bugs y Tareas)](01_Radar_de_Detalles/radar_principal.md)**
   Registro de anomalías visuales, estéticas, flujo de bugs de la interfaz y las siguientes mejoras planeadas por nosotros.

2. 🗺️ **[Arquitectura y Flujo de Datos](02_Arquitectura_Estructural/flujo_de_datos.md)**
   Diagrama visual de cómo se comunica la plataforma, desde los latidos (heartbeats) de las tablets conectadas a internet 4G, hasta cálculos de la "Nómina de RD$6,000" del Dashboard. Incluye las normas del **Bypass Upload**.

3. 🤖 **[Protocolo de Relevo (Handover AI)](03_Roadmap_10x10/estado_actual_y_handover.md)**
   El estado milimétrico de la base de datos y la arquitectura Node.js. **Todo nuevo Agente IA debe leer este documento antes de tocar código de este proyecto.**

## 📘 Guías Operativas y Negocio

4. 🚀 **[Guía de Despliegue y DevOps](04_Despliegue_y_DevOps/guia_de_despliegue.md)**
   Documentación SRE del servidor, límites de asfixia en EasyPanel y configuración del Prisma Pooler.
   
5. 🛠️ **[Manual de Operaciones Administrativas](05_Manual_Usuario_Administrativo/operaciones_diarias.md)**
   Paso a paso para tu día a día: cómo subir publicidades (Bypass), registrar conductores y gestionar deudas.

6. 💰 **[Modelo de Negocio y Monetización](06_Modelo_de_Negocio_y_Monetizacion/modelo_de_cobros.md)**
   Explicación de la arquitectura SaaS B2B, suscripciones en mora (HTTP-402) y matemáticas de la plataforma.

7. 📱 **[Configuración de Hardware (Tablets)](07_Hardware_y_Logistica/configuracion_tablets.md)**
   Logística para configurar las pantallas en los apoya-cabezas, inyectar el Device ID y tolerar apagones de internet.

## 🛡️ Ecosistema y Estabilidad a Corto/Largo Plazo

8. 🔒 **[Seguridad y Matriz (Tokens & Privacidad)](08_Arquitectura_Seguridad/matriz_de_seguridad.md)**
   Esquema de las conexiones JWT, defensas en base de datos para borrados en bloque y políticas estrictas de Node-Cors.

9. 🚨 **[Protocolo de Disaster Recovery (Contingencia)](09_Disaster_Recovery/recuperacion_desastres.md)**
   Acciones obligatorias frente a caídas masivas en los servidores de EasyPanel o apagones del proveedor 4G/LTE de Taxis.

10. ♻️ **[Estrategia SDLC Zero-Downtime y Mantenimiento](10_Estrategia_de_Mantenimiento_y_Updates/ciclo_de_vida_software.md)**
   Reglas para los Despliegues Automáticos que previene dañar las iteraciones futuras mientras las tablets están pasando anuncios al aire.

---

## 🔑 Parámetros y Claves Rápidas

- **URL del Backend Deploy (EasyPanel):** `https://proyecto-ia-tad-api.rewvid.easypanel.host`
- **Secret Hard-Reset DB:** `x-admin-secret: TAD_CLEAN_2026`
- **Puerto Seguro Prisma Pooler:** `:6543` (Protección contra colapsos de RAM limitados a --max-old-space=400).

---

## ⚡ Prompt de Relevo (Copiar y Pegar al Nuevo Agente)

Si quieres iniciar un chat con una nueva Inteligencia Artificial, simplemente pásale este bloque de texto:

> Eres el Asistente Experto (QA & SysAdmin) de la Plataforma TAD DOOH (Taxi Advertising Digital Out Of Home).
>
> Acabo de terminar un ciclo de Arquitectura Intensiva ("Antigravity Protocol V1") con el agente anterior. El backend está en EasyPanel y acaba de ser blindado y purgado por completo.
>
> Antes de que hagas cualquier cosa o toques algún archivo, **[TOMA CONTEXTO OBLIGATORIO]**:
> Lee el archivo: `_docs/obsidian/03_Roadmap_10x10/estado_actual_y_handover.md` usando tus herramientas de filesystem.
>
> TU MISIÓN AHORA: Conviértete en mi Soporte en Tiempo Real para la "Prueba de Campo 10x10". Voy a registrar manualmente conductores vivos con pantallas a través del Dashboard Web, en vivo. NO modifiques el archivo `PrismaService` y respeta el Bypass Upload actual.