"use strict";

// Startup inspection must remain read-only even when a connection URL/pooler
// overrides startup options. Verify the mode on the same transaction that reads
// metadata; do not infer enforcement from the client configuration.
async function readPrismaSchemaCatalog(prisma) {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      await tx.$executeRaw`SET LOCAL statement_timeout = '10s'`;
      const mode = await tx.$queryRaw`
        SELECT current_setting('transaction_read_only') AS read_only
      `;
      if (mode.length !== 1 || mode[0].read_only !== "on") {
        const error = new Error("Schema inspection requires a read-only transaction.");
        error.code = "CATALOG_READ_ONLY_NOT_ENFORCED";
        throw error;
      }

      const tables = await tx.$queryRaw`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      `;
      const columns = await tx.$queryRaw`
        SELECT table_name, column_name, udt_schema, udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
      `;
      // Unsupported geography fields can be absent from Prisma's DMMF.
      const extensions = await tx.$queryRaw`
        SELECT extname FROM pg_extension WHERE extname = 'postgis'
      `;
      const enumTypes = await tx.$queryRaw`
        SELECT n.nspname AS enum_schema, t.typname AS enum_name,
               array_agg(e.enumlabel::text ORDER BY e.enumsortorder) AS enum_values
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        JOIN pg_enum e ON e.enumtypid = t.oid
        WHERE n.nspname = 'public'
        GROUP BY n.nspname, t.typname
      `;
      return { tables, columns, extensions, enumTypes };
    },
    { isolationLevel: "RepeatableRead", maxWait: 5000, timeout: 15000 },
  );
}

module.exports = { readPrismaSchemaCatalog };
