"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { auditPrismaSchema } = require("./prisma-drift-core.cjs");

const stringId = { name: "id", type: "String", kind: "scalar", isId: true };
const models = [
  {
    name: "Driver", dbName: "drivers",
    fields: [stringId],
  },
  {
    name: "Wallet", dbName: "wallets",
    fields: [
      stringId,
      { name: "driverId", dbName: "driver_id", type: "String", kind: "scalar" },
      {
        name: "driver", kind: "object", type: "Driver",
        relationFromFields: ["driverId"], relationToFields: ["id"],
      },
    ],
  },
  {
    name: "SystemSetting", dbName: "system_settings",
    fields: [stringId, { name: "key", type: "String", kind: "scalar" }],
  },
];

test("reports absent models, UUID/TEXT primary-key and relation mismatches", () => {
  const report = auditPrismaSchema({
    models,
    tables: [{ table_name: "drivers" }, { table_name: "wallets" }],
    columns: [
      { table_name: "drivers", column_name: "id", udt_name: "text" },
      { table_name: "wallets", column_name: "id", udt_name: "uuid" },
      { table_name: "wallets", column_name: "driver_id", udt_name: "uuid" },
    ],
  });

  assert.deepEqual(report.missingTables, ["system_settings"]);
  assert.equal(report.idTypeMismatchCount, 1);
  assert.deepEqual(report.idTypeMismatches[0], {
    table: "wallets", column: "id", expected: "text", actual: "uuid",
  });
  assert.equal(report.relationTypeMismatchCount, 1);
  assert.deepEqual(report.relationTypeMismatches[0], {
    from: "wallets.driver_id", fromType: "uuid", to: "drivers.id", toType: "text",
  });
});

test("clean schema returns zero drift", () => {
  const report = auditPrismaSchema({
    models,
    tables: models.map((model) => ({ table_name: model.dbName })),
    columns: [
      { table_name: "drivers", column_name: "id", udt_name: "text" },
      { table_name: "wallets", column_name: "id", udt_name: "text" },
      { table_name: "wallets", column_name: "driver_id", udt_name: "text" },
      { table_name: "system_settings", column_name: "id", udt_name: "text" },
      { table_name: "system_settings", column_name: "key", udt_name: "text" },
    ],
  });
  assert.equal(report.missingTableCount, 0);
  assert.equal(report.missingColumnCount, 0);
  assert.equal(report.idTypeMismatchCount, 0);
  assert.equal(report.relationTypeMismatchCount, 0);
});

test("detects missing mapped columns while avoiding relation-object false positives", () => {
  const report = auditPrismaSchema({
    models,
    tables: models.map((model) => ({ table_name: model.dbName })),
    columns: [
      { table_name: "drivers", column_name: "id", udt_name: "text" },
      { table_name: "wallets", column_name: "id", udt_name: "text" },
      { table_name: "wallets", column_name: "driver_id", udt_name: "text" },
      { table_name: "system_settings", column_name: "id", udt_name: "text" },
    ],
  });
  assert.deepEqual(report.missingColumns, ["system_settings.key"]);
  assert.equal(report.relationTypeMismatchCount, 0);
});

test("understands explicit @db.Uuid for a String primary key", () => {
  const report = auditPrismaSchema({
    models: [{
      name: "Example", dbName: "examples",
      fields: [{ ...stringId, nativeType: ["Uuid", []] }],
    }],
    tables: [{ table_name: "examples" }],
    columns: [{ table_name: "examples", column_name: "id", udt_name: "uuid" }],
  });
  assert.equal(report.idTypeMismatchCount, 0);
});
