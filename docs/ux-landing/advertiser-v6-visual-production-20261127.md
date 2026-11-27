# Advertiser V6 — Visual production checkpoint

Base: `523d49ea` (merged #582). Scope: public advertiser landing, static story and tests.

## Evidence and decision

The desktop story already has three animated CSS scenes controlled by Framer Motion. The mobile, reduced-motion and no-JS story had three text-only decorative blocks. Replace those with original inline vector scenes of the taxi, passenger-facing tablet mounted behind the front passenger headrest, and illustrative activity panel. Preserve the chapter text and personalisation as actual DOM. No new requests, assets requiring middleware exceptions, dependencies, metrics, pricing or device integration.

## Production brief for the next asset pass

| Shot | Art direction | Required check |
| --- | --- | --- |
| City and taxi | Dominican urban context, cinematic light, neutral unbranded vehicle | No unsupported geographic coverage claim |
| Passenger and mounted screen | Rear-seat view, tablet behind front passenger headrest facing rear passengers | Review physical mounting against approved product reference |
| QR interaction | Passenger voluntarily scans an example promotion | Real QR only with controlled demo destination; no tracking in campaign metrics |
| Reporting | Clearly illustrative dashboard, playback and validation distinct | No fictitious customer, revenue or audience claims |

Proposed export targets (not measured): responsive hero still <= 200 KiB, supporting still <= 150 KiB each, optional 12–18 second video <= 2 MiB initially, poster fallback and no automatic audio. Encode offline; serve local optimized resources, lazy-load below the fold, preserve reduced-motion and no-JS. Validate actual transfer sizes, decoding, contrast, LCP/CLS and mobile CPU before adoption. No external runtime video rendering.

## Tool readiness

- Framer Motion: declared in advertiser package, existing interactive narrative.
- Repository skill: `.agents/skills/tad-autonomous-engineering-motion-ux/SKILL.md` reviewed.
- Remotion and Hyperframes: not verified as installed/runnable in this advertiser checkout. Historical docs explicitly record no execution. Do not claim a render or install. Local shell cannot resolve external package registry; GitHub contents connector writes UTF-8 source, not binary media.
- The current PR produces vector art, not a photo or rendered video. Review actual CI screenshots before merging.

## Acceptance and rollback

Existing focused CI must pass on exact head, including static chapter visibility and 2:1 intrinsic aspect ratio at no-JS breakpoints. Check mobile, reduced motion, keyboard, long brand strings, and screenshots against current baseline. No production deploy in this PR. Revert the PR to remove all changes; no data migrations.
