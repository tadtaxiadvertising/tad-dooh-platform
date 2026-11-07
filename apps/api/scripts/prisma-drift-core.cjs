"use strict";

/**
 * Pure, read-only comparison of Prisma's generated DMMF against PostgreSQL
 * information_schema metadata. No DB client and no credentials involved.
 */
function auditPrismaSchema({ models, tables, columns }) {
  const actualTables = new Set(tables.map(({ table_name }) => table_name));
  const columnTypes = new Map(
    columns.map(({ table_name, column_name, udt_name }) => [
      `${table_name}.${column_name}`,
      udt_name,
    ]),
  );
  const modelByName = new Map(models.map((model) => [model.name, model]));
  const tableNameOf = (model) => model.dbName || model.name;
  const columnNameOf = (field) => field.dbName || field.name;
  const missingTables = [];
  const missingColumns = [];
  const idTypeMismatches = [];
  const relationTypeMismatches = [];
  const missingColumnKeys = new Set();

  for (const model of models) {
    const table = tableNameOf(model);
    if (!actualTables.has(table)) {
      missingTables.push(table);
      continue;
    }
    for (const field of model.fields) {
      if (field.kind !== "scalar" && field.kind !== "enum") continue;
      const column = columnNameOf(field);
      const key = `${table}.${column}`;
      const actual = columnTypes.get(key);
      if (!actual) {
        if (!missingColumnKeys.has(key)) {
          missingColumns.push(key);
          missingColumnKeys.add(key);
        }
        continue;
      }
      if (field.isId && field.type === "String") {
        // Prisma String maps to PostgreSQL TEXT unless @db.Uuid is present.
        const expected = field.nativeType?.[0] === "Uuid" ? "uuid" : "text";
        if (actual !== expected) {
          idTypeMismatches.push({ table, column, expected, actual });
        }
      }
    }
  }

  // Mismatched types between referencing and referenced columns can make
  // foreign keys impossible even when neither primary-key check detects them.
  for (const model of models) {
    const fromTable = tableNameOf(model);
    if (!actualTables.has(fromTable)) continue;
    for (const field of model.fields) {
      if (field.kind !== "object" || !field.relationFromFields?.length) {
        continue;
      }
      const target = modelByName.get(field.type);
      if (!target) continue;
      const toTable = tableNameOf(target);
      if (!actualTables.has(toTable)) continue;
      for (let i = 0; i < field.relationFromFields.length; i++) {
        const fromField = model.fields.find(
          (item) => item.name === field.relationFromFields[i],
        );
        const toField = target.fields.find(
          (item) => item.name === field.relationToFields?.[i],
        );
        if (!fromField || !toField) continue;
        const fromColumn = columnNameOf(fromField);
        const toColumn = columnNameOf(toField);
        const fromType = columnTypes.get(`${fromTable}.${fromColumn}`);
        const toType = columnTypes.get(`${toTable}.${toColumn}`);
        if (fromType && toType && fromType !== toType) {
          relationTypeMismatches.push({
            from: `${fromTable}.${fromColumn}`,
            fromType,
            to: `${toTable}.${toColumn}`,
            toType,
          });
        }
      }
    }
  }

  missingTables.sort();
  missingColumns.sort();
  idTypeMismatches.sort((a, b) => a.table.localeCompare(b.table));
  relationTypeMismatches.sort((a, b) => a.from.localeCompare(b.from));

  return {
    expectedModels: models.length,
    modelsPresent: models.length - missingTables.length,
    missingTableCount: missingTables.length,
    missingTables,
    missingColumnCount: missingColumns.length,
    missingColumns: missingColumns.slice(0, 100),
    idTypeMismatchCount: idTypeMismatches.length,
    idTypeMismatches,
    relationTypeMismatchCount: relationTypeMismatches.length,
    relationTypeMismatches,
  };
}

module.exports = { auditPrismaSchema };
