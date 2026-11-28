#!/usr/bin/env node
'use strict';

// Local lab samples and exact gzip sizes from an existing Next build.
// This script never builds, starts a server, installs tools, or calls a remote host.
// LANDING_MEASURE_BUNDLE_ONLY=true node scripts/landing-v3-measure.cjs
// LANDING_BASE_URL=http://127.0.0.1:3003 node scripts/landing-v3-measure.cjs
// Optional report: LANDING_MEASURE_REPORT=absolute/outside/repo/report.json
// Optional comparison: LANDING_BASELINE_REPORT=.../earlier-report.json
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { localBaseUrl, loadChromium, outsideDirectory, gitSha, guardContext,
  evidenceCollector, recordErrors, assertNoSideEffects } = require('./landing-v3-smoke.cjs');

const ROOT = path.resolve(__dirname, '..');
const suppliedBuild = process.env.LANDING_BUILD_DIR;
if (suppliedBuild) {
  assert.ok(path.isAbsolute(suppliedBuild), 'LANDING_BUILD_DIR must be absolute.');
  assert.ok(!/^(\\\\|\/\/)/.test(suppliedBuild), 'LANDING_BUILD_DIR must use a local disk, not a network share.');
}
const BUILD = suppliedBuild ? path.resolve(suppliedBuild) : path.join(ROOT, 'apps', 'advertiser', '.next');

function readJson(filename) {
  assert.ok(fs.existsSync(filename), `Missing build artifact: ${path.relative(ROOT, filename)}`);
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

function assetSize(asset) {
  assert.equal(typeof asset, 'string');
  const filename = path.resolve(BUILD, asset);
  const relative = path.relative(BUILD, filename);
  assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative),
    'Build asset must remain inside the build directory.');
  const bytes = fs.readFileSync(filename);
  return { file: asset.replaceAll('\\', '/'), bytes: bytes.length,
    gzipBytes: zlib.gzipSync(bytes, { level: 9 }).length };
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

// Static App Router pages have an exact prerendered HTML artifact. Manifest
// chunk membership is a size accounting model, not a contract for script tags.
function runtimeIdentity({ rootHtmlSha256, responseBody, routeExclusiveJs, scriptPaths }) {
  const missingManifestScripts = routeExclusiveJs
    .filter(asset => !scriptPaths.includes('/_next/' + asset.file))
    .map(asset => asset.file);
  const observedHtmlSha256 = sha256(responseBody);
  const method = rootHtmlSha256 ? 'prerendered-html-sha256' : 'manifest-script-paths';
  const matches = rootHtmlSha256
    ? observedHtmlSha256 === rootHtmlSha256
    : routeExclusiveJs.length > 0 && missingManifestScripts.length === 0;
  return { matches, method, expectedHtmlSha256: rootHtmlSha256 || null,
    observedHtmlSha256, missingManifestScripts };
}

function bundleMeasurement() {
  const buildManifest = readJson(path.join(BUILD, 'build-manifest.json'));
  const appManifestPath = path.join(BUILD, 'app-build-manifest.json');
  const appManifest = fs.existsSync(appManifestPath) ? readJson(appManifestPath) : null;
  const appRoot = appManifest?.pages?.['/page'];
  const pagesRoot = buildManifest.pages?.['/'];
  assert.ok(appRoot || pagesRoot, 'No landing root entry exists in the current build manifests.');
  const router = appRoot ? 'App Router' : 'Pages Router';
  const prerender = appRoot ? readJson(path.join(BUILD, 'prerender-manifest.json')) : null;
  const staticRoot = prerender?.routes?.['/']?.initialRevalidateSeconds === false;
  const rootHtmlSha256 = staticRoot
    ? sha256(fs.readFileSync(path.join(BUILD, 'server', 'app', 'index.html')))
    : null;
  const shellFiles = appRoot ? appManifest.pages['/layout'] || [] : buildManifest.pages['/_app'] || [];
  const rootFiles = appRoot || pagesRoot;
  const allInitial = [...new Set([...shellFiles, ...rootFiles,
    ...(appRoot ? buildManifest.rootMainFiles || [] : [])])];
  const initialJs = allInitial.filter(file => file.endsWith('.js')).map(assetSize);
  const css = allInitial.filter(file => file.endsWith('.css')).map(assetSize);
  const shell = new Set(shellFiles.filter(file => file.endsWith('.js')));
  const routeExclusiveJs = initialJs.filter(asset => !shell.has(asset.file));
  const sourceRoot = execFileSync('git', ['-C', BUILD, 'rev-parse', '--show-toplevel'],
    { cwd: ROOT, encoding: 'utf8' }).trim();
  return {
    router,
    buildDirectory: BUILD,
    rootHtmlSha256,
    sourceObservation: {
      utc: new Date().toISOString(), root: sourceRoot,
      sha: execFileSync('git', ['-C', sourceRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
      dirtyWorkingTree: execFileSync('git', ['-C', sourceRoot, 'status', '--porcelain'],
        { encoding: 'utf8' }).trim().length > 0,
      limitation: 'Working tree observed when measuring. A dirty tree is not a reproducible clean release revision.',
    },
    buildId: fs.readFileSync(path.join(BUILD, 'BUILD_ID'), 'utf8').trim(),
    manifestMtimeUtc: fs.statSync(appRoot ? appManifestPath : path.join(BUILD, 'build-manifest.json')).mtime.toISOString(),
    methodology: 'Sum of each manifest-listed initial asset compressed separately with gzip level 9. '
      + 'Route-exclusive means absent from the root shell manifest; it is not the change versus an earlier version. '
      + 'Optional legacy polyfills, lazy chunks and HTTP transport headers are excluded.',
    initialJs: { files: initialJs, bytes: initialJs.reduce((sum, asset) => sum + asset.bytes, 0),
      gzipBytes: initialJs.reduce((sum, asset) => sum + asset.gzipBytes, 0) },
    routeExclusiveJs: { files: routeExclusiveJs,
      bytes: routeExclusiveJs.reduce((sum, asset) => sum + asset.bytes, 0),
      gzipBytes: routeExclusiveJs.reduce((sum, asset) => sum + asset.gzipBytes, 0) },
    initialCss: { files: css, gzipBytes: css.reduce((sum, asset) => sum + asset.gzipBytes, 0) },
  };
}

function compareBaseline(current) {
  const filename = process.env.LANDING_BASELINE_REPORT;
  if (!filename) return { status: 'NOT MEASURED', reason: 'No prior report was supplied; no version delta is inferred.',
    targetAdditionalGzipBytes: 60 * 1024 };
  assert.ok(path.isAbsolute(filename), 'LANDING_BASELINE_REPORT must be absolute.');
  const baseline = readJson(filename);
  assert.ok(Number.isFinite(baseline.bundle?.initialJs?.gzipBytes), 'Baseline needs a matching bundle report.');
  const delta = current.initialJs.gzipBytes - baseline.bundle.initialJs.gzipBytes;
  return { status: delta <= 60 * 1024 ? 'WITHIN TARGET' : 'EXCEEDS TARGET',
    baselineUtc: baseline.utc, baselineSha: baseline.sha, baselineBuildId: baseline.bundle.buildId,
    initialJsGzipDeltaBytes: delta, targetAdditionalGzipBytes: 60 * 1024,
    limitation: 'A difference between local build snapshots. Matching runtime, config and source scope must be reviewed.' };
}

// CLS session windows start at the first eligible shift, not navigation start.
function computeCls(shifts) {
  let maximum = 0;
  let sum = 0;
  let start = null;
  let previous = null;
  for (const shift of shifts.filter(item => !item.hadRecentInput).sort((a, b) => a.startTime - b.startTime)) {
    if (start === null || shift.startTime - previous >= 1000 || shift.startTime - start >= 5000) {
      start = shift.startTime;
      sum = 0;
    }
    sum += shift.value;
    maximum = Math.max(maximum, sum);
    previous = shift.startTime;
  }
  return maximum;
}

function medianFinite(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

async function browserSamples(base, bundle) {
  const count = Number(process.env.LANDING_MEASURE_SAMPLES || 3);
  assert.ok(Number.isInteger(count) && count >= 1 && count <= 5, 'Sample count must be 1..5.');
  const browser = await loadChromium().launch({ headless: true });
  const samples = [];
  const developmentAllowed = process.env.LANDING_ALLOW_DEV_HMR === 'true';
  let userAgent;
  try {
    for (let index = 0; index < count; index += 1) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 },
        deviceScaleFactor: 1, isMobile: true, hasTouch: true,
        reducedMotion: 'reduce', serviceWorkers: 'block' });
      const evidence = evidenceCollector();
      await guardContext(context, base, evidence);
      await context.addInitScript(() => {
        window.__landingLab = { lcp: [], shifts: [], supported: PerformanceObserver.supportedEntryTypes };
        for (const type of ['largest-contentful-paint', 'layout-shift']) {
          if (!PerformanceObserver.supportedEntryTypes.includes(type)) continue;
          const observer = new PerformanceObserver(list => {
            for (const entry of list.getEntries()) {
              if (type === 'largest-contentful-paint') window.__landingLab.lcp.push(entry.startTime);
              else window.__landingLab.shifts.push({ value: entry.value, startTime: entry.startTime,
                hadRecentInput: entry.hadRecentInput });
            }
          });
          observer.observe({ type, buffered: true });
        }
      });
      const page = await context.newPage();
      recordErrors(page, evidence);
      const session = await context.newCDPSession(page);
      await session.send('Network.enable');
      await session.send('Network.emulateNetworkConditions', { offline: false, latency: 150,
        downloadThroughput: 200 * 1024, uploadThroughput: 75 * 1024, connectionType: 'cellular4g' });
      await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      const response = await page.goto(base.href, { waitUntil: 'networkidle', timeout: 60_000 });
      assert.equal(response.status(), 200);
      assert.equal(new URL(page.url()).pathname, '/');
      await page.getByRole('heading', { level: 1 }).waitFor({ state: 'visible' });
      const scriptPaths = await page.locator('script[src]').evaluateAll(elements =>
        elements.map(element => new URL(element.src).pathname));
      // Two rendered frames flush entries already delivered by the browser; no arbitrary sleep.
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const sample = await page.evaluate(() => {
        const lab = window.__landingLab;
        const navigation = performance.getEntriesByType('navigation')[0];
        const fcp = performance.getEntriesByName('first-contentful-paint')[0];
        const resources = performance.getEntriesByType('resource');
        return {
          lcpMs: lab.lcp.length ? lab.lcp.at(-1) : null,
          layoutShifts: lab.supported.includes('layout-shift') ? lab.shifts : null,
          fcpMs: fcp?.startTime ?? null,
          domContentLoadedMs: navigation.domContentLoadedEventEnd,
          loadMs: navigation.loadEventEnd,
          resourceCount: resources.length,
          transferredBytes: resources.reduce((sum, entry) => sum + entry.transferSize, 0),
          encodedResourceBytes: resources.reduce((sum, entry) => sum + entry.encodedBodySize, 0),
          scriptResourceCount: resources.filter(entry => entry.initiatorType === 'script').length,
          viewport: { width: innerWidth, height: innerHeight },
          userAgent: navigator.userAgent,
          hardwareConcurrency: navigator.hardwareConcurrency,
        };
      });
      // Read the navigation body after collecting timings. The browser returns
      // decoded bytes, matching Next's static HTML file rather than wire gzip.
      const identity = runtimeIdentity({
        rootHtmlSha256: bundle.rootHtmlSha256,
        responseBody: await response.body(),
        routeExclusiveJs: bundle.routeExclusiveJs.files,
        scriptPaths,
      });
      const runtimeMatchesBuild = identity.matches;
      assert.ok(runtimeMatchesBuild || developmentAllowed,
        'Running root does not match the measured build: ' + JSON.stringify(identity));
      sample.cls = sample.layoutShifts === null ? null : computeCls(sample.layoutShifts);
      delete sample.layoutShifts;
      userAgent = sample.userAgent;
      delete sample.userAgent;
      samples.push({ iteration: index + 1, runtimeMatchesBuild, buildIdentity: identity,
        allowedDevelopmentHmrConnections: evidence.devHmr.length, ...sample });
      await assertNoSideEffects(context, evidence);
      await context.close();
    }
  } finally {
    await browser.close();
  }
  const median = key => medianFinite(samples.map(sample => sample[key]));
  return { status: developmentAllowed ? 'DEVELOPMENT LOCAL LAB SAMPLES' : 'LOCAL LAB SAMPLES', browser: userAgent,
    developmentHmrAllowed: developmentAllowed,
    allSamplesMatchMeasuredBuild: samples.every(sample => sample.runtimeMatchesBuild),
    network: { latencyMs: 150, downloadBytesPerSecond: 200 * 1024, uploadBytesPerSecond: 75 * 1024 },
    cpuSlowdown: 4, freshContexts: true, reducedMotion: true, samples,
    median: { lcpMs: median('lcpMs'), cls: median('cls'), fcpMs: median('fcpMs') },
    limitations: ['Not Lighthouse; no Lighthouse scores are claimed.', 'Not real Android hardware or field p75.',
      'No INP claim: initial navigation has no representative user interaction sample.',
      ...(developmentAllowed ? ['Development mode is explicitly permitted. These timings do not certify the production build or production performance budgets.'] : []),
      'Cookie prompt is part of the fresh visitor page.', 'Local transport compression/config may differ from deployment.',
      'Static HTML identity verifies the root response, not the bytes of every served chunk.',
      'LCP and CLS reflect the initial viewport through network idle, not the entire visit.'] };
}

async function main() {
  const bundleOnly = process.env.LANDING_MEASURE_BUNDLE_ONLY === 'true';
  const base = bundleOnly ? null : localBaseUrl(process.env.LANDING_BASE_URL);
  const bundle = bundleMeasurement();
  const report = { utc: new Date().toISOString(), sha: gitSha(),
    dirtyWorkingTree: execFileSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' }).trim().length > 0,
    environment: { node: process.version, platform: process.platform, architecture: process.arch },
    baseUrl: base?.href || null, bundle, comparison: compareBaseline(bundle),
    performance: bundleOnly ? { status: 'NOT RUN', reason: 'Bundle-only snapshot requested.' } : await browserSamples(base, bundle) };
  if (process.env.LANDING_MEASURE_REPORT) {
    const filename = process.env.LANDING_MEASURE_REPORT;
    assert.ok(path.isAbsolute(filename), 'LANDING_MEASURE_REPORT must be absolute.');
    outsideDirectory(path.dirname(filename), 'LANDING_MEASURE_REPORT parent');
    fs.writeFileSync(filename, JSON.stringify(report, null, 2) + '\n', { encoding: 'utf8', flag: 'wx' });
  }
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
}

module.exports = { computeCls, medianFinite, runtimeIdentity };

if (require.main === module) main().catch(error => {
  process.stderr.write(`FAIL ${error.message}\n`);
  process.exitCode = 1;
});
