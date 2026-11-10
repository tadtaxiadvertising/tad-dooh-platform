'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { findInvalidSnapshotRefs } = require('./check-pnpm-lockfile-snapshots.cjs');

test('rejects nested importer mappings in snapshots', () => {
  const text = `lockfileVersion: '9.0'
importers:
  .:
    dependencies:
      example:
        specifier: ^1.0.0
        version: 1.0.0
snapshots:
  pkg@1.0.0:
    dependencies:
      nested:
        specifier: ^2.0.0
        version: 2.0.0
`;
  assert.equal(findInvalidSnapshotRefs(text).length, 1);
});

test('allows scalar snapshot dependency references and importer objects', () => {
  const text = `lockfileVersion: '9.0'
importers:
  .:
    dependencies:
      example:
        specifier: ^1.0.0
        version: 1.0.0
snapshots:
  pkg@1.0.0:
    dependencies:
      nested: 2.0.0
    optionalDependencies:
      other: 3.0.0
`;
  assert.deepEqual(findInvalidSnapshotRefs(text), []);
});

test('rejects lockfiles without snapshots', () => {
  assert.throws(() => findInvalidSnapshotRefs('lockfileVersion: 9.0'), /missing the snapshots section/);
});
