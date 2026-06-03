---
title: Configuración Android - Modo Kiosko (DOOH Tablets)
status: ESTABLE
updated: 2026-03-24
---

# 📱 Hardware DOOH y Dispositivos Táctiles (Tablets Setup)

El ecosistema TAD-DOOH depende de tablets (normalmente Android) montadas detrás de los apoya-cabezas de los vehículos. Este documento describe la logística para un encendido exitoso y su anclaje a la plataforma digital.

## 🛠️ Configuración Inicial (Booting de Nueva Tablet)

Para los primeros **10 choferes** que conectes:

1. **Browser Recomendado:** Instala la última versión de un navegador Chromium moderno (Brave Browser o Google Chrome). 
2. **Acceso a URL Inicial:** Deberás apuntar la tablet a la URL del player, inyectando manualmente el Device ID en el query string o por primera vez para que `localStorage` lo preserve:
   > Ejemplo de Setup: `https://player.tu-dominio.com?deviceId=taxi-DEV001`
3. **Persistencia (Sticky ID):** Una vez que el navegador cargue el PWA (Progressive Web App) con el player, el archivo `index.ts` atrapará el ID forzado "taxi-DEV001" y lo insertará profundamente en los cookies/almacenamiento en caché (`tad_device_id`). Así, si la tablet se apaga, no nacerá sola ni intentará crear un ID fantasma la próxima vez.
4. **Pantalla Completa (Kiosk Mode):** Asegúrate de enviar la página al modo Pantalla Completa y marcar la opción "Agregar a Pantalla de Inicio".
5. **Silenciar OS Alerts:** Deshabilita notificaciones automáticas de Android (Ej: "Actualización de PlayStore") para evitar que tapen los anuncios en pleno viaje de un pasajero. Ajusta el `Display Sleep` (Apagado de pantalla) a: **NUNCA**.

## 🔋 Tolerancia a Apagones (Baterías)

- Si el taxista apaga el vehículo y la tablet pierde red y eventualmente se agota, al encender debe recargar automáticamente la última Playlist guardada en la caché local gracias al "Sync Engine" de `TAD`.
- La información de `Telemetría (Battery Level y Storage)` tratará de ser enviada cada 5 minutos al servidor. En tu Dashboard verás un punto Verde / Gris determinando si ha habido señal Heartbeat (Latido) en la última media hora (Online / Offline).

## 🛜 Conectividad WiFi / 4G Móvil
Al pasar por túneles o zonas muertas, el archivo `sync.ts` dejará de emitir `Latidos (Heartbeat)` al API de NestJS del servidor en EasyPanel. 

Si el conductor pierde la red por completo durante más de **24 HORAS SEGUIDAS**, saldrá un banner indicándole que revise conectividad: `⚠️ SIN CONEXIÓN POR > 24H. Por favor, conecte a internet.` Así el propio taxista solucionará el percance (Comprar Data, Pagar router 4G) sin que debas llamarle por teléfono constantemente.
