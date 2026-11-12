const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('../apps/advertiser/node_modules/typescript');

// Compile current sources without initializing real providers, storage or clients.
function loadTs(relativePath, options = {}) {
  const filename = path.resolve(__dirname, '..', relativePath);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const mod = { exports: {} };
  const requireStub = name => {
    options.importLog?.push(name);
    if (Object.hasOwn(options.imports || {}, name)) return options.imports[name];
    if (options.resolveImport) return options.resolveImport(name);
    throw new Error(`Unexpected import in isolated driver test: ${name}`);
  };
  const execute = new Function('exports', 'require', 'module', 'process', 'window',
    'document', 'navigator', 'URL', 'atob', source);
  execute(mod.exports, requireStub, mod, { env: options.env || {} },
    undefined, undefined, {}, URL, atob);
  return mod.exports;
}

function middlewareHarness() {
  let supabaseCalls = 0;
  const legal = loadTs('packages/services/cookie-consent.ts');
  const middleware = loadTs('apps/driver/middleware.ts', { imports: {
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
      throw new Error('Real clients are forbidden in this fixture.');
    } },
  } }).middleware;
  return {
    async run(pathname, token) {
      const url = new URL(pathname, 'http://127.0.0.1:3004');
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

test('driver guest root is public, including malformed and other-role sessions', async () => {
  const harness = middlewareHarness();
  for (const token of [undefined, 'malformed', fixtureToken('ADVERTISER')]) {
    assert.equal((await harness.run('/', token)).kind, 'next');
  }
  assert.equal(harness.calls(), 0);
});

test('driver root and login retain the previous DRIVER dashboard redirect', async () => {
  const harness = middlewareHarness();
  for (const pathname of ['/', '/driver/login', '/login']) {
    assert.deepEqual(await harness.run(pathname, fixtureToken('DRIVER')), {
      kind: 'redirect', destination: 'http://127.0.0.1:3004/driver/dashboard',
    });
  }
  assert.equal(harness.calls(), 0);
});

test('driver private pages still redirect guests and malformed sessions to login', async () => {
  const harness = middlewareHarness();
  for (const pathname of ['/driver/dashboard', '/driver/earnings', '/driver/profile']) {
    for (const token of [undefined, 'malformed', fixtureToken('ADVERTISER')]) {
      assert.deepEqual(await harness.run(pathname, token), {
        kind: 'redirect', destination: 'http://127.0.0.1:3004/driver/login',
      });
    }
  }
  assert.equal(harness.calls(), 0);
});

test('driver legal pages remain public without exposing arbitrary descendants', async () => {
  const harness = middlewareHarness();
  for (const pathname of ['/politica-de-cookies', '/politica-de-privacidad', '/terminos-de-servicio', '/aviso-legal']) {
    assert.equal((await harness.run(pathname)).kind, 'next');
    assert.equal((await harness.run(`${pathname}/private`)).kind, 'redirect');
  }
  assert.equal(harness.calls(), 0);
});

test('the landing logo is public without exposing arbitrary SVG or descendants', async () => {
  const harness = middlewareHarness();
  assert.equal((await harness.run('/tad-logo-dark-mode.svg')).kind, 'next');
  for (const pathname of ['/tad-logo-dark-mode.svg/private', '/private.svg']) {
    assert.equal((await harness.run(pathname)).kind, 'redirect');
  }
});

function appHarness() {
  const importLog = [];
  const dynamicTypes = [];
  const loaders = [];
  const CookieBanner = () => null;
  const ConsentAnalytics = () => null;
  const jsx = (type, props) => ({ type, props: props || {} });
  const App = loadTs('apps/driver/pages/_app.tsx', { importLog, imports: {
    '../styles/globals.css': {},
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: Symbol('Fragment') },
    'next/dynamic': { __esModule: true, default: loader => {
      loaders.push(loader);
      const DeferredPrivateApp = () => { throw new Error('Private rendering was not requested by this unit test.'); };
      dynamicTypes.push(DeferredPrivateApp);
      return DeferredPrivateApp;
    } },
    '@tad/ui/components/CookieBanner': { __esModule: true, default: CookieBanner },
    '@tad/ui/components/ConsentAnalytics': { ConsentAnalytics },
  } }).default;
  return { App, importLog, dynamicTypes, loaders, CookieBanner, ConsentAnalytics };
}

function nodes(node) {
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (!node || typeof node !== 'object') return [];
  return [node, ...nodes(node.props?.children)];
}

test('driver public app root renders page and consent without loading private providers', () => {
  const harness = appHarness();
  const Page = () => null;
  const pageProps = { fixture: 'public' };
  const tree = nodes(harness.App({ Component: Page, pageProps, router: { pathname: '/' } }));
  assert.equal(tree.filter(node => node.type === Page).length, 1);
  assert.deepEqual(tree.find(node => node.type === Page).props, pageProps);
  assert.equal(tree.filter(node => node.type === harness.CookieBanner).length, 1);
  assert.equal(tree.filter(node => node.type === harness.ConsentAnalytics).length, 1);
  assert.equal(tree.some(node => harness.dynamicTypes.includes(node.type)), false);
  assert.equal(harness.importLog.some(name => name.includes('PrivateDriverApp')), false);
  assert.equal(harness.importLog.includes('@tad/ui'), false);
  assert.equal(harness.importLog.some(name => /supabase|mobile-gateway|query|Notification|logging/.test(name)), false);
  assert.equal(harness.loaders.length, 1, 'Private shell should have one deferred import.');
});

test('driver non-root app routes delegate the original props to the deferred private shell', () => {
  const harness = appHarness();
  const Page = () => null;
  for (const pathname of ['/driver/dashboard', '/driver/login', '/register', '/politica-de-cookies']) {
    const props = { Component: Page, pageProps: { fixture: pathname }, router: { pathname } };
    const tree = nodes(harness.App(props));
    const delegated = tree.find(node => harness.dynamicTypes.includes(node.type));
    assert.ok(delegated, `Delegate ${pathname} to the existing shell.`);
    assert.equal(delegated.props.Component, Page);
    assert.equal(delegated.props.router, props.router);
    assert.equal(delegated.props.pageProps, props.pageProps);
    assert.equal(tree.some(node => node.type === harness.CookieBanner), false,
      'The existing private shell owns its consent UI.');
  }
  assert.equal(harness.importLog.some(name => name.includes('PrivateDriverApp')), false,
    'Creating a deferred element must not synchronously evaluate its loader.');
});

test('driver index reexports the dedicated landing component', () => {
  const Landing = () => null;
  const importLog = [];
  const index = loadTs('apps/driver/pages/index.tsx', { importLog,
    resolveImport(name) {
      assert.match(name, /components\/landing\/DriverLandingPage$/);
      return { __esModule: true, default: Landing };
    },
  });
  assert.equal(index.default, Landing);
  assert.equal(importLog.length, 1);
});

function landingHarness(env = {}) {
  const jsx = (type, props) => ({ type, props: props || {} });
  const Image = () => null;
  const EarningsLab = () => null;
  const taxiImage = { src: '/_next/static/media/tad-driver-taxi-headrest.fixture.png',
    width: 1536, height: 1024 };
  const imports = {
    react: { useState: initial => [initial, () => {}] },
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: Symbol('Fragment') },
    'next/head': { __esModule: true, default: () => null },
    'next/image': { __esModule: true, default: Image },
    'lucide-react': new Proxy({}, { get: () => () => null }),
    './driver-landing.module.css': { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) },
    './DriverEarningsLab': { __esModule: true, default: EarningsLab },
    '../../public/tad-driver-taxi-headrest.png': { __esModule: true, default: taxiImage },
  };
  const Landing = loadTs('apps/driver/components/landing/DriverLandingPage.tsx', { imports, env }).default;
  return { tree: nodes(Landing()), Image, EarningsLab, taxiImage };
}

test('driver landing uses native links so hovering cannot prefetch private pages', () => {
  const { tree } = landingHarness();
  const linkedNodes = tree.filter(node => typeof node.props.href === 'string');
  for (const link of linkedNodes) {
    if (link.type === 'link') assert.equal(link.props.rel, 'canonical');
    else assert.equal(link.type, 'a');
  }
  for (const destination of ['/driver/login', '/politica-de-privacidad', '/terminos-de-servicio', '/politica-de-cookies', '/aviso-legal']) {
    assert.ok(linkedNodes.some(node => node.props.href === destination), destination);
  }
  assert.ok(linkedNodes.some(node => node.props.href === 'https://tad.anunciante.ibusiness.com.do/'),
    'Drivers can reach the advertiser experience without a third public profile.');
  assert.equal(linkedNodes.some(node => node.props.href === '/register'), false);
});

test('driver hero renders the local approved PNG through next/image with intrinsic dimensions and priority', () => {
  const { tree, Image, taxiImage } = landingHarness();
  const hero = tree.find(node => node.type === 'section' && node.props['aria-labelledby'] === 'hero-title');
  const [intro, visual, opportunityChoices] = hero.props.children;
  assert.equal(intro.type, 'div', 'Lead copy must be first in reading order.');
  assert.equal(typeof visual.type, 'function', 'The approved taxi follows the intro.');
  assert.equal(opportunityChoices.type, 'div', 'Opportunity chapters follow the taxi.');
  assert.ok(nodes(opportunityChoices).some(node =>
    node.type === 'ul' &&
    node.props['aria-label'] === 'Explora las tres oportunidades para conductores'),
    'Three opportunities remain directly interactive and visible after the taxi.');
  const images = nodes(visual.type(visual.props)).filter(node => node.type === Image);
  assert.equal(images.length, 1, 'Use one taxi image; the asset already includes its screen callout.');
  const image = images[0].props;
  assert.ok(image.src === taxiImage, 'Preserve the static import so Next emits a public media file.');
  assert.equal(image.width, taxiImage.width);
  assert.equal(image.height, taxiImage.height);
  assert.equal(image.priority, true);
  assert.equal(image.sizes, '(max-width: 580px) calc(100vw - 36px), (max-width: 800px) 600px, (max-width: 1100px) 45vw, 600px');
  assert.match(image.alt, /taxi gris/i);
  assert.match(image.alt, /detrás del reposacabezas del copiloto/i);
  assert.match(image.alt, /pasajeros/i);
  const asset = fs.readFileSync(path.resolve(__dirname, '../apps/driver/public/tad-driver-taxi-headrest.png'));
  assert.deepEqual([...asset.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(asset.readUInt32BE(8), 13, 'PNG must start with its complete IHDR chunk.');
  assert.equal(asset.toString('ascii', 12, 16), 'IHDR');
  assert.equal(asset.readUInt32BE(16), image.width, 'The rendered width must match the actual PNG IHDR.');
  assert.equal(asset.readUInt32BE(20), image.height, 'The rendered height must match the actual PNG IHDR.');
  assert.equal(asset.readUInt32BE(asset.length - 12), 0);
  assert.equal(asset.toString('ascii', asset.length - 8, asset.length - 4), 'IEND',
    'The checked-in PNG must include its final chunk.');
});

test('driver landing forwards the signup feature flag and preserves its corresponding participation destination', () => {
  for (const [value, enabled] of [[undefined, false], ['false', false], ['true', true]]) {
    const { tree, EarningsLab } = landingHarness({ NEXT_PUBLIC_LANDING_SIGNUP_ENABLED: value });
    assert.equal(tree.find(node => node.type === EarningsLab).props.signupEnabled, enabled);
    const hero = tree.find(node => node.type === 'section' && node.props['aria-labelledby'] === 'hero-title');
    const links = nodes(hero).filter(node => node.type === 'a');
    assert.equal(links[0].props.href, '#calculadora');
    assert.equal(links[1].props.href, enabled ? '#como-participar' : '#condiciones');
  }
});

test('driver preview applies the absolute 15-ad cap and models three streams separately', () => {
  const { previewDriverEarnings } = loadTs('apps/driver/lib/earningsPreview.ts');
  assert.deepEqual(previewDriverEarnings(8, 2, 3), {
    ads: 8, sales: 2, referrals: 3,
    screenAdsRD: 4000, salesRD: 1000, referralsRD: 1500,
    recurringMonthlyExampleRD: 4000, oneTimeEventsExampleRD: 2500,
    illustrativeTotalRD: 6500,
  });
  assert.equal(previewDriverEarnings(15, 0, 0).illustrativeTotalRD, 7500);
  assert.equal(previewDriverEarnings(100, 0, 0).illustrativeTotalRD, 7500);
  assert.equal(previewDriverEarnings(100, 1, 1).illustrativeTotalRD, 8500);
  for (const value of [NaN, Infinity, -Infinity, -8]) {
    assert.equal(previewDriverEarnings(value, value, value).illustrativeTotalRD, 0);
  }
  assert.equal(previewDriverEarnings(2.9, 1.5, 1.5).illustrativeTotalRD, 2000);
});

test('public driver calculator and onboarding reuse the same earnings helper', () => {
  const read = relativePath => fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf8');
  assert.match(read('apps/driver/components/landing/DriverEarningsLab.tsx'), /previewDriverEarnings\(ads, sales, referrals\)/);
  assert.match(read('apps/driver/pages/driver/onboarding.tsx'), /previewDriverEarnings\(\s*campaigns,\s*approvedSales,\s*referredDrivers,?\s*\)/);
  const step = read('apps/driver/components/onboarding/EarningsCalculatorStep.tsx');
  assert.match(step, /max=\{15\}/);
  assert.match(step, /Ventas aprobadas de publicidad/);
  assert.match(step, /Conductores referidos activados/);
  assert.doesNotMatch(step, /ROI estimado|Total Mensual Estimado/);
});
