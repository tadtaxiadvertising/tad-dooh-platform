"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { auditEnumSqlContract } = require("./prisma-enum-contract.cjs");

const input = () => ({
  models: [{ name: "Device", dbName: "devices", fields: [
    { name: "status", dbName: "operational_state", kind: "enum", type: "SystemStatus" },
  ] }],
  enums: [{ name: "SystemStatus", dbName: "fleet_state", values: [
    { name: "OPERATIVO", dbName: "active" }, { name: "BLOQUEADO", dbName: "blocked" },
  ] }],
  tables: [{ table_name: "devices" }],
  columns: [{ table_name: "devices", column_name: "operational_state", udt_schema: "public", udt_name: "fleet_state" }],
  enumTypes: [{ enum_schema: "public", enum_name: "fleet_state", enum_values: ["active", "blocked"] }],
});

test("accepts mapped enum, field and labels from one matching catalog", () => {
  assert.deepEqual(auditEnumSqlContract(input()), { enumSqlContractIssueCount: 0, enumSqlContractIssues: [] });
});

test("reports an absent enum and its incompatible TEXT binding independently", () => {
  const fixture = input();
  fixture.enumTypes = [];
  fixture.columns[0] = { ...fixture.columns[0], udt_schema: "pg_catalog", udt_name: "text" };
  const result = auditEnumSqlContract(fixture);
  assert.equal(result.enumSqlContractIssueCount, 2);
  assert.deepEqual(result.enumSqlContractIssues.map(x => x.code).sort(), ["ENUM_COLUMN_TYPE_MISMATCH", "ENUM_TYPE_MISSING"]);
});

test("checks the enum namespace as well as its name", () => {
  const fixture = input();
  fixture.columns[0].udt_schema = "other";
  assert.equal(auditEnumSqlContract(fixture).enumSqlContractIssues[0]?.code, "ENUM_COLUMN_TYPE_MISMATCH");
});

test("rejects missing, additional and reordered database enum labels", () => {
  for (const labels of [["active"], ["active", "blocked", "unknown"], ["blocked", "active"]]) {
    const fixture = input();
    fixture.enumTypes[0].enum_values = labels;
    const result = auditEnumSqlContract(fixture);
    assert.equal(result.enumSqlContractIssueCount, 1);
    assert.equal(result.enumSqlContractIssues[0]?.code, "ENUM_VALUES_MISMATCH");
  }
});

test("does not hide an absent global type when its model table or field is absent", () => {
  for (const missing of ["table", "column"]) {
    const fixture = input();
    fixture[missing === "table" ? "tables" : "columns"] = [];
    fixture.enumTypes = [];
    const result = auditEnumSqlContract(fixture);
    assert.equal(result.enumSqlContractIssueCount, 1);
    assert.equal(result.enumSqlContractIssues[0]?.code, "ENUM_TYPE_MISSING");
  }
});

test("refuses unavailable enum catalog or missing Prisma enum definitions", () => {
  const missingCatalog = input();
  delete missingCatalog.enumTypes;
  assert.equal(auditEnumSqlContract(missingCatalog).enumSqlContractIssues[0]?.code, "ENUM_CATALOG_UNAVAILABLE");
  const missingDefinition = input();
  missingDefinition.enums = [];
  assert.equal(auditEnumSqlContract(missingDefinition).enumSqlContractIssues[0]?.code, "PRISMA_ENUM_DEFINITION_MISSING");
});

test("does not infer PostgreSQL enums from plain String fields", () => {
  const fixture = input();
  fixture.models[0].fields[0].kind = "scalar";
  fixture.enumTypes = [];
  assert.equal(auditEnumSqlContract(fixture).enumSqlContractIssueCount, 0);
});
