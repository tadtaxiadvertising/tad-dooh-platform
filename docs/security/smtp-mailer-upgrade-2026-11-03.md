# SMTP dependency hardening — 2026-11-03

## Evidence
The current `main` security audit reports three high findings against `apps/api>nodemailer@8.0.11`: message raw option bypass of attachment access protections and two address parser CPU-exhaustion paths. The minimum patched release across these advisories is Nodemailer 10.0.6. The current maintenance release 10.3.1 includes further mail parsing and transport hardening.

## Scope
- API Nodemailer 8.x → 10.3.1, whose documented 10.x requirement is Node.js 20+ (TAD API Docker uses Node 22). Nodemailer 10 bundles TypeScript types, so remove the obsolete external @types/nodemailer direct dependency.
- Explicitly set `disableFileAccess: true` and `disableUrlAccess: true` on the Brevo SMTP transporter. Existing mail methods attach only Buffer-backed approved PDFs; they should remain functional.
- The email templates, sender address, SMTP retry intervals, financial amounts and business contracts are not changed.
- Use an offline stream-only synthetic transport to test Buffer attachments and blocked path/href attachments. No production SMTP endpoint, credentials or recipients are accessed.

## Upgrade risks
Nodemailer 10 is a **major version**; CJS/ESM and type compatibility, SMTP pooling, TLS negotiation, error reporting, and PDF attachments require real CI validation plus staging SMTP smoke before production deployment. Do not treat isolated stream transport tests as proof that Brevo delivery succeeded.

## Release gates
- Generate the lockfile with pnpm, then delete the write-enabled temporary helper.
- Frozen install, TypeScript API, Jest, security tests, four Docker builds and high audit checks.
- Secure human-approved staging delivery test with test-only credentials; **no production test email**.
- Remediation remains in draft until rollout safety and rollback are reviewed. Issue #195.

## Lock generation checkpoint
The restricted generator completed successfully and committed an authoritative pnpm lock on `e84b5629`. Verified that the API importer specifies `nodemailer ^10.3.1` and resolves 10.3.1, that no 8.0.11 package remains, and that the obsolete direct type package is gone. The write-enabled helper was deleted in `65b59249` before starting final acceptance. The permanent workflow is read-only.

**Pending:** final CI including TypeScript, offline SMTP composition tests and unit tests; human-controlled Brevo staging delivery. No deployment is authorized by these lock checks.
