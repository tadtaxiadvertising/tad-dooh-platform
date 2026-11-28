#!/usr/bin/env node
"use strict";

// RETIRED — historical clean-db helper performed unguarded deleteMany() calls
// against campaigns, drivers, wallets, financial transactions, playback data,
// and related business records. It did NOT verify DATABASE_URL or NODE_ENV.
// Preserve the original code in Git history for incident #217 forensics.
// Never turn this into a production repair or data reset shortcut.
// Local synthetic data seeding uses its separately gated local-only tools.
console.error(
  "[migration] REFUSED: unguarded clean-db data deletion retired (apps/api/scripts/clean-db.ts). " +
    "No database connection attempted. Follow incident #217 restore-first recovery gates.",
);
process.exitCode = 1;
