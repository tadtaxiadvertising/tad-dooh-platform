"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

test("generated Media maps one canonical MIME field to the existing nullable TEXT column", () => {
  const directory = fs.mkdtempSync(
    path.join(__dirname, ".media-mapping-test-"),
  );
  const source = fs.readFileSync(
    path.join(__dirname, "../prisma/schema.prisma"),
    "utf8",
  );
  const packagePath = require.resolve("@prisma/client/package.json");
  const generator = path
    .join(path.dirname(packagePath), "generator-build/index.js")
    .replaceAll("\\", "/");
  const cli = require.resolve("prisma/build/index.js");
  const schema =
    "generator client {\n provider = " +
    JSON.stringify('node "' + generator + '"') +
    '\n output = "./generated"\n}\n' +
    source.slice(source.indexOf("datasource db {"));
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
    DATABASE_URL: "postgresql://synthetic:synthetic@127.0.0.1:1/no_connection",
    CHECKPOINT_DISABLE: "1",
    PRISMA_HIDE_UPDATE_MESSAGE: "1",
    PRISMA_GENERATE_SKIP_AUTOINSTALL: "1",
  });
  try {
    const schemaPath = path.join(directory, "schema.prisma");
    fs.writeFileSync(schemaPath, schema);
    const generate = spawnSync(
      process.execPath,
      [cli, "generate", "--schema", schemaPath, "--no-engine", "--no-hints"],
      { cwd: directory, env, encoding: "utf8", timeout: 60000 },
    );
    assert.equal(generate.status, 0, generate.stderr || generate.stdout);
    const { Prisma } = require(path.join(directory, "generated"));
    const media = Prisma.dmmf.datamodel.models.find((m) => m.name === "Media");
    const fields = media.fields.filter(
      (f) => f.name === "mimeType" || f.name === "mime_type",
    );
    assert.equal(
      fields.length,
      1,
      "One physical MIME column must not have two Prisma fields.",
    );
    assert.equal(fields[0].name, "mimeType");
    assert.equal(fields[0].dbName, "mime_type");
    assert.equal(fields[0].type, "String");
    assert.equal(fields[0].isRequired, false);
    const diff = spawnSync(
      process.execPath,
      [
        cli,
        "migrate",
        "diff",
        "--from-empty",
        "--to-schema-datamodel",
        schemaPath,
        "--script",
      ],
      { cwd: directory, env, encoding: "utf8", timeout: 60000 },
    );
    assert.equal(diff.status, 0, diff.stderr || diff.stdout);
    const table = diff.stdout.match(
      /CREATE TABLE (?:"public"\.)?"media" \(([\s\S]*?)\n\);/,
    )?.[1];
    assert.ok(table, "Media table DDL missing from offline diff.");
    assert.match(table, /"mime_type" TEXT(?:,|\r?\n)/);
    assert.doesNotMatch(table, /"mimeType"/);
  } finally {
    const owned = path.resolve(directory);
    assert.equal(path.dirname(owned), path.resolve(__dirname));
    assert.ok(path.basename(owned).startsWith(".media-mapping-test-"));
    fs.rmSync(owned, { recursive: true, force: true });
  }
});
