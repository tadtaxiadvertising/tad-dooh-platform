/**
 * Real Chromium IndexedDB integration. No TAD API, credentials or deployment.
 * Run: pnpm --filter driver test:e2e:gps-idb
 *
 * The navigation and ES module are served by Playwright route.fulfill; no
 * Next.js server or external network is needed. This never changes real GPS.
 */
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

const BASE = "http://127.0.0.1:48889/__tad_gps_idb_qa__/";
const MODULE_URL = BASE + "queue.js";
const modulePath = resolve(
  __dirname,
  "../../../../packages/services/mobile-gateway-idb.ts",
);
const moduleJS = ts.transpileModule(readFileSync(modulePath, "utf8"), {
  fileName: modulePath,
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
  },
}).outputText;

test.beforeEach(async ({ context, page }) => {
  await context.route(BASE + "**", async (route) => {
    const isModule = route.request().url() === MODULE_URL;
    await route.fulfill({
      status: 200,
      contentType: isModule ? "text/javascript" : "text/html",
      body: isModule ? moduleJS : "<!doctype html><title>TAD GPS IDB test</title>",
    });
  });
  await page.goto(BASE);
});

test("FIFO, rollback of cross-device ACK, and idempotent retry", async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const q = (await import(
      new URL("queue.js", location.href).href
    )) as typeof import("../../../../packages/services/mobile-gateway-idb");
    const point = (speed: number) => ({
      latitude: 19.45,
      longitude: -70.69,
      speed,
      timestamp: new Date(Date.UTC(2026, 10, 22) + speed * 1000).toISOString(),
    });
    const aKeys = await q.enqueueDurableGps("TAD-A", [point(1), point(2)]);
    const bKeys = await q.enqueueDurableGps("TAD-B", [point(3)]);

    const ordered = await q.readDurableGps("TAD-A");
    let rejectedCrossDevice = false;
    try {
      await q.acknowledgeDurableGps("TAD-A", [aKeys[0], bKeys[0]]);
    } catch {
      rejectedCrossDevice = true;
    }
    const before = [
      await q.countDurableGps("TAD-A"),
      await q.countDurableGps("TAD-B"),
    ];
    const removed = await q.acknowledgeDurableGps("TAD-A", [aKeys[0]]);
    const replay = await q.acknowledgeDurableGps("TAD-A", [aKeys[0]]);
    const after = await q.readDurableGps("TAD-A");
    await q.closeDurableGps();

    return {
      ordered: ordered.map((p) => [p.queueId, p.speed]),
      aKeys,
      rejectedCrossDevice,
      before,
      removed,
      replay,
      remaining: after.map((p) => p.queueId),
    };
  });
  expect(result.ordered).toEqual([
    [result.aKeys[0], 1],
    [result.aKeys[1], 2],
  ]);
  expect(result.rejectedCrossDevice).toBe(true);
  expect(result.before).toEqual([2, 1]);
  expect(result.removed).toBe(1);
  expect(result.replay).toBe(0);
  expect(result.remaining).toEqual([result.aKeys[1]]);
});

test("concurrent tabs commit 100 distinct records; reload preserves them", async ({
  page,
  context,
}) => {
  const other = await context.newPage();
  await other.goto(BASE);
  const store50 = (which: number) =>
    (which === 1 ? page : other).evaluate(async (offset) => {
      const q = (await import(
      new URL("queue.js", location.href).href
    )) as typeof import("../../../../packages/services/mobile-gateway-idb");
      return q.enqueueDurableGps(
        "TAD-C",
        Array.from({ length: 50 }, (_, i) => ({
          latitude: 19.45,
          longitude: -70.69,
          speed: offset + i,
          timestamp: new Date(
            Date.UTC(2026, 10, 22) + (offset + i) * 1000,
          ).toISOString(),
        })),
      );
    }, which * 100);

  const [a, b] = await Promise.all([store50(1), store50(2)]);
  expect(new Set([...a, ...b]).size).toBe(100);
  await page.reload();
  const count = await page.evaluate(async () => {
    const q = (await import(
      new URL("queue.js", location.href).href
    )) as typeof import("../../../../packages/services/mobile-gateway-idb");
    return q.countDurableGps("TAD-C");
  });
  expect(count).toBe(100);
  await other.close();
});

test("10x batch load stays durable; ACK deletes only exact first 500", async ({
  page,
}) => {
  const summary = await page.evaluate(async () => {
    const q = (await import(
      new URL("queue.js", location.href).href
    )) as typeof import("../../../../packages/services/mobile-gateway-idb");
    for (let batch = 0; batch < 10; batch++) {
      await q.enqueueDurableGps(
        "TAD-10X",
        Array.from({ length: 500 }, (_, i) => {
          const n = batch * 500 + i;
          return {
            latitude: 19.45,
            longitude: -70.69,
            speed: n,
            timestamp: new Date(
              Date.UTC(2026, 10, 22) + n * 1000,
            ).toISOString(),
          };
        }),
      );
    }
    const before = await q.countDurableGps("TAD-10X");
    const first = await q.readDurableGps("TAD-10X");
    const removed = await q.acknowledgeDurableGps(
      "TAD-10X",
      first.map((p) => p.queueId),
    );
    const remaining = await q.readDurableGps("TAD-10X");
    const after = await q.countDurableGps("TAD-10X");
    return {
      before,
      firstCount: first.length,
      removed,
      after,
      firstPendingSpeed: remaining[0].speed,
    };
  });
  expect(summary).toEqual({
    before: 5000,
    firstCount: 500,
    removed: 500,
    after: 4500,
    firstPendingSpeed: 500,
  });
});
