---
title: Matriz de Seguridad y Autenticación
status: ESTABLE
updated: 2026-03-24
---

# 🛡️ Matriz de Seguridad y Privacidad DOOH

Como sistema distribuido y público (pantallas en vehículos privados transitando la ciudad), TAD DOOH mantiene lineamientos de seguridad perimetral críticos.

## 🔑 Autenticación Administrador (Dashboard)
El acceso al comando central está restringido a propietarios de **TAD**. 
- La sesión se mantiene viva a través de JWT (JSON Web Tokens) inyectados en la cabecera de las llamadas HTTP: `Authorization: Bearer tad_admin_token`.
- **Expiración Corta:** En entornos sensibles o fallos HTTP 401, el Dashboard está programado para forzar un Hard-Logout y llevarte a la pantalla `/login`.

## 🛰️ Endpoint de Dispositivos (Tablets)
Las tablets que reproducen los anuncios actúan como clientes "semi-pasivos", es decir, no tienen un login con usuario y contraseña tradicionales porque necesitan arrancar automáticamente si la batería muere y enciende de nuevo.
- Cada tablet se casa con un identificador único en su almacenamiento estricto `localStorage` (`tad_device_id`).
- Este identificador debe ser autorizado obligatoriamente en el Dashboard por ti (Crear Driver -> Asignar Device ID) para que las funciones financieras se activen en la cuenta de cobro.

---

## 🧨 Seguridad de API y Base de Datos
La puerta del servidor Node.js que vive en EasyPanel bloquea explícitamente ataques básicos con configuraciones de NestJS CORS.
- **Botón de Pánico (Purga):** Existe el `POST /api/drivers/purge-all`. Por diseño, para evitar una catástrofe de *Drop Table*, no funciona vía interfaz gráfica sino que requiere el envío de una super-clave en Postman/cURL: `x-admin-secret: TAD_CLEAN_2026`.
- Esta macro-clave de backend jamás debe filtrarse al front-end en variables de Next.js públicas (`NEXT_PUBLIC_...`).

## ☁️ Acceso a Multimedia (Bypass)
Los clientes suben información publicitaria (Master Digitales de Alta Res) que no están bloqueados tras una pasarela, pero el balde (`bucket`) "ads-videos" en Supabase requiere políticas para crear nuevos archivos.
- Node.js fabrica un `Signed Upload URL` en milisegundos válido **solo por quince (15) minutos**. El frontend tiene ese pequeño margen para enviar el video a las nubes, previniendo que bots descubran URLs y suban archivos maliciosos pesados que agoten tu cuota del SaaS de almacenamiento.
