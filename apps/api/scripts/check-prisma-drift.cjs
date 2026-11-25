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
const { stringIdTypes } = require("./prisma-generated-types.cjs");
const { readPrismaSchemaCatalog } = require("./prisma-schema-catalog.cjs");
const {
  inspectSchemaStringIds,
} = require("./prisma-client-id-consistency.cjs");

const models = Prisma.dmmf.datamodel.models;
const connectionUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

// A previous API log can report a different ID contract from the current
// repository revision. Verify the schema bundled in this image against its
// generated client before comparing either against the physical database.
// Log a digest, never the schema contents or connection credentials.
let schemaSource;
try {
  schemaSource = readFileSync(
    path.join(__dirname, "../prisma/schema.prisma"),
    "utf8",
  );
} catch {
  console.error(
    "Prisma source schema unavailable; refusing schema parity check.",
  );
  process.exit(2);
}
const prismaSchemaSha256 = createHash("sha256")
  .update(schemaSource)
  .digest("hex");
// Client DMMF may omit nativeType. Check model/ID identity here, and derive
// native ID mappings from the included Prisma schema, not missing DMMF fields.
const sourceContract = inspectSchemaStringIds({ schemaSource, models });
if (sourceContract.issueCount > 0) {
  console.error(
    JSON.stringify(
      {
        code: "PRISMA_SOURCE_CLIENT_ID_CONTRACT_INVALID",
        prismaSchemaSha256,
        issueCount: sourceContract.issueCount,
        issues: sourceContract.issues,
      },
      null,
      2,
    ),
  );
  process.exit(2);
}

let generatedSchema;
try {
  const generatedPath = require.resolve(".prisma/client/schema.prisma", {
    paths: [path.dirname(require.resolve("@prisma/client"))],
  });
  generatedSchema = readFileSync(generatedPath, "utf8");
  stringIdTypes(models, generatedSchema);
} catch {
  console.error(
    "Generated Prisma schema incompatible; refusing schema parity check.",
  );
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
    // One verified read-only transaction; never financial or personal records.
    const { tables, columns, extensions } = await readPrismaSchemaCatalog(prisma);
    const report = {
      prismaSchemaSha256,
      ...auditPrismaSchema({
        models,
        tables,
        columns,
        generatedSchema,
        idTypes: sourceContract.idTypes,
        nativeUuidFields: sourceContract.nativeUuidFields,
      }),
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
      console.error(
        `Schema inspection failed (${error?.code || "QUERY_ERROR"}).`,
      );
      process.exitCode = 2;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
