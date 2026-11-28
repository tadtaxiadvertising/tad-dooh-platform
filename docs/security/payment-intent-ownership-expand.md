# Payment intent ownership — EXPAND (issue #627)

Status: proposed, not deployed. The admin-only containment remains active.

## Evidence and decision

At main 27f1adb, PaymentIntent has no authoritative payer identity. Lead.type identifies a category, referrerId identifies the referrer, and lead contact fields are supplied as contact information. None proves ownership. Auth request IDs are not uniform across authentication paths; use verified role/entity identity and authoritative account records for later access checks.

A separate registry preserves existing payment scalar projections and avoids changes to historical rows. One intent has at most one owner. Exactly one real Driver or Advertiser FK is required; deletion and mutation of referenced keys are restricted. Actor identity is recorded. No automatic ownership assignment, application read/write path, or self-service enablement is included.

## Release gates

- Review migration ordering, actual physical FK column types, Supabase grants and the exact production target. Verify independent backup and restore, then run the existing recovery/migration protocol. Do not merge for automatic deployment before those gates are satisfied.
- CI tests apply the actual migration to a disposable PostgreSQL fixture; confirm real Prisma relations, unique owner, check constraints, FK restrictions and client role denial.
- Verify an admin assignment workflow against trusted evidence of payer identity, with an immutable assignment audit, same-role account isolation, role/type consistency and transaction-safe writes. The database XOR alone does not establish type consistency or authorization.
- Determine how legacy records will be reconciled. Leave all ambiguous records unbound and restricted.
- Only after successful migration and review, enable scoped status/evidence access for verified accounts. Creation remains administrative until authoritative pricing and lead ownership are separately established. Do not infer ownership from payer-supplied metadata or references.
- Do not drop financial history, reassign existing owners automatically or change refund/commission rules.

## 10x

Primary key by intent and owner indexes support bounded lookup. No new service, queue or distributed lock. Assignment is expected to be infrequent; index overhead is limited to registry entries. Monitor authorization denials and ambiguous assignments without logging sensitive payer data.
