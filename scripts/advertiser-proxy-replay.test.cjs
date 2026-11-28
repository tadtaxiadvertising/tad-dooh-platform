const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('../apps/advertiser/node_modules/typescript');

const source = fs.readFileSync(path.join(__dirname,
  '../apps/advertiser/pages/api/proxy/[...path].ts'), 'utf8');
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

async function exercise(method, route, outcomes, headers = {}) {
  const attempts = [];
  const fixtureBody = Buffer.from('{"fixture":true}');
  const request = {
    method, query: { path: route.split('/') }, cookies: {},
    headers: { host: 'advertiser.fixture.invalid', ...headers },
  };
  const result = { status: null, body: null };
  const response = {
    setHeader() {},
    status(code) { result.status = code; return this; },
    json(body) { result.body = body; return this; },
    send(body) { result.body = body; return this; },
    end() { return this; },
  };
  const module = { exports: {} };
  const requireFixture = name => {
    assert.equal(name, 'next/dist/compiled/raw-body');
    return async () => fixtureBody;
  };
  const fetchFixture = async (url, options) => {
    attempts.push({ url, method: options.method, redirect: options.redirect, body: options.body, headers: options.headers });
    assert.ok(outcomes.length, 'Unexpected extra upstream request');
    const outcome = outcomes.shift();
    if (outcome instanceof Error) throw outcome;
    return new Response(JSON.stringify(outcome.body), {
      status: outcome.status, headers: { 'content-type': 'application/json' },
    });
  };
  new Function('exports', 'module', 'require', 'process', 'fetch', 'console', javascript)(
    module.exports, module, requireFixture, { env: { INTERNAL_BACKEND_URL: 'http://api:3000' } },
    fetchFixture, { error() {}, warn() {}, log() {} },
  );
  await module.exports.default(request, response);
  return { attempts, ...result };
}

test('ambiguous transport failure never replays advertiser registration', async () => {
  for (const message of ['fetch failed', 'ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT']) {
    const result = await exercise('POST', 'onboarding/advertiser', [new Error(message)]);
    assert.equal(result.attempts.length, 1, message);
    assert.equal(result.attempts[0].redirect, 'error');
    assert.equal(result.status, 503);
    assert.equal(result.attempts[0].body.toString(), '{"fixture":true}');
  }
});

test('other non-read requests also fail closed instead of using public fallback', async () => {
  for (const method of ['PUT', 'PATCH', 'DELETE', 'POST']) {
    const result = await exercise(method, 'advertisers/fixture', [new Error('fetch failed')]);
    assert.equal(result.attempts.length, 1, method);
    assert.equal(result.attempts[0].redirect, 'error');
    assert.equal(result.status, 503);
  }
});

test('safe reads retain existing fallback on transport failure', async () => {
  for (const method of ['GET', 'HEAD']) {
    const result = await exercise(method, 'advertisers/fixture', [
      new Error('fetch failed'), { status: 200, body: { ok: true } },
    ]);
    assert.equal(result.attempts.length, 2);
    assert.equal(result.attempts[0].url, 'http://api:3000/api/v1/advertisers/fixture');
    assert.equal(result.attempts[1].url, 'https://proyecto-ia-tad-api.rewvid.easypanel.host/api/v1/advertisers/fixture');
    assert.equal(result.attempts[0].redirect, 'follow');
    assert.equal(result.status, 200);
  }
});

test('successful writes and explicit upstream rejections are forwarded once', async () => {
  for (const status of [201, 400, 409, 503]) {
    const result = await exercise('POST', 'onboarding/advertiser', [{ status, body: { fixture: true } }]);
    assert.equal(result.attempts.length, 1);
    assert.equal(result.status, status);
    assert.equal(result.body.fixture, true);
  }
});

test('onboarding idempotency header reaches the exact upstream route unchanged, without replay', async () => {
  const key = '12345678-1234-4234-8234-123456789abc';
  for (const outcome of [{ status: 201, body: { ok: true } }, new Error('fetch failed')]) {
    const result = await exercise('POST', 'onboarding/advertiser', [outcome], { 'idempotency-key': key });
    assert.equal(result.attempts.length, 1);
    const forwarded = result.attempts[0];
    assert.equal(forwarded.url, 'http://api:3000/api/v1/onboarding/advertiser');
    assert.equal(new Headers(forwarded.headers).get('idempotency-key'), key);
    assert.equal(forwarded.redirect, 'error');
    assert.equal(result.status, outcome instanceof Error ? 503 : 201);
  }
});
