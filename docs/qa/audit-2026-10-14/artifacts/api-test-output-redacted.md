# API Unit Test Execution Output (Redacted)

## Command
```bash
cd apps/api && pnpm test
```

## Exit Code: 1 (Test Failures)

## Duration: 124.98s

## Summary
```
Test Suites: 4 failed, 5 passed, 9 total
Tests:       11 passed, 11 total
```

## Passing Suites (5)

| Suite | Tests | Duration |
|-------|-------|----------|
| `referral/referral.service.spec.ts` | 2 | 89.99s |
| `prisma/prisma.service.spec.ts` | 1 | <1s |
| `payments/payment-intent.controller.spec.ts` | 3 | 94.21s |
| `campaign/__tests__/campaign.service.spec.ts` | 3 | 98.51s |
| `system-settings/system-settings.service.spec.ts` | 2 | 11.10s |

## Failing Suites (4)

### 1. `verified-metrics/__tests__/verified-metrics.service.spec.ts`
**Error Type:** TypeScript compilation errors (18 errors)
```
Cannot find name 'describe', 'it', 'expect', 'jest', 'beforeEach'
Property 'qrCode' does not exist on type 'QrScanResult'
```

### 2. `qr-scan/__tests__/qr-scan.service.spec.ts`
**Error Type:** TypeScript compilation errors (16 errors)
```
Cannot find name 'describe', 'it', 'expect', 'jest', 'beforeEach'
Property 'qrCode' does not exist on type 'QrScanResult'
```

### 3. `conversation/__tests__/conversation.service.spec.ts`
**Error Type:** TypeScript compilation errors + API mismatches (22 errors)
```
Cannot find name 'describe', 'it', 'expect', 'jest', 'beforeEach'
Object literal may only specify known properties, 'contactId' does not exist in type 'CreateConversationInput'
Property 'threadId' does not exist on type '{ conversation: {...}; created: boolean; }'
```

### 4. `commission/__tests__/commission.service.spec.ts`
**Error Type:** TypeScript compilation errors + import error + API mismatches (19 errors)
```
Cannot find module '../types' or its corresponding type declarations
Cannot find name 'describe', 'it', 'expect', 'jest', 'beforeEach'
Property 'reference' does not exist on type '{ commission: {...}; created: boolean; }'
Argument of type 'string' is not assignable to parameter of type 'MonthlySettlementInput'
```

## Common Root Cause
- `@types/jest` not in `apps/api/package.json` devDependencies
- `apps/api/tsconfig.json` missing `"types": ["jest"]` in compilerOptions
- Test mocks drift from actual service interfaces
- `commission` test imports non-existent relative module `../types`

## ts-jest Warnings (Non-blocking)
```
ts-jest[config] (WARN) Using hybrid module kind (Node16/18/Next) is only supported in "isolatedModules: true"
ts-jest[ts-compiler] (WARN) Got a `.js` file to compile while `allowJs` option is not set to `true` (file: packages/impact-calculator/dist/index.js)
ts-jest[ts-compiler] (WARN) Got a `.js` file to compile while `allowJs` option is not set to `true` (file: packages/impact-calculator/dist/sources.js)
```

## Worker Process Warning
```
A worker process has failed to exit gracefully and has been force exited. This is likely caused by tests leaking due to improper teardown. Try running with --detectOpenHandles to find leaks. Active timers can also cause this, ensure that .unref() was called on them.
```