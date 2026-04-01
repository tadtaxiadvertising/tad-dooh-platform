# 🕵️‍♂️ 08 — ANÁLISIS DE COHERENCIA ARQUITECTÓNICA (SRE AUDIT)

> **Auditor**: Senior Software Architect.
> **Objetivo**: Identificar contradicciones críticas entre la lógica de negocio declarada en `02_reglas_negocio_stack.md` y la implementación técnica de `01_auditoria_tad_2026.md`.

---

## 🚨 CONTRADICCIONES CRÍTICAS (CRITICAL GAPS)

He encontrado serias fisuras de consistencia entre la regla de negocio y la realidad técnica. Aquí está la brutal verdad:

### 1. El Kill-Switch de Suscripción (La Paradoja HTTP 402)

* **Regla de Negocio (02):** "Si la suscripción anual (RD$6k) no está pagada, el endpoint `/fleet/track-batch` devuelve **402 Payment Required**".
* **Implementación (01):** "El celular (Gateway) manda los datos y recibe el 402". "Si el API devuelve 402 al celular, el celular debe notificar a la tablet para que deje de mostrar anuncios".
* **Contradicción SRE:** ¡Esto es un callejón sin salida arquitectónico! La tablet (*FullyKiosk*) opera *offline-first* o atada a su propio Wi-Fi interno. El celular (4G) actúa como Gateway de subida de GPS, pero **¿cómo el celular notifica a la tablet (aislada de red) que tiene que apagarse?** El protocolo HTTP es Cliente-Servidor. El celular no puede hacer "Push" a la tablet mágicamente sin un canal Websocket en LAN o Bluetooth.
* **Resolución Exigida:** El chequeo de la suscripción (o el 402) debe realizarse *directamente en la Tablet* cuando intenta descargar el JSON de la "Playlist" (cada 24 horas). El Gateway móvil solo reporta GPS; la inteligencia comercial reside en el Playlist endpoint. Si no paga, se le envía un JSON vacío o con una directiva `{ "killSwitch": true }`.

### 2. El Presupuesto Asignado vs Cobro Fijo (Finanzas)

* **Regla de Negocio (02):** "Cálculo de Comisión: RD$500/mes para el chofer se desbloquea tras alcanzar 75% de Attendance".
* **Implementación (01):** "Liquidación de Nómina RD$500/anuncio por taxi automatizada". "Pago a Choferes: RD$500/mes por campaña activa". "Costo por Taxi: 15 × RD$500 = RD$7,500/mes".
* **Contradicción SRE:** El archivo 02 exige validación del 75% de "asistencia GPS/Tracking" en calle para desembolsar el pago. El archivo 01 dicta un esquema fijo de "RD$500 por anuncio". Si un chofer se conectó 2 días al mes (5%), ¿recibe el pago íntegro de 15 anuncios (RD$ 7,500)?
* **Resolución SRE (Actualizada 01/Abr/2026):** Se ha integrado el motor de Heatmaps en `/analytics`. Esto permite cruzar la ubicación GPS con la "asistencia" de forma visual. El reporte de "Promociones (Ciclos)" ahora sustituye a los "Impactos" crudos, permitiendo una base de pago más justa basada en ciclos de reproducción en zonas de alta densidad detectadas por el Heatmap.

### 3. La Mentira Serveless vs Los Contenedores Persistentes

* **Regla de Negocio (02):** "Deployment: Vercel Serverless (`api/index.ts`)".
* **Implementación/Entorno:** El ecosistema está migrando o configurado en Docker vía Easypanel en un VPS propio para evadir límites de tráfico y memoria.
* **Contradicción SRE:** Las funciones sin estado (Serverless) eliminan la fuga de memoria al morir post-request. En un VPS persistente con Docker, Node.js acumula memoria V8 y Prisma agota la conexión TCP. Prometer Vercel mientras usamos Easypanel requiere un rediseño de cómo matamos los objetos en memoria y cómo manejamos el pool (`PgBouncer`). Si seguimos usando el paradigma Serverless en Docker, Prisma crasheará el VPS en 48 horas bajo la carga de GPS de la flota.

---

### VEREDICTO FINAL

El sistema es brillante pero sufre una "esquizofrenia de arquitectura". Hay lógicas concebidas para un MVP en Vercel tratando de correr como un microservicio en un VPS austero. El plan de contingencia offline y los `max_old_space_size` implementados en los nuevos documentos resolverán el 90% de esto.
