#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

function findInvalidSnapshotRefs(source) {
  const marker = /^snapshots:\s*$/m;
  const match = marker.exec(source);
  if (!match) throw new Error('pnpm-lock.yaml is missing the snapshots section');

  const lines = source.slice(match.index + match[0].length).split(/\r?\n/);
  const errors = [];
  let section = '';
  let packageName = '';
  let dependencyGroup = '';
  let dependencyName = '';
  const lineOffset = source.slice(0, match.index + match[0].length).split(/\r?\n/).length - 1;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const current = /^( *)(\S[^:]*):(?:\s+(.*))?$/.exec(line);
    if (!current) continue;
    const indent = current[1].length;
    const name = current[2];
    const scalar = current[3] || '';

    if (indent === 0) {
      section = name;
      dependencyGroup = '';
    } else if (indent === 2) {
      packageName = name;
      dependencyGroup = '';
    } else if (indent === 4) {
      dependencyGroup = name;
    } else if (indent === 6 && /^(dependencies|optionalDependencies)$/.test(dependencyGroup)) {
      dependencyName = name;
      if (!scalar.trim() && /^ {8}(?:specifier|version):/m.test(lines[index + 1] || '')) {
        errors.push(`line ${lineOffset + index + 1}: ${packageName} / ${dependencyName} has importer-style mapping`);
      }
    }
  }
  return errors;
}

if (require.main === module) {
  const lockfile = path.resolve(__dirname, '..', 'pnpm-lock.yaml');
  const errors = findInvalidSnapshotRefs(fs.readFileSync(lockfile, 'utf8'));
  if (errors.length) {
    console.error('Invalid pnpm snapshot dependency refs:\n' + errors.join('\n'));
    process.exitCode = 1;
  } else {
    console.log('pnpm lockfile snapshot dependency refs: OK');
  }
}

module.exports = { findInvalidSnapshotRefs };
