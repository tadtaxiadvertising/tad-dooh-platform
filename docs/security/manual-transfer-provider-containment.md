# Manual transfer provider containment (#623)

The manual adapter creates local transfer instructions; it has no authenticated bank integration. Earlier placeholder methods returned fabricated PENDING/verified/PAID/refund-success/empty reconciliation results. Those methods now fail closed. The canonical payment evidence workflow is unchanged; no actual bank verification or refund is implemented by this change.

The factory did not call initialize, so the account placeholder could be emitted even if configuration existed. Read TAD_BANK_ACCOUNT at use time and refuse missing, nondigit or all-zero account values. TAD_BANK_ACCOUNT_NAME remains optional with the existing corporate name default. This candidate assumes a digits-only account identifier and DOP because the configured account is denominated in DOP; verify format, bank, currency and beneficiary with the operator before rollout. Readiness indicates local configuration only, not bank connectivity or verified account ownership. Do not disclose account configuration in diagnostics. Existing persisted instructions are not repaired or reissued by this change.

Repository search found no active direct consumers of the five unsupported methods in the canonical flow; external consumers and production configuration are not verified. Do not lift release hold #631. No migration, production writes, bank requests or deployment.
