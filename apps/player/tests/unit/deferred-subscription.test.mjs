import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { attachDeferredSubscription } from "../../src/deferred-subscription.ts";

const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };

function makeDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

test("destroy before a delayed import prevents stale channel creation", async () => {
  const pending = makeDeferred();
  let subscribed = 0;
  const stop = attachDeferredSubscription(
    () => pending.promise,
    () => { subscribed++; return () => {}; },
    (error) => { throw error; },
  );
  stop();
  pending.resolve({});
  await flush();
  assert.equal(subscribed, 0);
});

test("destroy releases exactly one channel and suppresses late callbacks", async () => {
  let registeredCallback;
  let disposed = 0;
  let deliveries = 0;
  const stop = attachDeferredSubscription(
    async () => ({}),
    (_client, isActive) => {
      registeredCallback = () => { if (isActive()) deliveries++; };
      return () => { disposed++; };
    },
    (error) => { throw error; },
  );
  await flush();
  registeredCallback();
  assert.equal(deliveries, 1);
  stop();
  stop();
  registeredCallback();
  assert.equal(deliveries, 1);
  assert.equal(disposed, 1);
});

test("repeat mount/unmount never leaves old subscriptions active", async () => {
  const callbacks = [];
  const stops = [];
  let removals = 0;
  for (let i = 0; i < 12; i++) {
    stops.at(-1)?.();
    stops.push(attachDeferredSubscription(
      async () => ({}),
      (_client, isActive) => {
        callbacks.push(() => isActive());
        return () => { removals++; };
      },
      (error) => { throw error; },
    ));
    await flush();
  }
  assert.equal(callbacks.filter(cb => cb()).length, 1);
  stops.at(-1)();
  assert.equal(callbacks.filter(cb => cb()).length, 0);
  assert.equal(removals, 12);
});

test("load errors are reported only for live subscriptions", async () => {
  const delayed = makeDeferred();
  let errors = 0;
  const stop = attachDeferredSubscription(
    () => delayed.promise,
    () => { throw new Error("must not subscribe"); },
    () => { errors++; },
  );
  stop();
  delayed.reject(new Error("late failure"));
  await flush();
  assert.equal(errors, 0);
  attachDeferredSubscription(
    async () => { throw new Error("active import failure"); },
    () => { throw new Error("must not subscribe"); },
    () => { errors++; },
  );
  await flush();
  assert.equal(errors, 1);
});

test("production SyncManager owns and releases the channel during destroy and init", () => {
  const source = fs.readFileSync(new URL("../../src/sync-manager.ts", import.meta.url), "utf8");
  assert.match(source, /init\(deviceId: string\): void \{\s*\/\/[^\n]*\n\s*this\.destroy\(\)/);
  assert.match(source, /this\.disposeRealtimeListener = attachDeferredSubscription\(/);
  assert.match(source, /this\.disposeRealtimeListener\?\.\(\)/);
  assert.match(source, /if \(!isActive\(\)\) return;/);
  assert.match(source, /client\.removeChannel\(channel\)/);
});
