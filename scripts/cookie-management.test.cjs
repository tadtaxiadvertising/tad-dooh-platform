const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');

function loadTs(relativePath) {
  const filename = path.resolve(__dirname, '..', relativePath);
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, filename);
  return mod.exports;
}

function browser() {
  const cookies = new Map();
  const values = new Map();
  global.window = Object.assign(new EventTarget(), {
    location: { protocol: 'https:', pathname: '/driver/dashboard' },
    localStorage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) },
  });
  global.document = {
    get cookie() { return [...cookies].map(([k, v]) => `${k}=${v}`).join('; '); },
    set cookie(raw) {
      const [pair] = raw.split(';');
      const split = pair.indexOf('=');
      const name = pair.slice(0, split);
      if (/max-age=0(?:;|$)/i.test(raw)) cookies.delete(name);
      else cookies.set(name, pair.slice(split + 1));
    },
  };
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://cookie-fixture.supabase.co';
  return cookies;
}

afterEach(() => {
  delete global.window; delete global.document;
  if (navigatorDescriptor) Object.defineProperty(globalThis, 'navigator', navigatorDescriptor);
  else delete global.navigator;
});

test('canonical session uses the SDK base64 format and preserves Unicode', () => {
  const cookies = browser();
  const helper = loadTs('packages/services/session-cookies.ts');
  helper.writeSsrSessionCookie({ access_token: 'fixture', refresh_token: 'refresh', user: { name: 'María 🚕' } });
  const value = cookies.get('sb-cookie-fixture-auth-token');
  assert.ok(value?.startsWith('base64-'));
  const decoded = JSON.parse(Buffer.from(value.slice(7), 'base64url').toString());
  assert.equal(decoded.user.name, 'María 🚕');
});

test('large sessions fit browser cookie limits and shrinking removes stale chunks', () => {
  const cookies = browser();
  const helper = loadTs('packages/services/session-cookies.ts');
  helper.writeSsrSessionCookie({ access_token: 'fixture', user: { metadata: 'x'.repeat(6500) } });
  assert.ok(cookies.size > 1);
  assert.ok([...cookies.values()].every(value => value.length <= 3180));
  helper.writeSsrSessionCookie({ access_token: 'small', user: {} });
  assert.deepEqual([...cookies.keys()], ['sb-cookie-fixture-auth-token']);
});

test('the installed Supabase SSR client reads the actual writer format, including chunks', async () => {
  const cookies = browser();
  const helper = loadTs('packages/services/session-cookies.ts');
  helper.writeSsrSessionCookie({ access_token: 'fixture-access', refresh_token: 'fixture-refresh',
    expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: 'fixture-user', user_metadata: { name: 'María 🚕', long: 'x'.repeat(4000) } } });
  // Exercise SSR in its real server environment, without a browser BroadcastChannel.
  delete global.window;
  delete global.document;
  const { createServerClient } = require('@supabase/ssr');
  const client = createServerClient('https://cookie-fixture.supabase.co', 'fixture-public-key', {
    auth: { autoRefreshToken: false },
    cookies: { getAll: () => [...cookies].map(([name, value]) => ({ name, value })), setAll: () => {} },
  });
  const { data, error } = await client.auth.getSession();
  assert.equal(error, null);
  assert.equal(data.session?.access_token, 'fixture-access');
  assert.equal(data.session?.user.user_metadata.name, 'María 🚕');
});

test('clearing SSR session removes the base cookie and every existing chunk', () => {
  const cookies = browser();
  const helper = loadTs('packages/services/session-cookies.ts');
  cookies.set('sb-cookie-fixture-auth-token', 'old');
  cookies.set('sb-cookie-fixture-auth-token.0', 'old0');
  cookies.set('sb-cookie-fixture-auth-token.2', 'old2');
  cookies.set('unrelated', 'keep');
  helper.clearSsrSessionCookie();
  assert.deepEqual([...cookies.keys()], ['unrelated']);
});

test('reader accepts old cookies and new chunked SDK cookies, scoped to the configured project', () => {
  const cookies = browser();
  const helper = loadTs('packages/services/session-cookies.ts');
  const old = Buffer.from(JSON.stringify({ access_token: 'legacy-canonical' })).toString('base64url');
  assert.equal(helper.readAccessTokenCookie([{ name: 'sb-cookie-fixture-auth-token', value: old }]), 'legacy-canonical');
  helper.writeSsrSessionCookie({ access_token: 'chunked', user: { name: 'x'.repeat(6500) } });
  assert.equal(helper.readAccessTokenCookie([...cookies].map(([name, value]) => ({ name, value }))), 'chunked');
  assert.equal(helper.readAccessTokenCookie([{ name: 'sb-foreign-auth-token', value: old }, { name: 'sb-access-token', value: 'local-token' }]), 'local-token');
});

test('auth cleanup preserves consent, other cookies and local operational data', () => {
  const cookies = browser();
  const helper = loadTs('packages/services/session-cookies.ts');
  helper.writeAccessTokenCookie('token');
  cookies.set('sb-cookie-fixture-auth-token.0', 'part');
  cookies.set('sb-cookie-fixture-auth-token-code-verifier.0', 'verifier');
  cookies.set('preference', 'keep');
  window.localStorage.setItem('tad_cookie_preferences', 'keep');
  window.localStorage.setItem('offline-queue', 'keep');
  helper.clearAuthCookies();
  assert.deepEqual([...cookies.keys()], ['preference']);
  assert.equal(window.localStorage.getItem('tad_cookie_preferences'), 'keep');
  assert.equal(window.localStorage.getItem('offline-queue'), 'keep');
});

test('session cookies are host-only, Secure on HTTPS and SameSite=Lax; HTTP development stays usable', () => {
  browser();
  const written = [];
  Object.defineProperty(global.document, 'cookie', { configurable: true, get: () => '', set: value => written.push(value) });
  const helper = loadTs('packages/services/session-cookies.ts');
  helper.writeAccessTokenCookie('fixture');
  assert.match(written[0], /SameSite=Lax; Secure$/);
  assert.match(written[0], /max-age=604800/);
  assert.doesNotMatch(written[0], /Domain=/i);
  window.location.protocol = 'http:';
  helper.writeAccessTokenCookie('fixture');
  assert.doesNotMatch(written[1], /; Secure/);
});

test('invalid, legacy, expired and future decisions fail closed', () => {
  browser();
  const c = loadTs('packages/services/cookie-consent.ts');
  const saved = c.saveCookieConsent(c.ESSENTIAL_ONLY).consent;
  assert.ok(c.parseCookieConsent(JSON.stringify(saved)));
  for (const invalid of [null, '{}', '{', 'null', JSON.stringify({ analytics: true }),
    JSON.stringify({ ...saved, essential: false }), JSON.stringify({ ...saved, analytics: 'true' }),
    JSON.stringify({ ...saved, policyVersion: 'old' }), JSON.stringify({ ...saved, expiresAt: saved.savedAt }),
    JSON.stringify({ ...saved, savedAt: Date.now() + 10000 })]) assert.equal(c.parseCookieConsent(invalid), null);
  assert.equal(c.parseCookieConsent(JSON.stringify(saved), saved.expiresAt), null);
});

test('one explicit selection atomically stores exact choices; rejecting has the same lifetime', () => {
  browser();
  const c = loadTs('packages/services/cookie-consent.ts');
  let writes = 0;
  const original = window.localStorage.setItem;
  window.localStorage.setItem = (...args) => { writes++; original(...args); };
  c.saveCookieConsent({ essential: true, functional: true, analytics: true, advertisement: true });
  assert.equal(writes, 1);
  assert.equal(c.readCookieConsent().analytics, true);
  assert.equal(c.readCookieConsent().functional, true);
  const accepted = c.readCookieConsent();
  c.saveCookieConsent(c.ESSENTIAL_ONLY);
  const rejected = c.readCookieConsent();
  assert.equal(rejected.analytics, false);
  assert.equal(rejected.advertisement, false);
  assert.equal(accepted.expiresAt - accepted.savedAt, rejected.expiresAt - rejected.savedAt);
  assert.equal(rejected.expiresAt - rejected.savedAt, 180 * 86400000);
});

test('GPC and DNT override earlier opt-in without allowing essential to be disabled', () => {
  browser();
  const c = loadTs('packages/services/cookie-consent.ts');
  c.saveCookieConsent({ essential: true, functional: true, analytics: true, advertisement: true });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { globalPrivacyControl: true } });
  assert.equal(c.hasCookieConsent('analytics'), false);
  assert.equal(c.readCookieConsent().advertisement, false);
  assert.equal(c.readCookieConsent().functional, true);
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { doNotTrack: '1' } });
  assert.equal(c.hasCookieConsent('analytics'), false);
  assert.equal(c.effectiveCookieChoices({ essential: false }).essential, true);
});

test('blocked writes apply revocation in memory even if old opt-in remains readable', () => {
  browser();
  const c = loadTs('packages/services/cookie-consent.ts');
  c.saveCookieConsent({ essential: true, functional: true, analytics: true, advertisement: true });
  window.localStorage.setItem = () => { throw new Error('QuotaExceededError'); };
  assert.equal(c.saveCookieConsent(c.ESSENTIAL_ONLY).persisted, false);
  assert.equal(c.hasCookieConsent('analytics'), false);
  assert.equal(c.readCookieConsent().advertisement, false);
});

test('an external storage change replaces an in-memory choice and fails closed if removed', () => {
  browser();
  const c = loadTs('packages/services/cookie-consent.ts');
  const write = window.localStorage.setItem;
  window.localStorage.setItem = () => { throw new Error('blocked'); };
  c.saveCookieConsent({ essential: true, functional: false, analytics: true, advertisement: false });
  assert.equal(c.hasCookieConsent('analytics'), true);
  c.syncCookieConsentFromStorage();
  assert.equal(c.hasCookieConsent('analytics'), false);
  window.localStorage.setItem = write;
});

test('optional events stop on revocation and pageviews strip URL secrets', () => {
  browser();
  const c = loadTs('packages/services/cookie-consent.ts');
  const sent = [];
  window.umami = { track: callback => sent.push(callback({ url: '/driver?token=secret', referrer: 'private', title: 'private' })) };
  c.trackAnalyticsEvent('login', { status: 'success' });
  assert.equal(sent.length, 0);
  c.saveCookieConsent({ essential: true, functional: false, analytics: true, advertisement: false });
  c.trackAnalyticsPageview(); c.trackAnalyticsEvent('login', { status: 'success' });
  assert.equal(sent.length, 2);
  assert.deepEqual(sent[0], { url: '/driver/dashboard', referrer: '', title: '' });
  assert.equal(sent[1].name, 'login');
  window.location.pathname = '/driver/auth/callback';
  c.trackAnalyticsPageview(); assert.equal(sent.length, 2);
  c.saveCookieConsent(c.ESSENTIAL_ONLY); c.trackAnalyticsEvent('login');
  assert.equal(sent.length, 2);
});

test('legal route bypass is exact and does not expose protected child routes', () => {
  const c = loadTs('packages/services/cookie-consent.ts');
  assert.equal(c.isPublicLegalPath('/politica-de-cookies'), true);
  assert.equal(c.isPublicLegalPath('/aviso-legal'), true);
  assert.equal(c.isPublicLegalPath('/politica-de-cookies/admin'), false);
  assert.equal(c.isPublicLegalPath('/driver/dashboard'), false);
});
