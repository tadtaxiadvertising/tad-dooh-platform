'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { validateOrigin, checkApiReadiness } = require('./check-api-readiness.cjs');

const response = (body, ok = true) => ({ok, json: async () => body});
const happy = async (url, options) => {
  assert.equal(options.redirect, 'error');
  if (url.endsWith('/health/full')) return response({status:'up', db:{connected:true,masterSyncViewReady:true}});
  if (url.endsWith('/health')) return response({status:'up'});
  throw new Error('UNEXPECTED_ROUTE');
};

test('accepts healthy liveness and full readiness', async () => {
  assert.deepEqual(await checkApiReadiness('https://api.example.test', happy), {
    liveness: true, dbConnected: true, masterSyncReady: true,
  });
});
test('rejects degraded master sync even when endpoint responds HTTP 200', async () => {
  const fetcher = async (url) => url.endsWith('/health/full')
    ? response({status:'degraded',db:{connected:true,masterSyncViewReady:false}})
    : response({status:'up'});
  await assert.rejects(checkApiReadiness('https://api.example.test', fetcher), /READINESS_FAILURE/);
});
test('rejects disconnected database and no liveness', async () => {
  const fetcher = async (url) => url.endsWith('/health/full')
    ? response({status:'up',db:{connected:false,masterSyncViewReady:true}})
    : response({status:'up'});
  await assert.rejects(checkApiReadiness('https://api.example.test', fetcher), /READINESS_FAILURE/);
  await assert.rejects(checkApiReadiness('https://api.example.test', async () => response({status:'down'})), /LIVENESS_FAILURE/);
});
test('rejects HTTP failures and unexpected payloads', async () => {
  await assert.rejects(checkApiReadiness('https://api.example.test', async () => response(null, false)), /HTTP_FAILURE/);
  await assert.rejects(checkApiReadiness('https://api.example.test', async () => response({other:'value'})), /LIVENESS_FAILURE/);
});
test('forbids credentials, paths, querystrings and unencrypted nonlocal HTTP', () => {
  for (const input of ['', 'http://api.example.test', 'https://user:pass@api.example.test/', 'https://api.example.test/path', 'https://api.example.test/?token=secret', 'https://api.example.test/#fragment']) {
    assert.throws(() => validateOrigin(input));
  }
  assert.equal(validateOrigin('http://localhost:3000'), 'http://localhost:3000');
});
