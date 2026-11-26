'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const http = require('node:http');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const path = require('node:path');
const { validateOrigin, checkApiReadiness } = require('./check-api-readiness.cjs');

const response = (body, ok = true) => ({ok, json: async () => body});
const happy = async (url, options) => {
  assert.equal(options.redirect, 'error');
  if (url.endsWith('/health/full')) return response({status:'up', db:{connected:true,masterSyncViewReady:true}});
  if (url.endsWith('/health/ready')) return response({status:'up'});
  if (url.endsWith('/health')) return response({status:'up'});
  throw new Error('UNEXPECTED_ROUTE');
};

test('accepts healthy liveness and full readiness', async () => {
  assert.deepEqual(await checkApiReadiness('https://api.example.test', happy), {
    liveness: true, dbConnected: true, masterSyncReady: true,
  });
});

test('verifies the orchestrator endpoint between liveness and full readiness', async () => {
  const paths = [];
  await checkApiReadiness('https://api.example.test', async (url, options) => {
    paths.push(new URL(url).pathname);
    assert.equal(options.method, 'GET');
    assert.equal(options.redirect, 'error');
    assert.equal(options.headers.Accept, 'application/json');
    assert.ok(options.signal instanceof AbortSignal);
    return happy(url, options);
  });
  assert.deepEqual(paths, ['/health', '/health/ready', '/health/full']);
});

test('rejects an unavailable orchestrator endpoint even when full readiness is healthy', async () => {
  const paths = [];
  await assert.rejects(checkApiReadiness('https://api.example.test', async (url, options) => {
    paths.push(new URL(url).pathname);
    return url.endsWith('/health/ready') ? response({status:'degraded'}, false) : happy(url, options);
  }), /HTTP_FAILURE/);
  assert.deepEqual(paths, ['/health', '/health/ready']);
});

test('rejects degraded or malformed orchestrator payloads with HTTP 200', async () => {
  for (const body of [{status:'degraded'}, {}, null]) {
    await assert.rejects(checkApiReadiness('https://api.example.test', async (url, options) => {
      return url.endsWith('/health/ready') ? response(body) : happy(url, options);
    }), /ORCHESTRATOR_READINESS_FAILURE/);
  }
});

test('CLI fails closed for unavailable or degraded orchestrator and keeps payloads private', async (t) => {
  const execute = promisify(execFile);
  let mode = 'unavailable';
  const server = http.createServer((request, result) => {
    result.setHeader('Content-Type', 'application/json');
    if (request.url === '/health/ready') {
      result.statusCode = mode === 'unavailable' ? 503 : 200;
      result.end(JSON.stringify({status: mode === 'healthy' ? 'up' : 'degraded', detail: 'PRIVATE_RESPONSE_FIXTURE'}));
    } else {
      result.end(JSON.stringify({status:'up', db:{connected:true, masterSyncViewReady:true}}));
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const script = path.join(__dirname, 'check-api-readiness.cjs');
  for (const failure of ['unavailable', 'degraded']) {
    mode = failure;
    await assert.rejects(execute(process.execPath, [script, origin], {timeout:15000}), (error) => {
      assert.equal(error.code, 1);
      assert.match(error.stderr, failure === 'unavailable' ? /HTTP_FAILURE/ : /ORCHESTRATOR_READINESS_FAILURE/);
      assert.doesNotMatch(error.stdout + error.stderr, /PRIVATE_RESPONSE_FIXTURE|127\.0\.0\.1/);
      return true;
    });
  }
  mode = 'healthy';
  const success = await execute(process.execPath, [script, origin], {timeout:15000});
  assert.match(success.stdout, /TAD API readiness OK/);
  assert.equal(success.stderr, '');
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
