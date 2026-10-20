# Test Matrix — TAD Platform

| Test Suite | Type | Target Workspace | Status | Total Tests | Passed | Failed |
|---|---|---|---|---|---|---|
| `verified-metrics.service.spec.ts` | Unit | `apps/api` | PASS | 5 | 5 | 0 |
| `qr-scan.service.spec.ts` | Unit | `apps/api` | PASS | 3 | 3 | 0 |
| `conversation.service.spec.ts` | Unit | `apps/api` | PASS | 3 | 3 | 0 |
| `commission.service.spec.ts` | Unit | `apps/api` | PASS | 4 | 4 | 0 |
| `referral.service.spec.ts` | Unit | `apps/api` | PASS | 4 | 4 | 0 |
| `campaign.service.spec.ts` | Unit | `apps/api` | PASS | 3 | 3 | 0 |
| `system-settings.service.spec.ts` | Unit | `apps/api` | PASS | 2 | 2 | 0 |
| `prisma.service.spec.ts` | Unit | `apps/api` | PASS | 1 | 1 | 0 |
| `payment-intent.controller.spec.ts` | Unit | `apps/api` | PASS | 1 | 1 | 0 |
| Monorepo ESLint | Static | All Workspaces | PASS | All files | Clean | 0 |
| Monorepo TypeScript | Static | All Workspaces | PASS | All packages | Clean | 0 |
| Monorepo Build (`pnpm build`) | Build | Monorepo | PASS | 5 Apps, 6 Pkgs | Clean | 0 |
| Prisma Schema Validation | Schema | `apps/api` | PASS | 1 Schema | Valid | 0 |
| Docker Image Build | Container | Monorepo | BLOCKED | 4 Dockerfiles | Sandbox FS | 0 |
