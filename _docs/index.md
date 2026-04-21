---
title: Hub de Documentación TAD DOOH (TAD Intelligence Vault)
status: EN PRODUCCIÓN
updated: 2026-03-24
---

## 🏛️ Núcleo Arquitectónico y Estratégico

1. 🎯 **[Radar Principal de Detalles (Estado General)](01_Radar_de_Detalles/radar_principal.md)**
   La brújula del proyecto. Contiende los bugs pendientes, tareas de alta prioridad y el estado de salud de cada módulo (Backend, Dashboard, Player).

2. 🗺️ **[Arquitectura y Flujo de Datos](02_Arquitectura_Estructural/flujo_de_datos.md)**
   Diagrama visual de cómo se comunica la plataforma, desde los latidos (heartbeats) de las tablets conectadas a internet 4G, hasta cálculos de la "Nómina de RD$6,000" del Dashboard. Incluye las normas del **Bypass Upload**.

3. 🗄️ **[Esquema de Base de Datos (Entity-Relationship)](02_Arquitectura_Estructural/database_schema_overview.md)**
   Detalle exacto de las tablas de Prisma, relaciones entre Conductores, Dispositivos y Campañas. Incluye el diagrama ER del sistema.

4. 🤖 **[Protocolo de Relevo (Handover AI)](03_Roadmap_10x10/estado_actual_y_handover.md)**
   El estado milimétrico de la base de datos y la arquitectura Node.js. **Todo nuevo Agente IA debe leer este documento antes de tocar código de este proyecto.**

5. 📜 **[Historial de Versiones (Changelog)](11_Registro_de_Cambios/changelog.md)**
   Bitácora de ingeniería con la evolución del proyecto, correcciones de errores y nuevas funcionalidades implementadas desde la V1.

---

## 📘 Guías Operativas y Negocio

1. 🚀 **[Guía de Despliegue y DevOps](04_Despliegue_y_DevOps/guia_de_despliegue.md)**
   Manual técnico para subir el sistema a EasyPanel (VPS), configurar variables de entorno críticas y gestionar el Transaction Pooling de Supabase.

2. 🛠️ **[Manual de Operaciones Diarias](05_Manual_Usuario_Administrativo/operaciones_diarias.md)**
   Guía administrativa para el equipo de TAD. Cómo registrar conductores, subir publicidad de 200MB mediante el bypass y gestionar el inventario de pantallas.

3. 💰 **[Modelo de Cobros y Monetización](06_Modelo_de_Negocio_y_Monetizacion/modelo_de_cobros.md)**
   Cálculo de ingresos por pauta activa, lógica de rentabilidad RD$6k/mes y bloqueo automático de reproductores por mora publicitaria (Error 402).

4. 📱 **[Configuración de Hardware (Tablets)](07_Hardware_y_Logistica/configuracion_tablets.md)**
   Logística para configurar las pantallas en los apoya-cabezas, inyectar el Device ID y tolerar apagones de internet.

---

## 🛡️ Ecosistema y Estabilidad a Corto/Largo Plazo

1. 🔒 **[Seguridad y Matriz (Tokens & Privacidad)](08_Arquitectura_Seguridad/matriz_de_seguridad.md)**
   Esquema de las conexiones JWT, defensas en base de datos para borrados en bloque y políticas estrictas de Node-Cors.

2. 🚨 **[Protocolo de Disaster Recovery (Contingencia)](09_Disaster_Recovery/recuperacion_desastres.md)**
   Acciones obligatorias frente a caídas masivas en los servidores de EasyPanel o apagones del proveedor 4G/LTE de Taxis.

3. ♻️ **[Estrategia SDLC Zero-Downtime y Mantenimiento](10_Estrategia_de_Mantenimiento_y_Updates/ciclo_de_vida_software.md)**
   Reglas para los Despliegues Automáticos que previene dañar las iteraciones futuras mientras las tablets están pasando anuncios al aire.

4. 🧪 **[Protocolos de Calidad y Pruebas (QA)](12_Protocolos_de_Calidad_QA/manual_de_pruebas_e2e.md)**
   Instrucciones para la suite de pruebas automáticas (Playwright) y checklist manual para el benchmark de campo 10x10.

---

## 🔑 Parámetros y Claves Rápidas

- **Backend Host:** `https://proyecto-ia-tad-api.rewvid.easypanel.host`
- **Purge Secret:** `x-admin-secret: TAD_CLEAN_2026`
- **Suscripción Driver:** RD$ 6,000 / mes (incluye ITBIS).
- **Pago Driver p/Anuncio:** RD$ 500 / mes.
- **Port Supabase Pooler:** `6543` (Transaction Mode).

---

## ⚡ Prompt de Relevo (Copiar y Pegar al Nuevo Agente)

> Eres el Asistente Experto (QA & SysAdmin) de la Plataforma TAD DOOH (Taxi Advertising Digital Out Of Home).
>
> Tu objetivo es asegurar la escalabilidad del sistema. **Regla de Oro:** Nunca toques el código del Player ni el Backend sin leer la sección `03_Roadmap_10x10/estado_actual_y_handover.md` en Obsidian.
>
> ¡Adelante!
