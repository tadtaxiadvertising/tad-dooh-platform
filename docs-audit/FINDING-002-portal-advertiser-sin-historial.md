# FINDING-002 — Portal del Advertiser no muestra solicitudes aprobadas ni la respuesta del admin

**Severidad:** BAJA / UX (el backend funciona correctamente; el portal pierde visibilidad)
**Fecha:** 2026-08-10
**Flujo probado:** portal advertiser → "Nueva Solicitud" → admin aprueba en "Solicitudes"

## Síntoma
Tras aprobar una petición desde `/admin/advertisers/requests`, el portal del
advertiser (`/p/advertiser/[id]` → pestaña "Solicitudes"):
1. Sigue mostrando la petición como **"Pendiente"** hasta recargar la página
   (sin actualización en vivo).
2. Tras recargar, la petición **desaparece por completo**: muestra
   "Sin solicitudes pendientes" y NO existe sección de historial/aprobadas.
3. La **respuesta del administrador** (`adminNotes`) que se escribió al aprobar
   nunca se muestra al advertiser.

## Estado del backend (CORRECTO)
La petición quedó bien guardada en la API:
```json
{
  "id": "1ab0adbf-32f3-4561-8c63-b7f9fc11d143",
  "type": "SPACE_REQUEST",
  "status": "APPROVED",
  "description": "QA FLOW: solicitud de 10 espacios adicionales ...",
  "adminNotes": "QA FLOW: Aprobado. Los 10 espacios adicionales se asignarán...",
  "updatedAt": "2026-08-10T05:52:35.043Z"
}
```
`GET /api/proxy/portal-requests` devuelve los datos completos.

## Causa raíz (frontend)
En `apps/admin/pages/p/advertiser/[id].tsx`, la pestaña de solicitudes lista
solo peticiones y la condición de render (aprox. líneas 541-560) muestra el
estado vacío cuando `requests.length === 0` o no distingue estados; además
`getAdvertiserPortalRequests` se consulta una sola vez al montar y no hay
refetch ni sección de historial. El admin escribe `adminNotes` en
`requests.tsx:46-55`, pero el portal no lo renderiza.

## Recomendaciones
- Añadir al portal una sección "Historial / Aprobadas / Rechazadas" que muestre
  el estado y `adminNotes` del admin.
- Refrescar la lista al volver a la pestaña (o tras la aprobación), para que no
  muestre estado obsoleto.
