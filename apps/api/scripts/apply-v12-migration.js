#!/usr/bin/env node
"use strict";

// Historical v12 one-off migration runner is deliberately retired.
// It bypassed reviewed migration history and could execute SQL directly
// against DATABASE_URL/DIRECT_URL without an explicit safety gate.
// Its historical code remains available in Git history for forensics.
console.error(
  "[migration] REFUSED: the historical v12 direct SQL migration runner is disabled. " +
    "Verify the canonical Supabase target and an isolated backup restore, then " +
    "use the reviewed manual Prisma migration workflow documented in " +
    "docs/runbooks/manual-prisma-migration-guard-2026-11-18.md.",
);
process.exitCode = 1;
