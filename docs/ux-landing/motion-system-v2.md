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
