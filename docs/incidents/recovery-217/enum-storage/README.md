# #217 — native enum storage rehearsal

**IMPLEMENTADO, PENDIENTE DE VERIFICACIÓN.** `H-enums.sql` is a draft for an owned restored clone only. It is outside Prisma migrations, Docker startup and CI deployment. Production has not received this DDL. Other schema/runtime/recovery gates remain open.

The read-only preflight found a missing `public."SystemStatus"` type and TEXT bindings on `devices.status`, `drivers.status` and `financial_transactions.currency`. A native Prisma status filter failed with PostgreSQL `42704`. The existing `Currency` type has ordered labels DOP, USD, EUR. The independently pinned READ ONLY aggregate probe at 2026-11-25T20:57:26.972Z found all three affected tables empty.

## Storage contract

| API field | Native physical column | Retained legacy column |
| --- | --- | --- |
| Device.status / SystemStatus | devices.status_enum_217 | devices.status / TEXT |
| Driver.status / SystemStatus | drivers.status_enum_217 | drivers.status / TEXT |
| FinancialTransaction.currency / Currency | financial_transactions.currency_enum_217 | financial_transactions.currency / TEXT |

API field names, enum labels and Prisma defaults stay the same. The new status type has exactly OPERATIVO, PENDIENTE_PAGO, BLOQUEADO. Currency is not recreated or extended. All three native columns are required. Three indexes support their filters. The existing driver status/onboarding composite index is outside this card because onboarding storage is still missing.

The transaction locks the three tables, verifies the expected owners, TEXT types, nullability and old defaults, rejects unreviewed triggers/FKs and existing recovery objects, and requires devices/drivers to remain empty. It never maps historical ACTIVE values to a state. Currency backfill accepts exact, nonnull DOP/USD/EUR codes only: no trimming, case changes, currency conversion, amount changes or replacement defaults. Original TEXT values, identifiers and dependent views remain present.

## Writer compatibility and defaults

Two SECURITY INVOKER functions with fixed search paths synchronize the three legacy/native pairs. Their execution and usage of the new status type are restricted to the owner; no existing table ACL, RLS policy, role, Currency ACL or identity changes. Unexpected default privileges cause an atomic rollback.

Both physical representations have no catalog default. BEFORE INSERT triggers provide the effective defaults OPERATIVO for devices, PENDIENTE_PAGO for drivers and DOP for currency when both representations are omitted. This preserves the current Prisma defaults and aligns the old empty driver table's ACTIVE default with the API's pending default. Removing both catalog defaults lets the trigger distinguish an omitted representation from explicitly contradictory INSERT values such as DOP and USD. An INSERT supplying NULL on both representations also takes this effective default; a NULL UPDATE is rejected.

A legacy-only or native-only INSERT populates its counterpart; inconsistent explicit pairs fail. On UPDATE, the representation whose value changes supplies the counterpart; if both values change inconsistently, the write fails. PostgreSQL row triggers cannot distinguish an unchanged supplied value from an omitted column. This is synchronization behavior, not a rule permitting a financial currency change or approving a driver: business authorization remains in the existing API and must be verified separately.

## Verification and release limits

See `verification.json` for executed results, source hashes and exact limits. Private evidence includes synthetic populated currency fixtures with unchanged amount/net/tax/identity projections, atomic rejection cases, native Prisma enum predicates/deserialization/default writes, role denials, and an encrypted G0 restore with all preceding table/reference expansions. Original projected fingerprints and all catalog changes outside the explicit additions/default moves are compared. Native queries use fresh local credentials on the internal Docker network; they do not certify production application privileges, authentication or full API startup.

No old migrations are replayed and no ledger is rewritten. This is an expand phase; legacy columns and synchronization remain required. A rollback needs a compatible image/roll-forward plan and a new rehearsal. Running an old image against this partially recovered database is not certified. The production preflight must continue to reject the remaining missing columns and GPS/PostGIS contract until those are repaired and independently tested. Independent key custody, essential runtime configuration, #244/#313 controls and full application verification remain release gates.
