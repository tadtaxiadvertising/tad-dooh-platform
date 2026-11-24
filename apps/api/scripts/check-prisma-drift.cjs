/**
 * Read-only Prisma/Postgres schema drift diagnostic.
 * Run from apps/api using an inspection-only database role:
 *   DIRECT_URL=... node scripts/check-prisma-drift.cjs
 * Never print connection strings or application row data.
 */
"use strict";

const { Prisma, PrismaClient } = require("@prisma/client");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { auditPrismaSchema } = require("./prisma-drift-core.cjs");
const { auditGpsSqlContract } = require("./prisma-gps-contract.cjs");
const { auditGeneratedClientIdTypes } = require("./prisma-client-id-consistency.cjs");

const models = Prisma.dmmf.datamodel.models;
const connectionUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

// A previous API log can report a different ID contract from the current
// repository revision. Verify the schema bundled in this image against its
// generated client before comparing either against the physical database.
// Log a digest, never the schema contents or connection credentials.
let schemaSource;
try {
  schemaSource = readFileSync(path.join(__dirname, "../prisma/schema.prisma"), "utf8");
} catch {
  console.error("Prisma source schema unavailable; refusing schema parity check.");
  process.exit(2);
}
const prismaSchemaSha256 = createHash("sha256").update(schemaSource).digest("hex");
const clientContract = auditGeneratedClientIdTypes({ schemaSource, models });
if (clientContract.mismatchCount > 0) {
  console.error(JSON.stringify({
    code: "PRISMA_GENERATED_CLIENT_ID_MISMATCH",
    prismaSchemaSha256,
    ...clientContract,
  }, null, 2));
  // Do not mislabel an inconsistent generated client as production DB drift.
  process.exit(2);
}

if (!connectionUrl) {
  console.error("Missing DIRECT_URL or DATABASE_URL for schema inspection.");
  process.exitCode = 2;
} else {
  const prisma = new PrismaClient({
    datasources: { db: { url: connectionUrl } },
  });

  async function check() {
    // PostgreSQL metadata only; never read financial or personal records.
    const tables = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `;
    const columns = await prisma.$queryRaw`
      SELECT table_name, column_name, udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
    `;
    // DMMF can omit Unsupported("geography(...)") fields required by the
    // GPS raw SQL path. Inspect PostGIS extension metadata separately.
    const extensions = await prisma.$queryRaw`
      SELECT extname FROM pg_extension WHERE extname = 'postgis'
    `;
    const report = {
      prismaSchemaSha256,
      ...auditPrismaSchema({ models, tables, columns }),
      ...auditGpsSqlContract({ models, tables, columns, extensions }),
    };
    console.log(JSON.stringify(report, null, 2));
    if (
      report.missingTableCount ||
      report.missingColumnCount ||
      report.idTypeMismatchCount ||
      report.scalarTypeMismatchCount ||
      report.relationTypeMismatchCount ||
      report.gpsSqlContractIssueCount
    ) {
      process.exitCode = 1;
    }
  }

  check()
    .catch((error) => {
      // Exception messages can contain connection data. Never print them.
      console.error(`Schema inspection failed (${error?.code || "QUERY_ERROR"}).`);
      process.exitCode = 2;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
