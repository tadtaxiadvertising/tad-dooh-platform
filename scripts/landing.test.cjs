const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('../apps/advertiser/node_modules/typescript');

// Execute current TypeScript sources with explicit dependencies and synthetic env.
// Unknown imports fail instead of initializing auth clients or reaching a network.
function loadTs(relativePath, options = {}) {
  const filename = path.resolve(__dirname, '..', relativePath);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
    fileName: filename,
  }).outputText;
  const mod = { exports: {} };
  const imports = options.imports || {};
  const requireStub = name => {
    assert.ok(Object.hasOwn(imports, name), `Unexpected import in isolated test: ${name}`);
    return imports[name];
  };
  const execute = new Function('exports', 'require', 'module', 'process', 'window',
    'document', 'navigator', 'Event', 'setTimeout', 'clearTimeout', 'URL', 'atob', 'fetch', 'AbortSignal', compiled);
  execute(mod.exports, requireStub, mod, { env: options.env || {} }, options.window,
    options.document, options.navigator || {}, Event,
    options.setTimeout || (() => { throw new Error('Unexpected real timer.'); }),
    options.clearTimeout || (() => {}), URL, atob,
    options.fetch || (async () => { throw new Error('Unexpected network call in fixture'); }),
    AbortSignal);
  return mod.exports;
}

const modelPath = 'apps/advertiser/lib/landing/model.ts';
const model = loadTs(modelPath);
const DRIVER_ORIGIN = 'https://tad.driver.ibusiness.com.do';

test('advertiser public landing has only one audience and the onboarding engine', () => {
  const landing = fs.readFileSync(path.resolve(__dirname, '..',
    'apps/advertiser/components/landing/LandingPage.tsx'), 'utf8');
  assert.match(landing, /ROLE_CONTENT\.advertiser/);
  assert.match(landing, /estimateCampaignDetailed\(config\)/);
  assert.doesNotMatch(landing, /estimateCampaign\(config\)/);
  assert.match(landing, /setIncludeProduction\] = useState\(false\)/);
  assert.doesNotMatch(landing, /roleButtons|estimateDriverEarnings|landing-driver-path|driver-slots|driver-cpa|ROLES\.map|ROLE_FAQS\[role\]/);
  assert.match(landing, /ROLE_FAQS\.advertiser/);
  const metadata = fs.readFileSync(path.resolve(__dirname, '..',
    'apps/advertiser/app/layout.tsx'), 'utf8');
  assert.doesNotMatch(metadata, /conductor|flota|taxista/i);
});

test('public advertiser onboarding requires production opt-in and retains exact flag', () => {
  const page = fs.readFileSync(path.resolve(__dirname, '..',
    'apps/advertiser/pages/advertiser/onboarding.tsx'), 'utf8');
  assert.match(page, /includeProduction: false/);
  assert.match(page, /includeProduction: simulator\.includeProduction/);
  const harness = landingComponentHarness();
  const total = () => Number(harness.control('budget-total').children.replace(/\D/g, ''));
  harness.render();
  assert.equal(harness.control('campaign-production').type, 'checkbox');
  assert.equal(harness.control('campaign-production').checked, false);
  const initialTotal = total();
  harness.control('campaign-production').onChange({ target: { checked: true } });
  harness.render();
  assert.equal(harness.control('campaign-production').checked, true);
  assert.ok(total() > initialTotal, 'Opting in must include the separate production amount.');
  harness.control('campaign-production').onChange({ target: { checked: false } });
  harness.render();
  assert.equal(harness.control('campaign-production').checked, false);
  assert.equal(total(), initialTotal, 'Disabling production must restore the initial estimate.');
});

test('referral transfer permits a single bounded code and drops other URL data', () => {
  assert.equal(model.referralCodeFromSearch('?ref=a1b2-CODE_09&next=https://other.invalid'), 'a1b2-CODE_09');
  assert.equal(model.referralCodeFromSearch('?ref=550e8400-e29b-41d4-a716-446655440000'), '550e8400-e29b-41d4-a716-446655440000');
  for (const query of ['', '?ref=', '?ref=a&ref=b', '?ref=https://other.invalid', '?ref=hello%20world', '?ref=%3Cscript%3E', `?ref=${'x'.repeat(65)}`]) {
    assert.equal(model.referralCodeFromSearch(query), null);
  }
});

test('campaign handoff accepts only bounded non-contractual preferences', () => {
  const draft = { screens: 12, months: 4, city: 'stgo' };
  const href = model.campaignSignupHref(draft, 'DRIVER_1');
  const url = new URL(href, 'https://fixture.invalid');
  assert.equal(url.pathname, '/advertiser/onboarding');
  assert.deepEqual(model.campaignDraftFromSearch(url.search), draft);
  assert.equal(model.referralCodeFromSearch(url.search), 'DRIVER_1');
  assert.deepEqual([...url.searchParams.keys()], ['screens', 'months', 'city', 'ref']);
  assert.equal(new URL(model.campaignSignupHref(draft, 'https://evil.invalid'), url).searchParams.has('ref'), false);
  for (const query of [
    '', '?screens=12&months=4', '?screens=0&months=4&city=stgo',
    '?screens=16&months=4&city=stgo', '?screens=1.5&months=4&city=stgo',
    '?screens=2&months=13&city=stgo', '?screens=2&months=0&city=stgo',
    '?screens=2&months=4&city=unknown', '?screens=2&screens=3&months=4&city=sd',
    '?screens=2&months=4&months=5&city=sd', '?screens=2&months=4&city=sd&city=stgo',
  ]) assert.equal(model.campaignDraftFromSearch(query), null, query);
  assert.deepEqual(model.campaignDraftFromSearch(
    '?screens=12&months=4&city=stgo&budget=1&includeProduction=true&verifiedDriverCode=true&next=https://evil.invalid'
  ), draft, 'Untrusted price, production and eligibility are ignored');
});

test('campaign budget clamps and rounds to the declared RD$5000 steps', () => {
  for (const [input, expected] of [
    [-1, 5000], [0, 5000], [5000, 5000], [7499.9, 5000], [7500, 10000],
    [10000.1, 10000], [25000, 25000], [150000, 150000], [150001, 150000],
    [Number.MAX_VALUE, 150000],
  ]) assert.equal(model.normalizeBudget(input), expected, `budget ${input}`);
  for (const invalid of [NaN, Infinity, -Infinity]) assert.equal(model.normalizeBudget(invalid), 25000);
});

test('portal overrides use only the canonical origin for the requested portal', () => {
  assert.equal(model.portalOrigin(undefined, 'driver'), DRIVER_ORIGIN);
  assert.equal(model.portalOrigin(`${DRIVER_ORIGIN}/`, 'driver'), DRIVER_ORIGIN);
  for (const override of [
    'https://example.invalid', 'https://tad.driver.ibusiness.com.do.example.invalid',
    'https://other.tad.driver.ibusiness.com.do', 'http://tad.driver.ibusiness.com.do',
    'ftp://tad.driver.ibusiness.com.do', 'javascript:alert(1)', '//example.invalid',
    `${DRIVER_ORIGIN}:444`, `${DRIVER_ORIGIN}/driver/login`, `${DRIVER_ORIGIN}?next=other`,
    `${DRIVER_ORIGIN}#other`, 'https://user:password@tad.driver.ibusiness.com.do',
  ]) assert.equal(model.portalOrigin(override, 'driver'), DRIVER_ORIGIN, override);
});

test('local portal origins require allowLocal and reject credentials, paths, queries and fragments', () => {
  for (const origin of ['http://localhost:3004', 'https://127.0.0.1:9443', 'http://[::1]:3004']) {
    assert.equal(model.portalOrigin(origin, 'driver', true), origin);
    assert.equal(model.portalOrigin(origin, 'driver', false), DRIVER_ORIGIN);
  }
  for (const override of [
    'http://user:password@localhost:3004', 'http://localhost:3004/driver/login',
    'http://localhost:3004?next=elsewhere', 'http://localhost:3004#other',
    'ftp://localhost:3004', 'http://localhost.example.invalid:3004',
  ]) assert.equal(model.portalOrigin(override, 'driver', true), DRIVER_ORIGIN, override);
});

test('landing links retain relative advertiser login and gate onboarding explicitly', () => {
  const production = loadTs(modelPath, { env: {
    NODE_ENV: 'production', NEXT_PUBLIC_DRIVER_URL: 'http://localhost:3004',
  } }).landingLinks();
  assert.equal(production.advertiser, '/advertiser/login');
  assert.equal(production.driver, `${DRIVER_ORIGIN}/driver/login`);
  assert.equal(production.driverLanding, `${DRIVER_ORIGIN}/`);
  assert.equal(production.driverSignup, `${DRIVER_ORIGIN}/register`);
  assert.equal(production.signupEnabled, false);
  const development = loadTs(modelPath, { env: {
    NODE_ENV: 'development', NEXT_PUBLIC_DRIVER_URL: 'http://localhost:3004',
    NEXT_PUBLIC_LANDING_SIGNUP_ENABLED: 'true',
  } }).landingLinks();
  assert.equal(development.driver, 'http://localhost:3004/driver/login');
  assert.equal(development.driverLanding, 'http://localhost:3004/');
  assert.equal(development.driverSignup, 'http://localhost:3004/register');
  assert.equal(development.signupEnabled, true);
  assert.equal(loadTs(modelPath, { env: { NEXT_PUBLIC_LANDING_SIGNUP_ENABLED: 'TRUE' } })
    .landingLinks().signupEnabled, false);
});

function middlewareHarness(options = {}) {
  let supabaseCalls = 0;
  let backendCalls = 0;
  const legal = loadTs('packages/services/cookie-consent.ts');
  const middleware = loadTs('apps/advertiser/middleware.ts', {
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'https://fixture.supabase.invalid',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-fixture',
      BACKEND_INTERNAL_URL: 'http://api.fixture.local:3000',
    },
    fetch: async (target, init) => {
      backendCalls++;
      assert.ok([
        'http://api.fixture.local:3000/api/v1/advertisers/session',
        'http://api.fixture.local:3000/api/v1/advertisers/session/status',
      ].includes(String(target)), 'No unexpected backend or untrusted URL');
      assert.equal(init.redirect, 'error');
      assert.equal(init.cache, 'no-store');
      if (options.backendDown) throw new Error('API offline');
      const suppliedToken = init.headers.Authorization?.slice(7);
      const isOAuth = String(target).endsWith('/session/status');
      if (isOAuth ? (
        options.oauthApiDenied || !options.supabaseToken ||
        suppliedToken !== options.supabaseToken
      ) : (!options.legacyToken || suppliedToken !== options.legacyToken)) {
        return { ok: false, status: 401 };
      }
      return {
        ok: true,
        json: async () => ({
          role: 'ADVERTISER',
          advertiserId: 'advertiser-verified',
          status: isOAuth ? (options.oauthDatabaseStatus || 'ACTIVE')
            : (options.legacyStatus || 'ACTIVE'),
        }),
      };
    },
    imports: {
      '@tad/services/session-cookies': { AUTH_COOKIE_MAX_AGE: 604800 },
      '@tad/services/cookie-consent': { isPublicLegalPath: legal.isPublicLegalPath },
      'next/server': { NextResponse: {
        next: () => ({ kind: 'next', cookies: { set() {} } }),
        redirect: url => ({ kind: 'redirect', destination: url.href }),
      } },
      '@supabase/ssr': { createServerClient() {
        supabaseCalls++;
        if (!options.supabaseUser) throw new Error('Supabase unavailable');
        return { auth: {
          getUser: async () => ({
            data: { user: options.supabaseUser }, error: null,
          }),
          getSession: async () => ({
            data: { session: options.supabaseToken
              ? { access_token: options.supabaseToken } : null },
            error: null,
          }),
        } };
      } },
    },
  }).middleware;
  return {
    async run(pathname, token, sessionKind = 'legacy') {
      const url = new URL(pathname, 'http://127.0.0.1:3003');
      const cookies = token ? [{
        name: sessionKind === 'oauth' ? 'sb-fixture-auth-token' : 'sb-access-token',
        value: token,
      }] : [];
      return middleware({
        url: url.href, nextUrl: url, headers: new Headers(),
        cookies: { getAll: () => cookies, set() {} },
      });
    },
    calls: () => supabaseCalls,
    backendCalls: () => backendCalls,
  };
}

function fixtureToken(role) {
  return `fixture.${Buffer.from(JSON.stringify({ app_metadata: { role } })).toString('base64url')}.signature`;
}

test('guest landing stays public; forged advertiser claims cannot redirect to private pages', async () => {
  const harness = middlewareHarness();
  for (const token of [undefined, 'malformed', fixtureToken('DRIVER'), fixtureToken('ADVERTISER')]) {
    assert.equal((await harness.run('/', token)).kind, 'next');
  }
  assert.equal(harness.calls(), 0);
});

test('private routes fail closed for guest and unsigned advertiser JWT claims', async () => {
  const harness = middlewareHarness();
  for (const pathname of ['/advertiser/dashboard', '/advertiser/campaigns', '/advertiser/billing']) {
    for (const token of [undefined, 'malformed', fixtureToken('ADVERTISER')]) {
      assert.deepEqual(await harness.run(pathname, token), {
        kind: 'redirect', destination: 'http://127.0.0.1:3003/advertiser/login',
      });
    }
  }
  assert.equal(harness.calls(), 0);
});

test('verified legacy login redirects guests and permits only signed active accounts', async () => {
  const token = 'signed-legacy-fixture';
  const harness = middlewareHarness({ legacyToken: token });
  assert.deepEqual(await harness.run('/', token), {
    kind: 'redirect', destination: 'http://127.0.0.1:3003/advertiser/dashboard',
  });
  assert.equal((await harness.run('/advertiser/dashboard', token)).kind, 'next');
  assert.deepEqual(await harness.run('/advertiser/login', token), {
    kind: 'redirect', destination: 'http://127.0.0.1:3003/advertiser/dashboard',
  });
  assert.equal(harness.backendCalls(), 3);
});

test('verified pending advertiser is routed to status, never to a new-account registration form', async () => {
  const token = 'signed-pending-fixture';
  const harness = middlewareHarness({ legacyToken: token, legacyStatus: 'PENDING_REVIEW' });
  for (const pathname of [
    '/advertiser/dashboard', '/advertiser/login', '/advertiser/billing',
  ]) {
    assert.deepEqual(await harness.run(pathname, token), {
      kind: 'redirect',
      destination: 'http://127.0.0.1:3003/advertiser/pending-review',
    });
  }
  const pending = await harness.run('/advertiser/pending-review', token);
  assert.equal(pending.kind, 'next', 'Never create a self-redirect loop');
  assert.equal((await harness.run('/', token)).kind, 'next');
});

test('pending-review status page requires verified identity and cannot leak into active account', async () => {
  const activeToken = 'signed-active-fixture';
  const active = middlewareHarness({ legacyToken: activeToken });
  assert.deepEqual(await active.run('/advertiser/pending-review', activeToken), {
    kind: 'redirect', destination: 'http://127.0.0.1:3003/advertiser/dashboard',
  });
  const guest = middlewareHarness();
  assert.deepEqual(await guest.run('/advertiser/pending-review'), {
    kind: 'redirect', destination: 'http://127.0.0.1:3003/advertiser/login',
  });
  const forged = fixtureToken('ADVERTISER');
  assert.deepEqual(await guest.run('/advertiser/pending-review', forged), {
    kind: 'redirect', destination: 'http://127.0.0.1:3003/advertiser/login',
  });
});

test('pending Supabase OAuth advertiser is also routed to verified status screen', async () => {
  const token = 'oauth-pending-fixture';
  const harness = middlewareHarness({
    supabaseToken: token, oauthDatabaseStatus: 'PENDING_REVIEW',
    // Metadata deliberately absent: PostgreSQL is the source of truth.
    supabaseUser: { app_metadata: { role: 'ADVERTISER' } },
  });
  assert.deepEqual(await harness.run('/advertiser/dashboard', token, 'oauth'), {
    kind: 'redirect',
    destination: 'http://127.0.0.1:3003/advertiser/pending-review',
  });
  assert.equal((await harness.run('/advertiser/pending-review', token, 'oauth')).kind, 'next');
});

test('new OAuth advertiser reaches protected profile completion, never duplicate signup', async () => {
  const token = 'new-oauth-fixture';
  const harness = middlewareHarness({
    supabaseToken: token,
    oauthDatabaseStatus: 'PENDING_ONBOARDING',
    supabaseUser: { app_metadata: { role: 'ADVERTISER' } },
  });
  for (const pathname of [
    '/', '/advertiser/dashboard', '/advertiser/login',
    '/advertiser/pending-review',
  ]) {
    assert.deepEqual(await harness.run(pathname, token, 'oauth'), {
      kind: 'redirect',
      destination: 'http://127.0.0.1:3003/advertiser/oauth/complete-profile',
    });
  }
  assert.equal((await harness.run('/advertiser/oauth/complete-profile', token, 'oauth')).kind,
    'next', 'Existing OAuth profile route must not cause redirect loops');
  assert.equal(harness.backendCalls(), 5);
});

test('OAuth profile completion screen requires verified PENDING_ONBOARDING and is read-only until submit', async () => {
  const token = 'existing-oauth-fixture';
  const active = middlewareHarness({
    supabaseToken: token, oauthDatabaseStatus: 'ACTIVE',
    supabaseUser: { app_metadata: { role: 'ADVERTISER' } },
  });
  assert.deepEqual(await active.run('/advertiser/oauth/complete-profile', token, 'oauth'), {
    kind: 'redirect', destination: 'http://127.0.0.1:3003/advertiser/dashboard',
  });
  const reviewed = middlewareHarness({
    supabaseToken: token, oauthDatabaseStatus: 'PENDING_REVIEW',
    supabaseUser: { app_metadata: { role: 'ADVERTISER' } },
  });
  assert.deepEqual(await reviewed.run('/advertiser/oauth/complete-profile', token, 'oauth'), {
    kind: 'redirect', destination: 'http://127.0.0.1:3003/advertiser/pending-review',
  });
  const guest = middlewareHarness();
  assert.deepEqual(await guest.run('/advertiser/oauth/complete-profile'), {
    kind: 'redirect', destination: 'http://127.0.0.1:3003/advertiser/login',
  });
  const source = fs.readFileSync(path.join(__dirname,
    '../apps/advertiser/pages/advertiser/oauth/complete-profile.tsx'), 'utf8');
  const callback = fs.readFileSync(path.join(__dirname,
    '../packages/ui/components/AuthCallback.tsx'), 'utf8');
  assert.ok(source.includes('/api/proxy/onboarding/advertiser/oauth/profile'));
  assert.ok(!source.includes('createUser('));
  assert.ok(!source.includes('/api/proxy/onboarding/advertiser"'));
  assert.ok(callback.includes("'/advertiser/oauth/complete-profile'"));
  const appShell = fs.readFileSync(path.join(
    __dirname, '../apps/advertiser/pages/_app.tsx'), 'utf8');
  assert.ok(appShell.includes('router.pathname === "/advertiser/oauth/complete-profile"'));
  assert.ok(appShell.includes('router.pathname === "/advertiser/pending-review"'));
  assert.ok(appShell.includes('if (isPublic || isProtectedStatusPage)'));
  // These pages are layoutless but NOT marked public in the middleware.
  const middleware = fs.readFileSync(path.join(
    __dirname, '../apps/advertiser/middleware.ts'), 'utf8');
  const publicEntries = middleware.slice(middleware.indexOf('const PUBLIC_PATHS'),
    middleware.indexOf('interface TrustedAdvertiserSession'));
  assert.ok(!publicEntries.includes('"/advertiser/oauth/complete-profile"'));
  assert.ok(!publicEntries.includes('"/advertiser/pending-review"'));
});

test('public advertiser onboarding remains available for new accounts and status is read-only', () => {
  const screen = fs.readFileSync(path.join(
    __dirname, '../apps/advertiser/pages/advertiser/pending-review.tsx'), 'utf8');
  const middleware = fs.readFileSync(path.join(
    __dirname, '../apps/advertiser/middleware.ts'), 'utf8');
  const publicPaths = middleware.slice(middleware.indexOf("const PUBLIC_PATHS"),
    middleware.indexOf("interface TrustedAdvertiserSession"));
  assert.ok(!publicPaths.includes('"/advertiser/pending-review"'),
    'The pending-review screen must not be publicly bypassable');
  assert.ok(middleware.includes('"/advertiser/onboarding"'),
    'New advertisers retain access to signup');
  assert.ok(screen.includes('noindex,nofollow'));
  assert.ok(screen.includes('No necesitas crear otra'));
  assert.ok(!screen.includes('POST /api/'));
});

test('trusted Supabase OAuth identity permits advertiser but not unknown roles', async () => {
  const token = 'canonical-oauth-cookie-fixture';
  const trusted = middlewareHarness({
    supabaseToken: token,
    oauthDatabaseStatus: 'ACTIVE',
    supabaseUser: { app_metadata: { role: 'ADVERTISER' } },
  });
  assert.equal((await trusted.run('/advertiser/dashboard', token, 'oauth')).kind, 'next');
  assert.equal(trusted.calls(), 1);
  assert.equal(trusted.backendCalls(), 1, 'OAuth status checked against DB-backed API');
  const wrongRole = middlewareHarness({ supabaseUser: {
    app_metadata: { role: 'DRIVER' },
  } });
  assert.deepEqual(await wrongRole.run('/advertiser/dashboard', token, 'oauth'), {
    kind: 'redirect', destination: 'http://127.0.0.1:3003/advertiser/login',
  });
});

test('suspended OAuth sessions cannot enter advertiser private routes', async () => {
  const harness = middlewareHarness({
    supabaseToken: 'suspended-supabase-cookie',
    oauthDatabaseStatus: 'SUSPENDED',
    supabaseUser: { app_metadata: { role: 'ADVERTISER', status: 'ACTIVE' } },
  });
  assert.deepEqual(await harness.run(
    '/advertiser/dashboard', 'suspended-supabase-cookie', 'oauth',
  ), {
    kind: 'redirect', destination: 'http://127.0.0.1:3003/advertiser/login',
  });
});

test('OAuth authorization rejects DB suspension despite stale ACTIVE auth metadata', async () => {
  const token = 'oauth-suspended-test';
  const harness = middlewareHarness({
    supabaseToken: token,
    oauthDatabaseStatus: 'SUSPENDED',
    supabaseUser: { app_metadata: { role: 'ADVERTISER', status: 'ACTIVE' } },
  });
  assert.deepEqual(await harness.run('/advertiser/dashboard', token, 'oauth'), {
    kind: 'redirect', destination: 'http://127.0.0.1:3003/advertiser/login',
  });
  assert.equal(harness.backendCalls(), 1);
});

test('OAuth authorization denies absent status API, invalid token, and fake metadata', async () => {
  const token = 'verified-oauth-fixture';
  for (const options of [
    { oauthApiDenied: true },
    { backendDown: true },
    { oauthDatabaseStatus: 'UNKNOWN' },
  ]) {
    const harness = middlewareHarness({
      ...options, supabaseToken: token,
      supabaseUser: { app_metadata: { role: 'ADVERTISER', status: 'ACTIVE' } },
    });
    assert.deepEqual(await harness.run('/advertiser/dashboard', token, 'oauth'), {
      kind: 'redirect', destination: 'http://127.0.0.1:3003/advertiser/login',
    });
  }
  const withoutAccessToken = middlewareHarness({
    supabaseUser: { app_metadata: { role: 'ADVERTISER', status: 'ACTIVE' } },
  });
  assert.deepEqual(await withoutAccessToken.run(
    '/advertiser/dashboard', token, 'oauth',
  ), {
    kind: 'redirect', destination: 'http://127.0.0.1:3003/advertiser/login',
  });
});

test('Supabase or backend failures never downgrade to unsigned JWT authorization', async () => {
  const token = fixtureToken('ADVERTISER');
  const harness = middlewareHarness({ backendDown: true });
  assert.deepEqual(await harness.run('/advertiser/dashboard', token), {
    kind: 'redirect', destination: 'http://127.0.0.1:3003/advertiser/login',
  });
  const canonical = middlewareHarness();
  assert.deepEqual(await canonical.run('/advertiser/dashboard', token, 'oauth'), {
    kind: 'redirect', destination: 'http://127.0.0.1:3003/advertiser/login',
  });
});

test('real middleware keeps onboarding and legal pages publicly accessible', async () => {
  const harness = middlewareHarness();
  for (const pathname of [
    '/politica-de-cookies', '/politica-de-privacidad',
    '/terminos-de-servicio', '/aviso-legal',
    '/advertiser/onboarding', '/advertiser/auth/callback',
  ]) {
    assert.equal((await harness.run(pathname)).kind, 'next');
  }
  for (const pathname of ['/politica-de-cookies/private', '/advertiser/onboarding/private']) {
    assert.equal((await harness.run(pathname)).kind, 'redirect');
  }
  assert.equal(harness.calls(), 0);
  assert.equal(harness.backendCalls(), 0);
});

test('public crawler metadata bypasses auth only at the two exact paths', async () => {
  const harness = middlewareHarness();
  for (const pathname of ['/robots.txt', '/sitemap.xml']) {
    for (const token of [undefined, 'malformed', fixtureToken('ADVERTISER')]) {
      assert.equal((await harness.run(pathname, token)).kind, 'next');
    }
    assert.equal((await harness.run(pathname + '/private')).kind, 'redirect');
  }
  assert.equal(harness.calls(), 0);
  assert.equal(harness.backendCalls(), 0);
  for (const pathname of ['/advertiser/private.xml', '/advertiser/robots.txt', '/advertiser/dashboard']) {
    assert.equal((await harness.run(pathname)).kind, 'redirect');
  }
});

test('public QR illustration bypasses auth only at its exact asset path', async () => {
  const harness = middlewareHarness();
  for (const token of [undefined, 'malformed', fixtureToken('ADVERTISER')]) {
    assert.equal((await harness.run('/qr-passenger-journey.svg', token)).kind, 'next');
  }
  assert.equal(harness.calls(), 0);
  assert.equal(harness.backendCalls(), 0);
  for (const pathname of [
    '/qr-passenger-journey.svg/private',
    '/advertiser/private.svg',
    '/advertiser/dashboard',
  ]) {
    assert.equal((await harness.run(pathname)).kind, 'redirect');
  }
});

test('Next redirect configuration no longer shadows the root and preserves proxy/login aliases', async () => {
  const redirects = await require('../apps/advertiser/next.config.js').redirects();
  assert.equal(redirects.some(redirect => redirect.source === '/'), false);
  assert.ok(redirects.some(redirect => redirect.source === '/p/advertiser/:path*'
    && redirect.destination === '/advertiser/login' && redirect.permanent === false));
  assert.ok(redirects.some(redirect => redirect.source === '/api/v1/:path*'
    && redirect.destination === '/api/proxy/:path*' && redirect.permanent === true));
});

function analyticsHarness() {
  const values = new Map();
  const events = [];
  const window = Object.assign(new EventTarget(), {
    location: { pathname: '/', search: '?private=fixture' },
    localStorage: {
      getItem: key => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: key => values.delete(key),
    },
    umami: { track: callback => events.push(callback({ url: 'private', referrer: 'private', title: 'private' })) },
  });
  const consent = loadTs('packages/services/cookie-consent.ts', { window });
  return { window, consent, events };
}

function landingComponentHarness({ signupEnabled = false } = {}) {
  const analytics = analyticsHarness();
  const hookValues = [];
  let hookIndex = 0;
  let effects = [];
  let tree;
  const element = (type, props) => ({ type, props: props || {} });
  const sources = loadTs('packages/impact-calculator/sources.ts');
  const impact = loadTs('packages/impact-calculator/index.ts', { imports: { './sources': sources } });
  const pricing = loadTs('apps/advertiser/components/advertiser/simulatorPricing.ts', {
    imports: { '@tad/impact-calculator': impact },
  });
  let projectionCalls = 0;
  let referralClears = 0;
  const measuredPricing = {
    ...pricing,
    estimateCampaignDetailed(config) {
      projectionCalls++;
      return pricing.estimateCampaignDetailed(config);
    },
    estimateCampaign(config) {
      projectionCalls++;
      return pricing.estimateCampaign(config);
    },
  };
  const Landing = loadTs('apps/advertiser/components/landing/LandingPage.tsx', {
    window: analytics.window,
    imports: {
      react: {
        useState(initial) {
          const index = hookIndex++;
          if (!(index in hookValues)) hookValues[index] = initial;
          return [hookValues[index], value => {
            hookValues[index] = typeof value === 'function' ? value(hookValues[index]) : value;
          }];
        },
        useRef(initial) {
          const index = hookIndex++;
          if (!(index in hookValues)) hookValues[index] = { current: initial };
          return hookValues[index];
        },
        useEffect(effect, dependencies) {
          const index = hookIndex++;
          const previous = hookValues[index];
          if (!dependencies || !previous || dependencies.some((value, i) => !Object.is(value, previous[i]))) {
            effects.push(effect);
          }
          hookValues[index] = dependencies;
        },
      },
      'react/jsx-runtime': { jsx: element, jsxs: element, Fragment: 'Fragment' },
      'framer-motion': { motion: new Proxy({}, { get: (_, name) => name }), useReducedMotion: () => true },
      'lucide-react': new Proxy({}, { get: (_, name) => name }),
      '@tad/ui/components/CookieBanner': { default: 'CookieBanner' },
      '@tad/services/cookie-consent': analytics.consent,
      '../../lib/landing/model': loadTs(modelPath, { env: { NEXT_PUBLIC_LANDING_SIGNUP_ENABLED: String(signupEnabled) } }),
      '../../lib/landing/content': loadTs('apps/advertiser/lib/landing/content.ts'),
      '../advertiser/simulatorPricing': measuredPricing,
      '../advertiser/referral': { clearReferralCode() { referralClears++; } },
      './CampaignJourney': { default: 'CampaignJourney' },
      './CreativePreview': { default: 'CreativePreview' },
      './TaxiScrollStory': { default: 'TaxiScrollStory' },
      './PassengerQrStory': { default: 'PassengerQrStory' },
      './CityScene': { default: 'CityScene' },
      './LandingAnalytics': { default: 'LandingAnalytics' },
      './landing.module.css': { default: {} },
    },
  }).default;
  function find(node, id) {
    if (Array.isArray(node)) return node.map(child => find(child, id)).find(Boolean);
    if (!node || typeof node !== 'object') return undefined;
    return node.props.id === id ? node : find(node.props.children, id);
  }
  return {
    ...analytics,
    get projectionCalls() { return projectionCalls; },
    get referralClears() { return referralClears; },
    render() {
      hookIndex = 0;
      tree = Landing();
      const committedEffects = effects;
      effects = [];
      committedEffects.forEach(effect => effect());
    },
    control(id) {
      const node = find(tree, id);
      assert.ok(node, `Missing rendered control: ${id}`);
      return node.props;
    },
  };
}

test('landing invalidates stale referral only on an explicitly malformed link', () => {
  for (const [search, clears, ref] of [
    ['', 0, null],
    ['?ref=VALID_DRIVER', 0, 'VALID_DRIVER'],
    ['?ref=one&ref=two', 1, null],
    ['?ref=', 1, null],
    ['?ref=bad%20code', 1, null],
  ]) {
    const harness = landingComponentHarness({ signupEnabled: true });
    harness.window.location.search = search;
    harness.render();
    harness.render();
    assert.equal(harness.referralClears, clears);
    const destination = new URL(harness.control('campaign-next').href, 'https://fixture.invalid');
    assert.equal(destination.searchParams.get('ref'), ref);
  }
});

test('referral receipt explains pending server validation without changing the budget or exposing the code', () => {
  for (const signupEnabled of [false, true]) {
    for (const [search, received] of [['', false], ['?ref=DRIVER_FIXTURE', true], ['?ref=one&ref=two', false]]) {
      const harness = landingComponentHarness({ signupEnabled });
      harness.window.location.search = search;
      harness.render();
      harness.render();
      const status = harness.control('campaign-referral-status');
      assert.equal(status.role, 'status');
      if (received) {
        assert.match(status.children, /40 %/);
        assert.match(status.children, /validación del servidor/);
        assert.match(status.children, /Este subtotal no incluye el descuento/);
        assert.doesNotMatch(status.children, /DRIVER_FIXTURE/);
      } else {
        assert.equal(status.children, '');
      }
      assert.equal(Number(harness.control('budget-total').children.replace(/\D/g, '')), 15000);
      assert.equal(harness.events.length, 0);
    }
  }
});

test('landing uses one impact projection per render and retains illustrative totals', () => {
  const harness = landingComponentHarness();
  harness.render();
  assert.equal(harness.projectionCalls, 1);
  const total = () => Number(harness.control('budget-total').children.replace(/\D/g, ''));
  assert.equal(total(), 15000);
  harness.control('hero-brand-name').onChange({ target: { value: 'Café TAD' } });
  harness.render();
  assert.equal(harness.projectionCalls, 2);
  assert.equal(total(), 15000);
  harness.control('campaign-production').onChange({ target: { checked: true } });
  harness.render();
  assert.equal(harness.projectionCalls, 3);
  assert.equal(total(), 17500);
  harness.control('campaign-screens').onChange({ target: { value: '12' } });
  harness.control('campaign-months').onChange({ target: { value: '4' } });
  harness.render();
  assert.equal(harness.projectionCalls, 4);
  assert.equal(total(), 122500);
});

test('budget continuation respects signup gate and attributes clicks without personal data', () => {
  for (const signupEnabled of [false, true]) {
    const harness = landingComponentHarness({ signupEnabled });
    harness.window.location.search = '?ref=DRIVER_1&private=fixture';
    harness.render();
    harness.render();
    harness.control('campaign-city').onChange({ target: { value: 'stgo' } });
    harness.control('campaign-screens').onChange({ target: { value: '12' } });
    harness.control('campaign-months').onChange({ target: { value: '4' } });
    harness.render();
    const next = harness.control('campaign-next');
    const url = new URL(next.href, 'https://fixture.invalid');
    assert.equal(url.pathname, signupEnabled ? '/advertiser/onboarding' : '/advertiser/login');
    assert.equal(url.searchParams.get('ref'), 'DRIVER_1');
    assert.equal(url.searchParams.has('private'), false);
    if (signupEnabled) {
      assert.deepEqual(model.campaignDraftFromSearch(url.search), { screens: 12, months: 4, city: 'stgo' });
    }
    next.onClick();
    assert.equal(harness.events.length, 0);
    harness.consent.saveCookieConsent({ essential: true, functional: false, analytics: true, advertisement: false });
    next.onClick();
    assert.deepEqual(harness.events, [{
      url: '/', referrer: '', title: '', name: 'cta_clicked',
      data: { role: 'advertiser', destination: signupEnabled ? 'advertiser_signup' : 'advertiser_login', placement: 'simulator_result' },
    }]);
    harness.consent.saveCookieConsent(harness.consent.ESSENTIAL_ONLY);
    next.onClick();
    assert.equal(harness.events.length, 1);
  }
});

const defaultPreview = { city: 'sd', objective: 'awareness', screens: 3, months: 2, includeProduction: false };

for (const scenario of [
  { label: 'city', id: 'campaign-city', target: { value: 'stgo' }, reset: { value: 'sd' }, prop: 'value', value: 'stgo', next: { city: 'stgo' } },
  { label: 'objective', id: 'campaign-objective', target: { value: 'launch' }, reset: { value: 'awareness' }, prop: 'value', value: 'launch', next: { objective: 'launch' } },
  { label: 'production opt-in', id: 'campaign-production', target: { checked: true }, reset: { checked: false }, prop: 'checked', value: true, next: { includeProduction: true } },
]) {
  test(`landing preview analytics records the selected ${scenario.label} after the interaction`, () => {
    const harness = landingComponentHarness();
    harness.consent.saveCookieConsent({ essential: true, functional: false, analytics: true, advertisement: false });
    harness.render();
    assert.equal(harness.events.length, 0, 'Rendering must not record simulator usage.');
    harness.control(scenario.id).onChange({ target: scenario.target });
    harness.render();
    assert.equal(harness.control(scenario.id)[scenario.prop], scenario.value);
    assert.deepEqual(harness.events.map(event => ({ name: event.name, data: event.data })), [{
      name: 'budget_demo_used', data: { ...defaultPreview, ...scenario.next },
    }]);
    harness.render();
    assert.equal(harness.events.length, 1, 'Rerendering must not emit another usage event.');
    harness.control(scenario.id).onChange({ target: scenario.target });
    harness.render();
    assert.equal(harness.events.length, 1, 'An unchanged scenario must remain deduplicated.');
    harness.control(scenario.id).onChange({ target: scenario.reset });
    harness.render();
    assert.equal(harness.events.length, 2, 'Returning to a previous scenario is a new interaction.');
    assert.deepEqual(harness.events[1].data, defaultPreview);
    assert.equal(harness.control(scenario.id)[scenario.prop], scenario.reset[scenario.prop]);
  });
}

test('landing range analytics retains committed values and deduplicates pointer, blur and keyboard completion', () => {
  const harness = landingComponentHarness();
  harness.consent.saveCookieConsent({ essential: true, functional: false, analytics: true, advertisement: false });
  harness.render();
  harness.control('campaign-screens').onChange({ target: { value: '8' } });
  harness.control('campaign-months').onChange({ target: { value: '4' } });
  harness.render();
  assert.equal(harness.events.length, 0, 'Slider changes must wait for interaction completion.');
  harness.control('campaign-screens').onPointerUp({ type: 'pointerup' });
  harness.control('campaign-screens').onBlur({ type: 'blur' });
  harness.control('campaign-months').onKeyUp({ key: 'ArrowRight' });
  harness.control('campaign-months').onKeyUp({ key: 'Tab' });
  assert.deepEqual(harness.events.map(event => ({ name: event.name, data: event.data })), [{
    name: 'budget_demo_used', data: { ...defaultPreview, screens: 8, months: 4 },
  }]);
});

test('landing interaction analytics stays disabled without opt-in and after consent revocation', () => {
  const harness = landingComponentHarness();
  harness.render();
  harness.control('campaign-city').onChange({ target: { value: 'stgo' } });
  harness.render();
  assert.equal(harness.events.length, 0);
  harness.consent.saveCookieConsent({ essential: true, functional: false, analytics: true, advertisement: false });
  harness.control('campaign-objective').onChange({ target: { value: 'launch' } });
  harness.render();
  assert.equal(harness.events.length, 1);
  assert.equal(harness.events[0].url, '/');
  assert.equal(harness.events[0].referrer, '');
  harness.consent.saveCookieConsent(harness.consent.ESSENTIAL_ONLY);
  harness.control('campaign-production').onChange({ target: { checked: true } });
  harness.render();
  assert.equal(harness.events.length, 1);
});

test('existing analytics helper requires explicit consent and strips URL query/referrer/title', () => {
  const { consent, events } = analyticsHarness();
  consent.trackAnalyticsEvent('role_selected', { role: 'driver' });
  assert.equal(events.length, 0);
  consent.saveCookieConsent(consent.ESSENTIAL_ONLY);
  consent.trackAnalyticsEvent('role_selected', { role: 'driver' });
  assert.equal(events.length, 0);
  consent.saveCookieConsent({ essential: true, functional: false, analytics: true, advertisement: false });
  consent.trackAnalyticsEvent('role_selected', { role: 'driver' });
  assert.deepEqual(events, [{ url: '/', referrer: '', title: '', name: 'role_selected', data: { role: 'driver' } }]);
  consent.saveCookieConsent(consent.ESSENTIAL_ONLY);
  consent.trackAnalyticsEvent('role_selected', { role: 'advertiser' });
  assert.equal(events.length, 1);
});

test('App Router analytics adapter loads only after opt-in and removes script/timer on revocation', () => {
  const { window, consent, events } = analyticsHarness();
  const activeScripts = new Set();
  const timers = new Map();
  let cleanup;
  let nextTimer = 0;
  const document = {
    createElement(tag) {
      assert.equal(tag, 'script');
      return { dataset: {}, remove() { activeScripts.delete(this); } };
    },
    head: { appendChild: script => activeScripts.add(script) },
  };
  const Adapter = loadTs('apps/advertiser/components/landing/LandingAnalytics.tsx', {
    env: { NEXT_PUBLIC_UMAMI_ID: 'fixture-public-id', NEXT_PUBLIC_UMAMI_URL: 'https://analytics.invalid/script.js' },
    window, document,
    setTimeout: (callback, delay) => { const id = ++nextTimer; timers.set(id, { callback, delay }); return id; },
    clearTimeout: id => timers.delete(id),
    imports: { react: { useEffect: effect => { cleanup = effect(); } }, '@tad/services/cookie-consent': consent },
  }).default;
  try {
    assert.equal(Adapter(), null);
    assert.equal(activeScripts.size, 0);
    consent.saveCookieConsent({ essential: true, functional: false, analytics: true, advertisement: false });
    assert.equal(activeScripts.size, 1);
    const [script] = activeScripts;
    assert.equal(script.src, 'https://analytics.invalid/script.js');
    assert.equal(script.dataset.websiteId, 'fixture-public-id');
    assert.equal(script.dataset.autoTrack, 'false');
    assert.equal(script.dataset.doNotTrack, 'true');
    script.onload();
    script.onload();
    assert.equal(events.length, 1);
    assert.equal(events[0].name, 'landing_view');
    assert.equal(events[0].url, '/');
    assert.equal(timers.size, 1);
    consent.saveCookieConsent(consent.ESSENTIAL_ONLY);
    assert.equal(activeScripts.size, 0);
    assert.equal(timers.size, 0);
  } finally {
    if (cleanup) cleanup();
  }
  consent.saveCookieConsent({ essential: true, functional: false, analytics: true, advertisement: false });
  assert.equal(activeScripts.size, 0, 'Unmounting must detach preference listeners.');
});


test('advertiser brand editor is local-only and never alters the budget or analytics payload', () => {
  const harness = landingComponentHarness();
  harness.consent.saveCookieConsent({
    essential: true, functional: false, analytics: true, advertisement: false,
  });
  harness.render();
  const initialTotal = harness.control('budget-total').children;
  const brand = harness.control('hero-brand-name');
  assert.equal(brand.value, '');
  assert.equal(brand.maxLength, 24);
  brand.onChange({ target: { value: 'Café TAD' } });
  harness.render();
  assert.equal(harness.control('hero-brand-name').value, 'Café TAD');
  assert.equal(harness.control('budget-total').children, initialTotal);
  assert.equal(harness.events.length, 0, 'Typing a brand must not send analytics.');

  harness.control('campaign-city').onChange({ target: { value: 'stgo' } });
  harness.render();
  assert.deepEqual(harness.events.map(event => event.data), [
    { ...defaultPreview, city: 'stgo' },
  ], 'Normal preview telemetry must not contain the typed brand.');
  assert.equal(harness.control('hero-brand-name').value, 'Café TAD');
});


// Exercise the real onboarding page with synthetic hooks and an explicitly
// controlled transport. No actual account, campaign or quote request is sent.
function onboardingSubmissionHarness({ referral = null } = {}) {
  const hooks = [];
  let cursor = 0;
  let effects = [];
  let tree;
  const requests = [];
  const pending = [];
  const navigations = [];
  const quoteRequests = [];
  const quotePending = [];
  const quoteTimers = new Map();
  let timerId = 0;
  const cleanups = new Map();
  const react = {
    useState(initial) {
      const i = cursor++;
      if (!(i in hooks)) hooks[i] = initial;
      return [hooks[i], value => { hooks[i] = typeof value === 'function' ? value(hooks[i]) : value; }];
    },
    useRef(initial) {
      const i = cursor++;
      if (!(i in hooks)) hooks[i] = { current: initial };
      return hooks[i];
    },
    useEffect(effect, deps) {
      const i = cursor++;
      if (!hooks[i] || deps.some((value, j) => !Object.is(value, hooks[i][j]))) {
        effects.push(() => {
          cleanups.get(i)?.();
          const cleanup = effect();
          if (typeof cleanup === 'function') cleanups.set(i, cleanup);
          else cleanups.delete(i);
        });
      }
      hooks[i] = deps;
    },
  };
  const jsx = (type, props) => ({ type, props });
  const sources = loadTs('packages/impact-calculator/sources.ts');
  const impact = loadTs('packages/impact-calculator/index.ts', { imports: { './sources': sources } });
  const pricing = loadTs('apps/advertiser/components/advertiser/simulatorPricing.ts', { imports: { '@tad/impact-calculator': impact } });
  const Page = loadTs('apps/advertiser/pages/advertiser/onboarding.tsx', {
    window: {
      location: { search: '?screens=12&months=4&city=stgo&includeProduction=true&budget=1' },
      setTimeout(callback) { quoteTimers.set(++timerId, callback); return timerId; },
      clearTimeout(id) { quoteTimers.delete(id); },
    },
    fetch: (url, options) => {
      if (url === '/api/proxy/onboarding/advertiser/quote') {
        assert.equal(options.method, 'POST');
        quoteRequests.push({ ...JSON.parse(options.body), signal: options.signal });
        return new Promise(resolve => quotePending.push(resolve));
      }
      assert.equal(url, '/api/proxy/onboarding/advertiser');
      assert.equal(options.method, 'POST');
      requests.push(JSON.parse(options.body));
      return new Promise((resolve, reject) => pending.push({ resolve, reject }));
    },
    imports: {
      react,
      'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
      'next/head': { default: 'Head' },
      'next/router': { useRouter: () => ({ push(destination) { navigations.push(destination); } }) },
      clsx: {},
      '@/components/onboarding/OnboardingWizard': { OnboardingWizard: 'Wizard' },
      '@/components/onboarding/BenefitsStep': { default: 'Benefits' },
      '@/components/onboarding/SimulatorStep': { default: 'Simulator' },
      '@/components/onboarding/CommitmentStep': { default: 'Commitment' },
      '@/components/onboarding/SuccessStep': { default: 'Success' },
      '../../components/advertiser/simulatorPricing': pricing,
      '../../lib/landing/model': model,
      '../../components/advertiser/referral': { captureReferralCode: () => referral, clearReferralCode() {} },
    },
  }).default;
  function find(node, type) {
    if (Array.isArray(node)) return node.map(child => find(child, type)).find(Boolean);
    if (!node || typeof node !== 'object') return undefined;
    return node.type === type ? node.props : find(node.props?.children, type);
  }
  return {
    requests,
    navigations,
    quoteRequests,
    expectedOffer(overrides = {}) {
      return impact.calculateAdvertiserOffer({
        screens: 12, months: 4, includeProduction: false, verifiedDriverCode: true, ...overrides,
      });
    },
    runQuoteTimer() {
      assert.equal(quoteTimers.size, 1);
      const [id, callback] = quoteTimers.entries().next().value;
      quoteTimers.delete(id);
      return callback();
    },
    respondQuote(offer) {
      assert.ok(quotePending.length);
      quotePending.shift()({ ok: true, json: async () => offer });
    },
    respond(ok, payload = ok ? { quote: impact.calculateAdvertiserOffer({
      screens: 12, months: 4, includeProduction: false, verifiedDriverCode: Boolean(referral),
    }) } : { message: 'Fixture rejected' }, status = ok ? 201 : 400) {
      assert.ok(pending.length);
      pending.shift().resolve({ ok, status, json: async () => payload });
    },
    loseResponse() {
      assert.ok(pending.length);
      pending.shift().reject(new Error('Fixture connection lost'));
    },
    render() {
      cursor = 0;
      tree = Page();
      const committed = effects;
      effects = [];
      committed.forEach(effect => effect());
    },
    props(type) {
      const props = find(tree, type);
      assert.ok(props, 'Missing onboarding component: ' + type);
      return props;
    },
  };
}

function readyOnboarding() {
  const harness = onboardingSubmissionHarness();
  harness.render();
  harness.render();
  harness.props('Benefits').onNext();
  harness.render();
  const simulator = harness.props('Simulator');
  assert.equal(simulator.config.screens, 12);
  assert.equal(simulator.config.months, 4);
  assert.equal(simulator.city, 'stgo');
  assert.equal(simulator.config.includeProduction, false);
  simulator.onNext();
  harness.render();
  const form = harness.props('Commitment');
  assert.equal(form.campaignSummary.budget, 120000);
  form.onFormChange({ rnc: 'fixture-rnc', repName: 'Fixture', companyName: 'Fixture company', email: 'fixture@example.invalid', phone: 'fixture-phone', password: 'fixture-password' });
  form.onAgreementsChange({ representative: true, terms: true, content_policy: true, data_processing: true });
  harness.render();
  return harness;
}

test('onboarding prevents concurrent and post-success submissions and preserves campaign handoff', async () => {
  const harness = readyOnboarding();
  const submit = harness.props('Commitment').onSubmit;
  const first = submit();
  await submit();
  assert.equal(harness.requests.length, 1);
  assert.equal(harness.requests[0].targetCity, 'Santiago');
  assert.equal(harness.requests[0].expectedScreens, 12);
  assert.equal(harness.requests[0].campaignMonths, 4);
  assert.equal(harness.requests[0].includeProduction, false);
  assert.equal(harness.requests[0].budget, 120000);
  harness.render();
  assert.equal(harness.props('Wizard').navigationLocked, true);
  harness.props('Wizard').onPrev();
  harness.render();
  assert.equal(harness.props('Wizard').step, 3);
  harness.respond(true);
  await first;
  harness.render();
  assert.equal(harness.props('Wizard').step, 4);
  assert.equal(harness.props('Wizard').navigationLocked, true);
  assert.equal(harness.props('Success').campaignData.budget, 120000);
  harness.props('Wizard').onPrev();
  await submit();
  harness.render();
  assert.equal(harness.props('Wizard').step, 4);
  assert.equal(harness.requests.length, 1);
});

test('onboarding releases the client lock after an explicit failed response', async () => {
  const harness = readyOnboarding();
  const first = harness.props('Commitment').onSubmit();
  harness.respond(false);
  await first;
  harness.render();
  assert.equal(harness.props('Commitment').error, 'Fixture rejected');
  assert.equal(harness.props('Wizard').navigationLocked, false);
  const retry = harness.props('Commitment').onSubmit();
  assert.equal(harness.requests.length, 2);
  harness.respond(true);
  await retry;
  harness.render();
  assert.equal(harness.props('Wizard').step, 4);
});


test('only a complete matching server quote may apply a referred advertiser discount', async () => {
  for (const [label, mutate, valid] of [
    ['complete', offer => offer, true],
    ['wrong currency', offer => ({ ...offer, currency: 'USD' }), false],
    ['wrong production choice', offer => ({ ...offer, productionFee: 2500, subtotal: offer.subtotal + 2500 }), false],
    ['negative subtotal', offer => ({ ...offer, subtotal: -1 }), false],
    ['wrong discount', offer => ({ ...offer, discountPercent: 100 }), false],
    ['taxes included', offer => ({ ...offer, taxesIncluded: true }), false],
    ['unverified code', offer => ({ ...offer, verifiedDriverCode: false }), false],
    ['wrong version', offer => ({ ...offer, pricingVersion: 'other-version' }), false],
    ['wrong screen count', offer => ({ ...offer, screens: 13 }), false],
    ['incomplete response', offer => ({ pricingVersion: offer.pricingVersion, verifiedDriverCode: true, screens: 12, months: 4, subtotal: offer.subtotal }), false],
    ['null response', () => null, false],
  ]) {
    const harness = onboardingSubmissionHarness({ referral: 'DRIVER_FIXTURE' });
    harness.render();
    harness.render();
    harness.props('Benefits').onNext();
    harness.render();
    assert.equal(harness.props('Simulator').quoteStatus, 'checking', label);
    const pending = harness.runQuoteTimer();
    assert.equal(harness.quoteRequests.length, 1);
    assert.equal(harness.quoteRequests[0].includeProduction, false);
    harness.respondQuote(mutate(harness.expectedOffer()));
    await pending;
    harness.render();
    const simulator = harness.props('Simulator');
    assert.equal(simulator.quoteStatus, valid ? 'verified' : 'error', label);
    if (valid) assert.equal(simulator.verifiedOffer.subtotal, 72000);
    else assert.equal(simulator.verifiedOffer, null, label);
    simulator.onNext();
    harness.render();
    assert.equal(harness.props('Commitment').campaignSummary.budget, valid ? 72000 : 120000, label);
    if (!valid) {
      await harness.props('Commitment').onSubmit();
      harness.render();
      assert.equal(harness.requests.length, 0, label);
      assert.match(harness.props('Commitment').error, /Verifica tu código/);
    }
  }
});

test('a late quote cannot restore a stale offer after production selection changes', async () => {
  const harness = onboardingSubmissionHarness({ referral: 'DRIVER_FIXTURE' });
  harness.render();
  harness.render();
  harness.props('Benefits').onNext();
  harness.render();
  const oldQuote = harness.runQuoteTimer();
  harness.props('Simulator').onChange({ includeProduction: true });
  harness.render();
  assert.equal(harness.quoteRequests[0].signal.aborted, true);
  const newQuote = harness.runQuoteTimer();
  harness.respondQuote(harness.expectedOffer());
  await oldQuote;
  harness.render();
  assert.equal(harness.props('Simulator').verifiedOffer, null);
  harness.respondQuote(harness.expectedOffer({ includeProduction: true }));
  await newQuote;
  harness.render();
  assert.equal(harness.props('Simulator').quoteStatus, 'verified');
  assert.equal(harness.props('Simulator').verifiedOffer.productionFee, 2500);
  assert.equal(harness.props('Simulator').verifiedOffer.subtotal, 74500);
});


test('successful onboarding never substitutes an estimate for an incomplete or inconsistent receipt', async () => {
  for (const [label, makePayload] of [
    ['missing quote', () => ({})],
    ['partial quote', () => ({ quote: { subtotal: 120000 } })],
    ['wrong currency', h => ({ quote: { ...h.expectedOffer({ verifiedDriverCode: false }), currency: 'USD' } })],
    ['wrong production', h => ({ quote: h.expectedOffer({ verifiedDriverCode: false, includeProduction: true }) })],
    ['negative subtotal', h => ({ quote: { ...h.expectedOffer({ verifiedDriverCode: false }), subtotal: -1 } })],
    ['unexpected referral discount', h => ({ quote: h.expectedOffer() })],
    ['null body', () => null],
  ]) {
    const harness = readyOnboarding();
    const submit = harness.props('Commitment').onSubmit;
    const pending = submit();
    harness.respond(true, makePayload(harness));
    await pending;
    harness.render();
    assert.equal(harness.props('Wizard').step, 4, label);
    assert.equal(harness.props('Success').campaignData.budget, null, label);
    assert.equal(harness.props('Wizard').navigationLocked, true, label);
    await submit();
    assert.equal(harness.requests.length, 1, label);
  }
});


test('ambiguous registration results retain the lock and offer account recovery, never success or resend', async () => {
  for (const status of [null, 408, 409, 500, 502, 503, 504]) {
    const harness = readyOnboarding();
    const submit = harness.props('Commitment').onSubmit;
    const first = submit();
    if (status === null) harness.loseResponse();
    else harness.respond(false, { message: 'Fixture upstream error' }, status);
    await first;
    harness.render();
    assert.equal(harness.props('Wizard').step, 3, String(status));
    assert.equal(harness.props('Wizard').navigationLocked, true);
    assert.equal(harness.props('section')['aria-labelledby'], 'uncertain-registration-title');
    assert.match(harness.props('h1').children, /No pudimos confirmar el resultado/);
    assert.equal(harness.props('button').children, 'Ir a iniciar sesión');
    assert.throws(() => harness.props('Commitment'), /Missing onboarding component/);
    assert.throws(() => harness.props('Success'), /Missing onboarding component/);
    await submit();
    harness.props('Wizard').onPrev();
    harness.props('Wizard').onNext();
    harness.render();
    assert.equal(harness.props('Wizard').step, 3);
    assert.equal(harness.requests.length, 1);
    harness.props('button').onClick();
    assert.deepEqual(harness.navigations, ['/advertiser/login']);
  }
});

test('explicit throttling keeps registration retryable with clear guidance', async () => {
  const harness = readyOnboarding();
  const first = harness.props('Commitment').onSubmit();
  harness.respond(false, { message: 'Fixture throttled' }, 429);
  await first;
  harness.render();
  assert.equal(harness.props('Wizard').navigationLocked, false);
  assert.match(harness.props('Commitment').error, /Espera antes de intentarlo/);
  const retry = harness.props('Commitment').onSubmit();
  assert.equal(harness.requests.length, 2);
  harness.respond(true);
  await retry;
  harness.render();
  assert.equal(harness.props('Wizard').step, 4);
});
