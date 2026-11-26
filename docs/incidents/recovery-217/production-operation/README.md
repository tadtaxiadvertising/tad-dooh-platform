# Target-bound atomic candidate — incident 217

The API still refuses startup because production lacks 23 tables and 39 columns,
the `SystemStatus` type and the GPS/PostGIS contract. This candidate composes the
reviewed A–J definitions into **one transaction**. A failure before commit rolls
back the complete sequence, including the extension installation. Continues #217.

`compile.py` imports the hash-locked managed compiler from PR #556. It replaces
only each clone guard, transaction boundary and clone-only comment. All remaining
family SQL stays exact. The operation identity binds the plan, compiler, client
library, catalog query and rendered family hashes. The CLI exclusively renders
`ROLLBACK`; the commit variant is exercised by the owned-clone harness. There is
no production apply command or change to API startup behavior in this patch.

## Destination and concurrency checks

`candidate-plan.json` binds the independently established project, database,
connection kind, read-only catalog fingerprint, existing encrypted backup receipt
and source main commit. It is a reviewable candidate, **not an apply-ready backup
or release receipt**. Refresh the encrypted capture and baseline before applying.

The outer transaction explicitly uses READ COMMITTED, takes an advisory lock and
locks existing public tables in stable order before checking the catalog hash.
This blocks application writes until commit/rollback. Existing family guards
still reject nonempty required tables, incompatible currencies and prior effects.
Acquisition uses a short lock timeout. Schedule a maintenance window: these locks
also block reads and the advisory lock only coordinates cooperating operators.

The trusted operator client must use `pinnedSettings(env, independentExpectedRef)`
**before constructing Prisma**, and use its returned URL for that same client.
It checks all three configured project references, rejects a socket/host override
or transaction pool, and requires certificate validation through
`sslmode=require&sslaccept=strict`. Set `TAD_DATABASE_CA_CERT` to an absolute path
to the trusted Supabase root certificate when the OS store lacks it. The module
never prints the secret URL. `readSnapshot(prisma, connection)` verifies READ ONLY
inside the transaction and returns metadata hashes, without application records.

After independent client pin and successful strict TLS connection, the same
session must set `tad.recovery_target`, `tad.recovery_operation` and
`tad.recovery_client_tls='strict'`. SQL checks these markers, database, caller,
managed-role capabilities and baseline. **Markers are client assertions; SQL
alone cannot independently authenticate a Supabase project or the client TLS hop.**

The plan distinguishes direct connections from session pooling. Direct mode also
requires backend TLS in `pg_stat_ssl`. For a session pooler that view describes
pooler → PostgreSQL, not operator → pooler; it is reported separately. The live
strict-TLS read-only probe passed through the session pooler with backend TLS
observed false. This does not certify upstream encryption. A direct endpoint
probe returned P1001. Neither observation changed provider settings. See the
[Supabase SSL guide](https://supabase.com/docs/guides/platform/ssl-enforcement)
and [Prisma native connector TLS options](https://www.prisma.io/docs/orm/v6/overview/databases/postgresql#configuring-an-ssl-connection).

## Verification and reversal

`verification.json` records the exact accepted inputs and execution evidence.
Six Python compiler contracts and eight Node preflight contracts run offline in
CI alongside the six prior managed-compiler contracts. The encrypted-restored
clone tests target/caller/operation/baseline rejection, a deliberate failure after
G, a complete A–J rollback, atomic commit, native model/GPS probes and actual API
startup. The original SQL and frozen accepted harnesses remain unchanged.

Before commit, an error or disconnection rolls the transaction back. A complete
explicit rollback is checked against the original metadata, role dump and strict
70-table inventory. After a successful commit, original projected values and
roles are checked, 23 new tables remain empty with forced RLS and no policies,
and all 52 native models can be read. API probes use a read-only database login;
they do not certify business writes, provider integrations or the full fleet.

**After commit and new application writes, do not reverse by dropping objects.**
Isolate the API, preserve a fresh encrypted capture, diagnose and choose a reviewed
roll-forward or coordinated full restore with Auth, Storage and service settings.
A Git revert does not undo database changes. This patch supplies no destructive
down migration or automatic restoration over production.

Production remains unchanged by this work. A fresh backup/restore receipt,
independent recovery-master custody, complete configuration/active-image recovery,
credential containment/rotation (#244) and promotion/provider checks (#313) remain
separate operational requirements. The incident stays open until production health
and required workflows are verified.
