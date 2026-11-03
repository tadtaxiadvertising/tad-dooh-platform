# PR Draft — Motion UX v2 / Responsive Fix

Branch: `feat/landing-v5-financial-motion-fix`
Base: `origin/main`

## Evidence (verified, not invented)
- `landing.module.css`: `.landing-scene` → `min-height:360px; height:auto`; label `font-size:10px`
- `driver-landing.module.css`: `.hero` → `min-height:520px`; `.screenCard` responsive (`48%/min160/max260`)
- `docs/ux-landing/motion-system-v2.md`: creado
- `docs/engineering-loop/STATE.md`: actualizado con checkpoint 2026-11-02

## Blocker documentado
- `.worktrees/main1` eliminado (commit `1d668d95`)
- Patches en disco confirmados con `grep`; git tracking aún aislado para esos archivos (ver `STATE.md` para evidencia de contenido)
- Playwright/smoke: sin servidor local (`ERR_CONNECTION_REFUSED`) — no se declara verificado sin captura

## Seguridad/finanzas
- Sin cambios en wallets/payroll/payouts
- `includeProduction` mantiene `false`
- No deploy, no merge

## Próximo paso
Iniciar servidor local y capturar screenshots/video Playwright 320/390/768/1440 antes/después.
