#!/usr/bin/env node
"use strict";

// RETIRED — historical one-off script (DROP TABLE ... CASCADE and recreation).
// These operations bypass the verified schema/migration review gate.
// Preserve the original source in Git history for P0 incident forensics.
// Any future fix must be a reviewed, forward-only Prisma migration rehearsed
// against an isolated restorable backup of the canonical Supabase project.
console.error(
  "[migration] REFUSED: legacy database mutation command retired (apps/api/migrate-playlist-items.js). " +
    "Do not run ad-hoc SQL against TAD; follow incident #217 recovery gates.",
);
process.exitCode = 1;
