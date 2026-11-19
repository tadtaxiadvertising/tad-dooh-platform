# Commission amount safety — 2026-11-18

**Incident:** [#331](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/331).  
**Status:** branch-only candidate, not merged or deployed; no live financial entries, database changes, credentials or device state touched.

## Evidence, root cause and scope

The administrative commission creation route only checked truthiness of the `amount` field. Negative, too-precise and non-finite values can bypass it; internal service calls bypass the HTTP route altogether. `CommissionService.createIdempotent` created a `PENDING` commission and matching financial transaction with that unvalidated amount, and approval could later mutate `wallet.availableBalance` by the same amount.

A negative amount is inconsistent with a **credit** commission. Fractional sub-cent values cannot be represented in the intended DOP settlement currency without rounding; silent rounding in ledger and wallet would create reconciliation errors.

## Smallest safe change

At the **service boundary**, before the first DB operation:
- Require `typeof amount === "number"`, `Number.isFinite(amount)` and `amount > 0`.
- Require `Math.round(amount * 100)` to be a safe integer and reconstruct the **exact** input with `Math.round(amount * 100) / 100 === amount`.
- Reject any negative, zero, NaN, Infinity, unsafe huge value, string, null or sub-cent value with `BadRequestException` (HTTP 400). Do **not** coerce, normalize, silently clamp or generate a secret.
- Preserve legitimate RD$ cents including 0.01, 0.29, 1.25, 500, and 1,000,000.23. No source rate, commission schema or ledger status changed.

The check also covers trusted internal callers. A malformed client request cannot reach `this.prisma.$transaction`.

## Verification (must precede merge)

```bash
pnpm --filter api exec jest --runInBand src/modules/commission/commission-amount-validation.spec.ts
pnpm --filter api run build
```

A dedicated Jest suite asserts invalid inputs never call `$transaction` and valid inputs create a matching PENDING commission and OPEX_COMMISSION ledger entry. Isolated V8 evaluation of the **exact source guard** using synthetic values passed 20/20 cases. This does not replace a real Jest run, TypeScript build or PostgreSQL staging.

Staging tests should exercise actual controller JSON validation and commission approval/revocation under concurrency; confirm wallet and ledger agree, including repeated requests.

## Unresolved financial safety work

- Existing idempotency reference lookup can return another commission for a mismatched driver/amount/source. That is a separate high-priority reconciliation risk, as is `P2002` handling when two creates race.
- TAD financial amounts still use `Float` rather than a derived immutable cents/Decimal ledger. A broader migration must be staged and non-destructive (#299).
- Bank payout remains intentionally disabled. This change must not activate it.
- Release blockers: GitHub Actions zero-step failure (#147), Supabase drift/unknown authoritative runtime project (#217), exposed historical credential rotation (#244), and intentionally frozen Railway auto-deploy (#313).

No production changes, schema mutations, settlement payments, or player offline-state modifications were made.
