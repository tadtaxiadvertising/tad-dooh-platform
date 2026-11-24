"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { auditPrismaSchema } = require("./prisma-drift-core.cjs");
const { auditGpsSqlContract } = require("./prisma-gps-contract.cjs");
const { auditGeneratedClientIdTypes } = require("./prisma-client-id-consistency.cjs");

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

test("Prisma generated ID contract accepts matching native UUID and text declarations", () => {
  const source = [
    "model Wallet {",
    "  id String @id @default(uuid()) @db.Uuid",
    "}",
    "model Driver {",
    "  id String @id @default(uuid())",
    "}",
  ].join("\n");
  const report = auditGeneratedClientIdTypes({
    schemaSource: source,
    models: [
      { name: "Wallet", fields: [{ name: "id", nativeType: ["Uuid", []] }] },
      { name: "Driver", fields: [{ name: "id" }] },
    ],
  });
  assert.deepEqual(report, { mismatchCount: 0, mismatches: [] });
});

test("Prisma generated ID contract diagnoses a stale client rather than DB drift", () => {
  const source = [
    "model Wallet {",
    "  id String @id @default(uuid()) @db.Uuid",
    "}",
    "model Device {",
    "  id String @id @default(uuid())",
    "}",
  ].join("\n");
  const report = auditGeneratedClientIdTypes({
    schemaSource: source,
    models: [
      { name: "Wallet", fields: [{ name: "id" }] },
      { name: "Device", fields: [{ name: "id", nativeType: ["Uuid", []] }] },
    ],
  });
  assert.equal(report.mismatchCount, 2);
  assert.deepEqual(report.mismatches, [
    { model: "Device", field: "id", schema: "non-uuid", client: "uuid" },
    { model: "Wallet", field: "id", schema: "uuid", client: "non-uuid" },
  ]);
});

test("Prisma generated ID contract fails closed when the generated model omits a key", () => {
  const source = "model Wallet {\r\n  id String @id @db.Uuid\r\n}\r\n";
  const report = auditGeneratedClientIdTypes({
    schemaSource: source,
    models: [{ name: "Wallet", fields: [] }],
  });
  assert.deepEqual(report.mismatches, [
    { model: "Wallet", field: "id", schema: "uuid", client: "missing" },
  ]);
});

test("Prisma ID consistency check ignores non-primary fields and commented annotations", () => {
  const source = [
    "model Device {",
    "  id String @id // @db.Uuid is not part of this ID",
    "  reference String @db.Uuid",
    "}",
  ].join("\n");
  const report = auditGeneratedClientIdTypes({
    schemaSource: source,
    models: [{ name: "Device", fields: [{ name: "id" }] }],
  });
  assert.equal(report.mismatchCount, 0);
});

test("runtime Prisma drift checker verifies bundled schema and exposes a safe SHA256 fingerprint", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const source = fs.readFileSync(
    path.join(__dirname, "check-prisma-drift.cjs"), "utf8",
  );
  assert.match(source, /auditGeneratedClientIdTypes\(\{ schemaSource, models \}\)/);
  assert.match(source, /PRISMA_GENERATED_CLIENT_ID_MISMATCH/);
  assert.match(source, /createHash\("sha256"\)/);
  assert.match(source, /prismaSchemaSha256/);
  assert.match(source, /process\.exit\(2\)/);
  assert.match(source, /check-prisma-drift.cjs|Prisma schema/i);
});


test("installed Prisma Client DMMF agrees with the checked-in primary-key native types", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const { Prisma } = require("@prisma/client");
  const schemaSource = fs.readFileSync(
    path.join(__dirname, "../prisma/schema.prisma"),
    "utf8",
  );
  const report = auditGeneratedClientIdTypes({
    schemaSource,
    models: Prisma.dmmf.datamodel.models,
  });
  assert.deepEqual(
    report.mismatches,
    [],
    "Generated Prisma Client ID metadata differs from its source schema",
  );
});
