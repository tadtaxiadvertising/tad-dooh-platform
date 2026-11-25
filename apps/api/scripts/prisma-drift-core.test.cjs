"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { auditPrismaSchema } = require("./prisma-drift-core.cjs");
const { auditGpsSqlContract } = require("./prisma-gps-contract.cjs");
const { inspectSchemaStringIds } = require("./prisma-client-id-consistency.cjs");
const { readPrismaSchemaCatalog } = require("./prisma-schema-catalog.cjs");

function catalogFixture(mode = [{ read_only: "on" }], failColumns = false) {
  const calls = [];
  const tx = {
    async $executeRaw(sql) { calls.push(sql.join("")); },
    async $queryRaw(sql) {
      const text = sql.join("");
      calls.push(text);
      if (text.includes("current_setting")) return mode;
      if (text.includes("information_schema.tables")) return [{ table_name: "devices" }];
      if (text.includes("information_schema.columns")) {
        if (failColumns) throw Object.assign(new Error("synthetic catalog failure"), { code: "57014" });
        return [{ table_name: "devices", column_name: "id", udt_name: "uuid" }];
      }
      if (text.includes("pg_extension")) return [];
      throw new Error("Unexpected catalog query");
    },
  };
  const prisma = {
    async $transaction(read, options) {
      assert.equal(options.isolationLevel, "RepeatableRead");
      return read(tx);
    },
    async $queryRaw() { throw new Error("Metadata escaped its transaction"); },
  };
  return { prisma, calls };
}

test("catalog inspection verifies READ ONLY before reading a consistent metadata snapshot", async () => {
  const { prisma, calls } = catalogFixture();
  const catalog = await readPrismaSchemaCatalog(prisma);
  assert.deepEqual(catalog, {
    tables: [{ table_name: "devices" }],
    columns: [{ table_name: "devices", column_name: "id", udt_name: "uuid" }],
    extensions: [],
  });
  const verification = calls.findIndex((sql) => sql.includes("current_setting"));
  assert.match(calls[0], /SET TRANSACTION READ ONLY/);
  assert.ok(verification > 0);
  assert.ok(calls.findIndex((sql) => sql.includes("information_schema")) > verification);
});

test("unenforced or unverifiable READ ONLY refuses every metadata query", async () => {
  for (const mode of [[{ read_only: "off" }], [], [{ read_only: true }]]) {
    const { prisma, calls } = catalogFixture(mode);
    await assert.rejects(readPrismaSchemaCatalog(prisma), { code: "CATALOG_READ_ONLY_NOT_ENFORCED" });
    assert.equal(calls.some((sql) => /information_schema|pg_extension/.test(sql)), false);
  }
});

test("catalog query failures escape the transaction instead of returning partial parity", async () => {
  const { prisma, calls } = catalogFixture(undefined, true);
  await assert.rejects(readPrismaSchemaCatalog(prisma), { code: "57014" });
  assert.equal(calls.some((sql) => sql.includes("pg_extension")), false);
});

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

test("restored users use the UUID contract already stored by campaign creators", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const { Prisma } = require("@prisma/client");
  const schemaSource = fs.readFileSync(path.join(__dirname, "../prisma/schema.prisma"), "utf8");
  const allModels = Prisma.dmmf.datamodel.models;
  const contract = inspectSchemaStringIds({ schemaSource, models: allModels });
  assert.deepEqual(contract.issues, []);
  assert.equal(contract.idTypes.get("User.id"), "uuid");
  assert.equal(contract.nativeUuidFields.has("Campaign.createdById"), true);
  const input = {
    models: allModels.filter((m) => ["User", "Campaign"].includes(m.name))
      .map((m) => ({ ...m, fields: m.fields.filter((f) =>
        ["id", "createdById", "createdBy"].includes(f.name)) })),
    tables: ["users", "campaigns"].map((table_name) => ({ table_name })),
    columns: [
      ["users", "id", "uuid"],
      ["campaigns", "id", "uuid"],
      ["campaigns", "created_by", "uuid"],
    ].map(([table_name, column_name, udt_name]) => ({ table_name, column_name, udt_name })),
    idTypes: contract.idTypes,
    nativeUuidFields: contract.nativeUuidFields,
  };
  const restored = auditPrismaSchema(input);
  assert.equal(restored.missingTableCount, 0);
  assert.equal(restored.idTypeMismatchCount, 0);
  assert.equal(restored.scalarTypeMismatchCount, 0);
  assert.equal(restored.relationTypeMismatchCount, 0);
  // Missing endpoints cannot prove relation compatibility. Creating a TEXT
  // users key must still expose the mismatch, not make the recovery green.
  const absent = auditPrismaSchema({ ...input, tables: [{ table_name: "campaigns" }] });
  assert.deepEqual(absent.missingTables, ["users"]);
  const wrong = auditPrismaSchema({ ...input, columns: input.columns.map((c) =>
    c.table_name === "users" ? { ...c, udt_name: "text" } : c) });
  assert.equal(wrong.idTypeMismatchCount, 1);
  assert.deepEqual(wrong.relationTypeMismatches, [{
    from: "campaigns.created_by", fromType: "uuid", to: "users.id", toType: "text",
  }]);
});

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
      fields: [
        { name: "id", type: "String", kind: "scalar", isId: true },
        { name: "reference", type: "String", kind: "scalar" },
      ],
    }],
  });
  assert.equal(contract.issueCount, 0);
  assert.equal(contract.idTypes.get("Device.id"), "text");
  assert.equal(contract.nativeUuidFields.has("Device.id"), false);
  assert.equal(contract.nativeUuidFields.has("Device.reference"), true);
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

  // The live read-only catalog on 2026-11-25 confirms these UUID primary keys.
  // Native annotations must describe existing columns, without changing data.
  const nativeUuidModels = new Set([
    "Advertiser", "Campaign", "Device", "Invoice", "Media",
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

});


test("campaign and advertiser references retain their physical UUID contract", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const { Prisma } = require("@prisma/client");
  const schemaSource = fs.readFileSync(path.join(__dirname, "../prisma/schema.prisma"), "utf8");
  const models = Prisma.dmmf.datamodel.models;
  const contract = inspectSchemaStringIds({ schemaSource, models });
  assert.deepEqual(contract.issues, []);

  // Column types observed through a read-only catalog query, not application
  // data. New tables must use the same parent identity when expanded later.
  const observed = [
    ["Campaign", "advertiserId", "campaigns", "advertiser_id"],
    ["DeviceCampaign", "campaign_id", "device_campaigns", "campaign_id"],
    ["Invoice", "advertiserId", "invoices", "advertiser_id"],
    ["Media", "campaign_id", "media", "campaign_id"],
    ["MediaAsset", "campaignId", "media_assets", "campaign_id"],
    ["PlaylistItem", "campaignId", "playlist_items", "campaign_id"],
    ["Video", "campaignId", "videos", "campaign_id"],
  ];
  for (const [model, field] of observed) {
    assert.equal(contract.nativeUuidFields.has(model + "." + field), true,
      model + "." + field + " must retain the catalog UUID type");
  }
  for (const key of ["AdvertiserSubscription.advertiserId", "CampaignMetric.campaignId",
    "Playlist.campaignId", "PortalRequest.advertiserId"]) {
    assert.equal(contract.nativeUuidFields.has(key), true, key);
  }
  const input = {
    models: models.filter((m) => observed.some(([name]) => name === m.name)),
    tables: [...new Set(observed.map(([, , table]) => table))].map((table_name) => ({ table_name })),
    columns: observed.map(([, , table_name, column_name]) => ({ table_name, column_name, udt_name: "uuid" })),
    idTypes: contract.idTypes,
    nativeUuidFields: contract.nativeUuidFields,
  };
  // This fixture measures only the listed FK types; it is not a full parity
  // fixture and must never be used to declare the production schema clean.
  assert.equal(auditPrismaSchema(input).scalarTypeMismatchCount, 0);
  const wrong = auditPrismaSchema({ ...input,
    columns: input.columns.map((column) => ({ ...column, udt_name: "text" })),
  });
  assert.equal(wrong.scalarTypeMismatchCount, observed.length);

  assert.equal(contract.idTypes.get("Driver.id"), "text");
  assert.equal(contract.idTypes.get("Device.id"), "uuid");
  assert.equal(contract.nativeUuidFields.has("Device.deviceId"), false);
  assert.equal(contract.nativeUuidFields.has("DeviceCampaign.device_id"), false);
});

test("device UUID storage and transitional TEXT assignments remain distinct", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const { Prisma } = require("@prisma/client");
  const schemaSource = fs.readFileSync(path.join(__dirname, "../prisma/schema.prisma"), "utf8");
  const models = Prisma.dmmf.datamodel.models;
  const contract = inspectSchemaStringIds({ schemaSource, models });
  assert.deepEqual(contract.issues, []);
  assert.equal(contract.idTypes.get("Device.id"), "uuid");
  assert.equal(contract.nativeUuidFields.has("DeviceCommand.deviceId"), true);
  assert.equal(contract.nativeUuidFields.has("CampaignMetric.deviceId"), true);
  for (const key of ["Device.deviceId", "DeviceCampaign.device_id", "PlaylistItem.deviceId"]) {
    assert.equal(contract.nativeUuidFields.has(key), false, key + " remains TEXT");
  }
  const input = {
    models: models.filter((m) => ["Device", "DeviceCommand", "DeviceCampaign", "Campaign"].includes(m.name)),
    tables: ["devices", "device_commands", "device_campaigns", "campaigns"].map((table_name) => ({ table_name })),
    // A type-only fixture of observed catalog columns, not full schema parity.
    columns: [
      ["devices", "id", "uuid"], ["devices", "device_id", "text"],
      ["device_commands", "device_id", "uuid"],
      ["device_campaigns", "device_id", "text"],
      ["device_campaigns", "campaign_id", "uuid"], ["campaigns", "id", "uuid"],
    ].map(([table_name, column_name, udt_name]) => ({ table_name, column_name, udt_name })),
    idTypes: contract.idTypes,
    nativeUuidFields: contract.nativeUuidFields,
  };
  const report = auditPrismaSchema(input);
  assert.equal(report.idTypeMismatchCount, 0);
  assert.equal(report.scalarTypeMismatchCount, 0);
  // A correct Device PK mapping does not make its incompatible relation green.
  assert.deepEqual(report.relationTypeMismatches, [{
    from: "device_campaigns.device_id", fromType: "text",
    to: "devices.id", toType: "uuid",
  }]);
  const wrong = auditPrismaSchema({ ...input,
    columns: input.columns.map((c) => c.table_name === "device_commands"
      ? { ...c, udt_name: "text" } : c),
  });
  assert.deepEqual(wrong.scalarTypeMismatches, [{
    table: "device_commands", column: "device_id", prismaType: "String",
    expected: "uuid", actual: "text",
  }]);
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
