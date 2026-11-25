"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { Prisma } = require("@prisma/client");
const { auditEnumSqlContract } = require("./prisma-enum-contract.cjs");

test("status and money filters use native enums without binding legacy TEXT columns", () => {
  const enums = Prisma.dmmf.datamodel.enums;
  const bindings = [
    ["Device", "devices", "status", "SystemStatus", "status_enum_217"],
    ["Driver", "drivers", "status", "SystemStatus", "status_enum_217"],
    ["FinancialTransaction", "financial_transactions", "currency", "Currency", "currency_enum_217"],
  ];
  const models = bindings.map(([model]) => Prisma.dmmf.datamodel.models.find(m => m.name === model));
  const tables = bindings.map(([, table]) => ({ table_name: table }));
  const columns = bindings.flatMap(([name, table, fieldName, enumName, column]) => {
    const field = models.find(m => m.name === name).fields.find(f => f.name === fieldName);
    assert.equal(field.kind, "enum");
    assert.equal(field.type, enumName);
    assert.equal(field.dbName, column);
    return [
      { table_name: table, column_name: fieldName, udt_schema: "pg_catalog", udt_name: "text" },
      { table_name: table, column_name: column, udt_schema: "public", udt_name: enumName },
    ];
  });
  const enumTypes = enums.map(e => ({ enum_schema: "public", enum_name: e.name,
    enum_values: e.values.map(v => v.name) }));
  assert.equal(auditEnumSqlContract({ models, enums, tables, columns, enumTypes }).enumSqlContractIssueCount, 0);
  const wrongBinding = columns.map(c => c.column_name.endsWith("_enum_217")
    ? { ...c, udt_schema: "pg_catalog", udt_name: "text" } : c);
  const drift = auditEnumSqlContract({ models, enums, tables, columns: wrongBinding, enumTypes });
  assert.equal(drift.enumSqlContractIssueCount, 3);
  assert.ok(drift.enumSqlContractIssues.every(i => i.code === "ENUM_COLUMN_TYPE_MISMATCH"));
});
