import test from "node:test";
import assert from "node:assert/strict";
import { classifyOfflineQueueStatus } from "../../lib/offlineQueuePolicy.ts";

test("409 cannot acknowledge or delete an offline financial action", () => {
  assert.equal(classifyOfflineQueueStatus(409), "retain");
});

test("successful HTTP responses acknowledge queued actions", () => {
  for (const status of [200, 201, 202, 204]) {
    assert.equal(classifyOfflineQueueStatus(status), "ack");
  }
});

test("unauthorized or unpaid sessions pause the queue", () => {
  assert.equal(classifyOfflineQueueStatus(401), "pause");
  assert.equal(classifyOfflineQueueStatus(402), "pause");
});

test("network/server errors retain actions for later retry", () => {
  for (const status of [0, 429 + 71, 503, 504]) {
    assert.equal(classifyOfflineQueueStatus(status), "retain");
  }
});

test("existing terminal non-409 4xx behavior remains unchanged", () => {
  for (const status of [400, 403, 404, 422]) {
    assert.equal(classifyOfflineQueueStatus(status), "ack");
  }
});
