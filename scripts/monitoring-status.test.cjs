const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { pathToFileURL } = require('node:url');
const ts = require('typescript');

const adminRequire = createRequire(path.resolve(__dirname, '../apps/admin/package.json'));
const React = adminRequire('react');
const { renderToStaticMarkup } = adminRequire('react-dom/server');
// This installed Lucide package marks its CJS file as ESM; use its real ESM build.
const lucideRoot = path.resolve(path.dirname(adminRequire.resolve('lucide-react')), '../..');
const lucidePackage = JSON.parse(fs.readFileSync(path.join(lucideRoot, 'package.json'), 'utf8'));
const lucidePromise = import(pathToFileURL(path.resolve(lucideRoot,
  lucidePackage.exports?.['.']?.import || lucidePackage.module || lucidePackage.main)).href);
const filename = path.resolve(__dirname, '../apps/admin/pages/admin/monitoring/index.tsx');
const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  fileName: filename,
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    jsx: ts.JsxEmit.ReactJSX,
    esModuleInterop: true,
  },
}).outputText;

async function renderMonitoring(env = {}) {
  const lucide = await lucidePromise;
  const mod = { exports: {} };
  const imports = [];
  const requests = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (...args) => {
    requests.push(args);
    throw new Error('The monitoring directory must not contact external services.');
  };
  try {
    const requireOnlyUi = name => {
      imports.push(name);
      assert.ok(['react', 'react/jsx-runtime', 'next/head', 'lucide-react', 'clsx'].includes(name),
        `Unexpected provider or side-effect import: ${name}`);
      return name === 'lucide-react' ? lucide : adminRequire(name);
    };
    new Function('module', 'exports', 'require', 'process', source)(
      mod, mod.exports, requireOnlyUi, { env },
    );
    assert.deepEqual(await mod.exports.getServerSideProps({}), { props: {} });
    const html = renderToStaticMarkup(React.createElement(mod.exports.default));
    assert.equal(requests.length, 0);
    assert.doesNotMatch(html, /<(?:script|iframe|img)\b/i,
      'The page must not embed external telemetry or dashboards.');
    return { html, imports };
  } finally {
    globalThis.fetch = originalFetch;
  }
}

test('monitoring renders unverified status without invented health or performance', async () => {
  const { html } = await renderMonitoring();
  assert.doesNotMatch(html,
    /OPERATIONAL|HEALTHY|ACTIVE|ANTIGRAVITY[^<]*OK|EN TIEMPO REAL|42ms|99\.98%|1 minuto atr[aá]s|150ms|Todos los pods operativos/i);
  assert.match(html, /Sin verificar/);
  assert.match(html, /no comprueba/i);
  assert.match(html, /Sin mediciones/);
  assert.match(html, /Sin revisi[oó]n registrada/);
  assert.doesNotMatch(html, /animate-pulse|bg-emerald-500\/10 text-emerald-500/);
});

test('missing configuration renders existing consoles and labels unavailable links', async () => {
  const { html } = await renderMonitoring();
  assert.match(html, /href="https:\/\/sentry\.io\/"/);
  assert.match(html, /href="https:\/\/cloud\.umami\.is\/"/);
  assert.equal((html.match(/Enlace no configurado/g) || []).length, 2);
  assert.doesNotMatch(html, /href="(?:undefined|#|null)"/);
  assert.doesNotMatch(html, /2a7c0085-87e5-473c-b959-8854ba785e87/,
    'An unconfigured Umami site must not be presented as configured.');
  assert.match(html, /Sitio de Umami sin configurar/);
});

test('configured console destinations remain usable without proving service health', async () => {
  const { html } = await renderMonitoring({
    NEXT_PUBLIC_SUPABASE_URL: 'https://monitoring-fixture.supabase.invalid',
    NEXT_PUBLIC_UMAMI_ID: 'fixture-site',
  });
  assert.match(html, /href="https:\/\/monitoring-fixture\.supabase\.invalid\/?"/);
  assert.match(html, /href="https:\/\/cloud\.umami\.is\/websites\/fixture-site"/);
  assert.equal((html.match(/Enlace no configurado/g) || []).length, 1);
  assert.equal((html.match(/Sin verificar/g) || []).length, 4);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.doesNotMatch(html, /OPERATIONAL|HEALTHY|ACTIVE/);
});

test('invalid console URLs never become external actions', async () => {
  for (const url of ['javascript:alert(1)', '#', 'not-a-url', '']) {
    const { html } = await renderMonitoring({ NEXT_PUBLIC_SUPABASE_URL: url });
    assert.equal((html.match(/Enlace no configurado/g) || []).length, 2);
    assert.doesNotMatch(html, /href="(?:javascript:|#|not-a-url|undefined)/i);
  }
});
