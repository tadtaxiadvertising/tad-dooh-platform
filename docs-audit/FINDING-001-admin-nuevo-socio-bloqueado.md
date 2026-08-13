# FINDING-001 — Admin "Nuevo Socio" no puede registrar conductores

**Severidad:** ALTA (funcionalidad de alta de socios 100% rota desde el panel admin)
**Fecha:** 2026-08-10
**Entorno:** https://proyecto-ia-tad-dashboard.rewvid.easypanel.host (admin)
**Ruta probada:** `/admin/drivers` → botón "Nuevo Socio" → "Confirmar Registro"

## Síntoma
Al llenar el formulario "Nuevo TAD DRIVER" (con o sin ID de tablet) y pulsar
**Confirmar Registro**, el modal permanece abierto, la consola registra
`Error creating driver: AxiosError: Request failed with status code 400`, y el
backend responde:

```json
{
  "message": "Debes aceptar el contrato de servicio para unirte a TAD",
  "error": "Bad Request",
  "statusCode": 400,
  "code": "BAD_REQUEST",
  "path": "/api/v1/drivers"
}
```

## Payload que envía el frontend (POST /api/proxy/drivers)
```json
{
  "fullName": "QA FLOW Driver 01",
  "phone": "8095550199",
  "cedula": "001-7777777-7",
  "taxiPlate": "AQA-7001",
  "licensePlate": "",
  "deviceId": "",
  "subscriptionPaid": true,
  "deviceFound": false
}
```
**Nótese que NO incluye `contractAccepted` ni `agreementVersion`.**

## Causa raíz (doble)
1. **El endpoint es `@Public()`** — `apps/api/src/modules/drivers/drivers.controller.ts:64`.
   Al ser público, el guard global de JWT no decodifica el Bearer del admin que el
   proxy sí reenvía, por lo que `req.user` queda `undefined` y
   `isAdmin = req?.user?.role === 'ADMIN'` es siempre `false`
   (drivers.controller.ts:85-86). Aunque el admin use su sesión, no es reconocido.
2. **El modal admin nunca manda el flag** — `apps/admin/components/DriverModal.tsx:17-26`
   construye `formData` sin `contractAccepted`. Como `isAdmin=false`, el gate de
   contrato (drivers.controller.ts:88-90) rechaza con 400.

## Reproducción / confirmación
- SIN `contractAccepted` → HTTP 400 (rechazado).
- CON `contractAccepted: true` (mismo payload, mismo JWT de admin) → HTTP 201,
  driver creado con `status: OPERATIVO`, `onboardingStatus: READY`.

## Impacto
- Imposible dar de alta un socio desde el panel administrativo.
- El único camino viable hoy es el alta por la app del conductor
  (self-service) que sí envía `contractAccepted: true`.

## Posibles arreglos (a decidir)
1. **Frontend:** que `DriverModal` envíe `contractAccepted: true` al tratarse de
   una acción administrativa (arreglo mínimo).
2. **API:** poblar `req.user` en rutas públicas cuando exista Bearer válido
   (ej. `optional` en el guard), o crear endpoint admin dedicado
   `POST /admin/drivers` protegido.
3. **API:** mover la determinación de `isAdmin` a un header/flag que el proxy
   admin garantice.

## Hallazgo secundario (UX)
El toggle "Pendiente Pago ↔ Pagado RD$6,000" solo refleja `subscriptionPaid`
pero no define `subscriptionEnd`; un socio marcado como pagado queda con
`subscriptionEnd: null` y en la lista se muestra "Vence: N/A".
