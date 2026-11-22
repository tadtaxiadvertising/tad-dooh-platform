import test from "node:test";
import assert from "node:assert/strict";
import {
  buildGatewayGpsBatch,
  isCompleteGatewayGpsReceipt,
  GATEWAY_GPS_BATCH_LIMIT,
  unacknowledgedGatewayGpsPoints,
} from "../../../../packages/services/mobile-gateway-contract.ts";

const device = "TAD-100";
const credential = {
  deviceId: device,
  driverId: "driver-approved",
  deviceToken: "unit-test-only-device-token",
};
const point = {
  latitude: 19.45,
  longitude: -70.69,
  speed: 12,
  timestamp: "2026-11-22T01:00:00.000Z",
};

test("sends API TrackBatchDto points with original epoch-millisecond timestamps", () => {
  const payload = buildGatewayGpsBatch(device, credential, [point]);
  assert.deepEqual(payload, {
    deviceId: device,
    driverId: "driver-approved",
    points: [
      {
        lat: 19.45,
        lng: -70.69,
        speed: 12,
        timestamp: Date.parse(point.timestamp),
      },
    ],
  });
});

test("refuses unpaired identity, invalid GPS, and unbounded payload", () => {
  assert.throws(
    () => buildGatewayGpsBatch("TAD-OTHER", credential, [point]),
    /GPS_DEVICE_NOT_PAIRED/,
  );
  assert.throws(
    () => buildGatewayGpsBatch(device, { ...credential, deviceToken: "" }, [point]),
    /GPS_DEVICE_NOT_PAIRED/,
  );
  assert.throws(
    () => buildGatewayGpsBatch(device, credential, [{ ...point, latitude: 91 }]),
    /GPS_POINT_INVALID/,
  );
  assert.throws(
    () => buildGatewayGpsBatch(device, credential, [{ ...point, timestamp: "bad" }]),
    /GPS_POINT_INVALID/,
  );
  assert.throws(
    () =>
      buildGatewayGpsBatch(
        device,
        credential,
        Array.from({ length: GATEWAY_GPS_BATCH_LIMIT + 1 }, () => point),
      ),
    /GPS_DEVICE_NOT_PAIRED/,
  );
});

test("accepts exact ACK and idempotent replay; not just HTTP success", () => {
  assert.equal(isCompleteGatewayGpsReceipt({ count: 2, input: 2 }, 2), true);
  assert.equal(isCompleteGatewayGpsReceipt({ count: 0, input: 2 }, 2), true);
  assert.equal(isCompleteGatewayGpsReceipt({ count: 1, input: 2 }, 2), true);
});

test("rejects incomplete, incompatible, unsafe, or missing ACKs", () => {
  for (const receipt of [
    { saved: 2, skipped: 0 },
    { count: 2 },
    { input: 2 },
    { count: 2, input: 1 },
    { count: 3, input: 2 },
    { count: -1, input: 2 },
    { count: 1.5, input: 2 },
    { count: "2", input: 2 },
    { count: 2, input: "2" },
    { count: 2, input: Number.MAX_SAFE_INTEGER + 1 },
    null,
    [],
  ]) {
    assert.equal(isCompleteGatewayGpsReceipt(receipt, 2), false);
  }
  assert.equal(isCompleteGatewayGpsReceipt({ count: 0, input: 0 }, 0), false);
});

test("ACK removes only the exact snapshot and preserves concurrently captured GPS", () => {
  const first = { ...point };
  const newlyCaptured = { ...point };
  const afterAck = unacknowledgedGatewayGpsPoints(
    [first, newlyCaptured],
    [first],
  );
  assert.deepEqual(afterAck, [newlyCaptured]);
  assert.equal(afterAck[0], newlyCaptured);
});

test("10x bounded chunk leaves all future GPS pending for subsequent ACKs", () => {
  const all = Array.from({ length: GATEWAY_GPS_BATCH_LIMIT * 10 }, (_, i) => ({
    ...point,
    timestamp: new Date(Date.parse(point.timestamp) + i).toISOString(),
  }));
  const first = all.slice(0, GATEWAY_GPS_BATCH_LIMIT);
  const afterAck = unacknowledgedGatewayGpsPoints(all, first);
  assert.equal(afterAck.length, GATEWAY_GPS_BATCH_LIMIT * 9);
  assert.equal(afterAck[0], all[GATEWAY_GPS_BATCH_LIMIT]);
});
