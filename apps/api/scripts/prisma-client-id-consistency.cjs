"use strict";

// Compare String primary-key native types in the tracked schema.prisma with
// the generated Prisma client DMMF included in the SAME API image.
// This only inspects source metadata; it does not access PostgreSQL.
// It deliberately does not infer that the deployed image is the latest main.
function auditGeneratedClientIdTypes({ schemaSource, models }) {
  const generated = new Map(models.map((model) => [model.name, model]));
  const mismatches = [];

  for (const [, modelName, modelBody] of schemaSource.matchAll(
    /^model\s+([A-Za-z]\w*)\s*\{([\s\S]*?)^\}/gm,
  )) {
    for (const rawLine of modelBody.split(/\r?\n/)) {
      const line = rawLine.split("//")[0].trim();
      const id = line.match(/^([A-Za-z]\w*)\s+String\s+.*(?:^|\s)@id\b/);
      if (!id) continue;

      const fieldName = id[1];
      const field = generated.get(modelName)?.fields?.find(
        (candidate) => candidate.name === fieldName,
      );
      const expectsUuid = /(?:^|\s)@db\.Uuid\b/.test(line);
      const generatedUuid = field?.nativeType?.[0] === "Uuid";

      if (!field || expectsUuid !== generatedUuid) {
        mismatches.push({
          model: modelName,
          field: fieldName,
          schema: expectsUuid ? "uuid" : "non-uuid",
          client: !field ? "missing" : generatedUuid ? "uuid" : "non-uuid",
        });
      }
    }
  }

  mismatches.sort((a, b) =>
    (a.model + "." + a.field).localeCompare(b.model + "." + b.field),
  );
  return { mismatchCount: mismatches.length, mismatches };
}

module.exports = { auditGeneratedClientIdTypes };
