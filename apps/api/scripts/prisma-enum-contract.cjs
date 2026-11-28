"use strict";

// Compare generated enum metadata with one read-only catalog snapshot.
// No application rows, database client or connection configuration are read here.
function auditEnumSqlContract({ models, enums, tables, columns, enumTypes }) {
  const issues = [];
  const fields = models.flatMap((model) => model.fields
    .filter((field) => field.kind === "enum")
    .map((field) => ({ model, field })));
  if (fields.length && !Array.isArray(enumTypes)) {
    return {
      enumSqlContractIssueCount: 1,
      enumSqlContractIssues: [{ code: "ENUM_CATALOG_UNAVAILABLE" }],
    };
  }
  const definitions = new Map((enums || []).map((value) => [value.name, value]));
  const catalog = new Map((enumTypes || []).map((value) => [
    value.enum_schema + "." + value.enum_name, value,
  ]));
  const actualTables = new Set(tables.map((table) => table.table_name));
  const actualColumns = new Map(columns.map((column) => [
    column.table_name + "." + column.column_name, column,
  ]));
  const checked = new Set();

  for (const { model, field } of fields) {
    const definition = definitions.get(field.type);
    if (!definition) {
      if (!checked.has(field.type)) {
        issues.push({ code: "PRISMA_ENUM_DEFINITION_MISSING", enum: field.type });
        checked.add(field.type);
      }
      continue;
    }
    const expected = "public." + (definition.dbName || definition.name);
    if (!checked.has(field.type)) {
      checked.add(field.type);
      const actual = catalog.get(expected);
      if (!actual) {
        issues.push({ code: "ENUM_TYPE_MISSING", enum: field.type, expected });
      } else {
        const expectedValues = definition.values.map((value) => value.dbName || value.name);
        const actualValues = actual.enum_values;
        if (!Array.isArray(actualValues) || actualValues.length !== expectedValues.length ||
            expectedValues.some((value, index) => value !== actualValues[index])) {
          issues.push({ code: "ENUM_VALUES_MISMATCH", enum: field.type,
            expectedType: expected, expectedValues, actualValues });
        }
      }
    }
    const table = model.dbName || model.name;
    const column = field.dbName || field.name;
    const actual = actualColumns.get(table + "." + column);
    // The ordinary schema comparator already reports absent tables/columns.
    if (!actualTables.has(table) || !actual) continue;
    const actualType = (actual.udt_schema || "unknown") + "." + actual.udt_name;
    if (actualType !== expected) {
      issues.push({ code: "ENUM_COLUMN_TYPE_MISMATCH", table, column,
        enum: field.type, expected, actual: actualType });
    }
  }
  issues.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return { enumSqlContractIssueCount: issues.length, enumSqlContractIssues: issues.slice(0, 100) };
}

module.exports = { auditEnumSqlContract };
