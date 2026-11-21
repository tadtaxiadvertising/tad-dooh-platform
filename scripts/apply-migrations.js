#!/usr/bin/env node
"use strict";

// This historical standalone migration runner was unsafe: it executed SQL
// statements separately and could record a Prisma migration as finished even
// if some SQL statements failed. Preserve the history in Git, not an executable
// production pathway. Never use this script for schema recovery.
console.error(
  "[migration] REFUSED: legacy SQL migration runner is retired. " +
    "Use the reviewed manual migration workflow only after a verified backup " +
    "and isolated staging restore (docs/runbooks/manual-prisma-migration-guard-2026-11-18.md).",
);
process.exitCode = 1;
