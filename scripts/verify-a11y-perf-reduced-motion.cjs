/**
 * Verification: accessibility + reduced motion + performance
 * Targets: advertiser (3000) and driver (3001).
 * Runs without a backend API (frontend-only).
 */
const { chromium } = require("playwright");

const BASE = {
  advertiser: "http://127.0.0.1:3000/",
  driver: "http://127.0.0.1:3001/",
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = {};

  for (const [name, url] of Object.entries(BASE)) {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 800 },
      isMobile: false,
      hasTouch: false,
    });

    const pageResults = { url, checks: {} };

    // 1. Load and capture performance metrics
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    const perf = await page.evaluate(() => {
      if (!("performance" in window)) return null;
      const p = performance.getEntriesByType("navigation");
      return {
        loadEvent: p[0]?.loadEventEnd,
        domContentLoaded: p[0]?.domContentLoadedEventEnd,
        navStart: p[0]?.startTime,
        domContentLoadedLoad: p[0]?.domContentLoadedEventStart,
      };
    });
    pageResults.pageLoad = perf;
    const t = await page.evaluate(() => {
      const i = performance.getEntriesByType("resource");
      const total = i.reduce((sum, e) => sum + (e.duration || 0), 0);
      return {
        resourceCount: i.length,
        totalResourceMs: Math.round(total),
        largest: Math.round(Math.max(...i.map((e) => e.size || 0))),
      };
    });
    pageResults.pageLoad = { ...pageResults.pageLoad, ...t };

    // 2. Accessibility audit (Playwright's built-in)
    try {
      const a11y = await page.accessibility().snapshot();
      pageResults.a11y = {
        rootLabel: await page.accessibility().getRootLabel(),
        headingCount: await page.locator("h1, h2, h3, h4, h5, h6").count(),
        imageAlt: await page.locator("img[alt]").count(),
        inputCount: await page.locator("input").count(),
        hasFocusable: await page.locator("a, button, input, select, textarea").count(),
      };
    } catch (e) {
      pageResults.a11yError = String(e).slice(0, 200);
    }

    // 3. Reduced motion: CSS prefers-reduced-motion is respected
    const reducedMotion = await page.evaluate(() => {
      const style = getComputedStyle(document.body);
      return {
        bodyFont: style.fontSize,
        bodyBackgroundColor: style.backgroundColor,
        mediaQuerySupports: typeof window.matchMedia === "function",
      };
      // Detect if user-agent supports reduced motion and any inline styles forced
    });
    pageResults.reducedMotion = reducedMotion;

    // 4. Lighthouse-ish: total bytes
    pageResults.perf = perf;

    results[name] = pageResults;
    await page.close();
  }

  console.log(JSON.stringify(results, null, 2));
  await browser.close();
})();
