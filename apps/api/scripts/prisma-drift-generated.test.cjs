"use strict";

// Real offline Prisma generation: no database, package installation, or shared writes.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { auditPrismaSchema } = require("./prisma-drift-core.cjs");

test("generated Prisma 5.22 client preserves UUID and TEXT String ID expectations", () => {
  const clientPackage = require.resolve("@prisma/client/package.json");
  const cli = require.resolve("prisma/build/index.js");
  assert.equal(require(clientPackage).version, "5.22.0");
  const generator = path.join(
    path.dirname(clientPackage),
    "generator-build/index.js",
  );
  const directory = fs.mkdtempSync(path.join(__dirname, ".prisma-drift-test-"));
  try {
    const schema = `
generator client {
  provider = ${JSON.stringify(`node "${generator.replaceAll("\\", "/")}"`)}
  output = "./node_modules/.prisma/client"
}
datasource store {
  provider = "postgresql"
  url = "postgresql://synthetic:synthetic@127.0.0.1:1/synthetic"
}
model DefaultString {
  id String @id @default(uuid())
  @@map("default_strings")
}
model UuidString {
  id String @id @default(uuid()) @store.Uuid @map("uuid_key")
  @@map("uuid_strings")
}
model TextString {
  id String @id @store.Text
  @@map("text_strings")
}
`;
    const schemaPath = path.join(directory, "schema.prisma");
    fs.writeFileSync(schemaPath, schema);
    const env = {};
    for (const key of [
      "PATH",
      "Path",
      "SystemRoot",
      "WINDIR",
      "TEMP",
      "TMP",
      "PATHEXT",
      "COMSPEC",
      "NODE_PATH",
    ]) {
      if (process.env[key]) env[key] = process.env[key];
    }
    Object.assign(env, {
      CHECKPOINT_DISABLE: "1",
      PRISMA_HIDE_UPDATE_MESSAGE: "1",
      PRISMA_GENERATE_SKIP_AUTOINSTALL: "1",
    });
    const generated = spawnSync(
      process.execPath,
      [cli, "generate", "--schema", schemaPath, "--no-engine", "--no-hints"],
      {
        cwd: directory,
        env,
        encoding: "utf8",
        timeout: 60000,
      },
    );
    assert.equal(generated.status, 0, generated.stderr || generated.stdout);
    const clientDirectory = path.join(directory, "node_modules/.prisma/client");
    const { Prisma } = require(clientDirectory);
    assert.equal(Prisma.prismaVersion.client, "5.22.0");
    const models = Prisma.dmmf.datamodel.models;
    assert.equal(
      models
        .flatMap((model) => model.fields)
        .some((field) => Object.hasOwn(field, "nativeType")),
      false,
    );
    const generatedSchema = fs.readFileSync(
      path.join(clientDirectory, "schema.prisma"),
      "utf8",
    );
    const report = auditPrismaSchema({
      models,
      generatedSchema,
      tables: ["default_strings", "uuid_strings", "text_strings"].map(
        (table_name) => ({ table_name }),
      ),
      columns: [
        { table_name: "default_strings", column_name: "id", udt_name: "text" },
        {
          table_name: "uuid_strings",
          column_name: "uuid_key",
          udt_name: "uuid",
        },
        { table_name: "text_strings", column_name: "id", udt_name: "text" },
      ],
    });
    assert.deepEqual(report.idTypeMismatches, []);
  } finally {
    const owned = path.resolve(directory);
    assert.equal(path.dirname(owned), path.resolve(__dirname));
    assert.ok(path.basename(owned).startsWith(".prisma-drift-test-"));
    fs.rmSync(owned, { recursive: true, force: true });
  }
});
