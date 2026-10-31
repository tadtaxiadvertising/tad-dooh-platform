---
type: evidence
status: implemented-pending-verification
reviewed: 2026-10-31
area: frontend
tags: [tad/reference, tad/area/frontend]
---

# QA y handoff — Landing V3.1 dual

PR: https://github.com/tadtaxiadvertising/tad-dooh-platform/pull/168
Rama: `codex/landing-experience-v3`.

## Alcance revisado

La landing pública de Advertiser presenta únicamente **Anunciante
y Conductor**, conserva recorrido de campaña y demos educativas.
La página específica para taxistas en `apps/driver` permanece.
Se retiran demos, fixtures, marcadores, estilos, copys, selectores
y objetivos comerciales ajenos a estos dos públicos. El portal
Admin y la base de datos siguen fuera de alcance.

La revisión modifica componentes de landing, modelo, contenido,
metadata SEO, smoke y unit tests, skill y documentos. No modifica
API, Auth, pagos, reglas de libro mayor, Player, service workers
ni RLS. Mantiene el gate `NEXT_PUBLIC_LANDING_SIGNUP_ENABLED`
desactivado salvo validación externa de alta e identidad.

## Historial de la verificación V3 anterior (NO acredita V3.1)

La versión previa al cambio de alcance reportó:
- 38/38 pruebas de lógica/rutas/cookies;
- 14/14 escenarios de navegador en desarrollo, incluidos anchos
  320, 390, 768 y 1440, no-JS, movimiento reducido y red lenta;
- builds de Advertiser y Driver aprobados en árbol aislado;
- JS inicial Advertiser 119,048 bytes gzip, incremento de 6,171
  bytes respecto al baseline anterior;
- LCP de laboratorio en desarrollo 2,184/2,380/3,252 ms,
  CLS 0; sin INP ni Core Web Vitals de producción;
- tipado global previo no aprobado por dependencia Playwright
  ausente en Advertiser y conflictos `Buffer/BodyInit` en proxy
  Driver. Next está configurado para ignorar errores de TS/lint
  durante build; por tanto, build no sustituye esos gates;
- CI remota en `537921fa` no ejecutó los pasos de workflow
  según el informe original de facturación/cupo.

Las capturas y logs de esa ejecución anterior se guardaron
fuera de Git y no representan la revisión dual actual.
El nuevo código requiere validación independiente.

## Gates que deben ejecutarse sobre el SHA actual

| Gate | Comando o criterio | Estado de esta revisión |
| --- | --- | --- |
| Lógica y rutas | `node --test scripts/landing.test.cjs scripts/driver-landing.test.cjs` | Pendiente de ejecutar |
| Cookies | `node --test scripts/cookie-management.test.cjs` | Pendiente |
| TypeScript landing | `pnpm exec tsc --noEmit --project apps/advertiser/tsconfig.landing.json` | Pendiente |
| Lint focalizado | Ejecutar ESLint según `apps/advertiser/eslint.config.mjs` | Pendiente |
| Build Advertiser | `pnpm --filter @tad/advertiser build` | Pendiente |
| Build Driver | `pnpm --filter @tad/driver build` si cambia fuente Driver | Pendiente / no exigible si no cambia Driver |
| Browser | `LANDING_BASE_URL=http://127.0.0.1:3003 node scripts/landing-v3-smoke.cjs` (sin servicios reales) | Pendiente |
| Responsive | 320, 390, 768, 1440, ambos perfiles | Pendiente |
| A11y | Teclado, reduced motion, no-JS, foco y contraste | Pendiente |
| Seguridad | Consent, cero datos privados, RBAC y enlaces | Pendiente de staging |
| Performance | Bundle gzip comparado, métricas navegador | Pendiente |

No iniciar DB/API de producción para simular el flujo público.
El navegador smoke bloquea solicitudes de escritura, sockets de
operación y service workers; `LANDING_ALLOW_DEV_HMR=true` solo
se permite en desarrollo loopback.

## Revisión manual y stop conditions

- En `/` exactamente dos opciones: «Anunciante» y «Conductor»;
  sin tercer CTA ni enlace comercial administrativo.
- Dos tarjetas indexables sin JS; una FAQ contextual por rol.
- Ninguna llamada a API de campaña anónima; ningún dato
  financiero real o promesa de retorno. R6 con máximo 15 slots.
- Controles funcionales en móvil, teclado y reduced-motion.
- Enlaces a Driver `/`, Driver `/register` (solo con gate), y login Advertiser
  preservados; la landing Driver permite navegar de vuelta a Anunciante.
- Registro real solo si identidad/aprobación están comprobadas
  en staging y el gate está habilitado.
- Si CI no arranca por billing/cupo, informar como **infraestructura
  sin tests ejecutados**, no como fallo de TypeScript ni como PASS.

**Estado:** cambios de código y documentación preparados en
la rama; pendientes compilación y pruebas sobre el HEAD actualizado.
No merge ni deploy realizados por esta revisión.

## Rollback

Revertir únicamente los commits acotados de la revisión del
PR, verificando dependencias. No usar `git checkout` masivo
sobre apps, no alterar Admin, player, Driver offline, wallets,
Prisma o datos productivos.
