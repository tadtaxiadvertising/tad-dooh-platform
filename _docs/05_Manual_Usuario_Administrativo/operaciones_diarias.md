---
title: Manual de Operaciones Administrativas
status: COMPLETO
updated: 2026-03-26
---

## 🛠️ Manual de Operaciones Administrativas y Soporte de Flotas

Esta guía de usuario explica de manera paso-a-paso la operatoria diaria para el administrador en jefe y operadores de nómina del Dashboard de TAD DOOH Platform.

## 🚖 Registrar un Nuevo Conductor (Flotilla 10x10)

Cuando entra un nuevo conductor al ecosistema TAD:

1. Ingresa a la pestaña **Conductores** del Dashboard.
2. Da click al botón **Añadir Conductor**.
3. Rellena el Identificador del conductor (Licencia), Nombres, Teléfono y Placa del vehículo o Ficha.
4. **Validación Crucial de Equipamiento:** En el campo que indica "Identificador del Hardware (Tablet ID)", asegúrate de introducir el código de rastreo real de la tablet que ya esté encendida, emitiendo `latidos` al servidor. _Si introduces un ID falso, el sistema prohibirá proactivamente la creación._
5. Cuando envíes la data de registro, el BroadcastChannel del navegador forzará la pestaña "Finanzas" a recalcular los ingresos totales agregando los RD$6,000 de contribución del dispositivo (MRR total subirá y su balance quedará deudor).

---

## 🎞️ Carga de Publicidad Vía Bypass

Los clientes te enviarán master digitales (videos de hasta 200MB de peso, MP4 o WEBM).

1. Ingresa a la pantalla del **Nexus / Vault Multimedia** (Media).
2. Da clic en **Importar Asset**.
3. Arrastra el archivo. El Dashboard _no_ descargará tu internet ni calentará a Node.js; se enrutará directo al Cloud Storage de Supabase.
4. Elijes la duración del Pautado Comercial (30, 60 o 120s estelares).
5. Seleccionas también, si lo deseas, un código y URL interactiva `qrUrl` para Call-To-Action a los clientes (Ej. `wa.me/` para WhatsApps).
6. **Vincular a Campaña:** Seleccionas la campaña a la que pertenece el arte. A partir de la versión 5.4, ya **NO** debes seleccionar pantallas individuales al subir el video.

---

## 🎯 Despliegue Táctico (Asignación Global de Campañas a Pantallas)

Para evitar re-asignar pantallas cada vez que subes un video, el flujo opera de forma macro a nivel de la campaña:

1. Ve a la pestaña **Campañas** y elige la campaña.
2. Da clic en **"Despliegue Táctico"** (Botón amarillo en la cabecera de la campaña).
3. Ve a la pestaña **"Pantallas"** o **"Segmentar"**.
4. Elige si quieres transmisión global (todos los taxis) o selección exclusiva de pantallas específicas.
5. Guarda la asignación. ¡Listo! Todos los videos dentro de la campaña se distribuirán automáticamente a este clúster geográfico/pantallas.

---

## 🗺️ Monitoreo de Rutas (Mapa de Rastreos GPS)

1. Clicca en la pestaña **Rastreo (Tracking)**.
2. Verás el **Tactical Map**, un render interactivo con todos los taxis representados mediante íconos personalizados.
3. Si la unidad sale del límite establecido (Santiago/Polígono Central), su indicador cambiará a rojo (alerta geofence).
4. Dale clic a una unidad para ver de inmediato una estela amarilla (TAD-Yellow trail). La estela representa visualmente **los últimos 60 puntos recorridos** por el hardware gracias al algoritmo avanzado `getDeviceRecentPath`.

---

## 💸 Gestión de Nóminas y Pagos (Suscripciones)

Todas las pantallas deben RD$6,000 dominicanos a la plataforma cada mes. El estado financiero está monitorizado:

- En la tab de **Finanzas** verás el deudómetro.
- Si un conductor (Ojo, el `Device` en realidad) _NO_ está al día, pasados los umbrales de gracia, el servidor de TAD (API) empezará a retornar estatus `402 Payment Required` al Player de las Tablets.
- Esto disparará automáticamente en la tablet en cuestión un mensaje rojo, bloqueando parte de la UI: `⚠️ SUSCRIPCIÓN VENCIDA (RD$6,000). El servicio publicitario podría suspenderse pronto.`
- Para restaurar el servicio, un Administrador debe registrar un pago en la plataforma sobre la ID del Conductor.
