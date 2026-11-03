# TAD Simulator — Mandatory Credential (P0 triage)

The load simulator formerly included a source-controlled fallback for a tablet
authentication key. Its value is intentionally **not reproduced**.

## Response
- Treat it as potentially compromised until safely compared with staging/production credentials.
- Pause unsupervised simulator jobs; rotate/revoke any matching active secret through a private channel.
- Audit and reconcile telemetry, impressions and downstream financial events, using redacted logs only.
- Review Git history and artifacts: deleting a literal does **not** revoke historic copies.
- The CLI now requires `TAD_TABLET_KEY`; missing/blank input fails closed before scheduling traffic.
- Use only short-lived test credentials in a controlled environment; never run this CLI against production as a smoke.

## Verification
- `node --test scripts/simulator-key-security.test.cjs` exercises missing/whitespace/fixture cases.
- `pnpm install --frozen-lockfile` in focused CI confirms reproducibility.
- No migrations, payment operations, or production configuration changes were performed.
- Incident follow-up: issue #191.