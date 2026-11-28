---
name: motion-system-v2
version: 2.0.0
description: Motion UX system for TAD landing V5 — tokens, choreography, accessibility, performance, and component rules.
---

# TAD Motion UX System v2.0

## Tokens
- Micro: 130-200ms; Panel: 220-380ms; Scene: 420-850ms
- Eases: standard ease, soft spring
- Reduced motion: disable all non-essential transforms; keep opacity

## Motion Map
Every interactive component requires:
`input/event → animation → semantic change → final state → rollback → reduced-motion alt`

## Coreography Rules
- Animate only `transform` / `opacity`
- Filter/blur only after profiling
- No permanent loops on 3+ visible scenes
- Dynamic import near viewport; clean up with `gsap.context()` / `useGSAP`
- `useReducedMotion()` required for every motion component

## Library Policy (as installed)
- `framer-motion` (installed): UI transitions, `AnimatePresence`, gestures
- `gsap` + `@gsap/react`: scene-level timelines only when adding real value; verify license
- Magic UI / Motion Primitives: audit source/license before integrating; max 1-2 components/page
- No extra motion libraries without license verification

## Mobile-First Gates
- 320/360/390/430px Android: touch targets ≥44px, no horizontal overflow, visible CTA
- Reduced motion works in CSS + JS
- Keyboard focus visible; touch equivalents for hover effects
- LCP target ≤2.5s, INP ≤200ms, CLS ≤0.1 (measured, not claimed)

## Security / Financial Boundary
- Do NOT modify wallet/payout/payroll logic in motion PRs
- Production ON by default only if backend contract confirms; landing uses `includeProduction=false`
- No secrets in screenshots/logs

## Driver hero — issue #249 (2026-11-11)

- Static approved PR #248 WebP, confirmed by the user in this implementation session; exact source pixels preserved (520 × 779, 16,258 bytes). Static Next image import emits cacheable media and responsive variants with priority loading.
- The image owns the taxi and circular screen callout; no overlay or duplicated animated screen. The frame uses the intrinsic ratio and contain. Hero headline scales to preserve readable copy and early access to the simulator CTA.
- Existing opportunity buttons keep their pressed state and polite accessible summary. Image presentation adds no animation, listener, observer, or dependency; reduced motion and server-rendered content remain static.
- Verification and performance evidence: [Driver hero #249](driver-hero-249-verification.md).

## Driver hero — imagen horizontal actualizada (2026-11-11)

El usuario sustituyó la referencia anterior por el PNG adjunto `ChatGPT Image Nov 11, 2026, 01_04_55 AM.png`. Se conserva el original de 1536 × 1024 en `public/tad-driver-taxi-headrest.png`; next/image mantiene la optimización de entrega. El marco usa 3:2 con contain y ocupa el ancho móvil disponible, hasta 600 px en escritorio/tablet. La imagen anterior se retira; no cambian el copy ni las interacciones. Evidencia vigente: [actualización de imagen](driver-hero-image-update.md).

## Taxi Driver sin fondo (2026-11-11)

El recorte transparente sustituye el fondo exterior de la fotografía. Se elimina el marco opaco y su resplandor, conservando ratio 3:2, caption y controles. No se añaden animaciones ni dependencias. El smoke verifica alfa real de la imagen optimizada. Ver [evidencia](driver-transparent-taxi.md).
