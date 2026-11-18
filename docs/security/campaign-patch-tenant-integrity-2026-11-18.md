# Campaign patch privilege and tenant listing containment — 2026-11-18

**Status:** proposed in an isolated branch; not yet deployed or run against staging.  
**Severity:** P1 confirmed code-path authorization weakness; potential higher impact if customer sessions reach affected route.

## Reproducible code evidence

In `apps/api/src/modules/campaign/campaign.controller.ts` on `main` before this branch:

1. `PATCH /campaigns/:id` checked `ADVERTISER` ownership of the **existing** campaign but forwarded the entire client-supplied `dto` to `CampaignService.updateCampaign`.
2. The service accepts `advertiser_id`, `active`, `budget`, `target_devices`, `target_all`, and other commercial fields; its update performs `Prisma.campaign.update`, may assign/sync devices and may run first-campaign referral logic. An advertiser could therefore potentially transfer ownership, change active status, budget or targeting without an admin commercial review.
3. `GET /campaigns` used `if (role === "ADVERTISER" && entityId)` and otherwise fell through to the admin-wide listing. The global advertiser status guard currently validates identity, reducing likelihood of this path, but it must fail closed regardless of middleware and session drift.
4. The advertiser QR Hub UI's `handleSaveQrHub` sends only `whatsapp`, `instagram`, `facebook`, `websiteUrl`, `pedidosYaUrl`, `uberEatsUrl`. This allows preserving the established editing workflow with a narrow allowlist.

No actual tenant transfer, unauthorized activation or data leak is established by this investigation.

## Minimal patch

- In `CampaignController.updateCampaign`, after verifying campaign ownership, deny advertiser input unless it is a nonempty object whose **every** property is one of the six QR/commerce links. Each value must be a string up to 2048 characters; empty string is allowed for clearing a link. Unknown or privileged fields, including mixed safe/unsafe payloads, are rejected **before** calling the service.
- ADMIN retains the existing full-edit path. This change does not rewrite the service, mutate campaign/payment history or touch offline player state.
- `GET /campaigns` denies missing/blank advertiser entity ID, and rejects unknown roles instead of falling back to a global listing.
- Add scoped Jest tests for unsafe fields, tenant swaps, mixed payloads, complete QR compatibility, admin compatibility, and list authorization.

## Release and observability gates

1. Run `pnpm --filter api exec jest --runInBand src/modules/campaign/campaign-tenant-patch-security.spec.ts` and existing `campaign-coverage-security.spec.ts` + `campaign-pricing.spec.ts`.
2. Run `pnpm --filter api run build` and `pnpm --filter advertiser run build`. Ensure TypeScript strict and live signup/onboarding constraints remain intact.
3. Staging with synthetic advertiser A/B: advertiser A cannot transfer campaign to B or set `active`, `budget`, `target_devices`; valid QR edit succeeds and updates expected links. Check `GET /campaigns` returns only own campaigns and missing entity fails.
4. Deployment order: API first; inspect 403 rate and application error budgets, allowlist rejected fields without logging payloads or tokens. No schema migration.
5. Existing workflows for changing commercial terms, activation, or assignments must be ADMIN-only until reviewed payment and approval workflow #299 is complete. Avoid compensating by weakening guard/using status flags.

**Known limitation:** this patch guards only controller `PATCH /campaigns/:id`. Audit separate campaign creation, media asset, public QR and referral paths independently before launch; do not claim full campaign authorization solved.

**No production mutations or credentials in this patch.** CI runner issue #147 may prevent test execution and must not be bypassed.
