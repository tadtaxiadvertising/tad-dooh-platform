'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function compile(source) {
  return ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
}
function libraryHandler(initial = []) {
  const source = fs.readFileSync(path.join(root, 'apps/advertiser/pages/advertiser/media.tsx'), 'utf8');
  const parsed = ts.createSourceFile('media.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let handler;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(parsed) === 'handleUploadComplete') handler = node.initializer.getText(parsed);
    ts.forEachChild(node, visit);
  }
  visit(parsed);
  assert.ok(handler, 'Execute the actual upload-complete handler.');
  let library = initial;
  const helpers = {};
  const helperPath = path.join(root, 'apps/advertiser/lib/media-asset.ts');
  if (fs.existsSync(helperPath)) vm.runInNewContext(compile(fs.readFileSync(helperPath, 'utf8')), { exports: helpers });
  const exported = {};
  vm.runInNewContext(compile('exports.handle = ' + handler), {
    exports: exported, ...helpers, setMediaLibrary: update => { library = update(library); },
  });
  return { complete: exported.handle, read: () => library };
}
test('upload mediaId becomes the stable library identifier and deduplicates retries', () => {
  const state = libraryHandler();
  const result = { mediaId: 'media-fixture-1', filename: 'fixture.mp4', url: '/fixture.mp4', verified: true };
  state.complete(result);
  assert.equal(state.read()[0].id, result.mediaId);
  state.complete(result);
  assert.equal(state.read().length, 1);
});
test('existing backend IDs and media metadata remain intact', () => {
  const state = libraryHandler();
  state.complete({ id: 'existing-fixture', filename: 'fixture.jpg', cdnUrl: '/fixture.jpg', size: 12 });
  assert.equal(state.read()[0].id, 'existing-fixture');
  assert.equal(state.read()[0].url, '/fixture.jpg');
  assert.equal(state.read()[0].size, 12);
});
