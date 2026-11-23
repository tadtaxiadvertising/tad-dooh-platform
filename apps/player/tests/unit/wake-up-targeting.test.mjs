import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { isWakeUpForDevice } from "../../src/wake-up-targeting.ts";

const device = "TAD-123";
const broadcast = payload => ({ type: "broadcast", event: "WAKE_UP_CALL", payload });

test("Supabase nested targeted broadcast syncs only its intended device", () => {
  const message = broadcast({ reason: "campaign_assigned", targets: ["TAD-999", device] });
  assert.equal(isWakeUpForDevice(message, device), true);
  assert.equal(isWakeUpForDevice(message, "TAD-OTHER"), false);
});

test("legacy flat targeted messages remain compatible", () => {
  const msg = { targets: [device], reason: "media_unlinked" };
  assert.equal(isWakeUpForDevice(msg, device), true);
  assert.equal(isWakeUpForDevice(msg, "TAD-OTHER"), false);
});

test("no explicit targets remains a global wake-up", () => {
  assert.equal(isWakeUpForDevice(broadcast({ reason: "campaign_updated" }), device), true);
  assert.equal(isWakeUpForDevice({ reason: "campaign_updated" }, device), true);
  assert.equal(isWakeUpForDevice(broadcast({ command: "FORCE_SYNC" }), device), true);
});

test("empty, malformed or mixed target lists fail closed", () => {
  for (const targets of [[], null, "TAD-123", {}, [device, null], [device, ""]]) {
    assert.equal(isWakeUpForDevice(broadcast({ targets }), device), false, JSON.stringify(targets));
  }
});

test("invalid event/envelope/payload/device never triggers sync", () => {
  for (const message of [
    null, [], {}, broadcast({}), broadcast({ reason: null }),
    { type: "presence", event: "WAKE_UP_CALL", payload: {} },
    { type: "broadcast", event: "NOT_WAKE_UP", payload: {} },
    { type: "broadcast", event: "WAKE_UP_CALL", payload: [] },
    { type: "broadcast", event: "WAKE_UP_CALL", payload: null },
  ]) {
    assert.equal(isWakeUpForDevice(message, device), false, JSON.stringify(message));
  }
  assert.equal(isWakeUpForDevice(broadcast({ targets: [device] }), ""), false);
});

test("SyncManager consults the targeting helper rather than top-level targets", () => {
  const source = fs.readFileSync(new URL("../../src/sync-manager.ts", import.meta.url), "utf8");
  assert.match(source, /isWakeUpForDevice\(payload, this\.deviceId\)/);
  assert.doesNotMatch(source, /payload\.targets/);
});
