# Lint Execution Output (Redacted)

## Command
```bash
pnpm lint
```

## Exit Code: 124 (Timeout)

## Output Summary

```
> admin@0.1.0 lint
> eslint

ESLint: 9.39.4
ESLint couldn't find an eslint.config.(js|mjs|cjs) file.

> @tad/advertiser@0.1.0 lint
> next lint

? How would you like to configure ESLint? https://nextjs.org/docs/app/api-reference/config/eslint
❯  Strict (recommended)
   Base
   Cancel ⚠ If you set up ESLint yourself, we recommend adding the Next.js ESLint plugin.

> @tad/agents@1.0.0 lint
> eslint src/**/*.ts

ESLint: 8.57.1
ESLint couldn't find a configuration file.

> api@0.1.0 lint
> eslint "{src,apps,libs,test}/**/*.ts" --fix
# TIMEOUT AFTER 180s
```

## Analysis

- **4 workspaces** missing ESLint config (admin, advertiser, driver, agents-orchestrator)
- **1 workspace** (api) has config but times out due to overly broad pattern
- **ESLint version mismatch**: v8 (api, agents) vs v9 (admin, advertiser, driver)
- **CI Impact**: `.github/workflows/ci.yml` `format` job will fail