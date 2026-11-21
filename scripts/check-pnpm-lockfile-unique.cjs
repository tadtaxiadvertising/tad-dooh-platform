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

if (require.main === module) {
  const lockfile = fs.readFileSync(path.resolve(__dirname, "..", "pnpm-lock.yaml"), "utf8");
  const errors = findDuplicateLockfileMappings(lockfile);
  if (errors.length) {
    console.error("pnpm-lock.yaml contains duplicate YAML keys:\n" + errors.join("\n"));
    process.exitCode = 1;
  } else {
    console.log("pnpm lockfile mapping keys: OK");
  }
}

module.exports = { findDuplicateLockfileMappings };
