"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { stringIdTypes } = require("./prisma-generated-types.cjs");
const { auditPrismaSchema } = require("./prisma-drift-core.cjs");
const models = [
  {
    name: "Example",
    dbName: "examples",
    fields: [
      { name: "id", dbName: "key", type: "String", kind: "scalar", isId: true },
      { name: "note", type: "String", kind: "scalar", isId: false },
    ],
  },
];
function schema(type = "@store.Uuid") {
  return [
    "datasource store {",
    'provider = "postgresql"',
    'url = "postgresql://unused.invalid/no-connection"',
    "}",
    "model Example {",
    "id String @id " + type + ' @map("key")',
    'note String @default("@store.Text model Fake { id String @id }")',
    '@@map("examples")',
    "}",
    "",
  ].join("\n");
}

test("native annotations use the datasource alias and mapped identifiers", () => {
  assert.equal(stringIdTypes(models, schema()).get("examples.key"), "uuid");
  assert.equal(
    stringIdTypes(models, schema("@store.Text")).get("examples.key"),
    "text",
  );
  assert.equal(
    stringIdTypes(models, schema("@default(uuid())")).get("examples.key"),
    "text",
  );
});
test("strings and line/block comments cannot inject a native type", () => {
  const source =
    schema("").replace("id String @id ", "id String @id /* @store.Uuid */ ") +
    "\n// model Extra { id String @id @store.Uuid }\n";
  assert.equal(stringIdTypes(models, source).get("examples.key"), "text");
});
test("balanced multiline attributes preserve field maps", () => {
  const source = schema().replace('@map("key")', '@map(\n "key"\n)');
  assert.equal(stringIdTypes(models, source).get("examples.key"), "uuid");
});
test("native type differences remain observable in both directions", () => {
  const report = (source, actual) =>
    auditPrismaSchema({
      models,
      generatedSchema: source,
      tables: [{ table_name: "examples" }],
      columns: [
        { table_name: "examples", column_name: "key", udt_name: actual },
        { table_name: "examples", column_name: "note", udt_name: "text" },
      ],
    });
  assert.deepEqual(report(schema(), "text").idTypeMismatches, [
    { table: "examples", column: "key", expected: "uuid", actual: "text" },
  ]);
  assert.deepEqual(report(schema(""), "uuid").idTypeMismatches, [
    { table: "examples", column: "key", expected: "text", actual: "uuid" },
  ]);
});
test("mismatched client model, mapped field, type and primary-key metadata fail closed", () => {
  for (const transform of [
    (s) => s.replace("model Example", "model Stale"),
    (s) => s.replace('@@map("examples")', '@@map("stale")'),
    (s) => s.replace('@map("key")', '@map("stale")'),
    (s) => s.replace("note String", "note Int"),
    (s) => s.replace("@id ", ""),
    (s) => s.replace("note String", "extra String\nnote String"),
    (s) => s.replace("note String", "// note String"),
  ])
    assert.throws(
      () => stringIdTypes(models, transform(schema())),
      /GENERATED_SCHEMA_INCOMPATIBLE/,
    );
});
test("unknown native prefixes/types, arguments and malformed schema fail closed", () => {
  for (const type of [
    "@db.Uuid",
    "@store.VarChar(64)",
    "@store.Uuid(4)",
    "@store.Text @store.Uuid",
  ]) {
    assert.throws(
      () => stringIdTypes(models, schema(type)),
      /GENERATED_SCHEMA_INCOMPATIBLE/,
    );
  }
  for (const source of [
    undefined,
    "",
    schema() + "/*",
    schema().slice(0, -3),
    schema().replace('"key"', '"bad\\q"'),
  ]) {
    assert.throws(
      () => stringIdTypes(models, source),
      /GENERATED_SCHEMA_INCOMPATIBLE/,
    );
  }
});

test("CLI validates the generated schema before metadata queries and suppresses diagnostics", async () => {
  const fs = require("node:fs");
  const vm = require("node:vm");
  const source = fs.readFileSync(
    require.resolve("./check-prisma-drift.cjs"),
    "utf8",
  );
  async function run(generatedSchema) {
    // The CLI also executes main's legacy source-ID contract; its fixture uses a plain default.
    // String/comment injection cases remain covered by the lexer tests above.
    generatedSchema = generatedSchema.replace(
      /note String @default\([^\n]*\)/,
      "note String",
    );
    let queries = 0,
      disconnected = false;
    const logs = [],
      errors = [],
      runtime = { env: { DIRECT_URL: "synthetic-connection-DO-NOT-LOG" } };
    const stop = new Error("EXPECTED_EXIT");
    runtime.exit = (code) => {
      runtime.exitCode = code;
      throw stop;
    };
    class Client {
      async $transaction(read) {
        return read(this);
      }
      async $executeRaw() {}
      async $queryRaw(sql) {
        if (sql.join("").includes("current_setting")) {
          return [{ read_only: "on" }];
        }
        queries++;
        return queries === 3
          ? []
          : queries === 1
            ? [{ table_name: "examples" }]
            : [
                {
                  table_name: "examples",
                  column_name: "key",
                  udt_name: "text",
                },
                {
                  table_name: "examples",
                  column_name: "note",
                  udt_name: "text",
                },
              ];
      }
      async $disconnect() {
        disconnected = true;
      }
    }
    function load(name) {
      if (name === "node:fs") return { readFileSync: () => generatedSchema };
      if (name === "@prisma/client")
        return {
          Prisma: { dmmf: { datamodel: { models } } },
          PrismaClient: Client,
        };
      return require(name);
    }
    load.resolve = () => "/synthetic/schema.prisma";
    try {
      vm.runInNewContext(source, {
        __dirname: require("node:path").dirname(
          require.resolve("./check-prisma-drift.cjs"),
        ),
        require: load,
        process: runtime,
        console: {
          log: (v) => logs.push(v),
          error: (v) => errors.push(v),
        },
      });
    } catch (error) {
      if (error !== stop) throw error;
    }
    for (let i = 0; i < 10 && !disconnected; i++)
      await new Promise(setImmediate);
    assert.equal(disconnected, queries > 0);
    assert.ok(!JSON.stringify({ logs, errors }).includes("DO-NOT-LOG"));
    return { queries, logs, errors, exitCode: runtime.exitCode };
  }
  const invalid = await run(
    schema().replaceAll("store", "db").replace("model Example", "model Stale"),
  );
  assert.equal(invalid.queries, 0);
  assert.equal(invalid.exitCode, 2);
  assert.ok(invalid.errors.length > 0);
  assert.ok(!JSON.stringify(invalid.errors).includes("synthetic-connection"));
  const valid = await run(schema().replaceAll("store", "db"));
  assert.equal(valid.queries, 3);
  assert.equal(valid.exitCode, 1);
  assert.equal(JSON.parse(valid.logs[0]).idTypeMismatches[0].expected, "uuid");
});
