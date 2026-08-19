# FINDING-005 — Botón "Editar Perfil QR" del portal advertiser no hace nada

**Severidad:** BAJA-MEDIA (funcionalidad de QR hub prometida en UI pero no implementada)
**Fecha:** 2026-08-10
**Ruta probada:** portal advertiser `/p/advertiser/[id]` → pestaña "Métricas" → "Editar Perfil QR"
**Estado:** ✅ RESUELTO (2026-08-18, commit `397f482e`)

## Síntoma
El botón **"Editar Perfil QR"** (tarjeta "Brand Profile") se renderiza como botón
interactivo (hover, cursor pointer) pero **no ejecuta ninguna acción**: no abre modal,
no navega, no lanza toast, y no hay errores en consola.

## Causa raíz
`apps/advertiser/pages/p/advertiser/[id].tsx:368-371`:
```tsx
<button className="w-full flex items-center justify-center gap-2 py-4 ...">
  <Settings className="w-3 h-3" /> Editar Perfil QR
</button>
```
El `button` **no tiene `onClick`** (ni handler asociado). Es un botón muerto.

## Contexto
- Los datos QR sí existen y se muestran en el admin: el QR hub de campaña
  (WhatsApp, Instagram, Web, PedidosYa, Uber Eats) se puede definir al crear la
  campaña y se muestra en `/admin/campaigns/[id]` ("Protocolo de Conversión Activo").
- Por contraste, los otros dos botones del panel SÍ funcionan:
  - "Descargar Reporte PDF" → `downloadWeeklyCampaignPdf(...)` (línea 319) ✓
  - "Soporte & Expansión" → `setActiveTab('requests')` (línea 325) ✓
- El QR hub del pasajero (lo que escanea el usuario) no se probó en esta sesión.

## Posibles arreglos (a decidir)
1. Implementar el handler: abrir el editor de perfil QR (preferiblemente precargado
   con los valores actuales de la campaña) que actualice los enlaces del QR hub.
2. Si el editor no está en alcance, eliminar el botón o deshabilitarlo con título
   "Próximamente" para no generar expectativa.

---

## ✅ Resolución (2026-08-18)

**Commit:** `397f482e` — feat: FINDING-002 y FINDING-005

### Cambios implementados

1. **Editor QR Hub en Campañas** (`apps/advertiser/pages/advertiser/campaigns/index.tsx`):
   - Nuevo botón `QrCode` en cada tarjeta de campaña → abre modal de edición.
   - 6 campos editables: WhatsApp, Instagram, Facebook, Sitio Web, PedidosYa, Uber Eats.
   - Guarda via `PATCH /campaigns/:id` (endpoint existente con RLS de anunciante).
   - Actualiza estado local sin recargar la página.

### Verificación
- tsc EXIT 0 en admin, advertiser, driver.
- Push a `origin/main`, auto-deploy triggered.
