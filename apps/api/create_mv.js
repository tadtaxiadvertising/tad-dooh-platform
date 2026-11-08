/**
 * Legacy one-off materialized view creator: deliberately disabled.
 * This script previously split prisma/views.sql on semicolons, ignored
 * commented statement prefixes, and could execute DROP during an incident.
 *
 * Use a reviewed Prisma migration + the app's read-only readiness probe.
 */
process.stderr.write(
  "create_mv.js is retired. Apply a reviewed Prisma migration on a staging " +
    "restore before production; never DROP the master-sync view at startup.\n",
);
process.exitCode = 1;
