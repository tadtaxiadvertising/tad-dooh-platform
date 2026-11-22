import test from "node:test";
import assert from "node:assert/strict";

let moduleCounter = 0;
const FIXTURE = {
  latitude: 19.45,
  longitude: -70.69,
  speed: 1,
};

function browserFixture() {
  const storage = new Map();
  const watches = new Map();
  const cleared = [];
  let nextWatch = 1;
  let failWrites = false;
  const events = new Map();
  const calls = [];
  let responder = async () => new Response(JSON.stringify({ count: 1, input: 1 }));

  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      onLine: true,
      geolocation: {
        watchPosition(onPosition) {
          const id = nextWatch++;
          watches.set(id, onPosition);
          return id;
        },
        clearWatch(id) {
          cleared.push(id);
          watches.delete(id);
        },
      },
    },
  });

  globalThis.window = {
    addEventListener(type, callback) {
      events.set(type, callback);
    },
    removeEventListener(type) {
      events.delete(type);
    },
  };
  globalThis.localStorage = {
    getItem(key) {
      return storage.get(key) ?? null;
    },
    setItem(key, value) {
      if (failWrites) throw new Error("QuotaExceededError");
      storage.set(key, value);
    },
    removeItem(key) {
      storage.delete(key);
    },
  };
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return responder(url, options);
  };

  return {
    storage,
    calls,
    cleared,
    events,
    setResponder(fn) {
      responder = fn;
    },
    failStorageWrites() {
      failWrites = true;
    },
    fix(milliseconds) {
      const active = [...watches.values()];
      for (const callback of active) {
        callback({
          timestamp: milliseconds,
          coords: FIXTURE,
        });
      }
    },
    pending(deviceId) {
      const raw = storage.get(
        `tad_gps_batch_device:${encodeURIComponent(deviceId)}`,
      );
      return raw ? JSON.parse(raw) : [];
    },
  };
}

async function gatewayModule() {
  return import(
    `../../../../packages/services/mobile-gateway.ts?test=${++moduleCounter}`
  );
}

const authorization = (deviceId) => ({
  deviceId,
  driverId: "bound-driver",
  deviceToken: "test-only-device-credential",
});

async function until(predicate) {
  for (let attempt = 0; attempt < 50; attempt++) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.fail("expected asynchronous GPS state transition did not occur");
}

test("unpaired QR captures locally, never uploads and leaves legacy data intact", async () => {
  const env = browserFixture();
  const legacy = JSON.stringify([{ timestamp: "legacy" }]);
  env.storage.set("tad_gps_batch", legacy);
  const gateway = await gatewayModule();
  try {
    gateway.startTadTracking("TAD-A", "https://api.example.invalid");
    env.fix(Date.parse("2026-11-22T01:00:00Z"));
    assert.equal(env.pending("TAD-A").length, 1);
    assert.equal(env.storage.get("tad_gps_batch"), legacy);
    assert.equal(env.calls.length, 0);
    assert.equal(gateway.getGatewayState().batchSize, 1);
    assert.equal(gateway.getGatewayState().status, "OFFLINE");
    assert.match(gateway.getGatewayState().error, /emparejamiento seguro/i);
  } finally {
    gateway.stopTadTracking();
  }
});

test("valid ACK removes only in-flight GPS; concurrent capture remains durable", async () => {
  const env = browserFixture();
  const gateway = await gatewayModule();
  let complete;
  env.setResponder(() => new Promise((resolve) => {
    complete = resolve;
  }));
  try {
    gateway.startTadTracking("TAD-A", "https://api.example.invalid");
    env.fix(Date.parse("2026-11-22T01:00:00Z"));
    assert.equal(gateway.authorizeTadTracking(authorization("TAD-A")), true);
    await until(() => typeof complete === "function");
    assert.equal(env.calls.length, 1);
    const request = JSON.parse(env.calls[0].options.body);
    assert.deepEqual(Object.keys(request), ["deviceId", "driverId", "points"]);
    assert.equal(request.points[0].timestamp, Date.parse("2026-11-22T01:00:00Z"));
    assert.equal(env.calls[0].options.headers["X-Device-Token"], authorization("TAD-A").deviceToken);

    env.fix(Date.parse("2026-11-22T01:00:01Z"));
    complete(new Response(JSON.stringify({ count: 1, input: 1 })));
    await until(() => gateway.getGatewayState().totalSynced === 1);
    assert.equal(env.pending("TAD-A").length, 1);
    assert.equal(env.pending("TAD-A")[0].timestamp, "2026-11-22T01:00:01.000Z");
  } finally {
    gateway.stopTadTracking();
  }
});

test("unauthorized response and ambiguous 200 never acknowledge GPS", async () => {
  for (const [status, body] of [
    [401, { error: "unauthorized" }],
    [403, { error: "forbidden" }],
    [200, { success: true }],
  ]) {
    const env = browserFixture();
    const gateway = await gatewayModule();
    env.setResponder(async () => new Response(JSON.stringify(body), { status }));
    try {
      gateway.startTadTracking("TAD-A", "https://api.example.invalid");
      env.fix(Date.parse("2026-11-22T02:00:00Z"));
      gateway.authorizeTadTracking(authorization("TAD-A"));
      await until(() => gateway.getGatewayState().status === "OFFLINE");
      assert.equal(env.pending("TAD-A").length, 1);
      assert.equal(gateway.getGatewayState().totalSynced, 0);
    } finally {
      gateway.stopTadTracking();
    }
  }
});

test("HTTP 402 suspends uploads but preserves the offline queue", async () => {
  const env = browserFixture();
  const gateway = await gatewayModule();
  env.setResponder(async () => new Response(JSON.stringify({}), { status: 402 }));
  try {
    gateway.startTadTracking("TAD-A", "https://api.example.invalid");
    env.fix(Date.parse("2026-11-22T03:00:00Z"));
    gateway.authorizeTadTracking(authorization("TAD-A"));
    await until(() => gateway.getGatewayState().status === "SUSPENDED");
    assert.equal(env.pending("TAD-A").length, 1);
    assert.equal(gateway.getGatewayState().totalSynced, 0);
  } finally {
    gateway.stopTadTracking();
  }
});

test("two QR device queues never mix across stops and reloads", async () => {
  const env = browserFixture();
  const gateway = await gatewayModule();
  try {
    gateway.startTadTracking("TAD-A", "https://api.example.invalid");
    env.fix(Date.parse("2026-11-22T04:00:00Z"));
    gateway.stopTadTracking();
    gateway.startTadTracking("TAD-B", "https://api.example.invalid");
    env.fix(Date.parse("2026-11-22T04:00:01Z"));
    assert.equal(env.pending("TAD-A").length, 1);
    assert.equal(env.pending("TAD-B").length, 1);
    gateway.stopTadTracking();
    gateway.startTadTracking("TAD-A", "https://api.example.invalid");
    assert.equal(gateway.getGatewayState().batchSize, 1);
  } finally {
    gateway.stopTadTracking();
  }
});

test("storage quota failure cannot truncate previously persisted GPS", async () => {
  const env = browserFixture();
  const gateway = await gatewayModule();
  try {
    gateway.startTadTracking("TAD-A", "https://api.example.invalid");
    env.fix(Date.parse("2026-11-22T05:00:00Z"));
    assert.equal(env.pending("TAD-A").length, 1);
    env.failStorageWrites();
    env.fix(Date.parse("2026-11-22T05:00:01Z"));
    assert.equal(env.pending("TAD-A").length, 1);
    assert.equal(gateway.getGatewayState().batchSize, 2);
    assert.equal(gateway.getGatewayState().status, "GPS_ERROR");
    assert.equal(env.cleared.length, 1);
  } finally {
    gateway.stopTadTracking();
  }
});

test("unpaired QR never advertises GPS as synced or actively transmitting", async () => {
  const env = browserFixture();
  const gateway = await gatewayModule();
  try {
    gateway.startTadTracking("TAD-A", "https://api.example.invalid");
    assert.equal(gateway.getGatewayState().status, "OFFLINE");
    assert.equal(gateway.getGatewayState().totalSynced, 0);
    assert.equal(env.calls.length, 0);

    env.fix(Date.parse("2026-11-22T06:00:00Z"));
    assert.equal(gateway.getGatewayState().status, "OFFLINE");
    assert.equal(env.pending("TAD-A").length, 1);
  } finally {
    gateway.stopTadTracking();
  }
});

test("verified pairing restores TRACKING state with empty queue", async () => {
  const env = browserFixture();
  const gateway = await gatewayModule();
  try {
    gateway.startTadTracking("TAD-A", "https://api.example.invalid");
    assert.equal(gateway.getGatewayState().status, "OFFLINE");
    assert.equal(gateway.authorizeTadTracking(authorization("TAD-B")), false);
    assert.equal(gateway.getGatewayState().status, "OFFLINE");
    assert.equal(gateway.authorizeTadTracking(authorization("TAD-A")), true);
    assert.equal(gateway.getGatewayState().status, "TRACKING");
    assert.equal(env.calls.length, 0);
  } finally {
    gateway.stopTadTracking();
  }
});
