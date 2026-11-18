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
    'document', 'navigator', 'Event', 'setTimeout', 'clearTimeout', 'URL', 'atob', compiled);
  execute(mod.exports, requireStub, mod, { env: options.env || {} }, options.window,
    options.document, options.navigator || {}, Event,
    options.setTimeout || (() => { throw new Error('Unexpected real timer.'); }),
    options.clearTimeout || (() => {}), URL, atob);
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
  assert.match(landing, /estimateCampaign\(config\)/);
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

function middlewareHarness() {
  let supabaseCalls = 0;
  const legal = loadTs('packages/services/cookie-consent.ts');
  const middleware = loadTs('apps/advertiser/middleware.ts', { imports: {
    '@tad/services/session-cookies': {
      AUTH_COOKIE_MAX_AGE: 604800,
      readAccessTokenCookie: cookies => cookies.find(cookie => cookie.name === 'fixture-session')?.value || null,
    },
    '@tad/services/cookie-consent': { isPublicLegalPath: legal.isPublicLegalPath },
    'next/server': { NextResponse: {
      next: () => ({ kind: 'next', cookies: { set() {} } }),
      redirect: url => ({ kind: 'redirect', destination: url.href }),
    } },
    '@supabase/ssr': { createServerClient() {
      supabaseCalls++;
      throw new Error('Network clients are forbidden in this fixture.');
    } },
  } }).middleware;
  return {
    async run(pathname, token) {
      const url = new URL(pathname, 'http://127.0.0.1:3003');
      const cookies = token ? [{ name: 'fixture-session', value: token }] : [];
      return middleware({ url: url.href, nextUrl: url, headers: new Headers(),
        cookies: { getAll: () => cookies, set() {} } });
    },
    calls: () => supabaseCalls,
  };
}

function fixtureToken(role) {
  return `fixture.${Buffer.from(JSON.stringify({ app_metadata: { role } })).toString('base64url')}.signature`;
}

test('real middleware allows the guest root and retains advertiser root dashboard redirect', async () => {
  const harness = middlewareHarness();
  assert.equal((await harness.run('/')).kind, 'next');
  assert.equal((await harness.run('/', 'malformed')).kind, 'next');
  assert.equal((await harness.run('/', fixtureToken('DRIVER'))).kind, 'next');
  assert.deepEqual(await harness.run('/', fixtureToken('ADVERTISER')), {
    kind: 'redirect', destination: 'http://127.0.0.1:3003/advertiser/dashboard',
  });
  assert.equal(harness.calls(), 0);
});

test('real middleware still protects private pages for guests and malformed sessions', async () => {
  const harness = middlewareHarness();
  for (const pathname of ['/advertiser/dashboard', '/advertiser/campaigns', '/advertiser/billing']) {
    for (const token of [undefined, 'malformed']) {
      assert.deepEqual(await harness.run(pathname, token), {
        kind: 'redirect', destination: 'http://127.0.0.1:3003/advertiser/login',
      });
    }
  }
  assert.equal(harness.calls(), 0);
});

test('real middleware keeps legal pages public without broadening their path prefix', async () => {
  const harness = middlewareHarness();
  for (const pathname of ['/politica-de-cookies', '/politica-de-privacidad', '/terminos-de-servicio', '/aviso-legal']) {
    assert.equal((await harness.run(pathname)).kind, 'next');
    assert.equal((await harness.run(`${pathname}/private`)).kind, 'redirect');
  }
  assert.equal(harness.calls(), 0);
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

function landingComponentHarness() {
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
      '../../lib/landing/model': model,
      '../../lib/landing/content': loadTs('apps/advertiser/lib/landing/content.ts'),
      '../advertiser/simulatorPricing': pricing,
      './CampaignJourney': { default: 'CampaignJourney' },
      './CreativePreview': { default: 'CreativePreview' },
      './TaxiScrollStory': { default: 'TaxiScrollStory' },
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
