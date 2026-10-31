---
type: decision
status: accepted
reviewed: 2026-10-31
area: frontend
tags: [tad/reference, tad/area/frontend]
---

# ADR — landing pública dual y destinos por perfil

Se conserva App Router en Advertiser: `app/page.tsx` → `LandingPage`,
con estilos y metadatos en `app/layout.tsx`; Pages Router conserva los
flujos privados. `apps/driver/pages/index.tsx` monta la landing específica
del conductor. Se evitan segundas raíces y redirects circulares.

| Entrada | Visitante anónimo | Sesión del rol correspondiente |
| --- | --- | --- |
| Advertiser `/` | Landing Anunciante / Conductor | Dashboard anunciante según middleware |
| Driver `/` | Landing pública del taxista | Dashboard del conductor según middleware |
| Rutas privadas | Login según middleware | Guards y ownership originales |

La landing pública **no enlaza ni proporciona una demo de Admin**. Esto
no altera sus rutas privadas ni RBAC. La API `simulate-budget` exige
autorización; el laboratorio público es educativo y no la consulta.

Destinos explícitos sin input arbitrario:
`/advertiser/login` (login),
dominio Driver `/` (información) y `/driver/login` (acceso existente).
Si `NEXT_PUBLIC_LANDING_SIGNUP_ENABLED=true` tras verificación de identidad,
se permite el onboarding `/advertiser/onboarding` y el registro canónico
Driver (confirmar `/register` frente a `/driver/onboarding`).
Los hosts de configuración son allowlist; localhost solo en desarrollo.
El código de referido, si existe, debe ser acotado y compatible con la ruta.

La raíz Driver conserva su PWA y shell privado previo. La landing Advertiser
no debe montar layout privado. Consentimiento, cookies y carga de analytics
mantienen sus controles originales. El portal de administración no se modifica.

Rollback: revertir los commits acotados del PR después de comparar los
cambios; no sobrescribir middleware ajeno ni tocar bases de datos.
