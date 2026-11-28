#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

/**
 * Detect duplicate YAML mapping keys before pnpm's frozen install.
 * The pnpm v9 lock format uses indentation-based mappings throughout.
 * This is a structural preflight, not a replacement for pnpm's own parser.
 */
function findDuplicateLockfileMappings(source) {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const stack = [];
  const errors = [];

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (!line.trim() || /^\s*#/.test(line)) continue;

    if (/^\s*\t/.test(line)) {
      errors.push(`line ${index + 1}: tab indentation in pnpm lockfile`);
      continue;
    }

    const match = /^( *)(?:'[^']*'|"[^"]*"|[^#:][^:]*):(?:\s|$)/.exec(line);
    if (!match) continue;

    const indent = match[1].length;
    const key = line.slice(indent, line.indexOf(":", indent));

    while (stack.length && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    const parent = stack[stack.length - 1];
    if (parent) {
      const previous = parent.keys.get(key);
      if (previous) {
        errors.push(
          `line ${index + 1}: duplicate ${key} under ${stack.map((item) => item.key).join(" / ")} (first at line ${previous})`,
        );
      } else {
        parent.keys.set(key, index + 1);
      }
    }
    stack.push({ indent, key, keys: new Map() });
  }

  return errors;
}

/**
 * A duplicate-free YAML document may still decode an empty snapshot as null.
 * pnpm expects a snapshot map; it can throw during resolution when the
 * snapshot is null or contains a dependency at the wrong indentation level.
 */
function findBrokenSnapshotMappings(source) {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const start = lines.findIndex((line) => /^snapshots:\s*$/.test(line));
  if (start < 0) return ["pnpm-lock.yaml is missing the snapshots section"];

  const errors = [];
  let current = null;
  let group = "";

  function finish() {
    if (current && !current.inline && !current.hasChildren) {
      errors.push(`line ${current.line}: empty snapshot mapping ${current.key}`);
    }
  }

  for (let index = start + 1; index < lines.length; index++) {
    const line = lines[index];
    if (!line.trim() || /^\s*#/.test(line)) continue;

    const entry = /^ {2}(\S.*):(?:\s+(.*))?$/.exec(line);
    if (entry) {
      finish();
      const inline = Boolean(entry[2]);
      if (inline && entry[2].trim() !== "{}") {
        errors.push(`line ${index + 1}: unexpected snapshot scalar ${entry[1]}`);
      }
      current = { key: entry[1], line: index + 1, inline, hasChildren: false };
      group = "";
      continue;
    }
    if (!current) continue;

    const section = /^ {4}(\S[^:]*):(?:\s+(.*))?$/.exec(line);
    if (section) {
      current.hasChildren = true;
      group = section[1];
      if (!["dependencies", "optionalDependencies", "transitivePeerDependencies", "optional"].includes(group)) {
        errors.push(`line ${index + 1}: unexpected snapshot field ${group}`);
      }
      continue;
    }

    if (/^ {6}\S/.test(line) && !group) {
      errors.push(`line ${index + 1}: dependency without snapshot group in ${current.key}`);
    }
  }
  finish();
  return errors;
}

if (require.main === module) {
  const lockfile = fs.readFileSync(path.resolve(__dirname, "..", "pnpm-lock.yaml"), "utf8");
  const errors = [
    ...findDuplicateLockfileMappings(lockfile),
    ...findBrokenSnapshotMappings(lockfile),
  ];
  if (errors.length) {
    console.error("pnpm-lock.yaml contains duplicate YAML keys:\n" + errors.join("\n"));
    process.exitCode = 1;
  } else {
    console.log("pnpm lockfile mapping keys: OK");
  }
}

module.exports = { findDuplicateLockfileMappings, findBrokenSnapshotMappings };
