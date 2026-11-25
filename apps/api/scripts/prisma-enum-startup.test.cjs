"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const schema = [
  "datasource db {", ' provider = "postgresql"', ' url = env("DATABASE_URL")', "}",
  "enum SystemStatus {", " OPERATIVO", "}",
  "model Device {", " id String @id @db.Uuid", " status SystemStatus", ' @@map("devices")', "}",
].join("\n");

function inspect(enumReady) {
  const parent = path.resolve(os.tmpdir());
  const fixture = fs.mkdtempSync(path.join(parent, "tad-enum-startup-"));
  try {
    const client = path.join(fixture, "client.cjs");
    const generated = path.join(fixture, "generated.prisma");
    const preload = path.join(fixture, "preload.cjs");
    const source = path.resolve(__dirname, "../prisma/schema.prisma");
    const model = { name: "Device", dbName: "devices", fields: [
      { name: "id", type: "String", kind: "scalar", isId: true },
      { name: "status", type: "SystemStatus", kind: "enum", isId: false },
    ] };
    const enums = [{ name: "SystemStatus", values: [{ name: "OPERATIVO", dbName: null }] }];
    fs.writeFileSync(generated, schema);
    fs.writeFileSync(client, `
const enumReady=${JSON.stringify(enumReady)};
class PrismaClient {
  async $transaction(run) {
    let readOnly=false;
    return run({
      $executeRaw:async parts=>{if(parts.join("").includes("SET TRANSACTION READ ONLY"))readOnly=true;return 0;},
      $queryRaw:async parts=>{
        if(!readOnly)throw Error("READ_ONLY_NOT_VERIFIED");
        const sql=parts.join("");
        if(sql.includes("current_setting"))return [{read_only:"on"}];
        if(sql.includes("information_schema.tables"))return [{table_name:"devices"}];
        if(sql.includes("information_schema.columns"))return [
          {table_name:"devices",column_name:"id",udt_schema:"pg_catalog",udt_name:"uuid"},
          {table_name:"devices",column_name:"status",udt_schema:enumReady?"public":"pg_catalog",udt_name:enumReady?"SystemStatus":"text"}];
        if(sql.includes("pg_extension"))return [];
        if(sql.includes("pg_enum"))return enumReady?[{enum_schema:"public",enum_name:"SystemStatus",enum_values:["OPERATIVO"]}]:[];
        throw Error("UNEXPECTED_QUERY");
      },
    });
  }
  async $disconnect() {}
}
module.exports={Prisma:{dmmf:{datamodel:{models:[${JSON.stringify(model)}],enums:${JSON.stringify(enums)}}}},PrismaClient};
`);
    fs.writeFileSync(preload, `
const Module=require("node:module");const fs=require("node:fs");const path=require("node:path");
const resolve=Module._resolveFilename;Module._resolveFilename=function(request,...args){
if(request==="@prisma/client")return ${JSON.stringify(client)};
if(request===".prisma/client/schema.prisma")return ${JSON.stringify(generated)};
return resolve.call(this,request,...args);};
const read=fs.readFileSync;fs.readFileSync=function(file,...args){
if(path.resolve(String(file))===${JSON.stringify(source)})return ${JSON.stringify(schema)};
return read.call(this,file,...args);};
`);
    const env = {};
    for (const key of ["PATH", "Path", "SystemRoot", "WINDIR", "TEMP", "TMP", "PATHEXT", "COMSPEC"])
      if (process.env[key]) env[key] = process.env[key];
    env.DIRECT_URL = "postgresql://synthetic:synthetic@127.0.0.1:1/no_connection";
    const result = spawnSync(process.execPath, ["--require", preload, path.join(__dirname, "check-prisma-drift.cjs")], {
      env, encoding: "utf8", timeout: 15000, windowsHide: true,
    });
    return { status: result.status, report: JSON.parse(result.stdout) };
  } finally {
    const target = path.resolve(fixture);
    assert.equal(path.dirname(target), parent);
    assert.ok(path.basename(target).startsWith("tad-enum-startup-"));
    fs.rmSync(target, { recursive: true, force: true });
  }
}

test("CLI rejects enum-only drift even with all declared tables, columns and IDs present", () => {
  const result = inspect(false);
  assert.equal(result.status, 1);
  assert.equal(result.report.missingTableCount, 0);
  assert.equal(result.report.missingColumnCount, 0);
  assert.equal(result.report.idTypeMismatchCount, 0);
  assert.equal(result.report.enumSqlContractIssueCount, 2);
});

test("CLI accepts the same complete schema with a matching enum type and binding", () => {
  const result = inspect(true);
  assert.equal(result.status, 0);
  assert.equal(result.report.enumSqlContractIssueCount, 0);
});
