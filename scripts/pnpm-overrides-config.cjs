"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

/**
 * Read the literal, version-only overrides tracked in our workspace and lock.
 * This intentionally does not attempt to parse arbitrary YAML: unexpected
 * syntax fails closed so security regression tests cannot silently skip pins.
 */
function readOverrides(fileName = "pnpm-workspace.yaml") {
  if (!["pnpm-workspace.yaml", "pnpm-lock.yaml"].includes(fileName)) {
    throw new Error("Unsupported pnpm overrides source");
  }
  const source = fs.readFileSync(path.join(root, fileName), "utf8")
    .replace(/\r\n?/g, "\n");
  const lines = source.split("\n");
  const start = lines.indexOf("overrides:");
  if (start === -1) throw new Error(fileName + " has no overrides section");

  const entries = {};
  for (const line of lines.slice(start + 1)) {
    if (line.length > 0 && !line.startsWith(" ") && !line.startsWith("#")) break;
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const match = /^  (?:'([^']+)'|([^:#]+)):\s+([^\s#]+)\s*$/.exec(line);
    if (!match) throw new Error("Unexpected override syntax in " + fileName);
    const name = match[1] || match[2];
    if (Object.hasOwn(entries, name)) throw new Error("Duplicate override: " + name);
    entries[name] = match[3];
  }
  if (!Object.keys(entries).length) throw new Error(fileName + " has empty overrides");
  return entries;
}

module.exports = { readOverrides };
