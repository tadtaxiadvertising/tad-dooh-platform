---
type: decision
status: accepted
reviewed: 2026-10-31
area: frontend
tags: [tad/reference, tad/area/frontend]
---

# ADR: entrada pública y destinos por perfil

Se conserva App Router en Advertiser: `app/page.tsx` → `LandingPage`, con estilos y metadatos en `app/layout.tsx`. Pages Router conserva las páginas privadas. No existe un segundo índice ni se monta el shell privado en la landing.

| Entrada | Visitante | Sesión del rol correspondiente |
| --- | --- | --- |
| Advertiser `/` | Landing multirol | Redirección existente a `/advertiser/dashboard` |
| Driver `/` | Landing del taxista | Redirección existente a `/driver/dashboard` |
| Rutas privadas | Login según middleware existente | Guardas existentes |

La demo no utiliza la API `simulate-budget`, que requiere autorización. Los enlaces nativos llevan a `/advertiser/login`, al dominio Driver `/` o `/driver/login` y al dominio Admin `/admin/login`. Las configuraciones públicas solo aceptan los hosts canónicos; localhost se permite únicamente en desarrollo. No se aceptan destinos desde parámetros del visitante.

`NEXT_PUBLIC_LANDING_SIGNUP_ENABLED` solo habilita enlaces al onboarding existente si vale exactamente `true`. Permanece desactivada por defecto hasta validar identidad, aprobación y sesión. La landing no activa cuentas, registra éxito de onboarding ni recoge datos personales.

La raíz Driver monta el componente público y consentimiento. Las demás rutas conservan el shell anterior con SSR. La carga de un módulo en servidor no equivale a montar sus proveedores en el cliente. Los enlaces nativos evitan precarga privada por hover. Actualizaciones de service workers ya instalados requieren una validación de liberación independiente.

Reversión: retirar la integración V3 y restaurar las entradas de la landing anterior desde un commit conocido. No revertir indiscriminadamente middleware o shells sobre trabajo ajeno; comprobar el diff de cada archivo.
