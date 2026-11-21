"use strict";

// TelemetryService.sync() inserts into a PostGIS geography column via raw SQL.
// Prisma's generated DMMF may omit Unsupported("geography(...)") fields,
// so the ordinary schema-column audit cannot reliably detect this dependency.
// This module reads only supplied PostgreSQL catalog metadata.
function auditGpsSqlContract({ models, tables, columns, extensions }) {
  const hasTelemetryModel = models.some(
    (model) => (model.dbName || model.name) === "telemetry",
  );
  const hasTelemetryTable = tables.some(
    ({ table_name }) => table_name === "telemetry",
  );
  const issues = [];

  // Missing tables are already reported by auditPrismaSchema().
  if (hasTelemetryModel && hasTelemetryTable) {
    const coords = columns.find(
      ({ table_name, column_name }) =>
        table_name === "telemetry" && column_name === "coords",
    );
    if (!coords) {
      issues.push({ code: "GPS_COORDS_COLUMN_MISSING", table: "telemetry", column: "coords" });
    } else if (coords.udt_name !== "geography") {
      issues.push({
        code: "GPS_COORDS_TYPE_MISMATCH",
        table: "telemetry",
        column: "coords",
        expected: "geography",
        actual: coords.udt_name,
      });
    }
    if (!extensions.some(({ extname }) => extname === "postgis")) {
      issues.push({ code: "POSTGIS_EXTENSION_MISSING" });
    }
  }

  return { gpsSqlContractIssueCount: issues.length, gpsSqlContractIssues: issues };
}

module.exports = { auditGpsSqlContract };
