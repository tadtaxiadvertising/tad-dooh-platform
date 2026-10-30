# Phase 02 — Driver registration conversion

The public Driver registration route now uses a three-step mobile-first wizard: identity, vehicle, and credentials. Values remain in component memory while navigating; no localStorage, IndexedDB, service-worker, telemetry, wallet, or financial behavior was added.

Acceptance coverage includes public-route protection, value preservation, password mismatch rejection, existing payload shape, and recoverable backend errors. Success communicates pending administrative approval and does not imply guaranteed income or automatic activation.

Files: `apps/driver/pages/register.tsx`, `apps/driver/components/register/DriverRegistrationWizard.tsx`, `apps/driver/tests/e2e/registration.spec.ts`, and `packages/ui/components/AuthProvider.tsx`.

The V12 earnings estimator remains a separate bounded work item so this conversion does not introduce financial claims into registration submission.
