import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { attachNetworkListener } from "../../src/network-listeners.ts";

test("online listener fires only while mounted and cleanup is idempotent", () => {
  const events = new EventTarget();
  let count = 0;
  const dispose = attachNetworkListener(events, "online", () => count++);
  events.dispatchEvent(new Event("online"));
  assert.equal(count, 1);
  dispose();
  dispose();
  events.dispatchEvent(new Event("online"));
  assert.equal(count, 1);
});

test("remount leaves exactly one listener; offline does not fire online", () => {
  const events = new EventTarget();
  let online = 0;
  let offline = 0;
  let detach = () => {};
  for (let i = 0; i < 10; i++) {
    detach();
    detach = attachNetworkListener(events, "online", () => online++);
  }
  const stopOffline = attachNetworkListener(events, "offline", () => offline++);
  events.dispatchEvent(new Event("offline"));
  assert.equal(offline, 1);
  assert.equal(online, 0);
  events.dispatchEvent(new Event("online"));
  assert.equal(online, 1);
  detach();
  stopOffline();
  events.dispatchEvent(new Event("online"));
  events.dispatchEvent(new Event("offline"));
  assert.equal(online, 1);
  assert.equal(offline, 1);
});

test("both Player managers actually wire the cleanup into destroy", () => {
  const queue = fs.readFileSync(new URL("../../src/playback-queue.ts", import.meta.url), "utf8");
  const sync = fs.readFileSync(new URL("../../src/sync-manager.ts", import.meta.url), "utf8");
  assert.match(queue, /this\.disposeOnlineListener = attachNetworkListener\(window, "online"/);
  assert.match(queue, /this\.disposeOnlineListener\?\.\(\)/);
  assert.match(queue, /init\(deviceId: string\): void \{[\s\S]*?this\.destroy\(\)/);
  assert.match(sync, /attachNetworkListener\(window, "online"/);
  assert.match(sync, /attachNetworkListener\(window, "offline"/);
  assert.match(sync, /for \(const detach of this\.networkListenerDisposers\) \{\s*detach\(\)/);
  assert.match(sync, /this\.networkListenerDisposers = \[\]/);
});
