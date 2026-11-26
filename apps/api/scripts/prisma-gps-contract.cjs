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
    } else {
      if (coords.udt_schema !== "extensions") {
        issues.push({ code: "GPS_COORDS_SCHEMA_MISMATCH", table: "telemetry",
          column: "coords", expected: "extensions", actual: coords.udt_schema });
      }
      if (coords.is_nullable !== "NO") {
        issues.push({ code: "GPS_COORDS_NULLABILITY_MISMATCH", table: "telemetry",
          column: "coords", expected: "NO", actual: coords.is_nullable });
      }
      // format_type includes the namespace only when absent from search_path.
      // The independent udt_schema comparison above pins the type namespace.
      const type = typeof coords.formatted_type === "string"
        ? coords.formatted_type.replace(/\s+/g, "") : "";
      if (!["geography(Point,4326)", "extensions.geography(Point,4326)"].includes(type)) {
        issues.push({ code: "GPS_COORDS_TYPMOD_MISMATCH", table: "telemetry",
          column: "coords", expected: "geography(Point,4326)", actual: coords.formatted_type });
      }
    }
    const postgis = extensions.find(({ extname }) => extname === "postgis");
    if (!postgis) {
      issues.push({ code: "POSTGIS_EXTENSION_MISSING" });
    } else if (postgis.extension_schema !== "extensions") {
      issues.push({ code: "POSTGIS_SCHEMA_MISMATCH", expected: "extensions",
        actual: postgis.extension_schema });
    }
  }

  return { gpsSqlContractIssueCount: issues.length, gpsSqlContractIssues: issues };
}

module.exports = { auditGpsSqlContract };
