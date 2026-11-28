# #217 — 31 absent scalar columns

**IMPLEMENTADO, PENDIENTE DE VERIFICACIÓN.** `I-columns.sql` is a draft for an owned restored clone after the table, identity-reference and enum rehearsals. It is outside migrations, startup and workflows. Production has not received this DDL. Executed results belong in `verification.json`; a pending or failed rehearsal is not parity or API-health evidence.

| Table | Missing columns |
| --- | ---: |
| drivers | 19 |
| campaign_expirations | 5 |
| subscriptions | 4 |
| driver_locations | 2 |
| devices | 1 |
| Total | 31 |

The transaction requires the explicit restored-clone marker, Unix-socket access and the `restored` database. It locks all five tables, requires their expected owners, verifies that every table is empty, and rejects any already-present candidate column before altering the schema. A populated table aborts; no historical consent, insurance, onboarding, payment, simulation, referral, identity or expiration value is inferred.

The columns retain the existing Prisma contract: TEXT, JSONB, BOOLEAN, INTEGER, DOUBLE PRECISION and TIMESTAMP(3), with existing nullability and defaults. `advertiser_id`, `remaining_days`, `scheduled_for` and `valid_until` have no invented defaults. `referral_code` has no server default: Prisma generates its `uuid()` value for new client writes. The deprecated nullable `bank_account` JSONB column does not replace Wallet.bankInfo. Driver.id and auth_user_id remain separate.

Three nullable unique indexes preserve uniqueness for cedula, taxi_plate and referral_code while allowing multiple NULLs. Five other indexes cover the new referral/device references, the native status/onboarding pair, and expiration filters. Existing rows, columns, defaults, owners, ACL/RLS, policies, roles, constraints, indexes, triggers, functions and views stay outside the mutation allowlist. No new foreign keys or delete cascades are introduced; referential enforcement and tenant/application permissions remain release gates.

Verification compares the 31 actual catalog definitions—including timestamp precision, nullability and defaults—with the independent Prisma 5.22 `migrate diff --from-empty` output. Only the five target CREATE TABLE statements and enum definitions are executed in a separate empty oracle database: the full engine output also contains geography, which requires the pending PostGIS stage. The engine output is never used as a recovery migration.

Synthetic acceptance covers each populated-table guard, scope/owner/column collisions, future defaults, required values, nullable uniqueness and application-role denials. Restored acceptance includes strict original fingerprints, all preceding recovery stages, native read-only scalar queries for all 52 models and new Driver/Device/Subscription/DriverLocation writes rolled back in one local transaction. Queries emit counts/errors only. These probes use a privileged fresh local role; they do not certify production application access, Auth/RBAC, full API startup, all business workflows or load capacity.

The rollback for a rehearsal is disposal of its owned clone. A production transition still requires the independent recovery-key custody, essential configuration, #244/#313 controls, GPS/PostGIS, full application verification and an operational rollback plan. No migration replay, reset, ledger rewrite, production restoration or automatic deployment is authorized by this draft file.
