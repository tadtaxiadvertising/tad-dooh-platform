import test from "node:test";
import assert from "node:assert/strict";
import {
  enqueueDurableGps,
  readDurableGps,
  acknowledgeDurableGps,
  countDurableGps,
} from "../../../../packages/services/mobile-gateway-idb.ts";

const gps = {
  latitude: 19.45,
  longitude: -70.69,
  speed: 0,
  timestamp: "2026-11-22T01:00:00.000Z",
};

test("rejects invalid device IDs before opening IndexedDB", async () => {
  for (const id of ["", "   ", "T".repeat(129)]) {
    await assert.rejects(enqueueDurableGps(id, [gps]), /GPS_DEVICE_ID_REQUIRED/);
    await assert.rejects(readDurableGps(id), /GPS_DEVICE_ID_REQUIRED/);
    await assert.rejects(countDurableGps(id), /GPS_DEVICE_ID_REQUIRED/);
  }
});

test("rejects malformed or excessive batches before any writes", async () => {
  await assert.rejects(enqueueDurableGps("TAD-A", []), /GPS_BATCH_SIZE_INVALID/);
  await assert.rejects(
    enqueueDurableGps("TAD-A", Array(501).fill(gps)),
    /GPS_BATCH_SIZE_INVALID/,
  );
  for (const point of [
    { ...gps, latitude: 91 },
    { ...gps, longitude: -181 },
    { ...gps, speed: NaN },
    { ...gps, timestamp: "bad" },
  ]) {
    await assert.rejects(
      enqueueDurableGps("TAD-A", [point]),
      /GPS_POINT_INVALID/,
    );
  }
});

test("ACK refuses duplicate or other invalid queue identifiers", async () => {
  for (const ids of [
    [],
    [0],
    [-2],
    [1, 1],
    [1.5],
    [Number.MAX_SAFE_INTEGER + 1],
  ]) {
    await assert.rejects(
      acknowledgeDurableGps("TAD-A", ids),
      /GPS_ACK_KEYS_INVALID/,
    );
  }
});

test("read range is bounded and validated before database access", async () => {
  for (const limit of [0, -1, 501, 1.5]) {
    await assert.rejects(readDurableGps("TAD-A", limit), /GPS_BATCH_SIZE_INVALID/);
  }
});

test("browser without IndexedDB never claims GPS durability", async () => {
  await assert.rejects(enqueueDurableGps("TAD-A", [gps]), /GPS_INDEXEDDB_UNAVAILABLE/);
  await assert.rejects(countDurableGps("TAD-A"), /GPS_INDEXEDDB_UNAVAILABLE/);
  await assert.rejects(readDurableGps("TAD-A"), /GPS_INDEXEDDB_UNAVAILABLE/);
  await assert.rejects(acknowledgeDurableGps("TAD-A", [1]), /GPS_INDEXEDDB_UNAVAILABLE/);
});
