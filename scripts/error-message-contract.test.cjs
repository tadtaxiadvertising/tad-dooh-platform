'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../packages/services/error-message.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const exported = {};
vm.runInNewContext(compiled, { exports: exported });
const { getErrorMessage } = exported;

test('error messages preserve native errors and upstream API detail', () => {
  assert.equal(getErrorMessage(new Error('Upload failed')), 'Upload failed');
  assert.equal(getErrorMessage({ message: 'Request failed', response: { data: { message: 'File too large' } } }), 'File too large');
  assert.equal(getErrorMessage({ response: { data: { message: ['Email required', 'Password required'] } } }), 'Email required, Password required');
});
test('unknown error payloads cannot become object-valued UI messages', () => {
  for (const error of [null, undefined, 23, 'failure', { message: {} }, { message: [23] }, { response: { data: { message: {} } } }]) {
    assert.equal(getErrorMessage(error, 'Fallback'), 'Fallback');
  }
  assert.equal(getErrorMessage({ response: null, message: 'Local error' }), 'Local error');
  assert.equal(getErrorMessage(new Error(''), 'Fallback'), 'Fallback');
});
