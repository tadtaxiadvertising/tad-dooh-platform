"use strict";

// Public demo acceptance only. Explicit loopback URLs, existing isolated servers,
// no portal navigation, account creation, private API, remote resources or SW.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { execFileSync } = require("node:child_process");
const {
  assertOpaque,
  assertNoHorizontalOverflow,
  setRangeWithKeyboard,
  monetaryAmount,
} = require("./landing-browser-contracts.cjs");
const ROOT = path.resolve(__dirname, "..");
const matrix = [
  [320, 568],
  [360, 800],
  [375, 812],
  [390, 844],
  [412, 915],
  [430, 932],
  [768, 1024],
  [1024, 768],
  [1440, 900],
  [667, 375],
];
function base(raw) {
  assert.ok(raw, "Explicit loopback URL required");
  const u = new URL(raw);
  assert.ok(
    ["http:", "https:"].includes(u.protocol) &&
      ["127.0.0.1", "localhost", "[::1]"].includes(u.hostname),
  );
  assert.equal(u.pathname, "/");
  assert.ok(!u.username && !u.password && !u.search && !u.hash);
  return u.origin;
}
function playwright() {
  for (const p of [
    "playwright",
    "@playwright/test",
    path.join(
      os.homedir(),
      ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
    ),
  ]) {
    try {
      return require(p);
    } catch (e) {
      if (e.code !== "MODULE_NOT_FOUND") throw e;
    }
  }
  throw Error("Playwright unavailable; no install attempted");
}
const output = process.env.CREATIVE_V2_EVIDENCE_DIR;
assert.ok(
  output && path.isAbsolute(output),
  "Absolute external evidence directory required",
);
const relative = path.relative(ROOT, path.resolve(output));
assert.ok(
  relative.startsWith(".." + path.sep) || path.isAbsolute(relative),
  "Evidence must stay outside repository",
);
fs.mkdirSync(output, { recursive: true });
const records = [];
async function guard(context, origin, record) {
  await context.route("**/*", (r) => {
    const q = r.request(),
      u = new URL(q.url());
    if (["data:", "blob:"].includes(u.protocol)) return r.continue();
    if (
      u.origin !== origin ||
      u.pathname.startsWith("/api/") ||
      !["GET", "HEAD"].includes(q.method())
    ) {
      if (
        u.origin === origin &&
        u.pathname === "/__nextjs_original-stack-frames"
      ) {
        record.devOverlay.push(u.pathname);
        return r.abort();
      }
      record.blocked.push(u.origin + u.pathname);
      return r.abort();
    }
    return r.continue();
  });
  await context.routeWebSocket("**/*", (ws) => {
    const u = new URL(ws.url()),
      b = new URL(origin);
    if (
      u.hostname === b.hostname &&
      u.port === b.port &&
      u.pathname === "/_next/webpack-hmr"
    )
      ws.connectToServer();
    else {
      record.blocked.push(u.origin + u.pathname);
      ws.close();
    }
  });
}
async function rejectOptional(page) {
  const b = page.getByRole("button", {
    name: "Rechazar opcionales",
    exact: true,
  });
  if (await b.isVisible()) await b.click();
  const close = page.getByRole("button", { name: "Cerrar", exact: true });
  if (await close.isVisible()) await close.click();
}
async function horizontal(locator, label, width) {
  assert.equal(await locator.count(), 1, label);
  const box = await locator.boundingBox();
  assert.ok(
    box && box.x >= -1 && box.x + box.width <= width + 1,
    `${label}: horizontal containment ${JSON.stringify(box)}`,
  );
}
async function act(locator, touch) {
  if (touch) await locator.tap();
  else await locator.click();
}
async function advertiser(page, touch, reduce, record) {
  const hero = page.locator("[data-example]");
  await hero.evaluate((element) => {
    window.__creativeCSSAnimations = [];
    element.addEventListener("animationstart", (event) => {
      window.__creativeCSSAnimations.push(event.animationName);
    });
  });
  await act(
    page
      .getByRole("group", { name: "Seleccionar creatividad de ejemplo" })
      .getByRole("button", { name: /Nuevo lanzamiento/ }),
    touch,
  );
  assert.equal(await hero.getAttribute("data-example"), "launch");
  // Observe actual CSS animationstart, rather than race a finite 820ms animation
  // against screenshot/browser scheduling under concurrent CI load.
  if (!reduce)
    await page.waitForFunction(() => window.__creativeCSSAnimations.length > 0);
  const animations = await page.evaluate(() => window.__creativeCSSAnimations);
  if (reduce) {
    assert.equal(animations.length, 0, "reduced hero must be static");
    assert.equal(
      await hero.evaluate((e) => e.getAnimations({ subtree: true }).length),
      0,
    );
  } else
    assert.ok(
      animations.some((name) => /taxi-response|send-to-screen/.test(name)),
      "taxi/creative must really animate",
    );
  await act(hero.getByRole("button", { name: "Repetir demostración" }), touch);
  const story = page.locator("#recorrido-campana");
  const choices = story.locator("ol button");
  assert.equal(await choices.count(), 4);
  await act(story.getByRole("button", { name: /Siguiente/ }), touch);
  assert.equal(await choices.nth(1).getAttribute("aria-pressed"), "true");
  await act(story.getByRole("button", { name: /Anterior/ }), touch);
  assert.equal(await choices.first().getAttribute("aria-pressed"), "true");
  const next = story.getByRole("button", { name: /Siguiente/ }),
    previous = story.getByRole("button", { name: /Anterior/ });
  for (let index = 0; index < 3; index++) await next.click();
  assert.equal(await next.getAttribute("aria-disabled"), "true");
  assert.equal(
    await next.evaluate((e) => e === document.activeElement),
    true,
    "last-step navigation keeps focus",
  );
  await next.press("Enter");
  assert.equal(await choices.nth(3).getAttribute("aria-pressed"), "true");
  for (let index = 0; index < 3; index++) await previous.click();
  assert.equal(await previous.getAttribute("aria-disabled"), "true");
  assert.equal(
    await previous.evaluate((e) => e === document.activeElement),
    true,
    "first-step navigation keeps focus",
  );
  const total = page.locator("#budget-total"),
    production = page.locator("#campaign-production");
  assert.equal(await production.isChecked(), false);
  const before = monetaryAmount(await total.innerText());
  await production.check();
  const withProduction = monetaryAmount(await total.innerText());
  assert.ok(withProduction > before);
  await production.uncheck();
  assert.equal(monetaryAmount(await total.innerText()), before);
  const impact = page.locator("[data-impact-explainer]");
  const values = [];
  for (const name of ["Prudente", "Central", "Amplio"]) {
    await act(impact.getByRole("button", { name, exact: true }), touch);
    values.push(
      Number((await impact.locator("output").innerText()).replace(/\D/g, "")),
    );
  }
  assert.ok(values[0] <= values[1] && values[1] <= values[2]);
  await act(impact.locator("summary"), touch);
  assert.equal(await impact.locator("details").getAttribute("open"), "");
  record.interactions = {
    hero: "selection/replay",
    heroAnimationDurations: animations,
    story: "forward/back",
    production: [before, withProduction, before],
    impact: values,
  };
}
async function driver(page, touch, reduce, record, context) {
  const hero = page.locator("[data-driver-demo]");
  await act(hero.locator("button").first(), touch);
  assert.equal(await hero.getAttribute("data-driver-demo"), "on");
  const animations = await hero.evaluate((e) =>
    e
      .getAnimations({ subtree: true })
      .map((a) => a.effect?.getComputedTiming().duration),
  );
  if (reduce) assert.equal(animations.length, 0);
  else assert.ok(animations.length > 0, "taxi demo must animate on input");
  await act(hero.locator("button").nth(1), touch);
  assert.equal(await hero.getAttribute("data-driver-demo"), "off");
  const picker = page.getByRole("group", {
    name: "Explorar una vía de ingresos",
  });
  for (let index = 0; index < 3; index++) {
    await act(picker.locator("button").nth(index), touch);
    assert.equal(
      await picker.locator("button").nth(index).getAttribute("aria-pressed"),
      "true",
    );
  }
  for (const id of ["ads", "sales", "referrals"])
    await setRangeWithKeyboard(page.locator("#driver-lab-" + id), 0);
  await setRangeWithKeyboard(page.locator("#driver-lab-ads"), 6);
  await setRangeWithKeyboard(page.locator("#driver-lab-sales"), 1);
  await setRangeWithKeyboard(page.locator("#driver-lab-referrals"), 2);
  const total = page.locator(
    'output[for="driver-lab-ads driver-lab-sales driver-lab-referrals"]',
  );
  assert.equal(monetaryAmount(await total.innerText()), 4500);
  assert.equal(await page.locator('[data-active="true"]').count(), 6);
  if (touch && !reduce) {
    for (const id of ["ads", "sales", "referrals"])
      await setRangeWithKeyboard(page.locator("#driver-lab-" + id), 0);
    const slider = page.locator("#driver-lab-ads");
    await slider.scrollIntoViewIfNeeded();
    const box = await slider.boundingBox();
    assert.ok(box);
    const session = await context.newCDPSession(page),
      y = box.y + box.height / 2;
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: box.x + 8, y }],
    });
    for (const fraction of [0.1, 0.25, 0.4, 0.5])
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: box.x + box.width * fraction, y }],
      });
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await session.detach();
    const ads = Number(await slider.inputValue());
    assert.ok(ads >= 5 && ads <= 10, "touch drag must change the native range");
    assert.equal(monetaryAmount(await total.innerText()), ads * 500);
    record.touchDragAds = ads;
  }
  const referral = page.locator("[data-referral-journey]");
  for (let i = 0; i < 4; i++)
    await act(referral.getByRole("button", { name: /siguiente/i }), touch);
  assert.equal(await referral.getAttribute("data-step"), "4");
  assert.match(await referral.innerText(), /aprobad|aprobación/i);
  await act(referral.getByRole("button", { name: /anterior/i }), touch);
  assert.equal(await referral.getAttribute("data-step"), "3");
  record.interactions = {
    hero: "play/reset",
    heroAnimationDurations: animations,
    routes: 3,
    oracle: "6 ads + 1 approved sale + 2 activated referrals = 4500",
    referral: "five phases forward/back",
  };
}
(async () => {
  const { chromium } = playwright();
  const browser = await chromium.launch({ headless: true });
  const origins = {
    advertiser: base(process.env.LANDING_BASE_URL),
    driver: base(process.env.DRIVER_LANDING_BASE_URL),
  };
  try {
    for (const [name, origin] of Object.entries(origins)) {
      const cases = matrix
        .map(([width, height]) => ({ width, height, reduce: false }))
        .concat([{ width: 390, height: 844, reduce: true }]);
      for (const item of cases) {
        const touch = item.width < 768;
        const record = {
          name,
          ...item,
          touch,
          blocked: [],
          devOverlay: [],
          errors: [],
        };
        records.push(record);
        const context = await browser.newContext({
          viewport: { width: item.width, height: item.height },
          hasTouch: touch,
          isMobile: touch,
          deviceScaleFactor: touch ? 2 : 1,
          reducedMotion: item.reduce ? "reduce" : "no-preference",
          serviceWorkers: "block",
          ...(item.width === 390 && !item.reduce
            ? {
                recordVideo: {
                  dir: path.join(output, "video"),
                  size: { width: 390, height: 844 },
                },
              }
            : {}),
        });
        try {
          await guard(context, origin, record);
          const page = await context.newPage();
          page.on("pageerror", (e) => record.errors.push(e.message));
          assert.equal(
            (
              await page.goto(origin, {
                waitUntil: "domcontentloaded",
                timeout: 90000,
              })
            ).status(),
            200,
          );
          await page.waitForFunction(() =>
            [...document.querySelectorAll("main button")].some((b) =>
              Object.keys(b).some((k) => k.startsWith("__reactProps$")),
            ),
          );
          await page.waitForTimeout(300);
          await rejectOptional(page);
          await assertOpaque(page.locator("h1"), name + " H1");
          await assertNoHorizontalOverflow(page, name);
          await horizontal(page.locator("h1"), "H1", item.width);
          const cta = page
            .locator(
              name === "advertiser"
                ? 'main a[href="#experiencia"]'
                : 'main a[href="#calculadora"]',
            )
            .first();
          await horizontal(cta, "hero CTA", item.width);
          const ctaBox = await cta.boundingBox();
          record.ctaBottom = ctaBox.y + ctaBox.height;
          if (item.width === 320)
            assert.ok(
              record.ctaBottom <= item.height,
              "320px portrait CTA fits first viewport",
            );
          await page.screenshot({
            path: path.join(
              output,
              `${name}-${item.width}x${item.height}${item.reduce ? "-reduced" : ""}-hero.png`,
            ),
          });
          if (item.width === 390) {
            if (name === "advertiser")
              await advertiser(page, touch, item.reduce, record);
            else await driver(page, touch, item.reduce, record, context);
            await assertNoHorizontalOverflow(
              page,
              name + " after interactions",
            );
            await page
              .locator(
                name === "advertiser"
                  ? "[data-impact-explainer]"
                  : "[data-referral-journey]",
              )
              .screenshot({
                path: path.join(
                  output,
                  `${name}-390${item.reduce ? "-reduced" : ""}-interaction.png`,
                ),
              });
          }
          if ((item.width === 390 || item.width === 1440) && !item.reduce)
            await page.screenshot({
              path: path.join(output, `${name}-${item.width}-full.png`),
              fullPage: true,
            });
          for (const selector of name === "advertiser"
            ? ["#campaign-screens", "#budget-total", "[data-impact-explainer]"]
            : [
                "#driver-lab-ads",
                'output[for="driver-lab-ads driver-lab-sales driver-lab-referrals"]',
                "[data-referral-journey]",
              ])
            await horizontal(page.locator(selector), selector, item.width);
          assert.deepEqual(
            record.blocked,
            [],
            "private/remote traffic forbidden",
          );
          assert.deepEqual(record.errors, [], "no page/hydration errors");
          record.pass = true;
        } finally {
          await context.close();
          fs.writeFileSync(
            path.join(output, "creative-qa.json"),
            JSON.stringify(records, null, 2),
          );
        }
        console.log(
          `PASS ${name} ${item.width}x${item.height} ${item.reduce ? "reduced" : "normal"}`,
        );
      }
      for (const width of [320, 390, 1440]) {
        const record = { name, width, noJS: true, blocked: [], devOverlay: [] };
        records.push(record);
        const context = await browser.newContext({
          viewport: { width, height: 844 },
          javaScriptEnabled: false,
          serviceWorkers: "block",
        });
        try {
          await guard(context, origin, record);
          const page = await context.newPage();
          await page.goto(origin, { waitUntil: "domcontentloaded" });
          await assertOpaque(page.locator("h1"), name + " noJS H1");
          await assertNoHorizontalOverflow(page, name + " noJS");
          for (const selector of name === "advertiser"
            ? ["#campaign-screens", "#budget-total"]
            : [
                "#driver-lab-ads",
                'output[for="driver-lab-ads driver-lab-sales driver-lab-referrals"]',
              ])
            await assertOpaque(page.locator(selector), selector);
          if (width === 390)
            await page.screenshot({
              path: path.join(output, `${name}-390-nojs.png`),
            });
          assert.deepEqual(record.blocked, []);
          record.pass = true;
        } finally {
          await context.close();
          fs.writeFileSync(
            path.join(output, "creative-qa.json"),
            JSON.stringify(records, null, 2),
          );
        }
        console.log(`PASS ${name} noJS ${width}`);
      }
    }
    fs.writeFileSync(
      path.join(output, "creative-qa.json"),
      JSON.stringify(
        {
          sha: execFileSync("git", ["rev-parse", "HEAD"], {
            cwd: ROOT,
            encoding: "utf8",
          }).trim(),
          mode: "development fixtures; emulated touch, not physical devices",
          records,
        },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
