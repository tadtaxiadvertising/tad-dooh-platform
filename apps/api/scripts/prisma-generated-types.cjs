"use strict";

// Read only the PSL bundled with the same generated client. Runtime DMMF in
// Prisma 5.22 omits native types; database types and uuid() defaults are not a
// substitute for this schema. This small lexer handles strings/comments and
// balanced attribute arguments, and rejects incompatible client/schema pairs.
function invalid() {
  throw new Error("GENERATED_SCHEMA_INCOMPATIBLE");
}
function tokensOf(source) {
  if (typeof source !== "string" || !source.trim()) invalid();
  const tokens = [];
  let i = 0;
  while (i < source.length) {
    const c = source[i];
    if (c === "\n") {
      tokens.push({ text: "\n" });
      i++;
      continue;
    }
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (source.startsWith("//", i)) {
      while (i < source.length && source[i] !== "\n") i++;
      continue;
    }
    if (source.startsWith("/*", i)) {
      i += 2;
      let depth = 1;
      while (i < source.length && depth) {
        if (source.startsWith("/*", i)) {
          depth++;
          i += 2;
        } else if (source.startsWith("*/", i)) {
          depth--;
          i += 2;
        } else {
          if (source[i] === "\n") tokens.push({ text: "\n" });
          i++;
        }
      }
      if (depth) invalid();
      continue;
    }
    if (c === '"') {
      const start = i++;
      while (i < source.length && source[i] !== '"') {
        if (source[i] === "\\") i++;
        i++;
      }
      if (i >= source.length) invalid();
      const text = source.slice(start, ++i);
      try {
        tokens.push({ text, string: JSON.parse(text) });
      } catch {
        invalid();
      }
      continue;
    }
    const word = /^[A-Za-z_][A-Za-z0-9_]*/.exec(source.slice(i));
    if (word) {
      tokens.push({ text: word[0], identifier: true });
      i += word[0].length;
      continue;
    }
    tokens.push({ text: c });
    i++;
  }
  return tokens;
}
function statements(tokens) {
  const result = [];
  let statement = [],
    round = 0,
    square = 0;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.text === "\n") {
      const next = tokens.slice(i + 1).find((t) => t.text !== "\n");
      // An attribute can wrap across lines; a new field starts with an identifier.
      if (!round && !square && next?.text !== "@") {
        if (statement.length) result.push(statement);
        statement = [];
      }
      continue;
    }
    if (token.text === "(") round++;
    if (token.text === ")") round--;
    if (token.text === "[") square++;
    if (token.text === "]") square--;
    if (round < 0 || square < 0) invalid();
    statement.push(token);
  }
  if (round || square) invalid();
  if (statement.length) result.push(statement);
  return result;
}
function attrs(tokens) {
  const out = [];
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].text !== "@") continue;
    const block = tokens[i + 1]?.text === "@";
    if (block) i++;
    const first = tokens[++i];
    if (!first?.identifier) invalid();
    let name = first.text;
    if (tokens[i + 1]?.text === ".") {
      const suffix = tokens[i + 2];
      if (!suffix?.identifier) invalid();
      name += "." + suffix.text;
      i += 2;
    }
    const args = [];
    if (tokens[i + 1]?.text === "(") {
      i += 2;
      let depth = 1;
      for (; i < tokens.length && depth; i++) {
        const t = tokens[i];
        if (t.text === "(") depth++;
        if (t.text === ")") depth--;
        if (depth) args.push(t);
      }
      if (depth) invalid();
      i--;
    }
    out.push({ name, block, args });
  }
  return out;
}
function mapped(attributes, fallback) {
  const maps = attributes.filter((a) => a.name === "map");
  if (maps.length > 1) invalid();
  if (!maps.length) return fallback;
  if (maps[0].args.length !== 1 || typeof maps[0].args[0].string !== "string")
    invalid();
  return maps[0].args[0].string;
}
function stringIdTypes(models, source) {
  const tokens = tokensOf(source).filter(
    (t, i, all) => t.text !== "\n" || all[i - 1]?.text !== "\n",
  );
  const schemaModels = new Map(),
    datasourceNames = new Set();
  for (let i = 0; i < tokens.length;) {
    if (tokens[i].text === "\n") {
      i++;
      continue;
    }
    const kind = tokens[i++].text,
      name = tokens[i++];
    if (
      !["generator", "datasource", "model", "enum", "view", "type"].includes(
        kind,
      ) ||
      !name?.identifier
    )
      invalid();
    while (tokens[i]?.text === "\n") i++;
    if (tokens[i++]?.text !== "{") invalid();
    const start = i;
    let depth = 1;
    while (i < tokens.length && depth) {
      if (tokens[i].text === "{") depth++;
      if (tokens[i].text === "}") depth--;
      if (depth) i++;
    }
    if (depth) invalid();
    const body = tokens.slice(start, i++);
    if (kind === "datasource") datasourceNames.add(name.text);
    if (kind !== "model") continue;
    if (schemaModels.has(name.text)) invalid();
    const fields = new Map();
    let dbName = name.text;
    // Split block attributes separately, even when immediately after a field.
    const rows = statements(body);
    for (const row of rows) {
      const blockAt = row.findIndex(
        (t, ix) => t.text === "@" && row[ix + 1]?.text === "@",
      );
      let fieldTokens = blockAt < 0 ? row : row.slice(0, blockAt);
      const blockAttrs = blockAt < 0 ? [] : attrs(row.slice(blockAt));
      const map = blockAttrs.filter((a) => a.name === "map");
      if (map.length) dbName = mapped(map, dbName);
      if (!fieldTokens.length) continue;
      const [field, type] = fieldTokens;
      if (!field?.identifier || !type?.identifier || fields.has(field.text))
        invalid();
      const attributes = attrs(fieldTokens.slice(2));
      fields.set(field.text, {
        type: type.text,
        dbName: mapped(attributes, field.text),
        attributes,
        isId: attributes.some((a) => a.name === "id" && !a.block),
      });
    }
    schemaModels.set(name.text, { dbName, fields });
  }
  if (
    !Array.isArray(models) ||
    schemaModels.size !== models.length ||
    datasourceNames.size !== 1
  )
    invalid();
  const nativePrefix = [...datasourceNames][0] + ".";
  const expected = new Map();
  for (const model of models) {
    const schema = schemaModels.get(model.name);
    if (!schema || schema.dbName !== (model.dbName || model.name)) invalid();
    const runtimeFields = new Map(model.fields.map((f) => [f.name, f]));
    for (const field of model.fields) {
      const declared = schema.fields.get(field.name);
      if (
        !declared ||
        declared.type !== field.type ||
        declared.dbName !== (field.dbName || field.name) ||
        declared.isId !== Boolean(field.isId)
      )
        invalid();
    }
    // Unsupported fields can be omitted from runtime DMMF. Other extra fields
    // indicate the schema does not belong to this generated client.
    for (const [name, declared] of schema.fields) {
      if (declared.type !== "Unsupported" && !runtimeFields.has(name))
        invalid();
      if (declared.type !== "String" || !declared.isId) continue;
      const native = declared.attributes.filter((a) => a.name.includes("."));
      if (
        native.length > 1 ||
        (native.length && !native[0].name.startsWith(nativePrefix))
      )
        invalid();
      const type = native.length
        ? native[0].name.slice(nativePrefix.length)
        : "Text";
      if (
        !["Uuid", "Text"].includes(type) ||
        (native.length && native[0].args.length)
      )
        invalid();
      expected.set(
        schema.dbName + "." + declared.dbName,
        type === "Uuid" ? "uuid" : "text",
      );
    }
  }
  return expected;
}
module.exports = { stringIdTypes };
