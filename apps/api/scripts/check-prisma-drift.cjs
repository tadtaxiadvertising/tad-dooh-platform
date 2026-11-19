/**
 * Read-only Prisma/Postgres schema drift diagnostic.
 * Run from apps/api using an inspection-only database role:
 *   DIRECT_URL=... node scripts/check-prisma-drift.cjs
 * Never print connection strings or application row data.
 */
"use strict";

const { Prisma, PrismaClient } = require("@prisma/client");
const { auditPrismaSchema } = require("./prisma-drift-core.cjs");

const models = Prisma.dmmf.datamodel.models;
const connectionUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

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
    const report = auditPrismaSchema({ models, tables, columns });
    console.log(JSON.stringify(report, null, 2));
    if (
      report.missingTableCount ||
      report.missingColumnCount ||
      report.idTypeMismatchCount ||
      report.scalarTypeMismatchCount ||
      report.relationTypeMismatchCount
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
