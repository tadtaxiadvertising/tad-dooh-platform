const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createRequire } = require('node:module');
const ts = require('typescript');

const driverDir = path.resolve(__dirname, '../apps/driver');
const driverRequire = createRequire(path.join(driverDir, 'package.json'));
const pwaRequire = createRequire(driverRequire.resolve('@ducanh2912/next-pwa'));
const withPWA = driverRequire('@ducanh2912/next-pwa').default;
const webpack = pwaRequire('webpack');

test('the real Driver PWA plugin preserves precache defaults and manual registration', () => {
  const temporaryRoot = fs.realpathSync.native(os.tmpdir());
  const fixture = fs.mkdtempSync(path.join(temporaryRoot, 'tad-driver-pwa-config-'));
  try {
    fs.mkdirSync(path.join(fixture, 'public'));
    fs.writeFileSync(path.join(fixture, 'tsconfig.json'), '{"compilerOptions":{"target":"ES2020"}}');
    const filename = path.join(driverDir, 'next.config.ts');
    const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      fileName: filename,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    }).outputText;
    const mod = { exports: {} };
    // Execute the production config and real PWA factory. Only Sentry's build wrapper
    // is isolated; no SDK initialization, provider calls, compilation or app startup.
    const imports = {
      path,
      '@ducanh2912/next-pwa': { __esModule: true, default: withPWA },
      '@sentry/nextjs/config': { withSentryConfig: config => config },
    };
    new Function('module', 'exports', 'require', 'process', '__dirname', compiled)(
      mod, mod.exports, name => {
        assert.ok(Object.hasOwn(imports, name), `Unexpected provider import: ${name}`);
        return imports[name];
      }, { env: { NODE_ENV: 'production' }, cwd: () => fixture }, driverDir,
    );
    const config = mod.exports.default;
    const result = config.webpack({
      plugins: [], resolve: { alias: {} }, output: { publicPath: '/_next/' },
      entry: async () => ({ 'main.js': [] }),
    }, {
      isServer: false, dev: false, dir: fixture, buildId: 'fixture-build', webpack,
      config: {
        ...config, typescript: { tsconfigPath: 'tsconfig.json' },
        distDir: '.next', pageExtensions: ['tsx', 'ts', 'js', 'jsx'],
      },
    });
    const generation = result.plugins.find(plugin => plugin.constructor.name === 'GenerateSW');
    assert.ok(generation, 'The real plugin must construct GenerateSW.');
    const registration = result.plugins.find(plugin => plugin.definitions?.__PWA_ENABLE_REGISTER__);
    assert.equal(registration?.definitions.__PWA_ENABLE_REGISTER__, 'false');
    assert.equal(registration.definitions.__PWA_RELOAD_ON_ONLINE__, 'false');
    assert.equal(registration.definitions.__PWA_CACHE_ON_FRONT_END_NAV__, 'false');

    const excludes = asset => generation.config.exclude.some(rule =>
      typeof rule === 'function' ? rule({ asset: { name: asset } }) : rule.test(asset));
    for (const asset of ['static/chunks/driver.js.map', '/_next/static/media/font.woff2',
      'manifest.js', 'server/middleware-manifest.json', 'app-build-manifest.json']) {
      assert.equal(excludes(asset), true, asset);
    }
    for (const asset of ['static/chunks/driver.js', 'static/css/driver.css', 'dynamic-css-manifest.json']) {
      assert.equal(excludes(asset), false, asset);
    }

    const dashboard = generation.config.runtimeCaching.find(rule =>
      rule.options?.cacheName === 'tad-driver-dashboard-assets');
    assert.ok(dashboard);
    assert.equal(dashboard.handler, 'StaleWhileRevalidate');
    assert.equal(dashboard.urlPattern({ url: new URL('https://fixture.invalid/driver/dashboard'),
      request: { method: 'GET', destination: '' } }), true);
    assert.equal(dashboard.urlPattern({ url: new URL('https://fixture.invalid/api/proxy/wallet'),
      request: { method: 'POST', destination: '' } }), false);
    assert.equal(dashboard.urlPattern({ url: new URL('https://fixture.invalid/_next/static/chunk.js'),
      request: { method: 'GET', destination: 'script' } }), true);
    assert.equal(dashboard.options.expiration.maxEntries, 160);
    assert.equal(dashboard.options.expiration.maxAgeSeconds, 60 * 60 * 24 * 7);
  } finally {
    assert.equal(path.dirname(fixture), temporaryRoot);
    assert.ok(path.basename(fixture).startsWith('tad-driver-pwa-config-'));
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});
