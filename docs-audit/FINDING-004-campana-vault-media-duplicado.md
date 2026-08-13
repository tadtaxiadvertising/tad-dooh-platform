# FINDING-004 — Una sola subida de contenido genera DOS registros de media (duplicado en campaña)

**Severidad:** MEDIA-ALTA (integridad de datos + entrega duplicada a la flota + métricas infladas)
**Fecha:** 2026-08-10
**Flujo probado:** admin crea campaña → portal advertiser "Actualizar Contenido" (sube PNG) → admin aprueba "Actualización de Contenido" → detalle de campaña / playlist del portal

## Síntoma
Tras aprobar una única subida de `qa-test-01.png` para la campaña **QA FLOW CAMPAÑA 01**
(`a2464a2c-1259-48e0-9913-5b4177783ccb`), el detalle de campaña `/admin/campaigns/[id]`
muestra **dos activos** con el mismo nombre y el mismo archivo en Storage:

| Tarjeta | Tipo mostrado | Duración | ID (primeros 8) | Origen |
|---|---|---|---|---|
| 1 | `image` | 30s | `fd361c2c` | `mediaAssets` (v1, `MediaAsset`) |
| 2 | `VIDEO` (forzado) | 15s | `38825328` | `media` (v2, `Media`) |

Consecuencias en la misma página:
- Contador **"Activos Vault: 2"** (debería ser 1).
- **"Tiempo Loop: 45s"** = 30s + 15s (debería ser 30s).
- El portal del advertiser (pestaña Contenido) también lista el mismo archivo **dos veces**
  (una tarjeta "Vault", otra "Asset"), ambas "Sincronizado 100% de la flota".

## Causa raíz (dos escrituras independientes, una por cada sistema de media)
1. **Al subir el archivo** (`uploadMedia` en `packages/services/api.ts:308` → `POST /media/register-bypassed`,
   `apps/api/src/modules/media/media.service.ts:102`):
   crea un registro `Media` (v2) con `campaign_id` ya vinculado a la campaña
   (`campaign_id: data.campaignId !== 'general' ? data.campaignId : null`, línea 125).
2. **Al aprobar la solicitud** (`apps/api/src/modules/portal-requests/portal-requests.service.ts:252-281`):
   como el portal guarda la subida con `url` (sin `mediaId`, ver
   `apps/advertiser/pages/p/advertiser/[id].tsx:142-149`), cae en la rama `else if (mediaData?.url)`
   y crea ADEMÁS un `MediaAsset` (v1) con el mismo archivo (líneas 268-279).

El detalle de campaña concatena ambos (`mediaAssets + media`, `apps/admin/pages/admin/campaigns/[id].tsx:112-122`),
y el sync de dispositivos también suma los tres arrays
(`(c.mediaAssets?.length || 0) + (c.media?.length || 0) + (c.videos?.length || 0)`,
`apps/api/src/modules/campaign/campaign.service.ts:618`).

## Impacto
- El mismo creativo se sirve **dos veces por loop** en la flota (la mitad del loop duplicado).
- Métricas de impresiones / fill-rate infladas y sesgadas (cada "loop" cuenta doble).
- `Loop Time` del Vault y contadores de activos incorrectos para el anunciante y el admin.
- Si la subida fuera rechazada, el `Media` (v2) ya quedó vinculado a la campaña en el momento
  de subir (antes de aprobación), de modo que el rechazo NO desvincula el contenido.

## Posibles arreglos (a decidir)
1. **Unificar:** que el flujo CONTENT_UPDATE en aprobación **no cree `MediaAsset`** si ya existe
   un `Media` con el mismo `storageKey`/`hashMd5` vinculado (o viceversa); o
2. Guardar `mediaId` (del `Media` creado en `register-bypassed`) en el request y en aprobación
   solo actualizar `campaign_id`, eliminando la rama `url → MediaAsset.create`.
3. Si se mantienen ambos sistemas, deduplicar por `hashMd5`/`storageKey` al renderizar y al servir.
