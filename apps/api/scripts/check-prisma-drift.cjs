/**
 * Read-only Prisma/Postgres drift diagnostic.
 * Run from apps/api with a database role able to inspect the public schema:
 *   DIRECT_URL=... node scripts/check-prisma-drift.cjs
 * Never print connection strings or application row data.
 */
const { Prisma, PrismaClient } = require("@prisma/client");

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
    const actualTables = new Set(tables.map((row) => row.table_name));
    const columnIndex = new Map(
      columns.map((row) => [
        `${row.table_name}.${row.column_name}`,
        row.udt_name,
      ]),
    );

    const missingTables = [];
    const missingColumns = [];
    const idTypeMismatches = [];

    for (const model of models) {
      const tableName = model.dbName || model.name;
      if (!actualTables.has(tableName)) {
        missingTables.push(tableName);
        continue;
      }
      for (const field of model.fields) {
        if (field.kind !== "scalar" && field.kind !== "enum") continue;
        const columnName = field.dbName || field.name;
        const actual = columnIndex.get(`${tableName}.${columnName}`);
        if (!actual) {
          missingColumns.push(`${tableName}.${columnName}`);
          continue;
        }
        if (field.isId && field.type === "String") {
          const declaredNativeType = field.nativeType?.[0];
          const expected = declaredNativeType === "Uuid" ? "uuid" : "text";
          if (actual !== expected) {
            idTypeMismatches.push({
              table: tableName,
              field: columnName,
              expected,
              actual,
            });
          }
        }
      }
    }

    const summary = {
      expectedModels: models.length,
      modelsPresent: models.length - missingTables.length,
      missingTableCount: missingTables.length,
      missingTables,
      missingColumnCount: missingColumns.length,
      missingColumns: missingColumns.slice(0, 50),
      idTypeMismatchCount: idTypeMismatches.length,
      idTypeMismatches,
    };
    console.log(JSON.stringify(summary, null, 2));
    if (missingTables.length || missingColumns.length || idTypeMismatches.length) {
      process.exitCode = 1;
    }
  }

  check()
    .catch((error) => {
      // Errors can contain connection details; report only their code.
      console.error(`Schema inspection failed (${error?.code || "QUERY_ERROR"}).`);
      process.exitCode = 2;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
