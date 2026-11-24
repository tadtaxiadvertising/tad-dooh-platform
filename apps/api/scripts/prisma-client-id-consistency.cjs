"use strict";

// The generated Prisma.dmmf can omit field.nativeType even when schema.prisma
// declares @db.Uuid. Use the schema text included in the SAME image to derive
// native String primary-key types; compare only model/ID identity to the client.
// This function never reads the database or any credential.
function inspectSchemaStringIds({ schemaSource, models }) {
  const idTypes = new Map();
  const nativeUuidFields = new Set();
  const sourceModels = new Set();
  const issues = [];

  for (const [, modelName, modelBody] of schemaSource.matchAll(
    /^model\s+([A-Za-z]\w*)\s*\{([\s\S]*?)^\}/gm,
  )) {
    sourceModels.add(modelName);
    for (const rawLine of modelBody.split(/\r?\n/)) {
      const line = rawLine.split("//")[0].trim();
      const uuidScalar = line.match(/^([A-Za-z]\w*)\s+String\??\s+.*@db\.Uuid\b/);
      if (uuidScalar) nativeUuidFields.add(modelName + "." + uuidScalar[1]);
      const id = line.match(/^([A-Za-z]\w*)\s+String\s+.*@id\b/);
      if (!id) continue;

      const fieldName = id[1];
      const key = modelName + "." + fieldName;
      const native = line.match(/@db\.([A-Za-z]\w*)\b/)?.[1];
      if (idTypes.has(key)) {
        issues.push({ model: modelName, field: fieldName, code: "DUPLICATE_SOURCE_ID" });
      } else if (native && native !== "Uuid" && native !== "Text") {
        issues.push({ model: modelName, field: fieldName, code: "UNSUPPORTED_ID_NATIVE_TYPE" });
      } else {
        idTypes.set(key, native === "Uuid" ? "uuid" : "text");
      }
    }
  }

  const clientModels = new Map(models.map((model) => [model.name, model]));
  for (const [name, model] of clientModels) {
    if (!sourceModels.has(name)) {
      issues.push({ model: name, field: "", code: "MODEL_MISSING_IN_SCHEMA" });
    }
    for (const field of model.fields) {
      if (field.isId && field.type === "String" &&
          !idTypes.has(name + "." + field.name)) {
        issues.push({ model: name, field: field.name, code: "SOURCE_ID_MISSING" });
      }
    }
  }

  for (const key of nativeUuidFields) {
    // Primary keys have a separate, more precise GENERATED_ID_MISSING check.
    if (idTypes.has(key)) continue;
    const [modelName, fieldName] = key.split(".");
    const field = clientModels.get(modelName)?.fields?.find(
      (candidate) => candidate.name === fieldName,
    );
    if (!field || field.kind !== "scalar" || field.type !== "String" ||
        field.isList) {
      issues.push({ model: modelName, field: fieldName, code: "GENERATED_UUID_FIELD_MISMATCH" });
    }
  }

  for (const key of idTypes.keys()) {
    const [modelName, fieldName] = key.split(".");
    const field = clientModels.get(modelName)?.fields?.find(
      (candidate) => candidate.name === fieldName,
    );
    if (!field || !field.isId || field.type !== "String") {
      issues.push({ model: modelName, field: fieldName, code: "GENERATED_ID_MISSING" });
    }
  }

  issues.sort((a, b) =>
    (a.model + "." + a.field + "." + a.code).localeCompare(
      b.model + "." + b.field + "." + b.code,
    ),
  );
  return { idTypes, nativeUuidFields, issueCount: issues.length, issues };
}

module.exports = { inspectSchemaStringIds };
