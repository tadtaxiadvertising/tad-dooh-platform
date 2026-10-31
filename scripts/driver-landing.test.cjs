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

test('driver landing uses native links so hovering cannot prefetch private pages', () => {
  const jsx = (type, props) => ({ type, props: props || {} });
  const imports = {
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: Symbol('Fragment') },
    'next/head': { __esModule: true, default: () => null },
    'next/image': { __esModule: true, default: () => null },
    'lucide-react': new Proxy({}, { get: () => () => null }),
    './driver-landing.module.css': { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) },
  };
  const Landing = loadTs('apps/driver/components/landing/DriverLandingPage.tsx', { imports }).default;
  const tree = nodes(Landing());
  const linkedNodes = tree.filter(node => typeof node.props.href === 'string');
  for (const link of linkedNodes) assert.equal(link.type, 'a');
  for (const destination of ['/driver/login', '/politica-de-privacidad', '/terminos-de-servicio', '/politica-de-cookies', '/aviso-legal']) {
    assert.ok(linkedNodes.some(node => node.props.href === destination), destination);
  }
  assert.equal(linkedNodes.some(node => node.props.href === '/register'), false);
});
