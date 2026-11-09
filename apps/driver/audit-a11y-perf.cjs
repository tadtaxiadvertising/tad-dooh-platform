/**
 * Accessibility + performance audit for advertiser (3000) and driver (3002).
 * Targets: loadEvent < 1500ms, no critical a11y violations, reduced motion respected.
 */
const { chromium } = require("playwright");

const BASE = {
  advertiser: "http://127.0.0.1:3000/",
  driver: "http://127.0.0.1:3002/",
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = {};

  for (const [name, url] of Object.entries(BASE)) {
    const page = await browser.newPage();
    const perf = {};

    // Measure performance
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    const nav = await page.evaluate(() => {
      const p = performance.getEntriesByType("navigation")[0];
      return {
        loadEventEnd: p?.loadEventEnd,
        domContentLoadedEnd: p?.domContentLoadedEventEnd,
        domContentLoadedStart: p?.domContentLoadedEventStart,
        startTime: p?.startTime,
      };
    });
    perf.loadEvent = nav.loadEventEnd ? Math.round(nav.loadEventEnd - nav.startTime) : null;
    perf.domContentLoaded = nav.domContentLoadedEnd
      ? Math.round(nav.domContentLoadedEnd - nav.startTime)
      : null;

    // Accessibility snapshot
    const a11y = {};
    try {
      const rootLabel = await page.accessibility().getRootLabel().catch(() => null);
      const headingCount = await page.locator("h1, h2, h3, h4, h5, h6").count();
      const imgAlt = await page.locator("img[alt]").count();
      const inputCount = await page.locator("input").count();
      const hasFocusable = await page
        .locator("a, button, input, select, textarea")
        .count();
      a11y = {
        rootLabel,
        headingCount,
        imgAlt,
        inputCount,
        hasFocusable,
      };
    } catch (e) {
      a11y.error = String(e).slice(0, 200);
    }

    // Reduced motion: detect prefers-reduced-motion and confirm no forced
    // fixed transparent overlays. (Catálogo: no jerarquía transparentes fijas).
    const reducedMotion = await page.evaluate(() => {
      const match = window.matchMedia("(prefers-reduced-motion: reduce)");
      const bodyStyle = getComputedStyle(document.body);
      return {
        reducedMotionEnabled: match.matches,
        bodyBackground: bodyStyle.backgroundColor,
        bodyOpacity: bodyStyle.opacity,
      };
    });

    results[name] = {
      url,
      perf,
      a11y,
      reducedMotion,
    };

    await page.close();
  }

  console.log(JSON.stringify(results, null, 2));
  await browser.close();
})();
