"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { auditGpsSqlContract } = require("./prisma-gps-contract.cjs");
const model = { name: "Telemetry", dbName: "telemetry", fields: [] };
const base = {
  models: [model], tables: [{ table_name: "telemetry" }],
  columns: [{ table_name: "telemetry", column_name: "coords", udt_schema: "extensions",
    udt_name: "geography", is_nullable: "NO", formatted_type: "extensions.geography(Point,4326)" }],
  extensions: [{ extname: "postgis", extension_schema: "extensions" }],
};

test("GPS accepts exact native Point4326 in the schema used by raw SQL", () => {
  assert.equal(auditGpsSqlContract(base).gpsSqlContractIssueCount, 0);
  assert.equal(auditGpsSqlContract({ ...base,
    columns: [{ ...base.columns[0], formatted_type: "geography(Point, 4326)" }] }).gpsSqlContractIssueCount, 0);
});

for (const [label, patch, code] of [
  ["wrong type namespace", { udt_schema: "public" }, "GPS_COORDS_SCHEMA_MISMATCH"],
  ["nullable geography", { is_nullable: "YES" }, "GPS_COORDS_NULLABILITY_MISMATCH"],
  ["unknown nullability", { is_nullable: undefined }, "GPS_COORDS_NULLABILITY_MISMATCH"],
  ["wrong SRID", { formatted_type: "extensions.geography(Point,3857)" }, "GPS_COORDS_TYPMOD_MISMATCH"],
  ["wrong shape", { formatted_type: "extensions.geography(LineString,4326)" }, "GPS_COORDS_TYPMOD_MISMATCH"],
  ["third dimension", { formatted_type: "extensions.geography(PointZ,4326)" }, "GPS_COORDS_TYPMOD_MISMATCH"],
  ["unknown typmod", { formatted_type: undefined }, "GPS_COORDS_TYPMOD_MISMATCH"],
]) {
  test("GPS rejects " + label + " before startup", () => {
    const result = auditGpsSqlContract({ ...base, columns: [{ ...base.columns[0], ...patch }] });
    assert.ok(result.gpsSqlContractIssues.some(i => i.code === code));
  });
}

test("GPS rejects an extension installed outside the schema used by raw SQL", () => {
  const result = auditGpsSqlContract({ ...base, extensions: [{ extname: "postgis", extension_schema: "public" }] });
  assert.ok(result.gpsSqlContractIssues.some(i => i.code === "POSTGIS_SCHEMA_MISMATCH"));
});
