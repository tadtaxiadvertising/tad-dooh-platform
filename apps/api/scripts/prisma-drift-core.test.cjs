"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { auditPrismaSchema } = require("./prisma-drift-core.cjs");
const { auditGpsSqlContract } = require("./prisma-gps-contract.cjs");
const { inspectSchemaStringIds } = require("./prisma-client-id-consistency.cjs");

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

test("financial Float and Int amounts cannot silently become varchar or bigint", () => {
  const report = auditPrismaSchema({
    models: [{
      name: "Wallet", dbName: "wallets",
      fields: [
        stringId,
        { name: "availableBalance", dbName: "available_balance", type: "Float", kind: "scalar" },
        { name: "pendingWithdrawal", dbName: "pending_withdrawal", type: "Float", kind: "scalar" },
        { name: "retries", type: "Int", kind: "scalar" },
      ],
    }],
    tables: [{ table_name: "wallets" }],
    columns: [
      { table_name: "wallets", column_name: "id", udt_name: "text" },
      { table_name: "wallets", column_name: "available_balance", udt_name: "varchar" },
      { table_name: "wallets", column_name: "pending_withdrawal", udt_name: "float8" },
      { table_name: "wallets", column_name: "retries", udt_name: "int8" },
    ],
  });
  assert.equal(report.missingColumnCount, 0);
  assert.equal(report.scalarTypeMismatchCount, 2);
  assert.deepEqual(report.scalarTypeMismatches, [
    { table: "wallets", column: "available_balance", prismaType: "Float", expected: "float8", actual: "varchar" },
    { table: "wallets", column: "retries", prismaType: "Int", expected: "int4", actual: "int8" },
  ]);
});

test("checks Decimal, Boolean, BigInt and JSONB without requiring data rows", () => {
  const fields = [
    { name: "value", type: "Decimal", kind: "scalar" },
    { name: "enabled", type: "Boolean", kind: "scalar" },
    { name: "storage", type: "BigInt", kind: "scalar" },
    { name: "data", type: "Json", kind: "scalar" },
  ];
  const actual = ["numeric", "bool", "int8", "jsonb"];
  const report = auditPrismaSchema({
    models: [{ name: "Ledger", dbName: "ledger", fields }],
    tables: [{ table_name: "ledger" }],
    columns: fields.map((f, i) => ({ table_name: "ledger", column_name: f.name, udt_name: actual[i] })),
  });
  assert.equal(report.scalarTypeMismatchCount, 0);
  assert.equal(report.missingColumnCount, 0);
});

test("checks explicit native PostgreSQL mappings and non-ID UUIDs", () => {
  const fields = [
    { name: "rate", type: "Float", nativeType: ["Real", []], kind: "scalar" },
    { name: "limit", type: "Int", nativeType: ["SmallInt", []], kind: "scalar" },
    { name: "source", type: "String", nativeType: ["Uuid", []], kind: "scalar" },
    { name: "payload", type: "Json", nativeType: ["Json", []], kind: "scalar" },
  ];
  const report = auditPrismaSchema({
    models: [{ name: "Event", dbName: "events", fields }],
    tables: [{ table_name: "events" }],
    columns: [
      { table_name: "events", column_name: "rate", udt_name: "float4" },
      { table_name: "events", column_name: "limit", udt_name: "int2" },
      { table_name: "events", column_name: "source", udt_name: "text" },
      { table_name: "events", column_name: "payload", udt_name: "json" },
    ],
  });
  assert.equal(report.scalarTypeMismatchCount, 1);
  assert.deepEqual(report.scalarTypeMismatches[0], {
    table: "events", column: "source", prismaType: "String", expected: "uuid", actual: "text",
  });
});

test("avoids false positives for unsupported native mappings and array columns", () => {
  const fields = [
    { name: "counterArray", type: "Int", isList: true, kind: "scalar" },
    { name: "unrecognized", type: "Decimal", nativeType: ["FutureDatabaseType", []], kind: "scalar" },
    { name: "string", type: "String", kind: "scalar" },
    { name: "date", type: "DateTime", kind: "scalar" },
  ];
  const report = auditPrismaSchema({
    models: [{ name: "Future", dbName: "future", fields }],
    tables: [{ table_name: "future" }],
    columns: [
      { table_name: "future", column_name: "counterArray", udt_name: "_int4" },
      { table_name: "future", column_name: "unrecognized", udt_name: "numeric" },
      { table_name: "future", column_name: "string", udt_name: "varchar" },
      { table_name: "future", column_name: "date", udt_name: "timestamp" },
    ],
  });
  assert.equal(report.scalarTypeMismatchCount, 0);
});

test("existing String primary-key validator remains distinct from scalar drift", () => {
  const report = auditPrismaSchema({
    models: [{ name: "Device", dbName: "devices", fields: [stringId] }],
    tables: [{ table_name: "devices" }],
    columns: [{ table_name: "devices", column_name: "id", udt_name: "uuid" }],
  });
  assert.equal(report.idTypeMismatchCount, 1);
  assert.equal(report.scalarTypeMismatchCount, 0);
});

const gpsModel = [{ name: "Telemetry", dbName: "telemetry", fields: [] }];
const gpsTable = [{ table_name: "telemetry" }];
const geographyColumn = [{ table_name: "telemetry", column_name: "coords", udt_name: "geography" }];
const postgisExtension = [{ extname: "postgis" }];

test("GPS SQL contract detects missing geography column and PostGIS", () => {
  const report = auditGpsSqlContract({
    models: gpsModel, tables: gpsTable, columns: [], extensions: [],
  });
  assert.deepEqual(report.gpsSqlContractIssues.map(({ code }) => code), [
    "GPS_COORDS_COLUMN_MISSING", "POSTGIS_EXTENSION_MISSING",
  ]);
  assert.equal(report.gpsSqlContractIssueCount, 2);
});

test("GPS SQL contract accepts the required geography/PostGIS metadata", () => {
  assert.deepEqual(auditGpsSqlContract({
    models: gpsModel, tables: gpsTable,
    columns: geographyColumn, extensions: postgisExtension,
  }), { gpsSqlContractIssueCount: 0, gpsSqlContractIssues: [] });
});

test("GPS SQL contract rejects a geometry column instead of geography", () => {
  const report = auditGpsSqlContract({
    models: gpsModel, tables: gpsTable,
    columns: [{ ...geographyColumn[0], udt_name: "geometry" }],
    extensions: postgisExtension,
  });
  assert.deepEqual(report.gpsSqlContractIssues, [{
    code: "GPS_COORDS_TYPE_MISMATCH",
    table: "telemetry", column: "coords", expected: "geography", actual: "geometry",
  }]);
});

test("GPS SQL contract does not duplicate missing-table drift", () => {
  const report = auditGpsSqlContract({
    models: gpsModel, tables: [], columns: [], extensions: [],
  });
  assert.equal(report.gpsSqlContractIssueCount, 0);
});

test("GPS SQL contract ignores schemas without a Telemetry model", () => {
  const report = auditGpsSqlContract({
    models: [{ name: "Wallet", dbName: "wallets", fields: [] }],
    tables: gpsTable, columns: [], extensions: [],
  });
  assert.equal(report.gpsSqlContractIssueCount, 0);
});

test("GPS SQL contract blocks startup when geography exists but PostGIS is missing", () => {
  const report = auditGpsSqlContract({
    models: gpsModel,
    tables: gpsTable,
    columns: geographyColumn,
    extensions: [],
  });
  assert.deepEqual(report.gpsSqlContractIssues, [
    { code: "POSTGIS_EXTENSION_MISSING" },
  ]);
});

test("GPS SQL contract does not mistake another extension for PostGIS", () => {
  const report = auditGpsSqlContract({
    models: gpsModel,
    tables: gpsTable,
    columns: geographyColumn,
    extensions: [{ extname: "pgcrypto" }],
  });
  assert.deepEqual(report.gpsSqlContractIssues, [
    { code: "POSTGIS_EXTENSION_MISSING" },
  ]);
});

test("CampaignExpiration Prisma mappings match existing physical UUID and snake_case", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const source = fs.readFileSync(path.join(__dirname, "../prisma/schema.prisma"), "utf8");
  const model = source.match(/^model CampaignExpiration\s*\{([\s\S]*?)^\}/m)?.[1];
  assert.ok(model, "CampaignExpiration model must exist");
  const fields = new Map(
    model
      .split(/\r?\n/)
      .map((line) => {
        const match = line.trim().match(/^([A-Za-z][A-Za-z0-9_]*)\s+/);
        return match ? [match[1], line.trim()] : null;
      })
      .filter(Boolean),
  );
  for (const [field, column] of [
    ["campaignId", "campaign_id"],
    ["advertiserId", "advertiser_id"],
    ["driverId", "driver_id"],
    ["remainingDays", "remaining_days"],
    ["notificationSent", "notification_sent"],
  ]) {
    assert.ok(fields.get(field)?.includes(`@map("${column}")`), field);
  }
  for (const field of ["id", "campaignId"]) {
    assert.match(fields.get(field) || "", /@db\.Uuid\b/, field);
  }
});

test("Media Prisma MIME contract persists only physical mime_type", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const source = fs.readFileSync(path.join(__dirname, "../prisma/schema.prisma"), "utf8");
  const model = source.match(/^model Media\s*\{([\s\S]*?)^\}/m)?.[1];
  assert.ok(model, "Media model must exist");
  assert.match(model, /^\s*mimeType\s+String\?\s+@map\("mime_type"\)\s*$/m);
  assert.doesNotMatch(model, /^\s*mime_type\s+/m);
});

test("three independent UUID primary keys use native PostgreSQL UUID types", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const schema = fs.readFileSync(
    path.join(__dirname, "../prisma/schema.prisma"),
    "utf8",
  );
  for (const [name, table] of [
    ["CampaignIntent", "campaign_intents"],
    ["MediaAsset", "media_assets"],
    ["PlaybackEvent", "playback_events"],
  ]) {
    const model = schema.match(
      new RegExp(`^model ${name} \\{([\\s\\S]*?)^\\}`, "m"),
    )?.[1];
    assert.ok(model, `Missing model ${name}`);
    assert.match(
      model,
      /^\s*id\s+String\s+@id\s+@default\(uuid\(\)\)\s+@db\.Uuid\s*$/m,
    );
    assert.ok(model.includes(`@@map("${table}")`));
  }

  // Simulated catalog result: the Prisma DMMF nativeType is Uuid, and physical
  // PostgreSQL keys remain uuid, without touching financial/offline row data.
  const report = auditPrismaSchema({
    models: ["campaign_intents", "media_assets", "playback_events"].map(
      (table) => ({
        name: table,
        dbName: table,
        fields: [{ ...stringId, nativeType: ["Uuid", []] }],
      }),
    ),
    tables: ["campaign_intents", "media_assets", "playback_events"].map(
      (table_name) => ({ table_name }),
    ),
    columns: ["campaign_intents", "media_assets", "playback_events"].map(
      (table_name) => ({ table_name, column_name: "id", udt_name: "uuid" }),
    ),
  });
  assert.equal(report.idTypeMismatchCount, 0);
});

test("five unreferenced UUID primary keys mirror the canonical PostgreSQL catalog", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const schema = fs.readFileSync(
    path.join(__dirname, "../prisma/schema.prisma"),
    "utf8",
  );
  const models = [
    ["DriverLocation", "driver_locations"],
    ["FinancialTransaction", "financial_transactions"],
    ["PayrollPayment", "payroll_payments"],
    ["Telemetry", "telemetry"],
    ["Wallet", "wallets"],
  ];
  for (const [name, table] of models) {
    const block = schema.match(
      new RegExp("^model " + name + " \\{([\\s\\S]*?)^\\}", "m"),
    )?.[1];
    assert.ok(block, `Missing Prisma model ${name}`);
    assert.match(
      block,
      /^\s*id\s+String\s+@id\s+@default\(uuid\(\)\)\s+@db\.Uuid\s*$/m,
    );
    assert.ok(block.includes(`@@map("${table}")`));
  }
  const report = auditPrismaSchema({
    models: models.map(([, table]) => ({
      name: table,
      dbName: table,
      fields: [{ ...stringId, nativeType: ["Uuid", []] }],
    })),
    tables: models.map(([, table_name]) => ({ table_name })),
    columns: models.map(([, table_name]) => ({
      table_name,
      column_name: "id",
      udt_name: "uuid",
    })),
  });
  assert.equal(report.idTypeMismatchCount, 0);
});

test("source schema supplies native UUID IDs omitted from the generated DMMF", () => {
  const schemaSource = [
    "model Wallet {",
    "  id String @id @default(uuid()) @db.Uuid",
    "}",
    "model Driver {",
    "  id String @id @default(uuid())",
    "}",
  ].join("\n");
  const models = [
    { name: "Wallet", dbName: "wallets", fields: [
      { name: "id", type: "String", kind: "scalar", isId: true },
    ] },
    { name: "Driver", dbName: "drivers", fields: [
      { name: "id", type: "String", kind: "scalar", isId: true },
    ] },
  ];
  const contract = inspectSchemaStringIds({ schemaSource, models });
  assert.equal(contract.issueCount, 0);
  assert.equal(contract.idTypes.get("Wallet.id"), "uuid");
  assert.equal(contract.idTypes.get("Driver.id"), "text");

  const report = auditPrismaSchema({
    models,
    tables: [{ table_name: "wallets" }, { table_name: "drivers" }],
    columns: [
      { table_name: "wallets", column_name: "id", udt_name: "uuid" },
      { table_name: "drivers", column_name: "id", udt_name: "text" },
    ],
    idTypes: contract.idTypes,
  });
  assert.equal(report.idTypeMismatchCount, 0);
});

test("source/client contract rejects a generated model missing its String ID", () => {
  const contract = inspectSchemaStringIds({
    schemaSource: "model Wallet {\r\n  id String @id @db.Uuid\r\n}\r\n",
    models: [{ name: "Wallet", fields: [] }],
  });
  assert.deepEqual(contract.issues, [
    { model: "Wallet", field: "id", code: "GENERATED_ID_MISSING" },
  ]);
});

test("source/client contract rejects an ID in the client absent from the source", () => {
  const contract = inspectSchemaStringIds({
    schemaSource: "model Device {\n  serial String @unique\n}\n",
    models: [{
      name: "Device",
      fields: [{ name: "id", type: "String", isId: true }],
    }],
  });
  assert.deepEqual(contract.issues, [
    { model: "Device", field: "id", code: "SOURCE_ID_MISSING" },
  ]);
});

test("source/client contract refuses unsupported native String ID types", () => {
  const contract = inspectSchemaStringIds({
    schemaSource: "model Device {\n  id String @id @db.VarChar(36)\n}\n",
    models: [{
      name: "Device",
      fields: [{ name: "id", type: "String", isId: true }],
    }],
  });
  assert.ok(contract.issues.some((issue) => issue.code === "UNSUPPORTED_ID_NATIVE_TYPE"));
  assert.ok(contract.issueCount > 0);
});

test("Prisma ID source parser ignores comments and unrelated scalar fields", () => {
  const contract = inspectSchemaStringIds({
    schemaSource: [
      "model Device {",
      "  id String @id // @db.Uuid is only a comment",
      "  reference String @db.Uuid",
      "}",
    ].join("\n"),
    models: [{
      name: "Device",
      fields: [{ name: "id", type: "String", isId: true }],
    }],
  });
  assert.equal(contract.issueCount, 0);
  assert.equal(contract.idTypes.get("Device.id"), "text");
});

test("runtime drift checker uses source-native ID types and emits a schema SHA-256", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const source = fs.readFileSync(
    path.join(__dirname, "check-prisma-drift.cjs"), "utf8",
  );
  assert.match(source, /inspectSchemaStringIds\(\{ schemaSource, models \}\)/);
  assert.match(source, /PRISMA_SOURCE_CLIENT_ID_CONTRACT_INVALID/);
  assert.match(source, /idTypes: sourceContract\.idTypes/);
  assert.match(source, /createHash\("sha256"\)/);
  assert.match(source, /prismaSchemaSha256/);
});

test("real generated Prisma Client IDs agree with the source model identities", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const { Prisma } = require("@prisma/client");
  const schemaSource = fs.readFileSync(
    path.join(__dirname, "../prisma/schema.prisma"), "utf8",
  );
  const models = Prisma.dmmf.datamodel.models;
  const contract = inspectSchemaStringIds({ schemaSource, models });
  assert.deepEqual(contract.issues, []);

  // These nine tables were reported as TEXT/UUID errors by the earlier DMMF
  // checker despite @db.Uuid existing in the source. Do not mask real drift
  // for the other keys or touch physical PostgreSQL columns.
  const nativeUuidModels = new Set([
    "CampaignExpiration", "CampaignIntent", "DriverLocation",
    "FinancialTransaction", "MediaAsset", "PayrollPayment",
    "PlaybackEvent", "Telemetry", "Wallet",
  ]);
  const selected = models.filter((model) => nativeUuidModels.has(model.name));
  assert.equal(selected.length, nativeUuidModels.size);
  const report = auditPrismaSchema({
    models: selected,
    tables: selected.map((model) => ({
      table_name: model.dbName || model.name,
    })),
    columns: selected.map((model) => ({
      table_name: model.dbName || model.name,
      column_name: "id",
      udt_name: "uuid",
    })),
    idTypes: contract.idTypes,
  });
  assert.equal(report.idTypeMismatchCount, 0);

  // Do not turn the five remaining model/physical UUID discrepancies green.
  const remainingModels = new Set([
    "Advertiser", "Campaign", "Device", "Invoice", "Media",
  ]);
  const remaining = models.filter((model) => remainingModels.has(model.name));
  assert.equal(remaining.length, remainingModels.size);
  const unresolved = auditPrismaSchema({
    models: remaining,
    tables: remaining.map((model) => ({
      table_name: model.dbName || model.name,
    })),
    columns: remaining.map((model) => ({
      table_name: model.dbName || model.name,
      column_name: "id",
      udt_name: "uuid",
    })),
    idTypes: contract.idTypes,
  });
  assert.deepEqual(
    unresolved.idTypeMismatches.map((item) => item.table).sort(),
    ["advertisers", "campaigns", "devices", "invoices", "media"],
  );
});


test("source native UUID on non-ID campaign FK survives DMMF nativeType omission", () => {
  const schemaSource = [
    "model CampaignExpiration {",
    "  id String @id @default(uuid()) @db.Uuid",
    '  campaignId String @map("campaign_id") @db.Uuid',
    "}",
  ].join("\n");
  const models = [{
    name: "CampaignExpiration", dbName: "campaign_expirations",
    fields: [
      { name: "id", type: "String", kind: "scalar", isId: true },
      { name: "campaignId", dbName: "campaign_id", type: "String", kind: "scalar" },
    ],
  }];
  const contract = inspectSchemaStringIds({ schemaSource, models });
  assert.equal(contract.issueCount, 0);
  assert.equal(contract.nativeUuidFields.has("CampaignExpiration.campaignId"), true);
  assert.equal(contract.nativeUuidFields.has("CampaignExpiration.id"), true);

  const tables = [{ table_name: "campaign_expirations" }];
  const columns = [
    { table_name: "campaign_expirations", column_name: "id", udt_name: "uuid" },
    { table_name: "campaign_expirations", column_name: "campaign_id", udt_name: "uuid" },
  ];
  const inputs = {
    models, tables, columns,
    idTypes: contract.idTypes, nativeUuidFields: contract.nativeUuidFields,
  };
  const valid = auditPrismaSchema(inputs);
  assert.equal(valid.idTypeMismatchCount, 0);
  assert.equal(valid.scalarTypeMismatchCount, 0);

  const wrong = auditPrismaSchema({
    ...inputs,
    columns: columns.map((c) =>
      c.column_name === "campaign_id" ? { ...c, udt_name: "text" } : c),
  });
  assert.equal(wrong.scalarTypeMismatchCount, 1);
  assert.deepEqual(wrong.scalarTypeMismatches, [{
    table: "campaign_expirations", column: "campaign_id",
    prismaType: "String", expected: "uuid", actual: "text",
  }]);
});

test("source UUID field with an incompatible generated client fails closed", () => {
  const contract = inspectSchemaStringIds({
    schemaSource: [
      "model CampaignExpiration {",
      "  id String @id @db.Uuid",
      '  campaignId String? @map("campaign_id") @db.Uuid',
      "}",
    ].join("\n"),
    models: [{
      name: "CampaignExpiration",
      fields: [{ name: "id", type: "String", kind: "scalar", isId: true }],
    }],
  });
  assert.deepEqual(contract.issues, [{
    model: "CampaignExpiration",
    field: "campaignId",
    code: "GENERATED_UUID_FIELD_MISMATCH",
  }]);
});

test("native UUID source check is wired into the runtime drift comparator", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const checker = fs.readFileSync(path.join(__dirname, "check-prisma-drift.cjs"), "utf8");
  assert.match(checker, /nativeUuidFields: sourceContract\.nativeUuidFields/);
  const core = fs.readFileSync(path.join(__dirname, "prisma-drift-core.cjs"), "utf8");
  assert.match(core, /nativeUuidFields\?\.has/);
});


test("real CampaignExpiration.campaignId native UUID is checked without DMMF nativeType", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const { Prisma } = require("@prisma/client");
  const schemaSource = fs.readFileSync(path.join(__dirname, "../prisma/schema.prisma"), "utf8");
  const models = Prisma.dmmf.datamodel.models;
  const contract = inspectSchemaStringIds({ schemaSource, models });
  assert.equal(contract.issueCount, 0);
  assert.equal(contract.nativeUuidFields.has("CampaignExpiration.campaignId"), true);
  const model = models.find((m) => m.name === "CampaignExpiration");
  assert.ok(model?.fields.find((f) => f.name === "campaignId" && f.type === "String"));
  const input = {
    models: [model],
    tables: [{ table_name: "campaign_expirations" }],
    columns: [
      { table_name: "campaign_expirations", column_name: "id", udt_name: "uuid" },
      { table_name: "campaign_expirations", column_name: "campaign_id", udt_name: "uuid" },
    ],
    idTypes: contract.idTypes,
    nativeUuidFields: contract.nativeUuidFields,
  };
  const report = auditPrismaSchema(input);
  assert.equal(report.scalarTypeMismatchCount, 0);
  const wrong = auditPrismaSchema({
    ...input,
    columns: input.columns.map((col) =>
      col.column_name === "campaign_id" ? { ...col, udt_name: "text" } : col),
  });
  assert.deepEqual(
    wrong.scalarTypeMismatches.map(({ table, column, expected, actual }) =>
      [table, column, expected, actual]),
    [["campaign_expirations", "campaign_id", "uuid", "text"]],
  );
});
